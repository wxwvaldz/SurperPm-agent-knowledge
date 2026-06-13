---
description: Clarify a vague PM requirement into a structured session IntentSpec. Writes conversation.md, notes.md, and decisions.md. Does not write code, run tests, commit changes, or open PRs.
argument-hint: "[--session <session-name>] <vague PM request>"
allowed-tools: Read, Write, Edit, Glob
---

# SuperPmAgent Clarify

`/SuperPmAgent-core:clarify` turns a raw PM request into a structured session IntentSpec under `<KNOWLEDGE_REPO_PATH>/sessions/<session-name>/`.

It accepts a PM's vague natural-language request, identifies ambiguity and missing information, asks focused clarification questions, and creates or updates the session that `/SuperPmAgent-core:goal` will consume later.

It does not write product code, run tests, create commits, or open PRs.

If the PM provides URL-like source material, `/clarify` should normalize and
register that source before finalizing session files.

## Responsibilities

`/clarify` is responsible for:

- Understanding the PM's original request.
- Normalizing URL-like or Feishu-document external source inputs before they are reflected into the session.
- Identifying ambiguity, contradictions, missing boundaries, and scope risk.
- Asking focused clarification questions when the request is not yet executable.
- Creating or updating `<KNOWLEDGE_REPO_PATH>/sessions/<session-name>/`.
- Writing `conversation.md`, `notes.md`, and `decisions.md`.
- Producing a structured IntentSpec in `notes.md`.
- Deciding whether the session is ready for `/SuperPmAgent-core:goal`.

`/clarify` is not responsible for:

- Writing code.
- Running tests.
- Creating commits.
- Opening PRs.
- Producing a technical implementation plan.
- Expanding scope beyond what the PM actually requested.

## Session Folder

`/clarify` creates or updates this structure:

```text
<KNOWLEDGE_REPO_PATH>/sessions/<session-name>/
  conversation.md
  notes.md
  decisions.md
  attachments/
  executions/
```

## File Responsibilities

- `conversation.md`: append-only clarification transcript.
- `notes.md`: IntentSpec main body and the primary input for `/goal`.
- `decisions.md`: PM-confirmed scope, boundaries, constraints, and trade-offs.
- `attachments/`: optional supporting references.
- `executions/`: optional later `/goal` execution receipts.

## Session Writeback Rules

`/clarify` is the session-writing authority for requirement intent.

It should write back using these rules:

- Append user requests, answers, and short source-registration notes to
  `conversation.md`.
- Update `notes.md` with the latest stable IntentSpec.
- Update `decisions.md` only with PM-confirmed boundaries or trade-offs.
- Register external source metadata under `attachments/sources/`.
- Do not store exported deliverable links in `notes.md` as the primary result.
- Do not let raw external content replace structured requirement fields.

## IntentSpec

IntentSpec means "Intent Specification".
It is not a PRD, not a technical design, and not code.
It is the structured requirement intent passed from `/clarify` to `/goal`.

The value of `/clarify` is to turn an ambiguous PM request into a structured, bounded, reviewable input.
`/goal` should treat `notes.md` as the main source of truth.

## Clarification Goals

Ask for:

- User-facing objective.
- Concrete scope.
- Out of scope.
- Acceptance criteria.
- Data or UI edge cases when they affect requirement boundaries.
- Required verification expectations.

Avoid asking for implementation details that the engineering loop can infer from the repository unless the PM is explicitly making a technical decision.

When source material arrives as a link, normalize it into
`attachments/sources/*.json` first and then clarify from the normalized record
plus the PM's explicit statements.

Prefer `input/normalize-feishu-doc` when the link is clearly a Feishu/Lark
document used as requirement input. Use `input/normalize-url` as the generic
fallback for other link-like sources.

## notes.md Template

`notes.md` should use this structure:

```markdown
---
session: <session-name>
confidence: 0.7
confidence_reason: "AI-extracted from clarification history; verify before distill"
created: YYYY-MM-DD
last_accessed: YYYY-MM-DD
access_count: 1
ttl_days: 90
status: active
source: session/<session-name>
---

# IntentSpec: <short title>

## Raw Request

<PM original request. Keep the original wording as much as possible.>

## Standardized Goal

<One-sentence normalized goal suitable for /goal.>

## User Value

<Why this matters to the user or product.>

## Scope

- <What must be included in this request.>

## Out of Scope

- None

## Acceptance Criteria

- <Observable or verifiable outcome.>

## Constraints

- <Known constraints, assumptions, or transition strategies.>

## Risks

- <Known risks or uncertainty.>

## Open Questions

- None

## Ready for Goal

- ready_for_goal: no
- blockers:
  - None
```

## Ready for Goal Rules

- If `Open Questions` is not exactly `- None`, `ready_for_goal` must be `no`.
- If `Scope` is missing or empty, `ready_for_goal` must be `no`.
- If `Acceptance Criteria` is missing or empty, `ready_for_goal` must be `no`.
- If `blockers` is not exactly `- None`, `ready_for_goal` must be `no`.
- `Open Questions` counts as empty only when it is exactly `- None`.
- `blockers` counts as empty only when it is exactly `- None`.
- The `Out of Scope` section must always exist.
- If there is no explicit exclusion yet, write `- None`.
- `Out of Scope: - None` does not by itself force `ready_for_goal=no`.
- Initial drafts should default to `ready_for_goal: no`.
- Only the final clarified IntentSpec may set `ready_for_goal: yes`.

## Output

Write or update a session folder under `<KNOWLEDGE_REPO_PATH>/sessions/<session-name>/`:

- `conversation.md`: questions, answers, and clarification summaries. Append only.
- `notes.md`: IntentSpec, constraints, assumptions, and gate status.
- `decisions.md`: accepted scope, rejected scope, and confirmed PM boundaries.
- `attachments/sources/*.json`: normalized source metadata for external inputs when applicable.

`<KNOWLEDGE_REPO_PATH>` should resolve to the checked-out `SuperPmAgent-knowledge`
repository. The `knowledge/` directory inside `SuperPmAgent-plugins` stores only
the session contract and protocol docs used by this command.

If the request is already clear, write the session directly and do not over-question the PM.
