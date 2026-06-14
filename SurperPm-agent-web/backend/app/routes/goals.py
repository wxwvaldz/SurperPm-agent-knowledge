"""Goals API - CRUD, execution, review."""

import asyncio
import json
import logging
from datetime import UTC, datetime
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.routes.deps import require_auth
from app.services.helpers import knowledge_root as _knowledge_root, slugify as _slugify, resolve_workspace as _resolve_workspace
from app.services.event_bus import (
    EXECUTION_COMPLETED,
    EXECUTION_PROGRESS,
    GOAL_UPDATED,
    bus,
)
from app.services.goal_executor import execute_goal as _execute_goal_bg
from app.services.goal_executor import request_cancel, request_pause, request_resume
from app.services.goal_service import create_goal as _create_goal
from app.services.knowledge_store import KnowledgeStore, get_store

_logger = logging.getLogger(__name__)

router = APIRouter()

_bg_tasks: set[asyncio.Task] = set()


def _spawn_bg(coro) -> asyncio.Task:
    task = asyncio.create_task(coro)
    _bg_tasks.add(task)
    task.add_done_callback(_bg_tasks.discard)
    return task


class GoalCreate(BaseModel):
    workspace_id: str
    title: str
    description: str | None = None
    priority: int = 0
    session_name: str | None = None
    topic_id: int | None = None
    deadline: str | None = None
    token_budget: int | None = None
    assigned_to: str | None = None
    repo_url: str | None = None
    repo_path: str | None = None
    repos: str | None = None
    schedule: str | None = None
    delay_until: str | None = None
    target: str | None = None
    plugins: list[str] | None = None


class GoalUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    status: str | None = None
    priority: int | None = None
    assigned_to: str | None = None
    suggested_assignee: str | None = None
    parent_goal_id: int | None = None
    topic_id: int | None = None
    deadline: str | None = None
    schedule: str | None = None
    delay_until: str | None = None
    target: str | None = None
    token_budget: int | None = None
    session_name: str | None = None
    repo_url: str | None = None
    repo_path: str | None = None
    repos: str | None = None
    plugins: list[str] | None = None


def _notes_path(session_name: str) -> Path:
    root = (_knowledge_root() or "").strip()
    if not root:
        raise HTTPException(
            status_code=409,
            detail="KNOWLEDGE_REPO_PATH is not configured",
        )
    return Path(root) / "sessions" / session_name / "notes.md"


def _ready_for_goal(notes_text: str) -> bool:
    return "ready_for_goal: yes" in notes_text.lower()


def _assert_session_ready(session_name: str) -> None:
    notes_path = _notes_path(session_name)
    if not notes_path.exists():
        raise HTTPException(
            status_code=409,
            detail=f"Session '{session_name}' notes.md not found",
        )
    notes_text = notes_path.read_text(encoding="utf-8")
    if not _ready_for_goal(notes_text):
        raise HTTPException(
            status_code=409,
            detail=f"Session '{session_name}' is not ready for goal execution",
        )


def _has_repo_binding(goal: dict, workspace: dict) -> bool:
    if goal.get("repo_url") or workspace.get("repo_url"):
        return True
    for raw in (goal.get("repos"), workspace.get("repos")):
        if not raw:
            continue
        try:
            data = json.loads(raw) if isinstance(raw, str) else raw
        except (json.JSONDecodeError, TypeError):
            continue
        if isinstance(data, list) and any(str(item).strip() for item in data):
            return True
    return False


@router.get("")
async def list_goals(
    status: str | None = None,
    workspace_id: str | None = None,
    topic_id: int | None = None,
    store: KnowledgeStore = Depends(get_store),
    _user: dict = Depends(require_auth),
):
    filters: dict = {}
    if workspace_id:
        filters["workspace_id"] = workspace_id
    if status:
        filters["status"] = status
    if topic_id is not None:
        filters["topic_id"] = topic_id
    rows = store.list("goals", **filters)
    rows.sort(key=lambda r: (r.get("priority", 0), r.get("created_at", "")), reverse=True)
    return rows


@router.post("", status_code=201)
async def create_goal(
    body: GoalCreate,
    store: KnowledgeStore = Depends(get_store),
    _user: dict = Depends(require_auth),
):
    workspace = _resolve_workspace(store, body.workspace_id)
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
    goal = await _create_goal(
        title=body.title,
        description=body.description,
        priority=body.priority,
        workspace_id=workspace["id"],
        session_name=body.session_name,
        topic_id=body.topic_id,
        deadline=body.deadline,
        token_budget=body.token_budget,
        assigned_to=body.assigned_to,
        repo_url=body.repo_url,
        repo_path=body.repo_path,
        repos=body.repos,
        schedule=body.schedule,
        delay_until=body.delay_until,
        target=body.target,
        plugins=body.plugins,
        source="api",
    )
    return goal


