# 扩展索引

> **Updated**: 2026-06-04
> **Status**: ✅ Active — pre-tool-use.py resolver 已接通

Extension prompts injected by `pmpilot-core/hooks/pre-tool-use.py` at every
tool/skill/MCP call. Filter is deterministic (priority + keyword overlap)
— no LLM needed for MVP; future upgrade can swap to Haiku micro-call.

## 目录结构

```
extensions/
├── skills/
│   ├── coding/             ← 通用编码 (tdd / style)
│   ├── frontend/           ← React 组件强约束
│   ├── backend/            ← API 设计强约束
│   ├── distill/            ← 蒸馏 business-area mapping
│   └── research-figure/    ← 科研图风格 + 学术配色 + 生图 prompt
├── mcp/
│   ├── feishu-doc/         ← 飞书文档清洗
│   └── image-gen/          ← AI 生图学术风格 prompt 包装
└── plugins/                ← 整个 plugin 的全局引导
```

## 当前文件

### skills/

| 文件 | 目标 | 优先级 | 触发时机 |
|------|------|--------|----------|
| `skills/coding/tdd.md` | skill:coding | high | 开发业务 / 改核心模块 |
| `skills/coding/style.md` | skill:coding | medium | 重构 / code review |
| `skills/distill/business-area-mapping.md` | skill:distill | high | distill 时决定 area |
| `skills/frontend/react-component.md` | skill:coding | high | 写新 React 组件 |
| `skills/backend/api-design.md` | skill:coding | high | 写新 API endpoint |
| `skills/research-figure/matplotlib-style.md` | skill:research-figure | high | 用 matplotlib 画论文图 |
| `skills/research-figure/academic-color-palette.md` | skill:research-figure | high | 科研图选色 |
| `skills/research-figure/figure-generation-prompt.md` | skill:research-figure | high | AI 生图科研示意图 |

### mcp/

| 文件 | 目标 | 优先级 | 触发时机 |
|------|------|--------|----------|
| `mcp/feishu-doc/strip-toc.md` | mcp:feishu-doc | high | 拉飞书 PRD/需求 |
| `mcp/image-gen/academic-style-prompt.md` | mcp:image-gen | high | 调 image-gen 画科研图 |

### plugins/

| 文件 | 目标 | 优先级 | 触发时机 |
|------|------|--------|----------|
| (无) | — | — | — |

## 质量规则

- 单个 target 下 extension ≤5 个（防爆炸）
- body ≤2000 字符（防注入膨胀）
- when 必须互斥可分（避免一次注入多个相关 fragment）
- priority 分布：high ≤50%、medium 主体、low 兜底
- 必须从真实 session 蒸馏（带 `source: session/...`），禁止凭空手写

## 反模式

- ❌ 默认全注入（违反 resolver 第 4 步）
- ❌ body 写长篇知识文档（属于 domain/）
- ❌ tags 用宽泛词（如 "code"、"AI"）
- ❌ when 写"任何时候"
