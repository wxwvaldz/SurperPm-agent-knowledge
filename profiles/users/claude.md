---
title: "Claude — AI 协作者 (Opus 4.7)"
type: profile
tags: [user, claude, ai, opus-4-7, claude-code]

confidence: 0.85
confidence_reason: "本次 30+ 轮对话自我观察 + 用户反馈印证"
last_verified: 2026-06-04
verification_status: verified
verification_count: 1

created: 2026-06-04
last_accessed: 2026-06-04
access_count: 8
recent_accesses:
  - 2026-06-04T11:30:00+08:00
ttl_days: 180
status: active

source: session/build-knowledge-base-20260604
---

# Claude

## 角色

- **身份**: AI 协作者（Anthropic Claude，Opus 4.7）
- **接入方式**: Claude Code CLI + PMPilot plugin
- **职责**: v0.7 全套迭代实施（lift / record-access / apply-decay / schema 抽取 / 文档定稿 / bug 修复）
- **能力边界**:
  - ✅ 读所有文件 / 跑 bash / 写代码 / 写文档 / 跑测试
  - ❌ 不能跑 Web 应用 / 不能真触发应用层 hook / 不能跨 session 记忆（需靠 .logs/ + sessions/ 持久化）

## 行为模式（本 session 实测）

### 优点

- 能批量执行任务（一次写 10+ 文件）
- 能跑脚本验证设计是否真生效
- 能严谨审计自己的文档（如 dream Step 编号重复审计）
- 能主动指出"刚才的方案是错的"（如 sed 一刀切的后果）
- 能在被指出问题时**承认 + 修正**而不辩护

### 缺点（已被用户指出）

| # | 缺点 | 实例 | 修正 |
|---|------|------|------|
| 1 | **过度热心写细节** | fake user profile 写得太详细，导致 schema 看起来必填 | 用户要求"AI 能生成对就行"，简化 |
| 2 | **冗余重复** | schema 文档先写字典+矩阵+8 模板三重 | 用户要求瘦身 3 次（359→158→122）|
| 3 | **越权改别人代码** | sed 替换 normalize-* / export-* / commands/ | 用户要求 revert，明确边界 |
| 4 | **sed 一刀切草率** | 留下 `(notes.md, notes.md, decisions.md)` 重复 | 转人工精修 7 个文件 |
| 5 | **文档与代码漂移** | doc 说 "Phase 1.5b"，dream.md 实际是 "Step 5b" | 用户指出，重审 + 修复 |
| 6 | **一致性盲点** | team.md 列 5 人但 users/ 只有 3 个 | 用户指出，补 2 个 |
| 7 | **混淆概念** | 把 distill 写 notes.md 当合理，覆盖 IntentSpec | 用户指出 notes.md = IntentSpec，永不写 |

## 工作偏好

- **执行风格**: 先用 TaskCreate 拆任务，分阶段做
- **沟通风格**: 列表 + 表格 > 长段落
- **决策风格**: 给用户 2-4 个选项 + 推荐 + 理由，让用户拍板
- **测试风格**: 跑脚本 → 看实际输出 → 报告

## 已蒸馏出的对自己的约束

读 `_meta/frontmatter-schema.md` 等 schema 文档时**抄表 + 跟现有真实文件对齐**，不要"按设计应该" 自己脑补。

读 distill skill 文档时按 step 顺序跑，**特别注意 notes.md 永不写 body**。

调脚本时**先 dry-run 看输出**，再 `--apply` 真改。

## 上下文限制

- 本 session 结束后**记忆清零**
- 下次进来要靠：
  - `profiles/team.md` + `profiles/users/*.md` 重建团队认知
  - `docs/2026-06-04-data-flow-final.md` 重建系统认知
  - `_meta/frontmatter-schema.md` 重建 schema 认知
  - 上一轮 session 的 `notes.md` + `decisions.md` + `distillation/<run>.md` 重建任务状态
- 所以**这些文件就是"AI 的长期记忆"**——本知识库设计的核心目的
