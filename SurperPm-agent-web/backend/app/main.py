"""FastAPI app entry for SuperPmAgent-web."""
import asyncio
import logging
import os

# When using uvicorn --reload on Windows, the worker subprocess may use
# SelectorEventLoop which raises NotImplementedError for subprocess operations.
# Start via 'python run.py' instead of raw uvicorn for proper event loop setup.
# See run.py for the ProactorEventLoop monkey-patch applied before uvicorn inits.

from contextlib import asynccontextmanager
from datetime import UTC, datetime

from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from app.database import create_db_and_tables
from app.routes import agents as agents_routes
from app.routes import auth as auth_routes
from app.routes import chat as chat_routes
from app.routes import config as config_routes
from app.routes import discussions as discussions_routes
from app.routes import discussions_standalone as discussions_standalone_routes
from app.routes import global_config as global_config_routes
from app.routes import goals as goals_routes
from app.routes import knowledge as knowledge_routes
from app.routes import learnings as learnings_routes
from app.routes import mcp as mcp_routes
from app.routes import plugins as plugins_routes
from app.routes import setup as setup_routes
from app.routes import skills as skills_routes
from app.routes import topics as topics_routes
from app.routes import topics_standalone as topics_standalone_routes
from app.routes import workspaces as workspace_routes
from app.routes import ws as ws_routes
from app.routes import ws_browser as ws_browser_routes
from app.services.browser_manager import browser_manager
from app.services.event_bus import ALL_EVENTS, bus
from app.services.knowledge_sync import ensure_knowledge_cloned
from app.services.platform import supports_terminal
from app.ws.hub import hub

if supports_terminal():
    from app.routes import ws_term as ws_term_routes


def _register_bus_to_hub_bridge():
    """Bridge all EventBus events to WSHub broadcasts (workspace + goal channels)."""
    for event_name in ALL_EVENTS:
        async def _handler(payload: dict, _evt: str = event_name):
            workspace_id = payload.get("workspace_id")
            if workspace_id:
                await hub.broadcast(workspace_id, _evt, payload)
            goal_id = payload.get("goal_id")
            if goal_id:
                await hub.broadcast(f"goal:{goal_id}", _evt, payload)
        bus.on(event_name, _handler)


_logger = logging.getLogger(__name__)

_bg_tasks: set[asyncio.Task] = set()


def _spawn_bg(coro, *, name: str | None = None) -> asyncio.Task:
    task = asyncio.create_task(coro, name=name)
    _bg_tasks.add(task)
    task.add_done_callback(_bg_tasks.discard)
    return task


KNOWLEDGE_POLL_INTERVAL = 300  # seconds — pull the knowledge mirror every 5 min


async def _background_knowledge_sync():
    """Run initial knowledge clone + logs import in background — must not block startup."""
    try:
        knowledge_dest = await ensure_knowledge_cloned()
        if knowledge_dest:
            from app.services.knowledge_store import get_store
            store = get_store()
            store.reload()
            _logger.info("KnowledgeStore reloaded after clone/pull")
    except (NotImplementedError, OSError) as e:
        _logger.warning("knowledge clone skipped: %s", e)
    except Exception:
        _logger.warning("knowledge clone failed", exc_info=True)


async def _poll_knowledge_sync():
    """Periodically `git pull` the knowledge mirror so it tracks the bound repo."""
    while True:
        await asyncio.sleep(KNOWLEDGE_POLL_INTERVAL)
        try:
            result = await ensure_knowledge_cloned()
            if result:
                from app.services.knowledge_store import get_store
                get_store().reload()
        except (NotImplementedError, OSError):
            pass
        except Exception:
            _logger.warning("knowledge poll sync failed", exc_info=True)


GOAL_SCHEDULER_INTERVAL = 30


async def _poll_goal_scheduler():
    """Check for delayed/scheduled goals and auto-execute them."""
    await asyncio.sleep(10)
    while True:
        try:
            from datetime import UTC
            from datetime import datetime as dt

            from app.services.goal_executor import execute_goal
            from app.services.knowledge_store import get_store

            store = get_store()
            now = dt.now(UTC).isoformat()
            goals = store.list("goals")

            for goal in goals:
                # Delayed TODO: delay_until has passed → execute
                delay = goal.get("delay_until")
                if (
                    goal.get("status") == "todo"
                    and delay
                    and delay <= now
                ):
                    gid = goal.get("id")
                    ws_id = goal.get("workspace_id", "")
                    _logger.info("Scheduler: executing delayed goal %s", gid)
                    await store.update("goals", gid, {"status": "doing"})
                    _spawn_bg(execute_goal(ws_id, gid))

                # Scheduled: check cron-like interval
                schedule = goal.get("schedule")
                if goal.get("status") == "scheduled" and schedule:
                    last = goal.get("last_scheduled_run", "")
                    try:
                        interval_h = float(schedule)
                    except (ValueError, TypeError):
                        continue
                    if interval_h < 1:
                        interval_h = 24
                    interval_s = interval_h * 3600
                    if not last or (
                        dt.fromisoformat(last).timestamp()
                        + interval_s
                        < dt.now(UTC).timestamp()
                    ):
                        _logger.info(
                            "Scheduler: running scheduled goal %s",
                            goal.get("id"),
                        )
                        ws_id = goal.get("workspace_id", "")
                        gid = goal.get("id")
                        await store.update("goals", gid, {
                            "last_scheduled_run": now,
                        })
                        _spawn_bg(execute_goal(ws_id, gid))

        except asyncio.CancelledError:
            break
        except Exception:
            _logger.warning(
                "goal scheduler poll failed", exc_info=True,
            )
        await asyncio.sleep(GOAL_SCHEDULER_INTERVAL)


