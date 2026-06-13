---
id: L2-01
title: Article cover image
level: L2
scope: cross-stack
target_repo: conduit
allowed_backend_change: true
---

# L2-01 Article Cover Image

## Goal

Article 模型新增 `coverImage` 字段。新建/编辑文章表单支持输入 URL，列表卡片和详情页展示封面图。

## Acceptance Criteria

- `coverImage` is persisted and returned by article create, update, list, and detail flows.
- Existing articles without `coverImage` still render.
- Create/edit article UI can input and submit a URL.
- List cards and article detail display the cover image when present.
- Backend and frontend checks pass or a real blocker is recorded.

## Expected Find

- `SuperPmAgent-business/skills/add-db-field/SKILL.md`
- `SuperPmAgent-business/skills/add-ui-form/SKILL.md`
- `SuperPmAgent-coding/skills/repo-explorer/SKILL.md`
- `SuperPmAgent-coding/skills/run-tests/SKILL.md`

## Expected Locate

- Article model/schema/migration.
- Article serializer or API response mapping.
- Article editor form.
- Article list card and detail page.
- Backend and frontend tests.

## Required Checks

- Backend tests for create/update/list/detail if available.
- Frontend tests/build if available.
- Manual create/edit/list/detail flow if automated checks are incomplete.

## Failure Conditions

- API returns inconsistent `coverImage` shapes.
- Existing articles without cover image break.
- Frontend form sends the field but backend silently drops it.
