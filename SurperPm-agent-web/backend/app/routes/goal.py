"""Goal submit + dashboard + HITL."""
from fastapi import APIRouter, Request

from app.config import settings
from app.models import GoalSubmit

router = APIRouter()


@router.post("/submit")
async def submit(request: Request, goal: GoalSubmit) -> dict:
    """Start goal execution via claude-agent-sdk."""
    runner = request.app.state.goal_runner
    run_id = await runner.start_goal(
        text=goal.text,
        plugin_path=settings.plugin_repo_path,
        repo_path=settings.target_repo_path,
    )
    return {"id": run_id, "status": "running"}


@router.get("/list")
async def list_goals(request: Request) -> list[dict]:
    """List all goal runs."""
    runner = request.app.state.goal_runner
    return runner.list_runs()


@router.get("/{goal_id}")
async def get_goal(request: Request, goal_id: str) -> dict:
    """Get a single goal run by id."""
    runner = request.app.state.goal_runner
    run = runner.get_run(goal_id)
    if run is None:
        return {"error": "not found"}
    return run


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
