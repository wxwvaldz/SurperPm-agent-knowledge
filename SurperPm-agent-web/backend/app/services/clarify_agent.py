"""AI-backed clarify execution — delegates to SuperPmAgent-core plugin via SDK."""

from __future__ import annotations

import logging
import shutil
from pathlib import Path

from claude_agent_sdk import ClaudeAgentOptions, query
from claude_agent_sdk.types import AssistantMessage, ResultMessage, TextBlock

from app.config import settings

_logger = logging.getLogger(__name__)


def _resolve_cli_model() -> str | None:
    model = (settings.agent_model or "").strip()
    if not model:
        return None
    if model.startswith(("claude-", "sonnet", "opus", "haiku")):
        return model
    return None


def _resolve_cli_path() -> str | None:
    return shutil.which("claude.cmd") or shutil.which("claude")


def _plugin_root() -> Path:
    from app.services.knowledge_store import get_store

    store = get_store()
    knowledge_plugins = store.knowledge_root / "plugins"
    if knowledge_plugins.is_dir():
        return knowledge_plugins
    if settings.plugin_repo_path:
        p = Path(settings.plugin_repo_path)
        if p.is_dir():
            return p
    raise RuntimeError("No plugin directory found")


async def run_clarify_agent(
    *,
    session_name: str,
    message: str,
    source_urls: list[str],
    knowledge_root: Path,
) -> dict:
    """Run the SuperPmAgent-core plugin's clarify command via Claude agent SDK."""
    if not settings.anthropic_api_key:
        raise RuntimeError("ANTHROPIC_API_KEY not configured")

    plugin_root = _plugin_root()
    core_plugin_path = plugin_root / "SuperPmAgent-core"
    if not core_plugin_path.is_dir():
        core_plugin_path = plugin_root
        if not (core_plugin_path / ".claude-plugin").is_dir():
            raise RuntimeError(
                f"SuperPmAgent-core plugin not found under {plugin_root}",
            )

    session_dir = knowledge_root / "sessions" / session_name
    source_note = (
        "\n".join(f"- {url}" for url in source_urls)
        if source_urls
        else "- None"
    )

    prompt = (
        f"Run the /clarify command for session '{session_name}'.\n\n"
        f"Session dir: {session_dir}\n\n"
        f"Latest PM request:\n{message}\n\n"
        f"Registered source URLs:\n{source_note}"
    )

    options = ClaudeAgentOptions(
        plugins=[{"type": "local", "path": str(core_plugin_path)}],
        allowed_tools=["Read", "Edit", "Write", "Glob", "Grep"],
        permission_mode="acceptEdits",
        cli_path=_resolve_cli_path(),
        cwd=str(knowledge_root),
        env={
            "KNOWLEDGE_REPO_PATH": str(knowledge_root),
            "ANTHROPIC_BASE_URL": settings.anthropic_base_url or "",
            "ANTHROPIC_AUTH_TOKEN": settings.anthropic_api_key,
            "ANTHROPIC_API_KEY": "",
        },
        max_turns=8,
        model=_resolve_cli_model(),
    )

    texts: list[str] = []
    cost = 0.0
    async for msg in query(prompt=prompt, options=options):
        if isinstance(msg, AssistantMessage):
            for block in msg.content:
                if isinstance(block, TextBlock):
                    texts.append(block.text)
        elif isinstance(msg, ResultMessage):
            cost = getattr(msg, "total_cost_usd", 0.0)

    response = "\n".join(texts).strip()
    _logger.info(
        "clarify agent completed for session %s (cost=%.4f)",
        session_name, cost,
    )
    return {"mode": "agent_sdk", "response": response, "cost": cost}
