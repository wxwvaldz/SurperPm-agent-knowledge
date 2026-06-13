# Profiles Index

> **Purpose**: L0 profile layer (always visible to all goals).
> **Updated**: 2026-06-14

## Structure

| File | Purpose | Frequency | Load | Budget |
|------|---------|-----------|------|--------|
| `team.md` | Team profile (tech stack, members) | Monthly | Frontmatter only | ~200 |
| `users/<id>.md` | Personal preferences | Quarterly | On-demand | ~100 |

## Unified Frontmatter Template

All profile files use the same structure as domain files:

**team.md**:
```yaml
---
title: "<team-name> Team Profile"
type: profile
tags: [team]

# === Confidence ===
confidence: 0.9
confidence_reason: "用户在 /setup 中填写"
last_verified: YYYY-MM-DD

# === Lifecycle ===
created: YYYY-MM-DD
last_accessed: YYYY-MM-DD
access_count: 0
ttl_days: 180
status: active

# === Provenance ===
source: setup
---
```

**users/<staff-id>.md**:
```yaml
---
title: "<name>"
type: profile
tags: [user, <staff-id>]

# === Confidence ===
confidence: 0.9
confidence_reason: "用户明确表达偏好"
last_verified: YYYY-MM-DD

# === Lifecycle ===
created: YYYY-MM-DD
last_accessed: YYYY-MM-DD
access_count: 0
ttl_days: 180
status: active

# === Provenance ===
source: session/<name>
---
```

### Field Order

1. Basic info: `title`, `type`, `tags`
2. Confidence: `confidence`, `confidence_reason`, `last_verified`
3. Lifecycle: `created`, `last_accessed`, `access_count`, `ttl_days`, `status`
4. Provenance: `source`

## Distill Rules

### team.md

- **When**: Tech stack changes, new member joins
- **How**: Update via PR
- **Source confidence**: 0.9 (user provided in /setup)

### users/<staff-id>.md

**When to write** (via `/summary` or `/distill summary`):

| Signal | Initial confidence | Example |
|--------|-------------------|---------|
| User states preferences directly | 0.9 | "I prefer TypeScript over JavaScript" |
| AI infers from repeated behavior | 0.7 | "User consistently writes TDD style" |
| User corrects AI repeatedly | 0.9 | "No, use pnpm not npm" |

**Body template**:
```markdown
# <name>

## Role
<role>

## Preferences

### Communication
- Style: <concise/detailed>
- Language: <Chinese/English>

### Technical
- Languages: <Python/TypeScript>
- Frameworks: <FastAPI/React>

### Workflow
- Testing: <TDD/after>
- Review: <quick/detailed>
```

## Discovery

At goal start:
1. Always read: `team.md` frontmatter (~200 tokens)
2. If user identified: Read `users/<id>.md` frontmatter
3. Need details: Grep full file

## Anti-patterns

- No personal info beyond work preferences (privacy)
- No sensitive data
- Max 100 lines per user file
