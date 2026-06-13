"""Shared route dependencies — auth, session, etc."""

from typing import Annotated

from fastapi import Cookie, HTTPException

from app.services import session as session_svc


async def require_auth(
    SuperPmAgent_session: Annotated[str | None, Cookie()] = None,
) -> dict:
    if not SuperPmAgent_session:
        raise HTTPException(status_code=401, detail="not_logged_in")
    data = session_svc.decode(SuperPmAgent_session)
    if not data:
        raise HTTPException(status_code=401, detail="invalid_session")
    return data


async def require_founder(
    SuperPmAgent_session: Annotated[str | None, Cookie()] = None,
) -> dict:
    """Like require_auth, but only the founder (first repo binder) passes."""
    data = await require_auth(SuperPmAgent_session)

    from app.database import async_session
    from app.models.global_config import GlobalConfig

    async with async_session() as session:
        cfg = await session.get(GlobalConfig, 1)
    founder = cfg.founder_username if cfg else None
    if not founder or data.get("username") != founder:
        raise HTTPException(status_code=403, detail="founder_only")
    return data