class GoalBatchCreate(BaseModel):
    workspace_id: str
    goals: list[GoalCreate]


@router.post("/batch", status_code=201)
async def batch_create_goals(
    body: GoalBatchCreate,
    store: KnowledgeStore = Depends(get_store),
    _user: dict = Depends(require_auth),
):
    workspace = _resolve_workspace(store, body.workspace_id)
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
    created = []
    for item in body.goals:
        goal = await _create_goal(
            title=item.title,
            description=item.description,
            priority=item.priority,
            workspace_id=workspace["id"],
            topic_id=item.topic_id,
            deadline=item.deadline,
            token_budget=item.token_budget,
            assigned_to=item.assigned_to,
            repo_url=item.repo_url,
            repo_path=item.repo_path,
            repos=item.repos,
            plugins=item.plugins,
            source="api_batch",
        )
        created.append(goal)
    return created


# ── Goal Recipes (shared scheduled tasks) ────────────────────────
# MUST be registered before /{goal_id} to avoid path parameter capture.


def _recipes_path(store: KnowledgeStore) -> Path:
    return store._root / "settings" / "goal-recipes.json"


def _load_recipes(store: KnowledgeStore) -> list[dict]:
    path = _recipes_path(store)
    if path.is_file():
        try:
            return json.loads(path.read_text("utf-8"))
        except (json.JSONDecodeError, OSError):
            pass
    return []


def _save_recipes(store: KnowledgeStore, recipes: list[dict]) -> None:
    path = _recipes_path(store)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(recipes, indent=2, ensure_ascii=False), "utf-8")


@router.get("/recipes")
async def list_recipes(
    store: KnowledgeStore = Depends(get_store),
    _user: dict = Depends(require_auth),
) -> list[dict]:
    return _load_recipes(store)


class RecipePayload(BaseModel):
    title: str
    description: str = ""
    schedule: str = "24"
    plugins: list[str] = []


@router.post("/recipes")
async def add_recipe(
    body: RecipePayload,
    store: KnowledgeStore = Depends(get_store),
    user: dict = Depends(require_auth),
) -> dict:
    recipes = _load_recipes(store)
    if any(r["title"] == body.title for r in recipes):
        raise HTTPException(409, f"Recipe '{body.title}' already exists")
    recipe = {
        "title": body.title,
        "description": body.description,
        "schedule": body.schedule,
        "plugins": body.plugins,
        "shared_by": user.get("username", "unknown"),
        "shared_at": datetime.now(UTC).isoformat(),
    }
    recipes.append(recipe)
    _save_recipes(store, recipes)
    return recipe


@router.post("/recipes/from-goal/{goal_id}")
async def share_goal_as_recipe(
    goal_id: str,
    store: KnowledgeStore = Depends(get_store),
    user: dict = Depends(require_auth),
) -> dict:
    goal = store.get("goals", goal_id)
    if not goal:
        raise HTTPException(404, "Goal not found")
    if not goal.get("schedule"):
        raise HTTPException(400, "Only scheduled goals can be shared as recipes")
    recipes = _load_recipes(store)
    if any(r["title"] == goal["title"] for r in recipes):
        raise HTTPException(409, f"Recipe '{goal['title']}' already exists")
    recipe = {
        "title": goal["title"],
        "description": goal.get("description", ""),
        "schedule": goal["schedule"],
        "plugins": goal.get("plugins") or [],
        "shared_by": user.get("username", "unknown"),
        "shared_at": datetime.now(UTC).isoformat(),
    }
    recipes.append(recipe)
    _save_recipes(store, recipes)
    return recipe


@router.delete("/recipes/{title}")
async def remove_recipe(
    title: str,
    store: KnowledgeStore = Depends(get_store),
    _user: dict = Depends(require_auth),
) -> dict:
    recipes = [r for r in _load_recipes(store) if r["title"] != title]
    _save_recipes(store, recipes)
    return {"ok": True}


