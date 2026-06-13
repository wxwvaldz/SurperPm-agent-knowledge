#!/usr/bin/env python3
"""Benchmark run logging for local Claude Code CLI runs."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import subprocess
import sys
import textwrap
from datetime import UTC, datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RUNS = ROOT / "benchmark" / "runs"
CASES = ROOT / "benchmark" / "cases"
SKILL_VERSIONS = ROOT / "benchmark" / "skill-versions.json"

# round-NNN / L1|L2|L3 layout (see benchmark_rounds.py)
from benchmark_rounds import (  # noqa: E402
    bump_round,
    ensure_round_layout,
    load_state,
    run_dir_path,
    set_round,
    _refresh_index,
)

REDACT_PATTERNS = [
    (re.compile(r"sk-[A-Za-z0-9_-]{8,}"), "sk-***REDACTED***"),
    (re.compile(r"ark-[A-Za-z0-9_-]{8,}"), "ark-***REDACTED***"),
    (re.compile(r"ghp_[A-Za-z0-9]{20,}"), "ghp_***REDACTED***"),
    (re.compile(r"Bearer\s+\S+", re.I), "Bearer ***REDACTED***"),
]

DEPENDENCY_FILE_RE = re.compile(
    r"^diff --git a/(?:"
    r"package(?:-lock)?\.json|pnpm-lock\.yaml|yarn\.lock|"
    r"pyproject\.toml|requirements[^/]*\.txt|uv\.lock|"
    r"go\.mod|go\.sum|Cargo\.toml|Cargo\.lock"
    r") ",
    re.M,
)


def _now() -> str:
    return datetime.now(UTC).strftime("%Y-%m-%dT%H:%M:%SZ")


def redact(text: str) -> str:
    for pat, repl in REDACT_PATTERNS:
        text = pat.sub(repl, text)
    return text


def resolve_case_file(case_id: str) -> Path:
    direct = CASES / f"{case_id}.md"
    if direct.is_file():
        return direct
    matches = sorted(CASES.glob(f"{case_id}*.md"))
    if not matches:
        raise SystemExit(f"No case file for id: {case_id}")
    return matches[0]


def extract_goal(case_id: str) -> str:
    text = resolve_case_file(case_id).read_text(encoding="utf-8")
    m = re.search(r"## Goal\s*\n+(.+?)(?=\n## |\Z)", text, re.S)
    if not m:
        raise SystemExit(f"No ## Goal section in case {case_id}")
    return m.group(1).strip()


def _yaml_scalar(text: str, key: str) -> str:
    m = re.search(rf"^{key}:\s*(.+)$", text, re.M)
    return m.group(1).strip() if m else ""


def _yaml_list(text: str, key: str) -> list[str]:
    m = re.search(rf"^{key}:\s*\n((?:\s+-\s+.+\n)+)", text, re.M)
    if not m:
        return []
    return [ln.strip().lstrip("- ").strip() for ln in m.group(1).splitlines() if ln.strip()]


def case_meta(case_id: str) -> dict:
    text = resolve_case_file(case_id).read_text(encoding="utf-8")
    meta: dict = {"case_id": case_id}
    for key in (
        "id",
        "level",
        "track",
        "scope",
        "target_repo_type",
        "target_repo",
        "target_repo_path",
        "allowed_backend_change",
        "dependency_policy",
        "review_status",
    ):
        val = _yaml_scalar(text, key)
        if val:
            meta[key] = val
    for key in ("allowed_paths", "forbidden_paths", "required_checks"):
        items = _yaml_list(text, key)
        if items:
            meta[key] = items
    om = re.search(r"^oracle:\s*\|\s*\n((?:[ \t]+.*(?:\n|$))+)", text, re.M)
    if om:
        meta["oracle"] = textwrap.dedent(om.group(1)).strip()  # type: ignore[name-defined]
    return meta


NOOP_EVIDENCE_RE = re.compile(
    r"already (?:exists|exist|implemented|present)|"
    r"function (?:and tests )?already exists|"
    r"no code changes",
    re.I,
)

VERIFY_EVIDENCE_RE = re.compile(
    r"\btests? (?:pass|passing|passed|already (?:exist|exists))\b|"
    r"\bverification\b|"
    r"\bpasses\b|"
    r"\bfully implemented\b",
    re.I,
)


def read_events(run_dir: Path) -> list[dict]:
    path = run_dir / "events.jsonl"
    if not path.is_file():
        return []
    events: list[dict] = []
    for line in path.read_text(encoding="utf-8", errors="replace").splitlines():
        if not line.strip():
            continue
        try:
            events.append(json.loads(line))
        except json.JSONDecodeError:
            continue
    return events


def completed_event(events: list[dict]) -> dict:
    for ev in reversed(events):
        if ev.get("type") == "task:completed":
            return ev
    return {}


def run_stream_text(run_dir: Path) -> str:
    parts: list[str] = []
    for name in ("claude-stream.jsonl", "events.jsonl"):
        p = run_dir / name
        if p.is_file():
            parts.append(p.read_text(encoding="utf-8", errors="replace"))
    return "\n".join(parts)


def has_verified_noop(run_dir: Path) -> bool:
    text = run_stream_text(run_dir)
    return bool(NOOP_EVIDENCE_RE.search(text) and VERIFY_EVIDENCE_RE.search(text))


def goal_hash(goal: str) -> str:
    return hashlib.sha256(goal.encode("utf-8")).hexdigest()[:16]


def load_skill_hash() -> str:
    if SKILL_VERSIONS.is_file():
        try:
            data = json.loads(SKILL_VERSIONS.read_text(encoding="utf-8"))
            h = data.get("core", {}).get("goal", {}).get("hash", "")
            if h:
                return h
        except (json.JSONDecodeError, OSError):
            pass
    goal_path = ROOT / "SuperPmAgent-core/commands/goal.md"
    if goal_path.is_file():
        digest = hashlib.sha256(goal_path.read_bytes()).hexdigest()
        return f"sha256:{digest}"
    return ""


def append_event(run_dir: Path, event: dict) -> None:
    run_dir.mkdir(parents=True, exist_ok=True)
    path = run_dir / "events.jsonl"
    if "ts" not in event:
        event["ts"] = _now()
    line = redact(json.dumps(event, ensure_ascii=False))
    with path.open("a", encoding="utf-8") as f:
        f.write(line + "\n")


def run_git(repo: Path, args: list[str]) -> str:
    r = subprocess.run(
        ["git", "-C", str(repo), *args],
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
    )
    return redact(r.stdout or r.stderr or "")


def current_branch(repo: Path) -> str:
    return run_git(repo, ["branch", "--show-current"]).strip()


def _rev_parse(repo: Path, ref: str) -> str:
    r = subprocess.run(
        ["git", "-C", str(repo), "rev-parse", "--verify", "--quiet", ref],
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
    )
    return r.stdout.strip() if r.returncode == 0 else ""


def default_base_ref(repo: Path) -> str:
    """Resolve the repo's base ref without assuming main/master.

    Many real repos default to develop/preview/release/trunk. Try the remote's
    own default (origin/HEAD) first, then a wider set of common branch names, so
    feature-branch commits are not silently graded as "no changes".
    """
    sym = subprocess.run(
        ["git", "-C", str(repo), "symbolic-ref", "--quiet", "refs/remotes/origin/HEAD"],
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
    )
    if sym.returncode == 0 and sym.stdout.strip():
        ref = sym.stdout.strip().replace("refs/remotes/", "")
        if _rev_parse(repo, ref):
            return ref
    candidates = (
        "origin/main", "origin/master", "origin/develop", "origin/dev",
        "origin/preview", "origin/release", "origin/trunk",
        "main", "master", "develop", "dev", "preview", "release", "trunk",
    )
    for ref in candidates:
        if _rev_parse(repo, ref):
            return ref
    return ""


def git_snapshot(repo: Path, label: str, out_dir: Path) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)
    for name, args in (
        (f"git-status-{label}.txt", ["status", "-sb"]),
        (f"git-diff-{label}.patch", ["diff"]),
        (f"git-diff-staged-{label}.patch", ["diff", "--cached"]),
        (f"git-branch-{label}.txt", ["branch", "--show-current"]),
        (f"git-head-{label}.txt", ["rev-parse", "--short", "HEAD"]),
        (f"git-log-{label}.txt", ["log", "--oneline", "-5"]),
    ):
        (out_dir / name).write_text(run_git(repo, args), encoding="utf-8")
    base = default_base_ref(repo)
    if base:
        (out_dir / f"git-diff-base-{label}.patch").write_text(
            run_git(repo, ["diff", f"{base}...HEAD"]),
            encoding="utf-8",
        )
        (out_dir / f"git-log-base-{label}.txt").write_text(
            run_git(repo, ["log", "--oneline", f"{base}..HEAD"]),
            encoding="utf-8",
        )


def cmd_init(args: argparse.Namespace) -> int:
    case_id = args.case_id
    meta = case_meta(case_id)
    folder = meta.get("id", case_id).replace("/", "-")
    run_id = args.run_id or datetime.now(UTC).strftime("%Y-%m-%dT%H%M%SZ")
    round_num = args.round if args.round is not None else int(load_state().get("current_round", 1))
    ensure_round_layout(round_num)
    run_dir = run_dir_path(case_id, run_id, round_num=round_num, meta=meta)
    run_dir.mkdir(parents=True, exist_ok=True)

    goal = extract_goal(case_id)
    (run_dir / "goal.txt").write_text(goal, encoding="utf-8")
    (run_dir / "prompt.txt").write_text(f"/SuperPmAgent-core:goal {goal}", encoding="utf-8")
    (run_dir / "meta.json").write_text(
        json.dumps({**meta, "run_id": run_id, "round": round_num, "goal_hash": goal_hash(goal)}, indent=2),
        encoding="utf-8",
    )

    provider = "deepseek"
    model = ""
    env_example = ROOT.parent / "conduit-test" / ".env.claude.local"
    if env_example.is_file():
        for line in env_example.read_text(encoding="utf-8").splitlines():
            if line.startswith("ANTHROPIC_MODEL="):
                model = line.split("=", 1)[1].strip()

    append_event(
        run_dir,
        {
            "type": "task:queued",
            "case_id": folder,
            "run_id": run_id,
            "round": round_num,
            "provider": provider,
            "model": model,
            "skill_hash": load_skill_hash(),
            "mode": args.mode,
            "group": "SuperPmAgent-Coding-CLI",
        },
    )
    print(str(run_dir))
    return 0


def cmd_finalize(args: argparse.Namespace) -> int:
    run_dir = Path(args.run_dir)
    repo = Path(args.repo)
    meta_path = run_dir / "meta.json"
    meta = json.loads(meta_path.read_text(encoding="utf-8")) if meta_path.is_file() else {}
    if "round" not in meta:
        m = re.search(r"round-(\d+)", str(run_dir))
        if m:
            meta["round"] = int(m.group(1))
            meta_path.write_text(json.dumps(meta, indent=2), encoding="utf-8")

    git_snapshot(repo, "after", run_dir / "git")

    git_dir = run_dir / "git"
    status_file = git_dir / "git-status-after.txt"
    diff_file = git_dir / "git-diff-after.patch"
    staged_diff_file = git_dir / "git-diff-staged-after.patch"
    base_diff_file = git_dir / "git-diff-base-after.patch"
    base_log_file = git_dir / "git-log-base-after.txt"
    head_before_file = git_dir / "git-head-before.txt"
    head_after_file = git_dir / "git-head-after.txt"

    def _read(path: Path) -> str:
        return path.read_text(encoding="utf-8").strip() if path.is_file() else ""

    worktree_changed = diff_file.is_file() and diff_file.read_text(encoding="utf-8").strip() != ""
    staged_changed = staged_diff_file.is_file() and staged_diff_file.read_text(encoding="utf-8").strip() != ""
    branch_changed = base_diff_file.is_file() and base_diff_file.read_text(encoding="utf-8").strip() != ""

    # HEAD movement is a branch/default-name-independent signal: a commit on any
    # feature branch (even when the repo default is develop/preview/release and
    # base-ref resolution would otherwise fail) moves HEAD.
    head_before = _read(head_before_file)
    head_after = _read(head_after_file)
    head_moved = bool(head_before) and bool(head_after) and head_before != head_after

    # When standard base resolution missed the commits, anchor the base diff to
    # the pre-run HEAD so downstream scope/dependency checks still see the diff.
    if head_moved and not branch_changed and head_before:
        fallback_diff = run_git(repo, ["diff", f"{head_before}...HEAD"])
        if fallback_diff.strip():
            base_diff_file.write_text(fallback_diff, encoding="utf-8")
            base_log_file.write_text(
                run_git(repo, ["log", "--oneline", f"{head_before}..HEAD"]),
                encoding="utf-8",
            )
            branch_changed = True

    has_changes = worktree_changed or staged_changed or branch_changed or head_moved

    backend_hit = False
    diff_text = ""
    for candidate in (diff_file, staged_diff_file, base_diff_file):
        if candidate.is_file():
            diff_text += "\n" + candidate.read_text(encoding="utf-8")
    backend_hit = bool(re.search(r"^diff --git a/backend/", diff_text, re.M))
    dependency_changed = bool(DEPENDENCY_FILE_RE.search(diff_text))

    scope = meta.get("scope", "")
    violation = scope == "frontend-only" and backend_hit

    append_event(
        run_dir,
        {
            "type": "task:completed",
            "case_id": meta.get("case_id", meta.get("id", "")),
            "run_id": meta.get("run_id", run_dir.name),
            "status": "needs_review",
            "has_git_changes": has_changes,
            "worktree_changed": worktree_changed,
            "staged_changed": staged_changed,
            "branch_changed": branch_changed,
            "head_moved": head_moved,
            "head_before": head_before,
            "head_after": head_after,
            "branch": current_branch(repo),
            "base_ref": default_base_ref(repo),
            "commits_since_base": base_log_file.read_text(encoding="utf-8").strip() if base_log_file.is_file() else "",
            "dependency_changed": dependency_changed,
            "backend_scope_violation": violation,
            "distill_candidate": False,
            "notes": "Finalize after interactive or auto CLI run; review events.jsonl and artifacts/",
        },
    )
    print(f"Finalized: {run_dir}")
    if os.environ.get("SuperPmAgent_SKIP_REFRESH_INDEX") != "1":
        _refresh_index()
    return 0


def cmd_effective_exit(args: argparse.Namespace) -> int:
    """Return 0 when a run produced durable, reviewable evidence.

    Claude CLI may return non-zero after a successful local implementation when a
    downstream action such as push/PR creation is unavailable. For benchmark
    matrix control flow, durable code changes or a verified no-op should count as
    a completed case; review-benchmark-round.py still grades policy violations.
    """
    run_dir = Path(args.run_dir)
    claude_exit = int(args.claude_exit)
    events = read_events(run_dir)
    completed = completed_event(events)

    if claude_exit == 124:
        return 124

    failed_cli = any(
        ev.get("type") == "task:failed" and ev.get("phase") == "claude-cli"
        for ev in events
    )
    has_changes = bool(completed.get("has_git_changes"))
    policy_violation = bool(completed.get("dependency_changed")) or bool(
        completed.get("backend_scope_violation")
    )

    if has_changes and not policy_violation:
        return 0
    if not has_changes and has_verified_noop(run_dir):
        return 0
    if claude_exit == 0 and not failed_cli:
        return 0
    return claude_exit if claude_exit != 0 else 1


def cmd_snapshot(args: argparse.Namespace) -> int:
    run_dir = Path(args.run_dir)
    repo = Path(args.repo)
    git_snapshot(repo, args.label, run_dir / "git")
    append_event(
        run_dir,
        {
            "type": "task:running",
            "phase": "git",
            "summary": f"snapshot {args.label}",
        },
    )
    return 0


def cmd_event(args: argparse.Namespace) -> int:
    append_event(
        Path(args.run_dir),
        {
            "type": args.event_type,
            "phase": args.phase,
            "summary": args.summary,
        },
    )
    return 0


def main() -> int:
    if sys.platform == "win32":
        for stream in (sys.stdout, sys.stderr):
            if hasattr(stream, "reconfigure"):
                stream.reconfigure(encoding="utf-8", errors="replace")

    p = argparse.ArgumentParser()
    sub = p.add_subparsers(dest="cmd", required=True)

    i = sub.add_parser("init", help="Create run directory and task:queued")
    i.add_argument("case_id", help="e.g. L1-01 or L1-01-reading-count")
    i.add_argument("--run-id", default="")
    i.add_argument("--mode", default="interactive", choices=("interactive", "auto"))
    i.add_argument("--round", type=int, default=None, help="round number (default: current from .round-state.json)")
    i.set_defaults(func=cmd_init)

    r = sub.add_parser("round", help="Round management")
    rsub = r.add_subparsers(dest="round_cmd", required=True)
    rs = rsub.add_parser("show", help="Print current round")
    rs.set_defaults(func=lambda args: print(load_state().get("current_round", 1)) or 0)
    rn = rsub.add_parser("new", help="Start next round (increment counter)")
    rn.add_argument("--note", default="")
    rn.set_defaults(func=lambda args: print(bump_round(args.note)) or 0)
    rset = rsub.add_parser("set", help="Set current round number")
    rset.add_argument("number", type=int)
    rset.set_defaults(func=lambda args: set_round(args.number) or 0)

    f = sub.add_parser("finalize", help="Capture git after state and task:completed")
    f.add_argument("run_dir")
    f.add_argument("--repo", default=str(ROOT.parent / "conduit-test"))
    f.set_defaults(func=cmd_finalize)

    x = sub.add_parser("effective-exit", help="Map raw Claude exit to benchmark case exit")
    x.add_argument("run_dir")
    x.add_argument("--claude-exit", type=int, required=True)
    x.set_defaults(func=cmd_effective_exit)

    a = sub.add_parser("append", help="Append one JSON event")
    a.add_argument("run_dir")
    a.add_argument("json", help='JSON object, e.g. {"type":"task:message",...}')
    a.set_defaults(
        func=lambda args: append_event(Path(args.run_dir), json.loads(args.json)) or 0
    )

    g = sub.add_parser("extract-goal", help="Print goal text for case")
    g.add_argument("case_id")
    g.set_defaults(func=lambda args: print(extract_goal(args.case_id)) or 0)

    s = sub.add_parser("snapshot", help="Write git status/diff snapshot")
    s.add_argument("run_dir")
    s.add_argument("label", choices=("before", "after"))
    s.add_argument("--repo", default=str(ROOT.parent / "conduit-test"))
    s.set_defaults(func=cmd_snapshot)

    e = sub.add_parser("event", help="Append a simple event (no JSON escaping in shell)")
    e.add_argument("run_dir")
    e.add_argument("event_type", help="e.g. task:running, task:message")
    e.add_argument("phase")
    e.add_argument("summary")
    e.set_defaults(func=cmd_event)

    args = p.parse_args()
    return int(args.func(args))


if __name__ == "__main__":
    raise SystemExit(main())
