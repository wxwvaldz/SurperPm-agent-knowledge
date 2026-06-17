---
title: "Git clone SSH 失败时的 HTTPS + gh CLI 回退方案"
category: pattern
source_type: internal
importance: 0.75
confidence: 0.85
created: 2026-06-09T23:20:00+00:00
pinned: false
archived: false
tags: git, ssh, clone, worktree, github
---

## 背景

Goal 执行时，agent 在 worktree 中需要 clone 外部 repo。SSH key 认证经常失败（Permission denied publickey），需要可靠的回退方案。

## 模式

1. 首次尝试 SSH clone → 如失败，切换到 HTTPS
2. 设置 `git remote set-url origin https://github.com/...`
3. 运行 `gh auth setup-git --hostname github.com` 配置 credential helper
4. 使用 GH_TOKEN 进行认证（gh CLI 自动处理）

## 关键步骤

```bash
# 1. 切换 remote 为 HTTPS
git remote set-url origin https://github.com/user/repo.git

# 2. 配置 gh credential helper
gh auth setup-git --hostname github.com

# 3. 正常 push
git push -u origin feature/branch
```

## 适用场景

- PMPilot goal executor 在 worktree 中操作外部 repo
- CI/CD 环境中没有配置 SSH key
- 需要 gh CLI 已登录（`gh auth status` 验证）
