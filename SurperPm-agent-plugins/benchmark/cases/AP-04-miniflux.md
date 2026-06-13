---
id: AP-04
title: Feed privacy-audit status
level: AP
track: B
target_repo_type: go-web-app
target_repo: ap-miniflux
scope: app-l2plus-cross-module
allowed_backend_change: true
allowed_paths:
  - app/**
  - apps/**
  - src/**
  - frontend/**
  - backend/**
  - server/**
  - client/**
  - web/**
  - packages/**
  - tests/**
  - test/**
  - spec/**
forbidden_paths:
  - package-lock.json
  - pnpm-lock.yaml
  - yarn.lock
  - requirements*.txt
  - uv.lock
  - poetry.lock
  - Pipfile.lock
  - go.sum
  - Cargo.lock
  - Gemfile.lock
  - composer.lock
dependency_policy: no-dependency-or-lockfile-churn
required_checks:
  - Use repository evidence to run the narrowest relevant lint/test/build command
  - Inspect final diff for cross-module propagation and dependency churn
oracle: |
  L2+ application task: Add a feed-level privacy audit marker for feeds with external media/tracker handling, surface it in feed management and entry views, and keep default reader behavior unchanged.
  The implementation should touch multiple relevant surfaces when the repo supports them (model/service/API/client/UI/tests), avoid dependency churn, and record blockers honestly when local environment prevents full verification.
review_status: pending
---

# AP-04 Feed privacy-audit status

## Goal

在 `RSS reader` 应用仓中完成一个 L2+ 级别的跨模块需求：Add a feed-level privacy audit marker for feeds with external media/tracker handling, surface it in feed management and entry views, and keep default reader behavior unchanged.

请先探索仓库结构并识别真实的数据流，不要假设固定框架。实现应尽量覆盖数据/服务/API/前端展示或交互/测试中的至少两个以上相关层面。若仓库缺少某一层或本地环境无法运行检查，必须在交付证据中明确记录 blocker 和 verification gap。

## Acceptance Criteria

- 需求不是单文件 helper 改动，而是基于仓库真实结构完成跨模块传播。
- 改动遵循现有代码风格、路由/服务/状态/测试约定。
- 若涉及后端契约变化，前端调用或展示面同步更新。
- 若涉及 UI，至少包含可观察的列表、详情、表单、筛选或状态提示变化之一。
- 不新增依赖，不携带 lockfile/manifest churn，除非仓库自身明确要求且证据充分。
- 运行最接近 CI 的窄检查；无法运行时记录环境/setup blocker。

## Expected Find

- `SuperPmAgent-coding/skills/repo-explorer/SKILL.md`
- `SuperPmAgent-coding/skills/code-context/SKILL.md`
- `SuperPmAgent-coding/skills/coding/SKILL.md`
- `SuperPmAgent-coding/skills/run-tests/SKILL.md`
- `SuperPmAgent-coding/skills/acceptance-review/SKILL.md`
- Business skill if the repo evidence matches field/API/form propagation.

## Expected Locate

- Top-level manifest and CI/test config.
- Domain model, service/controller/API route, client/query, UI list/detail/form, and nearby tests when present.
- Existing conventions for status fields, metadata fields, filters, badges, or validation.

## Required Checks

- Run the narrowest relevant lint/test/build command discovered from repo evidence.
- If checks cannot run, classify the reason as environment/setup and include the first blocker.
- Inspect git diff to ensure the change is scoped and lockfiles/manifests did not churn.

## Failure Conditions

- Only edits a README or single helper without satisfying cross-module behavior.
- Changes dependency manifests or lockfiles without explicit need.
- Claims success without tests/checks or a documented blocker.
- Updates backend response without frontend/client alignment when UI consumption is part of the goal.
- Fabricates file paths or framework assumptions instead of using repo evidence.
