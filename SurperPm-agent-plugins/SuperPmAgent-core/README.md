# SuperPmAgent Core

`SuperPmAgent-core` contains the two human-facing commands and the shared orchestration skills.

## Commands

- `/SuperPmAgent-core:clarify`: turn an ambiguous PM request into a session IntentSpec under `<KNOWLEDGE_REPO_PATH>/sessions/<session-name>/`.
- `/SuperPmAgent-core:goal`: consume the session IntentSpec from `notes.md` and start a delivery loop from that structured requirement.

The core SuperPmAgent flow is:

```text
/SuperPmAgent-core:clarify
-> <KNOWLEDGE_REPO_PATH>/sessions/<session-name>/
-> notes.md IntentSpec
-> /SuperPmAgent-core:goal --session <session-name>
```

`notes.md` is the main structured input for `/goal`.

`<KNOWLEDGE_REPO_PATH>` should point to the checked-out `SuperPmAgent-knowledge`
repository. The `knowledge/` directory inside `SuperPmAgent-plugins` stores session
protocol docs and templates only, not live PM sessions.

## Skills

- `find`: discover relevant skills and knowledge by directory convention.
- `find-extensions`: select extension prompts for a target skill, MCP, or plugin.
- `distill`: convert a completed loop into skill or knowledge PR candidates.

IO normalization and export skills now live in the separate `SuperPmAgent-io`
plugin. `SuperPmAgent-core` references them during clarification but does not host
those provider skills directly.

These core skills support orchestration before, during, or after delivery
execution.

## Hooks

- `pre-tool-use.py`: extension prompt injection entry.
- `stop.py`: loop stop handler for self-heal and distillation handoff.
