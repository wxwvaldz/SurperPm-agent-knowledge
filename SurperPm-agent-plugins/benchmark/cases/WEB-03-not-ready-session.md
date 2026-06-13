---
id: WEB-03
title: Not-ready session blocks execution
level: WEB
track: C
target_repo_type: knowledge-session
target_repo: none
scope: contract-probe
dependency_policy: n/a
oracle: |
  Session with ready_for_goal=no or open questions must fail gate;
  goal.md requires stop before code edits (no target repo diff expected in live run).
review_status: pending
---

# WEB-03 Not-Ready Session (Web-B)

## Goal

验证 **not-ready** session（`ready_for_goal: no` 或存在 Open Questions）被 `goal.md` gate 拒绝，不应进入改码。

## Acceptance Criteria

- Fixture `sessions/_web-contract-not-ready/` fails gate.
- `goal.md` documents stop behavior before coding.
- `test-web-contract.py` WEB-03 exits 0.

## Required Checks

```powershell
python SuperPmAgent-plugins/scripts/test-web-contract.py --case WEB-03
```

## Failure Conditions

- Not-ready fixture passes gate.
- goal.md missing gate stop rules.
