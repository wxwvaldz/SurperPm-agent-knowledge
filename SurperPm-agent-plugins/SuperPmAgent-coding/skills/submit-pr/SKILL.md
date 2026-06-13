---
name: submit-pr
description: |
  Push the current branch and open a pull request to the target repo. Title and body
  follow conventional-commits style. Always opens PR; never pushes to main directly.
  Uses gh CLI when available; falls back to the GitHub MCP connector.
---

# submit-pr

Use this skill only after implementation and verification evidence exist.

## Preconditions

- Working tree changes are scoped to the accepted goal.
- Relevant checks passed, or blockers are documented.
- `acceptance-review` returned `ready_for_pr` or `commit_ready`.
- No secret, token, credential, or local absolute path is included.
- Dependency manifests and lockfiles are changed only when dependency changes
  are part of the accepted goal or explicitly approved by the user.
- The branch is not `main` or `master`.
- The repository has a remote if PR creation is required.
- The current environment has permission to push to the selected remote, or a
  writable fork remote is configured. If not, do not repeatedly push; report the
  local branch/commit and exact permission blocker.

## Steps

1. Inspect status and diff:
   - include untracked files.
   - separate unrelated local changes from this goal.
   - **Restore setup-only lockfile/manifest churn before committing** rather than
     just refusing to submit. When `package.json`, `package-lock.json`,
     `pnpm-lock.yaml`, `yarn.lock`, `go.sum`, or similar changed only because of
     install/test setup, run:

```bash
git restore --staged package-lock.json pnpm-lock.yaml yarn.lock go.sum 2>/dev/null || true
git checkout -- package-lock.json pnpm-lock.yaml yarn.lock go.sum 2>/dev/null || true
```

   - Only stage feature files. Never `git add -A` / `git add .` in a repo where
     install rewrote a lockfile.
2. Summarize the change:
   - user-facing behavior.
   - touched surfaces.
   - tests run.
   - remaining risks.
3. Create or reuse a focused branch.
4. Commit only relevant files with a conventional message:
   - `feat: ...`
   - `fix: ...`
   - `docs: ...`
   - `test: ...`
5. Push and open PR with `gh pr create` when available and the remote is writable.
6. If PR creation is not possible, report the commit hash and exact blocker.

## PR Body Template

```markdown
## Summary
-

## Test plan
-

## SuperPmAgent evidence
- Goal:
- Scope:
- Locate:
- Skills used:
- Checks:
- Acceptance review:
- Delivery status:
- Distill candidate:

## Risks
-
```

## Output

```markdown
## Submit PR Result

Branch:

Commit:

PR:

Tests:

Acceptance Review:

Delivery Status:

Uncommitted / Unrelated Changes:

Blockers:
```

## Safety Rules

- Never force push unless a human explicitly asks.
- Never push directly to `main` or `master`.
- Never use `--no-verify` unless a human explicitly approves.
- Never include `.env`, credentials, local tokens, or private logs.
- Do not create a PR when verification clearly failed unless the PR is explicitly a draft/blocker PR and the body says so.
- Do not include dependency or lockfile churn as a workaround for local test
  setup unless it is an approved product change.
- Do not treat lack of upstream push permission as a coding failure; it is a
  submit-pr blocker. Preserve the local commit and provide the manual next step.
