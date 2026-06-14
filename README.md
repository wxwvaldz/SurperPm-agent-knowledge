# SuperPmAgent
> **Discuss（Human × AI）→ Goal（Agent Loop）→ Learning（Knowledge）**
> 驱动 Agent Loop 向着人类 Attention 不断收敛。

**一句话介绍**：SuperPmAgent 是一个全栈项目的「超级个体」平台。我们认为，项目的交付不止代码——周会总结、会议纪要、客户需求、文档撰写都是交付物。

---

## 🎯 任务目标

PM 用自然语言描述需求 → AI 自动完成**澄清 → 方案拆解 → 模块定位 → 代码生成 → 自动化测试 → 提交 PR** 全链路闭环。各阶段均可人工介入：追加澄清、修订方案、调整模块边界、修订测试用例。

**本质**：人类的注意力从「怎么实现」回归到「想清楚要什么」和「判断对不对」。

**目标群体**：除了 PM，任何一个项目迭代涉及多领域的人都能接管这个平台。从 AI 的角度，我们支持各个 Agent 接入执行，不只是「一个人 + AI」。

**平台边界**：平台负责支持多人协作完成全栈项目交付，通过持续的知识迭代，形成独有的知识壁垒。

---

## 💡 设计理念

1. **工作流 > 单点能力**：当前的核心价值不在让 AI 更强，而在为 AI 建立正确的**工作流**——澄清、拆解、定位、生成、测试、提交，每一步都可观测、可介入。
2. **知识复利有冷启动**：知识注入不是即时生效的——前几次有开销，但**累积 3 次以上后产生显著正向收益**，越用越省。
3. **上下文必须自适应**：简单任务全量注入是「负优化」，会稀释关键信息。注入量必须按任务复杂度动态调节。
4. **评测即信号源**：持续的评测不只是验证手段，更是 Skill 优化的反馈回路——对大型仓库、企业级软件迭代有重大意义。

### 可行性分析

好的 AI Coding 能力会不断被基础模型吞掉——**模型越强，裸 agent 越好用**。但有两样东西不会被吞掉：

- **团队知识库**——组织独有的、随使用增长的资产，沉淀的是「我们怎么做事」。
- **工作流编排**——把分散的 Skill 串成一条可复用的交付链。

因此 SuperPmAgent 的护城河不在某个 Skill 写得多巧妙，而在团队持续使用中沉淀的**知识复利**：用得越久，每次交付越省、越稳。

---

## 🏗️ 架构

```
│ 自然语言 / URL / Issue / 截图
│
┌─ Discuss ──────────────────────────────────────────────────┐
│ Topic（话题分组） → 多轮对话 + 交互卡片（radio/checkbox）    │
│ AI Tool Use：query_goals / query_learnings / propose_goal   │
│ 产出：Goal Proposal 卡片 → 人确认 → 创建 Goal                │
└────────────────────────┬───────────────────────────────────┘
                         │
┌─ Goal ──────────────────▼──────────────────────────────────┐
│ Kanban 看板：Scheduled → Todo → Doing → Review → Done       │
│ 状态管理：Pause / Resume / Retry / Cancel                    │
│ 定时 Goal + Recipes（团队最佳实践共享）                      │
│ 执行引擎：Claude Agent SDK + Plugin Skill Chain              │
│ 观测：WebSocket 实时推送 + Token 监控                        │
└────────────────────────┬───────────────────────────────────┘
                           │
┌─ Learning ──────────────▼──────────────────────────────────┐
│ 自动蒸馏：execution logs → learnings（importance/decay）     │
│ 记忆曲线：score = importance × e^(-λt) + 0.5×ln(1+access)    │
│ 双循环：快循环 learnings/ ↔ 慢循环 domain/                    │
│ 回馈：下一次 Discuss/Goal 自动加载历史知识                    │
└─────────────────────────────────────────────────────────────┘
```

### 系统架构

```
┌─────────────────────────────────────────────────────────────┐
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────────┐  │
│  │ Discuss  │  │   Goal   │  │ Learning │  │  Settings  │  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └─────┬──────┘  │
│  ┌────┴─────────────┴─────────────┴──────────────┴──────┐  │
│  │ EventBus │ Goal Executor │ AI Chat │ Knowledge Distiller│ │
│  └────────┬─────────────┬────────────────────────────────┘  │
└───────────┼─────────────┼────────────────────────────────────┘
   ┌────────┴──────┐       │       ┌───────────────┐
   │  本地 Agent   │       └─────▶ │  远程 Agent    │
   └───────────────┘               └───────────────┘

   ┌────────────────────┐    ┌─────────────────────┐
   │ SuperPmAgent-      │    │ SuperPmAgent-       │
   │   plugins          │    │   knowledge         │
   │  ├ SuperPmAgent-   │    │  ├ profiles/        │
   │  │   core          │    │  ├ domain/          │
   │  ├ SuperPmAgent-   │    │  ├ learnings/       │
   │  │   coding        │    │  ├ extensions/      │
   │  ├ SuperPmAgent-   │    │  └ .logs/           │
   │  │   business      │    └─────────────────────┘
   │  ├ SuperPmAgent-   │
   │  │   io            │
   │  └ SuperPmAgent-   │
   │      learning      │
   └────────────────────┘
```

---

## 📦 仓库结构

| 仓库 | 说明 |
|------|------|
| **SuperPmAgent-web** | 全栈 Web 应用（FastAPI 后端 + React 前端） |
| **SuperPmAgent-plugins** | 插件市场：core / coding / business / io / learning |
| **SuperPmAgent-knowledge** | 共享知识库：profiles / domain / learnings / extensions |

---

## 🛠️ 技术栈

| 层 | 技术 |
|----|------|
| **Frontend** | React 18 + Vite 5 + Tailwind CSS v4 + TanStack Query + Zustand + TypeScript |
| **Backend** | Python 3.12 + FastAPI + SQLModel + uvicorn |
| **Agent** | Claude Agent SDK (claude-agent-sdk) |
| **Data** | SQLite (aiosqlite) + JSONL 文件存储 (KnowledgeStore) |
| **Knowledge Sync** | Git（SuperPmAgent-knowledge 仓库）— JSONL 即数据库，Git 即同步层 |
| **CI/CD** | GitHub Actions（ruff + pytest + vitest + tsc + build） |

---

## 🚀 快速开始

### 环境要求

- Python 3.12+ (uv)
- Node.js 22+ (pnpm)
- Git

### 后端

```bash
cd SuperPmAgent-web/backend
uv sync
cp .env.example .env  # 填入 API key 等配置
uv run uvicorn app.main:app --reload --port 8000
```

### 前端

```bash
cd SuperPmAgent-web/frontend
pnpm install
pnpm dev
```

### 知识库 & 插件

```bash
# SuperPmAgent-knowledge 和 SuperPmAgent-plugins 作为独立仓库同步
# Web 启动后在 Settings 中配置仓库地址
```

---

## 🔮 后续规划

围绕以下方向持续迭代：

- **知识库进化** — 更智能的记忆曲线与蒸馏策略
- **动态上下文策略** — 按任务复杂度自适应注入

---

*更新日期：2026-06-14*
