"""Shared helper functions used across routes and services."""
import os
import re

from app.config import settings
from app.services.knowledge_store import KnowledgeStore


def knowledge_root() -> str:
    return os.getenv("KNOWLEDGE_REPO_PATH") or settings.knowledge_repo_path


def get_default_workspace_id(store: "KnowledgeStore") -> str:
    from fastapi import HTTPException
    workspaces = store.list("workspaces")
    if not workspaces:
        raise HTTPException(status_code=404, detail="No workspace found")
    return workspaces[0]["id"]


def extract_session_cookie(ws) -> str | None:
    from http.cookies import SimpleCookie
    raw = ws.headers.get("cookie", "")
    if not raw:
        return None
    cookie = SimpleCookie(raw)
    morsel = cookie.get("SuperPmAgent_session")
    return morsel.value if morsel else None


def slugify(title: str, goal_id: str | None = None) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")[:60]
    return slug or f"goal-{goal_id or 0}"


def resolve_workspace(store: KnowledgeStore, workspace_ref: str) -> dict | None:
    ws = store.get("workspaces", workspace_ref)
    if ws:
        return ws
    for w in store.list("workspaces"):
        if w.get("slug") == workspace_ref:
            return w
    return None
