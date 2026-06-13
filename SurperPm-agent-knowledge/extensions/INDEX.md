# extensions index

Extension prompts injected by `SuperPmAgent-core/hooks/pre-tool-use.py` via the
`find-extensions` skill, with haiku micro-decision filtering.

## Layout

```
extensions/
├── skills/<skill-name>/<tag>.md      # tag a specific skill
├── mcp/<server-name>/<tag>.md         # tag an MCP server
└── plugins/<plugin-name>/<tag>.md     # tag an entire plugin
```

## File schema

```markdown
---
target: skill:coding              # skill:<name> | mcp:<name> | plugin:<name>
tags: [tdd, testing]              # free-form keywords for haiku matching
when: <natural language condition>
priority: high | medium | low
---

<prompt fragment to inject>
```

## How injection works

1. Tool/skill/MCP about to be invoked.
2. Hook reads files matching the target.
3. Haiku filters by current task + frontmatter.
4. Selected fragments inject into main AI's next turn.

## Status

This directory is empty initially. PMs author extensions via Web `/config`.
