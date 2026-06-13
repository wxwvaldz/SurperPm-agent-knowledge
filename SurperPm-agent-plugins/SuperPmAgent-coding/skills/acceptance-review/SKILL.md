---
name: acceptance-review
description: |
  Final result review before PR/commit handoff. Compare the accepted goal,
  acceptance criteria, final diff, tests, and SuperPmAgent evidence. Use after
  implementation and verification, before submit-pr or declaring a blocker.
---

# acceptance-review

Use this skill after `run-tests` and before `submit-pr`. It is a review gate for
the result, not a code-writing step.

## Inputs

- Accepted goal, scope, out-of-scope, and acceptance criteria.
- Repo-explorer locate report.
- Coding result.
- Verification result.
- Final git status and diff summary.
- PR/commit/blocker intent.

## Review Questions

1. **Goal match**: Does the final behavior satisfy every acceptance criterion?
2. **Scope discipline**: Are all changed files inside the accepted scope?
3. **Cross-stack consistency**: If backend contracts changed, did the UI/client,
   tests, and data model move together?
4. **Verification**: Were the closest relevant checks run? If not, is the gap an
   environment/setup blocker instead of an unclaimed pass?
5. **Safety**: Are secrets, local absolute paths, `.env`, generated dependency
   churn, and unrelated cleanup absent from the diff?
   - **Lockfile gate**: if `package-lock.json`, `pnpm-lock.yaml`, `yarn.lock`,
     `go.sum`, or a dependency manifest appears in the diff and the goal did not
     request a dependency change, return `needs_debug` and instruct restoring the
     lockfile before re-review. This is a hard fail, not a soft note.
6. **Reviewability**: Is the diff small enough for a human PR review? Is there a
   clear PR body/test plan?
7. **No-op validity**: If no code changed, is there concrete evidence that the
   requested behavior and tests already exist?

## Status Decision

Return exactly one status:

- `ready_for_pr`: implementation and checks are good enough for review.
- `commit_ready`: local commit is good, but PR cannot be opened because of
  permissions or missing remote tooling.
- `needs_debug`: checks or behavior are red and a focused fix attempt remains.
- `needs_clarification`: acceptance criteria or scope are still ambiguous.
- `blocked`: environment, permission, or missing setup blocks honest completion.

Do not return `ready_for_pr` when tests failed, scope was violated, or PR evidence
would hide a blocker.

## Output

```markdown
## Acceptance Review

Status:
- ready_for_pr | commit_ready | needs_debug | needs_clarification | blocked

Criteria Check:
| Criterion | Evidence | Result |
|---|---|---|

Diff Scope:
| Path | In Scope? | Notes |
|---|---|---|

Verification:
| Command | Result | Notes |
|---|---|---|

Risks / Gaps:

Recommended Handoff:
```

## Anti-patterns

- Rubber-stamping a result because code changed.
- Calling a run successful when no tests/checks were possible and no blocker was
  documented.
- Treating PR permission failure as implementation failure.
- Ignoring acceptance criteria that are inconvenient to verify.
