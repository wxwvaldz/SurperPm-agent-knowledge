---
title: "Frontmatter Format Convention"
type: convention
category: domain
tags: [frontmatter, format, convention, metadata]

# === Confidence ===
confidence: 0.8
confidence_reason: "在多个 session 中重复，已在 INDEX.md 中定义"
last_verified: 2026-06-14

# === Lifecycle ===
created: 2026-06-14
last_accessed: 2026-06-14
access_count: 0
ttl_days: 180
status: active

# === Provenance ===
source: session/test-distill-20260614
---

# Frontmatter Format Convention

## Rule

所有知识库文件的 frontmatter **必须按照固定顺序**排列。

## Field Order

### 1. Basic Information
```yaml
title: "<short-title>"
type: foundation|convention|context
category: domain
tags: [tag1, tag2, tag3]
```

### 2. Confidence (if needed)
```yaml
# === Confidence ===
confidence: 0.8
confidence_reason: "用户多次表达"
last_verified: YYYY-MM-DD
```

### 3. Lifecycle
```yaml
# === Lifecycle ===
created: YYYY-MM-DD
last_accessed: YYYY-MM-DD
access_count: 5
ttl_days: 180
status: active
```

### 4. Provenance
```yaml
# === Provenance ===
source: session/<name>
```

## Examples

### Domain Files (need confidence)
```markdown
---
title: "User Model"
type: foundation
category: domain
tags: [user, model, database]

# === Confidence ===
confidence: 1.0
confidence_reason: "已在代码中实现"
last_verified: 2026-06-14

# === Lifecycle ===
created: 2026-06-14
last_accessed: 2026-06-14
access_count: 5
ttl_days: 365
status: active

# === Provenance ===
source: session/add-phone-field-20260614
---
```

### Profile Files (no confidence)
```markdown
---
name: "Team Profile"

# === Lifecycle ===
created: 2026-06-14
last_accessed: 2026-06-14
access_count: 0
ttl_days: 180
status: active

# === Provenance ===
source: setup
---
```

## Enforcement

- ✅ All INDEX.md files define this convention
- ✅ All example files follow this format
- ❌ PR review will reject non-compliant files

## Rationale

1. **一致性**: 统一格式便于 AI 解析
2. **可读性**: 注释分隔符清晰标识各部分
3. **可维护性**: 固定顺序降低维护成本
