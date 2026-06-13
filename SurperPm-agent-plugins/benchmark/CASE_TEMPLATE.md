---
id: CASE-ID
title: Short title
level: L1
track: A
target_repo_type: conduit-monorepo
target_repo: conduit
target_repo_path: ""
scope: frontend-only
allowed_backend_change: false
allowed_paths:
  - frontend/**
forbidden_paths:
  - backend/**
  - package-lock.json
  - package.json
dependency_policy: no-manifest-or-lockfile-changes
required_checks:
  - frontend lint or test from package.json scripts
oracle: |
  Human/script pass criteria in one paragraph.
review_status: pending
---

# CASE-ID Title

## Goal

(One paragraph PM-style goal for `/SuperPmAgent-core:goal`.)

## Acceptance Criteria

- Bullet list of observable outcomes.

## Expected Find

- Skills or knowledge to discover.

## Expected Locate

- File or module hints (not mandatory paths for agent).

## Required Checks

- Commands or evidence types.

## Failure Conditions

- Scope violations and wrong behaviors.

## Pass Oracle (machine-assist)

- `git diff` must not touch paths matching forbidden_paths.
- dependency_policy: no changes to manifests/lockfiles unless goal requests dependencies.
- oracle field must be satisfiable from diff + test output in run artifacts.

## Review

| Field | Value |
|---|---|
| review_status | pending / pass / fail / needs_review |
| reviewed_run | |
| reviewer_notes | |
