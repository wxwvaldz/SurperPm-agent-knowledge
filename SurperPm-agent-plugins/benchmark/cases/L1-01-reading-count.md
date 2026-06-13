---
id: L1-01
title: Article cards reading count
level: L1
scope: frontend-only
target_repo: conduit
allowed_backend_change: false
---

# L1-01 Article Cards Reading Count

## Goal

在首页文章卡片上增加阅读量 icon + 数字展示。前端假数据即可，不改后端。

## Acceptance Criteria

- Home page article cards show a reading count icon and number.
- Reading count values are deterministic frontend-only mock data.
- Backend, API contracts, and database files are unchanged.
- Existing article navigation and favorite behavior still work.
- Relevant frontend checks pass or a real blocker is recorded.

## Expected Find

- `SuperPmAgent-coding/skills/repo-explorer/SKILL.md`
- `SuperPmAgent-coding/skills/coding/SKILL.md`
- `SuperPmAgent-coding/skills/run-tests/SKILL.md`

## Expected Locate

- Article preview or feed item component.
- Article card styles.
- Frontend package scripts.

## Required Checks

- Frontend test/build/lint command when available.
- Git diff confirms no backend changes.

## Failure Conditions

- Backend schema or API is changed.
- Sorting or analytics semantics are introduced.
- The article card link or favorite button regresses.
