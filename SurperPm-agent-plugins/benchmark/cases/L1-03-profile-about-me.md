---
id: L1-03
title: Profile About Me tab
level: L1
scope: frontend-profile
target_repo: conduit
allowed_backend_change: false
---

# L1-03 Profile About Me Tab

## Goal

在 Profile 页面现有 My Articles / Favorited Articles 之外新增 About Me Tab，展示 `User.bio`。

## Acceptance Criteria

- Profile navigation includes an About Me tab.
- About Me displays `User.bio` from existing profile data.
- Empty bio has a readable empty state.
- Existing My Articles and Favorited Articles tabs still work.
- Backend changes are avoided unless repository evidence proves `bio` is unavailable.

## Expected Find

- `SuperPmAgent-coding/skills/repo-explorer/SKILL.md`
- `SuperPmAgent-coding/skills/coding/SKILL.md`
- `SuperPmAgent-coding/skills/run-tests/SKILL.md`

## Expected Locate

- Profile route/page.
- Profile tab/nav component.
- Profile data shape and API client.

## Required Checks

- Frontend checks when available.
- Manual tab navigation check.
- Git diff confirms backend unchanged unless justified.

## Failure Conditions

- Existing article tabs regress.
- The agent invents a new backend field without evidence.
- About Me becomes the default tab without requirement.
