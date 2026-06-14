"""Clarify session scaffolding and writeback helpers.

This service is the backend-side bridge between the plugin session contract and
the real SuperPmAgent-knowledge repository. It intentionally keeps V1 behavior
simple and deterministic:

- create the canonical session folder under KNOWLEDGE_REPO_PATH/sessions/
- register external source URLs under attachments/sources/
- append the PM request to conversation.md
- create an initial notes.md IntentSpec draft when one does not exist yet

Later iterations can replace the initial draft generation with a true agent
clarification loop without changing the storage contract.
"""

from __future__ import annotations

import json
import re
from datetime import UTC, datetime
from pathlib import Path
from urllib.parse import urlparse

_URL_RE = re.compile(r"https?://[^\s)>\"]+")


def ensure_session_structure(root: Path, session_name: str) -> Path:
    """Create the canonical session folder shape under the knowledge repo."""
    session_dir = root / "sessions" / session_name
    (session_dir / "attachments" / "sources").mkdir(parents=True, exist_ok=True)
    (session_dir / "attachments" / "exports").mkdir(parents=True, exist_ok=True)
    (session_dir / "executions").mkdir(parents=True, exist_ok=True)

    conversation = session_dir / "conversation.md"
    if not conversation.exists():
        conversation.write_text("# Conversation\n\n", encoding="utf-8")

    decisions = session_dir / "decisions.md"
    if not decisions.exists():
        decisions.write_text("# Decisions\n\n- None yet.\n", encoding="utf-8")

    return session_dir


def scaffold_notes(session_name: str, message: str, source_urls: list[str]) -> str:
    """Build a conservative initial IntentSpec draft from the first PM request."""
    short_title = _derive_short_title(session_name, message)
    now = datetime.now(UTC).date().isoformat()
    normalized_goal = _normalize_goal(message)
    source_constraints = (
        "- Initial clarification request includes external source references.\n"
        if source_urls else "- None yet.\n"
    )
    source_risks = (
        "- External source material still requires PM confirmation before execution.\n"
        if source_urls else ""
    )

    return (
        "---\n"
        f"session: {session_name}\n"
        "confidence: 0.35\n"
        'confidence_reason: "Initial backend clarify draft from the PM request; further clarification is required."\n'
        f"created: {now}\n"
        f"last_accessed: {now}\n"
        "access_count: 1\n"
        "ttl_days: 90\n"
        "status: active\n"
        f"source: session/{session_name}\n"
        "---\n\n"
        f"# IntentSpec: {short_title}\n\n"
        "## Raw Request\n\n"
        f"{message.strip()}\n\n"
        "## Standardized Goal\n\n"
        f"{normalized_goal}\n\n"
        "## User Value\n\n"
        "Clarify the user-facing value and delivery intent from the PM request.\n\n"
        "## Scope\n\n"
        "- Clarify the target outcome, boundaries, and acceptance criteria for this request.\n\n"
        "## Out of Scope\n\n"
        "- None\n\n"
        "## Acceptance Criteria\n\n"
        "- The PM request is clarified into a stable executable IntentSpec.\n"
        "- Scope and out-of-scope boundaries are explicitly confirmed.\n"
        "- Acceptance criteria are concrete enough for `/goal` to consume later.\n\n"
        "## Constraints\n\n"
        f"{source_constraints}\n"
        "## Risks\n\n"
        "- The current draft is created from the initial PM request and is not yet ready for execution.\n"
        f"{source_risks}\n"
        "## Open Questions\n\n"
        "- What exact user-facing outcome should this request deliver?\n"
        "- What should be explicitly out of scope for the first execution loop?\n"
        "- What concrete acceptance criteria should `/goal` satisfy?\n\n"
        "## Ready for Goal\n\n"
        "- ready_for_goal: no\n"
        "- blockers:\n"
        "  - Clarification draft created from the initial PM request; scope and acceptance criteria still need confirmation.\n"
    )


def append_conversation_entry(
    session_dir: Path,
    *,
    message: str,
    source_records: list[dict],
) -> None:
    """Append a markdown conversation entry for the incoming clarify request."""
    conversation = session_dir / "conversation.md"
    now = datetime.now(UTC).isoformat()
    lines = [
        f"## {now}",
        "",
        "**User request**",
        "",
        message.strip(),
        "",
    ]
    if source_records:
        lines.extend(
            [
                "**Registered sources**",
                "",
                *[
                    f"- `{record['source_type']}`: {record['source_uri']}"
                    for record in source_records
                ],
                "",
            ]
        )

    with conversation.open("a", encoding="utf-8") as fh:
        fh.write("\n".join(lines))
        fh.write("\n")


def register_sources(
    session_dir: Path,
    *,
    message: str,
    source_urls: list[str],
) -> list[dict]:
    """Create normalized source metadata records under attachments/sources/."""
    records: list[dict] = []
    seen: set[str] = set()
    sources_dir = session_dir / "attachments" / "sources"

    for raw_url in list(source_urls) + _extract_urls(message):
        url = raw_url.strip()
        if not url or url in seen:
            continue
        seen.add(url)
        record = _build_source_record(url, message)
        records.append(record)
        slug = _source_slug(url)
        target = sources_dir / f"{slug}.json"
        target.write_text(
            json.dumps(record, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )

    return records


def _build_source_record(url: str, message: str) -> dict:
    parsed = urlparse(url)
    host = parsed.netloc.lower()
    doc_token = parsed.path.rstrip("/").split("/")[-1] if parsed.path else ""
    source_type = "feishu_doc" if "feishu.cn" in host else "url"
    record: dict = {
        "source_type": source_type,
        "source_uri": url,
        "title": parsed.path.rstrip("/").split("/")[-1] or host,
        "summary": "Registered as external source material for backend clarify.",
        "raw_request": message.strip(),
        "extracted_points": [
            "External source was registered for later clarification.",
        ],
        "risks": [
            "External source content has not yet been fully clarified into the IntentSpec.",
        ],
    }
    if source_type == "feishu_doc":
        record["provider_metadata"] = {
            "provider": "feishu",
            "resource_kind": "doc",
            "doc_token": doc_token,
            "host": host,
            "capture_method": "backend-source-registration",
            "needs_followup_confirmation": True,
        }
    return record


def _extract_urls(message: str) -> list[str]:
    return _URL_RE.findall(message)


def _derive_short_title(session_name: str, message: str) -> str:
    msg = " ".join(message.strip().split())
    if msg:
        return msg[:80]
    return session_name


def _normalize_goal(message: str) -> str:
    text = " ".join(message.strip().split())
    if not text:
        return "Clarify the PM request into an executable IntentSpec."
    if len(text) <= 120:
        return text
    return f"{text[:117]}..."


def _source_slug(url: str) -> str:
    parsed = urlparse(url)
    host = re.sub(r"[^a-z0-9]+", "-", parsed.netloc.lower()).strip("-")
    tail = parsed.path.rstrip("/").split("/")[-1].lower() if parsed.path else "source"
    tail = re.sub(r"[^a-z0-9]+", "-", tail).strip("-") or "source"
    return f"{host}-{tail}"[:80]
