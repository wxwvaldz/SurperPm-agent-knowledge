---
title: "卷牛魔团队"
type: profile
tags: [team, pmpilot, knowledge-base]

confidence: 0.95
confidence_reason: "git 贡献者 + 本轮协作实测"
last_verified: 2026-06-05
verification_status: verified
verification_count: 2

created: 2026-05-25
last_accessed: 2026-06-05
access_count: 16
recent_accesses:
  - 2026-06-05T13:00:00+08:00
ttl_days: 180
status: active

source: setup + git-log-verified
---

# 卷牛魔团队

## 基本信息

- **团队名称**: 卷牛魔
- **协作语言**: 中文为主，技术文档英文
- **团队规模**: 2 人 + 1 AI 协作者
- **业务定位**: 科研 + 全栈开发团队

## 成员

| 成员 | 角色 | 负责模块 | 画像 |
|------|------|---------|------|
| itxaiohanglover | 技术负责人（Owner） | PMPilot 产品开发 + 知识库内容 | `users/itxaiohanglover.md` |
| mrjlv1 | 知识库架构师 | 知识库架构设计 + 蒸馏机制 + distill skill | `users/mrjlv1.md` |
| Claude | AI 协作者 | v0.7-v0.8 迭代实施 | `users/claude.md` |
| pmpilot-bot | 自动 commit | .logs/ 自动同步 | 不算"人" |

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React + TypeScript + Vite + RetroUI |
| 后端 | Python 3.12 + FastAPI + SQLAlchemy |
| AI | Anthropic Claude SDK / 智谱 GLM |
| 存储 | JSONL (KnowledgeStore) + SQLite (敏感数据) |
| 知识库 | 纯 Markdown + YAML frontmatter + Git |
| 版本控制 | Git + GitHub |
| 包管理 | uv (Python) + pnpm (前端) |

## 协作关系

- **决策链**: itxaiohanglover（Owner 拍板） → mrjlv1（架构设计） → Claude（执行）
- **PR review**: itxaiohanglover 最终审批
- **节奏**: 当前密集开发期，未来转向"周级 dream + 月级 review"

## 工作约定

- **代码审查**: 所有变更需要 PR 审查
- **提交格式**: `<type>(<module>): <subject>` (feat/fix/chore/docs/refactor)
- **分支策略**: 从 main 分支，`<module>/<slug>` 命名
- **测试要求**: pytest + vitest，关键路径必须有测试
- **schema 变更**: 先改 `_meta/frontmatter-schema.md`，再同步代码 + INDEX
- **plugin 目录**: 别人维护的代码不随意改动
- **定时任务**: 由后端调度，知识库不起 cron

## AI 偏好（团队级）

- **风格**: 简洁、可执行，避免过度抽象
- **输出语言**: 技术沟通用中文，code identifier 用英文
- **决策依据**: 跑脚本验证 > 文档描述 > 设计意图

## 当前焦点

1. **科研**: Knowledge-as-Code 论文写作
2. **前端**: React + Tailwind 后台迁移
3. **后端**: 微服务拆分
4. **知识沉淀**: 用蒸馏机制自动沉淀开发 + 科研经验
