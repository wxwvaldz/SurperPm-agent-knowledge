---
id: DV-09
title: Scule camel to kebab
level: DV
track: B
target_repo_type: node-package
target_repo: dv-scule
scope: node-src-tests
allowed_backend_change: false
allowed_paths:
  - src/**
  - test/**
  - tests/**
forbidden_paths:
  - package.json
  - package-lock.json
dependency_policy: no-manifest-or-lockfile-changes
required_checks:
  - npm test
oracle: |
  Exports camelToKebab('fooBar') => 'foo-bar'. 2+ tests. package.json unchanged.

review_status: pending
---

# DV-09 Scule camel to kebab

## Goal

新增 `camelToKebab(str)`：`fooBar` -> `foo-bar`。至少 2 个测试。

## Acceptance Criteria

- camelToKebab exported with tests.

## Expected Find

- `SuperPmAgent-coding/skills/repo-explorer/SKILL.md`
- `SuperPmAgent-coding/skills/coding/SKILL.md`
- `SuperPmAgent-coding/skills/run-tests/SKILL.md`

## Expected Locate

- scule src/tests

## Required Checks

- `npm test`

## Failure Conditions

- Manifest edits.
