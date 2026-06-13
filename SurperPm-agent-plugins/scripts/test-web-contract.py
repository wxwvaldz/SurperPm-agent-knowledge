#!/usr/bin/env python3
"""Web plugin contract probes (Track C). No Web UI or model required."""

from __future__ import annotations

import argparse
import json
import re
import sys
from datetime import UTC, datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WORKSPACE = ROOT.parent
KNOWLEDGE = WORKSPACE / "SuperPmAgent-knowledge"
RUNS = ROOT / "benchmark" / "runs"
GOAL = ROOT / "SuperPmAgent-core" / "commands" / "goal.md"
WEB_CONFIG = WORKSPACE / "SuperPmAgent-web" / "backend" / "app" / "config.py"

READY_FIXTURE = """# IntentSpec

ready_for_goal: yes

## Scope

- Add a small frontend-only visible label for an existing list item.

## Acceptance Criteria

- The label is visible in the target list.
- Existing behavior is preserved.

## Open Questions

- None

## blockers

- None
"""

NOT_READY_FIXTURE = """# IntentSpec

ready_for_goal: no

## Scope

- TBD

## Acceptance Criteria

- pending confirmation

## Open Questions

- Which repository and UI surface should change?

## blockers

- Missing PM decision.
"""

PLACEHOLDER_RE = re.compile(
    r"待确认|待明确|pending confirmation|TBD|unknown|unclear",
    re.I,
)


def _now() -> str:
    return datetime.now(UTC).strftime("%Y-%m-%dT%H:%M:%SZ")


def parse_gate(notes_text: str) -> tuple[bool, list[str]]:
    """Mirror goal.md IntentSpec gate (simplified line-based)."""
    blockers: list[str] = []
    ready = re.search(r"ready_for_goal:\s*(\S+)", notes_text, re.I)
    if not ready or ready.group(1).strip().lower() != "yes":
        blockers.append("ready_for_goal is not yes")

    oq = re.search(r"##\s*Open Questions\s*\n+(.+?)(?=\n## |\Z)", notes_text, re.S | re.I)
    if oq:
        body = oq.group(1).strip()
        if body.lower() != "- none" and "none" not in body.lower()[:20]:
            blockers.append("Open Questions not - None")
    else:
        blockers.append("missing Open Questions section")

    bl = re.search(r"##\s*blockers\s*\n+(.+?)(?=\n## |\Z)", notes_text, re.S | re.I)
    if bl:
        body = bl.group(1).strip()
        if body.lower() != "- none" and "none" not in body.lower()[:20]:
            blockers.append("blockers not - None")
    else:
        blockers.append("missing blockers section")

    scope = re.search(r"##\s*Scope\s*\n+(.+?)(?=\n## |\Z)", notes_text, re.S | re.I)
    if not scope or not scope.group(1).strip():
        blockers.append("Scope empty")
    elif PLACEHOLDER_RE.search(scope.group(1)):
        blockers.append("Scope contains placeholder")

    ac = re.search(r"##\s*Acceptance Criteria\s*\n+(.+?)(?=\n## |\Z)", notes_text, re.S | re.I)
    if not ac or not ac.group(1).strip():
        blockers.append("Acceptance Criteria empty")
    elif PLACEHOLDER_RE.search(ac.group(1)):
        blockers.append("Acceptance Criteria contains placeholder")

    return len(blockers) == 0, blockers


def check_web01() -> tuple[bool, str]:
    plugins = ("SuperPmAgent-core", "SuperPmAgent-io", "SuperPmAgent-coding", "SuperPmAgent-business")
    for name in plugins:
        pj = ROOT / name / ".claude-plugin" / "plugin.json"
        if not pj.is_file():
            return False, f"missing {pj}"
        json.loads(pj.read_text(encoding="utf-8"))
    if not GOAL.is_file():
        return False, "missing goal.md"
    cfg_text = WEB_CONFIG.read_text(encoding="utf-8") if WEB_CONFIG.is_file() else ""
    cfg_ok = "plugin_repo_path" in cfg_text
    if not cfg_ok:
        return False, "SuperPmAgent-web config missing plugin_repo_path"
    return True, "four plugins + goal + web config"


