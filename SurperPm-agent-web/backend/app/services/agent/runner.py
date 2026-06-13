"""Agent runner — thin wrapper around claude_agent_sdk.query()."""

from __future__ import annotations

import asyncio
import re
from dataclasses import dataclass
from pathlib import Path

from claude_agent_sdk import ClaudeAgentOptions, query

_PR_URL_PATTERN = re.compile(r"github\.com/[^/]+/[^/]+/pull/\d+")


@dataclass
class AgentResult:
    """Result from a completed agent run."""
    iterations: int = 0
    tokens_used: int = 0
    session_id: str | None = None  # SDK session_id, for resume persistence
    pr_url: str | None = None
    error: str | None = None


async def run_goal_agent(
    goal_text: str,
    *,
    # execution
    cwd: str | None = None,
    permission_mode: str = "bypassPermissions",
    # tool control
    allowed_tools: list[str] | None = None,
    disallowed_tools: list[str] | None = None,
    # budget & model
    max_turns: int | None = None,
    max_budget_usd: float | None = None,
    model: str | None = None,
    # session (resume / continue / fork)
    resume: str | None = None,
    continue_conversation: bool = False,
    fork_session: bool = False,
    # context & extensions
    system_prompt: str | dict | None = None,
    setting_sources: list[str] | None = None,
    add_dirs: list[str | Path] | None = None,
    env: dict[str, str] | None = None,
    mcp_servers: dict | None = None,
    agents: dict | None = None,
    # lifecycle
    pause_event: asyncio.Event | None = None,
    cancel_token: asyncio.Event | None = None,
    on_event: callable | None = None,
) -> AgentResult:
    """Run claude_agent_sdk.query() with full lifecycle & parameter control."""
    pause_ev = pause_event or asyncio.Event()
    cancel_ev = cancel_token or asyncio.Event()
    res = AgentResult()

    # Build options dict, skipping None values to avoid SDK type errors
    opt_kwargs = {k: v for k, v in {
        "cwd": cwd,
        "allowed_tools": allowed_tools,
        "disallowed_tools": disallowed_tools,
        "max_turns": max_turns,
        "max_budget_usd": max_budget_usd,
        "model": model,
        "resume": resume,
        "continue_conversation": continue_conversation if continue_conversation else None,
        "fork_session": fork_session if fork_session else None,
        "system_prompt": system_prompt,
        "setting_sources": setting_sources,
        "add_dirs": add_dirs,
        "env": env,
        "mcp_servers": mcp_servers,
        "agents": agents,
        "permission_mode": permission_mode,
    }.items() if v is not None}
    opts = ClaudeAgentOptions(**opt_kwargs)

    async for message in query(prompt=goal_text, options=opts):
        # --- lifecycle check ---
        if cancel_ev.is_set():
            break
        while pause_ev.is_set():
            if cancel_ev.is_set():
                break
            await asyncio.sleep(0.5)

        # Forward raw SDK message to caller (streaming / logging)
        if on_event:
            await on_event(message)

        # Extract progress from terminal (ResultMessage) messages
        if hasattr(message, "subtype"):
            res.iterations += 1
            usage = getattr(message, "usage", None)
            if usage:
                res.tokens_used += (
                    getattr(usage, "input_tokens", 0)
                    + getattr(usage, "output_tokens", 0)
                )
            # Capture session_id for resume persistence
            msg_sid = getattr(message, "session_id", None)
            if msg_sid:
                res.session_id = msg_sid
            # Detect PR URL from result text
            text = getattr(message, "text", "") or ""
            if not res.pr_url:
                match = _PR_URL_PATTERN.search(text)
                if match:
                    res.pr_url = match.group(0)

    return res