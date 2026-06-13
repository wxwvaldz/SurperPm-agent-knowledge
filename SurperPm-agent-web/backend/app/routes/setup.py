"""Setup wizard routes — one-time config of the user's fork."""
from fastapi import APIRouter

router = APIRouter()


@router.get("/state")
async def state() -> dict:
    """Return current setup completeness."""
    # TODO (W2): probe ~/.SuperPmAgent/config.toml + the fork's CLAUDE.md
    return {"completed": False, "step": 0}


@router.post("/save-step")
async def save_step(payload: dict) -> dict:
    """Save one wizard step's data to the user's fork."""
    # TODO (W2): write to fork via GitHub API
    return {"ok": True, "step": payload.get("step", 0)}


@router.post("/finish")
async def finish() -> dict:
    """Mark setup complete + emit the CLI install command."""
    return {
        "ok": True,
        "cli": "/plugin marketplace add <fork-url>",
    }
