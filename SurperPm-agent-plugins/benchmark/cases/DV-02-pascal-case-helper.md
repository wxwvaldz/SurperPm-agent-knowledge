---
id: DV-02
title: PascalCase string helper
level: DV
track: B
target_repo_type: node-package
target_repo: dv-camelcase
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
  Exports pascalCase(input) turning foo-bar and foo_bar into FooBar. At least 2 tests. package.json unchanged.

review_status: pending
---

# DV-02 PascalCase string helper

## Goal

新增 `pascalCase(string)`：将 `foo-bar` / `foo_bar` / `foo bar` 转为 `FooBar`（每个词首字母大写、无分隔符）。至少 2 个测试。不改 package.json。

## Acceptance Criteria

- pascalCase implemented without breaking camelCase default export.
- npm test passes.

## Expected Find

- `SuperPmAgent-coding/skills/repo-explorer/SKILL.md`
- `SuperPmAgent-coding/skills/coding/SKILL.md`
- `SuperPmAgent-coding/skills/run-tests/SKILL.md`

## Expected Locate

- index.js and test.js (or tests/).

## Required Checks

- `npm test`

## Failure Conditions

- Breaks existing camelCase API.
- Manifest changed.
