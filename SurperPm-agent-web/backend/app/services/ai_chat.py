"""Shared AI chat reply logic for discussions (goal-scoped + standalone)."""

import json
import logging
import re

import anthropic

from app.services.event_bus import DISCUSSION_CREATED, DISCUSSION_DELTA, bus
from app.services.knowledge_store import get_store

_logger = logging.getLogger(__name__)

_MAX_CONTEXT_MESSAGES = 20
_EVOLVE_EVERY_N = 10  # analyze profile evolution every N messages


async def generate_ai_reply(
    workspace_id: str,
    user_content: str,
    *,
    goal_id: str | None = None,
    image_data_uri: str | None = None,
    topic_id: int | None = None,
    username: str | None = None,
) -> None:
    from app.routes.discussions_standalone import _build_system_prompt
    from app.services.ai_key_resolver import (
        resolve_ai_base_url,
        resolve_ai_key,
        resolve_ai_model,
    )

    store = get_store()
    api_key = await resolve_ai_key()

    disc_id: int | None = None
    try:
        if not api_key:
            err_disc = await store.create_discussion({
                "workspace_id": workspace_id,
                "goal_id": goal_id,
                "content": "⚠️ AI API 未配置，请在 Settings → AI Model 中设置。",
                "role": "agent",
                "topic_id": topic_id,
            })
            await bus.emit(DISCUSSION_CREATED, {
                "id": err_disc["id"],
                "workspace_id": workspace_id,
                "goal_id": goal_id,
                "role": "agent",
                "content": err_disc["content"],
                "topic_id": topic_id,
                "created_at": err_disc["created_at"],
            })
            await bus.emit(DISCUSSION_DELTA, {
                "workspace_id": workspace_id,
                "goal_id": goal_id,
                "discussion_id": err_disc["id"],
                "delta": "",
                "done": True,
            })
            return

        agent_disc = await store.create_discussion({
            "workspace_id": workspace_id,
            "goal_id": goal_id,
            "content": "",
            "role": "agent",
            "topic_id": topic_id,
        })
        disc_id = agent_disc["id"]

        await bus.emit(DISCUSSION_CREATED, {
            "id": disc_id,
            "workspace_id": workspace_id,
            "goal_id": goal_id,
            "role": "agent",
            "content": "",
            "topic_id": topic_id,
            "created_at": agent_disc["created_at"],
        })

        recent = store.list_discussions(topic_id=topic_id)
        recent = [
            r for r in recent if r.get("workspace_id") == workspace_id
        ]
        if goal_id is None:
            recent = [r for r in recent if r.get("goal_id") is None]
        recent.sort(key=lambda r: r.get("created_at", ""))
        recent = recent[-_MAX_CONTEXT_MESSAGES:]

        messages: list[dict] = []
        for msg in recent:
            if msg.get("id") == disc_id:
                continue
            role = "user" if msg.get("role") == "user" else "assistant"
            content = msg.get("content", "")
            messages.append({"role": role, "content": content})

        if image_data_uri and messages and messages[-1]["role"] == "user":
            media_type = "image/png"
            b64_data = image_data_uri
            if image_data_uri.startswith("data:"):
                header, b64_data = image_data_uri.split(",", 1)
                if "image/jpeg" in header:
                    media_type = "image/jpeg"
            messages[-1]["content"] = [
                {
                    "type": "image",
                    "source": {
                        "type": "base64",
                        "media_type": media_type,
                        "data": b64_data,
                    },
                },
                {"type": "text", "text": messages[-1]["content"]},
            ]

        from app.services.ai_tools import TOOLS, execute_tool

        base_url = await resolve_ai_base_url()
        model = await resolve_ai_model()
        client = anthropic.AsyncAnthropic(
            api_key=api_key,
            base_url=base_url or None,
        )
        full_text = ""
        system_prompt = _build_system_prompt(username=username)

        for _round in range(5):
            response = await client.messages.create(
                model=model,
                max_tokens=2048,
                system=system_prompt,
                messages=messages,
                tools=TOOLS,
            )

            text_parts = []
            tool_uses = []
            for block in response.content:
                if block.type == "text":
                    text_parts.append(block.text)
                elif block.type == "tool_use":
                    tool_uses.append(block)

            if text_parts:
                chunk = "".join(text_parts)
                full_text += chunk
                await bus.emit(DISCUSSION_DELTA, {
                    "workspace_id": workspace_id,
                    "goal_id": goal_id,
                    "discussion_id": disc_id,
                    "delta": chunk,
                })

            if not tool_uses or response.stop_reason != "tool_use":
                break

            messages.append({"role": "assistant", "content": response.content})
            tool_results = []
            for tu in tool_uses:
                result = await execute_tool(tu.name, tu.input, workspace_id, topic_id=topic_id)
                tool_results.append({
                    "type": "tool_result",
                    "tool_use_id": tu.id,
                    "content": result,
                })
            messages.append({"role": "user", "content": tool_results})

        # ── Post-processing: if AI gave plain-text options, convert to card block ──
        # Skip if the AI already output a card itself (don't double-wrap)
        if "```card" not in full_text and "```interactive-card" not in full_text:
            card_js = _build_card_js(full_text)
            if card_js:
                full_text = full_text.rstrip() + "\n\n```card\n" + card_js + "\n```"

        await store.update_discussion_content(topic_id, disc_id, full_text)

        await bus.emit(DISCUSSION_DELTA, {
            "workspace_id": workspace_id,
            "goal_id": goal_id,
            "discussion_id": disc_id,
            "delta": "",
            "done": True,
        })

        if username and disc_id and disc_id % _EVOLVE_EVERY_N == 0:
            import asyncio
            asyncio.create_task(_maybe_evolve_profile(username, messages, store))

    except Exception as e:
        _logger.warning("AI reply failed: %s", e)
        if disc_id is not None:
            error_text = f"⚠️ AI reply error: {e}"
            await store.update_discussion_content(topic_id, disc_id, error_text)
            await bus.emit(DISCUSSION_DELTA, {
                "workspace_id": workspace_id,
                "goal_id": goal_id,
                "discussion_id": disc_id,
                "delta": error_text,
                "done": True,
            })


