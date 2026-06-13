# sessions/

Multi-turn chat folders. Each folder is one PM session = one prospective /goal.

## Folder shape

```
<session-name>/
├── conversation.md      # full chat history (auto-appended by Web /knowledge chat)
├── notes.md             # PM's free-form notes
├── decisions.md         # key decisions made during clarification
├── attachments/         # screenshots, PRD excerpts, links
└── executions/          # /goal run receipts (post-execution)
    └── <YYYY-MM-DD-run-N>.md
```

## Naming

Default: `<slug-from-first-message>-<YYYYMMDD>`. PM may rename via `git mv`.

## Lifecycle

- A session can be re-run multiple times via /goal.
- After each /goal, a receipt is added to `executions/`.
- The session itself is not consumed; `distill` writes new artifacts to `SuperPmAgent-business/skills/` and `knowledge/domain/`, not back here.

## Privacy

The session folder is **private to its /goal run** — only that run sees it. Other knowledge subtrees (profiles/domain/extensions) are globally visible.
