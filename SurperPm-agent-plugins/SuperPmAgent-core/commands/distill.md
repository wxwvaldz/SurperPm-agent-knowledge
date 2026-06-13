---
description: >
  Trigger knowledge distillation. Three modes available:
  auto-distill (automatic), summary (manual from session), dream (knowledge base maintenance).
argument-hint: "<mode: summary|dream> [session-name]"
---

# /SuperPmAgent-core:distill

Mode: **$ARGUMENTS**

## Available Modes

| Mode | Trigger | Purpose | Read |
|------|---------|---------|------|
| **auto-distill** | **Automatic** (stop.py hook after /goal) | Extract skills + knowledge from completed goal | `auto-distill.md` |
| **summary** | Manual: `/distill summary <session>` | Extract knowledge from historical session | `summary.md` |
| **dream** | Manual: `/distill dream` | Scan & maintain entire knowledge base | `dream.md` |

## Mode Details

### auto-distill (Automatic)

**Cannot be manually invoked.** Automatically triggered by `hooks/stop.py` when a /goal completes.

Extracts from the current conversation + git diff:
- Reusable procedures → `SuperPmAgent-*/skills/<slug>/SKILL.md`
- Architecture decisions → `knowledge/domain/<area>/<slug>.md`
- CI failure patterns → `SuperPmAgent-coding/skills/fixes/<slug>/SKILL.md`

All changes submitted via PR: `distill/auto-<session>`

### summary <session-name> (Manual)

Read a session's conversation and notes, extract knowledge to domain layer.

**Use when**: You want to distill knowledge from past conversations without running a goal.

Steps:
1. Read session files (`conversation.md`, `notes.md`, `decisions.md`)
2. Identify knowledge candidates (decisions, conventions, preferences)
3. Generate knowledge files with unified frontmatter
4. Check for duplicates
5. Open PR: `distill/summary-<session>-<slug>`

### dream (Manual)

Scan the entire knowledge base, check TTL/confidence/conflicts, archive stale entries.

**Use when**: Periodic maintenance (recommended: weekly).

Steps:
1. Scan all knowledge files and extract frontmatter
2. Apply maintenance rules (TTL expiry, confidence decay, conflict detection)
3. Perform approved actions (delete/archive/extend)
4. Generate maintenance report
5. Open PR: `distill/dream-<YYYY-MM-DD>`

## Shared Rules

- **Never modify main directly** — always open PR
- **Check for duplicates** before creating new files
- **Update INDEX.md** after any changes
- **Quality gates**: Skip if content < 30% novel or description > 1024 chars
