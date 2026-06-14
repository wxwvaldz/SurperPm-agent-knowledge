"""Goal execution engine — orchestrates agent runs via KnowledgeStore."""

import asyncio
import logging
import os
import time as _time
from datetime import UTC, datetime
from pathlib import Path

from app.config import settings
from app.services import exec_env
from app.services.helpers import knowledge_root as _knowledge_root
from app.services.event_bus import (
    EXECUTION_COMPLETED,
    EXECUTION_PROGRESS,
    EXECUTION_STARTED,
    GOAL_UPDATED,
    bus,
)
from app.services.execution_lock import get_lock
from app.services.knowledge_store import get_store

_logger = logging.getLogger(__name__)

_cancel_events: dict[str, object] = {}
_pause_events: dict[str, object] = {}


def _match_ev(dct: dict, exec_id: str) -> object | None:
    """Look up execution event by string or int key."""
    # Execution IDs from KnowledgeStore are ints, but URL params are strings.
    e = dct.get(exec_id)
    if e is not None:
        return e
    try:
        return dct.get(int(exec_id))
    except (ValueError, TypeError):
        return None


def request_cancel(execution_id: str) -> bool:
    ev = _match_ev(_cancel_events, execution_id)
    if ev:
        ev.set()
        return True
    return False


def request_pause(execution_id: str) -> bool:
    ev = _match_ev(_pause_events, execution_id)
    if ev:
        ev.set()
        return True
    return False


def request_resume(execution_id: str) -> bool:
    ev = _match_ev(_pause_events, execution_id)
    if ev and ev.is_set():
        ev.clear()
        return True
    return False


def _read_text_if_exists(path: Path) -> str:
    root = (_knowledge_root() or "").strip()
    if not root:
        return ""
    full = Path(root) / path if not path.is_absolute() else path
    if full.is_file():
        return full.read_text(encoding="utf-8")
    return ""


def _session_dir(session_name: str) -> Path | None:
    root = (_knowledge_root() or "").strip()
    if not root:
        return None
    d = Path(root) / "sessions" / session_name
    return d if d.is_dir() else None


def _session_context_parts(session_name: str | None) -> list[str]:
    if not session_name:
        return []
    session_dir = _session_dir(session_name)
    if session_dir is None:
        return []

    parts = [f"\n## Session context: {session_name}"]
    notes_text = _read_text_if_exists(session_dir / "notes.md")
    if notes_text:
        parts.append("\n### IntentSpec")
        parts.append(notes_text)

    decisions_text = _read_text_if_exists(session_dir / "decisions.md")
    if decisions_text:
        parts.append("\n### Decisions")
        parts.append(decisions_text)

    conversation_text = _read_text_if_exists(session_dir / "conversation.md")
    if conversation_text:
        lines = [line for line in conversation_text.splitlines() if line.strip()]
        tail = "\n".join(lines[-12:])
        if tail:
            parts.append("\n### Conversation tail")
            parts.append(tail)

    return parts if len(parts) > 1 else []


