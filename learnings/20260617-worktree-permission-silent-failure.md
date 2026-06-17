---
title: "受限 Worktree 中写操作被拒导致 Goal 静默失败"
category: mistake
source_type: internal
importance: 0.7
confidence: 0.85
created: 2026-06-17T00:00:00+00:00
pinned: false
archived: false
tags: worktree, permissions, goal-execution, failure-mode, silent-failure
---

## 问题

GitHub Repo Activity Digest Goal 在受限 worktree（don't-ask mode）中执行，26 次迭代 / 62K tokens 耗费在尝试绕过权限限制，但最终**未能写出任何输出文件**。执行被标记为 `success`，但 Goal 的实际产出为零 — 这是一个静默失败。

## 根因

```
受限 Worktree 权限模型：
  ✅ Read、Grep、Glob、git log/show/status/diff
  ❌ Write、Edit、Bash（任何写文件操作，包括 cat >、uv、pnpm）
```

Agent 检测到权限问题后，尝试了多种绕过方案：
1. Edit settings.json（被拒）
2. `uv run python -c "..."` 写文件（被拒）
3. 裸 `uv --version` 测试（被拒）
4. 最终被迫放弃

但执行状态仍标记为 `success`，因为 agent 没有崩溃 — 它只是未能完成目标。

## 教训

### 对 Agent
- 进入受限 worktree 后，第一轮迭代就应检测权限边界
- 如果 Goal 需要写文件（如 learnings/），但所有写操作都被拒，应**快速失败**而非尝试绕过
- 快速失败比 26 轮无意义尝试更节省资源

### 对 Goal 调度
- 产生文件输出的 Goal（如 Digest、Report）应使用非受限 worktree 或开放权限
- Goal 类型应与 worktree 权限模型匹配：
  - **受限 worktree** → 纯调研、代码审查 Goal
  - **开放 worktree** → 需要写文件、提交代码的 Goal

### 对执行记录
- 当前 `success` 语义不准确：agent 未崩溃 ≠ 目标达成
- 需要区分「agent 正常退出」和「Goal 产出已交付」

## 适用信号

- Goal 描述中包含「写入」「输出」「生成文件」「写入 learnings/」
- worktree 配置为 don't-ask mode
- agent 日志中出现连续的权限拒绝
- execution 标记 success 但 summary 中没有产出文件路径