async def _maybe_evolve_profile(
    username: str, messages: list[dict], store,
) -> None:
    """Analyze recent conversation to auto-update user profile preferences."""
    try:
        from app.services.ai_key_resolver import resolve_ai_key, resolve_ai_base_url, resolve_ai_model

        root = store.knowledge_root
        user_md_path = root / "profiles" / "users" / f"{username}.md"
        if not user_md_path.is_file():
            return

        current_profile = user_md_path.read_text(encoding="utf-8")
        recent_msgs = messages[-10:]
        conversation = "\n".join(
            f"[{m['role']}] {m['content'][:200]}" for m in recent_msgs
        )

        api_key = await resolve_ai_key()
        if not api_key:
            return

        client = anthropic.AsyncAnthropic(
            api_key=api_key,
            base_url=await resolve_ai_base_url() or None,
        )

        resp = await client.messages.create(
            model=await resolve_ai_model(),
            max_tokens=400,
            system=(
                "You are a profile evolution engine. Given a user's current profile and recent conversation, "
                "determine if the profile should be updated. Output ONLY the updated markdown profile if changes are needed, "
                "or output exactly 'NO_CHANGE' if no update is warranted. "
                "Only update fields where the conversation provides clear evidence of a preference change. "
                "Preserve the existing frontmatter and structure."
            ),
            messages=[{
                "role": "user",
                "content": f"## Current Profile\n{current_profile}\n\n## Recent Conversation\n{conversation}",
            }],
        )

        result = resp.content[0].text.strip()
        if result != "NO_CHANGE" and len(result) > 50:
            user_md_path.write_text(result, encoding="utf-8")
            _logger.info("profile evolved for user %s", username)

    except Exception:
        _logger.debug("profile evolution skipped for %s", username, exc_info=True)


_OPTION_LINE_RE = re.compile(
    r"^\s*"
    r"(?:"
    r"[（(]?([A-Za-z])[）)]\s*|"          # A) (A) A)
    r"(方案\s*[一二三四五六七八九十]+)\s*[：:．\.\s]*|"  # 方案一：
    r"(选项\s*[一二三四五六七八九十]+)\s*[：:．\.\s]*"   # 选项一：
    r")",
    re.MULTILINE,
)

