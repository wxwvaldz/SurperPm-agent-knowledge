# Domain Knowledge Index

> **Purpose**: Index for L1 domain knowledge, organized by business area.
> **Updated**: 2026-06-14

## Structure

Domain knowledge is organized by **business area** for better discoverability:

```
domain/
├── _shared/                 # Cross-cutting knowledge (always loaded)
│   ├── foundations/
│   ├── conventions/
│   └── context/
├── <business-area>/         # e.g., user-management, payment, order
│   ├── foundations/         # Stable architectural facts
│   ├── conventions/         # Team conventions
│   └── context/             # Current project context
└── INDEX.md                 # This file
```

### Current Business Areas

| Area | Description | Subtrees |
|------|-------------|----------|
| `_shared` | Cross-cutting knowledge (loaded for all goals) | foundations/conventions/context |
| *(Add new areas as needed)* | Create subdirectory with 3 subtrees | foundations/conventions/context |

### Discovery Rules

At goal start, the `find` skill loads:

1. **Always**: `_shared/**/*.md` (global knowledge, ~500 tokens)
2. **By tags**: Match goal tags to business area (e.g., `user` → `user-management/`)
3. **By keyword**: Grep across all areas for relevant context

**Budget**: ~1500-2000 tokens for domain knowledge (adjustable)

## Unified Frontmatter Template

All domain files use this structure:

```yaml
---
title: "<short-title>"
type: foundation              # foundation | convention | context
tags: [tag1, tag2]

# === Confidence ===
confidence: 0.8
confidence_reason: "reason"
last_verified: YYYY-MM-DD
verification_status: unverified    # unverified | verified | outdated | disputed
verification_count: 0
last_verification_by: ""
last_confidence_update: YYYY-MM-DD

# === Lifecycle ===
created: YYYY-MM-DD
last_accessed: YYYY-MM-DD
access_count: 0
ttl_days: 365                 # see TTL table below
status: active

# === Provenance ===
source: session/<name>
---
```

### Field Order

1. Basic info: `title`, `type`, `tags`
2. Confidence: `confidence`, `confidence_reason`, `last_verified`, `verification_status`, `verification_count`, `last_verification_by`, `last_confidence_update`
3. Lifecycle: `created`, `last_accessed`, `access_count`, `ttl_days`, `status`
4. Provenance: `source`

### TTL Values

| Type | Default TTL | Extension Criteria |
|------|-------------|-------------------|
| foundation | 365 days | access_count > 10 → +90 days |
| convention | 180 days | access_count > 5 → +90 days |
| context | 60 days | status=active → +60 days |

### Confidence Scoring

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
| Architecture decision ("we decided to use X") | foundation | `foundations/<slug>.md` |
| Team convention ("we should always...") | convention | `conventions/<slug>.md` |
| Active work ("currently working on X") | context | `context/<slug>.md` |

### Quality Gates

- Title must be concise (< 50 chars)
- Tags must be relevant (3-5 tags)
- Confidence must have reason
- Source must reference session
- Content must be actionable
- Max 100 lines per file

## Discovery

At goal start:
1. Always read: `foundations/*.md` (full text)
2. Grep: `conventions/` by matching tags
3. Grep: `context/` where `status: active`

## Maintenance

- `/summary`: Extracts from sessions → writes here
- `/dream`: Archives completed, updates confidence, extends TTL, applies memory decay

### Memory Decay Mechanism (NEW)

**Applied during Dream mode**:
- **Formula**: `decay = base_rate × time_factor × usage_factor`
- **Base Rates**: foundation=5%/year, convention=8%/year, context=15%/year
- **Time Factor**: `log(1 + age_years) / log(2)` (logarithmic)
- **Usage Factor**: 0 access=2.0, 1-2=1.0, 3-9=0.5, 10-19=0.3, 20+=0.1
- **Max Decay**: 0.10 per Dream run
- **High-Access Boost**: access_count >= 10 → +0.02~0.10

### Manual Verification (NEW)

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
