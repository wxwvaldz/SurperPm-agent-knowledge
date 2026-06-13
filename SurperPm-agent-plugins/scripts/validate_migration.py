#!/usr/bin/env python3
"""Structural smoke test for SuperPmAgent-plugins migration (no model required)."""

from __future__ import annotations

import hashlib
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WEB_BACKEND = ROOT.parent / "SuperPmAgent-web" / "backend"
KNOWLEDGE = ROOT.parent / "SuperPmAgent-knowledge"


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    h.update(path.read_bytes())
    return f"sha256:{h.hexdigest()}"


def check(name: str, ok: bool, detail: str = "") -> bool:
    mark = "PASS" if ok else "FAIL"
    msg = f"[{mark}] {name}"
    if detail:
        msg += f" | {detail}"
    print(msg)
    return ok


def main() -> int:
    if sys.platform == "win32":
        try:
            sys.stdout.reconfigure(encoding="utf-8")
            sys.stderr.reconfigure(encoding="utf-8")
        except Exception:
            pass

    ok = True

    for plugin in ("SuperPmAgent-core", "SuperPmAgent-io", "SuperPmAgent-coding", "SuperPmAgent-business"):
        pj = ROOT / plugin / ".claude-plugin" / "plugin.json"
        ok &= check(f"plugin manifest {plugin}", pj.is_file(), str(pj))

    required_skills = [
        "SuperPmAgent-core/commands/goal.md",
        "SuperPmAgent-core/skills/find/SKILL.md",
        "SuperPmAgent-core/skills/distill/SKILL.md",
        "SuperPmAgent-io/skills/INDEX.md",
        "SuperPmAgent-io/skills/normalize-url/SKILL.md",
        "SuperPmAgent-io/skills/analyze-reference-material/SKILL.md",
        "SuperPmAgent-io/skills/export-feishu-prd/SKILL.md",
        "SuperPmAgent-io/contracts/IO-PROTOCOL.md",
        "SuperPmAgent-coding/skills/repo-explorer/SKILL.md",
        "SuperPmAgent-coding/skills/coding/SKILL.md",
        "SuperPmAgent-coding/skills/run-tests/SKILL.md",
        "SuperPmAgent-coding/skills/debugger/SKILL.md",
        "SuperPmAgent-coding/skills/acceptance-review/SKILL.md",
        "SuperPmAgent-coding/skills/submit-pr/SKILL.md",
        "SuperPmAgent-coding/skills/code-context/SKILL.md",
        "SuperPmAgent-coding/tools/code_context.py",
    ]
    for rel in required_skills:
        p = ROOT / rel
        ok &= check(f"exists {rel}", p.is_file())

    hooks = [
        ROOT / "SuperPmAgent-core/hooks/stop.py",
        ROOT / "SuperPmAgent-core/hooks/pre-tool-use.py",
        ROOT / "SuperPmAgent-coding/tools/code_context.py",
    ]
    for hp in hooks:
        r = subprocess.run([sys.executable, "-m", "py_compile", str(hp)], capture_output=True)
        ok &= check(f"py_compile {hp.name}", r.returncode == 0, r.stderr.decode("utf-8", errors="replace")[:200])

    case_dir = ROOT / "benchmark/cases"
    cases = sorted(case_dir.glob("*.md"))
    ok &= check("benchmark cases", len(cases) >= 40, f"count={len(cases)}")
    for prefix in ("XC-01", "XC-02", "WEB-01", "DV-01", "DV-20"):
        ok &= check(f"case {prefix}", any(case_dir.glob(f"{prefix}*.md")))
    ok &= check("benchmark/matrix.json", (ROOT / "benchmark/matrix.json").is_file())
    ok &= check("benchmark/targets.json", (ROOT / "benchmark/targets.json").is_file())
    ok &= check("benchmark/diverse20.json", (ROOT / "benchmark/diverse20.json").is_file())
    if (ROOT / "benchmark/app50.json").is_file():
        ok &= check("benchmark/app50.json", True)
        for prefix in ("AP-01", "AP-50"):
            ok &= check(f"case {prefix}", any(case_dir.glob(f"{prefix}*.md")))
    for rel in (
        "scripts/benchmark_config.py",
        "scripts/review-benchmark-round.py",
        "scripts/run-benchmark-overnight.ps1",
        "scripts/reset-round-targets.ps1",
        "scripts/clone-app50-targets.ps1",
    ):
        ok &= check(f"exists {rel}", (ROOT / rel).is_file())

    # code-context CLI smoke
    r = subprocess.run(
        [
            sys.executable,
            str(ROOT / "SuperPmAgent-coding/tools/code_context.py"),
            "analyze",
            "--project",
            str(ROOT),
            "--keywords",
            "goal,distill",
        ],
        capture_output=True,
        text=True,
    )
    cli_ok = r.returncode == 0 and '"candidates"' in r.stdout
    ok &= check("code_context analyze", cli_ok)

    ok &= check("SuperPmAgent-knowledge repo", KNOWLEDGE.is_dir(), str(KNOWLEDGE))
    ok &= check("SuperPmAgent-web backend", WEB_BACKEND.is_dir(), str(WEB_BACKEND))

    # no digest skill naming in plugin protocol files
    scan_roots = [
        ROOT / "SuperPmAgent-core",
        ROOT / "SuperPmAgent-io",
        ROOT / "SuperPmAgent-coding",
        ROOT / "SuperPmAgent-business",
        ROOT / "benchmark",
    ]
    digest_hits = []
    for base in scan_roots:
        for p in base.rglob("*"):
            if ROOT / "benchmark" / "runs" in p.parents:
                continue
            if p.is_file() and p.suffix.lower() in {".md", ".json", ".py", ".jsonl"}:
                try:
                    if "digest" in p.read_text(encoding="utf-8", errors="ignore").lower():
                        digest_hits.append(str(p.relative_to(ROOT)))
                except OSError:
                    pass
    ok &= check("no digest naming residue", len(digest_hits) == 0, ", ".join(digest_hits[:5]))

    goal = (ROOT / "SuperPmAgent-core/commands/goal.md").read_text(encoding="utf-8")
    ok &= check("goal references distill", "distill" in goal.lower())
    ok &= check("goal chain includes submit-pr", "submit-pr" in goal)
    ok &= check("goal learnings advisory contract", "relevant learnings" in goal.lower() and "advisory" in goal.lower())

    r = subprocess.run(
        [sys.executable, str(ROOT / "scripts" / "test-web-contract.py")],
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        cwd=str(ROOT),
    )
    ok &= check("web contract probes", r.returncode == 0, r.stdout.splitlines()[-1] if r.stdout else r.stderr[:200])

    print("\nSample skill hashes (for benchmark/skill-versions.json):")
    for rel in ("SuperPmAgent-core/commands/goal.md", "SuperPmAgent-core/skills/distill/SKILL.md"):
        print(f"  {rel}: {sha256_file(ROOT / rel)}")

    print("\nBlockers for full E2E (informational):")
    import shutil

    for tool in ("claude", "gh"):
        if shutil.which(tool):
            r = subprocess.run([tool, "--version"], capture_output=True, text=True)
            print(f"  - {tool}: {r.stdout.strip() or r.stderr.strip()}")
        else:
            print(f"  - {tool} CLI not available on PATH")

    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
