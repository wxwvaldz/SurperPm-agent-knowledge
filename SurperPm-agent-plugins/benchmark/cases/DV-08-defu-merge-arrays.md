---
id: DV-08
title: Defu replace arrays merge
level: DV
track: B
target_repo_type: node-package
target_repo: dv-defu
scope: node-src-tests
allowed_backend_change: false
allowed_paths:
  - src/**
  - dist/**
  - test/**
  - tests/**
forbidden_paths:
  - package.json
  - package-lock.json
dependency_policy: no-manifest-or-lockfile-changes
required_checks:
  - npm test
oracle: |
  Exports defuReplaceArrays(target, ...sources) merging objects but replacing array fields entirely from last source instead of concat. 2+ tests. package.json unchanged.

review_status: pending
---

# DV-08 Defu replace arrays merge

## Goal

新增 `defuReplaceArrays(...)`：对象深度合并，但 **数组字段** 用后者整体替换而非拼接。至少 2 个测试。

## Acceptance Criteria

- Array replace semantics demonstrated in tests.
- Existing defu tests pass.

## Expected Find

- `SuperPmAgent-coding/skills/repo-explorer/SKILL.md`
- `SuperPmAgent-coding/skills/coding/SKILL.md`
- `SuperPmAgent-coding/skills/run-tests/SKILL.md`

## Expected Locate

- src + test dirs

## Required Checks

- `npm test`

## Failure Conditions

- Lockfile change.
