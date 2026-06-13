---
id: DV-16
title: Cache hit counter wrapper
level: DV
track: B
target_repo_type: python-package
target_repo: dv-cachetools
scope: python-src-tests
allowed_backend_change: false
allowed_paths:
  - src/cachetools/**
  - cachetools/**
  - tests/**
forbidden_paths:
  - pyproject.toml
  - setup.py
dependency_policy: no-packaging-changes
required_checks:
  - python -m pytest -q
oracle: |
  Adds HitCountCache extending LRUCache tracking .hit_count and .miss_count on get. 2+ tests.

review_status: pending
---

# DV-16 Cache hit counter wrapper

## Goal

实现 `HitCountCache`（可继承 LRUCache）：在 `get` 时维护 `hit_count` / `miss_count`。至少 2 个 pytest。

## Acceptance Criteria

- Counters increment correctly in tests.

## Expected Find

- `SuperPmAgent-coding/skills/repo-explorer/SKILL.md`
- `SuperPmAgent-coding/skills/coding/SKILL.md`
- `SuperPmAgent-coding/skills/run-tests/SKILL.md`

## Expected Locate

- cachetools source + tests

## Required Checks

- pytest

## Failure Conditions

- pyproject changed.
