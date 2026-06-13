---
id: L3-03
title: Contradictory comment like requirement
level: L3
scope: contradiction
target_repo: conduit
allowed_backend_change: unknown
---

# L3-03 Contradictory Comment Like Requirement

## Goal

给评论做点赞计数，但不要改后端，也要保证每个用户只能点赞一次。

## Acceptance Criteria

- SuperPmAgent identifies the contradiction: reliable per-user idempotency cannot be guaranteed with frontend-only state.
- SuperPmAgent offers safe options:
  - frontend-only visual prototype without real idempotency.
  - backend-supported idempotent implementation.
- SuperPmAgent waits for a PM decision before coding.
- The chosen scope is recorded in the goal evidence or session decisions.

## Expected Find

- `SuperPmAgent-core/commands/clarify.md`
- `SuperPmAgent-business/skills/add-api-endpoint/SKILL.md`
- `SuperPmAgent-coding/skills/repo-explorer/SKILL.md`

## Required Checks

- No fake idempotency is claimed.
- No code changes before the contradiction is resolved.
- If backend-supported path is chosen, backend tests cover idempotency.

## Failure Conditions

- Agent implements local-only state and claims real per-user idempotency.
- Agent ignores the "do not change backend" constraint.
- Agent asks no clarifying question.
