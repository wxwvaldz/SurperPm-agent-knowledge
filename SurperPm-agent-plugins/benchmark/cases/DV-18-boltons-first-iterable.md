---
id: DV-18
title: Boltons first matching iterable
level: DV
track: B
target_repo_type: python-package
target_repo: dv-boltons
scope: python-src-tests
allowed_backend_change: false
allowed_paths:
  - boltons/**
  - tests/**
forbidden_paths:
  - setup.py
  - setup.cfg
  - pyproject.toml
dependency_policy: no-packaging-changes
required_checks:
  - python -m pytest boltons/tests -q
oracle: |
  Adds first_match(iterable, pred) returning first item where pred(item) or None. 2+ tests in boltons/tests.

review_status: pending
---

# DV-18 Boltons first matching iterable

## Goal

在 boltons.iterutils（或合适子模块）新增 `first_match(iterable, pred)`：返回首个满足谓词的元素，否则 None。至少 2 个测试。

## Acceptance Criteria

- first_match tested.
- pytest for boltons passes.

## Expected Find

- `SuperPmAgent-coding/skills/repo-explorer/SKILL.md`
- `SuperPmAgent-coding/skills/coding/SKILL.md`
- `SuperPmAgent-coding/skills/run-tests/SKILL.md`

## Expected Locate

- boltons/iterutils.py, boltons/tests/

## Required Checks

- `python -m pytest boltons/tests -q` or project default.

## Failure Conditions

- setup.py changed.
