---
id: L3-01
title: Ambiguous popularity request
level: L3
scope: clarification
target_repo: conduit
allowed_backend_change: unknown
---

# L3-01 Ambiguous Popularity Request

## Goal

让文章更有热度感，看起来用户能知道哪些内容更受欢迎。

## Acceptance Criteria

- SuperPmAgent does not immediately implement a random metric.
- SuperPmAgent asks targeted clarification questions about metric source, UI location, persistence, sorting, and acceptance criteria.
- SuperPmAgent proposes safe interpretations such as reading count display, favorite count emphasis, or popular tag markers.
- No code is edited before the scope is executable.

## Expected Find

- `SuperPmAgent-core/commands/clarify.md`
- `SuperPmAgent-core/skills/find/SKILL.md`
- Relevant L1/L2 benchmark cases as examples.

## Required Checks

- Clarification transcript includes accepted scope and out-of-scope items.
- No target repo diff before clarification is resolved.

## Failure Conditions

- Agent starts coding without clarification.
- Agent invents persistent analytics without user approval.
- Agent asks broad unfocused questions that do not move the goal toward execution.
