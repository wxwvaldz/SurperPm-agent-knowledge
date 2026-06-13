---
id: DV-19
title: Pathe collapse dot segments
level: DV
track: B
target_repo_type: node-package
target_repo: dv-pathe
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
  Exports collapseDots(path) replacing /./ and foo/../bar segments safely. 2+ tests. package.json unchanged.

review_status: pending
---

# DV-19 Pathe collapse dot segments

## Goal

新增 `collapseDots(path)`：规范化路径中的 `.` 与 `..` 段（不访问文件系统）。至少 2 个测试。

## Acceptance Criteria

- collapseDots handles .. and . segments.

## Expected Find

- `SuperPmAgent-coding/skills/repo-explorer/SKILL.md`
- `SuperPmAgent-coding/skills/coding/SKILL.md`
- `SuperPmAgent-coding/skills/run-tests/SKILL.md`

## Expected Locate

- pathe src/tests

## Required Checks

- `npm test`

## Failure Conditions

- Manifest change.
