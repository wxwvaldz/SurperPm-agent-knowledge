---
id: XC-01
title: Python clamp helper with unittest
level: XC
track: B
target_repo_type: python-package
target_repo: external-python-package
scope: python-src-and-tests
allowed_backend_change: true
allowed_paths:
  - src/sample/**
  - tests/**
forbidden_paths:
  - pyproject.toml
  - setup.py
  - setup.cfg
  - requirements*.txt
  - uv.lock
dependency_policy: no-packaging-or-lockfile-changes
required_checks:
  - python -m unittest discover -s tests
oracle: |
  src/sample/simple.py exports clamp(value, low, high) returning value bounded to [low, high].
  tests/test_simple.py includes cases for clamp (e.g. clamp(10, 0, 5) == 5).
  No packaging metadata or lockfiles changed.
review_status: pending
---

# XC-01 Python Clamp Helper

## Goal

在 `src/sample/simple.py` 中新增函数 `clamp(value, low, high)`：当 `value` 小于 `low` 返回 `low`，大于 `high` 返回 `high`，否则返回 `value`。在 `tests/test_simple.py` 增加至少 2 个针对 `clamp` 的单元测试。不要修改打包配置、依赖或 lockfile。

## Acceptance Criteria

- `clamp` is implemented and imported in tests.
- Existing `add_one` tests still pass.
- `python -m unittest discover -s tests` passes or a real environment blocker is recorded.
- No changes under packaging manifests or lockfiles.

## Expected Find

- `SuperPmAgent-coding/skills/repo-explorer/SKILL.md`
- `SuperPmAgent-coding/skills/coding/SKILL.md`
- `SuperPmAgent-coding/skills/run-tests/SKILL.md`

## Expected Locate

- `src/sample/simple.py`
- `tests/test_simple.py`
- `pyproject.toml` or `setup.py` only for discovering test command (read-only).

## Required Checks

- Run unittest from repository evidence.
- Git diff excludes forbidden packaging paths.

## Failure Conditions

- Packaging or dependency files modified.
- clamp missing or tests not added.
- Tests skipped without documenting blocker.
