#!/usr/bin/env python3
"""Round-aware paths and state for benchmark/runs."""

from __future__ import annotations

import json
import re
from datetime import UTC, datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RUNS = ROOT / "benchmark" / "runs"
STATE_FILE = RUNS / ".round-state.json"
INDEX_FILE = RUNS / "rounds-index.md"


def _now() -> str:
    return datetime.now(UTC).strftime("%Y-%m-%d %H:%M UTC")


def level_from_case(case_id: str, meta: dict | None = None) -> str:
    if meta and meta.get("level"):
        lv = str(meta["level"]).upper()
        if re.match(r"^L[123]$", lv):
            return lv
        if lv in ("XR", "XC", "WEB", "DV", "AP"):
            return lv
    for prefix in ("WEB", "AP", "DV", "XC", "XR", "L3", "L2", "L1"):
        if case_id.upper().startswith(prefix):
            if prefix.startswith("L"):
                return prefix.upper()
            return prefix
    return "L1"


def case_folder(case_id: str, meta: dict | None = None) -> str:
    if meta and meta.get("id"):
        return str(meta["id"]).replace("/", "-")
    direct = case_id
    if re.match(r"^L[123]-\d+$", case_id, re.I):
        return case_id
    return case_id.replace("/", "-")


def load_state() -> dict:
    if STATE_FILE.is_file():
        try:
            return json.loads(STATE_FILE.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            pass
    return {"current_round": 1, "history": []}


def save_state(state: dict) -> None:
    RUNS.mkdir(parents=True, exist_ok=True)
    STATE_FILE.write_text(json.dumps(state, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def round_dir(round_num: int) -> Path:
    return RUNS / f"round-{round_num:03d}"


def run_dir_path(
    case_id: str,
    run_id: str,
    *,
    round_num: int | None = None,
    meta: dict | None = None,
) -> Path:
    state = load_state()
    rn = round_num if round_num is not None else int(state.get("current_round", 1))
    folder = case_folder(case_id, meta)
    level = level_from_case(case_id, meta)
    return round_dir(rn) / level / folder / run_id


def ensure_round_layout(round_num: int) -> Path:
    rd = round_dir(round_num)
    for level in ("L1", "L2", "L3", "XR", "XC", "WEB", "DV", "AP"):
        (rd / level).mkdir(parents=True, exist_ok=True)
    summary = rd / "ROUND.md"
    if not summary.is_file():
        summary.write_text(
            f"# Round {round_num:03d}\n\nCreated: {_now()}\n\n## Cases\n\n| Level | Case | Run | Status | Notes |\n|---|---|---|---|---|\n",
            encoding="utf-8",
        )
    return rd


def bump_round(note: str = "") -> int:
    state = load_state()
    old = int(state.get("current_round", 1))
    new = old + 1
    state["current_round"] = new
    hist = state.setdefault("history", [])
    hist.append({"from": old, "to": new, "at": _now(), "note": note})
    save_state(state)
    ensure_round_layout(new)
    _refresh_index()
    return new


def set_round(round_num: int) -> None:
    state = load_state()
    state["current_round"] = round_num
    save_state(state)
    ensure_round_layout(round_num)
    _refresh_index()


def _read_run_status(run_path: Path) -> str:
    events = run_path / "events.jsonl"
    if not events.is_file():
        return "unknown"
    completed = None
    last_type = "unknown"
    for line in events.read_text(encoding="utf-8", errors="replace").splitlines():
        if not line.strip():
            continue
        try:
            ev = json.loads(line)
        except json.JSONDecodeError:
            continue
        last_type = ev.get("type", last_type)
        if ev.get("type") == "task:completed":
            completed = ev
    if completed:
        if completed.get("backend_scope_violation"):
            return "scope_violation"
        if completed.get("dependency_changed"):
            return "dependency_changed"
        if completed.get("has_git_changes"):
            return str(completed.get("status", "needs_review"))
        return "no_changes"
    return last_type


def _refresh_index() -> None:
    lines = [
        "# Benchmark runs index (by round)",
        "",
        f"Updated: {_now()}",
        "",
        f"**Current round:** `{load_state().get('current_round', 1)}` (see `.round-state.json`)",
        "",
        "```text",
        "benchmark/runs/",
        "  round-NNN/",
        "    ROUND.md          # round summary",
        "    L1|L2|L3/<case-id>/<run-id>/   # Track A Conduit",
        "    XC/<case-id>/<run-id>/         # Track B cross-repo code",
        "    XR/<case-id>/<run-id>/         # Track B README smoke only",
        "    WEB/<case-id>/<run-id>/       # Track C contract probes",
        "```",
        "",
    ]
    for rd in sorted(RUNS.glob("round-*")):
        if not rd.is_dir():
            continue
        lines.append(f"## {rd.name}")
        lines.append("")
        round_md = rd / "ROUND.md"
        if round_md.is_file():
            for ln in round_md.read_text(encoding="utf-8").splitlines()[:8]:
                if ln.strip() and not ln.startswith("# Round"):
                    lines.append(f"> {ln}")
            lines.append("")
        for level in ("L1", "L2", "L3", "XR", "XC", "WEB", "DV", "AP"):
            level_dir = rd / level
            if not level_dir.is_dir():
                continue
            runs: list[str] = []
            for case_dir in sorted(level_dir.iterdir()):
                if not case_dir.is_dir():
                    continue
                for run in sorted(case_dir.iterdir()):
                    if run.is_dir() and (run / "events.jsonl").is_file():
                        st = _read_run_status(run)
                        runs.append(f"- **{level}/{case_dir.name}/{run.name}** — `{st}`")
            if runs:
                lines.append(f"### {level}")
                lines.extend(runs)
                lines.append("")
    INDEX_FILE.write_text("\n".join(lines) + "\n", encoding="utf-8")
