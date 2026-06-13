#!/usr/bin/env python3
"""Auto-review benchmark runs for a round: grade, ROUND.md, metrics, optimization candidates."""

from __future__ import annotations

import argparse
import json
import re
import sys
from datetime import UTC, datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RUNS = ROOT / "benchmark" / "runs"
CASES = ROOT / "benchmark" / "cases"
METRICS = ROOT / "benchmark" / "metrics.md"

sys.path.insert(0, str(ROOT / "scripts"))
from benchmark_run_log import case_meta, has_verified_noop, redact  # noqa: E402
from benchmark_rounds import _refresh_index, load_state  # noqa: E402

DEPENDENCY_FILE_RE = re.compile(
    r"^diff --git a/(?:"
    r"package(?:-lock)?\.json|pnpm-lock\.yaml|yarn\.lock|"
    r"pyproject\.toml|requirements[^/]*\.txt|uv\.lock|"
    r"go\.mod|go\.sum|Cargo\.toml|Cargo\.lock"
    r") ",
    re.M,
)

GATE_MARKERS = re.compile(
    r"矛盾|contradiction\s*gate|无法调和|cannot both be satisfied",
    re.I,
)


def _now() -> str:
    return datetime.now(UTC).strftime("%Y-%m-%d %H:%M UTC")


def _read_events(run_dir: Path) -> list[dict]:
    path = run_dir / "events.jsonl"
    if not path.is_file():
        return []
    out: list[dict] = []
    for line in path.read_text(encoding="utf-8", errors="replace").splitlines():
        if not line.strip():
            continue
        try:
            out.append(json.loads(line))
        except json.JSONDecodeError:
            continue
    return out


def _completed_event(events: list[dict]) -> dict | None:
    for ev in reversed(events):
        if ev.get("type") == "task:completed":
            return ev
    return None


def _stream_text(run_dir: Path) -> str:
    parts: list[str] = []
    for name in ("claude-stream.jsonl", "events.jsonl"):
        p = run_dir / name
        if p.is_file():
            parts.append(p.read_text(encoding="utf-8", errors="replace"))
    return "\n".join(parts)


def _diff_text(run_dir: Path) -> str:
    git_dir = run_dir / "git"
    chunks: list[str] = []
    for pattern in ("git-diff-base-after.patch", "git-diff-after.patch", "git-diff-staged-after.patch"):
        p = git_dir / pattern
        if p.is_file():
            chunks.append(p.read_text(encoding="utf-8", errors="replace"))
    return "\n".join(chunks)


def _head_moved(run_dir: Path) -> bool:
    """True if HEAD moved during the run (a commit on any branch).

    Robust to repos whose default branch is not main/master: when base-ref
    resolution failed at finalize time, the committed work is still detectable
    by comparing the pre/post HEAD snapshots.
    """
    git_dir = run_dir / "git"
    before = git_dir / "git-head-before.txt"
    after = git_dir / "git-head-after.txt"
    if not before.is_file() or not after.is_file():
        return False
    b = before.read_text(encoding="utf-8", errors="replace").strip()
    a = after.read_text(encoding="utf-8", errors="replace").strip()
    return bool(b) and bool(a) and b != a


def _forbidden_hit(diff: str, forbidden: list[str]) -> list[str]:
    hits: list[str] = []
    for fp in forbidden:
        fp = fp.strip()
        if not fp:
            continue
        core = fp.rstrip("/").replace("**", "")
        if core.endswith("/"):
            if re.search(rf"^diff --git a/{re.escape(core)}", diff, re.M):
                hits.append(fp)
        elif re.search(rf"^diff --git a/{re.escape(core)}(?:\s|$)", diff, re.M):
            hits.append(fp)
        elif f"diff --git a/{core}" in diff:
            hits.append(fp)
    return hits


