"""Export clarified sessions into Feishu PRD artifact records."""

from __future__ import annotations

import json
import re
import shutil
import subprocess
from datetime import UTC, datetime
from pathlib import Path
from urllib.parse import urlparse
from xml.sax.saxutils import escape

SECTION_LABELS = {
    "Raw Request": "需求背景",
    "Standardized Goal": "目标",
    "User Value": "用户价值",
    "Scope": "范围",
    "Out of Scope": "非范围",
    "Acceptance Criteria": "验收标准",
    "Constraints": "约束",
    "Risks": "风险",
    "Open Questions": "待确认问题",
    "Ready for Goal": "准备状态",
}


LINE_TRANSLATIONS = {
    "IntentSpec: Export Session to Feishu PRD (MVP)":
        "需求说明：将 Session 导出为飞书 PRD（MVP）",
    "Export a clarified session to Feishu.":
        "将已澄清的 session 导出到飞书。",
    "Generate a shareable Feishu PRD from session artifacts.":
        "根据 session 产物生成可分享的飞书 PRD。",
    "Read notes.md":
        "读取 notes.md",
    "Read decisions.md":
        "读取 decisions.md",
    "Frontend UI integration":
        "前端 UI 集成",
    "Which identity should own the generated document?":
        "生成文档应归属于哪种身份？",
    "Create an MVP capability to export a clarified session's notes and decisions into a Feishu document using plain text content, and register the export metadata to the session's `attachments/exports/` directory per IO-PROTOCOL.":
        "实现一个 export-feishu-prd 的 MVP 能力：把已澄清 session 的 notes 和 decisions 以纯文本方式导出为飞书文档，并按 IO-PROTOCOL 将导出元数据登记到 session 的 attachments/exports 目录。",
    "Enable PMs to export clarified SuperPmAgent sessions into shareable Feishu PRD documents with minimal friction, proving the session-to-Feishu pipeline before investing in formatting or automation.":
        "让 PM 可以低摩擦地把已澄清的 SuperPmAgent session 导出成可分享的飞书 PRD 文档，在投入格式优化或自动化之前先验证 session 到飞书的导出链路。",
    "Read `notes.md` and `decisions.md` from a clarified session directory":
        "读取已澄清 session 目录中的 notes.md 和 decisions.md",
    "Generate a Feishu document with plain text content (no Markdown-to-Block conversion)":
        "生成一份仅包含纯文本内容的飞书文档（不做 Markdown 到 Block 的转换）",
    "Document structure: title (session name) + notes content + separator + decisions content":
        "文档结构为：标题（session 名称） + notes 内容 + 分隔线 + decisions 内容",
    "Register export record to `attachments/exports/<slug>.json` per IO-PROTOCOL":
        "按 IO-PROTOCOL 将导出记录写入 attachments/exports/<slug>.json",
    "Return the Feishu document URL to the caller":
        "向调用方返回飞书文档 URL",
    "Any Markdown formatting conversion (headings, lists, bold, code blocks, etc.)":
        "任何 Markdown 格式转换（标题、列表、加粗、代码块等）",
    "Complex document layout or rich formatting (tables, images, styling)":
        "复杂文档布局或富文本格式（表格、图片、样式等）",
    "Automatic trigger on session completion":
        "在 session 完成时自动触发导出",
    "Frontend UI integration (button, loading states)":
        "前端 UI 集成（按钮、加载状态等）",
    "Re-export idempotency (re-run creates new document)":
        "重复导出的幂等性处理（重复执行会创建新文档）",
    "Including `conversation.md` in export":
        "将 conversation.md 一并纳入导出",
    "User-level OAuth authentication flow":
        "用户级 OAuth 鉴权流程",
    "Given a session path, the export produces a valid Feishu document accessible via URL":
        "给定一个 session 路径，导出后会生成一份可通过 URL 访问的有效飞书文档",
    "The Feishu document contains plain text content from `notes.md` and `decisions.md` separated by a horizontal rule":
        "飞书文档包含来自 notes.md 和 decisions.md 的纯文本内容，并通过一条水平分隔线分开",
    "Export metadata is written to `attachments/exports/*.json` with required fields: `output_type`, `title`, `artifact_uri`, `source_session`, `source_files`, `generated_at`":
        "导出元数据会写入 attachments/exports/*.json，且包含必需字段：output_type、title、artifact_uri、source_session、source_files、generated_at",
    "The export function uses `lark-doc` skill for Feishu API operations":
        "导出功能使用 lark-doc skill 调用飞书 API",
    "Must follow IO-PROTOCOL for output registration":
        "必须遵循 IO-PROTOCOL 完成输出登记",
    "Must use existing `lark-doc` skill for Feishu document creation":
        "必须使用现有的 lark-doc skill 创建飞书文档",
    "MVP treats Markdown content as plain text (no formatting preserved)":
        "MVP 将 Markdown 内容视为纯文本处理（不保留格式）",
    "Document ownership identity must be resolved before implementation":
        "在正式实现前，必须先确认文档创建身份",
    "Plain text output may be harder to read for complex IntentSpecs":
        "对于复杂的 IntentSpec，纯文本输出的可读性可能较差",
    "Feishu API rate limits or permission scopes may require additional configuration":
        "飞书 API 的限流或权限范围可能需要额外配置",
    "If system bot is used, users may not have edit permissions on generated documents":
        "如果使用系统 Bot，用户可能对生成的文档没有编辑权限",
    "Option A: System Bot Account (recommended for MVP - simplest implementation, no OAuth required)":
        "方案 A：系统 Bot 账号（推荐用于 MVP，最简单，不需要 OAuth）",
    "Option B: Current Operator (requires user OAuth flow, documents belong to user)":
        "方案 B：当前操作者（需要用户 OAuth 流程，文档归用户所有）",
    "Option C: Hybrid (Bot creates + share/transfer to user)":
        "方案 C：混合模式（由 Bot 创建，再共享或转交给用户）",
    "First version focuses on minimal closed-loop only.":
        "第一版只聚焦最小闭环。",
    "Treat Markdown content as plain text; ignore formatting.":
        "将 Markdown 内容按纯文本处理，忽略格式。",
    "Treat markdown as plain text in v1.":
        "第一版将 Markdown 按纯文本处理。",
    "Input limited to notes.md and decisions.md.":
        "输入范围仅限于 notes.md 和 decisions.md。",
    "Output is a one-time export.":
        "输出为一次性导出。",
    "No Markdown-to-Block AST conversion required.":
        "不需要做 Markdown 到 Block AST 的转换。",
    "Content is stored as raw text strings in Feishu blocks.":
        "内容以原始文本字符串的形式写入飞书 blocks。",
}

