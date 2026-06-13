---
name: distill
description: |
  Post-loop distiller with three modes:
  (1) auto-distill after /goal completes — read auto-distill.md
  (2) summary — extract knowledge from a session to domain layer — read summary.md
  (3) dream — scan and maintain the entire knowledge base — read dream.md
  All changes submitted via PR for human review. Never modifies main directly.
---

# distill

Post-loop knowledge distiller. Select the correct mode and follow its steps.

## Mode Selection

| Mode | Trigger | Read |
|------|---------|------|
| auto-distill | stop.py hook after /goal completes | `auto-distill.md` |
| summary | `/SuperPmAgent-core:distill summary <session>` | `summary.md` |
| dream | `/SuperPmAgent-core:distill dream` | `dream.md` |

Read the relevant `.md` file in this directory and execute its steps exactly.

## Shared Rules (ALL modes must follow)

These rules are enforced by the SKILL.md and apply to ALL modes.

### 1. PR Convention

- **Never modify main directly** — always open PR
- Branch: `distill/<mode>-<slug>` (e.g. `distill/auto-add-phone`, `distill/summary-test-session`, `distill/dream-2026-06-13`)
- Commit message: `distill(<mode>): <description>`
- PR title: `distill/<mode>: <description>`
- PR body: list all changes with rationale
- Create **ONE PR** for all artifacts in a single distillation run

### 2. Quality Gates (refuse to PR if any fail)

- Generated file description > 1024 chars (SKILL.md limit)
- Slug already exists and content is < 30% novel (use dedup algorithm below)
- No valuable content extracted
- Risk level too high (requires manual intervention)

### 3. Deduplication Algorithm (BEFORE creating any file)

**Use script**: `scripts/dedup-check.sh`

```bash
./SuperPmAgent-core/skills/distill/scripts/dedup-check.sh "<keywords>" "<target-directory>"
```

**Manual steps** (if script not available):

**Step 1**: Extract keywords from new content
- Take title, first 3 headings, and key terms
- Example: "add-db-field" → ["add", "database", "field", "migration", "column"]

**Step 2**: Grep each keyword in target directory

**Step 3**: Read top 3 matches and calculate similarity:
- Overlapping headings (40% weight)
- Overlapping code examples (40% weight)
- Overlapping keywords (20% weight)

**Step 4**: Decision matrix

| Similarity | Action |
| > 70% | Skip (too similar, < 30% novel) |
| 50%-70% | Update existing file |
| 30%-50% | Create new with different slug |
| < 30% | Create new |

### 4. Business Area Classification

Before creating knowledge files, determine the business area using this decision tree:

**Step 1: Extract keywords** from the knowledge content
- Take the title, first 3 headings, and key terms
- Example: "Users must have unique UUIDs" → ["user", "uuid", "unique", "identifier"]

**Step 2: Match against business area patterns**

| Keyword Pattern | Business Area | Target Directory | Examples |
|----------------|---------------|------------------|----------|
| user, profile, account, avatar | `user-management` | `knowledge/domain/user-management/` | phone field, user UUID, profile update |
| payment, billing, invoice, refund | `payment` | `knowledge/domain/payment/` | payment gateway, refund policy |
| order, cart, checkout, shipment | `order` | `knowledge/domain/order/` | order status, cart management |
| auth, login, permission, OAuth, RBAC | `authentication` | `knowledge/domain/authentication/` | login flow, permission model |
| api, endpoint, route, REST, GraphQL | `api-design` | `knowledge/domain/api-design/` | API conventions, error handling |
| test, ci, cd, pipeline, deploy | `devops` | `knowledge/domain/devops/` | testing strategy, CI/CD |
| database, migration, schema, SQL | `database` | `knowledge/domain/database/` | migration patterns, indexing |
| ui, component, form, modal, table | `frontend` | `knowledge/domain/frontend/` | component patterns, form validation |
| **general, cross-cutting, applies to all** | `_shared` | `knowledge/domain/_shared/` | Markdown architecture, frontmatter format |

**Step 3: Decision rules**

