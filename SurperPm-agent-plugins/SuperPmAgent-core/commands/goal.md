---
description: Start a SuperPmAgent delivery loop from a PM goal or GitHub issue. When --session is provided, must read and validate the session IntentSpec from /clarify before any execution.
argument-hint: "[--session <session-name>] [goal text or issue URL]"
allowed-tools: Read, Glob, Grep, Bash, TodoWrite
---

# SuperPmAgent Goal

You are starting one SuperPmAgent delivery loop.

## Input Modes

`/goal` may receive:

1. Direct goal text or an issue URL.
2. `--session <session-name>`.
3. `--session <session-name>` plus extra goal text.

Direct goal text is a legacy/demo fallback.
The standard SuperPmAgent PM-to-code flow is:

```text
/SuperPmAgent-core:clarify
-> knowledge/sessions/<session-name>/
-> notes.md IntentSpec
-> /SuperPmAgent-core:goal --session <session-name>
```

When `--session <session-name>` is provided, the session IntentSpec has priority.
Extra goal text may add context, but it must not override `notes.md`.

## Session IntentSpec Read Order

When a session is provided, `/goal` must read in this order:

1. `knowledge/sessions/<session-name>/notes.md`
2. `knowledge/sessions/<session-name>/decisions.md`
3. `knowledge/sessions/<session-name>/conversation.md`

Rules:

- `notes.md` is the primary input.
- `decisions.md` records confirmed PM boundaries.
- `conversation.md` is supporting context only and must not override `notes.md`.

## Missing Session Files

If `--session <session-name>` is provided but `knowledge/sessions/<session-name>/notes.md` does not exist, `/goal` must stop immediately.

It must not fall back to raw goal text.
It should direct the user to create or repair the session with:

```text
/SuperPmAgent-core:clarify --session <session-name>
```

## IntentSpec Gate

Before any code modification, skill lookup, test run, commit, or PR step, `/goal` must inspect `knowledge/sessions/<session-name>/notes.md`.

Execution may continue only when all of the following are true:

- `ready_for_goal` is exactly `yes`
- `Open Questions` is exactly `- None`
- `blockers` is exactly `- None`
- `Scope` exists and is not empty
- `Acceptance Criteria` exists and is not empty
- `Scope` does not contain placeholders such as `待确认`, `待明确`, `pending confirmation`, `TBD`, `unknown`, or `unclear`
- `Acceptance Criteria` does not contain placeholders such as `待确认`, `待明确`, `pending confirmation`, `TBD`, `unknown`, or `unclear`

If the gate fails, `/goal` must not:

- edit code
- search for coding or execution skills
- run tests
- create a commit
- create a PR

Instead, `/goal` should:

1. Explain that the session IntentSpec is not ready for execution.
2. List blockers, unresolved `Open Questions`, and missing or placeholder fields.
3. Suggest continuing clarification with:

```text
/SuperPmAgent-core:clarify --session <session-name>
```

## IntentSpec Summary Before Execution

If the gate passes, `/goal` should explicitly state that it has read the session IntentSpec and summarize:

- `Standardized Goal`
- `Scope`
- `Out of Scope`
- `Acceptance Criteria`
- `Constraints`

Then it should treat:

- `Standardized Goal` as the task title
- `Scope` as the implementation boundary
- `Out of Scope` as hard constraints
- `Acceptance Criteria` as the verification target
- `Constraints` as implementation constraints
- `Risks` as things to watch for
- `decisions.md` as confirmed PM decisions

`/goal` must not let `conversation.md` override `notes.md`.
`/goal` must not violate `Out of Scope` or `decisions.md`.

## Inputs To Collect

- Goal text or issue URL.
- Target Conduit fork path or repository URL.
- Optional session folder under `knowledge/sessions/`.
- Constraints: max iterations, token budget, maximum duration, sandbox mode.

## Required Flow

1. If `--session` is provided, complete the IntentSpec read order and gate before doing anything else.
2. Clarify only if the goal is ambiguous enough to block implementation and there is no ready session IntentSpec yet.
3. Use `SuperPmAgent-core/find` to discover relevant skills and knowledge.
4. Ask `SuperPmAgent-coding/repo-explorer` to locate target files before editing.
5. Use the most specific `SuperPmAgent-business` skill when the change matches a known pattern.
6. Use `SuperPmAgent-coding/coding` for implementation.
7. Use `SuperPmAgent-coding/run-tests` for lint and test commands.
8. Use `SuperPmAgent-coding/debugger` for up to three focused fix rounds if checks fail.
9. Use `SuperPmAgent-coding/submit-pr` when the target repository is ready for review.
10. End with a compact loop summary and invoke distillation if the run produced reusable knowledge.

## Success Evidence

Return:

- Goal and final scope.
- Target repository and branch.
- Changed file summary.
- Commands executed and results.
- Conduit PR URL or blocker.
- Distillation candidate path or PR URL.
