# Shared Domain Knowledge Index

> **Purpose**: Cross-cutting knowledge that applies to ALL goals.
> **Updated**: 2026-06-14
> **Loaded**: Always (before any business-specific knowledge)

## Structure

| Subtree | Contents | TTL |
|---------|----------|-----|
| `foundations/` | SuperPmAgent 跨域架构事实 | 365 days |
| `conventions/` | SuperPmAgent 跨域团队约定 | 180 days |
| `context/` | SuperPmAgent 跨域当前推进事项 | 60 days |

## Files

### Foundations

| File | Title | Confidence | Updated |
|------|-------|-----------|---------|
| `foundations/markdown-architecture.md` | Markdown + Git 架构基石 | 0.9 | 2026-06-14 |
| `foundations/user-model.md` | 用户模型与身份体系 | 0.85 | 2026-06-14 |
| `foundations/api-id-uuid.md` | 所有 API 用 UUID 作主键 | 0.9 | 2026-06-14 |
| `foundations/migration-reversible.md` | 数据库 migration 必须可回滚 | 0.85 | 2026-06-14 |

### Conventions

| File | Title | Confidence | Updated |
|------|-------|-----------|---------|
| `conventions/coding-standards.md` | 编码规范（命名、注释、错误处理）| 0.9 | 2026-06-14 |
| `conventions/frontmatter-format.md` | Frontmatter 格式约定 | 0.95 | 2026-06-14 |
| `conventions/git-branch-naming.md` | Git 分支命名规范 | 0.9 | 2026-06-14 |
| `conventions/pr-review-protocol.md` | PR 审核流程与 checklist | 0.85 | 2026-06-14 |

### Context

| File | Title | Confidence | Updated |
|------|-------|-----------|---------|
| `context/active-features.md` | 当前在做的特性总览 | 0.8 | 2026-06-14 |
| `context/distill-testing.md` | 蒸馏测试笔记 | 0.7 | 2026-06-14 |

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
| Does this only apply to one area? | `<area>/` (e.g., `payment/`) |
| Is this a team-wide convention? | `_shared/conventions/` |
| Is this specific to one business area? | `<area>/conventions/` |

### Examples

**Write to `_shared/foundations/`**:
- "All APIs must use UUID for IDs"
- "Database migrations must be reversible"
- "Git branching: main ← develop ← feature"

**Write to `<area>/foundations/`** (例：payment):
- "Payment gateway integrates with Stripe"
- "Refund must verify idempotency key"
- "Settlement cycle: T+1 to merchants"

## Unified Frontmatter

Same as domain standard (see parent `INDEX.md`). 必填字段 `area: _shared`。

## Anti-patterns

- ❌ Don't write area-specific knowledge here (use `<area>/`)
- ❌ Don't duplicate — if exists in business area, don't add to _shared
- ✅ Do write here if applies to **2 or more** areas
