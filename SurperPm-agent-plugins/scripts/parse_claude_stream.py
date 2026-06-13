#!/usr/bin/env python3
"""Convert Claude Code stream-json lines into benchmark task:message events."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from benchmark_run_log import append_event, redact  # noqa: E402


def read_stream_text(path: Path) -> str:
    raw = path.read_bytes()
    if raw.startswith(b"\xff\xfe") or raw.startswith(b"\xfe\xff"):
        return raw.decode("utf-16", errors="replace")
    if b"\x00" in raw[:200]:
        return raw.decode("utf-16-le", errors="replace")
    return raw.decode("utf-8", errors="replace")


def summarize_obj(obj: dict) -> str:
    t = obj.get("type")
    if t == "assistant":
        msg = obj.get("message") or {}
        content = msg.get("content") or []
        if isinstance(content, list):
            for block in content:
                if isinstance(block, dict) and block.get("type") == "text":
                    return redact(f"assistant: {str(block.get('text', ''))[:200]}")
                if isinstance(block, dict) and block.get("type") == "thinking":
                    return redact("assistant: [thinking]")
        return redact("assistant message")
    if t == "result":
        result = obj.get("result") or obj.get("subtype") or "done"
        turns = obj.get("num_turns")
        cost = obj.get("total_cost_usd")
        return redact(f"result: {str(result)[:120]} turns={turns} cost={cost}")
    if t == "system":
        sub = obj.get("subtype", "")
        if sub == "init":
            return redact(f"system init model={obj.get('model', '')}")
        if sub == "notification":
            return redact(f"system: {obj.get('text', sub)[:160]}")
        return redact(f"system {sub}")
    if "tool_name" in obj:
        return redact(f"tool: {obj.get('tool_name')}")
    return redact(str(t or "event")[:200])


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("stream_file")
    ap.add_argument("run_dir")
    ap.add_argument("--phase", default="claude-cli")
    args = ap.parse_args()

    run_dir = Path(args.run_dir)
    path = Path(args.stream_file)
    if not path.is_file():
        print(f"Missing stream file: {path}", file=sys.stderr)
        return 1

    text = read_stream_text(path)
    count = 0
    for line in text.splitlines():
        line = line.strip()
        if not line or not line.startswith("{"):
            continue
        try:
            obj = json.loads(line)
        except json.JSONDecodeError:
            continue
        append_event(
            run_dir,
            {
                "type": "task:message",
                "phase": args.phase,
                "summary": summarize_obj(obj),
                "stream_type": obj.get("type"),
            },
        )
        count += 1

    append_event(
        run_dir,
        {
            "type": "task:running",
            "phase": "parse_stream",
            "summary": f"parsed {count} stream-json events",
        },
    )
    print(f"Appended {count} events to {run_dir / 'events.jsonl'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
