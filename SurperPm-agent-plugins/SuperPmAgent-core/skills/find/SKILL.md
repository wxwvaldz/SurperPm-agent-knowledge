---
name: find
description: |
  Universal resource finder for the SuperPmAgent marketplace. Use whenever you need to
  discover relevant skills, profiles, exp/domain knowledge, or extension prompts
  before doing work. Searches marketplace indexes by convention and returns ranked
  candidate paths with reasons. Always call this before reinventing a recipe.
---

# find

## When to call

- The user asks for a procedure ("how do I add a field?") → search skills.
- You need a fact ("what's our auth pattern?") → search exp/domain knowledge.
- You need a recent runtime lesson ("did a past run hit this?") → search learnings.
- You need team or user preferences → search profiles.
- You need prompt behavior for a known target skill/plugin/MCP → search extensions.
- You're starting a /goal and want to discover relevant prior art.

## Modes

| Mode | Use for | Search roots |
|---|---|---|
| `skill` | procedures and reusable abilities | `SuperPmAgent-*/skills/INDEX.md` |
| `profile` | team/user preferences and stable identity | `knowledge/profiles/INDEX.md`, then selected profile files |
| `exp` | curated durable experience: architecture, conventions, active context | `knowledge/domain/INDEX.md` → `domain/_shared/**` (always) + matched `domain/<area>/**` |
| `learning` | recent runtime lessons captured by the Web auto-distill loop | `knowledge/learnings/*.md` (flat; no INDEX — grep titles/tags/category) |
| `extension` | prompt fragments for a known skill/plugin/MCP target | `knowledge/extensions/INDEX.md`, then matching extension path |
| `mixed` | goal startup when the caller needs several categories | all of the above, but still ranked and selective |

`sessions/` are go-level context. They are private to a linked goal and should not be searched as global prior art unless the caller provides a specific session name.

## Two knowledge stores (integrated system)

The shared `SuperPmAgent-knowledge` repo carries two complementary reinforcement stores. `find` must know both, but they are written by different owners — never conflate them:

| Store | Path | Owner / writer | Model | Read by |
|---|---|---|---|---|
| Curated domain knowledge | `knowledge/domain/<area>/{foundations,conventions,context}/` | `SuperPmAgent-core/distill` (summary/dream) via PR review | confidence + TTL | `find` mode `exp` |
| Runtime learnings | `knowledge/learnings/*.md` | `SuperPmAgent-web` runtime auto-distill | category + importance + decay | Web prompt injection AND `find` mode `learning` |

- `exp` mode follows `domain/INDEX.md`: always load `domain/_shared/{foundations,conventions,context}` (status=active), then match the goal to a business area (`backend`/`frontend`/`research`/`_shared`), then keyword-grep. Budget ~1500-2000 tokens.
- `learning` mode is the same store the Web harness already injects as "Relevant learnings"; use it to actively pull more when the injected slice is insufficient. Treat learnings as advisory (see goal.md).
- Do not invent top-level `domain/foundations|conventions|context/` paths; those three names are reserved as sub-dirs inside `_shared/` and each business area.

## Steps

1. Restate the query and decide `mode`.
2. Read only the relevant index files for that mode.
3. Extract keywords from the query:
   - entity names.
   - technology names.
   - action verbs.
   - phase names such as locate, code, test, PR, distill.
4. Grep or scan index rows for keyword matches.
5. Read only the top candidate files needed to decide ranking. Avoid eager full reads.
6. Rank candidates by:
   - direct keyword match.
   - mode match.
   - specificity to the current phase.
   - recency/status when frontmatter is available.
   - whether it can change the next action.
7. Return 3-5 candidates. If nothing matched, say so and recommend the next repository-evidence step.

## Output Contract

```markdown
## Find Result

Query:

Mode:
- skill | profile | exp | extension | mixed

Search Roots:

Candidates:
1. path:
   kind:
   reason:
   confidence: high | medium | low
   read_next: yes | no
   next_action:

Not Found:

Recommended Next Step:
```

## Goal Startup Recipe

For `/SuperPmAgent-core:goal`, use `mixed` mode and return:

1. one or more coding/business skill candidates.
2. relevant profile summary if available.
3. relevant exp/domain knowledge if available (`_shared` always, plus matched area).
4. relevant runtime learnings from `knowledge/learnings/` when the goal resembles
   a past run; the Web harness may have pre-injected some, so dedupe against the
   already-provided "Relevant learnings" block instead of repeating it.
5. extension candidates only if a target skill/plugin/MCP is already known.
6. linked session/go context only if the user or Web goal provided a session.

Business-skill routing rules:

- Persistent model field, migration, or API/UI field propagation:
  `SuperPmAgent-business/skills/add-db-field/SKILL.md`.
- New backend route, response field, auth behavior, or API contract:
  `SuperPmAgent-business/skills/add-api-endpoint/SKILL.md`.
- New or changed user input in an existing form:
  `SuperPmAgent-business/skills/add-ui-form/SKILL.md`.
- Feishu PRD to design/task artifacts:
  `SuperPmAgent-business/skills/gen-feishu-design/SKILL.md`.

If a query matches more than one business skill, return all relevant candidates
and recommend the order, for example `add-db-field -> add-ui-form`.

## Examples

### L1 frontend-only benchmark task

Query: "add reading count to article cards, frontend mock data only"

Expected candidates:

- `SuperPmAgent-coding/skills/repo-explorer/SKILL.md`
- `SuperPmAgent-coding/skills/coding/SKILL.md`
- `SuperPmAgent-coding/skills/run-tests/SKILL.md`
- `SuperPmAgent-coding/skills/acceptance-review/SKILL.md`
- `knowledge/domain/frontend/context/...` only if a relevant frontend context file exists
- `knowledge/learnings/<date>-...md` only if a past run captured a related lesson

Do not return backend field-addition skills unless the query asks for persistence.

## Anti-patterns

- Calling `find` then ignoring the result and writing from scratch.
- Hardcoding plugin names — always glob the convention.
- Reading every SKILL.md eagerly. Only Read the top match.
- Treating `sessions/` as global reusable knowledge.
- Returning extension prompts when no target skill/plugin/MCP is known.
- Fabricating paths when no candidate exists.
- Re-injecting learnings the Web harness already placed in the prompt.
- Writing into `knowledge/learnings/` from `find`/`distill` — that store is owned
  by the Web runtime decay loop; curated knowledge goes to `knowledge/domain/`.
