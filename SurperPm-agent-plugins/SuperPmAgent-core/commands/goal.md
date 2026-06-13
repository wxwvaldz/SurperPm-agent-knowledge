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
-> <KNOWLEDGE_REPO_PATH>/sessions/<session-name>/
-> notes.md IntentSpec
-> /SuperPmAgent-core:goal --session <session-name>
```

When `--session <session-name>` is provided, the session IntentSpec has priority.
Extra goal text may add context, but it must not override `notes.md`.

## Session IntentSpec Read Order

When a session is provided, `/goal` must read in this order:

1. `<KNOWLEDGE_REPO_PATH>/sessions/<session-name>/notes.md`
2. `<KNOWLEDGE_REPO_PATH>/sessions/<session-name>/decisions.md`
3. `<KNOWLEDGE_REPO_PATH>/sessions/<session-name>/conversation.md`
4. `<KNOWLEDGE_REPO_PATH>/sessions/<session-name>/attachments/sources/*.json` only if useful as supporting context
5. `<KNOWLEDGE_REPO_PATH>/sessions/<session-name>/attachments/exports/*.json` only as artifact references

Rules:

- `notes.md` is the primary input.
- `decisions.md` records confirmed PM boundaries.
- `conversation.md` is supporting context only and must not override `notes.md`.
- `attachments/sources/*.json` may help explain referenced source material but must not override `notes.md` or `decisions.md`.
- `attachments/exports/*.json` are delivery artifacts only and must not become execution input.

## Missing Session Files

If `--session <session-name>` is provided but `<KNOWLEDGE_REPO_PATH>/sessions/<session-name>/notes.md` does not exist, `/goal` must stop immediately.

It must not fall back to raw goal text.
It should direct the user to create or repair the session with:

```text
/SuperPmAgent-core:clarify --session <session-name>
```

## IntentSpec Gate

Before any code modification, skill lookup, test run, commit, or PR step, `/goal` must inspect `<KNOWLEDGE_REPO_PATH>/sessions/<session-name>/notes.md`.

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

## Relevant Learnings (Web / harness injection)

When the runner appends a `Relevant learnings` section (for example from
`SuperPmAgent-web` goal execution or knowledge distillation):

- Treat learnings as **advisory context** only. They may suggest patterns or
  pitfalls but do not replace session `notes.md`, `decisions.md`, or direct goal
  text.
- Learnings **must not** override `Scope`, `Out of Scope`, or `Acceptance
  Criteria` from a ready session IntentSpec.
- Learnings **must not** alone authorize dependency changes, backend edits on
  frontend-only scope, or skipping the IntentSpec gate.
- If a learning conflicts with the accepted goal or session boundary, follow the
  goal/session and note the conflict in the handoff evidence.
- The injected block comes from the Web runtime store at
  `<KNOWLEDGE_REPO_PATH>/learnings/`. If it is missing or insufficient, you may
  call `find` with mode `learning` to pull more, but dedupe against what was
  already injected. Durable lessons from this run are curated to
  `knowledge/domain/` by `distill` (never written back into `learnings/`).

## External Source And Export Rules

When a session contains external source or export records:

- `/goal` may inspect `attachments/sources/*.json` for supporting context.
- `/goal` must not promote an attachment record into source-of-truth status.
- `/goal` must ignore `attachments/exports/*.json` for execution planning except
  as human-facing artifact references.
- A Feishu PRD link, PPT link, or generic export link does not replace the
  IntentSpec gate in `notes.md`.

## Inputs To Collect

- Goal text or issue URL.
- Target repository path or URL.
- Optional session folder under `knowledge/sessions/`, or the configured `<KNOWLEDGE_REPO_PATH>/sessions/`.
- Constraints: max iterations, token budget, maximum duration, sandbox mode.

## Required Flow

### Contradiction gate (before planning or edits)

Stop and clarify when the goal combines **authoritative cross-session guarantees** (per-user uniqueness, tamper-proof limits, durable counts shared across browsers) with **explicit bans on server-side changes** (no API, schema, migrations, or backend edits). Those constraints cannot both be satisfied honestly.

Until a PM records a scope choice in session `decisions.md` (or via `/SuperPmAgent-core:clarify`):

1. **Do not** edit application code, run migrations, create feature branches for the feature, or call `submit-pr`.
2. **Do not** invoke `repo-explorer`, `coding`, `run-tests`, or broad repository search for implementation — only enough read-only context to explain the conflict if needed.
3. Use `/SuperPmAgent-core:clarify` or `AskUserQuestion` with at least two paths:
   - **Prototype:** UI-only demo; document that per-user idempotency is **not** real.
   - **Authoritative:** allow server/API/schema work needed for real guarantees.
4. Only after that decision, continue to implementation aligned with the chosen path.

Do not implement one path while claiming the other is met.

### Already-satisfied goal gate

If repo exploration shows the requested behavior already exists, do not create
duplicate APIs or cosmetic churn just to make a diff.

Before declaring a no-op:

1. Verify the existing implementation against every acceptance criterion.
2. Check whether requested tests or exports are also already present.
3. If behavior exists but tests, exports, docs, or types are missing, make only
   those focused additions.
4. If all criteria are already satisfied, run the narrowest relevant check and
   return explicit no-op evidence under `Changes`.

Use this wording in the evidence trail when no code change is correct:

```markdown
Changes:
- No code changes: requested behavior already exists and satisfies the accepted criteria.

Verification:
- <command>: <pass / blocker>
```

Do not treat "already exists" as success without locating the implementation and
recording verification. Do not force a feature diff only for benchmark or PR
shape.

1. If `--session` is provided, complete the IntentSpec read order and gate before doing anything else.
2. Clarify only if the goal is ambiguous enough to block implementation and there is no ready session IntentSpec yet.
3. Use `SuperPmAgent-core/find` to discover relevant skills and knowledge.
4. Ask `SuperPmAgent-coding/repo-explorer` to locate target files before editing.
5. Use the most specific `SuperPmAgent-business` skill when the change matches a known pattern:
   - persistent field or model propagation -> `SuperPmAgent-add-db-field`
   - backend route, response shape, or request behavior -> `SuperPmAgent-add-api-endpoint`
   - form input, validation, or submit payload -> `SuperPmAgent-add-ui-form`
   - Feishu requirements to architecture/tasks -> `SuperPmAgent-gen-feishu-design`
   If no business skill matches, say `Business skill: none matched` and proceed
   with repository evidence instead of inventing a pattern.
6. Use `SuperPmAgent-coding/coding` for implementation.
7. Use `SuperPmAgent-coding/run-tests` for lint and test commands.
8. Use `SuperPmAgent-coding/debugger` for up to three focused fix rounds if checks fail.
9. Use `SuperPmAgent-coding/acceptance-review` to compare the final diff, checks,
   and evidence against the accepted criteria.
10. Use `SuperPmAgent-coding/submit-pr` only when acceptance-review returns
   `ready_for_pr` or `commit_ready`.
11. End with a compact loop summary and invoke or recommend distillation if the
   run produced reusable knowledge.

## Delivery chain

Follow this chain through `SuperPmAgent-coding` skills:

```text
repo-explorer -> coding -> run-tests -> debugger (if red) -> run-tests -> acceptance-review -> submit-pr
```

Do not skip repository exploration in an unfamiliar codebase. Do not start with broad refactors.

## Competition Delivery Contract

The final answer must make the delivery state unambiguous for SuperPmAgent Web and for
judges reviewing the run:

- `pr_opened`: PR URL is present and relevant checks are documented.
- `commit_ready`: local branch/commit exists, checks are documented, but PR could
  not be opened because of GitHub/SSH/permission/tooling limits.
- `blocked`: no honest implementation handoff is possible; include blocker,
  failure phase, and next action.
- `clarify_needed`: IntentSpec or direct goal is not executable yet.

Never call the run successful only because the assistant produced text. A
successful coding delivery needs one of:

1. PR URL.
2. Local branch + commit hash + verification evidence + PR blocker.
3. Verified no-op evidence that all accepted criteria already existed.

If `gh` or push permission is missing after code and tests are done, classify it
as `commit_ready`, not as implementation failure.

## Evidence (for benchmark and distill)

Maintain a compact evidence trail:

```markdown
## SuperPmAgent Evidence

Goal:

Target Repo:

Session:

Skills Used:

Locate:

Changes:

Verification:

Failure Phase:

Failure Reason:

PR / Commit:

Delivery Status:

Distill Candidate:
```

## Safety Rules

- No forced push, hard reset, or destructive cleanup.
- No new dependencies without explicit approval.
- No edits outside the target repository unless the user asked for marketplace maintenance.
- No `.env`, credentials, tokens, private logs, or local absolute paths in commits or PR bodies.
- No skipped, deleted, or weakened tests to make a run pass.
- No direct push to `main` or `master`.
- Before `submit-pr`, inspect the final diff. If dependency manifests or
  lockfiles changed but the accepted goal did not include a dependency change,
  stop and treat it as scope contamination. Do not commit or PR those files.

## Success Evidence

Return:

- Goal and final scope.
- Target repository and branch.
- Changed file summary.
- Commands executed and results.
- PR URL or blocker.
- Delivery status (`pr_opened`, `commit_ready`, `blocked`, or `clarify_needed`).
- Distillation candidate path or PR URL.

`<KNOWLEDGE_REPO_PATH>` should resolve to the checked-out `SuperPmAgent-knowledge`
repository. The `knowledge/` directory inside `SuperPmAgent-plugins` stores only
session protocol docs and templates.
