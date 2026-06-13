---
id: L1-04
title: Article word count and reading time
level: L1
scope: frontend-only
target_repo: conduit
allowed_backend_change: false
---

# L1-04 Article Word Count And Reading Time

## Goal

在文章详情页正文下方显示“本文共 XXX 字，预计阅读 X 分钟”，前端基于 `Article.body` 计算。

## Acceptance Criteria

- Article detail page shows word or character count below the body.
- Estimated reading time is derived from `Article.body`.
- Empty or short body is handled gracefully.
- Backend, API, and database files are unchanged.
- Existing article detail rendering still works.

## Expected Find

- `SuperPmAgent-coding/skills/repo-explorer/SKILL.md`
- `SuperPmAgent-coding/skills/coding/SKILL.md`
- `SuperPmAgent-coding/skills/run-tests/SKILL.md`

## Expected Locate

- Article detail route/page.
- Article body rendering component.
- Existing date/text helper patterns if any.

## Required Checks

- Frontend checks when available.
- Unit/helper test if a calculation helper is introduced.
- Manual article detail check.

## Failure Conditions

- Backend or API is changed.
- Existing body markdown/rendering breaks.
- Reading time formula is undocumented.
