# Benchmark Metrics

## Core Metrics

| Metric | Definition | Source |
|---|---|---|
| pass_rate | Completed cases that satisfy acceptance criteria divided by total attempted cases | run records + human review |
| locate_hit_rate | True edited file appears in top N locate candidates | `repo-explorer` evidence |
| backend_violation_rate | Frontend-only cases that changed backend files | git diff summary |
| test_success_rate | Cases with relevant checks passing | `run-tests` evidence |
| debug_recovery_rate | Failed first verification but passed after bounded debug loop | `debugger` evidence |
| pr_or_commit_rate | Cases ending with PR URL or commit hash | `submit-pr` evidence |
| distill_yield | Cases that produce a useful distill candidate | distill output |
| intervention_count | Number of human interventions needed after goal start | run metadata |

## Cost And Runtime Metrics

| Metric | Definition | Source |
|---|---|---|
| wall_time_seconds | Time from `task:queued` to terminal event | run event timestamps |
| input_tokens | Provider-reported input tokens | provider usage |
| output_tokens | Provider-reported output tokens | provider usage |
| cache_tokens | Provider-reported cache read/write tokens when available | provider usage |
| failure_phase | First phase that failed | `task:failed` |
| failure_reason | First real failure reason | `run-tests` or `debugger` |
| skill_hash | Hash or version record for goal/find/coding skills | `skill-versions.json` |

## Reporting Table (measured)

Last reviewed: **2026-06-13** (rounds 001–006 + structural probe).

| Group | Cases | Pass | Locate Hit | Test Success | Avg Time | Avg Tokens | Interventions | Distill Yield |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Baseline | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| SuperPmAgent Coding (Track A) | 8 | 5 | — | 5 | — | — | 0 | 1 |
| SuperPmAgent Cross-Repo (XR smoke) | 4 | 3 | — | n/a | — | — | 0 | 0 |
| SuperPmAgent Web Contract | 0 | 0 | — | — | — | — | 0 | 0 |
| SuperPmAgent Distill | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |

### Track A grading (round-005, primary evidence)

| Case | Run | Review | Notes |
|---|---|---|---|
| L1-01 | 2026-06-13Z | **pass** | Frontend reading count; no backend/deps (`dependency_changed: false`). |
| L2-01 | 2026-06-13Z | **pass** | coverImage cross-stack; distill candidate noted. |
| L3-03 | 2026-06-13Z | **pass** | Contradiction gate; no implementation (expected). |
| L1-01 | round-004 | fail | `dependency_changed` (jsdom pollution) — fixed in Phase D round 005. |

Earlier rounds (001–003): L1/L2 **needs_review** with git changes; L3 **no_changes** (gate). Counted as partial until round-005 guardrails.

### Track B XR smoke (round-006)

| Case | Review | Notes |
|---|---|---|
| XR-01 / XR-02 | **pass** (docs-only) | README smoke on external repos; push blocked upstream (submit blocker, not coding fail). |

### Round-008 (2026-06-13) — full matrix

| Case | Review |
|---|---|
| L1-01, L2-01, L3-03 | **pass** (isolated trio) |
| XC-01, XC-02, XC-03 | **pass** |
| WEB-01..04 | **pass** |

Cumulative Track A (rounds 005–008): **8/8** graded passes on last run per case type; L3 gate clean on round-008.

### Round-007 (2026-06-13)

| Case | Run | Review |
|---|---|---|
| WEB-01..04 | 2026-06-13Z | **pass** (contract script) |
| XC-01 | 2026-06-13Z | **pass** (clamp + tests, no deps) |
| XC-03 | 2026-06-13Z | fail (API disconnect, no diff) |
| L1-01 | 2026-06-13Z | **pass** |
| L2-01 | 2026-06-13Z | **pass** |
| L3-03 | 2026-06-13Z | **pass** (contradiction gate) |

| Group | Cases | Pass |
|---|---:|---:|
| SuperPmAgent Web Contract | 4 | 4 |
| SuperPmAgent Cross-Repo (XC) | 2 | 1 |
| SuperPmAgent Coding (Track A, round-007) | 3 | 3 |

**WEB contract:** `python scripts/test-web-contract.py --record` each round.

Structural probe (no model): `benchmark/runs/_probe/2026-06-13-migration-smoke.jsonl`.

## Failure Taxonomy

| Failure Phase | Meaning |
|---|---|
| clarify | The goal remained ambiguous or the agent asked the wrong question |
| find | The wrong skill or knowledge was selected |
| repo-explorer | The target files or data flow were wrong |
| coding | The generated patch was incorrect or out of scope |
| run-tests | Verification command failed |
| debugger | The debug loop did not recover within the attempt limit |
| submit-pr | Branch, commit, push, or PR creation failed |
| distill | No useful reusable lesson was extracted when one should exist |

## Review Rules

