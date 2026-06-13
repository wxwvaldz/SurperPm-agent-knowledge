#!/usr/bin/env python3
"""Resolve target repository path for a benchmark case."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WORKSPACE = ROOT.parent
CASES = ROOT / "benchmark" / "cases"


def _import_case_meta(case_id: str) -> dict:
    sys.path.insert(0, str(ROOT / "scripts"))
    from benchmark_run_log import case_meta  # noqa: WPS433

    return case_meta(case_id)


def _slug_map(workspace: Path) -> dict[str, str]:
    sys.path.insert(0, str(ROOT / "scripts"))
    from benchmark_config import target_slug_map  # noqa: WPS433

    return target_slug_map()


def resolve_target(case_id: str, workspace: Path | None = None) -> Path:
    ws = workspace or WORKSPACE
    meta = _import_case_meta(case_id)
    explicit = meta.get("target_repo_path", "").strip()
    if explicit:
        p = Path(explicit)
        if not p.is_absolute():
            p = ws / p
        return p.resolve()
    slug = meta.get("target_repo", "conduit").strip()
    if slug in ("none", ""):
        raise SystemExit(f"Case {case_id} has no target repository")
    slug_map = _slug_map(ws)
    rel = slug_map.get(slug)
    if not rel:
        raise SystemExit(f"Unknown target_repo slug: {slug} (check benchmark/targets.json)")
    return (ws / rel).resolve()


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("case_id")
    p.add_argument("--workspace", default=str(WORKSPACE))
    args = p.parse_args()
    path = resolve_target(args.case_id, Path(args.workspace))
    if not path.is_dir():
        print(f"ERROR: target not found: {path}", file=sys.stderr)
        return 1
    print(str(path))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
