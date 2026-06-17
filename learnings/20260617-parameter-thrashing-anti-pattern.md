---
title: "Goal 参数漂移反模式 — 为微小参数变更重复创建 Goal"
category: mistake
source_type: internal
importance: 0.8
confidence: 0.9
created: 2026-06-17T00:00:00+00:00
pinned: false
archived: false
tags: goal-execution, clarification, anti-pattern, parameter, efficiency
---

## 问题

用户在 50 分钟内创建了 5 个几乎完全相同的 Goal，仅将 Popular Tags 的 🔥 徽章数量从 5→6→7→8→2 反复调整：

| Goal | 状态 | 迭代数 |
|------|------|--------|
| Popular Tags 前5个 | failed | 2 |
| Popular Tags 前6个 | review | 29 |
| Popular Tags 前7个 | review | 25 |
| Popular Tags 前8个 | failed | 23 |
| Popular Tags 前2个 | **done** ✅ | 32 |

共计 **111 次 agent 迭代**浪费在单一数值的反复实验上。最终正确答案（N=2）完全可以在第一轮澄清中确定。

## 根因

1. 用户将「调整参数」等同于「创建新 Goal」，而非先通过讨论澄清
2. Agent 没有在接到参数微调 Goal 时主动提示：「这个变更只需要改一个数字，是否先确认值再执行？」
3. 缺乏 Goal 去重检测 — 5 个 Goal 的目标 repo、改动文件、改动范围完全相同

## 正确做法

```
用户: "前5个标签加🔥"
  ↓
Agent: 我应该先确认这个数字而不是直接执行
  ↓
Agent: "目前有 X 个标签。你确定前 5 个都要加🔥 吗？
        通常 2-3 个热门标签更合适。"
  ↓
用户: "那就前2个吧"
  ↓
Agent: 创建 1 个 Goal → 执行 → done
```

## 量化收益

如果采用「先澄清再执行」：
- Goal 数量：5 → 1（减少 80%）
- Agent 迭代：111 → ~30（减少 73%）
- 用户等待时间：50 分钟 → ~3 分钟

## 适用信号

以下情况应触发参数澄清而非创建新 Goal：
- 新 Goal 与已有 Goal 的 repo、文件、改动类型完全相同
- 描述中只有数字/阈值/常量的变化
- 用户连续创建多个「N 个标签」「前 N 个」类 Goal
