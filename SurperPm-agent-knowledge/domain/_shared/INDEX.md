# Shared Domain Knowledge Index

> **Purpose**: Cross-cutting knowledge that applies to ALL goals.
> **Updated**: 2026-06-14
> **Loaded**: Always (before any business-specific knowledge)

## Structure

| Subtree | Contents | TTL |
|---------|----------|-----|
| `foundations/` | Universal architectural principles | 365 days |
| `conventions/` | Team-wide coding standards | 180 days |
| `context/` | Current cross-cutting initiatives | 60 days |

## Discovery

At **every** goal start, the `find` skill loads ALL files in `_shared/`:

```
Load order:
1. _shared/foundations/*.md  (always read full text)
2. _shared/conventions/*.md  (grep by tags if > 10 files)
3. _shared/context/*.md      (only where status: active)
```

**Budget**: ~500 tokens

## Distill Rules

### When to write to _shared vs. business-specific

| Question | Target |
|----------|--------|
| Does this apply to ALL business areas? | `_shared/` |
| Does this only apply to user management? | `user-management/` |
| Does this only apply to payments? | `payment/` |
| Is this a team-wide convention? | `_shared/conventions/` |
| Is this specific to one module? | `<module>/conventions/` |

### Examples

**Write to `_shared/foundations/`**:
- "All APIs must use UUID for IDs"
- "Database migrations must be reversible"
- "Git branching: main ← develop ← feature"

**Write to `<business>/foundations/`**:
- "User table uses email as unique identifier"
- "Payment gateway integrates with Stripe"
- "Order status machine: pending → paid → shipped"

## Foundations

*No foundation files in _shared yet. (See parent domain/foundations/)*

## Conventions

*No convention files in _shared yet. (See parent domain/conventions/)*

## Context

*No active cross-cutting context files yet.*

## Unified Frontmatter

Same as domain standard (see parent `INDEX.md`):

```yaml
---
title: "<short-title>"
type: foundation              # foundation | convention | context
tags: [tag1, tag2]

# === Confidence ===
confidence: 0.8
confidence_reason: "reason"
last_verified: YYYY-MM-DD

# === Lifecycle ===
created: YYYY-MM-DD
last_accessed: YYYY-MM-DD
access_count: 0
ttl_days: 365
status: active

# === Provenance ===
source: session/<name>
---
```

## Anti-patterns

- ❌ Don't write module-specific knowledge here
- ❌ Don't duplicate — if exists in business area, don't add to _shared
- ✅ Do write here if unsure — easier to move later than split early
