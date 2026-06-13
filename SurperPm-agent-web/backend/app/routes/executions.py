"""V2 Executions API — workspace-scoped list/detail/cancel."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.database import get_session
from app.routes.deps import require_auth
from app.models.execution import Execution
from app.services.event_bus import bus, EXECUTION_COMPLETED

router = APIRouter()


@router.get("")
async def list_executions(
    workspace_id: str,
    goal_id: int | None = None,
    session: AsyncSession = Depends(get_session),
    _user: dict = Depends(require_auth),
):
    stmt = select(Execution).where(Execution.workspace_id == workspace_id)
    if goal_id is not None:
        stmt = stmt.where(Execution.goal_id == goal_id)
    stmt = stmt.order_by(Execution.created_at.desc())
    result = await session.execute(stmt)
    return result.scalars().all()


@router.get("/{execution_id}")
async def get_execution(
    workspace_id: str,
    execution_id: str,
    session: AsyncSession = Depends(get_session),
    _user: dict = Depends(require_auth),
):
    stmt = select(Execution).where(
        Execution.id == execution_id, Execution.workspace_id == workspace_id
    )
    result = await session.execute(stmt)
    execution = result.scalar_one_or_none()
    if not execution:
        raise HTTPException(status_code=404, detail="Execution not found")
    return execution


@router.post("/{execution_id}/cancel", status_code=200)
async def cancel_execution(
    workspace_id: str,
    execution_id: str,
    session: AsyncSession = Depends(get_session),
    _user: dict = Depends(require_auth),
):
    stmt = select(Execution).where(
        Execution.id == execution_id, Execution.workspace_id == workspace_id
    )
    result = await session.execute(stmt)
    execution = result.scalar_one_or_none()
    if not execution:
        raise HTTPException(status_code=404, detail="Execution not found")
    if execution.status not in ("pending", "running"):
        raise HTTPException(status_code=409, detail="Execution is not running")

    execution.status = "failed"
    execution.error = "Cancelled by user"
    session.add(execution)
    await session.commit()
    await session.refresh(execution)

    await bus.emit(EXECUTION_COMPLETED, {
        "execution_id": execution_id,
        "goal_id": execution.goal_id,
        "workspace_id": workspace_id,
        "status": "failed",
        "error": "Cancelled by user",
    })

    return {"ok": True, "execution_id": execution_id}
