"""Knowledge repo sync — git clone / pull from remote."""
from __future__ import annotations

import asyncio
import logging
import shutil
from pathlib import Path

from app.config import settings
from app.services.platform import run_cmd

_logger = logging.getLogger(__name__)

_DEFAULT_PATH = Path("data/knowledge")
_GIT_TIMEOUT = 30
_sync_lock = asyncio.Lock()

def _target_path() -> Path:
    return Path(settings.knowledge_repo_path) if settings.knowledge_repo_path else _DEFAULT_PATH


async def _has_local_changes(dest: Path) -> bool:
    try:
        out = await run_cmd("git", "-C", str(dest), "status", "--porcelain", timeout=10)
        return bool(out.strip()) if out else False
    except Exception:
        return False


async def _auto_commit(dest: Path) -> bool:
    try:
        paths_to_add = [
            "profiles/", "domain/", "learnings/", "extensions/",
            "skills/", "_meta/", "*.md",
            ".logs/settings/",
        ]

        await run_cmd("git", "-C", str(dest), "add", *paths_to_add, timeout=10)

        from datetime import datetime, UTC
        msg = f"auto-sync: {datetime.now(UTC).strftime('%Y-%m-%d %H:%M')}"
        await run_cmd("git", "-C", str(dest), "commit", "-m", msg, timeout=15)
        _logger.info("knowledge_sync: auto-committed (settings + knowledge only)")
        return True
    except Exception as exc:
        if "nothing to commit" in str(exc):
            return False
        _logger.warning("knowledge_sync: auto-commit failed: %s", exc)
        return False


async def _push(dest: Path) -> bool:
    try:
        await run_cmd("git", "-C", str(dest), "push", timeout=_GIT_TIMEOUT)
        return True
    except Exception as exc:
        _logger.warning("knowledge_sync: push failed: %s", exc)
        return False


async def sync_knowledge_repo(clone_url: str, target_path: Path | None = None) -> bool:
    async with _sync_lock:
        return await _sync_inner(clone_url, target_path)


async def _sync_inner(clone_url: str, target_path: Path | None = None) -> bool:
    dest = target_path or _target_path()

    if (dest / ".git").is_dir():
        if await _has_local_changes(dest):
            await _auto_commit(dest)

        for attempt in range(2):
            try:
                await run_cmd("git", "-C", str(dest), "pull", "--rebase", timeout=_GIT_TIMEOUT)
                break
            except (RuntimeError, TimeoutError, OSError) as exc:
                err = str(exc)
                if attempt == 0 and ("unstaged" in err or "uncommitted" in err):
                    await _auto_commit(dest)
                    continue
                _logger.warning("git pull failed: %s", err)
                try:
                    await run_cmd("git", "-C", str(dest), "rebase", "--abort", timeout=10)
                except Exception:
                    pass
                return False

        await _push(dest)
        return True

    if dest.exists() and not (dest / ".git").is_dir():
        shutil.rmtree(dest, ignore_errors=True)

    dest.parent.mkdir(parents=True, exist_ok=True)
    tmp = dest.parent / f".knowledge-clone-{dest.name}"
    if tmp.exists():
        shutil.rmtree(tmp, ignore_errors=True)

    try:
        await run_cmd("git", "clone", clone_url, str(tmp), timeout=_GIT_TIMEOUT)
        if dest.exists():
            shutil.rmtree(dest, ignore_errors=True)
        tmp.rename(dest)
        return True
    except Exception as exc:
        _logger.warning("knowledge_sync: clone failed: %s", exc)
        if tmp.exists():
            shutil.rmtree(tmp, ignore_errors=True)
        return False


async def ensure_knowledge_cloned() -> Path | None:
    from app.services.knowledge_store import get_store
    store = get_store()
    store_settings = store.get_settings()
    repo_url = store_settings.get("knowledge_repo_url", "")
    if not repo_url:
        return None

    token = ""
    try:
        from app.database import async_session
        from app.models.global_config import GlobalConfig
        async with async_session() as db:
            cfg = await db.get(GlobalConfig, 1)
        if cfg and cfg.github_token_enc:
            from app.services.crypto import decrypt
            token = decrypt(cfg.github_token_enc)
    except Exception:
        pass

    if token and repo_url.startswith("https://"):
        clone_url = repo_url.replace("https://", f"https://{token}@")
    else:
        clone_url = repo_url

    dest = _target_path()
    ok = await sync_knowledge_repo(clone_url, dest)
    return dest if ok else None
