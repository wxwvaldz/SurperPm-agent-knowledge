# 领域知识索引

> **用途**：L1 领域知识索引，按业务领域组织。
> **更新日期**：2026-06-04

## 目录结构

领域知识按**业务领域**组织。顶层 `domain/` 只包含 `_shared/` 和各业务领域文件夹。三个语义子目录（`foundations/`、`conventions/`、`context/`）只出现在 `_shared/` 或业务领域文件夹内部。

```
domain/
├── INDEX.md                 # 本文件
├── _shared/                 # 跨领域通用知识（始终加载）
│   ├── INDEX.md
│   ├── foundations/         # PMPilot 全局架构事实
│   ├── conventions/         # PMPilot 全局编码规范
│   └── context/             # PMPilot 全局进行中事项
└── <business-area>/         # 如 payment、growth、marketing
    ├── INDEX.md
    ├── foundations/         # 本领域稳定架构事实
    ├── conventions/         # 本领域团队约定
    └── context/             # 本领域当前进行中工作
```

**反模式（禁止）**：不允许将 `.md` 文件直接放在 `domain/foundations/`、`domain/conventions/` 或 `domain/context/`（顶层）下。这三个名称保留为 `_shared/` 和业务领域内部的**子目录名**。

## 当前业务领域

| 领域 | 描述 | 状态 |
|------|------|------|
| `_shared` | 跨领域共用（git 规范 / PR review / 当前活跃工作）| active |
| `research` | 科研：论文写作 / 图表设计 / 引用系统 / 可复现性 / peer review | active |
| `frontend` | 前端开发：组件架构 / 状态管理 / 性能优化 / React / 可访问性 | active |
| `backend` | 后端开发：API 设计 / 数据库 / 并发模式 / 错误处理 / 日志 | active |

> 新增业务领域：`mkdir -p domain/<area>/{foundations,conventions,context}` + 创建 `domain/<area>/INDEX.md`。

## 发现规则

goal 启动时，`find` skill 加载：

1. **始终加载**：`_shared/foundations/*.md` + `_shared/conventions/*.md` + `_shared/context/*.md`（status=active）
2. **按 tags 匹配**：将 goal tags 匹配到业务领域（如 goal 提到"衰减"→ 加载 `decay/`，提到"蒸馏"→ 加载 `distill/`）
3. **按关键词**：跨所有领域 grep 匹配相关上下文

**预算**：领域知识约 1500-2000 tokens。

## 三类子目录：foundation / convention / context

每个领域（含 `_shared`）下都有这三档子目录，含义如下：

| 子目录 | 内容 | 寿命 | 例子 |
|--------|------|------|------|
| `foundations/` | **稳定架构事实**：系统设计、数据模型、不变量 | 长（365 天 TTL）| "论文 IMRaD 结构"、"组件架构"、"API 设计" |
| `conventions/` | **团队约定**：编码规范、流程规则 | 中（180 天 TTL）| "React 最佳实践"、"可复现性 checklist"、"日志规范" |
| `context/` | **当前在做的事**：active features、experiments、roadmap | 短（60 天 TTL）| "当前论文项目"、"UI 重构"、"微服务拆分" |

**判定原则**：
- "这件事**几乎不会变**" → foundations
- "这是**团队规则**，新人加入要遵守" → conventions  
- "这是**当下在推进**，3 个月内可能变" → context

## Frontmatter 字段规范

**完整 schema 见 `_meta/frontmatter-schema.md` §2.1**。

本层差异（domain 层特定）：
- `type` 必须是 `foundation` / `convention` / `context`
- **`area` 必填**：`research` / `frontend` / `backend` / `_shared`
- 默认 TTL: foundation=365 / convention=180 / context=60
- 必填 `source: session/<name>`（来自蒸馏，不允许 manual）

### TTL 取值（本层 override）

| 类型 | 默认 TTL | 延长条件 |
|------|----------|----------|
| foundation | 365 days | access_count > 10 → +90 days |
| convention | 180 days | access_count > 5 → +90 days |
| context | 60 days | status=active → +60 days |

### Confidence 评分

完整规则见 `_meta/frontmatter-schema.md` §4。本层常用：

| 来源 | 初始 confidence |
|------|-----------------|
| 单次 session 提取 | 0.6 |
| 用户明确陈述 | 0.7 |
| ≥2 次 session 复现 | 0.8 |
| 用户纠正 AI | 0.9 |
| 在代码/配置中实现 | 1.0 |

## Distill 规则

### 何时写入

| 模式 | 类型 | 目标路径 |
|------|------|----------|
| 架构决策（"我们决定用 X"）| foundation | `<area>/foundations/<slug>.md` |
| 团队约定（"我们应该始终..."）| convention | `<area>/conventions/<slug>.md` |
| 当前工作（"正在做 X"）| context | `<area>/context/<slug>.md` |

### 业务领域决策树

1. 从知识内容中提取关键词
2. 匹配领域关键词：
   - 论文 / paper / 科研 / 图表 / figure / matplotlib / citation / BibTeX / 可复现 / peer review → `research`
   - 前端 / React / Vue / 组件 / 状态管理 / 性能 / a11y / Tailwind / hooks → `frontend`
   - 后端 / API / REST / 数据库 / migration / 并发 / 限流 / 日志 / 微服务 → `backend`
3. 跨 ≥2 个领域 → `_shared/`
4. 无匹配 → 询问用户指定或默认归 `_shared/`

### 质量门禁

- 标题简洁（< 50 字符）
- tags 相关（3-5 个）
- confidence 必须有 reason
- source 必须引用 session
- 内容必须可操作
- 每文件不超过 100 行

## 维护

- `/distill summary`：从 session 提取知识 → 写入此处
- `/distill dream`：归档已完成的，更新 confidence，延长 TTL，应用 memory decay
- **Decay 维护脚本**：`pmpilot-core/skills/distill/scripts/apply-decay.sh`（v0.7 新增，**脚本触发**）

### Memory Decay 机制

**在 Dream 模式（或 apply-decay.sh）中执行**：
- **公式**：`decay = base_rate × time_factor × usage_factor`
- **基础衰减率**：foundation=5%/年, convention=8%/年, context=15%/年
- **时间因子**：`log(1 + age_years) / log(2)`（对数）
- **使用因子**：0 次访问=2.0, 1-2 次=1.0, 3-9 次=0.5, 10-19 次=0.3, 20+ 次=0.1
- **单次最大衰减**：每次 Dream 运行 0.10
- **宽限期**：age < 30 天 → 跳过衰减（避免新知识强制扣分）
- **高访问加成**：access_count >= 10 → +0.02~0.10
- **配置文件**：`knowledge/.pmpilot/decay-config.yaml`（v0.7 新增，可配置）

### 人工校验

**当 confidence < 0.4 时触发**：
1. Dream 模式标记文件需要校验
2. PR 中包含校验问题
3. 人工 reviewer 验证知识
4. 校验完成后：
   - `last_verified = today`
   - `verification_status = "verified"`
   - `confidence` 恢复到初始值（基于 source）
   - `verification_count += 1`

## 反模式

- 不要把临时实验写入 foundations（应用 context）
- 不要重复 — 先 grep
- 不要直接改 main — 始终开 PR
- **不要把文件直接放在 `domain/foundations/` `domain/conventions/` `domain/context/`（顶层）下** — 这三个名称保留为 `_shared/` 或业务领域内部的子目录名