def grade_run(run_dir: Path) -> dict:
    meta_path = run_dir / "meta.json"
    meta = json.loads(meta_path.read_text(encoding="utf-8")) if meta_path.is_file() else {}
    case_id = meta.get("id") or meta.get("case_id") or run_dir.parent.name
    try:
        case = case_meta(case_id if "-" in str(case_id) else run_dir.parent.name)
    except SystemExit:
        case = {"case_id": case_id}

    cid = case.get("id", case_id)
    events = _read_events(run_dir)
    completed = _completed_event(events) or {}
    diff = _diff_text(run_dir)
    stream = _stream_text(run_dir)

    failed_cli = any(
        ev.get("type") == "task:failed" and ev.get("phase") == "claude-cli" for ev in events
    )
    has_changes = bool(completed.get("has_git_changes")) or _head_moved(run_dir)
    dependency_changed = bool(completed.get("dependency_changed")) or bool(
        DEPENDENCY_FILE_RE.search(diff)
    )
    backend_violation = bool(completed.get("backend_scope_violation"))
    if not backend_violation and case.get("scope") == "frontend-only":
        backend_violation = bool(re.search(r"^diff --git a/backend/", diff, re.M))

    forbidden = case.get("forbidden_paths") or []
    forbidden_hits = _forbidden_hit(diff, forbidden) if forbidden else []

    is_l3 = str(cid).startswith("L3-")
    gate_ok = is_l3 and not has_changes and bool(GATE_MARKERS.search(stream))
    is_web = str(cid).startswith("WEB-")
    web_pass = is_web and completed.get("contract_pass") is True

    infra = False
    if failed_cli and not has_changes:
        infra = True
    if "socket connection was closed" in stream.lower() or "api error" in stream.lower():
        if not has_changes or failed_cli:
            infra = True

    status = "needs_review"
    reasons: list[str] = []

    if is_web:
        status = "pass" if web_pass else "fail"
        reasons.append("web contract probe")
    elif infra:
        status = "infra_error"
        reasons.append("cli or api failure without durable changes")
    elif is_l3:
        if gate_ok:
            status = "pass"
            reasons.append("contradiction gate; no implementation")
        elif has_changes:
            status = "fail"
            reasons.append("L3 should not produce code changes")
        else:
            status = "needs_review"
            reasons.append("L3 without clear gate markers")
    elif forbidden_hits:
        status = "fail"
        reasons.append(f"forbidden paths touched: {', '.join(forbidden_hits[:3])}")
    elif dependency_changed and case.get("dependency_policy", "").startswith("no-"):
        status = "fail"
        reasons.append("dependency or lockfile changed")
    elif backend_violation:
        status = "fail"
        reasons.append("backend scope violation")
    elif has_changes:
        status = "pass"
        reasons.append("git changes present; oracle not fully verified automatically")
    elif has_verified_noop(run_dir):
        status = "pass"
        reasons.append("verified no-op; requested behavior already exists")
    else:
        status = "needs_review"
        reasons.append("no git changes detected")

    failure_phase = ""
    for ev in events:
        if ev.get("type") == "task:failed":
            failure_phase = str(ev.get("phase", ""))
            break

    return {
        "case_id": cid,
        "run_id": run_dir.name,
        "run_dir": str(run_dir.relative_to(ROOT)).replace("\\", "/"),
        "status": status,
        "reasons": reasons,
        "has_git_changes": has_changes,
        "dependency_changed": dependency_changed,
        "backend_scope_violation": backend_violation,
        "failure_phase": failure_phase,
        "branch": completed.get("branch", ""),
        "commits_since_base": (completed.get("commits_since_base") or "").strip(),
    }


def _find_runs(round_dir: Path) -> list[Path]:
    runs: list[Path] = []
    for level_dir in sorted(round_dir.iterdir()):
        if not level_dir.is_dir():
            continue
        for case_dir in sorted(level_dir.iterdir()):
            if not case_dir.is_dir():
                continue
            for run_dir in sorted(case_dir.iterdir()):
                if run_dir.is_dir() and (run_dir / "events.jsonl").is_file():
                    runs.append(run_dir)
    return runs


def _suggest_optimization(summary: dict) -> list[str]:
    lines: list[str] = []
    by_status: dict[str, list[dict]] = {}
    for r in summary["runs"]:
        by_status.setdefault(r["status"], []).append(r)

    if by_status.get("infra_error"):
        lines.append(
            "- **infra_error**: Check API stability, network, and `PerCaseTimeoutMinutes`; "
            "retry failed cases; do not change skills for one-off disconnects."
        )
    if any(r.get("dependency_changed") for r in summary["runs"]):
        lines.append(
            "- **dependency contamination**: Review `run-tests`, `coding`, `goal` dependency guardrails."
        )
    if any(r.get("backend_scope_violation") for r in summary["runs"]):
        lines.append(
            "- **backend scope violation**: Review frontend-only cases and `repo-explorer` locate scope."
        )
    fails = by_status.get("fail", [])
    for r in fails:
        if r["case_id"].startswith("L3-"):
            lines.append(
                f"- **{r['case_id']}**: Strengthen contradiction gate in `goal.md`; "
                f"run `{r['run_dir']}` shows implementation when gate expected."
            )
    needs = [r for r in summary["runs"] if r["status"] == "needs_review"]
    if needs:
        lines.append(
            f"- **needs_review ({len(needs)})**: Manual check run artifacts under `benchmark/runs/`."
        )
    if not lines:
        lines.append("- No automatic optimization candidates; round looks stable.")
    return lines


