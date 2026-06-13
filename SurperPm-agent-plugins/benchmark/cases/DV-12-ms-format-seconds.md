---
id: DV-12
title: Format milliseconds as seconds string
level: DV
track: B
target_repo_type: node-package
target_repo: dv-ms
scope: node-src-tests
allowed_backend_change: false
allowed_paths:
  - index.js
  - lib/**
  - test/**
  - tests/**
forbidden_paths:
  - package.json
  - package-lock.json
dependency_policy: no-manifest-or-lockfile-changes
required_checks:
  - npm test
oracle: |
  Exports formatSeconds(ms) returning human string like 1.5s for 1500. 2+ tests. package.json unchanged.

review_status: pending
---

# DV-12 Format milliseconds as seconds string

## Goal

新增 `formatSeconds(ms)`：把毫秒格式化为带 `s` 后缀的秒数字符串（如 1500 -> `1.5s`）。至少 2 个测试。

## Acceptance Criteria

- formatSeconds tested.
- ms() unchanged.

## Expected Find

- `SuperPmAgent-coding/skills/repo-explorer/SKILL.md`
- `SuperPmAgent-coding/skills/coding/SKILL.md`
- `SuperPmAgent-coding/skills/run-tests/SKILL.md`

## Expected Locate

- ms entry + tests

## Required Checks

- `npm test`

## Failure Conditions

- Lockfile edits.
