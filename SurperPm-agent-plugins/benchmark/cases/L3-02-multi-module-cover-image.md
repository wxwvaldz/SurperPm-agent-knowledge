---
id: L3-02
title: Multi-module cover image decomposition
level: L3
scope: planning
target_repo: conduit
allowed_backend_change: true
---

# L3-02 Multi-Module Cover Image Decomposition

## Goal

给文章增加封面图，编辑时能填写，列表和详情都能看到，旧文章不能坏。

## Acceptance Criteria

- SuperPmAgent identifies model, API, form, list card, detail page, and test surfaces before editing.
- SuperPmAgent asks only missing policy questions such as optionality and validation.
- SuperPmAgent produces an ordered plan before implementation.
- Verification includes backend and frontend checks.

## Expected Find

- `SuperPmAgent-business/skills/add-db-field/SKILL.md`
- `SuperPmAgent-business/skills/add-ui-form/SKILL.md`
- `SuperPmAgent-coding/skills/repo-explorer/SKILL.md`
- `SuperPmAgent-coding/skills/run-tests/SKILL.md`

## Required Checks

- Plan includes all required cross-stack surfaces.
- Implementation does not start as frontend-only.
- Existing articles without cover image remain supported.

## Failure Conditions

- Agent edits only frontend and ignores persistence/API.
- Agent starts coding before identifying data flow.
- Agent breaks existing article rendering for old data.
