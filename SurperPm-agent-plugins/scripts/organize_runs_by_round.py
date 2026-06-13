#!/usr/bin/env python3
"""One-time (or repeat) migration: flat runs -> round-NNN/L1|L2|L3/<case>/<run-id>."""

from __future__ import annotations

import json
import re
import shutil
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPT_DIR))

from benchmark_rounds import (  # noqa: E402
    RUNS,
    _refresh_index,
    ensure_round_layout,
    level_from_case,
    save_state,
)

# (round_number, case_id, run_id) — historical grouping from session timeline
LEGACY_ASSIGNMENTS: list[tuple[int, str, str]] = [
    # round 000: probes / record pipeline only
    (0, "L1-01", "smoke-record-20260613-235549"),
    (0, "L1-01", "smoke-record-20260613-235616"),
    (0, "L1-01", "smoke-record-20260613-235825"),
    (0, "L1-01", "smoke-record-20260613-000144"),
    (0, "L1-01", "2026-06-13Z"),
    # round 001: first full L1 attempts (hooks / permissions blockers)
    (1, "L1-01", "2026-06-13Z"),
    (1, "L1-01", "2026-06-13Z"),
    # round 002: after hook + bypassPermissions fixes
    (2, "L1-01", "2026-06-13Z"),
    (2, "L2-01", "2026-06-13Z"),
]

ROUND_NOTES = {
    0: "Probe / record-pipeline smokes (_probe JSONL, smoke-record, early CLI).",
    1: "First full L1 auto runs; blocked by hooks path and permission prompts.",
    2: "Hooks fixed + bypassPermissions; L1 pass (commit 91ebdcd), L2 coverImage run.",
}


def _dest(round_num: int, case_id: str, run_id: str, level: str) -> Path:
    return RUNS / f"round-{round_num:03d}" / level / case_id / run_id


def _move_run(src: Path, dst: Path, dry_run: bool) -> bool:
    if not src.is_dir():
        print(f"SKIP missing: {src}")
        return False
    if dst.exists():
        print(f"SKIP exists: {dst}")
        return True
    print(f"MOVE {src.relative_to(RUNS)} -> {dst.relative_to(RUNS)}")
    if not dry_run:
        dst.parent.mkdir(parents=True, exist_ok=True)
        shutil.move(str(src), str(dst))
    return True


def _write_round_summaries(dry_run: bool) -> None:
    for rn, note in ROUND_NOTES.items():
        rd = ensure_round_layout(rn)
        if dry_run:
            continue
        rows: list[str] = []
        for level in ("L1", "L2", "L3"):
            ld = rd / level
            if not ld.is_dir():
                continue
            for case_dir in sorted(ld.iterdir()):
                if not case_dir.is_dir() or case_dir.name.startswith("_"):
                    continue
                for run in sorted(case_dir.iterdir()):
                    if not run.is_dir():
                        continue
                    meta = {}
                    mp = run / "meta.json"
                    if mp.is_file():
                        try:
                            meta = json.loads(mp.read_text(encoding="utf-8"))
                        except json.JSONDecodeError:
                            pass
                    status = "see events.jsonl"
                    ev = run / "events.jsonl"
                    if ev.is_file():
                        for line in ev.read_text(encoding="utf-8").splitlines():
                            if '"task:completed"' in line:
                                status = "completed"
                    rows.append(
                        f"| {level} | {case_dir.name} | `{run.name}` | {status} | {meta.get('scope', '')} |"
                    )
        content = (
            f"# Round {rn:03d}\n\n"
            f"{note}\n\n"
            f"## Cases\n\n"
            f"| Level | Case | Run | Status | Scope |\n"
            f"|---|---|---|---|---|\n"
            + "\n".join(rows)
            + "\n"
        )
        (rd / "ROUND.md").write_text(content, encoding="utf-8")


def migrate_probe_files(dry_run: bool) -> None:
    probe = RUNS / "_probe"
    if not probe.is_dir():
        return
    dest_dir = RUNS / "round-000" / "L1" / "_probe"
    for f in probe.iterdir():
        if f.is_file():
            dst = dest_dir / f.name
            print(f"PROBE {f.name} -> {dst.relative_to(RUNS)}")
            if not dry_run:
                dest_dir.mkdir(parents=True, exist_ok=True)
                shutil.move(str(f), str(dst))
    if not dry_run and probe.is_dir() and not any(probe.iterdir()):
        try:
            probe.rmdir()
        except OSError:
            pass


def cleanup_legacy(dry_run: bool) -> None:
    for name in ("L1-01", "L2-01", "_probe"):
        p = RUNS / name
        if not p.is_dir():
            continue
        if any(p.iterdir()):
            # move stragglers to round-002/L?/...
            for run in list(p.iterdir()):
                if not run.is_dir():
                    continue
                case_id = name if name.startswith("L") else "L1-01"
                level = level_from_case(case_id)
                dst = _dest(2, case_id, run.name, level)
                _move_run(run, dst, dry_run)
        if not dry_run and p.is_dir() and not any(p.iterdir()):
            try:
                p.rmdir()
            except OSError:
                pass
    stray = RUNS / "L1-01" / "2026-06-13-233005"
    if stray.is_dir() and not any(stray.iterdir()) and not dry_run:
        stray.rmdir()


def main() -> int:
    dry_run = "--dry-run" in sys.argv
    for rn in (0, 1, 2):
        ensure_round_layout(rn)

    for round_num, case_id, run_id in LEGACY_ASSIGNMENTS:
        src = RUNS / case_id / run_id
        level = level_from_case(case_id)
        dst = _dest(round_num, case_id, run_id, level)
        _move_run(src, dst, dry_run)

    migrate_probe_files(dry_run)
    cleanup_legacy(dry_run)

    if not dry_run:
        save_state({"current_round": 3, "history": [{"note": "post-migration; next runs -> round-003"}]})
        _write_round_summaries(False)
        _refresh_index()

    print("Migration done." if not dry_run else "Dry run complete.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
