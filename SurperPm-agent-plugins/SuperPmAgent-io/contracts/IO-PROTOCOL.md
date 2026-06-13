# Session I/O Protocol

This document defines how `/SuperPmAgent-core:clarify` should accept external inputs
and how clarity-related output plugins should register deliverables back into a
session.

The goal is to keep `<KNOWLEDGE_REPO_PATH>/sessions/<session-name>/` as the
single SuperPmAgent system-of-record, while still allowing rich inputs and external
output formats.

This file lives in `SuperPmAgent-plugins` because it defines the session protocol.
Real session data should live in the checked-out `SuperPmAgent-knowledge`
repository.

## Design Principles

- Every clarity flow must end in a session update.
- External inputs do not replace `notes.md`; they enrich the session.
- External outputs do not replace the session; they are derived artifacts.
- `/goal` consumes the session, not a raw external document or media link.
- External material never replaces a PM-confirmed IntentSpec.

## Supported Input Classes

The protocol supports these input classes:

- `text`: plain PM request text.
- `url`: generic webpage or issue link.
- `feishu_doc`: Feishu/Lark document link.
- `bilibili_video`: Bilibili video link.
- `douyin_video`: Douyin video link.
- `attachment_ref`: explicit supporting file or asset reference.

Additional input classes may be added later without changing the session model.

## Normalized Input Record

Input plugins should normalize source material into the same record shape before
clarity consumes it.

```json
{
  "record_type": "normalized_input",
  "source_type": "url",
  "source_uri": "https://example.com/item",
  "title": "Short human-readable label",
  "summary": "Short extracted or user-supplied summary",
  "raw_request": "Original PM wording, if any",
  "user_context": "What the PM said they want to reference from this source",
  "extracted_points": [
    "Point one",
    "Point two"
  ],
  "risks": [
    "Potential uncertainty or extraction caveat"
  ],
  "provider_metadata": {
    "provider": "optional source provider",
    "resource_kind": "optional source subtype",
    "capture_method": "link-plus-user-context",
    "content_access": "link_only",
    "needs_followup_confirmation": true
  }
}
```

Allowed source_type values: `text`, `url`, `feishu_doc`, `bilibili_video`, `douyin_video`, `attachment_ref`.

Required fields that all normalized input records must retain:

- `record_type`
- `source_type`
- `source_uri`
- `raw_request`
- `user_context`
- `summary`
- `extracted_points`
- `risks`
- `provider_metadata`

`provider_metadata` should preserve provider-specific details such as Feishu
document tokens, shared-browser capture strategy, and follow-up requirements.

Allowed values:

- `provider_metadata.capture_method`: `link_only`, `link-plus-user-context`, `link-plus-summary`, `fetched_text`
- `provider_metadata.content_access`: `link_only`, `pm_summary`, `transcript_available`, `fetched_text`

## Shared Browser / Link-plus-user-context

When a PM discusses material visible in the shared browser and says things like
"refer to this", "make something like this", or "use the second part of this document", the agent must not
pretend that the full external content has already been read or understood.

This is the `shared browser context / link-plus-user-context` rule:

- Register the external link as a source record.
- Mark `provider_metadata.capture_method = "link-plus-user-context"` when the
  main evidence is the link plus the PM's explanation.
- Store the PM's original wording in `raw_request`.
- Store the PM's explanation of what matters in `user_context`.
- Record risk when the external content was not fully readable, fetched, or
  otherwise verifiable.
- Make `/clarify` ask which aspects are actually relevant.
- Allow only PM-confirmed content to graduate into `decisions.md`.

Therefore:

- content seen in the shared browser is not automatically trusted fact;
- if the agent cannot read the content, it must record uncertainty rather than
  inventing detail;
- PM verbal context must be preserved as `user_context`;
- external input enriches the session but never replaces the IntentSpec.

## Session Landing Rules For Inputs

Normalized inputs should be written into the session using these rules:

- `conversation.md`
  - Stores the PM's request, follow-up questions, and clarification transcript.
  - May include a short note that a source was attached or referenced.
- `notes.md`
  - Stores only the structured IntentSpec.
  - Must not become a dump of raw external source content.
- `decisions.md`
  - Stores PM-confirmed boundaries, exclusions, and explicit trade-offs.
  - Should not record unconfirmed extracted guesses as decisions.
- `attachments/`
  - Stores source references or derivative metadata files for external inputs.

Ownership:

- Input plugins may register source metadata.
- `/clarify` remains responsible for reflecting only stable clarified meaning
  into `notes.md` and `decisions.md`.

## `attachments/` Conventions

Input plugins should prefer small reviewable metadata files instead of copying
large remote assets into the repository.

Recommended layout:

```text
attachments/
  sources/
    <slug>.json
  exports/
    <slug>.json
```

Recommended `attachments/sources/<slug>.json` payload:

