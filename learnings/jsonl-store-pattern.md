---
title: "JSONL 替代数据库的实践经验"
category: pattern
importance: 0.8
confidence: 0.9
created: 2026-06-03
tags: [architecture, jsonl, knowledge-first]
pinned: false
archived: false
---

## 背景

在 PMPilot 项目中，我们将 SQLite 业务数据全部迁移到 JSONL 文件存储。

## 经验

1. JSONL 文件天然支持 git 版本控制，每行一条记录
2. 内存缓存 + 文件写入的模式性能足够（千级记录）
3. 需要注意缓存与文件的一致性 — 写文件后必须同步更新缓存
4. 讨论记录按 topic_id 分文件存储避免单文件过大

## 教训

- 直接操作文件绕过缓存会导致前端读到旧数据
- git clone 和 KnowledgeStore 初始化有竞争条件，需要处理目录已存在但非 git 仓库的情况
