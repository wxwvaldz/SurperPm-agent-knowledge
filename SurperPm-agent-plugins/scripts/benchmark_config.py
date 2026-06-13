#!/usr/bin/env python3
"""Load benchmark matrix and target repo configuration."""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BENCHMARK = ROOT / "benchmark"
MATRIX_FILE = BENCHMARK / "matrix.json"
TARGETS_FILE = BENCHMARK / "targets.json"
DIVERSE20_FILE = BENCHMARK / "diverse20.json"
APP50_FILE = BENCHMARK / "app50.json"


def load_matrix_config() -> dict:
    if not MATRIX_FILE.is_file():
        raise FileNotFoundError(f"Missing {MATRIX_FILE}")
    return json.loads(MATRIX_FILE.read_text(encoding="utf-8"))


def load_targets_config() -> dict:
    if not TARGETS_FILE.is_file():
        raise FileNotFoundError(f"Missing {TARGETS_FILE}")
    return json.loads(TARGETS_FILE.read_text(encoding="utf-8"))


def load_diverse20_config() -> dict:
    if not DIVERSE20_FILE.is_file():
        return {}
    return json.loads(DIVERSE20_FILE.read_text(encoding="utf-8"))


def load_app50_config() -> dict:
    if not APP50_FILE.is_file():
        return {}
    return json.loads(APP50_FILE.read_text(encoding="utf-8"))


def _case_meta(case_id: str) -> dict:
    sys.path.insert(0, str(ROOT / "scripts"))
    from benchmark_run_log import case_meta  # noqa: WPS433

    return case_meta(case_id)


def diverse20_pool() -> list[str]:
    data = load_diverse20_config()
    pool = list(data.get("dv_pool") or [])
    if pool:
        return pool
    return [f"DV-{i:02d}" for i in range(1, 21)]


def app50_pool() -> list[str]:
    data = load_app50_config()
    pool = list(data.get("ap_pool") or [])
    if pool:
        return pool
    return [f"AP-{i:02d}" for i in range(1, 51)]


def get_case_set(name: str, *, round_index: int = 0) -> dict:
    """Return resolved case lists for a named set."""
    cfg = load_matrix_config()
    sets = cfg.get("sets", {})
    if name not in sets:
        raise KeyError(f"Unknown case set: {name}. Available: {', '.join(sorted(sets))}")
    spec = sets[name]
    trio = list(spec.get("trio") or [])
    xc = list(spec.get("xc") or [])
    web = list(spec.get("web") or [])
    standalone = list(spec.get("standalone") or [])

    pool = list(spec.get("conduit_extra_pool") or [])
    per = int(spec.get("conduit_extra_per_round") or 0)
    if pool and per > 0:
        start = (round_index * per) % len(pool)
        extra: list[str] = []
        for i in range(per):
            extra.append(pool[(start + i) % len(pool)])
        standalone = extra + standalone

    dv_case = ""
    ap_case = ""
    if spec.get("dv_one_per_round"):
        pool20 = diverse20_pool()
        if not pool20:
            raise ValueError("diverse-20 requires benchmark/diverse20.json dv_pool")
        dv_case = pool20[round_index % len(pool20)]
        xc = [dv_case]
        standalone = []
    if spec.get("ap_one_per_round"):
        pool50 = app50_pool()
        if not pool50:
            raise ValueError("app-50 requires benchmark/app50.json ap_pool")
        ap_case = pool50[round_index % len(pool50)]
        xc = [ap_case]
        standalone = []

    return {
        "name": name,
        "trio": trio,
        "xc": xc,
        "web": web,
        "standalone": standalone,
        "conduit_standalone": [c for c in standalone if c.startswith("L")],
        "dv_case": dv_case,
        "ap_case": ap_case,
        "skip_conduit_reset": bool(spec.get("skip_conduit_reset")),
    }