1. **Single match**: Use the matched business area
   - Example: ["user", "phone"] → `user-management`

2. **Multiple matches**: Use `_shared` (cross-cutting concern)
   - Example: ["user", "api", "validation"] → `_shared`

3. **No match**: Create new area folder (requires team approval in PR)
   - Example: ["blockchain", "smart-contract"] → Create `knowledge/domain/blockchain/`
   - Add to INDEX.md with rationale

4. **Uncertain**: Default to `_shared` and flag for review
   - Add to PR body: "⚠️ Business area uncertain, please review"

**Step 4: Validate**

- Check if the target directory exists
- If not, create it with an INDEX.md
- Update the parent `knowledge/domain/INDEX.md`

### 5. Index Maintenance

For each file created/modified/deleted:

1. Identify business area (see Section 4)
2. Update the relevant INDEX.md:

Checklist:
- [ ] `knowledge/domain/INDEX.md` (always)
- [ ] `knowledge/domain/<area>/INDEX.md` (if area has INDEX.md)
- [ ] `knowledge/domain/_shared/INDEX.md` (if _shared area)
- [ ] `SuperPmAgent-business/skills/INDEX.md` (if skill created)
- [ ] `SuperPmAgent-coding/skills/INDEX.md` (if skill created)

### 6. Anti-patterns (NEVER do these)

- Don't extract trivial details that aren't reusable
- Don't create files without checking for duplicates first
- Don't delete knowledge without archiving first
- Don't merge files with low similarity (< 50%)
- Don't skip quality gates to "just get it done"
- Don't create knowledge files without determining business area (see Section 4)

### 7. Distillation Status (REQUIRED for all distilled files)

**Every file that is created or modified by distillation MUST have a Distillation Status section.**

This section fuses Confidence and Lifecycle tracking for transparency.

#### Location

Insert the Distillation Status section **immediately after the frontmatter** and **before the main content**.

#### Format

```markdown
---
(name, type, confidence, lifecycle, provenance, etc.)
---

# Distillation Status

**Distilled**: YYYY-MM-DD  
**Mode**: auto-distill | summary | dream  
**Session**: `<session-name>`  
**Confidence**: 0.X (source: <reason>)  
**Lifecycle**: created=YYYY-MM-DD, ttl_days=N, status=active  
**Artifacts**: N files created/updated

| File | Type | Confidence |
|------|------|-----------|
| `knowledge/domain/...` | foundation | 0.9 |
| `SuperPmAgent-coding/skills/.../SKILL.md` | skill | 0.8 |

**INDEX.md Updated**:
- [x] `knowledge/domain/INDEX.md`
- [x] `knowledge/domain/<area>/INDEX.md`
- [ ] `knowledge/domain/_shared/INDEX.md` (if applicable)

**Quality Gates**:
- [x] Deduplication checked
- [x] Business area classified
- [x] Frontmatter complete
- [x] INDEX.md updated

---

# Main Content

(The actual knowledge or skill content starts here)
```

#### Rules

1. **Always include**: Even if only 1 file is created
2. **Fuse Confidence + Lifecycle**: Show both in one place for transparency
3. **List all artifacts**: Every file created/updated in this distillation run
4. **Track INDEX.md updates**: Checklist of which INDEX.md files were updated
5. **Quality gates**: Checkboxes showing all quality gates passed
6. **Preserve on updates**: When updating existing file, preserve original Distillation Status and append new entry

#### Example (Knowledge File)

