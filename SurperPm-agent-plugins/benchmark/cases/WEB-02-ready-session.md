---
id: WEB-02
title: Ready session IntentSpec gate
level: WEB
track: C
target_repo_type: knowledge-session
target_repo: none
scope: contract-probe
dependency_policy: n/a
oracle: |
  A session with ready_for_goal=yes, Open Questions - None, blockers - None,
  non-empty Scope and Acceptance Criteria passes goal.md IntentSpec gate regex checks.
review_status: pending
---

# WEB-02 Ready Session (Web-B)

## Goal

验证 **ready** session 的 `notes.md` 满足 `goal.md` IntentSpec gate，允许进入执行链路（脚本化检查，不启动完整 Web UI）。

## Acceptance Criteria

- Fixture session under knowledge `sessions/_web-contract-ready/` passes gate parser.
- `test-web-contract.py` WEB-02 exits 0.

## Required Checks

```powershell
python SuperPmAgent-plugins/scripts/test-web-contract.py --case WEB-02
```

## Failure Conditions

- Gate parser rejects a valid ready fixture.
- Gate parser accepts a fixture with open questions or blockers.
