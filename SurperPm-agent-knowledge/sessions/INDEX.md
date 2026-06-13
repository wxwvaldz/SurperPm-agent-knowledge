# Sessions Index

> **Purpose**: L2 session layer (private to its associated /goal).
> **Updated**: 2026-06-14

## Structure

Each session = one folder: `<name>/`

```
<session-name>/
├── conversation.md      # PM ↔ AI chat (append-only)
├── notes.md             # AI-extracted summary
├── decisions.md         # Key decisions
├── attachments/         # Screenshots, PRDs
└── executions/          # Goal receipts (post-execution)
    └── <YYYY-MM-DD-run-N>.md
```

**Note**: File format templates are defined in the "File Formats" section below. No separate template folder needed.

## Distill Rules

### Output Location

| Session File | Target Location | Frontmatter |
|-------------|----------------|-------------|
| notes.md → Knowledge | `../domain/<area>/<slug>.md` | confidence + lifecycle |
| decisions.md → Decisions | Stay in session | lifecycle only |
| Skills extraction | `../../SuperPmAgent-*/skills/<slug>/SKILL.md` | N/A |

### Frontmatter Templates

**notes.md** (AI summary, needs confidence):
```markdown
---
session: <name>

# === Confidence ===
confidence: 0.7
confidence_reason: "AI 自动提取，需验证"

# === Lifecycle ===
created: YYYY-MM-DD
last_accessed: YYYY-MM-DD
access_count: 2
ttl_days: 90
status: active

# === Provenance ===
source: session/<name>
---
```

**decisions.md** (user confirmed, no confidence):
```markdown
---
session: <name>

# === Lifecycle ===
created: YYYY-MM-DD
last_accessed: YYYY-MM-DD
access_count: 3
ttl_days: 180
status: active

# === Provenance ===
source: session/<name>
---
```

### Distill Flow

1. Analyze session conversation
2. Extract knowledge candidates:
   - Architecture decisions → domain/foundations/
   - Team conventions → domain/conventions/
   - Context updates → domain/context/
   - User preferences → profiles/users/
3. Generate knowledge files with unified frontmatter
4. Create PR branch: `distill/<sid>-<slug>`
5. Submit PR for human review

## File Formats

### conversation.md
```markdown
# Session: <name>

## YYYY-MM-DD HH:MM

**PM**: <message>

**AI**: <response>
```

**Rules**: Append only, one message per `##` heading.

### notes.md
```markdown
---
session: <name>

# === Confidence & Lifecycle ===
confidence: 0.7                    # session 总结，需要验证
confidence_reason: "AI 自动提取"
created: YYYY-MM-DD
last_accessed: YYYY-MM-DD
access_count: 2
ttl_days: 90                       # session 90 天后可归档
status: active                     # active | archived

# === Provenance ===
source: session/<name>
---

# Session Notes

## Goal
<what PM wants>

## Constraints
<limitations>

## Key Points
<AI-extracted insights>
```

**Rules**: AI updates after each turn, keep <50 lines.

### decisions.md
```markdown
---
session: <name>

# === Lifecycle ===
created: YYYY-MM-DD
last_accessed: YYYY-MM-DD
access_count: 3
ttl_days: 180                      # 决策较稳定
status: active

# === Provenance ===
source: session/<name>
---

# Decisions

## YYYY-MM-DD

### Title
- **Decision**: <what>
- **Rationale**: <why>
- **Impact**: <affects>
```

### executions/<run-id>.md
```markdown
---
session: <name>
run_id: <id>
started: YYYY-MM-DD HH:MM
completed: YYYY-MM-DD HH:MM
status: success | failed
---

# Execution

## Summary
<what was done>

## Changes
- `file` - <description>

## Commit
- Hash: `<hash>`
- Message: `feat: <summary>`
```

## Archive Rules

Sessions are archived when ALL conditions met:
- `age > ttl_days` (default: 90 days for sessions)
- `last_accessed > 60 days ago`
- `status = active` (not already archived)

**Archive location**: `knowledge/sessions/archive/<session-name>/`

**Archive process** (executed by dream mode):
1. Update `notes.md` status: `active` → `archived`
2. Move folder to `knowledge/sessions/archive/`
3. Update `knowledge/sessions/INDEX.md`:
   - Move entry to "Archived Sessions" section
   - Add `archived: YYYY-MM-DD` field
4. Include in next dream PR for review

**Unarchive process** (manual, if needed):
1. Move folder back to `knowledge/sessions/`
2. Update status to `active`
3. Update INDEX.md
4. Create PR to apply changes

## Lifecycle

1. **Create**: New session folder
2. **Chat**: PM ↔ AI → append `conversation.md`
3. **Extract**: AI updates `notes.md`
4. **Link**: PM associates with /goal
5. **Execute**: Goal runner writes to `executions/`
6. **Distill**: `/summary` extracts knowledge
7. **Archive**: After >1 month

## Discovery

At goal start (if session linked):
1. Read: `notes.md` (full, ~500 tokens)
2. Read: `conversation.md` (last 20 turns, ~1500 tokens)
3. Read: `decisions.md` (full, ~300 tokens)

**Budget**: ~2300 tokens per session

## Naming

`<slug>-<YYYYMMDD>` (e.g., `add-phone-field-20260614`)

## Privacy

- **Private to its /goal**: Only associated goal sees this
- **Global**: `profiles/`, `domain/` always visible
- **Never leak**: Don't reference one session in another goal

## Anti-patterns

- ❌ Don't edit `conversation.md` (append only)
- ❌ Don't delete sessions (archive instead)
- ❌ Don't write distilled knowledge back here (write to `domain/`)
