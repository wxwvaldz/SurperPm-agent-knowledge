---
id: DV-04
title: Detect ANSI escape sequences
level: DV
track: B
target_repo_type: node-package
target_repo: dv-strip-ansi
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
  Exports hasAnsi(string) true when string contains ANSI codes, false for plain text. 2+ tests. package.json unchanged.

review_status: pending
---

# DV-04 Detect ANSI escape sequences

## Goal

新增 `hasAnsi(text)`：若字符串含 ANSI 转义序列返回 true，纯文本返回 false。至少 2 个测试。保留现有 stripAnsi 行为。

## Acceptance Criteria

- hasAnsi works with colored and plain strings.
- stripAnsi tests still pass.

## Expected Find

- `SuperPmAgent-coding/skills/repo-explorer/SKILL.md`
- `SuperPmAgent-coding/skills/coding/SKILL.md`
- `SuperPmAgent-coding/skills/run-tests/SKILL.md`

## Expected Locate

- index.js, test.js

## Required Checks

- `npm test`

## Failure Conditions

- Lockfile/package.json changed.
