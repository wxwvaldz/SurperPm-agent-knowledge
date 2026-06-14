"""Config tabs — integrations / profile / extensions / usage / ai / server."""
from pathlib import Path

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.config import get_config, settings, update_config
from app.routes.deps import require_auth

router = APIRouter()

KNOWLEDGE_ROOT = (
    Path(settings.knowledge_repo_path) if settings.knowledge_repo_path else Path("knowledge")
)
PLUGIN_ROOT = Path(settings.plugin_repo_path) if settings.plugin_repo_path else None


@router.get("/integrations")
async def integrations(_user: dict = Depends(require_auth)) -> list:
    github_connected = bool(_user.get("github_token"))
    items = [
        {
            "name": "GitHub PAT",
            "endpoint": "https://api.github.com",
            "connected": github_connected,
        },
        {
            "name": "模型 endpoint",
            "endpoint": settings.anthropic_base_url or "https://api.anthropic.com",
            "connected": bool(settings.anthropic_api_key),
        },
    ]
    return items


@router.get("/profile")
async def profile(_user: dict = Depends(require_auth)) -> dict:
    team_file = KNOWLEDGE_ROOT / "profiles" / "team.md"
    if team_file.is_file():
        return {"content": team_file.read_text(encoding="utf-8")}
    return {"content": ""}


@router.put("/profile")
async def update_profile(payload: dict, _user: dict = Depends(require_auth)) -> dict:
    team_file = KNOWLEDGE_ROOT / "profiles" / "team.md"
    team_file.parent.mkdir(parents=True, exist_ok=True)
    content = payload.get("content", "")
    team_file.write_text(content, encoding="utf-8")
    return {"ok": True}


@router.get("/extensions")
async def extensions(_user: dict = Depends(require_auth)) -> list:
    if not PLUGIN_ROOT or not PLUGIN_ROOT.is_dir():
        return []
    result = []
    for category_dir in sorted(PLUGIN_ROOT.iterdir()):
        if not category_dir.is_dir() or category_dir.name.startswith("."):
            continue
        skill_file = category_dir / "SKILL.md"
        if skill_file.is_file():
            content = skill_file.read_text(encoding="utf-8")
            title = category_dir.name
            for line in content.splitlines():
                if line.startswith("# "):
                    title = line[2:].strip()
                    break
            result.append({
                "name": title,
                "category": category_dir.name,
                "path": str(category_dir.relative_to(PLUGIN_ROOT)),
            })
    return result


class AIConfigPayload(BaseModel):
    base_url: str | None = None
    api_key: str | None = None
    model: str | None = None


@router.get("/ai")
async def get_ai_config(_user: dict = Depends(require_auth)) -> dict:
    cfg = get_config()
    ai = cfg.get("ai", {})
    api_key = ai.get("api_key", "")
    return {
        "base_url": ai.get("base_url", ""),
        "api_key_masked": ("*" * 8 + api_key[-4:]) if api_key else "",
        "api_key_set": bool(api_key),
        "model": ai.get("model", ""),
    }


@router.patch("/ai")
async def update_ai_config(
    payload: AIConfigPayload, _user: dict = Depends(require_auth)
) -> dict:
    patch: dict = {}
    if payload.base_url is not None:
        patch["base_url"] = payload.base_url
    if payload.api_key is not None:
        patch["api_key"] = payload.api_key
    if payload.model is not None:
        patch["model"] = payload.model
    if patch:
        update_config({"ai": patch})
    return {"ok": True}


class ServerConfigPayload(BaseModel):
    ai: dict | None = None
    github: dict | None = None
    paths: dict | None = None
    server: dict | None = None


@router.get("/server")
async def get_server_config(_user: dict = Depends(require_auth)) -> dict:
    """Return the full config.json (masking sensitive fields)."""
    cfg = get_config()
    safe = {
        "server": {
            "port": cfg["server"].get("port", 8000),
            "database_url": cfg["server"].get("database_url", ""),
            "frontend_url": cfg["server"].get("frontend_url", ""),
            "session_secret_set": bool(cfg["server"].get("session_secret")),
            "encryption_key_set": bool(cfg["server"].get("encryption_key")),
        },
        "ai": {
            "base_url": cfg["ai"].get("base_url", ""),
            "api_key_set": bool(cfg["ai"].get("api_key")),
            "model": cfg["ai"].get("model", ""),
        },
        "github": {
            "oauth_client_id": cfg["github"].get("oauth_client_id", ""),
            "oauth_configured": bool(cfg["github"].get("oauth_client_secret")),
            "oauth_redirect_uri": cfg["github"].get("oauth_redirect_uri", ""),
        },
        "paths": cfg.get("paths", {}),
    }
    return safe


@router.patch("/server")
async def update_server_config(
    payload: ServerConfigPayload, _user: dict = Depends(require_auth)
) -> dict:
    """Update config.json sections. Sensitive keys in server section are excluded."""
    patch: dict = {}
    if payload.ai is not None:
        patch["ai"] = payload.ai
    if payload.github is not None:
        patch["github"] = payload.github
    if payload.paths is not None:
        patch["paths"] = payload.paths
    if payload.server is not None:
        safe_server = {k: v for k, v in payload.server.items()
                       if k not in ("session_secret", "encryption_key")}
        if safe_server:
            patch["server"] = safe_server
    if patch:
        old_cfg = get_config()
        update_config(patch)

        if payload.paths is not None:
            new_cfg = get_config()
            old_kr = old_cfg.get("paths", {}).get("knowledge_repo", "")
            new_kr = new_cfg.get("paths", {}).get("knowledge_repo", "")
            if new_kr != old_kr:
                from app.services.knowledge_store import reinit_store
                reinit_store()

    return {"ok": True}


@router.get("/usage")
async def usage(
    _user: dict = Depends(require_auth),
) -> dict:
    from app.services.knowledge_store import get_store

    store = get_store()
    exes = store.list("executions")
    total_tokens = sum(e.get("token_used") or 0 for e in exes)
    return {
        "total_tokens": total_tokens,
        "total_executions": len(exes),
    }
