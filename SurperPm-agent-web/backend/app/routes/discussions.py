"""Discussions API — goal-scoped messaging + AI reply."""
import asyncio

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.routes.deps import require_auth
from app.services.discuss_parser import parse_goal_mentions
from app.services.event_bus import DISCUSSION_CREATED, GOAL_UPDATED, bus
from app.services.goal_executor import execute_goal as _execute_goal_bg
from app.services.knowledge_store import KnowledgeStore, get_store

router = APIRouter()

_bg_tasks: set[asyncio.Task] = set()


def _spawn_bg(coro) -> asyncio.Task:
    task = asyncio.create_task(coro)
    _bg_tasks.add(task)
    task.add_done_callback(_bg_tasks.discard)
    return task


class DiscussionCreate(BaseModel):
    content: str
    role: str = "user"
    parent_id: int | None = None
    topic_id: int | None = None
    image_data_uri: str | None = None
    card_response: dict | None = None


@router.get("")
async def list_discussions(
    goal_id: str,
    topic_id: int | None = None,
    limit: int = 50,
    offset: int = 0,
    store: KnowledgeStore = Depends(get_store),
    _user: dict = Depends(require_auth),
):
    goal = store.get("goals", goal_id)
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    rows = store.list_discussions(topic_id=topic_id)
    filtered = [r for r in rows if r.get("workspace_id") == goal["workspace_id"]]
    filtered.sort(key=lambda r: r.get("created_at", ""))
    return filtered[offset:offset + limit]


@router.get("/{discussion_id}")
async def get_discussion(
    goal_id: str,
    discussion_id: int,
    store: KnowledgeStore = Depends(get_store),
    _user: dict = Depends(require_auth),
):
    goal = store.get("goals", goal_id)
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    disc = store.get_discussion(discussion_id)
    if not disc:
        raise HTTPException(status_code=404, detail="Discussion not found")
    return disc


@router.post("", status_code=201)
async def create_discussion(
    goal_id: str,
    body: DiscussionCreate,
    store: KnowledgeStore = Depends(get_store),
    user: dict = Depends(require_auth),
):
    goal = store.get("goals", goal_id)
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    workspace_id = goal["workspace_id"]

    disc_data: dict = {
        "workspace_id": workspace_id,
        "content": body.content,
        "role": body.role,
        "author": user.get("username", ""),
        "parent_id": body.parent_id,
        "topic_id": body.topic_id,
        "goal_id": goal_id,
    }
    if body.image_data_uri:
        disc_data["image_data_uri"] = body.image_data_uri
    if body.card_response:
        disc_data["card_response"] = body.card_response
    discussion = await store.create_discussion(disc_data)

    mentioned_ids = parse_goal_mentions(body.content)
    for mid in mentioned_ids:
        g = store.get("goals", mid)
        if g and g.get("workspace_id") == workspace_id and g.get("status") != "doing":
            await store.update("goals", mid, {"status": "doing"})
            await bus.emit(GOAL_UPDATED, {
                "goal_id": mid,
                "workspace_id": workspace_id,
                "status": "doing",
            })
            _spawn_bg(_execute_goal_bg(workspace_id, mid))

    await bus.emit(DISCUSSION_CREATED, {
        "id": discussion["id"],
        "workspace_id": workspace_id,
        "goal_id": goal_id,
        "role": discussion["role"],
        "content": discussion["content"],
        "topic_id": body.topic_id,
        "created_at": discussion["created_at"],
    })

    if body.role == "user":
        from app.services.ai_chat import generate_ai_reply

        _spawn_bg(
            generate_ai_reply(
                workspace_id, body.content,
                goal_id=goal_id,
                image_data_uri=body.image_data_uri,
                topic_id=body.topic_id,
            )
        )

    return discussion
