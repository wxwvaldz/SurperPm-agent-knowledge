---
id: DV-07
title: Kleur success log style
level: DV
track: B
target_repo_type: node-package
target_repo: dv-kleur
scope: node-src-tests
allowed_backend_change: false
allowed_paths:
  - index.js
  - index.mjs
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
  kleur.success is a function wrapping text in green bold ANSI (or kleur API equivalent). One test asserts output contains ANSI or snapshot. package.json unchanged.

review_status: pending
---

# DV-07 Kleur success log style

## Goal

为 kleur 增加 `kleur.success(text)` 样式：绿色加粗（或仓库惯用 success 配色）。至少 1 个可验证输出的测试。

## Acceptance Criteria

- success style callable.
- Tests pass.

## Expected Find

- `SuperPmAgent-coding/skills/repo-explorer/SKILL.md`
- `SuperPmAgent-coding/skills/coding/SKILL.md`
- `SuperPmAgent-coding/skills/run-tests/SKILL.md`

## Expected Locate

- kleur entry file

## Required Checks

- `npm test`

## Failure Conditions

- package.json edited.