@router.post("/recipes/import/{title}")
async def import_recipe_as_goal(
    title: str,
    store: KnowledgeStore = Depends(get_store),
    _user: dict = Depends(require_auth),
) -> dict:
    recipes = _load_recipes(store)
    recipe = next((r for r in recipes if r["title"] == title), None)
    if not recipe:
        raise HTTPException(404, "Recipe not found")
    workspaces = store.list("workspaces")
    if not workspaces:
        raise HTTPException(400, "No workspace available")
    ws_id = workspaces[0]["id"]
    goal = await _create_goal(
        title=recipe["title"],
        description=recipe.get("description", ""),
        schedule=recipe.get("schedule", "24"),
        workspace_id=ws_id,
        plugins=recipe.get("plugins"),
    )
    return goal


# ── Single Goal CRUD ─────────────────────────────────────────────


@router.get("/{goal_id}")
async def get_goal(
    goal_id: str,
    store: KnowledgeStore = Depends(get_store),
    _user: dict = Depends(require_auth),
):
    goal = store.get("goals", goal_id)
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    return goal


@router.patch("/{goal_id}")
async def update_goal(
    goal_id: str,
    body: GoalUpdate,
    store: KnowledgeStore = Depends(get_store),
    _user: dict = Depends(require_auth),
):
    goal = store.get("goals", goal_id)
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    patch = body.model_dump(exclude_unset=True)
    if "title" in patch:
        patch["slug"] = _slugify(patch["title"], goal_id)
    updated = await store.update("goals", goal_id, patch)
    await bus.emit(
        GOAL_UPDATED,
        {
            "goal_id": goal_id,
            "workspace_id": updated["workspace_id"],
            "status": updated.get("status"),
        },
    )
    return updated


@router.delete("/{goal_id}", status_code=204)
async def delete_goal(
    goal_id: str,
    store: KnowledgeStore = Depends(get_store),
    _user: dict = Depends(require_auth),
):
    goal = store.get("goals", goal_id)
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    for exe in store.list("executions", goal_id=goal_id):
        await store.delete("executions", exe["id"])
    for topic in store.list("topics", goal_id=goal_id):
        await store.clear_topic_messages(topic["id"])
        await store.delete("topics", topic["id"])
    await store.delete("goals", goal_id)
    await bus.emit(GOAL_UPDATED, {"goal_id": goal_id, "workspace_id": goal.get("workspace_id"), "status": "deleted"})


@router.post("/{goal_id}/execute", status_code=202)
async def execute_goal(
    goal_id: str,
    store: KnowledgeStore = Depends(get_store),
    _user: dict = Depends(require_auth),
):
    goal = store.get("goals", goal_id)
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    if goal.get("status") == "doing":
        # Allow re-execute when stuck "doing" — no in-flight execution
        active_exes = store.list("executions", goal_id=goal_id)
        in_flight = any(
            e.get("status") in ("pending", "running", "paused")
            for e in active_exes
        )
        if in_flight:
            raise HTTPException(status_code=409, detail="Goal is already executing")
        # Stuck doing: fall through and create a new execution
    workspace = store.get("workspaces", goal["workspace_id"])
    if not workspace:
        raise HTTPException(status_code=409, detail="Workspace not found for goal")
    if goal.get("session_name"):
        _assert_session_ready(goal["session_name"])
    # Repo is optional — goals without repos run in a temp directory

    execution = await store.create("executions", {
        "goal_id": goal_id,
        "workspace_id": goal["workspace_id"],
        "status": "pending",
        "token_budget": goal.get("token_budget"),
        "error": None,
    })

    await store.update("goals", goal_id, {"status": "doing"})

    await bus.emit(
        GOAL_UPDATED,
        {
            "goal_id": goal_id,
            "workspace_id": goal["workspace_id"],
            "status": "doing",
        },
    )
    _spawn_bg(_execute_goal_bg(goal["workspace_id"], goal_id, execution["id"]))
    return {"goal_id": goal_id, "execution_id": execution["id"], "status": "doing"}


@router.get("/{goal_id}/executions")
async def list_goal_executions(
    goal_id: str,
    store: KnowledgeStore = Depends(get_store),
    _user: dict = Depends(require_auth),
):
    goal = store.get("goals", goal_id)
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    rows = store.list("executions", goal_id=goal_id)
    rows.sort(key=lambda r: r.get("created_at", ""), reverse=True)
    return rows


