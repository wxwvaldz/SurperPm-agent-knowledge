"""Resolve AI API key / base_url / model from multiple sources.

Resolution priority:
  1. GlobalConfig (encrypted in SQLite — set via frontend)
  2. KnowledgeStore settings (synced via git)
  3. config.json / env vars (via settings)
"""
from __future__ import annotations

import logging

from app.config import settings

_logger = logging.getLogger(__name__)


async def resolve_ai_key() -> str | None:
    from app.database import async_session
    from app.models.global_config import GlobalConfig
    from app.services.crypto import decrypt

    async with async_session() as session:
        cfg = await session.get(GlobalConfig, 1)
        if cfg and cfg.ai_api_key_enc:
            try:
                key = decrypt(cfg.ai_api_key_enc)
                if key:
                    return key
            except Exception:
                _logger.debug("ai_key_resolver: failed to decrypt GlobalConfig key")

    if settings.anthropic_api_key:
        return settings.anthropic_api_key

    return None


async def resolve_ai_base_url() -> str | None:
    from app.services.knowledge_store import get_store

    store = get_store()
    store_settings = store.get_settings()
    if store_settings.get("ai_base_url"):
        return store_settings["ai_base_url"]

    if settings.anthropic_base_url:
        return settings.anthropic_base_url

    return None


async def resolve_ai_model() -> str:
    from app.services.knowledge_store import get_store

    store = get_store()
    store_settings = store.get_settings()
    if store_settings.get("ai_model"):
        return store_settings["ai_model"]

    if settings.agent_model:
        return settings.agent_model

    return "claude-sonnet-4-20260614"
