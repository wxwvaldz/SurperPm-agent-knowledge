---
id: DV-11
title: Shallow deep-equal variant
level: DV
track: B
target_repo_type: node-package
target_repo: dv-fast-deep-equal
scope: node-src-tests
allowed_backend_change: false
allowed_paths:
  - index.js
  - test/**
  - spec/**
forbidden_paths:
  - package.json
  - package-lock.json
dependency_policy: no-manifest-or-lockfile-changes
required_checks:
  - npm test
oracle: |
  Exports shallowEqual(a,b) comparing own enumerable keys only. Tests for equal objects and different keys. package.json unchanged.

review_status: pending
---

# DV-11 Shallow deep-equal variant

## Goal

新增 `shallowEqual(a,b)`：只比较一层自有可枚举属性。至少 2 个测试（相等/不等）。

## Acceptance Criteria

- shallowEqual does not deep-compare nested objects.

## Expected Find

- `SuperPmAgent-coding/skills/repo-explorer/SKILL.md`
- `SuperPmAgent-coding/skills/coding/SKILL.md`
- `SuperPmAgent-coding/skills/run-tests/SKILL.md`

## Expected Locate

- index.js + test folder

## Required Checks

- `npm test`

## Failure Conditions

- package.json changed.
