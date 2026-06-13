"""Goal submit + dashboard + HITL — delegates to goal_runner."""

from fastapi import APIRouter, HTTPException

from app.models import GoalRun, GoalSubmit
from app.services.goal_runner import (
    create_sandbox,
    get_sandbox,
    list_sandboxes,
    pause_sandbox,
    reply_sandbox,
    resume_sandbox,
    stop_sandbox,
)

router = APIRouter()


@router.post("/submit", status_code=201)
async def submit(goal: GoalSubmit) -> GoalRun:
    """Provision a sandbox (local or LAP) and start the /goal loop."""
    return await create_sandbox(goal)


@router.get("/list")
async def list_goals() -> list[GoalRun]:
    """List all goals (running / paused / done / failed)."""
    return await list_sandboxes()


@router.get("/{goal_id}")
async def get_goal(goal_id: str) -> GoalRun:
    """Get a single goal run by ID."""
    run = await get_sandbox(goal_id)
    if not run:
        raise HTTPException(status_code=404, detail="goal not found")
    return run


@router.post("/{goal_id}/pause")
async def pause(goal_id: str) -> GoalRun:
    """Pause a running goal."""
    run = await pause_sandbox(goal_id)
    if not run:
        raise HTTPException(status_code=404, detail="goal not found")
    return run


@router.post("/{goal_id}/resume")
async def resume(goal_id: str) -> GoalRun:
    """Resume a paused goal."""
    run = await resume_sandbox(goal_id)
    if not run:
        raise HTTPException(status_code=404, detail="goal not found")
    return run


@router.post("/{goal_id}/stop")
async def stop(goal_id: str) -> GoalRun:
    """Stop and terminate a goal."""
    run = await stop_sandbox(goal_id)
    if not run:
        raise HTTPException(status_code=404, detail="goal not found")
    return run


@router.post("/{goal_id}/reply")
async def reply(goal_id: str, payload: dict) -> dict:
    """Reply to a HITL question from the loop."""
    ok = await reply_sandbox(goal_id, payload)
    if not ok:
        raise HTTPException(status_code=404, detail="goal not found")
    return {"ok": True}