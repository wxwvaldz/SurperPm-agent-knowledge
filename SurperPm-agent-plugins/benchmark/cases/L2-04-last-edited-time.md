---
id: L2-04
title: Article last edited time
level: L2
scope: cross-stack
target_repo: conduit
allowed_backend_change: true
---

# L2-04 Article Last Edited Time

## Goal

文章详情页展示“最后编辑于 X 小时前”，使用 `updatedAt`，同时后端保证 update 会刷新该字段。

## Acceptance Criteria

- Article update changes `updatedAt`.
- Article detail displays a relative last-edited time.
- Existing article edit and detail behavior still works.
- Time formatting follows existing app conventions when present.

## Expected Find

- `SuperPmAgent-coding/skills/repo-explorer/SKILL.md`
- `SuperPmAgent-coding/skills/coding/SKILL.md`
- `SuperPmAgent-coding/skills/run-tests/SKILL.md`

## Expected Locate

- Article update route/controller.
- Article model timestamp behavior.
- Article detail page.
- Date/time formatting helper.

## Required Checks

- Backend test that `updatedAt` refreshes after update.
- Frontend detail display check.
- Manual edit and refresh flow if needed.

## Failure Conditions

- Display uses `createdAt` instead of `updatedAt`.
- Backend update does not change the timestamp.
- Timezone or formatting behavior contradicts existing helpers.