async def _recover_stuck_executions():
    """Mark any running/pending executions as failed on startup."""
    from app.services.knowledge_store import get_store

    store = get_store()
    exes = store.list("executions")
    stuck = [e for e in exes if e.get("status") in ("running", "pending", "paused")]
    if not stuck:
        return
    now = datetime.now(UTC).isoformat()
    goal_ids = set()
    for exe in stuck:
        await store.update("executions", exe["id"], {
            "status": "failed",
            "error": "Server restarted — execution interrupted",
            "finished_at": now,
        })
        goal_ids.add(exe.get("goal_id"))
    for gid in goal_ids:
        goal = store.get("goals", gid)
        if goal and goal.get("status") == "doing":
            await store.update("goals", gid, {"status": "failed"})
            _logger.info("Recovered stuck goal %s → failed (manual retry required)", gid)
    _logger.info("Recovered %d stuck execution(s) on startup", len(stuck))


@asynccontextmanager
async def lifespan(app: FastAPI):
    await create_db_and_tables()
    await _recover_stuck_executions()

    _spawn_bg(_background_knowledge_sync())

    _register_bus_to_hub_bridge()

    try:
        await browser_manager.start()
    except (NotImplementedError, OSError) as e:
        _logger.warning("shared browser disabled: %s", e)

    poll_task = _spawn_bg(_poll_knowledge_sync())
    scheduler_task = _spawn_bg(_poll_goal_scheduler())
    app.state.hub = hub
    app.state.bus = bus
    app.state.knowledge_poll_task = poll_task
    app.state.scheduler_task = scheduler_task
    yield
    poll_task.cancel()
    scheduler_task.cancel()
    try:
        await browser_manager.stop()
    except Exception:
        pass


app = FastAPI(
    title="SuperPmAgent-web",
    version="0.1.0",
    description="SuperPmAgent养护室 — 配置 + 澄清 + Goal 控制台",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:5174,http://localhost:5175,http://localhost:5176").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_routes.router, prefix="/api/auth", tags=["auth"])
app.include_router(chat_routes.router, prefix="/api/chat", tags=["chat"])
app.include_router(setup_routes.router, prefix="/api/setup", tags=["setup"])
app.include_router(config_routes.router, prefix="/api/config", tags=["config"])
app.include_router(knowledge_routes.router, prefix="/api/knowledge", tags=["knowledge"])
app.include_router(learnings_routes.router, prefix="/api/learnings", tags=["learnings"])
app.include_router(workspace_routes.router, prefix="/api/workspaces", tags=["workspaces"])
app.include_router(goals_routes.router, prefix="/api/goals", tags=["goals"])
app.include_router(
    discussions_routes.router,
    prefix="/api/goals/{goal_id}/discussions",
    tags=["discussions"],
)
app.include_router(
    topics_routes.router,
    prefix="/api/goals/{goal_id}/topics",
    tags=["topics"],
)
app.include_router(
    global_config_routes.router,
    prefix="/api/global-config",
    tags=["global-config"],
)
app.include_router(
    discussions_standalone_routes.router,
    prefix="/api/discussions",
    tags=["discussions-standalone"],
)
app.include_router(
    topics_standalone_routes.router,
    prefix="/api/topics",
    tags=["topics-standalone"],
)

app.include_router(
    skills_routes.router,
    prefix="/api/workspaces/{workspace_id}/skills",
    tags=["skills"],
)

app.include_router(
    mcp_routes.router,
    prefix="/api/workspaces/{workspace_id}/mcp",
    tags=["mcp"],
)

app.include_router(
    plugins_routes.router,
    prefix="/api/plugins",
    tags=["plugins"],
)



app.include_router(
    agents_routes.router,
    prefix="/api/agents",
    tags=["agents"],
)

app.include_router(ws_routes.router)
app.include_router(ws_browser_routes.router)
if supports_terminal():
    app.include_router(ws_term_routes.router)


@app.get("/api/artifacts/{file_path:path}")
async def serve_artifact(file_path: str, request: Request):
    """Serve goal execution artifacts (md, docx, pdf, etc) for download."""
    from app.services.knowledge_store import get_store

    store = get_store()
    root = store.knowledge_root
    artifacts_dir = store.logs_root / "goal" / "workspace"
    target = (artifacts_dir / file_path).resolve()

    if not str(target).startswith(str(artifacts_dir.resolve())):
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail="Path traversal not allowed")
    if not target.is_file():
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Artifact not found")

    viewable = {".html", ".htm", ".svg", ".png", ".jpg", ".jpeg", ".gif", ".pdf", ".txt", ".md"}
    if target.suffix.lower() in viewable:
        return FileResponse(target)
    return FileResponse(target, filename=target.name)


@app.get("/")
def root() -> dict:
    return {"name": "SuperPmAgent-web", "version": "0.1.0", "status": "ok"}


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}
