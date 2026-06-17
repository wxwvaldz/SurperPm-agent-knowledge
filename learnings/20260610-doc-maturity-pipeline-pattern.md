---
title: "文档处理的三级成熟度管道模式"
category: pattern
source_type: internal
importance: 0.65
confidence: 0.8
created: 2026-06-10T06:30:00+00:00
pinned: false
archived: false
tags: pipeline, document-processing, maturity-model, architecture
---

## 背景

pmpilot-io 的 normalize-feishu-doc Skill 采用了三级成熟度管道来渐进式处理飞书文档。

## 三级管道

```
Level 0: Link-only
  → 仅有 URL，无内容
  → 输出：metadata (url, title, fetched_at 为空)

Level 1: Fetched
  → 已通过 lark-doc 拉取原始内容
  → 输出：原文 + metadata

Level 2: Analyzed
  → 内容已被标准化、结构化
  → 输出：标准化纪要 + 证据引用 + 可操作项
```

## 设计要点

1. **渐进式**：每级是下一级的前提，不能跳跃
2. **可降级**：如果无法拉取内容，停留在 Level 0 而非失败
3. **证据链**：Level 2 的输出必须引用 Level 1 的原文（可追溯）
4. **输出路径固定**：`attachments/sources/<slug>.json`，消费者知道去哪找

## 适用场景

- 任何需要分阶段处理外部来源内容的 Skill
- URL → 拉取 → 分析的通用模式可复用到其他文档类型
- 适合需要"部分成功"语义的场景（不完全失败，输出当前能拿到的最好结果）

## 反模式

- 不要跳过中间级直接到 Analyzed（丢失可追溯性）
- 不要在 Level 0 就丢弃 — 即使只有 URL 也有价值
