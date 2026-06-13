"""Agent runner — thin wrapper around claude_agent_sdk.query()."""

from __future__ import annotations

import asyncio
import re
from dataclasses import dataclass
from pathlib import Path

from claude_agent_sdk import ClaudeAgentOptions, query

_PR_URL_PATTERN = re.compile(r"github\.com/[^/]+/[^/]+/pull/\d+")
_BRANCH_PATTERN = re.compile(r"\[new branch\]\s+(\S+)")


def usage_tokens(usage: object) -> int:
    """Sum input+output tokens from an SDK usage payload (dict or object)."""
    if not usage:
        return 0
    if isinstance(usage, dict):
        return int(usage.get("input_tokens", 0)) + int(usage.get("output_tokens", 0))
    return int(getattr(usage, "input_tokens", 0)) + int(getattr(usage, "output_tokens", 0))


def _block_text(block: object) -> str:
    """Pull displayable text out of a single SDK content block (text or tool result)."""
    if isinstance(block, str):
        return block
    # TextBlock / ThinkingBlock
    text = getattr(block, "text", None)
    if isinstance(text, str):
        return text
    # ToolResultBlock.content may be a str or a list of {type:text, text:...}
    content = getattr(block, "content", None)
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts: list[str] = []
        for item in content:
            if isinstance(item, dict):
                t = item.get("text")
                if isinstance(t, str):
                    parts.append(t)
            elif isinstance(item, str):
                parts.append(item)
            else:
                it = getattr(item, "text", None)
                if isinstance(it, str):
                    parts.append(it)
        return "\n".join(parts)
    return ""


def iter_message_texts(message: object):
    """Yield every text fragment from an SDK message.

    The agent surfaces the PR URL (gh output) and the pushed branch
    (git '[new branch] X' output) inside tool-result blocks, not in the
    terminal ResultMessage text — so artifact scraping must scan all blocks.
    """
    top = getattr(message, "text", None)
    if isinstance(top, str) and top:
        yield top
    content = getattr(message, "content", None)
    if isinstance(content, list):
        for block in content:
            t = _block_text(block)
            if t:
                yield t
    elif content is not None:
        t = _block_text(content)
        if t:
            yield t


def _truncate(text: str, limit: int = 600) -> str:
    text = text.strip()
    return text if len(text) <= limit else text[:limit] + " …"


def _block_log(block: object) -> dict | None:
    """Turn one SDK content block into a structured log line, or None to skip.

    kind ∈ {thinking, tool_use, tool_result, error, text}. Used for both the
    live EXECUTION_PROGRESS stream and the persisted execution.logs.
    """
    if isinstance(block, str):
        return {"kind": "text", "text": _truncate(block)} if block.strip() else None

    thinking = getattr(block, "thinking", None)
    if isinstance(thinking, str) and thinking.strip():
        return {"kind": "thinking", "text": _truncate(thinking)}

    name = getattr(block, "name", None)
    if isinstance(name, str) and name:
        # ToolUseBlock — summarise the most useful input field.
        inp = getattr(block, "input", None)
        detail = ""
        if isinstance(inp, dict):
            for key in ("command", "file_path", "pattern", "skill", "url", "description"):
                val = inp.get(key)
                if isinstance(val, str) and val:
                    detail = val
                    break
            if not detail:
                detail = ", ".join(str(k) for k in inp.keys())
        return {"kind": "tool_use", "tool": name, "text": _truncate(detail, 300)}

    if (
        getattr(block, "tool_use_id", None) is not None
        or getattr(block, "content", None) is not None
    ):
        text = _block_text(block)
        if not text.strip():
            return None
        is_error = bool(getattr(block, "is_error", False))
        return {"kind": "error" if is_error else "tool_result", "text": _truncate(text)}

    text = getattr(block, "text", None)
    if isinstance(text, str) and text.strip():
        return {"kind": "text", "text": _truncate(text)}
    return None


def stream_event_log(message: object) -> dict | None:
    """Convert an SDK StreamEvent into an incremental log dict, or None.

    Only emitted when include_partial_messages=True. message.event is the raw
    Anthropic streaming event; we surface text/thinking deltas so the UI renders
    output token-by-token. tool_use/tool_result are left to the terminal full
    messages (their finalized copy is what we persist to the DB). The returned
    dict carries event ∈ {start, delta, stop} + the content-block index so the
    client can coalesce deltas into a single growing line.
    """
    event = getattr(message, "event", None)
    if not isinstance(event, dict):
        return None
    etype = event.get("type")
    index = event.get("index")
    if etype == "content_block_start":
        btype = (event.get("content_block") or {}).get("type")
        if btype in ("text", "thinking"):
            return {"kind": btype, "text": "", "streaming": True, "event": "start", "index": index}
        return None
    if etype == "content_block_delta":
        delta = event.get("delta") or {}
        dtype = delta.get("type")
        if dtype == "text_delta":
            return {
                "kind": "text", "text": delta.get("text", ""),
                "streaming": True, "event": "delta", "index": index,
            }
        if dtype == "thinking_delta":
            return {
                "kind": "thinking", "text": delta.get("thinking", ""),
                "streaming": True, "event": "delta", "index": index,
            }
        return None
    if etype == "content_block_stop":
        return {"kind": "text", "text": "", "streaming": True, "event": "stop", "index": index}
    return None


def iter_log_lines(message: object) -> list[dict]:
    """Structured debug log lines for one SDK message (tool calls, text, results)."""
    lines: list[dict] = []
    content = getattr(message, "content", None)
    blocks = content if isinstance(content, list) else ([content] if content is not None else [])
    for block in blocks:
        line = _block_log(block)
        if line:
            lines.append(line)
    return lines


@dataclass
class AgentResult:
    """Result from a completed agent run."""
    iterations: int = 0
    tokens_used: int = 0
    session_id: str | None = None  # SDK session_id, for resume persistence
    pr_url: str | None = None
    branch: str | None = None
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
    plugins: list[str] | None = None,
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
        # Stream partial assistant turns so the UI gets text/thinking deltas
        # as they arrive, not one big block per completed turn.
        "include_partial_messages": True,
        "resume": resume,
        "continue_conversation": continue_conversation if continue_conversation else None,
        "fork_session": fork_session if fork_session else None,
        "system_prompt": system_prompt,
        "setting_sources": setting_sources,
        "add_dirs": add_dirs,
        "env": env,
        "mcp_servers": mcp_servers,
        "agents": agents,
        "plugins": [{"type": "local", "path": d} for d in plugins] if plugins else None,
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

        # Scrape PR URL / pushed branch from any block in any message — they
        # appear in tool-result output, not only the terminal ResultMessage.
        for text in iter_message_texts(message):
            if not res.pr_url:
                match = _PR_URL_PATTERN.search(text)
                if match:
                    res.pr_url = match.group(0)
            if not res.branch:
                bmatch = _BRANCH_PATTERN.search(text)
                if bmatch:
                    res.branch = bmatch.group(1)

        # Aggregate progress from terminal (ResultMessage) messages
        if hasattr(message, "subtype"):
            res.iterations += 1
            res.tokens_used += usage_tokens(getattr(message, "usage", None))
            msg_sid = getattr(message, "session_id", None)
            if msg_sid:
                res.session_id = msg_sid

    return res