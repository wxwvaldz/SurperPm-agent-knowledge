# PMPilot Knowledge

> 共享知识库 — 领域知识 + 人员画像 + 执行蒸馏 + 学习积累。

## 目录结构

| 目录 | 用途 |
|---|---|
| `profiles/` | 协作者画像 — `team.md` + `users/<github-username>.md` |
| `domain/` | 领域知识 — 编码标准、架构基础、项目上下文 |
| `learnings/` | 学习记录 — 蒸馏产物（memory-curve 评分） |
| `extensions/` | 扩展提示词片段 |
| `skills/` | 核心技能（onboarding） |
| `_meta/` | 元数据规范 |
| `.logs/` | 运行时数据（部分同步，部分本地） |

### .logs/ 同步策略

| 同步到 GitHub | 本地（不同步） |
|---|---|
| `goals.jsonl` — 团队 goal 定义 | `executions.jsonl` — 执行记录 |
| `topics.jsonl` — topic 定义 | `messages/` — 聊天消息 |
| `settings/` — 配置 | `workspace/` — 执行产物 |

## 关联仓库

| 仓库 | 定位 |
|---|---|
| [pmpilot-web](https://github.com/itxaiohanglover/pmpilot-web) | 主应用 |
| [pmpilot-plugins](https://github.com/itxaiohanglover/pmpilot-plugins) | 插件市场 |
