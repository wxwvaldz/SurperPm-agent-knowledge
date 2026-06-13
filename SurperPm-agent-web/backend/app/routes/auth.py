"""Auth — login via GitHub PAT, logout, current user.

SuperPmAgent does not have a user table. Session = itsdangerous-signed cookie
carrying the user's GitHub PAT + username + repo. Identity is implicit:
"if you can clone the repo with this PAT, you can log in".
"""
from typing import Annotated

import httpx
from fastapi import APIRouter, Cookie, HTTPException, Response

from app.services import session as session_svc

router = APIRouter()

COOKIE_NAME = "SuperPmAgent_session"
COOKIE_MAX_AGE = 7 * 24 * 3600  # 7 days


@router.post("/login")
async def login(payload: dict, response: Response) -> dict:
    """Validate (pat, repo) by calling GitHub. On success, set session cookie."""
    pat = payload.get("pat", "").strip()
    repo = payload.get("repo", "").strip()
    if not pat or not repo:
        raise HTTPException(status_code=400, detail="pat and repo required")

    async with httpx.AsyncClient() as client:
        r = await client.get(
            f"https://api.github.com/repos/{repo}",
            headers={
                "Authorization": f"Bearer {pat}",
                "Accept": "application/vnd.github+json",
            },
            timeout=10.0,
        )

    if r.status_code != 200:
        raise HTTPException(
            status_code=401,
            detail="Invalid PAT or no access to that repo",
        )

    username = r.json().get("owner", {}).get("login", "unknown")
    cookie_value = session_svc.encode(
        {"pat": pat, "repo": repo, "username": username}
    )
    response.set_cookie(
        key=COOKIE_NAME,
        value=cookie_value,
        httponly=True,
        samesite="lax",
        max_age=COOKIE_MAX_AGE,
    )

    # TODO (W2): probe whether knowledge/profiles/<username>.md exists in the
    # repo and return profile_missing flag so frontend can route to /setup.
    return {"ok": True, "username": username, "repo": repo, "profile_missing": True}


@router.post("/logout")
async def logout(response: Response) -> dict:
    response.delete_cookie(COOKIE_NAME)
    return {"ok": True}


@router.get("/me")
async def me(
    SuperPmAgent_session: Annotated[str | None, Cookie()] = None,
) -> dict:
    """Return current logged-in user; 401 if no/invalid cookie."""
    if not SuperPmAgent_session:
        raise HTTPException(status_code=401, detail="not_logged_in")
    data = session_svc.decode(SuperPmAgent_session)
    if not data:
        raise HTTPException(status_code=401, detail="invalid_session")
    return {"username": data["username"], "repo": data["repo"]}
