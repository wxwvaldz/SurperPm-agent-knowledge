---
id: XR-01
title: Cross-repo README smoke
level: L1
scope: docs-only
target_repo: external-js-package
allowed_backend_change: false
---

# XR-01 Cross-Repo README Smoke

## Goal

在目标仓库的 README 中新增一个很短的 “Automation smoke note” 小节，说明本次修改只是用于验证自动化交付流程，不改变包的运行时代码、API 或依赖。

## Acceptance Criteria

- README includes a short automation smoke note.
- No source code, package manifests, lockfiles, generated files, or dependencies are changed.
- The agent uses repository evidence rather than Conduit-specific assumptions.
- If no test command is relevant for a docs-only change, the run records that no command is required.

## Expected Find

- `SuperPmAgent-coding/skills/repo-explorer/SKILL.md`
- `SuperPmAgent-coding/skills/coding/SKILL.md`
- `SuperPmAgent-coding/skills/submit-pr/SKILL.md`

## Required Checks

- Git diff is limited to README/docs content.

## Failure Conditions

- Any runtime source, package manifest, lockfile, dependency, or generated file changes.
- The agent refers to Conduit-specific paths, components, or backend/frontend assumptions.
