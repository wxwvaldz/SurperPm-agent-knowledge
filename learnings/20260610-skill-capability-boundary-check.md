---
title: "Skill 调用前的能力边界检查模式"
category: pattern
source_type: internal
importance: 0.7
confidence: 0.85
created: 2026-06-10T06:30:00+00:00
pinned: false
archived: false
tags: skill, plugin, input-validation, capability-check
---

## 背景

在测试 normalize-feishu-doc 时，agent 发现该 Skill 是为飞书文档 URL 设计的专用工具，输入假设严格（需要 `feishu_doc_url`），而用户最初提供的是纯文本会议纪要。

## 模式

在调用任何 Skill 之前，执行三步边界检查：

### 1. 输入类型匹配
```
Skill 期望输入   vs   用户提供输入
feishu_doc_url   vs   纯文本会议纪要 → 不匹配
```

### 2. 能力范围确认
- normalize-feishu-doc 有三级成熟度管道：Link-only → Fetched → Analyzed
- 没有飞书链接时只能走到 Level 0（link-only），无法展示真正能力
- 强行执行 = 浪费时间

### 3. 输出格式对齐
- Skill 输出到 `attachments/sources/<slug>.json`
- 需要确认输出格式是否满足用户"在浏览器查看"的期望

## 检查清单

执行任何 Skill 前：
- [ ] 是否读了 SKILL.md 了解输入假设？
- [ ] 用户输入是否匹配 Skill 的输入类型？
- [ ] Skill 的能力范围是否能覆盖用户的期望？
- [ ] 是否存在"只能走到 Level 0"的降级风险？

## 适用场景

- 任何首次调用的 Skill
- 用户输入格式不明确的 Goal
- 多 Skill 可供选择时的对比决策