# Full-width digits mapping
_FW_DIGITS = str.maketrans("０１２３４５６７８９", "0123456789")
# Circled numbers
_CIRCLED = {"①": "1", "②": "2", "③": "3", "④": "4", "⑤": "5", "⑥": "6", "⑦": "7", "⑧": "8"}
# Chinese numbers for 方案 matching
_CN_NUM = {"一":"1","二":"2","三":"3","四":"4","五":"5","六":"6","七":"7","八":"8","九":"9","十":"10"}

def _normalize_label(prefix: str) -> str:
    """Normalize an option prefix like 'A)' or '方案一：' into 'A) '."""
    prefix = prefix.strip().rstrip(":.：．)）")
    if prefix in _CIRCLED:
        return _CIRCLED[prefix] + ") "
    if prefix.startswith("方案") or prefix.startswith("选项"):
        for cn, num in _CN_NUM.items():
            prefix = prefix.replace(cn, num)
        prefix = prefix.replace(" ", "")
        return prefix  # e.g. "方案1"
    return prefix + ") "


def _extract_options(text: str) -> tuple[list[dict], str | None]:
    """Extract option lines ONLY from the final portion of the message.

    Guards:
    - Only scans the last 40% of lines (options are asked at the end, not mid-paragraph)
    - Options must appear consecutively with no more than 1 blank line between them
    - Requires at least 3 options
    """
    lines = text.split("\n")
    total = len(lines)
    # Only look at the last ~40% of the message
    start = max(0, total - max(8, total // 2))
    # But also look earlier if there are clearly more lines after
    tail_lines = lines[start:]
    option_indices: list[int] = []

    # Find option-like lines in the tail
    for i, line in enumerate(tail_lines):
        if _OPTION_LINE_RE.match(line):
            option_indices.append(i)

    if len(option_indices) < 3:
        return [], None

    # Must be consecutive (gap ≤ 1 line allowed between options)
    gaps = [option_indices[j] - option_indices[j - 1] for j in range(1, len(option_indices))]
    if max(gaps, default=0) > 2:
        return [], None

    # Extract the question context (lines before the first option in tail)
    first_opt_idx = option_indices[0]
    question_lines = [l for l in tail_lines[:first_opt_idx] if l.strip()]

    # Build option entries
    option_entries: list[dict] = []
    for idx in option_indices:
        line = tail_lines[idx]
        m = _OPTION_LINE_RE.match(line)
        if not m:
            continue
        raw_prefix = m.group(0).strip()
        rest = line[m.end():].strip()
        if "：" in rest or ":" in rest:
            sep = "：" if "：" in rest else ":"
            label, _, desc = rest.partition(sep)
            label = label.strip()
            desc = desc.strip() if desc.strip() else None
        else:
            label = rest
            desc = None

        prefix = _normalize_label(raw_prefix)
        entry = {"label": f"{prefix} {label}".strip()}
        if desc:
            entry["description"] = desc
        option_entries.append(entry)

    title = ""
    if question_lines:
        relevant = [l for l in question_lines if len(l) > 3]
        if relevant:
            title = relevant[-1].strip()[:80]

    return option_entries, title if title else None


def _looks_like_multiselect(text: str) -> bool:
    """Guess if the text implies multi-select."""
    keywords = ["多选", "可多选", "可以多选", "可同时选", "选多项", "勾选",
                "which of these", "select all", "check all", "multiple"]
    return any(kw in text.lower() for kw in keywords)




def _build_card_js(reply_text: str) -> str | None:
    """Build a JS `const card = {...}` block from plain-text options in the AI reply."""
    import json as _json

    options, title = _extract_options(reply_text)
    if len(options) < 3:
        return None

    card_type = "checkbox" if _looks_like_multiselect(reply_text) else "radio"
    card = {"type": card_type, "title": title or "请选择", "options": options}
    card_json = _json.dumps(card, ensure_ascii=False)
    _logger.info("card conversion: extracted %d options → type=%s", len(options), card_type)
    # Generate JS code — much easier for LLMs to output than JSON
    return f"const card = {card_json};"
