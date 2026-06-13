---
id: DV-20
title: Go SI prefix formatter
level: DV
track: B
target_repo_type: go-module
target_repo: dv-go-humanize
scope: go-src-tests
allowed_backend_change: false
allowed_paths:
  - *.go
  - **/*.go
forbidden_paths:
  - go.mod
  - go.sum
dependency_policy: no-module-sum-changes
required_checks:
  - go test ./...
oracle: |
  Adds SI(value float64) string like 1.2K for 1200 in humanize package. go test ./... passes. go.mod/go.sum unchanged.

review_status: pending
---

# DV-20 Go SI prefix formatter

## Goal

在 go-humanize 包中新增 `SI(v float64) string`：用 SI 前缀格式化数字（如 1200 -> `1.2 K`）。`go test ./...` 通过。禁止改 go.mod/go.sum。

## Acceptance Criteria

- SI function with tests.
- go test green.

## Expected Find

- `SuperPmAgent-coding/skills/repo-explorer/SKILL.md`
- `SuperPmAgent-coding/skills/coding/SKILL.md`
- `SuperPmAgent-coding/skills/run-tests/SKILL.md`

## Expected Locate

- *.go in module root

## Required Checks

- `go test ./...`

## Failure Conditions

- go.mod/go.sum changed.
