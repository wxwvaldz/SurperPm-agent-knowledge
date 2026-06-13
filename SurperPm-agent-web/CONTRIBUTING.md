# Contributing to SuperPmAgent

> 一份**最小可用**贡献指南。看完应该知道:怎么搭环境、怎么写代码、怎么提 PR。
> 详细的技术约束在 [`plan/tech-stack.md`](plan/tech-stack.md);本文是流程层。

## 1. 一次性设置(10 分钟)

```bash
# Clone
git clone git@github.com:itxaiohanglover/SuperPmAgent.git
cd SuperPmAgent

# 装 uv (Python) — macOS
brew install uv

# 启用 pnpm — 任意系统(Node 20+)
corepack enable
corepack prepare pnpm@latest --activate

# Backend
cd backend && uv sync --extra dev && cd ..

# Frontend
cd frontend && pnpm install && cd ..
```

> Windows / Linux 装 uv 见 <https://docs.astral.sh/uv/getting-started/installation/>

## 2. 启动本地 dev

```bash
# 两个终端

# Terminal 1 — backend on :8000
cd backend
uv run uvicorn app.main:app --reload

# Terminal 2 — frontend on :5173
cd frontend
pnpm dev
```

打开 <http://localhost:5173>。前端 `/api/*` 走 Vite proxy 到 `:8000`。

## 3. 阅读顺序(写代码前)

| 顺序 | 文档 | 看什么 |
|---|---|---|
| 1 | [`plan/design.md`](plan/design.md) | 产品最终 spec(锁版,**不可改**) |
| 2 | [`CLAUDE.md`](CLAUDE.md) | 仓库结构 + 模块拆分 + 开发规范 |
| 3 | [`plan/tech-stack.md`](plan/tech-stack.md) | 技术栈横向规范(uv/pnpm/RetroUI/test/CI) |
| 4 | [`plan/modules/<your-module>.md`](plan/modules/) | 你要碰的模块的当前状态 + 待决问题(frontend / backend / plugin / infra) |

## 4. 分支 + 提交规范

```bash
# 分支命名: <module>/<short-slug>
git checkout -b frontend/login-page

# 提交格式: <type>(<module>): <subject>
git commit -m "feat(frontend): add login page"
```

| Type | 用于 |
|---|---|
| `feat` | 新功能 |
| `fix` | 修 bug |
| `refactor` | 不改行为的重构 |
| `chore` | 杂活(依赖升级 / 配置 / 构建) |
| `docs` | 仅文档 |
| `test` | 仅测试 |

| Module | Path |
|---|---|
| `frontend` | `frontend/` |
| `backend` | `backend/` |
| `plugin` | `claude-for-SuperPmAgent/` |
| `infra` | `.github/`, Dockerfile, deploy |
| `docs` | 顶层 markdown |

## 5. 提 PR 前自检(3 条)

```bash
# Backend
cd backend
uv run ruff check .
uv run pytest

# Frontend
cd frontend
pnpm typecheck
pnpm test
pnpm build
```

CI 也会跑这些([`.github/workflows/ci.yml`](.github/workflows/ci.yml)),但本地先过一遍省时间。

## 6. PR 描述模板

```markdown
## What
一句话说改了啥。

## Why
解决什么问题 / 关联哪个 plan/<module>.md 待决项。

## Test plan
- [ ] 后端 pytest 绿 / 不涉及
- [ ] 前端 vitest 绿 + build 成功 / 不涉及
- [ ] 手动验证 ...
```

## 7. 谁审

- 改 `frontend/` → 至少 1 个写过 frontend 的 reviewer
- 改 `backend/` → 至少 1 个写过 backend 的 reviewer
- 改 `claude-for-SuperPmAgent/` 或 `plan/` → 任意一个老成员
- 改 [`plan/design.md`](plan/design.md) → **不接受 PR**(锁版)

## 8. Claude Code 用户须知

我们项目自带 [`.claude/`](.claude/) 配置。打开 Claude Code 时会自动应用允许列表(pnpm / uv / git status / 等),你不需要每次点"允许"。

需要更宽权限做调试 → 写到 `.claude/settings.local.json`(已 gitignore,只你自己看到)。**不要** PR 修 `.claude/settings.json` 加宽权限,除非真的全队都需要。

## 9. 写文档放哪

| 你写的内容 | 放哪 |
|---|---|
| 改了模块的 接口 / 状态 / 待决 | [`plan/modules/<your-module>.md`](plan/modules/) |
| 跨模块技术决策(影响多人) | [`plan/tech-stack.md`](plan/tech-stack.md) 决策日志 |
| 不影响其他人的临时笔记 | 你的 PR 描述 / 分支提交说明 |
| **新功能 spec / 大设计** | 起一个 issue 讨论,**不要**改 [`plan/design.md`](plan/design.md) |

> 严禁在 plan/ 根加新 .md(封顶 3:README + design + tech-stack)。
> plan/modules/ 下 1 模块 1 文件,加新模块需团队 ping。

## 10. 卡住了怎么办

1. 看 [`plan/<module>.md`](plan/) 的 "Open questions" 段——可能有人已经标了
2. GitHub Issues 搜一下
3. 起一个 issue 描述问题(贴你看过哪些文档 + 卡在哪一步)
