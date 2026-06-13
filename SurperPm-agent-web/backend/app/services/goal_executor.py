"""Goal execution engine V2 — orchestrates agent runs via DB-backed Execution rows."""
import logging
from datetime import datetime, timezone

from sqlmodel import select

from app.config import settings
from app.database import async_session
from app.models.discussion import Discussion
from app.models.execution import Execution
from app.models.goal import Goal
from app.services.event_bus import (
    bus,
    EXECUTION_STARTED,
    EXECUTION_PROGRESS,
    EXECUTION_COMPLETED,
    GOAL_UPDATED,
)
from app.services.execution_lock import get_lock
from app.services.knowledge_distiller import distill_execution

_logger = logging.getLogger(__name__)


async def compose_goal_context(workspace_id: str, goal: Goal) -> str:
    """Assemble the prompt context for a goal execution."""
    parts = [f"# Goal: {goal.title}"]
    if goal.description:
        parts.append(f"\n{goal.description}")

    async with async_session() as db:
        stmt = (
            select(Discussion)
            .where(Discussion.workspace_id == workspace_id)
            .order_by(Discussion.created_at.desc())
            .limit(20)
        )
        result = await db.execute(stmt)
        recent = list(reversed(result.scalars().all()))

    if recent:
        parts.append("\n## Recent discussion context")
        for msg in recent:
            parts.append(f"[{msg.role}] {msg.content}")

    return "\n".join(parts)


async def execute_goal(workspace_id: str, goal_id: int) -> None:
    """Background task: run agent for a goal. Serialised per workspace."""
    lock = get_lock(workspace_id)
    async with lock:
        await _run(workspace_id, goal_id)


async def _run(workspace_id: str, goal_id: int) -> None:
    execution_id: str | None = None
    try:
        async with async_session() as db:
            stmt = select(Goal).where(
                Goal.id == goal_id, Goal.workspace_id == workspace_id
            )
            result = await db.execute(stmt)
            goal = result.scalar_one_or_none()
            if not goal:
                _logger.warning("Goal %d not found in workspace %s", goal_id, workspace_id)
                return

            execution = Execution(
                goal_id=goal_id,
                workspace_id=workspace_id,
                status="running",
                started_at=datetime.now(timezone.utc),
                token_budget=goal.token_budget,
            )
            db.add(execution)
            await db.commit()
            await db.refresh(execution)
            execution_id = execution.id

        await bus.emit(EXECUTION_STARTED, {
            "execution_id": execution_id,
            "goal_id": goal_id,
            "workspace_id": workspace_id,
        })

        context = await compose_goal_context(workspace_id, goal)

        api_key = settings.anthropic_api_key
        if not api_key:
            raise RuntimeError("ANTHROPIC_API_KEY not configured")

        from app.services.agent import run_goal_agent

        token_total = 0

        async def _on_event(message):
            nonlocal token_total
            usage = getattr(message, "usage", None)
            if usage:
                token_total += (
                    getattr(usage, "input_tokens", 0)
                    + getattr(usage, "output_tokens", 0)
                )
                await bus.emit(EXECUTION_PROGRESS, {
                    "execution_id": execution_id,
                    "goal_id": goal_id,
                    "workspace_id": workspace_id,
                    "token_used": token_total,
                })

        agent_result = await run_goal_agent(
            goal_text=context,
            cwd=settings.target_repo_path or None,
            max_turns=50,
            model=settings.agent_model or None,
            on_event=_on_event,
        )

        async with async_session() as db:
            stmt = select(Execution).where(Execution.id == execution_id)
            result = await db.execute(stmt)
            execution = result.scalar_one()
            execution.status = "success"
            execution.finished_at = datetime.now(timezone.utc)
            execution.token_used = agent_result.tokens_used
            execution.pr_url = agent_result.pr_url
            execution.summary = f"Completed in {agent_result.iterations} iterations"
            db.add(execution)

            stmt2 = select(Goal).where(Goal.id == goal_id)
            result2 = await db.execute(stmt2)
            goal = result2.scalar_one()
            goal.status = "done"
            db.add(goal)

            await db.commit()
            await db.refresh(execution)
            await db.refresh(goal)

        try:
            distill_execution(goal, execution)
        except Exception:
            _logger.warning("Knowledge distillation failed for execution %s", execution_id)

        await bus.emit(EXECUTION_COMPLETED, {
            "execution_id": execution_id,
            "goal_id": goal_id,
            "workspace_id": workspace_id,
            "status": "success",
            "token_used": agent_result.tokens_used,
        })
        await bus.emit(GOAL_UPDATED, {
            "goal_id": goal_id,
            "workspace_id": workspace_id,
            "status": "done",
        })

    except Exception as e:
        _logger.error("Execution failed for goal %d: %s", goal_id, e)
        if execution_id:
            try:
                async with async_session() as db:
                    stmt = select(Execution).where(Execution.id == execution_id)
                    result = await db.execute(stmt)
                    execution = result.scalar_one_or_none()
                    if execution:
                        execution.status = "failed"
                        execution.finished_at = datetime.now(timezone.utc)
                        execution.error = str(e)
                        db.add(execution)

                    stmt2 = select(Goal).where(Goal.id == goal_id)
                    result2 = await db.execute(stmt2)
                    goal = result2.scalar_one_or_none()
                    if goal:
                        goal.status = "failed"
                        db.add(goal)

                    await db.commit()
            except Exception:
                _logger.exception("Failed to update execution/goal status on error")

        await bus.emit(EXECUTION_COMPLETED, {
            "execution_id": execution_id,
            "goal_id": goal_id,
            "workspace_id": workspace_id,
            "status": "failed",
            "error": str(e),
        })
        await bus.emit(GOAL_UPDATED, {
            "goal_id": goal_id,
            "workspace_id": workspace_id,
            "status": "failed",
        })
