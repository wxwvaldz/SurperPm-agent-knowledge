---
id: DV-15
title: Unique by key with window
level: DV
track: B
target_repo_type: python-package
target_repo: dv-more-itertools
scope: python-src-tests
allowed_backend_change: false
allowed_paths:
  - more_itertools/**
  - tests/**
forbidden_paths:
  - pyproject.toml
  - setup.py
dependency_policy: no-packaging-changes
required_checks:
  - python -m pytest -q
oracle: |
  Adds unique_justseen(iterable, key=None) yielding items whose key not seen in previous item (pairwise dedupe). 2+ tests.

review_status: pending
---

# DV-15 Unique by key with window

## Goal

在 more_itertools 中实现 `unique_justseen(iterable, key=None)`：相邻重复（按 key）只保留第一次出现。至少 2 个 pytest。

## Acceptance Criteria

- Documented in module with tests.

## Expected Find

- `SuperPmAgent-coding/skills/repo-explorer/SKILL.md`
- `SuperPmAgent-coding/skills/coding/SKILL.md`
- `SuperPmAgent-coding/skills/run-tests/SKILL.md`

## Expected Locate

- more_itertools/*.py, tests/

## Required Checks

- `python -m pytest -q`

## Failure Conditions

- Packaging edited.