- A run cannot be marked **pass** without acceptance criteria evidence.
- A run with skipped available tests must record why.
- A frontend-only case that changes backend files is a scope violation unless reclassified.
- README-only `XR-*` results do not substitute for `XC-*` code case pass rate.
- Provider output fixtures must be redacted before commit.

### Round-008 auto-review (2026-06-13 UTC)

| pass | fail | needs_review | infra_error |
|---:|---:|---:|---:|
| 10 | 0 | 0 | 0 |

### Round-009 auto-review (2026-06-13 UTC)

| pass | fail | needs_review | infra_error |
|---:|---:|---:|---:|
| 8 | 1 | 2 | 0 |

### Round-011 auto-review (2026-06-13 UTC)

| pass | fail | needs_review | infra_error |
|---:|---:|---:|---:|
| 10 | 0 | 0 | 0 |

### Round-012 auto-review (2026-06-13 UTC)

| pass | fail | needs_review | infra_error |
|---:|---:|---:|---:|
| 9 | 0 | 1 | 0 |

### Round-013 auto-review (2026-06-13 UTC)

| pass | fail | needs_review | infra_error |
|---:|---:|---:|---:|
| 10 | 0 | 0 | 0 |

### Round-014 auto-review (2026-06-13 UTC)

| pass | fail | needs_review | infra_error |
|---:|---:|---:|---:|
| 1 | 0 | 0 | 0 |

### Round-015 auto-review (2026-06-13 UTC)

| pass | fail | needs_review | infra_error |
|---:|---:|---:|---:|
| 1 | 0 | 0 | 0 |

### Round-016 auto-review (2026-06-13 UTC)

| pass | fail | needs_review | infra_error |
|---:|---:|---:|---:|
| 1 | 0 | 0 | 0 |

### Round-017 auto-review (2026-06-13 UTC)

| pass | fail | needs_review | infra_error |
|---:|---:|---:|---:|
| 1 | 0 | 0 | 0 |

### Round-018 auto-review (2026-06-13 UTC)

| pass | fail | needs_review | infra_error |
|---:|---:|---:|---:|
| 1 | 0 | 0 | 0 |

### Round-019 auto-review (2026-06-13 UTC)

| pass | fail | needs_review | infra_error |
|---:|---:|---:|---:|
| 1 | 0 | 0 | 0 |

### Round-020 auto-review (2026-06-13 UTC)

| pass | fail | needs_review | infra_error |
|---:|---:|---:|---:|
| 1 | 0 | 0 | 0 |

### Round-021 auto-review (2026-06-13 UTC)

| pass | fail | needs_review | infra_error |
|---:|---:|---:|---:|
| 1 | 0 | 0 | 0 |

### Round-022 auto-review (2026-06-13 UTC)

| pass | fail | needs_review | infra_error |
|---:|---:|---:|---:|
| 1 | 0 | 0 | 0 |

### Round-023 auto-review (2026-06-13 UTC)

| pass | fail | needs_review | infra_error |
|---:|---:|---:|---:|
| 1 | 0 | 0 | 0 |

### Round-024 auto-review (2026-06-13 UTC)

| pass | fail | needs_review | infra_error |
|---:|---:|---:|---:|
| 1 | 0 | 0 | 0 |

### Round-025 auto-review (2026-06-13 UTC)

| pass | fail | needs_review | infra_error |
|---:|---:|---:|---:|
| 1 | 0 | 0 | 0 |

### Round-026 auto-review (2026-06-13 UTC)

| pass | fail | needs_review | infra_error |
|---:|---:|---:|---:|
| 1 | 0 | 0 | 0 |

### Round-027 auto-review (2026-06-13 UTC)

| pass | fail | needs_review | infra_error |
|---:|---:|---:|---:|
| 1 | 0 | 0 | 0 |

### Round-028 auto-review (2026-06-13 UTC)

| pass | fail | needs_review | infra_error |
|---:|---:|---:|---:|
| 1 | 0 | 0 | 0 |

### Round-029 auto-review (2026-06-13 UTC)

| pass | fail | needs_review | infra_error |
|---:|---:|---:|---:|
| 1 | 0 | 0 | 0 |

### Round-030 auto-review (2026-06-13 UTC)

| pass | fail | needs_review | infra_error |
|---:|---:|---:|---:|
| 1 | 0 | 0 | 0 |

### Round-031 auto-review (2026-06-13 UTC)

| pass | fail | needs_review | infra_error |
|---:|---:|---:|---:|
| 1 | 0 | 0 | 0 |

### Round-032 auto-review (2026-06-13 UTC)

| pass | fail | needs_review | infra_error |
|---:|---:|---:|---:|
| 1 | 0 | 0 | 0 |

### Round-033 auto-review (2026-06-13 UTC)

| pass | fail | needs_review | infra_error |
|---:|---:|---:|---:|
| 1 | 0 | 0 | 0 |
