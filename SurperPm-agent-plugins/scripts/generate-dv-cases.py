#!/usr/bin/env python3
"""Generate DV-*.md case files from benchmark/diverse20-case-specs.json (idempotent)."""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SPECS = ROOT / "benchmark" / "diverse20-case-specs.json"
OUT = ROOT / "benchmark" / "cases"


def block(name: str, body: str) -> str:
    return f"{name}: |\n  " + body.strip().replace("\n", "\n  ") + "\n"


def render(spec: dict) -> str:
    allowed = "\n".join(f"  - {p}" for p in spec["allowed_paths"])
    forbidden = "\n".join(f"  - {p}" for p in spec["forbidden_paths"])
    checks = "\n".join(f"  - {c}" for c in spec["required_checks"])
    fm = f"""---
id: {spec["id"]}
title: {spec["title"]}
level: DV
track: B
target_repo_type: {spec["target_repo_type"]}
target_repo: {spec["target_repo"]}
scope: {spec["scope"]}
allowed_backend_change: {str(spec.get("allowed_backend_change", False)).lower()}
allowed_paths:
{allowed}
forbidden_paths:
{forbidden}
dependency_policy: {spec["dependency_policy"]}
required_checks:
{checks}
{block("oracle", spec["oracle"])}
review_status: pending
---

# {spec["id"]} {spec["title"]}

## Goal

{spec["goal"]}

## Acceptance Criteria

{spec["acceptance"]}

## Expected Find

- `SuperPmAgent-coding/skills/repo-explorer/SKILL.md`
- `SuperPmAgent-coding/skills/coding/SKILL.md`
- `SuperPmAgent-coding/skills/run-tests/SKILL.md`

## Expected Locate

{spec["locate"]}

## Required Checks

{spec["required_checks_text"]}

## Failure Conditions

{spec["failure"]}
"""
    return fm


def main() -> int:
    data = json.loads(SPECS.read_text(encoding="utf-8"))
    OUT.mkdir(parents=True, exist_ok=True)
    for spec in data["cases"]:
        path = OUT / f'{spec["id"]}-{spec["slug"]}.md'
        path.write_text(render(spec), encoding="utf-8")
        print(f"wrote {path.name}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
