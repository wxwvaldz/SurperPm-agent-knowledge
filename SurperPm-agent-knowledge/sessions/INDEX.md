# Sessions Index

> **Purpose**: L2 session layer — 按 topic 组织，每个 goal 一个文件。
> **Updated**: 2026-06-14 (v0.8: topic 目录 + goal 文件结构)

## Structure

```
sessions/
├── INDEX.md
├── topic-<id>-<slug>/              ← 一个 topic（会话主题）一个目录
│   ├── INDEX.md                    ← topic 概览 + goals 列表
│   └── goal-<id>-<slug>.md         ← 一个 goal 一个文件
└── archive/                        ← 归档的 topic 目录
```

## 映射关系（sessions/ ↔ .logs/）

```
.logs/topics.jsonl        → topic_id  → sessions/topic-<id>-<slug>/
.logs/goals.jsonl         → goal_id   → sessions/topic-<id>-<slug>/goal-<id>-<slug>.md
.logs/discussions/N.jsonl → topic_id  → 蒸馏时读对话（通过 goal 文件 frontmatter.topic_id 关联）
.logs/executions.jsonl    → goal_id   → goal 文件的 Execution Result 段
```

## 文件职责

| 文件 | 写入者 | 内容 | 读取者 |
|------|--------|------|-------|
| `topic-<id>/INDEX.md` | lift 脚本 / 人工 | topic 概览 + goals 列表 | 浏览 + dream 维护 |
| `topic-<id>/goal-<id>.md` | AI 填充（基于 .logs/ 数据） | **澄清事实 + decisions + scope + 执行结果** | distill（蒸馏输入）+ /goal（上下文）|

## goal-note 文件 frontmatter

```yaml
---
goal_id: <N>
goal_slug: <slug>
topic_id: <N>
date: YYYY-MM-DD
type: goal-note

goal_status: pending | in-progress | completed | failed
distill_status: not-distilled | distilled | skipped
distilled_at: YYYY-MM-DD | null

created: YYYY-MM-DD
last_accessed: YYYY-MM-DD
access_count: 0
recent_accesses: []
ttl_days: 90
status: active | archived

source: .logs/goals/<goal_id>
---
```

## goal-note body 结构

```markdown
# Goal: <title>

## Facts（澄清后的事实）

## Decisions（PM 硬约束，蒸馏时为 HARD constraint）

## Scope

## Execution Result
- status / run_id / 产出文件 / 蒸馏产出

## Distill Candidates（蒸馏候选记录）
```

## 蒸馏触发条件

goal 文件满足以下条件 → 可触发蒸馏：
- `goal_status: completed`
- `distill_status: not-distilled`
- body 中 Facts / Scope 段非空

## 跨天 / 跨月 goal

无需特殊处理——goal 文件按 topic 归属，不按日期归属。一个 goal 从 in-progress 到 completed 可能跨任意时段，始终在同一个文件里更新。

## 归档

归档单位 = **topic 目录**（不是单个 goal）：
- topic 下所有 goal 都 distilled + 90 天无 access → 整个 topic 移到 `sessions/archive/`
- 由 dream 模式 Step 11 执行

## Anti-patterns

- ❌ 按天建文件（跨天 goal 无法归属）
- ❌ 在 goal 文件里存完整对话（对话在 .logs/discussions/）
- ❌ distill 往 goal 文件写蒸馏产物（产物写 domain/，不写回 sessions/）