def write_round_md(round_dir: Path, summary: dict) -> None:
    lines = [
        f"# Round {summary['round']:03d}",
        "",
        f"Reviewed: {_now()}",
        "",
        "## Summary",
        "",
        f"| Status | Count |",
        f"|---|---:|",
    ]
    counts: dict[str, int] = {}
    for r in summary["runs"]:
        counts[r["status"]] = counts.get(r["status"], 0) + 1
    for st in ("pass", "fail", "needs_review", "infra_error"):
        if st in counts:
            lines.append(f"| {st} | {counts[st]} |")

    lines.extend(["", "## Cases", "", "| Track | Case | Run | Status | Notes |", "|---|---|---|---|---|"])
    for r in summary["runs"]:
        parts = r["run_dir"].split("/")
        level = parts[-3] if len(parts) >= 3 else ""
        note = "; ".join(r["reasons"][:2])
        lines.append(f"| {level} | {r['case_id']} | {r['run_id']} | {r['status']} | {note} |")

    (round_dir / "ROUND.md").write_text("\n".join(lines) + "\n", encoding="utf-8")


def write_candidates(round_dir: Path, summary: dict) -> None:
    suggestions = _suggest_optimization(summary)
    body = [
        "# Optimization Candidates (auto-generated)",
        "",
        "Do not apply automatically. Use as input for manual or Agent Phase D.",
        "",
        *suggestions,
        "",
        "## Evidence runs",
        "",
    ]
    for r in summary["runs"]:
        if r["status"] in ("fail", "infra_error", "needs_review"):
            body.append(f"- `{r['run_dir']}` — **{r['status']}**: {'; '.join(r['reasons'])}")
    (round_dir / "OPTIMIZATION_CANDIDATES.md").write_text("\n".join(body) + "\n", encoding="utf-8")


def append_metrics_note(summary: dict) -> None:
    if not METRICS.is_file():
        return
    text = METRICS.read_text(encoding="utf-8")
    block = (
        f"\n### Round-{summary['round']:03d} auto-review ({_now()})\n\n"
        f"| pass | fail | needs_review | infra_error |\n"
        f"|---:|---:|---:|---:|\n"
    )
    counts = {s: 0 for s in ("pass", "fail", "needs_review", "infra_error")}
    for r in summary["runs"]:
        counts[r["status"]] = counts.get(r["status"], 0) + 1
    block += (
        f"| {counts.get('pass', 0)} | {counts.get('fail', 0)} | "
        f"{counts.get('needs_review', 0)} | {counts.get('infra_error', 0)} |\n"
    )
    marker = f"### Round-{summary['round']:03d} auto-review"
    if marker in text:
        text = re.sub(
            rf"### Round-{summary['round']:03d} auto-review.*?(?=\n### |\n## |\Z)",
            block.strip() + "\n",
            text,
            flags=re.S,
        )
    else:
        text = text.rstrip() + "\n" + block
    METRICS.write_text(text, encoding="utf-8")


def review_round(round_num: int | None = None) -> dict:
    rn = round_num if round_num is not None else int(load_state().get("current_round", 1))
    round_dir = RUNS / f"round-{rn:03d}"
    if not round_dir.is_dir():
        raise FileNotFoundError(f"Missing {round_dir}")

    runs = _find_runs(round_dir)
    graded = [grade_run(rd) for rd in runs]
    summary = {
        "round": rn,
        "reviewed_at": _now(),
        "runs": graded,
    }
    summary_path = round_dir / "review-summary.json"
    summary_path.write_text(
        redact(json.dumps(summary, ensure_ascii=False, indent=2)) + "\n",
        encoding="utf-8",
    )
    write_round_md(round_dir, summary)
    write_candidates(round_dir, summary)
    append_metrics_note(summary)
    _refresh_index()
    return summary


def main() -> int:
    if sys.platform == "win32":
        for stream in (sys.stdout, sys.stderr):
            if hasattr(stream, "reconfigure"):
                stream.reconfigure(encoding="utf-8", errors="replace")

    p = argparse.ArgumentParser(description="Auto-review a benchmark round")
    p.add_argument("--round", type=int, default=None, help="round number (default: current)")
    args = p.parse_args()
    try:
        summary = review_round(args.round)
    except FileNotFoundError as e:
        print(str(e), file=sys.stderr)
        return 1

    counts: dict[str, int] = {}
    for r in summary["runs"]:
        counts[r["status"]] = counts.get(r["status"], 0) + 1
    print(f"Reviewed round-{summary['round']:03d}: {len(summary['runs'])} runs")
    for st, n in sorted(counts.items()):
        print(f"  {st}: {n}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
