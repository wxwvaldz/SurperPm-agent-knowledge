---
id: DV-13
title: Slugify with max length
level: DV
track: B
target_repo_type: python-package
target_repo: dv-py-slugify
scope: python-src-tests
allowed_backend_change: false
allowed_paths:
  - slugify/**
  - test*.py
  - tests/**
forbidden_paths:
  - pyproject.toml
  - setup.py
  - setup.cfg
  - requirements*.txt
dependency_policy: no-packaging-changes
required_checks:
  - python -m pytest -q
oracle: |
  slugify(text, max_length=N) truncates slug to N chars without trailing hyphen. Tests for long input. No packaging files changed.

review_status: pending
---

# DV-13 Slugify with max length

## Goal

扩展 `slugify()`：支持 `max_length` 参数，超长时截断且不以 `-` 结尾。至少 2 个 pytest。不改 pyproject/setup。

## Acceptance Criteria

- max_length honored in tests.
- pytest passes.

## Expected Find

- `SuperPmAgent-coding/skills/repo-explorer/SKILL.md`
- `SuperPmAgent-coding/skills/coding/SKILL.md`
- `SuperPmAgent-coding/skills/run-tests/SKILL.md`

## Expected Locate

- slugify module + tests/

## Required Checks

- `python -m pytest -q` (or README command).

## Failure Conditions

- Packaging files touched.
