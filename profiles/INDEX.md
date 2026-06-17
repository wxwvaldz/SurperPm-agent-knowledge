# Profiles Index

> **Purpose**: L0 profile layer (always visible to all goals).
> **Updated**: 2026-06-14

## Structure

| File | Purpose | Frequency | Load | Budget |
|------|---------|-----------|------|--------|
| `team.md` | Team profile (tech stack, members) | Monthly | Frontmatter only | ~200 |
| `users/<id>.md` | Personal preferences | Quarterly | On-demand | ~100 |

## Frontmatter Schema

**完整 schema 见 `_meta/frontmatter-schema.md` §2.2 (team.md) + §2.3 (users/<id>.md)**。

本层差异（profile 层特定）：
- `type` 必须是 `profile`
- `tags` 必含 `team` 或 `user` 前缀
- 默认 `ttl_days: 180`
- `source` 通常是 `setup` 或 `session/<name>`
- profiles 不允许包含 PII / 敏感数据（见下方 Anti-patterns）

参考 5 个真实 user profile 作样板：`alice-chen.md` / `bob-wang.md` / `carol-liu.md` / `david-zhao.md` / `eve-sun.md`

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
