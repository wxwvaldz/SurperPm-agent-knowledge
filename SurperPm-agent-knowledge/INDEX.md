# Knowledge Index

> **Purpose**: Root index for `find` skill to discover all knowledge documents.
> **Discovery**: The `find` skill globs `knowledge/**/INDEX.md` (excluding `extensions/` which is reserved for hook-injected prompts).
> **Usage**: Used by `SuperPmAgent-core`'s `find` skill to discover knowledge documents.
> **Updated**: 2026-06-14

## Structure

| Subtree | Purpose | Change Frequency | Load Strategy |
|---------|---------|------------------|---------------|
| `profiles/` | Team and personal profiles | Monthly/Quarterly | L0: Always visible |
| `sessions/` | Multi-turn chat folders (one = one /goal context) | Daily | L2: Private to its goal |
| `domain/` | Business domain knowledge (foundations/conventions/context) | Weekly/Monthly/Yearly | L1: Always visible |
| `extensions/` | Extension prompts (hook-injected) | On-demand | Hook only |

## Knowledge Flow

```
Session Chat → /summary → Domain Knowledge (L1)
Goal Execution → auto-distill → Skills (coding/business)
/dream (nightly) → Knowledge Maintenance
```

## Sub-Indexes

- [profiles/INDEX.md](profiles/INDEX.md)
- [sessions/INDEX.md](sessions/INDEX.md)
- [domain/INDEX.md](domain/INDEX.md)
- [extensions/INDEX.md](extensions/INDEX.md)

## Token Budget (Goal Start)

| Source | Strategy | Budget |
|--------|----------|--------|
| profiles/team.md (frontmatter) | Always load | ~200 |
| domain/foundations/*.md | Always load (full) | ~2000 |
| Session notes.md | Always load (if linked) | ~500 |
| Session conversation.md | Last 20 turns | ~1500 |
| domain/conventions/ | Grep by tags | ~500 |
| domain/context/ (status: active) | Grep | ~500 |
| **Total** | | **~5200** |

Limit: 7000 tokens. Agent greps for more during execution.
