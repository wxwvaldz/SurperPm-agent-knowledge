---
id: XR-02
title: Cross-repo Python README smoke
level: L1
scope: docs-only
target_repo: external-python-package
allowed_backend_change: false
---

# XR-02 Cross-Repo Python README Smoke

## Goal

在目标 Python 包仓库的 README 中新增一个很短的 “Automation smoke note” 小节，说明本次修改只是用于验证自动化交付流程，不改变包的运行时代码、公共 API、测试配置或依赖。

## Acceptance Criteria

- README includes a short automation smoke note.
- No Python source code, packaging metadata, lockfiles, test config, generated files, or dependencies are changed.
- The agent recognizes the repository as a Python package and does not assume a frontend/backend JavaScript app layout.
- If no test command is relevant for a docs-only change, the run records that no command is required.

## Expected Find

- `SuperPmAgent-coding/skills/repo-explorer/SKILL.md`
- `SuperPmAgent-coding/skills/coding/SKILL.md`
- `SuperPmAgent-coding/skills/submit-pr/SKILL.md`

## Required Checks

- Git diff is limited to README/docs content.

## Failure Conditions

- Any runtime source, packaging metadata, lockfile, dependency, test config, or generated file changes.
- The agent assumes Conduit, article-card, backend/frontend, or JavaScript-specific structure.
