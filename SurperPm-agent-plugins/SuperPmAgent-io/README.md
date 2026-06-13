# SuperPmAgent IO

`SuperPmAgent-io` contains SuperPmAgent input and output skills only.

It does not provide slash commands.
It does not drive agents through backend code.

## Responsibilities

- Input skills normalize external PM references into
  `attachments/sources/*.json`.
- Output skills register derived artifacts into
  `attachments/exports/*.json`.
- `/goal` consumes the session, not raw links or derived artifacts.

## Skills

- `input/normalize-url`: generic or unknown URL fallback.
- `input/normalize-feishu-doc`: Feishu/Lark document normalization.
- `input/normalize-bilibili-video`: shared-browser Bilibili video reference normalization.
- `input/normalize-douyin-video`: shared-browser Douyin video reference normalization.
- `output/export-feishu-prd`: Feishu PRD derived artifact registration.
- `output/export-ppt`: PPT outline and artifact registration.

## Protocol

The canonical IO protocol lives at
`SuperPmAgent-io/contracts/IO-PROTOCOL.md`.