```markdown
---
name: avatar-storage
type: foundation
confidence: 0.9
confidence_reason: "User explicitly confirmed during conversation"
created: 2026-06-13
last_accessed: 2026-06-13
access_count: 0
ttl_days: 365
status: active
source: session/test-avatar-20260613
distilled: 2026-06-13
---

# Distillation Status

**Distilled**: 2026-06-13  
**Mode**: auto-distill  
**Session**: `test-avatar-20260613`  
**Confidence**: 0.9 (source: User explicitly confirmed during conversation)  
**Lifecycle**: created=2026-06-13, ttl_days=365, status=active  
**Artifacts**: 4 files created

| File | Type | Confidence |
|------|------|-----------|
| `knowledge/domain/user-management/foundations/avatar-storage.md` | foundation | 0.9 |
| `knowledge/domain/_shared/conventions/file-upload-validation.md` | convention | 0.8 |
| `knowledge/domain/user-management/conventions/avatar-limits.md` | convention | 0.8 |
| `knowledge/domain/user-management/context/avatar-feature.md` | context | 0.7 |

**INDEX.md Updated**:
- [x] `knowledge/domain/INDEX.md`
- [x] `knowledge/domain/user-management/INDEX.md`
- [x] `knowledge/domain/_shared/INDEX.md`

**Quality Gates**:
- [x] Deduplication checked (0 matches found)
- [x] Business area classified (user-management, _shared)
- [x] Frontmatter complete
- [x] INDEX.md updated

---

# Avatar Storage Pattern

(The actual content starts here)
```

#### Example (Skill File)

```markdown
---
name: image-upload-handler
description: Handle image uploads with validation and thumbnail generation
tags: [image, upload, validation, thumbnail]
confidence: 0.8
created: 2026-06-13
last_accessed: 2026-06-13
access_count: 0
ttl_days: 180
status: active
source: session/test-avatar-20260613
distilled: 2026-06-13
---

# Distillation Status

**Distilled**: 2026-06-13  
**Mode**: auto-distill  
**Session**: `test-avatar-20260613`  
**Confidence**: 0.8 (source: Git diff confirmed actual implementation)  
**Lifecycle**: created=2026-06-13, ttl_days=180, status=active  
**Artifacts**: 1 skill created, 4 knowledge files created

**INDEX.md Updated**:
- [x] `SuperPmAgent-coding/skills/INDEX.md`

**Quality Gates**:
- [x] Deduplication checked (0 matches found)
- [x] Description ≤ 1024 chars
- [x] Frontmatter complete
- [x] INDEX.md updated

---

# Image Upload Handler

(The actual skill content starts here)
```

### 8. PR Creation (shared workflow - ALL modes use this)

**IMPORTANT**: All modes use the same PR creation workflow defined below.
Each mode's `.md` file only specifies: branch name, commit message, PR title.

**Use script**: `scripts/create-pr.sh`

```bash
./SuperPmAgent-core/skills/distill/scripts/create-pr.sh \
  "<branch-name>" \
  "<commit-message>" \
  "<pr-body-file>"
```

**Script handles**:
1. Pre-flight checks (git remote, gh CLI, auth, changes)
2. Branch creation (handle conflicts)
3. Commit and push (with error handling)
4. Create PR (with manual fallback)
5. Completion summary

**Manual steps** (if script fails):

#### Step 1: Pre-flight Checks

Before creating PR, verify:
- Git remote 'origin' configured
- gh CLI installed (`gh --version`)
- GitHub authenticated (`gh auth status`)
- Changes exist to commit

#### Step 2: Branch Creation (handle conflicts)

- Check if branch exists
- If exists: checkout and append changes
- If not: create new branch

#### Step 3: Commit and Push (with error handling)

- `git add .` and `git commit`
- `git push origin <branch>`
- Handle push failures (network, branch name, remote)

#### Step 4: Create PR (with manual fallback)

- Use `gh pr create --title "..." --body-file "..."`
- If fails: provide manual steps with URL

#### Step 5: Completion Summary

After successful PR creation, output:
```
✅ **Distillation Complete**
- Skills created/updated: N
- Knowledge created/updated: N
- PR URL: <url>
- Branch: <branch-name>

Please review and merge the PR to make the distilled artifacts available.
```

#### Error Handling Principles

1. **Don't silently fail** - report immediately
2. **Capture context** - what failed, what command, what output
3. **Provide fix guidance** - actionable steps to recover
4. **Partial commits OK** - if some work done, commit what can be committed

---

## Execution Order

1. Read this SKILL.md (shared rules)
2. Read the mode-specific `.md` file (auto-distill.md / summary.md / dream.md)
3. Execute steps in order (do NOT skip steps)
4. Apply all shared rules from this file
