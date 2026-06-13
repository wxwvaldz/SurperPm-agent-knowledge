---
id: XC-03
title: Node isEmptyPlainObject helper
level: XC
track: B
target_repo_type: node-package
target_repo: external-js-package
scope: node-src-and-tests
allowed_backend_change: false
allowed_paths:
  - index.js
  - index.d.ts
  - test.js
forbidden_paths:
  - package.json
  - package-lock.json
dependency_policy: no-manifest-or-lockfile-changes
required_checks:
  - npm test
oracle: |
  index.js exports isEmptyPlainObject(value) returning true only when isPlainObject(value) and no own keys.
  test.js includes ava cases for {} true and {a:1} false.
  package.json unchanged.
review_status: pending
---

# XC-03 Node isEmptyPlainObject Helper

## Goal

在 `index.js` 中新增并导出 `isEmptyPlainObject(value)`：当且仅当 `isPlainObject(value)` 为真且对象没有任何自有可枚举属性时返回 `true`。在 `test.js` 用 ava 增加至少 2 个测试（例如 `{}` 为 true、`{a: 1}` 为 false）。不要修改 `package.json` 或 lockfile。

## Acceptance Criteria

- `isEmptyPlainObject` exported from `index.js` and typed in `index.d.ts` if types exist.
- New ava tests pass via `npm test` or blocker recorded.
- `package.json` and lockfiles unchanged.

## Expected Find

- `SuperPmAgent-coding/skills/repo-explorer/SKILL.md`
- `SuperPmAgent-coding/skills/coding/SKILL.md`
- `SuperPmAgent-coding/skills/run-tests/SKILL.md`

## Expected Locate

- `index.js`, `test.js`, `package.json` (read scripts only).

## Required Checks

- `npm test` from package root.

## Failure Conditions

- Manifest or lockfile changed.
- Breaks existing `isPlainObject` behavior.
- Tests skipped without blocker.
