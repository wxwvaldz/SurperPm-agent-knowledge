---
id: L2-03
title: Article drafts
level: L2
scope: cross-stack
target_repo: conduit
allowed_backend_change: true
---

# L2-03 Article Drafts

## Goal

Article 增加 `status` 枚举 `draft/published`。编辑器新增“保存草稿”，列表默认过滤 `draft`，个人主页增加 Drafts Tab。

## Acceptance Criteria

- Existing articles default to `published`.
- Editor can save a draft and publish an article.
- Public lists exclude drafts by default.
- Author profile exposes Drafts tab for the author's drafts.
- Draft visibility rules are explicit and enforced.

## Expected Find

- `SuperPmAgent-business/skills/add-db-field/SKILL.md`
- `SuperPmAgent-business/skills/add-ui-form/SKILL.md`
- `SuperPmAgent-coding/skills/repo-explorer/SKILL.md`
- `SuperPmAgent-coding/skills/run-tests/SKILL.md`

## Expected Locate

- Article model/schema.
- Article list/feed queries.
- Editor submit flow.
- Profile tabs and article list routes.
- Auth/ownership checks.

## Required Checks

- Backend default status and list filtering tests.
- Author-only draft visibility test.
- Frontend editor and Drafts tab checks.
- Manual publish flow if automated coverage is incomplete.

## Failure Conditions

- Drafts leak into public lists.
- Published article behavior regresses.
- Ownership rules are unspecified or unenforced.
