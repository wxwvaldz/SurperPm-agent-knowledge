---
id: L1-02
title: Popular tags first five badge
level: L1
scope: frontend-only
target_repo: conduit
allowed_backend_change: false
---

# L1-02 Popular Tags First Five Badge

## Goal

为 Popular Tags 侧边栏接口返回的前 5 个标签增加视觉标识。纯前端取前 5，不引入排序语义。

## Acceptance Criteria

- Only the first five rendered tags receive a visual badge or marker.
- Tag order remains exactly as returned by the API.
- Backend, API, and database files are unchanged.
- Existing tag click/filter behavior still works.

## Expected Find

- `SuperPmAgent-coding/skills/repo-explorer/SKILL.md`
- `SuperPmAgent-coding/skills/coding/SKILL.md`
- `SuperPmAgent-coding/skills/run-tests/SKILL.md`

## Expected Locate

- Popular Tags component.
- Tag button or tag list rendering.
- Frontend styles for tags.

## Required Checks

- Frontend test/build/lint command when available.
- Manual or automated check with more than five tags.
- Git diff confirms no backend changes.

## Failure Conditions

- Tags are sorted or ranked differently.
- More or fewer than the first five tags receive markers without explanation.
- Existing tag filtering breaks.
