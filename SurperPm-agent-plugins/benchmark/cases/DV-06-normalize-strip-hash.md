---
id: DV-06
title: Normalize URL without hash
level: DV
track: B
target_repo_type: node-package
target_repo: dv-normalize-url
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
  Exports normalizeUrlWithoutHash(url) equal to normalizeUrl but stripping fragment (#...). 2+ tests. package.json unchanged.

review_status: pending
---

# DV-06 Normalize URL without hash

## Goal

新增 `normalizeUrlWithoutHash(url)`：行为同 normalizeUrl，但结果去掉 `#fragment`。至少 2 个测试。

## Acceptance Criteria

- Helper exported; fragment stripped in tests.
- npm test green.

## Expected Find

- `SuperPmAgent-coding/skills/repo-explorer/SKILL.md`
- `SuperPmAgent-coding/skills/coding/SKILL.md`
- `SuperPmAgent-coding/skills/run-tests/SKILL.md`

## Expected Locate

- index + tests

## Required Checks

- `npm test`

## Failure Conditions

- Manifest change.
