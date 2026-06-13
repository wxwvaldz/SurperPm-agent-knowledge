---
title: "Markdown Architecture"
type: foundation
category: domain
tags: [architecture, markdown, knowledge-base]

# === Confidence ===
confidence: 0.9
confidence_reason: "用户明确声明，已在知识库结构中实现"
last_verified: 2026-06-14

# === Lifecycle ===
created: 2026-06-14
last_accessed: 2026-06-14
access_count: 0
ttl_days: 365
status: active

# === Provenance ===
source: session/test-distill-20260614
---

# Markdown Architecture

## Decision

知识库系统采用**纯 Markdown 架构**，不使用数据库。

## Rationale

1. **简化架构**: 无需维护数据库服务器
2. **版本控制**: Git 自带版本历史，易于追踪变更
3. **人类可读**: Markdown 格式便于人工审查
4. **易于协作**: PR 流程天然支持人工审查

## Implementation

```
knowledge/
├── INDEX.md
├── profiles/
── sessions/
├── domain/
│   ├── foundations/
│   ├── conventions/
│   └── context/
└── extensions/
```

所有知识以 Markdown 文件存储，通过 Git 进行版本控制。

## Alternatives Considered

- **数据库方案**: 需要维护服务器，增加复杂度
- **JSON/YAML 存储**: 不易读，不利于人工审查

## Status

✅ Implemented (知识库结构已实现)
