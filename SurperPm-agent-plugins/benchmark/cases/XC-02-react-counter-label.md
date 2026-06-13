---
id: XC-02
title: React counter button label
level: XC
track: B
target_repo_type: react-vite-app
target_repo: external-vite-template
target_repo_path: benchmark-targets/vite-react-template
scope: frontend-ui-only
allowed_backend_change: false
allowed_paths:
  - src/**
  - public/**
forbidden_paths:
  - ../../package.json
  - ../../pnpm-lock.yaml
  - ../../pnpm-workspace.yaml
dependency_policy: no-root-monorepo-manifest-changes
required_checks:
  - npm run build or npm test from local package.json scripts
oracle: |
  Counter button text shows "Clicked N times" (or equivalent) instead of "Count is N".
  Only files under this Vite React template package change; no edits to parent monorepo lockfiles.
review_status: pending
---

# XC-02 React Counter Label

## Goal

在仓库 `packages/create-vite/template-react/` 内，把计数按钮文案从 `Count is {n}` 改为 `Clicked {n} times`（英文即可）。只改该子目录下的 `src/`（必要时 `src/App.css`），不要改 monorepo 根目录的 `package.json`、`pnpm-lock.yaml` 或 workspace 配置。

## Acceptance Criteria

- Button label reflects the new wording.
- App still renders and counter still increments.
- `npm run build` or an existing `package.json` test script passes, or blocker recorded.
- No parent-directory manifest or lockfile changes.

## Expected Find

- `SuperPmAgent-coding/skills/repo-explorer/SKILL.md`
- `SuperPmAgent-coding/skills/coding/SKILL.md`
- `SuperPmAgent-coding/skills/run-tests/SKILL.md`

## Expected Locate

- `src/App.jsx`
- `package.json` scripts in this package only.

## Required Checks

- Prefer `npm run build` from this package directory.
- Diff limited to allowed_paths.

## Failure Conditions

- Monorepo root lockfiles or workspace files changed.
- Counter logic removed or broken.
- Dependency added without approval.
