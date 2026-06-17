---
title: "Git 同步的启动顺序问题"
category: mistake
importance: 0.7
confidence: 0.9
created: 2026-06-03
tags: [git, sync, bootstrap]
pinned: false
archived: false
---

## 问题

KnowledgeStore 在 git clone 之前初始化，创建了 `.logs/` 目录，导致后续 `git clone` 失败（目标目录非空）。

## 解决

1. `knowledge_sync.py` 在 clone 前检测：如果目录存在但无 `.git`，先删除
2. Clone 成功后调用 `store.reload()` 刷新缓存
3. `knowledge_repo_url` 从 SQLite fallback 读取（解决鸡生蛋问题）

## 预防

启动时 clone 应在 store 初始化之前执行，或 store 支持延迟初始化。