async def compose_goal_context(
    workspace_id: str, goal: dict,
) -> str:
    """Assemble the prompt context for a goal execution."""
    parts = [f"# Goal: {goal.get('title', '')}"]
    if goal.get("description"):
        parts.append(f"\n{goal['description']}")
    parts.extend(_session_context_parts(goal.get("session_name")))

    store = get_store()
    goal_msgs = store.list_discussions(topic_id=None)
    goal_msgs = [
        m for m in goal_msgs
        if m.get("workspace_id") == workspace_id
        and m.get("goal_id") == goal.get("id")
    ]
    goal_msgs.sort(key=lambda m: m.get("created_at", ""))
    goal_msgs = goal_msgs[-30:]

    if len(goal_msgs) < 10:
        seen_ids = {m.get("id") for m in goal_msgs}
        standalone = store.list_discussions(topic_id=None)
        extra = [
            m for m in standalone
            if m.get("workspace_id") == workspace_id
            and m.get("goal_id") is None
            and m.get("id") not in seen_ids
        ]
        extra.sort(key=lambda m: m.get("created_at", ""))
        goal_msgs = extra[-10:] + goal_msgs

    if goal_msgs:
        parts.append("\n## Discussion context")
        for msg in goal_msgs:
            parts.append(f"[{msg.get('role', '')}] {msg.get('content', '')}")

    try:
        from app.services.knowledge_distiller import get_top_learnings

        learnings_text = get_top_learnings(budget_tokens=500)
        if learnings_text:
            parts.append("\n## Relevant learnings")
            parts.append(learnings_text)
    except Exception:
        pass

    selected_plugins = goal.get("plugins") or []
    try:
        plugin_root = exec_env._resolve_plugin_root()
        if plugin_root and selected_plugins:
            skill_sections: list[str] = []
            for pname in selected_plugins:
                index_path = plugin_root / pname / "skills" / "INDEX.md"
                if index_path.is_file():
                    content = index_path.read_text(encoding="utf-8")[:800]
                    skill_sections.append(f"### {pname}\n{content}")
            if skill_sections:
                parts.append("\n## Available Plugin Skills\n" + "\n\n".join(skill_sections))
    except Exception:
        pass

    assigned_to = goal.get("assigned_to") or goal.get("source_username")
    if assigned_to:
        try:
            root = store.knowledge_root
            user_md = root / "profiles" / "users" / f"{assigned_to}.md"
            if user_md.is_file():
                content = user_md.read_text(encoding="utf-8")[:600]
                parts.append(
                    "\n## User Profile\n"
                    "Adapt your approach based on this user's preferences:\n"
                    + content
                )
        except Exception:
            pass

    parts.append(
        "\n## Artifacts\n"
        "Any files you create in the working directory (.md, .txt, .json, .csv, .html, .pdf, .docx) "
        "will be automatically collected as downloadable artifacts after execution completes. "
        "The user can view and download them from the execution detail page via /api/artifacts/ URLs. "
        "Create output files when the goal produces deliverables (reports, docs, summaries, etc)."
    )

    return "\n".join(parts)


async def execute_goal(
    workspace_id: str, goal_id: str, execution_id: str | None = None,
) -> None:
    lock = get_lock(workspace_id)
    async with lock:
        await _run(workspace_id, goal_id, execution_id)


def _collect_artifacts(workdir, goal_id: str, goal: dict, store) -> list[dict]:
    """Collect files created by AI. Organized by group/goal in workspace dir."""
    import shutil
    import subprocess as _sp
    if not workdir or not workdir.is_dir():
        return []

    exts = {".md", ".txt", ".csv", ".html", ".docx", ".pdf", ".png", ".jpg", ".drawio", ".svg", ".pptx"}
    new_files: list[str] = []

    is_git = (workdir / ".git").is_dir()
    if is_git:
        try:
            r = _sp.run(
                ["git", "-C", str(workdir), "status", "--porcelain"],
                capture_output=True, text=True, timeout=10,
            )
            if r.returncode == 0:
                for line in r.stdout.strip().splitlines():
                    if line.startswith("?") or line.startswith("A") or line.startswith("M"):
                        new_files.append(line[3:].strip())
        except Exception:
            is_git = False

    if not is_git:
        for f in workdir.rglob("*"):
            if f.is_file() and f.suffix.lower() in exts and ".git" not in f.parts:
                new_files.append(str(f.relative_to(workdir)))

    if not new_files:
        return []

    group_name = "_ungrouped"
    topic_id = goal.get("topic_id")
    if topic_id:
        topic = store.get("topics", topic_id)
        if topic:
            group_name = topic.get("name", f"topic-{topic_id}")

    base = store.logs_root / "goal" / "workspace" / group_name / f"goal-{goal_id}" / "artifacts"
    base.mkdir(parents=True, exist_ok=True)
    url_prefix = f"/api/artifacts/{group_name}/goal-{goal_id}"

    collected = []
    for rel_str in new_files:
        f = workdir / rel_str
        if not f.is_file() or f.suffix.lower() not in exts:
            continue
        rel = f.relative_to(workdir)
        dest = base / rel
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(f, dest)
        collected.append({
            "name": str(rel),
            "url": f"{url_prefix}/{rel}",
        })
    return collected[:50]


