"""Goal submit + dashboard + HITL."""
from fastapi import APIRouter

from app.models import GoalRun, GoalSubmit

router = APIRouter()


@router.post("/submit")
async def submit(goal: GoalSubmit) -> dict:
    """Provision a LAP pod (or local worktree) and start the loop."""
    # TODO (W2): call goal_runner.py
    return {"id": "L000", "status": "queued"}


@router.get("/list")
async def list_goals() -> list[GoalRun]:
    """List all goals (running / paused / done)."""
    # TODO (W2): query goal_runner state
    return []


@router.post("/{goal_id}/pause")
async def pause(goal_id: str) -> dict:
    return {"id": goal_id, "status": "paused"}


@router.post("/{goal_id}/resume")
async def resume(goal_id: str) -> dict:
    return {"id": goal_id, "status": "running"}


@router.post("/{goal_id}/stop")
async def stop(goal_id: str) -> dict:
    return {"id": goal_id, "status": "stopped"}


@router.post("/{goal_id}/reply")
async def reply(goal_id: str, payload: dict) -> dict:
    """Reply to a HITL question from the loop."""
    # TODO (W2): forward to pod
    return {"ok": True}