def check_web02() -> tuple[bool, str]:
    notes = KNOWLEDGE / "sessions" / "_web-contract-ready" / "notes.md"
    notes_text = notes.read_text(encoding="utf-8") if notes.is_file() else READY_FIXTURE
    ok, blockers = parse_gate(notes_text)
    if not ok:
        return False, f"ready fixture failed gate: {blockers}"
    return True, "ready session passes gate"


def check_web03() -> tuple[bool, str]:
    notes = KNOWLEDGE / "sessions" / "_web-contract-not-ready" / "notes.md"
    notes_text = notes.read_text(encoding="utf-8") if notes.is_file() else NOT_READY_FIXTURE
    ok, _ = parse_gate(notes_text)
    if ok:
        return False, "not-ready fixture incorrectly passed gate"
    goal = GOAL.read_text(encoding="utf-8")
    if "must not" not in goal.lower() or "edit code" not in goal.lower():
        return False, "goal.md missing edit-code stop on gate fail"
    return True, "not-ready session blocked"


def check_web04() -> tuple[bool, str]:
    goal = GOAL.read_text(encoding="utf-8")
    required = [
        "Relevant learnings",
        "advisory",
        "notes.md",
    ]
    missing = [p for p in required if p.lower() not in goal.lower()]
    if missing:
        return False, f"goal.md missing learnings contract phrases: {missing}"
    if re.search(r"learnings.*override.*notes", goal, re.I):
        return True, "learnings priority documented"
    if "must not" in goal.lower() and "learnings" in goal.lower():
        return True, "learnings constrained vs IntentSpec"
    return False, "goal.md missing explicit learnings vs IntentSpec priority"


CHECKS = {
    "WEB-01": check_web01,
    "WEB-02": check_web02,
    "WEB-03": check_web03,
    "WEB-04": check_web04,
}


def record_run(case_id: str, passed: bool, detail: str) -> Path:
    from benchmark_rounds import bump_round, ensure_round_layout, load_state, run_dir_path  # noqa: WPS433

    rn = int(load_state().get("current_round", 1))
    ensure_round_layout(rn)
    run_id = datetime.now(UTC).strftime("%Y-%m-%dT%H%M%SZ")
    meta = {"id": case_id, "level": "WEB", "track": "C"}
    run_dir = run_dir_path(case_id, run_id, round_num=rn, meta=meta)
    run_dir.mkdir(parents=True, exist_ok=True)
    (run_dir / "meta.json").write_text(
        json.dumps({**meta, "run_id": run_id, "round": rn, "contract_probe": True}, indent=2),
        encoding="utf-8",
    )
    events = run_dir / "events.jsonl"
    lines = [
        {"type": "task:queued", "case_id": case_id, "run_id": run_id, "group": "Web-Contract"},
        {"type": "task:running", "phase": "contract", "summary": detail},
        {
            "type": "task:completed",
            "case_id": case_id,
            "status": "pass" if passed else "fail",
            "has_git_changes": False,
            "contract_pass": passed,
            "notes": detail,
        },
    ]
    with events.open("w", encoding="utf-8") as f:
        for ev in lines:
            ev["ts"] = _now()
            f.write(json.dumps(ev, ensure_ascii=False) + "\n")
    return run_dir


def main() -> int:
    if sys.platform == "win32":
        for stream in (sys.stdout, sys.stderr):
            if hasattr(stream, "reconfigure"):
                stream.reconfigure(encoding="utf-8", errors="replace")

    p = argparse.ArgumentParser()
    p.add_argument("--case", default="", help="WEB-01 .. WEB-04 or empty for all")
    p.add_argument("--record", action="store_true", help="Write events under benchmark/runs/")
    args = p.parse_args()

    sys.path.insert(0, str(ROOT / "scripts"))
    targets = [args.case.upper()] if args.case else list(CHECKS.keys())
    failed = 0
    for cid in targets:
        if cid not in CHECKS:
            print(f"[FAIL] unknown case {cid}")
            failed += 1
            continue
        ok, detail = CHECKS[cid]()
        mark = "PASS" if ok else "FAIL"
        print(f"[{mark}] {cid} — {detail}")
        if args.record:
            rd = record_run(cid, ok, detail)
            print(f"  recorded: {rd}")
        if not ok:
            failed += 1

    if failed:
        print(f"\nWEB CONTRACT: {failed} failed")
        return 1
    print("\nWEB CONTRACT PASS")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
