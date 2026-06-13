"""Knowledge repo sync — git clone / pull from remote."""
from __future__ import annotations

import asyncio
import logging
from pathlib import Path

from app.config import settings

_logger = logging.getLogger(__name__)

_DEFAULT_PATH = Path("knowledge")


def _target_path() -> Path:
    return Path(settings.knowledge_repo_path) if settings.knowledge_repo_path else _DEFAULT_PATH


async def sync_knowledge_repo(clone_url: str, target_path: Path | None = None) -> bool:
    dest = target_path or _target_path()

    if (dest / ".git").is_dir():
        _logger.info("knowledge_sync: pulling %s", dest)
        proc = await asyncio.create_subprocess_exec(
            "git", "-C", str(dest), "pull", "--ff-only",
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, stderr = await proc.communicate()
        if proc.returncode != 0:
            _logger.warning("git pull failed: %s", stderr.decode())
            return False
        _logger.info("knowledge_sync: pull ok — %s", stdout.decode().strip())
        return True

    _logger.info("knowledge_sync: cloning %s → %s", clone_url, dest)
    dest.parent.mkdir(parents=True, exist_ok=True)
    proc = await asyncio.create_subprocess_exec(
        "git", "clone", clone_url, str(dest),
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    stdout, stderr = await proc.communicate()
    if proc.returncode != 0:
        _logger.warning("git clone failed: %s", stderr.decode())
        return False
    _logger.info("knowledge_sync: clone ok")
    return True


async def ensure_knowledge_cloned() -> Path | None:
    from app.database import async_session
    from app.models.global_config import GlobalConfig
    from app.services.crypto import decrypt

    async with async_session() as session:
        cfg = await session.get(GlobalConfig, 1)
        if not cfg or not cfg.knowledge_repo_url:
            _logger.debug("knowledge_sync: no knowledge_repo_url configured")
            return None

    repo_url = cfg.knowledge_repo_url
    token: str | None = None
    if cfg.github_token_enc:
        try:
            token = decrypt(cfg.github_token_enc)
        except Exception:
            _logger.warning("knowledge_sync: failed to decrypt github_token_enc")

    if token and repo_url.startswith("https://"):
        clone_url = repo_url.replace("https://", f"https://{token}@")
    else:
        clone_url = repo_url

    dest = _target_path()
    ok = await sync_knowledge_repo(clone_url, dest)
    return dest if ok else None