PREFIX_TRANSLATIONS = {
    "Decision:": "决策：",
    "Confirmed by PM:": "PM 确认：",
    "Implications:": "影响：",
}


def export_session_to_feishu_prd(
    *,
    session_name: str,
    knowledge_root: Path,
    title: str | None = None,
    as_identity: str = "user",
    parent_token: str | None = None,
    parent_position: str | None = None,
) -> dict:
    session_dir = knowledge_root / "sessions" / session_name
    if not session_dir.is_dir():
        raise FileNotFoundError(f"Session not found: {session_name}")

    notes_file = session_dir / "notes.md"
    decisions_file = session_dir / "decisions.md"
    if not notes_file.is_file():
        raise FileNotFoundError(f"notes.md not found for session: {session_name}")
    if not decisions_file.is_file():
        raise FileNotFoundError(f"decisions.md not found for session: {session_name}")

    notes = notes_file.read_text(encoding="utf-8").strip()
    decisions = decisions_file.read_text(encoding="utf-8").strip()
    doc_title = (title or f"PRD - {session_name}").strip()

    cli = shutil.which("lark-cli")
    if not cli:
        raise RuntimeError("lark-cli not found")

    xml_content = _build_prd_xml(
        title=doc_title,
        notes=notes,
        decisions=decisions,
    )
    create_result = _create_feishu_doc(
        cli=cli,
        xml_content=xml_content,
        as_identity=as_identity,
        parent_token=parent_token,
        parent_position=parent_position,
        working_root=knowledge_root,
    )

    artifact_uri = _extract_artifact_uri(create_result)
    doc_token = _extract_doc_token(create_result)
    generated_at = datetime.now(UTC).isoformat()
    export_id = datetime.now(UTC).strftime("%Y%m%d-%H%M%S")
    record_slug = f"feishu-prd-{export_id}"

    record = {
        "output_type": "feishu_prd",
        "title": doc_title,
        "artifact_uri": artifact_uri,
        "source_session": str(session_dir),
        "source_files": [
            "notes.md",
            "decisions.md",
        ],
        "generated_at": generated_at,
        "provider_metadata": {
            "provider": "feishu",
            "resource_kind": "doc",
            "doc_token": doc_token,
            "capture_method": "lark-cli docs +create",
            "identity": as_identity,
        },
    }
    record_path = session_dir / "attachments" / "exports" / f"{record_slug}.json"
    record_path.write_text(
        json.dumps(record, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    _append_export_audit(
        session_dir=session_dir,
        title=doc_title,
        artifact_uri=artifact_uri,
        generated_at=generated_at,
    )

    return {
        "ok": True,
        "session": session_name,
        "title": doc_title,
        "mode": "lark_doc",
        "artifact_uri": artifact_uri,
        "artifact_record_path": str(record_path),
        "export_id": export_id,
        "doc_token": doc_token,
    }


def _build_prd_xml(*, title: str, notes: str, decisions: str) -> str:
    note_title, note_sections = _parse_intentspec_sections(notes)
    decisions_text = _localize_export_text(_normalize_decisions_text(decisions))

    parts = [f"<title>{escape(title)}</title>"]

    if note_title:
        parts.append("<h1>PRD 概述</h1>")
        parts.extend(_paragraphize(_localize_export_text(note_title)))

    for section_name, section_label in SECTION_LABELS.items():
        content = note_sections.get(section_name, "").strip()
        if not content:
            continue
        parts.append(f"<h1>{escape(section_label)}</h1>")
        parts.extend(_paragraphize(_localize_export_text(content)))

    parts.append("<h1>已确认决策</h1>")
    parts.extend(_paragraphize(decisions_text))
    return "\n".join(parts)


def _paragraphize(text: str) -> list[str]:
    blocks = []
    for raw_line in text.splitlines():
        line = raw_line.rstrip()
        if not line.strip():
            continue
        blocks.append(f"<p>{escape(line)}</p>")
    if not blocks:
        blocks.append("<p>(empty)</p>")
    return blocks


def _parse_intentspec_sections(text: str) -> tuple[str | None, dict[str, str]]:
    body = _strip_front_matter(text).strip()
    if not body:
        return None, {}

    lines = body.splitlines()
    title: str | None = None
    sections: dict[str, list[str]] = {}
    current_section: str | None = None

    for raw_line in lines:
        line = raw_line.rstrip()
        stripped = line.strip()

        if not stripped and current_section is None:
            continue

        if stripped.startswith("# "):
            heading_text = stripped[2:].strip()
            if title is None:
                title = heading_text
                continue

        if stripped.startswith("## "):
            current_section = stripped[3:].strip()
            sections.setdefault(current_section, [])
            continue

        if current_section is None:
            continue

        sections[current_section].append(line)

    normalized = {
        name: "\n".join(lines).strip()
        for name, lines in sections.items()
        if "\n".join(lines).strip()
    }
    return title, normalized


def _normalize_decisions_text(text: str) -> str:
    body = _strip_front_matter(text).strip()
    if not body:
        return ""

    lines = body.splitlines()
    if lines and lines[0].strip().startswith("# "):
        lines = lines[1:]

    return _normalize_markdown_plain_text("\n".join(lines).strip())


def _normalize_markdown_plain_text(text: str) -> str:
    normalized_lines: list[str] = []
    for raw_line in text.splitlines():
        line = raw_line.rstrip()
        stripped = line.strip()

        if not stripped:
            normalized_lines.append("")
            continue

        heading_match = re.match(r"^(#{1,6})\s+(.*)$", stripped)
        if heading_match:
            line = heading_match.group(2).strip()
        else:
            line = stripped

        line = re.sub(r"\*\*([^*]+)\*\*:", r"\1:", line)
        line = re.sub(r"\*\*([^*]+)\*\*", r"\1", line)
        line = re.sub(r"`([^`]+)`", r"\1", line)
        normalized_lines.append(line)

    return "\n".join(normalized_lines).strip()


def _localize_export_text(text: str) -> str:
    localized_lines: list[str] = []
    for raw_line in text.splitlines():
        line = raw_line.rstrip()
        stripped = line.strip()

        if not stripped:
            localized_lines.append("")
            continue

        indent = line[: len(line) - len(line.lstrip())]
        marker = ""
        content = stripped

        bullet_match = re.match(r"^([-*])\s+(.*)$", stripped)
        if bullet_match:
            marker = f"{bullet_match.group(1)} "
            content = bullet_match.group(2).strip()
        else:
            ordered_match = re.match(r"^(\d+\.)\s+(.*)$", stripped)
            if ordered_match:
                marker = f"{ordered_match.group(1)} "
                content = ordered_match.group(2).strip()

        localized = LINE_TRANSLATIONS.get(content)
        if localized is None:
            localized = _translate_by_prefix(content)
        if localized is None:
            localized = content

        localized_lines.append(f"{indent}{marker}{localized}".rstrip())

    return "\n".join(localized_lines).strip()


def _translate_by_prefix(text: str) -> str | None:
    for prefix, localized_prefix in PREFIX_TRANSLATIONS.items():
        if text.startswith(prefix):
            remainder = text[len(prefix) :].strip()
            if not remainder:
                return localized_prefix
            translated_remainder = LINE_TRANSLATIONS.get(remainder, remainder)
            return f"{localized_prefix} {translated_remainder}".strip()
    return None


def _strip_front_matter(text: str) -> str:
    if not text.startswith("---"):
        return text

    lines = text.splitlines()
    if not lines or lines[0].strip() != "---":
        return text

    for idx in range(1, len(lines)):
        if lines[idx].strip() == "---":
            return "\n".join(lines[idx + 1 :])
    return text


def _create_feishu_doc(
    *,
    cli: str,
    xml_content: str,
    as_identity: str,
    parent_token: str | None,
    parent_position: str | None,
    working_root: Path,
) -> dict:
    temp_dir = working_root / ".tmp"
    temp_dir.mkdir(parents=True, exist_ok=True)
    temp_path = temp_dir / f"feishu-prd-{datetime.now(UTC).strftime('%Y%m%d-%H%M%S-%f')}.xml"
    temp_path.write_text(xml_content, encoding="utf-8")
    relative_temp_path = temp_path.relative_to(working_root)

    args = [
        cli,
        "docs",
        "+create",
        "--api-version",
        "v2",
        "--doc-format",
        "xml",
        "--content",
        f"@{relative_temp_path.as_posix()}",
        "--as",
        as_identity,
    ]
    if parent_token:
        args.extend(["--parent-token", parent_token])
    if parent_position:
        args.extend(["--parent-position", parent_position])

    try:
        result = subprocess.run(
            args,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=120,
            check=False,
            cwd=str(working_root),
        )
    finally:
        try:
            temp_path.unlink(missing_ok=True)
        except Exception:
            pass

    stdout = (result.stdout or "").strip()
    stderr = (result.stderr or "").strip()
    if result.returncode != 0:
        raise RuntimeError(stderr or stdout or f"lark-cli docs +create failed with code {result.returncode}")
    if not stdout:
        raise RuntimeError("lark-cli docs +create returned empty output")

    try:
        return json.loads(stdout)
    except json.JSONDecodeError as exc:
        raise RuntimeError(f"Failed to parse lark-cli output: {exc}") from exc


def _extract_artifact_uri(payload: dict) -> str:
    candidates = [
        payload.get("url"),
        (payload.get("data") or {}).get("url"),
        (payload.get("data") or {}).get("doc_url"),
        (payload.get("data") or {}).get("document", {}).get("url"),
    ]
    for value in candidates:
        if isinstance(value, str) and value.strip():
            return value.strip()

    match = re.search(r"https?://[^\s\"']+", json.dumps(payload, ensure_ascii=False))
    if match:
        return match.group(0)
    raise RuntimeError("Could not extract Feishu document URL from lark-cli response")


def _extract_doc_token(payload: dict) -> str | None:
    candidates = [
        (payload.get("data") or {}).get("document_id"),
        (payload.get("data") or {}).get("document", {}).get("document_id"),
        (payload.get("data") or {}).get("document", {}).get("token"),
        payload.get("document_id"),
    ]
    for value in candidates:
        if isinstance(value, str) and value.strip():
            return value.strip()

    try:
        parsed = urlparse(_extract_artifact_uri(payload))
        token = parsed.path.rstrip("/").split("/")[-1]
        return token or None
    except Exception:
        return None


def _append_export_audit(
    *,
    session_dir: Path,
    title: str,
    artifact_uri: str,
    generated_at: str,
) -> None:
    conversation = session_dir / "conversation.md"
    lines = [
        f"## {generated_at}",
        "",
        "**System**",
        "",
        f"Exported Feishu PRD: {title}",
        "",
        f"- artifact_uri: {artifact_uri}",
        "",
    ]
    with conversation.open("a", encoding="utf-8") as fh:
        fh.write("\n".join(lines))
        fh.write("\n")