async def _judge_artifacts(title: str, artifacts: list[dict]) -> str:
    """First reflection: judge what the artifacts are and produce clean output."""
    if not artifacts:
        return ""

    try:
        import anthropic
        from app.services.ai_key_resolver import resolve_ai_key, resolve_ai_base_url, resolve_ai_model

        api_key = await resolve_ai_key()
        if not api_key:
            return "\n".join(f"- {a['url']}" for a in artifacts[:5])

        artifact_list = "\n".join(f"- {a['name']} (URL: {a['url']})" for a in artifacts[:10])

        client = anthropic.AsyncAnthropic(
            api_key=api_key,
            base_url=await resolve_ai_base_url() or None,
        )
        resp = await client.messages.create(
            model=await resolve_ai_model(),
            max_tokens=300,
            system=(
                "You are judging execution artifacts. Given a goal title and list of produced files, "
                "output a SHORT summary (2-3 sentences max) of what was produced. "
                "Include the most important artifact URL(s) that the user should view. "
                "Format URLs as: http://localhost:8000{path}\n"
                "If there's an HTML/image/PDF file, highlight it as viewable in browser. "
                "Be concise. No markdown headers. Just plain text with URLs."
            ),
            messages=[{"role": "user", "content": f"Goal: {title}\n\nArtifacts:\n{artifact_list}"}],
        )
        return resp.content[0].text.strip()
    except Exception:
        return "\n".join(f"- http://localhost:8000{a['url']}" for a in artifacts[:5])


async def _post_execution_react(
    workspace_id: str, goal_id: str, title: str, final_output: str | None, store,
) -> None:
    """Second reflection: Discuss AI presents the judged output to user."""
    if not final_output:
        return
    try:
        await asyncio.sleep(2)
        from app.services.ai_chat import generate_ai_reply

        topic_id = None
        topics = store.list("topics")
        active = [t for t in topics if not t.get("archived") and t.get("goal_id") is None]
        if active:
            active.sort(key=lambda t: t.get("created_at", ""), reverse=True)
            topic_id = active[0].get("id")

        react_prompt = (
            f"[System notification — do not repeat this verbatim, respond naturally]\n"
            f"Goal '{title}' (ID: {goal_id}) just completed.\n\n"
            f"Output:\n{final_output}\n\n"
            f"Instructions:\n"
            f"1. Summarize the result concisely\n"
            f"2. If there are artifact URLs (/api/artifacts/...), tell the user to expand "
            f"the browser panel on the left to preview them\n"
            f"3. If there's a PR URL, show it as a clickable link\n"
            f"4. The goal card in this chat now shows 'Review' — remind the user "
            f"they can Accept or Reject the result directly on the card\n"
            f"5. Suggest logical next steps based on the output"
        )

        await generate_ai_reply(workspace_id, react_prompt, topic_id=topic_id)
    except Exception:
        _logger.debug("post-execution react failed", exc_info=True)


async def _notify_discuss(
    store,
    workspace_id: str,
    goal_id: str,
    message: str,
) -> None:
    try:
        disc = await store.create_discussion({
            "workspace_id": workspace_id,
            "goal_id": goal_id,
            "role": "system",
            "content": message,
        })
        await bus.emit("discussion_created", {
            "id": disc["id"],
            "workspace_id": workspace_id,
            "goal_id": goal_id,
            "role": "system",
            "content": message,
            "created_at": disc["created_at"],
        })
    except Exception:
        _logger.warning("Failed to notify discuss", exc_info=True)


