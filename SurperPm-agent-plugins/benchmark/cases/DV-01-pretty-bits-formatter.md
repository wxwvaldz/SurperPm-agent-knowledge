---
id: DV-01
title: Pretty-format raw bit counts
level: DV
track: B
target_repo_type: node-package
target_repo: dv-pretty-bytes
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
  - pnpm-lock.yaml
dependency_policy: no-manifest-or-lockfile-changes
required_checks:
  - npm test
oracle: |
  Main entry exports prettyBits(n) formatting a non-negative integer bit count with unit suffix B (e.g. 1024 -> 1 kB style consistent with package). Tests cover at least two magnitudes. package.json unchanged.

review_status: pending
---

# DV-01 Pretty-format raw bit counts

## Goal

在包主入口新增并导出 `prettyBits(value)`：把非负整数 **比特数** 格式化为带 `B` 单位的可读字符串（风格与现有 `prettyBytes` 一致，但语义是 bits 不是 bytes）。补充至少 2 个 ava/现有测试框架用例。禁止改 `package.json` 与 lockfile。

## Acceptance Criteria

- `prettyBits` exported and tested.
- Existing pretty-bytes tests still pass.
- No manifest/lockfile edits.

## Expected Find

- `SuperPmAgent-coding/skills/repo-explorer/SKILL.md`
- `SuperPmAgent-coding/skills/coding/SKILL.md`
- `SuperPmAgent-coding/skills/run-tests/SKILL.md`

## Expected Locate

- Package entry (`index.js` or `source` per repo layout).
- Test file referenced by `npm test` script.

## Required Checks

- Run `npm test` from package root (or documented subpackage for monorepos).

## Failure Conditions

- Dependency files changed.
- prettyBits missing or tests skipped without blocker.