```json
{
  "record_type": "normalized_input",
  "source_type": "feishu_doc",
  "source_uri": "https://example.com/doc",
  "title": "PRD draft",
  "summary": "Current draft for phone-field request",
  "raw_request": "Please organize this Feishu doc into an executable requirement session.",
  "user_context": "The PM says the doc describes the desired registration-flow changes.",
  "captured_at": "2026-06-13Z",
  "extracted_points": [
    "Need backend and frontend changes"
  ],
  "risks": [
    "Document may still be under discussion"
  ],
  "provider_metadata": {
    "provider": "feishu",
    "resource_kind": "doc",
    "capture_method": "link-plus-summary",
    "content_access": "fetched_text",
    "needs_followup_confirmation": true
  }
}
```

Feishu-specific example:

```json
{
  "record_type": "normalized_input",
  "source_type": "feishu_doc",
  "source_uri": "https://example.feishu.cn/docx/xxxxx",
  "title": "User phone field PRD",
  "summary": "Feishu draft covering a new phone field and registration flow adjustments.",
  "raw_request": "This is our requirement doc. Please turn it into an executable requirement session.",
  "user_context": "The PM wants the registration and profile impacts reflected into the session.",
  "extracted_points": [
    "Add a user phone field",
    "Add phone input to the registration form",
    "Return phone in the backend response"
  ],
  "risks": [
    "Document may still be under discussion",
    "Document content is not automatically PM-final unless reconfirmed during clarification"
  ],
  "provider_metadata": {
    "provider": "feishu",
    "resource_kind": "doc",
    "doc_token": "xxxxx",
    "host": "example.feishu.cn",
    "capture_method": "link-plus-summary",
    "content_access": "fetched_text",
    "needs_followup_confirmation": true
  }
}
```

Feishu execution note:

- Prefer reading Feishu document content through the existing `lark-doc` skill.
- Use `lark-shared` rules for auth and permission handling.
- If fetch fails, keep the source record and mark the uncertainty in `risks`
  rather than dropping the input.

Rules:

- Prefer storing links plus extracted metadata over binary payloads.
- If a plugin must materialize content, keep it small and text-based when possible.
- Session attachments should remain reviewable in Git.

## Output Classes

Clarity-related output plugins may produce:

- `feishu_prd`
- `ppt`
- `link`
- `markdown_export`

These are delivery artifacts derived from the session. They do not replace the
IntentSpec.

## Normalized Output Record

Output plugins should return and register a normalized record like this:

```json
{
  "record_type": "derived_output",
  "output_type": "feishu_prd",
  "title": "PRD: phone field",
  "artifact_uri": "https://example.com/output",
  "source_session": "<KNOWLEDGE_REPO_PATH>/sessions/add-phone-field-20260613",
  "source_files": [
    "notes.md",
    "decisions.md"
  ],
  "generated_at": "2026-06-13Z"
}
```

Allowed output_type values: `feishu_prd`, `ppt`, `link`, `markdown_export`.

## Session Landing Rules For Outputs

Output plugins should register generated artifacts back into the same session.

Recommended behavior:

- Write an artifact metadata file under `attachments/exports/`.
- Add a short entry to `decisions.md` or a dedicated artifact section later if
  the exported artifact changes the working agreement.
- Keep `notes.md` focused on executable requirement intent, not document links.

Ownership:

- Output plugins own artifact registration under `attachments/exports/`.
- Export records do not become `/goal` source-of-truth inputs by themselves.

Recommended `attachments/exports/<slug>.json` payload:

```json
{
  "record_type": "derived_output",
  "output_type": "feishu_prd",
  "title": "PRD: phone field",
  "artifact_uri": "https://example.com/doc",
  "source_session": "<KNOWLEDGE_REPO_PATH>/sessions/add-phone-field-20260613",
  "source_files": [
    "notes.md",
    "decisions.md"
  ],
  "generated_at": "2026-06-13Z"
}
```

## Relationship To `/goal`

The handoff contract stays unchanged:

- `/clarify` creates or updates the session.
- Input plugins enrich the session through normalized records.
- Output plugins publish artifacts and register them back into the session.
- `/goal` still reads `notes.md` first, then `decisions.md`, then
  `conversation.md`.

Therefore:

- a Feishu document link alone is not executable input for `/goal`;
- a Bilibili or Douyin link alone is not executable input for `/goal`;
- a shared browser reference alone is not executable input for `/goal`;
- an exported PRD or PPT link alone is not executable input for `/goal`.

They become useful only after their meaning is reflected into the session.

## MVP Recommendations

For the first implementation wave:

1. Implement `feishu_doc` input normalization first.
2. Implement `link` and generic `url` as a fallback path.
3. Treat `bilibili_video` and `douyin_video` as `link-plus-user-context` inputs first.
4. Implement `feishu_prd` as the first output plugin.
5. Add `ppt` output as artifact metadata, outline, and slide plan before any binary deck generation path.