@router.post("/{goal_id}/executions/{execution_id}/cancel", status_code=200)
async def cancel_goal_execution(
    goal_id: str,
    execution_id: str,
    store: KnowledgeStore = Depends(get_store),
    _user: dict = Depends(require_auth),
):
    execution = store.get("executions", execution_id)
    if not execution or execution.get("goal_id") != goal_id:
        raise HTTPException(status_code=404, detail="Execution not found")
    if execution.get("status") not in ("pending", "running", "paused"):
        raise HTTPException(status_code=409, detail="Execution is not running")

    now = datetime.now(UTC).isoformat()

    # Always update DB immediately so the UI reflects the cancelled state
    # right away — even when the in-memory cancel event is live. The
    # background _run() task may take seconds to notice the event, and the
    # frontend refetches immediately after the API returns.
    await store.update("executions", execution_id, {
        "status": "failed",
        "finished_at": now,
        "error": "Cancelled by user",
    })
    await store.update("goals", goal_id, {"status": "failed"})

    event_live = request_cancel(execution_id)

    await bus.emit(
        EXECUTION_COMPLETED,
        {
            "execution_id": execution_id,
            "goal_id": goal_id,
            "workspace_id": execution["workspace_id"],
            "status": "failed",
            "error": "Cancelled by user",
        },
    )
    await bus.emit(GOAL_UPDATED, {
        "goal_id": goal_id,
        "workspace_id": execution["workspace_id"],
        "status": "failed",
    })
    return {"ok": True, "execution_id": execution_id, "cancelling": event_live}


async def _set_pause(
    goal_id: str, execution_id: str, store: KnowledgeStore, paused: bool
):
    execution = store.get("executions", execution_id)
    if not execution or execution.get("goal_id") != goal_id:
        raise HTTPException(status_code=404, detail="Execution not found")
    if execution.get("status") not in ("pending", "running", "paused"):
        raise HTTPException(status_code=409, detail="Execution is not running")
    toggled = request_pause(execution_id) if paused else request_resume(execution_id)
    if not toggled:
        _logger.warning(
            "Pause/resume event not found in memory for execution %s — "
            "server may have restarted. Updating DB without pausing agent task.",
            execution_id,
        )
    # Persist paused state so it survives page navigation.
    # Always update DB — even when the in-memory event is gone (server
    # restart).  The background agent task may no longer exist, but the
    # UI needs consistent state and won't recover otherwise.
    await store.update("executions", execution_id, {
        "status": "paused" if paused else "running",
        "paused_at": datetime.now(UTC).isoformat() if paused else None,
    })
    await bus.emit(
        EXECUTION_PROGRESS,
        {
            "execution_id": execution_id,
            "goal_id": goal_id,
            "workspace_id": execution["workspace_id"],
            "paused": paused,
        },
    )
    return {"ok": True, "execution_id": execution_id, "paused": paused}


@router.post("/{goal_id}/executions/{execution_id}/pause", status_code=200)
async def pause_goal_execution(
    goal_id: str,
    execution_id: str,
    store: KnowledgeStore = Depends(get_store),
    _user: dict = Depends(require_auth),
):
    return await _set_pause(goal_id, execution_id, store, paused=True)


@router.post("/{goal_id}/executions/{execution_id}/resume", status_code=200)
async def resume_goal_execution(
    goal_id: str,
    execution_id: str,
    store: KnowledgeStore = Depends(get_store),
    _user: dict = Depends(require_auth),
):
    result = await _set_pause(goal_id, execution_id, store, paused=False)
    # The agent subprocess was terminated on pause.  Re-launch it with
    # continue_conversation=True so it picks up from the saved session.
    execution = store.get("executions", execution_id)
    if execution:
        _spawn_bg(
            _execute_goal_bg(
                execution["workspace_id"], goal_id, execution_id,
            )
        )
    return result


class GoalReviewBody(BaseModel):
    action: str  # approve | reject


@router.post("/{goal_id}/review")
async def review_goal(
    goal_id: str,
    body: GoalReviewBody,
    store: KnowledgeStore = Depends(get_store),
    user: dict = Depends(require_auth),
):
    if body.action not in ("approve", "reject"):
        raise HTTPException(status_code=400, detail="action must be approve or reject")
    goal = store.get("goals", goal_id)
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    if goal.get("status") != "review":
        raise HTTPException(status_code=409, detail="Goal is not in review state")
    new_status = "done" if body.action == "approve" else "failed"
    updated = await store.update("goals", goal_id, {
        "status": new_status,
        "reviewed_by": user.get("username", "unknown"),
        "reviewed_at": datetime.now(UTC).isoformat(),
    })
    await bus.emit(
        GOAL_UPDATED,
        {
            "goal_id": goal_id,
            "workspace_id": updated["workspace_id"],
            "status": new_status,
        },
    )
    return updated
