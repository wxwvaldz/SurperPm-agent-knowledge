"""Unified configuration loaded from config.json (single source of truth).

Priority chain:
  1. config.json  (primary — auto-generated on first run)
  2. Environment variables  (override for CI / Docker)

On first run, if config.json does not exist, a default is auto-generated with
random secure keys.  Users can edit the file directly or via the frontend
Settings page (/api/config/server).
"""
from __future__ import annotations

import json
import logging
import os
import secrets
from pathlib import Path
from typing import Any

from dotenv import load_dotenv

# Load .env from repo root (parent of backend/)
load_dotenv(Path(__file__).resolve().parent.parent.parent / ".env")

_logger = logging.getLogger(__name__)

_CONFIG_PATH = Path(__file__).resolve().parent.parent / "config.json"

_DEFAULTS: dict[str, Any] = {
    "server": {
        "port": 8000,
        "session_secret": "",
        "encryption_key": "",
        "database_url": "sqlite+aiosqlite:///./data/SuperPmAgent.db",
        "frontend_url": "http://localhost:5173",
    },
    "ai": {
        "base_url": "",
        "api_key": "",
        "model": "",
    },
    "github": {
        "oauth_client_id": "",
        "oauth_client_secret": "",
        "oauth_redirect_uri": "http://localhost:8000/api/auth/github/callback",
    },
    "paths": {
        "plugin_repo": "~/SuperPmAgent/SuperPmAgent-plugins",
        "knowledge_repo": "~/SuperPmAgent/SuperPmAgent-knowledge",
    },
}


def _deep_merge(base: dict, override: dict) -> dict:
    result = base.copy()
    for k, v in override.items():
        if k in result and isinstance(result[k], dict) and isinstance(v, dict):
            result[k] = _deep_merge(result[k], v)
        else:
            result[k] = v
    return result


def _generate_default_config() -> dict:
    cfg = json.loads(json.dumps(_DEFAULTS))
    cfg["server"]["session_secret"] = secrets.token_urlsafe(32)
    cfg["server"]["encryption_key"] = secrets.token_urlsafe(32)
    return cfg


def _load_config() -> dict:
    if _CONFIG_PATH.is_file():
        try:
            with open(_CONFIG_PATH, encoding="utf-8") as f:
                user_cfg = json.load(f)
            return _deep_merge(json.loads(json.dumps(_DEFAULTS)), user_cfg)
        except (json.JSONDecodeError, OSError) as e:
            _logger.warning("Failed to read config.json: %s — using defaults", e)

    cfg = _generate_default_config()
    try:
        _CONFIG_PATH.parent.mkdir(parents=True, exist_ok=True)
        with open(_CONFIG_PATH, "w", encoding="utf-8") as f:
            json.dump(cfg, f, indent=2, ensure_ascii=False)
        _logger.info("Generated default config.json at %s", _CONFIG_PATH)
    except OSError as e:
        _logger.warning("Could not write default config.json: %s", e)
    return cfg


_config = _load_config()


class Settings:
    """Unified settings with config.json as primary source, env vars as override."""

    @property
    def github_oauth_client_id(self) -> str:
        return os.getenv("GITHUB_OAUTH_CLIENT_ID", _config["github"]["oauth_client_id"])

    @property
    def github_oauth_client_secret(self) -> str:
        return os.getenv("GITHUB_OAUTH_CLIENT_SECRET", _config["github"]["oauth_client_secret"])

    @property
    def github_oauth_redirect_uri(self) -> str:
        return os.getenv("GITHUB_OAUTH_REDIRECT_URI", _config["github"]["oauth_redirect_uri"])

    @property
    def SuperPmAgent_secret(self) -> str:
        return os.getenv("SuperPmAgent_SECRET", _config["server"]["session_secret"])

    @property
    def anthropic_api_key(self) -> str:
        return os.getenv("ANTHROPIC_API_KEY", _config["ai"]["api_key"])

    @property
    def anthropic_base_url(self) -> str:
        return os.getenv("ANTHROPIC_BASE_URL", _config["ai"]["base_url"])

    @property
    def agent_model(self) -> str:
        return os.getenv("AGENT_MODEL", _config["ai"]["model"])

    @property
    def plugin_repo_path(self) -> str:
        raw = os.getenv("PLUGIN_REPO_PATH", _config["paths"]["plugin_repo"])
        return str(Path(raw).expanduser()) if raw else ""

    @property
    def knowledge_repo_path(self) -> str:
        raw = os.getenv("KNOWLEDGE_REPO_PATH", _config["paths"]["knowledge_repo"])
        return str(Path(raw).expanduser()) if raw else ""

    @property
    def database_url(self) -> str:
        return os.getenv("DATABASE_URL", _config["server"]["database_url"])

    @property
    def secret_key(self) -> str:
        return os.getenv("SECRET_KEY", _config["server"]["encryption_key"])

    @property
    def frontend_url(self) -> str:
        return os.getenv("FRONTEND_URL", _config["server"]["frontend_url"])


settings = Settings()


def get_config() -> dict:
    """Return the current config dict (for API endpoints)."""
    return _config


def update_config(patch: dict) -> dict:
    """Merge patch into config and persist to config.json."""
    global _config
    _config = _deep_merge(_config, patch)
    try:
        with open(_CONFIG_PATH, "w", encoding="utf-8") as f:
            json.dump(_config, f, indent=2, ensure_ascii=False)
    except OSError as e:
        _logger.warning("Could not write config.json: %s", e)
    return _config
