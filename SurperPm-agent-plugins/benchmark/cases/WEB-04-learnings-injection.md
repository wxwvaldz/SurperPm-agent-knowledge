---
id: WEB-04
title: Learnings injection soft constraint
level: WEB
track: C
target_repo_type: none
target_repo: none
scope: contract-probe
dependency_policy: n/a
oracle: |
  goal.md and goal_executor-style prompt assembly treat "Relevant learnings" as
  advisory context, not overriding notes.md IntentSpec or accepted scope.
review_status: pending
---

# WEB-04 Learnings Injection

## Goal

验证插件契约：`Relevant learnings`（Web 注入）不得覆盖 session `notes.md` 的 Scope / Acceptance Criteria，也不得单独触发改码。

## Acceptance Criteria

- `goal.md` states learnings are advisory when session IntentSpec exists.
- `test-web-contract.py` WEB-04 checks required phrases / ordering rules.

## Required Checks

```powershell
python SuperPmAgent-plugins/scripts/test-web-contract.py --case WEB-04
```

## Failure Conditions

- goal.md treats learnings as mandatory scope without session check.
- Missing documentation for learnings vs IntentSpec priority.