async def _run(
    workspace_id: str,
    goal_id: str,
    pre_created_execution_id: str | None = None,
) -> None:
    execution_id: str | None = pre_created_execution_id
    exec_ctx: exec_env.ExecEnv | None = None
    logs_buffer: list[dict] = []
    store = get_store()

    try:
        goal = store.get("goals", goal_id)
        if not goal or goal.get("workspace_id") != workspace_id:
            _logger.warning(
                "Goal %s not found in workspace %s", goal_id, workspace_id,
            )
            return

        workspace = store.get("workspaces", workspace_id)
        if not workspace:
            _logger.warning("Workspace %s not found", workspace_id)
            return

        if execution_id:
            exe = store.get("executions", execution_id)
            if exe:
                await store.update("executions", execution_id, {
                    "status": "running",
                    "started_at": datetime.now(UTC).isoformat(),
                })
        else:
            exe = await store.create("executions", {
                "goal_id": goal_id,
                "workspace_id": workspace_id,
                "status": "running",
                "started_at": datetime.now(UTC).isoformat(),
                "token_budget": goal.get("token_budget"),
                "error": None,
            })
            execution_id = exe["id"]

        # Use threading.Event for cancel/pause so they work reliably across
        # the main SelectorEventLoop and the ProactorEventLoop worker thread.
        import threading as _threading

        cancel_ev = _threading.Event()
        _cancel_events[execution_id] = cancel_ev
        pause_ev = _threading.Event()
        _pause_events[execution_id] = pause_ev

        await bus.emit(EXECUTION_STARTED, {
            "execution_id": execution_id,
            "goal_id": goal_id,
            "workspace_id": workspace_id,
        })

        context = await compose_goal_context(workspace_id, goal)

        target = goal.get("target")
        if target and target != "local":
            await _execute_remote(
                store, target, context, workspace_id, goal_id,
                execution_id, logs_buffer, cancel_ev,
            )
            return

        from app.services.ai_key_resolver import (
            resolve_ai_base_url,
            resolve_ai_key,
            resolve_ai_model,
        )

        api_key = await resolve_ai_key()
        if not api_key:
            raise RuntimeError(
                "AI API key not configured (Settings → AI Model)",
            )
        base_url = await resolve_ai_base_url()
        model = await resolve_ai_model()

        exec_ctx = await exec_env.prepare_execution(goal, workspace)
        exec_ctx.env["CLAUDE_CONFIG_DIR"] = str(exec_ctx.workdir)
        exec_ctx.env["KNOWLEDGE_REPO_PATH"] = str(store.knowledge_root)
        exec_ctx.env["ANTHROPIC_API_KEY"] = api_key
        exec_ctx.env["ANTHROPIC_AUTH_TOKEN"] = ""
        exec_ctx.env["ANTHROPIC_MODEL"] = ""
        exec_ctx.env["CLAUDE_CO_AUTHORED_BY"] = ""
        if base_url:
            exec_ctx.env["ANTHROPIC_BASE_URL"] = base_url
        prompt = f"/goal {context}"

        import json as _json

        mcp_servers: dict = {}
        try:
            mcp_file = store.logs_root / "settings" / "mcp-servers.json"
            if mcp_file.is_file():
                data = _json.loads(
                    mcp_file.read_text(encoding="utf-8"),
                )
                for name, cfg in (data.get("servers") or {}).items():
                    if not isinstance(cfg, dict):
                        continue
                    if not cfg.get("enabled", True):
                        continue
                    transport = cfg.get("transport", "stdio")
                    if transport == "stdio":
                        mcp_servers[name] = {
                            "command": cfg.get("command"),
                            "args": cfg.get("args", []),
                            "env": cfg.get("env", {}),
                        }
                    elif transport in ("sse", "http"):
                        mcp_servers[name] = {
                            "type": transport,
                            "url": cfg.get("url"),
                            "headers": cfg.get("headers", {}),
                        }
        except Exception:
            _logger.warning(
                "Failed to load MCP servers", exc_info=True,
            )

        from app.services.agent import (
            iter_log_lines,
            run_goal_agent,
            stream_event_log,
        )
        from app.services.agent.runner import usage_tokens

        token_total = 0
        _last_db_sync = 0.0  # timestamp of last DB token_used write

        async def _on_event(message):
            nonlocal token_total, _last_db_sync
            delta = usage_tokens(getattr(message, "usage", None))
            if delta:
                token_total += delta

            # Persist token_used to DB every 5s so the Kanban card's polling
            # query always has a live value — even after page navigation
            # clears the WebSocket-fueled zustand progress store.
            _now = _time.time()
            if _now - _last_db_sync >= 5 and token_total > 0:
                _last_db_sync = _now
                try:
                    await store.update("executions", execution_id, {
                        "token_used": token_total,
                    })
                    _logger.debug(
                        "DB sync: execution %s token_used=%d",
                        execution_id, token_total,
                    )
                except Exception as exc:
                    _logger.warning(
                        "DB sync failed for execution %s: %s",
                        execution_id, exc,
                    )

            stream_line = stream_event_log(message)
            if stream_line is not None:
                await bus.emit(EXECUTION_PROGRESS, {
                    "execution_id": execution_id,
                    "goal_id": goal_id,
                    "workspace_id": workspace_id,
                    "token_used": token_total,
                    "logs": [stream_line],
                })
                return

            new_lines = iter_log_lines(message)
            if new_lines:
                logs_buffer.extend(new_lines)
            ws_lines = [
                ln for ln in new_lines
                if ln.get("kind") not in ("text", "thinking")
            ]
            if delta or ws_lines:
                await bus.emit(EXECUTION_PROGRESS, {
                    "execution_id": execution_id,
                    "goal_id": goal_id,
                    "workspace_id": workspace_id,
                    "token_used": token_total,
                    "logs": ws_lines,
                })

        prev_exes = store.list("executions", goal_id=goal_id)
        prev_session_id = None
        for pe in sorted(
            prev_exes,
            key=lambda e: e.get("finished_at", ""),
            reverse=True,
        ):
            sid = pe.get("session_id")
            if sid and str(pe.get("id")) != str(execution_id):
                prev_session_id = sid
                break

        # Detect resume: this execution was previously paused and already
        # has a session_id (set during the first agent run).
        is_resume = bool(
            execution_id is not None
            and (cur := store.get("executions", execution_id))
            and cur.get("session_id")
            and cur.get("paused_at")
        )
        continue_conv = bool(prev_session_id) or is_resume

        agent_result = await run_goal_agent(
            goal_text=prompt,
            cwd=str(exec_ctx.workdir),
            env=exec_ctx.env,
            plugins=exec_ctx.plugins,
            mcp_servers=mcp_servers if mcp_servers else None,
            setting_sources=[],
            max_turns=50,
            model=model or None,
            continue_conversation=continue_conv,
            on_event=_on_event,
            cancel_token=cancel_ev,
            pause_event=pause_ev,
        )

        if pause_ev.is_set():
            # Graceful pause — subprocess was terminated, save session so
            # resume can continue from where we left off.
            now = datetime.now(UTC).isoformat()
            await store.update("executions", execution_id, {
                "status": "paused",
                "paused_at": now,
                "token_used": agent_result.tokens_used,
                "session_id": agent_result.session_id,
            })
            await bus.emit(EXECUTION_PROGRESS, {
                "execution_id": execution_id,
                "goal_id": goal_id,
                "workspace_id": workspace_id,
                "token_used": agent_result.tokens_used,
                "paused": True,
            })
            return

        if cancel_ev.is_set():
            raise RuntimeError("Cancelled by user")

        now = datetime.now(UTC).isoformat()
        artifacts = _collect_artifacts(exec_ctx.workdir if exec_ctx else None, goal_id, goal, store)

        # Step 1: Judge artifacts — produce clean final output
        final_output = await _judge_artifacts(goal.get("title", ""), artifacts)

        await store.update("executions", execution_id, {
            "status": "success",
            "finished_at": now,
            "token_used": agent_result.tokens_used,
            "session_id": agent_result.session_id,
            "pr_url": agent_result.pr_url,
            "branch": (
                agent_result.branch or f"SuperPmAgent/goal-{goal_id}"
            ),
            "summary": final_output or f"Completed in {agent_result.iterations} iterations",
            "logs": logs_buffer,
            "artifacts": artifacts,
            "output": final_output,
        })
        next_status = "scheduled" if goal.get("schedule") else "review"
        await store.update("goals", goal_id, {"status": next_status})

        viewable = next((a for a in artifacts if any(a["name"].endswith(e) for e in (".html", ".svg", ".png", ".jpg", ".pdf"))), None)
        await bus.emit(EXECUTION_COMPLETED, {
            "execution_id": execution_id,
            "goal_id": goal_id,
            "workspace_id": workspace_id,
            "status": "success",
            "token_used": agent_result.tokens_used,
            "artifact_url": viewable["url"] if viewable else None,
        })
        await bus.emit(GOAL_UPDATED, {
            "goal_id": goal_id,
            "workspace_id": workspace_id,
            "status": next_status,
        })

        # Step 2: Notify Discuss with clean output (not raw artifact list)
        await _notify_discuss(store, workspace_id, goal_id, (
            f"✅ Goal '{goal.get('title', '')}' complete.\n\n"
            f"{final_output or 'No output produced.'}"
        ))

        # Step 3: Trigger Discuss AI to do second reflection (present to user)
        asyncio.create_task(_post_execution_react(
            workspace_id, goal_id, goal.get("title", ""), final_output, store,
        ))

    except Exception as e:
        import traceback as _tb
        tb_text = _tb.format_exc()
        chain: list[str] = []
        ex = e
        while ex is not None:
            chain.append(f"{type(ex).__module__}.{type(ex).__qualname__}: {ex!r}")
            ex = ex.__cause__
        chain_str = " ← ".join(chain)
        _logger.error("Execution failed for goal %s: %s\nChain: %s\n%s", goal_id, e, chain_str, tb_text)
        if execution_id:
            try:
                now = datetime.now(UTC).isoformat()
                await store.update("executions", execution_id, {
                    "status": "failed",
                    "finished_at": now,
                    "error": chain_str[:500],
                    "logs": logs_buffer,
                })
                await store.update("goals", goal_id, {"status": "failed"})
            except Exception:
                _logger.exception(
                    "Failed to update execution/goal status on error",
                )

        await bus.emit(EXECUTION_COMPLETED, {
            "execution_id": execution_id,
            "goal_id": goal_id,
            "workspace_id": workspace_id,
            "status": "failed",
            "error": str(e),
        })
        await bus.emit(GOAL_UPDATED, {
            "goal_id": goal_id,
            "workspace_id": workspace_id,
            "status": "failed",
        })

        await _notify_discuss(store, workspace_id, goal_id, (
            f"❌ Goal 执行失败: {e}"
        ))

    finally:
        if execution_id:
            _cancel_events.pop(execution_id, None)
            _pause_events.pop(execution_id, None)
        if exec_ctx:
            exec_env.cleanup_keydir(exec_ctx.keydir)
            if exec_ctx.workdir.is_dir():
                try:
                    from app.services.platform import remove_dir
                    remove_dir(exec_ctx.workdir)
                    _logger.info("Cleaned workdir: %s", exec_ctx.workdir)
                except Exception:
                    _logger.debug("Workdir cleanup skipped: %s", exec_ctx.workdir)


