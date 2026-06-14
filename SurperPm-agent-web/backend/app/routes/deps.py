"""Shared route dependencies — auth, session, etc."""

import logging
import time
from typing import Annotated

from fastapi import Cookie, Header, HTTPException

from app.services import session as session_svc

_logger = logging.getLogger(__name__)

# Short-lived cache for Bearer token validation: {pat: (user_dict, expire_ts)}
_bearer_cache: dict[str, tuple[dict, float]] = {}
_BEARER_CACHE_TTL = 300  # 5 minutes


async def _validate_bearer_pat(pat: str) -> dict:
    """Validate a GitHub PAT and return a session-shaped dict.

    Uses a short TTL cache to avoid hitting GitHub API on every request.
    """
    now = time.time()
    cached = _bearer_cache.get(pat)
    if cached and cached[1] > now:
        return cached[0]

    from app.services import github_client

    try:
        info = github_client.get_user_info(pat)
    except Exception:
        raise HTTPException(status_code=401, detail="invalid_github_token")

    user = {
        "github_token": pat,
        "username": info["username"],
        "avatar_url": info.get("avatar_url", ""),
        "repo": "",
        "anthropic_key": "",
    }
    _bearer_cache[pat] = (user, now + _BEARER_CACHE_TTL)
    return user


async def require_auth(
    SuperPmAgent_session: Annotated[str | None, Cookie()] = None,
    authorization: Annotated[str | None, Header()] = None,
) -> dict:
    # 1. Try cookie first (normal browser flow)
    if SuperPmAgent_session:
        data = session_svc.decode(SuperPmAgent_session)
        if data:
            return data

    # 2. Try Authorization: Bearer <github_pat> (API / bot flow)
    if authorization and authorization.lower().startswith("bearer "):
        pat = authorization[7:].strip()
        if pat:
            return await _validate_bearer_pat(pat)

    raise HTTPException(status_code=401, detail="not_logged_in")


async def require_founder(
    SuperPmAgent_session: Annotated[str | None, Cookie()] = None,
    authorization: Annotated[str | None, Header()] = None,
) -> dict:
    """Like require_auth, but only the founder (first repo binder) passes."""
    data = await require_auth(SuperPmAgent_session, authorization)

    from app.database import async_session
    from app.models.global_config import GlobalConfig

    async with async_session() as session:
        cfg = await session.get(GlobalConfig, 1)
    founder = cfg.founder_username if cfg else None
    if not founder or data.get("username") != founder:
        raise HTTPException(status_code=403, detail="founder_only")
    return data
