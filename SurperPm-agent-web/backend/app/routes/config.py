"""Config tabs — integrations / profile / extensions / usage."""
from fastapi import APIRouter

router = APIRouter()


@router.get("/integrations")
async def integrations() -> dict:
    # TODO (W2): probe key liveness
    return {"github": False, "anthropic": False, "doubao": False, "lap": False}


@router.put("/integrations")
async def update_integrations(payload: dict) -> dict:
    # TODO (W2): write to .env / vault
    return {"ok": True}


@router.get("/profile")
async def profile() -> dict:
    # TODO (W2): read knowledge/profiles/team.md from fork
    return {"content": ""}


@router.put("/profile")
async def update_profile(payload: dict) -> dict:
    # TODO (W2): commit to fork
    return {"ok": True}


@router.get("/extensions")
async def extensions() -> list:
    # TODO (W2): list knowledge/extensions/**.md from fork
    return []