async def _execute_remote(
    store, target, context, workspace_id, goal_id,
    execution_id, logs_buffer, cancel_ev,
):
    """Execute a Goal on a remote Agent via cc-connect API."""

    from app.routes.agents import _read_agents

    agents = _read_agents()
    agent = agents.get(target)
    if not agent:
        raise RuntimeError(f"Remote agent '{target}' not registered")

    url = agent["cc_api_url"]
    project = agent.get("project", "default")
    headers = {"Content-Type": "application/json"}
    if agent.get("cc_api_token"):
        headers["Authorization"] = f"Bearer {agent['cc_api_token']}"

    prompt = f"/SuperPmAgent-core:goal {context}"

    import httpx

    async with httpx.AsyncClient(timeout=300) as client:
        r = await client.post(
            f"{url}/api/v1/projects/{project}/send",
            headers=headers,
            json={"session_key": f"goal-{goal_id}", "message": prompt},
        )
        if r.status_code >= 400:
            raise RuntimeError(
                f"cc-connect send failed: {r.status_code} {r.text[:200]}",
            )

    now = datetime.now(UTC).isoformat()
    await store.update("executions", execution_id, {
        "status": "success",
        "finished_at": now,
        "summary": f"Dispatched to remote agent '{target}'",
        "logs": logs_buffer,
    })
    await store.update("goals", goal_id, {"status": "review"})

    await bus.emit(EXECUTION_COMPLETED, {
        "execution_id": execution_id,
        "goal_id": goal_id,
        "workspace_id": workspace_id,
        "status": "success",
    })
    await bus.emit(GOAL_UPDATED, {
        "goal_id": goal_id,
        "workspace_id": workspace_id,
        "status": "review",
    })

    await _notify_discuss(store, workspace_id, goal_id, (
        f"✅ Goal 已派发到远程 Agent '{target}'"
    ))
