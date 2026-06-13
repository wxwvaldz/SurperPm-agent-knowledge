---
name: coding
description: |
  Edit and write code following team conventions discovered from knowledge/profiles/
  and any active extension prompts. Reads existing structure before changing. Avoids
  re-implementing patterns that already exist in SuperPmAgent-business via find. Default
  discipline: small focused diffs, no unrelated cleanup, no comments unless the why
  is non-obvious.
---

# coding

Use this skill for focused code edits after `repo-explorer` has identified candidate files and likely checks.

## Required Inputs

- Accepted goal and out-of-scope items.
- Locate report from `repo-explorer`, or a user-specified exact file path.
- Planned changed files.
- Verification plan.
- Relevant `find` results for business patterns or team conventions.

## Steps

1. Re-read every file you will modify.
2. Read 1-3 sibling files when style, naming, or architecture is not obvious.
3. Before editing, check whether the requested behavior is already implemented:
   - If behavior and acceptance tests already exist, do not edit. Return a no-op
     coding result with exact file locations and hand off to `run-tests`.
   - If behavior exists but tests, types, exports, or docs required by the goal
     are missing, only add those missing pieces.
   - If a similarly named helper exists but semantics differ, implement the
     requested behavior without breaking the existing API.
4. State the edit plan before changing files:
   - files to modify.
   - behavior change.
   - tests/checks to run.
   - risk.
5. Make the smallest behavior-complete change.
6. Preserve existing patterns:
   - routing and state management.
   - error handling.
   - styling conventions.
   - test layout.
7. Add or update tests when the repository has a nearby pattern and the behavior risk is non-trivial.
8. Avoid comments unless they explain a non-obvious decision.
9. Stop after a coherent chunk and call `run-tests`.

## Change Discipline

- L1 frontend-only tasks must not change backend or persistence unless repo evidence proves the task cannot work otherwise.
- Cross-stack tasks must keep persistence, API responses, clients, UI, and tests consistent.
- Do not introduce dependencies without explicit user approval.
- Treat dependency manifests and lockfiles as explicit scope. If verification
  tooling mutates them for setup-only reasons, exclude them from the feature
  change and report the verification gap instead of carrying them forward.
- Do not perform unrelated cleanup.
- Do not preserve compatibility with unshipped branch-only mistakes; fix them directly if they are in scope.
- Never `git add -A` / `git add .` after an install rewrote a lockfile; stage
  only the feature files and restore setup-only lockfile/manifest churn.

## Commit Early On Large Repos

In very large repos, do not spend the whole budget without producing a durable
change. Once a coherent vertical slice exists:

- Create a feature branch from the repo's actual default branch (which may be
  `develop`/`preview`/`release`, not `main`).
- Commit the slice before continuing, so the work is captured even if later
  exploration or verification runs out of budget.
- A committed-but-not-pushed slice is `commit_ready`, which is a real delivery —
  far better than ending with zero changes.

## Output

```markdown
## Coding Result

Goal:

Changed Files:
| Path | Reason |
|---|---|

Behavior Implemented:

Tests Added / Updated:

Assumptions:

Risks:

Next Verification:
```

For a no-op result, fill `Changed Files` with `None`, and include:

```markdown
Behavior Implemented:
- Already present in `<path>`; no duplicate implementation added.

Tests Added / Updated:
- None; existing tests cover `<behavior>` in `<path>` (or explain the exact gap).
```

## Anti-patterns

- Implementing before reading the target files.
- Adding duplicate helpers when an existing implementation already satisfies the goal.
- Reporting "already exists" without running the relevant verification command.
- Using ad hoc string edits when a structured parser or local pattern exists.
- Mismatching tab vs space indentation in existing files; read the file first or rewrite the full small module when edits fail twice.
- Broad refactors mixed with feature work.
- Carrying package manager side effects into a non-dependency feature diff.
- Hardcoding secrets, tokens, IDs, or local paths.
- Marking work done before running the planned checks.
