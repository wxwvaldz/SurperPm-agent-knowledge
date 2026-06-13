---
id: DV-05
title: Colord is-light helper
level: DV
track: B
target_repo_type: node-monorepo
target_repo: dv-colord
scope: colord-package
allowed_backend_change: false
allowed_paths:
  - packages/colord/**
  - src/**
forbidden_paths:
  - package.json
  - pnpm-lock.yaml
  - yarn.lock
  - package-lock.json
dependency_policy: no-root-manifest-changes
required_checks:
  - npm test
oracle: |
  colord instance or module exposes isLight() returning true when relative luminance > 0.5 (document threshold in comment). Unit tests in colord package. Root lockfiles unchanged.

review_status: pending
---

# DV-05 Colord is-light helper

## Goal

在 **colord 主包**（`packages/colord` 或仓库文档指定的包根）为颜色对象增加 `isLight()`：相对亮度 > 0.5 返回 true。写至少 2 个测试（深色/浅色各一）。不要改仓库根 lockfile。

## Acceptance Criteria

- isLight on Color/colord API with tests.
- Tests pass from documented package directory.

## Expected Find

- `SuperPmAgent-coding/skills/repo-explorer/SKILL.md`
- `SuperPmAgent-coding/skills/coding/SKILL.md`
- `SuperPmAgent-coding/skills/run-tests/SKILL.md`

## Expected Locate

- packages/colord/src or equivalent.
- colord test script.

## Required Checks

- Run package test command from colord subfolder or root per README.

## Failure Conditions

- Root dependency manifests changed.
- No tests for isLight.
