---
id: DV-14
title: Ordinal to words helper
level: DV
track: B
target_repo_type: python-package
target_repo: dv-humanize
scope: python-src-tests
allowed_backend_change: false
allowed_paths:
  - src/humanize/**
  - tests/**
forbidden_paths:
  - pyproject.toml
  - setup.cfg
  - requirements*.txt
dependency_policy: no-packaging-changes
required_checks:
  - python -m pytest -q
oracle: |
  Adds ordinal_words(n) returning first-second-third style for 1-3 and generic for 11 (eleventh). 2+ tests. Packaging unchanged.

review_status: pending
---

# DV-14 Ordinal to words helper

## Goal

在 humanize 包中新增 `ordinal_words(n)`：返回英文序数词（如 1->first, 11->eleventh）。至少 2 个 pytest。

## Acceptance Criteria

- ordinal_words tested.
- Existing tests pass.

## Expected Find

- `SuperPmAgent-coding/skills/repo-explorer/SKILL.md`
- `SuperPmAgent-coding/skills/coding/SKILL.md`
- `SuperPmAgent-coding/skills/run-tests/SKILL.md`

## Expected Locate

- src/humanize, tests/

## Required Checks

- pytest per project

## Failure Conditions

- pyproject changed.