def target_slug_map() -> dict[str, str]:
    data = load_targets_config()
    out: dict[str, str] = {}
    for slug, info in (data.get("targets") or {}).items():
        out[slug] = str(info.get("path", ""))
    d20 = load_diverse20_config()
    for slug, info in (d20.get("targets") or {}).items():
        out[slug] = str(info.get("path", ""))
    app50 = load_app50_config()
    for slug, info in (app50.get("targets") or {}).items():
        out[slug] = str(info.get("path", ""))
    return out


def reset_target_paths(workspace: Path) -> list[Path]:
    """Paths that should be reset after each overnight round."""
    data = load_targets_config()
    paths: list[Path] = []
    for slug, info in (data.get("targets") or {}).items():
        if not info.get("reset"):
            continue
        rel = info.get("path", "")
        if rel:
            paths.append((workspace / rel).resolve())
    d20 = load_diverse20_config()
    for slug, info in (d20.get("targets") or {}).items():
        if not info.get("reset"):
            continue
        rel = info.get("path", "")
        if rel:
            paths.append((workspace / rel).resolve())
    app50 = load_app50_config()
    for slug, info in (app50.get("targets") or {}).items():
        if not info.get("reset"):
            continue
        rel = info.get("path", "")
        if rel:
            paths.append((workspace / rel).resolve())
    return paths


def clone_url_for_slug(slug: str) -> str:
    data = load_targets_config()
    info = (data.get("targets") or {}).get(slug) or {}
    url = str(info.get("clone_url") or "")
    if url:
        return url
    d20 = load_diverse20_config()
    info2 = (d20.get("targets") or {}).get(slug) or {}
    url2 = str(info2.get("clone_url") or "")
    if url2:
        return url2
    app50 = load_app50_config()
    info3 = (app50.get("targets") or {}).get(slug) or {}
    return str(info3.get("clone_url") or "")


def reset_slugs_for_round(case_set: str, *, round_index: int = 0) -> list[str]:
    """Target slugs to reset after a round (scoped for diverse-20)."""
    spec = get_case_set(case_set, round_index=round_index)
    if spec.get("dv_case"):
        meta = _case_meta(spec["dv_case"])
        slug = str(meta.get("target_repo") or "").strip()
        return [slug] if slug else []
    if spec.get("ap_case"):
        meta = _case_meta(spec["ap_case"])
        slug = str(meta.get("target_repo") or "").strip()
        return [slug] if slug else []
    slugs: list[str] = []
    for case_id in spec.get("trio", []) + spec.get("xc", []) + spec.get("standalone", []):
        meta = _case_meta(case_id)
        slug = str(meta.get("target_repo") or "").strip()
        if slug and slug not in slugs:
            slugs.append(slug)
    if not spec.get("skip_conduit_reset"):
        slugs.append("conduit")
    return slugs


def main() -> int:
    import argparse

    p = argparse.ArgumentParser(description="Benchmark matrix/target config")
    sub = p.add_subparsers(dest="cmd", required=True)

    c = sub.add_parser("cases", help="Print resolved case set as JSON")
    c.add_argument("--set", default="standard")
    c.add_argument("--round-index", type=int, default=0)

    s = sub.add_parser("sets", help="List case set names")

    r = sub.add_parser("reset-slugs", help="Slugs to reset for a round")
    r.add_argument("--set", default="diverse-20")
    r.add_argument("--round-index", type=int, default=0)

    args = p.parse_args()
    if args.cmd == "sets":
        cfg = load_matrix_config()
        for name in sorted((cfg.get("sets") or {}).keys()):
            print(name)
        return 0
    if args.cmd == "cases":
        data = get_case_set(args.set, round_index=args.round_index)
        print(json.dumps(data, ensure_ascii=False))
        return 0
    if args.cmd == "reset-slugs":
        slugs = reset_slugs_for_round(args.set, round_index=args.round_index)
        print(json.dumps(slugs, ensure_ascii=False))
        return 0
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
