---
id: WEB-01
title: Plugin load contract
level: WEB
track: C
target_repo_type: none
target_repo: none
scope: contract-probe
dependency_policy: n/a
oracle: |
  All three marketplace plugins expose valid plugin.json; goal.md command exists;
  SuperPmAgent-web config references PLUGIN_REPO_PATH pattern documented in TESTING.md.
review_status: pending
---

# WEB-01 Plugin Load (Web-A)

## Goal

验证 `SuperPmAgent-plugins` 可被 Web/CLI runner 加载：`SuperPmAgent-core`、`SuperPmAgent-coding`、`SuperPmAgent-business` 均有 `.claude-plugin/plugin.json`，且存在 `/SuperPmAgent-core:goal` 命令定义。

## Acceptance Criteria

- Three plugin manifests parse as JSON with `name` field.
- `SuperPmAgent-core/commands/goal.md` exists.
- `scripts/test-web-contract.py` WEB-01 check passes.

## Required Checks

```powershell
python SuperPmAgent-plugins/scripts/test-web-contract.py --case WEB-01
```

## Failure Conditions

- Missing plugin manifest or goal command.
- Broken JSON in plugin.json.
