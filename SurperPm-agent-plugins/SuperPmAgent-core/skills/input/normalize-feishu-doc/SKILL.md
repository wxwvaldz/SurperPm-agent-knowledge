---
name: SuperPmAgent-normalize-feishu-doc
description: Normalize a Feishu/Lark document link into a reviewable session source record before `/SuperPmAgent-core:clarify` updates IntentSpec files. Use when the PM provides a Feishu document as a formal requirement source rather than a generic reference URL.
argument-hint: "session name plus Feishu document URL and any PM context"
---

# Normalize Feishu Doc

Turn a Feishu/Lark document link into a normalized session input record.

This skill specializes the generic URL normalization path for Feishu document
inputs. It should be preferred over `input/normalize-url` when the source is
clearly a Feishu doc and the document is meant to inform requirement
clarification.

See [`TESTING.md`](TESTING.md) for the manual MVP verification flow.

## Use When

Use this skill when:

- the PM provides a Feishu/Lark document link;
- the document is part of the requirement input, not just a casual reference;
- the team wants a stable session record that preserves where requirement
  context came from.

## Inputs

- `session_name`
- `feishu_doc_url`
- `raw_request` or surrounding PM message
- Optional user-supplied title or summary

## Execution Path

For the first real execution path, this skill should reuse existing Lark
capabilities instead of inventing a custom Feishu fetcher.

Preferred flow:

1. Confirm the input is a Feishu/Lark document URL.
2. Use the shared Lark auth/permission rules from `lark-shared`.
3. Use `lark-doc` to fetch the document content from the provided URL.
4. Extract only a small reviewable subset:
   - title
   - short summary
   - a few requirement-relevant points
   - obvious uncertainty or draft risks
5. Write the normalized source record into the session.
6. Let `/clarify` continue from that record plus the PM's explicit statements.

## Lark Dependencies

This skill should rely on:

- `lark-shared` for auth, permission, and environment handling
- `lark-doc` for document fetch and read behavior

It should not implement a parallel Feishu document reader when those skills are
already available.

## Output Goal

Produce a normalized source record that follows
the session I/O protocol document in this repo.

## Required Record Shape

```json
{
  "source_type": "feishu_doc",
  "source_uri": "https://example.feishu.cn/docx/xxxxx",
  "title": "Short human-readable label",
  "summary": "Short extracted or user-supplied summary",
  "raw_request": "Original PM wording, if any",
  "extracted_points": [
    "Point one",
    "Point two"
  ],
  "risks": [
    "Potential uncertainty or extraction caveat"
  ],
  "provider_metadata": {
    "provider": "feishu",
    "resource_kind": "doc",
    "doc_token": "xxxxx",
    "host": "example.feishu.cn",
    "capture_method": "link-plus-summary",
    "needs_followup_confirmation": true
  }
}
```

## Write Path

Write the normalized record under:

```text
<KNOWLEDGE_REPO_PATH>/sessions/<session-name>/attachments/sources/<slug>.json
```

Where `<slug>` should be a short stable label such as
`feishu-doc-user-phone-prd`.

## Session Update Rules

When using this skill:

1. Write or update the normalized source record in `attachments/sources/`.
2. Add a short source-registration note to `conversation.md`.
3. Do not copy the document into `notes.md`.
4. Reflect only clarified stable meaning into `notes.md`.
5. Record only PM-confirmed boundaries in `decisions.md`.

## Feishu-Specific Guidance

- Classify the source as `feishu_doc`, not generic `url`.
- Prefer link-plus-summary registration for the MVP.
- Preserve any known title or PM-supplied interpretation.
- Surface uncertainty in `risks` when the document appears draft-like or still
  under discussion.

## Fallback Rules

If the document cannot be read because of auth, permission, or fetch limits:

1. Still register the source as `feishu_doc`.
2. Preserve the original link in `source_uri`.
3. Use any PM-supplied description as `summary`.
4. Add a risk such as:
   - `Feishu content could not be fetched during normalization`
   - `Document access may require additional auth or permission`
5. Continue clarification, but do not overstate unverified document content.

This fallback keeps the session usable without pretending that the document was
successfully interpreted.

## MVP Limits

For the first implementation wave, this skill should:

- treat the Feishu doc as a structured source type;
- preserve the link, summary, and extracted points;
- keep output small and reviewable.
- reuse `lark-doc` for reads rather than building a new fetch path.

It should not:

- assume the full document content is final or PM-approved;
- treat the document alone as sufficient for `ready_for_goal: yes`;
- replace focused clarification questions when requirement ambiguity remains.
