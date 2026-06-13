---
name: repo-explorer
description: |
  Scan an unfamiliar repo and produce a structural map: tech stack, entry points,
  module layout, dependencies, key exports, data flow. Use BEFORE making changes
  in a repo you don't already understand. Read-only — does NOT edit code.
---

# repo-explorer

Use this skill before editing an unfamiliar repository or when a goal may touch multiple modules. It is read-only.

## Inputs

- Goal text or issue summary.
- Target repository path.
- Known scope and out-of-scope constraints.
- Optional session notes or prior `find` results.

## Steps

0. **Optional — large or multi-module repos:** invoke the `code-context` skill CLI first (`analyze` then `expand` on top hits). Merge results into this report.
1. Confirm the repository root and read the top-level manifest:
   - JavaScript/TypeScript: `package.json`, workspace files, Vite/Next config.
   - Python: `pyproject.toml`, `requirements*.txt`.
   - Go: `go.mod`.
   - Rust: `Cargo.toml`.
   - Before shelling out, identify the active command environment. Use portable
     POSIX commands in Bash, PowerShell syntax only in PowerShell, and prefer
     `Glob`/`Read` for file discovery when the shell is uncertain.
2. Identify app boundaries:
   - frontend entry points, routes, components, API clients.
   - backend entry points, routes/controllers, models, migrations.
   - shared types or generated code.
3. Extract 3-8 search terms from the goal and search narrowly.
4. Read only the top candidate files and 1-3 sibling files to learn local conventions.
5. Trace data flow:
   - UI event or route.
   - API call or handler.
   - persistence/model layer when relevant.
   - test or build path.
6. Decide whether the goal is frontend-only, backend-only, cross-stack, docs-only, or unclear.
7. Return a locate report. Do not edit files.

## Output

```markdown
## Repo Explore Result

Goal:

Repo:

Tech Stack:

Scope Classification:
- frontend-only | backend-only | cross-stack | docs-only | unclear

Search Terms:

Candidate Files:
| Path | Why | Confidence |
|---|---|---|

Data Flow:

Existing Conventions:

Likely Tests / Checks:

Risks / Unknowns:

Recommended Next Step:
```

## Large monorepo discipline (budget-aware)

Very large repos (e.g. CRM/CMS/commerce monorepos with thousands of files) can
exhaust the turn/time budget during exploration, leaving zero committed work.

- Timebox exploration. Prefer `code-context` CLI + targeted `Grep` over wide reads.
- Pick **one narrow vertical slice** that satisfies the goal end to end (one
  entity/route/component path), not the whole surface area.
- Identify the repo's actual default branch from `origin/HEAD` (it may be
  `develop`/`preview`/`release`, not `main`) and report it so coding/submit-pr
  branch from the correct base.
- Hand off candidate files even if exploration is incomplete, so `coding` can
  start and commit an incremental change before the budget runs out.

## Anti-patterns

- Editing code while exploring.
- Reading every file in a large repository.
- Spending the entire budget exploring a huge monorepo and committing nothing.
- Claiming high confidence without citing concrete paths.
- Treating a frontend-only L1 task as a backend schema change.
- Ignoring nearby tests or package scripts.
- Mixing shell dialects, such as running PowerShell-only commands through Bash.
