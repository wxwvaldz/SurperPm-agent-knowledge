---
id: DV-10
title: UFO join URL segments
level: DV
track: B
target_repo_type: node-package
target_repo: dv-ufo
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
  Exports joinURL(base, ...segments) resolving paths without duplicate slashes. 2+ tests. package.json unchanged.

review_status: pending
---

# DV-10 UFO join URL segments

## Goal

新增 `joinURL(base, ...parts)`：拼接 URL/path 段并规范化斜杠。至少 2 个测试。

## Acceptance Criteria

- joinURL tested for trailing/leading slashes.

## Expected Find

- `SuperPmAgent-coding/skills/repo-explorer/SKILL.md`
- `SuperPmAgent-coding/skills/coding/SKILL.md`
- `SuperPmAgent-coding/skills/run-tests/SKILL.md`

## Expected Locate

- ufo src + tests

## Required Checks

- `npm test`

## Failure Conditions

- Dependency manifest changed.
