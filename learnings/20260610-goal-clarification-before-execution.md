---
title: "Goal 执行前必须先完成需求澄清"
category: mistake
source_type: internal
importance: 0.75
confidence: 0.85
created: 2026-06-10T06:30:00+00:00
pinned: false
archived: false
tags: goal-execution, clarification, agent-behavior, anti-pattern
---

## 问题

Agent 在收到 Goal 后，容易跳过需求澄清直接创建执行 proposal。在 normalize-feishu-doc 测试中，agent 收到"用会议纪要测试"的指令后立即发起 goal-proposal，用户明确反馈："你的需求澄清好差啊，怎么上来就执行 goal"。

## 根因

- Agent 默认将"执行 Goal"作为第一优先级
- 忽略了 Goal 执行前应有的能力匹配检查、输入验证、期望对齐
- 这种"跳步"行为导致不必要的返工

## 正确做法

1. **先读 SKILL.md**：了解 Skill 的输入假设、能力边界
2. **匹配输入与能力**：用户提供的是纯文本会议纪要，但 Skill 需要飞书文档 URL — 应尽早发现并反馈
3. **对齐期望**：确认"测试"的具体含义（跑通流程？验证输出格式？适配非飞书输入？）
4. **再提议 Goal**：澄清完成后才发起 goal-proposal

## 信号

如果出现以下情况，说明需要回头做澄清：
- 你不确定 Skill 的输入格式要求
- 用户给的输入与 Skill 设计的输入类型不匹配
- 用户说"测试"但没有明确测试维度
