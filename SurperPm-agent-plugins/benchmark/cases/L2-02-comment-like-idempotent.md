---
id: L2-02
title: Comment likes with idempotency
level: L2
scope: cross-stack
target_repo: conduit
allowed_backend_change: true
---

# L2-02 Comment Likes With Idempotency

## Goal

评论支持点赞。`Comment` 增加 `likeCount`，并设计幂等点赞机制。

## Acceptance Criteria

- Comment responses include `likeCount`.
- The same authenticated user liking the same comment twice increments once.
- Multiple users can increase the count independently.
- UI exposes like action and displays the current count.
- Anonymous behavior follows existing authentication patterns.

## Expected Find

- `SuperPmAgent-business/skills/add-db-field/SKILL.md`
- `SuperPmAgent-business/skills/add-api-endpoint/SKILL.md`
- `SuperPmAgent-coding/skills/repo-explorer/SKILL.md`
- `SuperPmAgent-coding/skills/debugger/SKILL.md`

## Expected Locate

- Comment model/schema.
- Comment routes/controllers.
- Auth middleware or current user pattern.
- Article detail comments UI.
- Comment tests.

## Required Checks

- Backend idempotency test for repeated same-user like.
- Backend test for different users.
- Frontend interaction check when available.

## Failure Conditions

- Idempotency is only enforced in frontend state.
- Anonymous users can mutate likes when auth is required.
- Existing comment create/delete behavior regresses.
