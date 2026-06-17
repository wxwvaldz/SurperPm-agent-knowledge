# Domain Knowledge Index

> **Purpose**: Index for L1 domain knowledge, organized by business area.
> **Updated**: 2026-06-14

## Structure

Domain knowledge is organized by **business area**. Top-level `domain/` contains **only** `_shared/` + business-area folders. The three semantic subtrees (`foundations/`, `conventions/`, `context/`) **only** appear inside `_shared/` or inside a business-area folder.

```
domain/
├── INDEX.md                 # This file
├── _shared/                 # Cross-cutting knowledge (always loaded)
│   ├── INDEX.md
│   ├── foundations/         # SuperPmAgent-wide architectural facts
│   ├── conventions/         # SuperPmAgent-wide coding standards
│   └── context/             # SuperPmAgent-wide ongoing initiatives
└── <business-area>/         # e.g., payment, growth, marketing
    ├── INDEX.md
    ├── foundations/         # Stable architectural facts in this area
    ├── conventions/         # Team conventions in this area
    └── context/             # Current active work in this area
```

**Anti-pattern (DO NOT)**: Putting `.md` files directly under `domain/foundations/`, `domain/conventions/`, or `domain/context/` (top-level). These three names are reserved as **subtree names** inside `_shared/` and business areas.

## Current Business Areas

| Area | Description | Status |
|------|-------------|--------|
| `_shared` | 跨领域共用（git 规范 / PR review / 当前活跃工作）| active |
| `research` | 科研：论文写作 / 图表设计 / 引用系统 / 可复现性 / peer review | active |
| `frontend` | 前端开发：组件架构 / 状态管理 / 性能优化 / React / 可访问性 | active |
| `backend` | 后端开发：API 设计 / 数据库 / 并发模式 / 错误处理 / 日志 | active |

> 新增业务领域：`mkdir -p domain/<area>/{foundations,conventions,context}` + 创建 `domain/<area>/INDEX.md`。

## Discovery Rules

At goal start, the `find` skill loads:

1. **Always**: `_shared/foundations/*.md` + `_shared/conventions/*.md` + `_shared/context/*.md` (status=active)
2. **By tags**: Match goal tags to business area (e.g., goal mentioning "衰减" → load `decay/`，goal mentioning "蒸馏" → load `distill/`)
3. **By keyword**: Grep across all areas for relevant context

**Budget**: ~1500-2000 tokens for domain knowledge.

## Three Subtrees: foundation / convention / context

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

## Frontmatter Schema

**完整 schema 见 `_meta/frontmatter-schema.md` §2.1**。

本层差异（domain 层特定）：
- `type` 必须是 `foundation` / `convention` / `context`
- **`area` 必填**：`research` / `frontend` / `backend` / `_shared`
- 默认 TTL: foundation=365 / convention=180 / context=60
- 必填 `source: session/<name>`（来自蒸馏，不允许 manual）

### TTL Values（本层 override）

| Type | Default TTL | Extension Criteria |
|------|-------------|-------------------|
| foundation | 365 days | access_count > 10 → +90 days |
| convention | 180 days | access_count > 5 → +90 days |
| context | 60 days | status=active → +60 days |

### Confidence Scoring

完整规则见 `_meta/frontmatter-schema.md` §4。本层常用：

| Source | Initial confidence |
|--------|-------------------|
| Single session extraction | 0.6 |
| User explicit statement | 0.7 |
| Repeated in >=2 sessions | 0.8 |
| User corrects AI | 0.9 |
| Implemented in code/config | 1.0 |

## Distill Rules

### When to write

| Pattern | Type | Target |
|---------|------|--------|
| Architecture decision ("we decided to use X") | foundation | `<area>/foundations/<slug>.md` |
| Team convention ("we should always...") | convention | `<area>/conventions/<slug>.md` |
| Active work ("currently working on X") | context | `<area>/context/<slug>.md` |

### Business Area Decision Tree

1. Extract keywords from the knowledge content
2. Match against area keywords:
   - 论文 / paper / 科研 / 图表 / figure / matplotlib / citation / BibTeX / 可复现 / peer review → `research`
   - 前端 / React / Vue / 组件 / 状态管理 / 性能 / a11y / Tailwind / hooks → `frontend`
   - 后端 / API / REST / 数据库 / migration / 并发 / 限流 / 日志 / 微服务 → `backend`
3. Cross-cutting (applies to ≥2 areas) → `_shared/`
4. No match → ask user to specify or default to `_shared/`

### Quality Gates

- Title must be concise (< 50 chars)
- Tags must be relevant (3-5 tags)
- Confidence must have reason
- Source must reference session
- Content must be actionable
- Max 100 lines per file

## Maintenance

- `/distill summary`: Extracts from sessions → writes here
- `/distill dream`: Archives completed, updates confidence, extends TTL, applies memory decay
- **Decay 维护脚本**：`SuperPmAgent-core/skills/distill/scripts/apply-decay.sh`（v0.7 新增，**脚本触发**）

### Memory Decay Mechanism

**Applied during Dream mode (or apply-decay.sh)**:
- **Formula**: `decay = base_rate × time_factor × usage_factor`
- **Base Rates**: foundation=5%/year, convention=8%/year, context=15%/year
- **Time Factor**: `log(1 + age_years) / log(2)` (logarithmic)
- **Usage Factor**: 0 access=2.0, 1-2=1.0, 3-9=0.5, 10-19=0.3, 20+=0.1
- **Max Decay**: 0.10 per Dream run
- **Grace Period**: age < 30 days → skip decay (避免新知识强制扣分)
- **High-Access Boost**: access_count >= 10 → +0.02~0.10
- **配置文件**：`knowledge/.SuperPmAgent/decay-config.yaml`（v0.7 新增，可配置）

### Manual Verification

**Triggered when confidence < 0.4**:
1. Dream mode flags file for verification
2. PR includes verification questions
3. Human reviewer validates knowledge
4. After verification:
   - `last_verified = today`
   - `verification_status = "verified"`
   - `confidence` restored to initial value (based on source)
   - `verification_count += 1`

## Anti-patterns

- Don't write temporary experiments to foundations (use context)
- Don't duplicate — grep first
- Don't modify main directly — always open PR
- **Don't put files directly under `domain/foundations/` `domain/conventions/` `domain/context/`** (top-level) — these three names are reserved as subtree names inside `_shared/` or business areas
