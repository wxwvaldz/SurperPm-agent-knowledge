"""FastAPI app entry for SuperPmAgent-web."""
import asyncio
import logging
from contextlib import asynccontextmanager
from datetime import UTC, datetime

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import select

from app.database import async_session, create_db_and_tables
from app.models.execution import Execution
from app.models.goal import Goal
from app.routes import auth as auth_routes
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
# ws_term 依赖 fcntl/pty/termios 等 Unix 专属模块，Windows 上不可用。
try:
    from app.routes import ws_term as ws_term_routes

    _HAS_WS_TERM = True
except ModuleNotFoundError:
    _HAS_WS_TERM = False
from app.services.browser_manager import browser_manager
from app.services.event_bus import ALL_EVENTS, bus
from app.services.knowledge_sync import ensure_knowledge_cloned
from app.ws.hub import hub


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

KNOWLEDGE_POLL_INTERVAL = 300  # seconds — pull the knowledge mirror every 5 min


async def _poll_knowledge_sync():
    """Periodically `git pull` the knowledge mirror so it tracks the bound repo."""
    while True:
        await asyncio.sleep(KNOWLEDGE_POLL_INTERVAL)
        try:
            await ensure_knowledge_cloned()
        except (NotImplementedError, OSError):
            pass
        except Exception:
            _logger.warning("knowledge poll sync failed", exc_info=True)


async def _recover_stuck_executions():
    """Mark any running/pending executions as failed on startup."""
    async with async_session() as session:
        stmt = select(Execution).where(Execution.status.in_(["running", "pending"]))
        result = await session.execute(stmt)
        stuck = result.scalars().all()
        if not stuck:
            return
        now = datetime.now(UTC)
        goal_ids = set()
        for exe in stuck:
            exe.status = "failed"
            exe.error = "Server restarted — execution interrupted"
            exe.finished_at = now
            session.add(exe)
            goal_ids.add(exe.goal_id)
        for gid in goal_ids:
            goal = await session.get(Goal, gid)
            if goal and goal.status == "doing":
                goal.status = "failed"
                session.add(goal)
        await session.commit()
        _logger.info("Recovered %d stuck execution(s) on startup", len(stuck))


@asynccontextmanager
async def lifespan(app: FastAPI):
    await create_db_and_tables()
    await _recover_stuck_executions()

    # Gracefully degrade on platforms where subprocess is unavailable (e.g. Python 3.14 on Windows).
    try:
        await ensure_knowledge_cloned()
    except (NotImplementedError, OSError) as e:
        _logger.warning("knowledge clone skipped: %s", e)

    _register_bus_to_hub_bridge()

    try:
        await browser_manager.start()
    except (NotImplementedError, OSError) as e:
        _logger.warning("shared browser disabled: %s", e)

    poll_task = asyncio.create_task(_poll_knowledge_sync())
    app.state.hub = hub
    app.state.bus = bus
    app.state.knowledge_poll_task = poll_task
    yield
    poll_task.cancel()
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
    allow_origins=["http://localhost:5173", "http://localhost:5174", "http://localhost:5175", "http://localhost:5176"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_routes.router, prefix="/api/auth", tags=["auth"])
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

app.include_router(ws_routes.router)
app.include_router(ws_browser_routes.router)
if _HAS_WS_TERM:
    app.include_router(ws_term_routes.router)


@app.get("/")
def root() -> dict:
    return {"name": "SuperPmAgent-web", "version": "0.1.0", "status": "ok"}


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}
