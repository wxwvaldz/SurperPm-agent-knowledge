# Testing Guide — SuperPmAgent Plugins

验收分三层：结构探针（无需模型）、Claude Code 本地插件、以及 `SuperPmAgent-web` Goal harness。

---

## 本地密钥与 DeepSeek（Claude Code CLI）

默认使用 [DeepSeek Anthropic 兼容 API](https://api-docs.deepseek.com/zh-cn/guides/anthropic_api)：

```env
ANTHROPIC_BASE_URL=https://api.deepseek.com/anthropic
ANTHROPIC_API_KEY=sk-...   # https://platform.deepseek.com/api_keys
ANTHROPIC_MODEL=deepseek-v4-flash
```

| 文件 | 谁读 | 作用 |
|------|------|------|
| `conduit-test/.env.claude.local` | **`start-claude-conduit.ps1`**（优先） | 本地 CLI 测插件 |
| `SuperPmAgent-web/backend/.env` | **uvicorn** | 仅在你本地起 Web 时需要 |

```powershell
# Full local loop (UTF-8 safe on Windows): structure + API + Claude CLI
powershell -NoProfile -ExecutionPolicy Bypass -File SuperPmAgent-plugins\scripts\run-local-loop.ps1

# Skip token step:
powershell -File SuperPmAgent-plugins\scripts\run-local-loop.ps1 -SkipCli
```

模型说明（DeepSeek 文档）：`haiku/sonnet` 映射到 `deepseek-v4-flash`，`opus` 映射到 `deepseek-v4-pro`；也可在 `ANTHROPIC_MODEL` 里直接写 DeepSeek 模型名。

---

## Track C — Web 插件契约（无需 Web UI）

```powershell
python SuperPmAgent-plugins\scripts\test-web-contract.py
python SuperPmAgent-plugins\scripts\test-web-contract.py --record
```

连续手动跑多个 Conduit case 时，case 之间先重置靶仓：

```powershell
powershell -File SuperPmAgent-plugins\scripts\reset-benchmark-target.ps1 -RepoDir conduit-test
```

或使用 `run-benchmark-trio.ps1`（内置 case 间 isolate）。

## 三轨矩阵（Track A + B + C）

Case 集合由 [`benchmark/matrix.json`](benchmark/matrix.json) 定义；靶仓路径见 [`benchmark/targets.json`](benchmark/targets.json)。

```powershell
powershell -File SuperPmAgent-plugins\scripts\run-benchmark-matrix.ps1 -Mode auto -CaseSet standard
powershell -File SuperPmAgent-plugins\scripts\run-benchmark-matrix.ps1 -Mode auto -CaseSet extended -RoundIndex 0
powershell -File SuperPmAgent-plugins\scripts\run-benchmark-matrix.ps1 -Mode auto -ContinueOnFail -RetryFailed 1 -PerCaseTimeoutMinutes 30
```

仓库之间并行、仓库内部串行：

```powershell
powershell -File SuperPmAgent-plugins\scripts\run-benchmark-matrix.ps1 -Mode auto -CaseSet standard `
  -ParallelRepos -RepoParallelism 2 -ContinueOnFail -RetryFailed 1 -PerCaseTimeoutMinutes 30
```

`RepoParallelism` 是同时运行的仓库 lane 数。DeepSeek 文档显示账号级并发上限远高于本地需要（`deepseek-v4-pro` 500、`deepseek-v4-flash` 2500），但本地 Claude CLI、网络和长请求更容易波动；夜间压测默认建议从 `2` 开始，稳定后再试 `3`。

查看 case 集合：

```powershell
python SuperPmAgent-plugins\scripts\benchmark_config.py sets
python SuperPmAgent-plugins\scripts\benchmark_config.py cases --set extended --round-index 1
```

## 夜间多轮压测（Nightly Soak Test）

**只跑测、重置、自动定级，不自动改 `SuperPmAgent-plugins` 代码。** 在外部 PowerShell 中运行（勿依赖 Cursor 后台任务），并关闭系统休眠。

```powershell
cd D:\OneDrive\Work\Competition
powershell -NoProfile -ExecutionPolicy Bypass -File SuperPmAgent-plugins\scripts\run-benchmark-overnight.ps1 `
  -MaxRounds 4 -UntilHours 8 -CaseSet standard -Mode auto `
  -ParallelRepos -RepoParallelism 2 `
  -ContinueOnFail -RetryFailed 1 -PerCaseTimeoutMinutes 30
```

每轮自动：`round new` → Phase A 探针 → Phase B 矩阵 → Phase C `review-benchmark-round.py` → Phase E `reset-round-targets.ps1`（**轮间 conduit 默认原地 `git reset`，不删目录**；缺失或损坏时自动 staging reclone）。

### diverse-20（20 仓 × 20 新 case）

- 清单：`benchmark/diverse20.json`；case：`DV-01`…`DV-20`（与 Conduit/XC 任务语义不同）。
- 首次克隆：`powershell -File SuperPmAgent-plugins/scripts/clone-diverse20-targets.ps1`
- 压测（每轮 1 仓 1 case，共 20 轮）：

```powershell
powershell -File SuperPmAgent-plugins/scripts/run-benchmark-overnight.ps1 `
  -MaxRounds 20 -UntilHours 48 -CaseSet diverse-20 -Mode auto `
  -ContinueOnFail -RetryFailed 1 -PerCaseTimeoutMinutes 45 -RepoParallelism 1
```

### app-50（50 个应用仓 × 50 个 L2+ 专属任务）

- 清单：`benchmark/app50.json`
- case：`AP-01`…`AP-50`
- 目标：证明插件链路在真实应用/全栈仓库中的泛化能力；不替代 Conduit 现场 MVP。
- 每轮只跑 1 个仓库 + 1 个专属 L2+ 任务，避免单仓重复刷题。

```powershell
# 首次或补 clone，使用 longpaths 规避 Windows 长路径 checkout 问题
powershell -File SuperPmAgent-plugins/scripts/clone-app50-targets.ps1

# 全量 50 仓，保守串行；单仓超时后继续下一仓
powershell -File SuperPmAgent-plugins/scripts/run-benchmark-overnight.ps1 `
  -MaxRounds 50 -UntilHours 96 -CaseSet app-50 -Mode auto `
  -ContinueOnFail -RetryFailed 0 -PerCaseTimeoutMinutes 20 `
  -ConduitResetBetweenRounds skip

# 从中间继续，例如从 AP-07 开始跑剩余 44 个
powershell -File SuperPmAgent-plugins/scripts/run-benchmark-overnight.ps1 `
  -MaxRounds 44 -UntilHours 96 -CaseSet app-50 -Mode auto `
  -ContinueOnFail -RetryFailed 0 -PerCaseTimeoutMinutes 20 `
  -RoundIndexOffset 6 -ConduitResetBetweenRounds skip
```

早晨查看：

- `SuperPmAgent-plugins/benchmark/runs/overnight-YYYYMMDD.log`
- `benchmark/runs/round-NNN/ROUND.md`
- `benchmark/runs/round-NNN/review-summary.json`
- `benchmark/runs/round-NNN/OPTIMIZATION_CANDIDATES.md`（仅建议，不自动应用）

单轮复盘：

```powershell
python SuperPmAgent-plugins\scripts\review-benchmark-round.py --round 9
```

---

## 1. 结构探针（推荐先做）

无需 API key、无需 Conduit fork：

```powershell
cd SuperPmAgent-plugins
python scripts/validate_migration.py
```

通过标准：

- 三个插件均有 `.claude-plugin/plugin.json`
- goal/find/distill 与 coding 全链路 skill 存在
- hooks 与 `code_context.py` 可 `py_compile`
- benchmark cases ≥ 11
- 插件协议文件内无 `digest` skill 命名残留（统一为 `distill`）

---

## 2. Web harness（真实 Goal 执行）

配置 `SuperPmAgent-web/backend/.env`：

| 变量 | 说明 |
|---|---|
| `PLUGIN_REPO_PATH` | 本仓 `SuperPmAgent-plugins` 绝对路径 |
| `KNOWLEDGE_REPO_PATH` | 独立仓 `SuperPmAgent-knowledge` 路径 |
| `TARGET_REPO_PATH` | Conduit fork 或练习仓路径 |
| `DOUBAO_API_KEY` / `ANTHROPIC_API_KEY` | 模型 provider |
| `AGENT_MODEL` | 如 `deepseek-v4-flash` |

启动后端并从前端 Goal 页执行 case，例如 `L1-01-reading-count`。

后端单测（需安装依赖；Windows 上 `fcntl` 可能不可用，建议在 Linux/WSL 跑）：

```powershell
cd SuperPmAgent-web/backend
pip install -r requirements.txt
python -m pytest tests/ -q
```

---

## 3. Claude Code 本地插件

前置：`claude` CLI ≥ 2.1，`git`，可选 `gh`。

```powershell
cd <target-git-repo>
claude --plugin D:\path\to\SuperPmAgent-plugins\SuperPmAgent-core
```

在 Claude Code 中：

```
/SuperPmAgent-core:goal "add a .gitignore for Node.js"
```

完整 Conduit 闭环需可 push 的 fork 与 provider key。

---

## 4. Benchmark 记录（按轮次）

每次真实 run 写入：

`benchmark/runs/round-NNN/L1|L2|L3/<case-id>/<run-id>/`

关键产物：`events.jsonl`、`claude-stream.jsonl`（auto 模式）、`git/` 快照。详见 [`benchmark/runs/README.md`](benchmark/runs/README.md)。

```powershell
# 单 case（交互）
powershell -File SuperPmAgent-plugins\scripts\run-benchmark-case.ps1 -CaseId L1-01

# 单 case（无人值守 auto）
powershell -File SuperPmAgent-plugins\scripts\run-benchmark-case.ps1 -CaseId L1-01 -Mode auto

# Demo trio
powershell -File SuperPmAgent-plugins\scripts\run-benchmark-trio.ps1
```

轮次管理：

```powershell
python SuperPmAgent-plugins/scripts/benchmark_run_log.py round show
python SuperPmAgent-plugins/scripts/benchmark_run_log.py round new --note "after optimization"
```

持续自优化循环见 `.cursor/rules/SuperPmAgent-benchmark-optimize-loop.mdc`。

---

## 当前环境 blocker（信息性）

| 项 | 说明 |
|---|---|
| 三仓目录 | plugins / web / knowledge 均存在 |
| 结构探针脚本 | 可运行 |
| Web pytest | Windows 上 `fcntl` 不可用；建议在 Linux/WSL 或配置 `.env` 后重试 |
| Conduit fork | 需用户配置 `TARGET_REPO_PATH` 或 `conduit-test` |
| 真实 PR run | 待 provider key + Conduit fork |

配置齐全后，优先跑 demo trio：`L1-01-reading-count`、`L2-01-article-cover-image`、`L3-03-contradictory-comment-like`。
