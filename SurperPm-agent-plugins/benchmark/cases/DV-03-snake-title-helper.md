---
id: DV-03
title: Snake-case title helper
level: DV
track: B
target_repo_type: node-package
target_repo: dv-titleize
scope: node-src-tests
allowed_backend_change: false
allowed_paths:
  - index.js
  - index.d.ts
  - test.js
  - tests/**
forbidden_paths:
  - package.json
  - package-lock.json
dependency_policy: no-manifest-or-lockfile-changes
required_checks:
  - npm test
oracle: |
  Exports snakeCaseTitle(input) lowercasing words and joining with underscores (hello world -> hello_world). Tests included. package.json unchanged.

review_status: pending
---

# DV-03 Snake-case title helper

## Goal

新增 `snakeCaseTitle(input)`：把短语转为小写并用下划线连接（如 `Hello World` -> `hello_world`）。至少 2 个测试。

## Acceptance Criteria

- snakeCaseTitle exported and tested.
- titleize default behavior unchanged.

## Expected Find

- `SuperPmAgent-coding/skills/repo-explorer/SKILL.md`
- `SuperPmAgent-coding/skills/coding/SKILL.md`
- `SuperPmAgent-coding/skills/run-tests/SKILL.md`

## Expected Locate

- Entry and tests per npm test.

## Required Checks

- `npm test`

## Failure Conditions

- Manifest edits.
- Regresses titleize.
