---
id: DV-17
title: Bleach strip all HTML tags
level: DV
track: B
target_repo_type: python-package
target_repo: dv-bleach
scope: python-src-tests
allowed_backend_change: false
allowed_paths:
  - src/bleach/**
  - bleach/**
  - tests/**
forbidden_paths:
  - pyproject.toml
  - setup.cfg
dependency_policy: no-packaging-changes
required_checks:
  - python -m pytest -q
oracle: |
  Adds strip_tags(html) returning plain text with tags removed (entities decoded). 2+ tests. No packaging change.

review_status: pending
---

# DV-17 Bleach strip all HTML tags

## Goal

新增 `strip_tags(html)`：移除所有 HTML 标签并返回纯文本。至少 2 个 pytest。

## Acceptance Criteria

- Tags removed, text preserved.
- pytest passes.

## Expected Find

- `SuperPmAgent-coding/skills/repo-explorer/SKILL.md`
- `SuperPmAgent-coding/skills/coding/SKILL.md`
- `SuperPmAgent-coding/skills/run-tests/SKILL.md`

## Expected Locate

- bleach module + tests

## Required Checks

- pytest

## Failure Conditions

- Packaging files modified.
