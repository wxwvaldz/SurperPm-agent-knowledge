#!/usr/bin python3
"""Test DeepSeek Anthropic-compatible API (reads conduit-test/.env.claude.local)."""
from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
ENV_FILE = ROOT / "conduit-test" / ".env.claude.local"


def load_env(path: Path) -> None:
    if not path.is_file():
        print(f"FAIL: missing {path}")
        sys.exit(1)
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, _, v = line.partition("=")
        v = v.strip().strip('"').strip("'")
        if v.startswith("<") and v.endswith(">"):
            continue
        os.environ[k.strip()] = v


def main() -> int:
    load_env(ENV_FILE)
    api_key = os.environ.get("ANTHROPIC_API_KEY", "")
    base = os.environ.get("ANTHROPIC_BASE_URL", "https://api.deepseek.com/anthropic").rstrip("/")
    model = os.environ.get("ANTHROPIC_MODEL", "deepseek-v4-flash")

    if not api_key:
        print("FAIL: ANTHROPIC_API_KEY not set in .env.claude.local")
        return 1

    url = f"{base}/v1/messages"
    body = {
        "model": model,
        "max_tokens": 32,
        "messages": [{"role": "user", "content": "Reply with exactly: DEEPSEEK_OK"}],
    }
    req = urllib.request.Request(
        url,
        data=json.dumps(body).encode("utf-8"),
        headers={
            "content-type": "application/json",
            "x-api-key": api_key,
            "anthropic-version": "2026-06-13",
        },
        method="POST",
    )
    print(f"POST {url}")
    print(f"model={model}")
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        err = e.read().decode("utf-8", errors="replace")[:500]
        print(f"FAIL: HTTP {e.code}")
        print(err)
        return 1
    except Exception as e:
        print(f"FAIL: {e}")
        return 1

    text = ""
    for block in data.get("content", []):
        if block.get("type") == "text":
            text += block.get("text", "")
    print(f"OK: HTTP 200")
    print(f"response snippet: {text[:200]!r}")
    if "DEEPSEEK_OK" in text or text.strip():
        print("Connectivity: PASS")
        return 0
    print("WARN: empty or unexpected body")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
