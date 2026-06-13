---
name: run-tests
description: |
  Run the project's test suite. Auto-detects the runner (npm test / pytest / vitest /
  cargo test / go test) from package.json, pyproject.toml, Cargo.toml, or go.mod.
  Reports failures with file:line so debugger/coding can perform a focused fix
  round without hiding verification gaps.
---

# run-tests

Use this skill after a code change or before PR submission. It selects checks, runs them, and captures evidence.
Also use it after a deliberate no-op when repo exploration found the requested
behavior already exists; the check is the proof that no code change was needed.

## Inputs

- Target repository path.
- Changed files.
- Locate report or scope classification.
- Known package manager constraints.

## Detection Order

1. Inspect CI files if present (`.github/workflows/*`, `Makefile`, task runner configs).
2. JavaScript/TypeScript:
   - Detect package manager from lockfiles: `pnpm-lock.yaml`, `yarn.lock`, `package-lock.json`.
   - Read root and workspace `package.json` scripts.
   - Prefer narrow scripts first: `lint`, `typecheck`, focused package `test`, then `build`.
   - When a root or workspace `package.json` provides a relevant script, run
     that script instead of guessing a raw runner command.
   - Do not run `node --test` against Jest/Vitest-style tests unless the
     repository explicitly uses Node's built-in test runner.
   - Dependency installation is setup, not verification. You may run the
     repository's existing install command from committed manifests/lockfiles,
     but do not add packages or intentionally modify `package.json`/lockfiles
     to make tests run unless the user explicitly approved a dependency change.
3. Python:
   - `pyproject.toml` with pytest/ruff config.
   - `uv.lock` means prefer `uv run`.
   - `src/` layout packages: use `pip install -e .` when `setup.py` or
     `pyproject.toml` supports it, or run tests with
     `PYTHONPATH=src python -m unittest discover -s tests` (or pytest from docs).
   - Else use the repository's documented command.
4. Go: `go test ./...`.
5. Rust: `cargo test`.
6. If no test command exists, report the missing command as a verification gap, not a pass.

## Selection Rules

- Docs-only: run markdown/doc checks only if present; otherwise no command required.
- Frontend-only: run frontend lint/test/build scripts if available.
- Backend-only: run backend lint/test scripts if available.
- Cross-stack: run backend checks, frontend checks, and any root CI-equivalent command.
- PR-ready: include the closest local equivalent of CI.
- Already-satisfied goal: run the narrowest command that covers the existing
  implementation and tests. If no local check exists, report the no-op as
  `Ready For PR: no` with a verification gap instead of pretending it passed.

## Lockfile Hygiene (mandatory after any install)

Large JS/monorepos (npm/yarn/pnpm) often rewrite the lockfile during install or
test setup. That churn is **setup**, never part of a feature diff, and it fails
benchmark/PR scope checks.

1. Before running an install, note the lockfile (`package-lock.json`,
   `pnpm-lock.yaml`, `yarn.lock`) and other manifests as off-limits.
2. After install/test, if the lockfile or manifest changed only for setup,
   restore it immediately:

```bash
git checkout -- package-lock.json pnpm-lock.yaml yarn.lock go.sum 2>/dev/null || true
git restore --staged package-lock.json pnpm-lock.yaml yarn.lock 2>/dev/null || true
```

3. Re-confirm with `git status` that no lockfile/manifest remains modified or
   staged before handing off.
4. Only keep lockfile changes when the accepted goal explicitly adds/updates a
   dependency.

## Failure Handling

When a command fails:

1. Stop running broader commands unless a narrower follow-up is needed to isolate the issue.
2. Capture the first real error, not the last noisy line.
3. Record whether the failure is:
   - environment/setup.
   - pre-existing unrelated failure.
   - introduced by current change.
   - unknown.
4. Hand off to `debugger` with command, exit code, first error, and inspected files.
5. If a missing dependency or environment package blocks tests, classify it as
   `environment/setup`, then run a non-mutating fallback check such as an
   existing build script when available. Do not install a new dependency to turn
   red tests green unless that dependency is part of the requested product
   change.

## Output

```markdown
## Verification Result

Scope:

Commands:
| Command | Result | Reason |
|---|---|---|

First Failure:
- command:
- exit_code:
- error:
- classification:

Coverage:

Ready For PR:
- yes | no

Next Step:
```

## Anti-patterns

- Reporting success without running available relevant checks.
- Treating "feature already exists" as verified without a test command or a
  clearly documented environment/setup blocker.
- Running the same failing command repeatedly without a change or new hypothesis.
- Hiding test failures behind "looks fine".
- Skipping tests because they are slow without recording the tradeoff.
- Inventing test commands while ignoring scripts already declared in manifests.
- Adding dependencies or lockfile changes only to satisfy the local test runner.
