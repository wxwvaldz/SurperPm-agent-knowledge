---
name: SuperPmAgent-normalize-url
description: Normalize URL-like PM inputs into a reviewable source record before `/SuperPmAgent-core:clarify` updates session files. Use for generic URLs first; downstream adapters may specialize Feishu docs, Bilibili, or Douyin later.
argument-hint: "session name plus source URL and any user-supplied context"
---

# Normalize URL

Turn a raw external link into a normalized session input record.

This skill is a preprocessing step for `/SuperPmAgent-core:clarify`.
It does not replace clarification and it does not write executable intent into
`notes.md` by itself.

## Use When

Use this skill when the PM provides:

- a generic webpage URL;
- an issue URL;
- a Feishu document URL before a dedicated adapter exists;
- a Bilibili or Douyin link before video-specific extraction exists.

## Inputs

- `session_name`
- `source_url`
- `raw_request` or surrounding PM message
- Optional user-supplied title or summary

## Output Goal

Produce a normalized source record that follows
the session I/O protocol document in this repo.

## Required Record Shape

```json
{
  "source_type": "url",
  "source_uri": "https://example.com/item",
  "title": "Short human-readable label",
  "summary": "Short extracted or user-supplied summary",
  "raw_request": "Original PM wording, if any",
  "extracted_points": [
    "Point one",
    "Point two"
  ],
  "risks": [
    "Potential uncertainty or extraction caveat"
  ]
}
```

## Write Path

Write the normalized record under:

```text
<KNOWLEDGE_REPO_PATH>/sessions/<session-name>/attachments/sources/<slug>.json
```

Where `<slug>` should be a short stable name derived from the URL host and page
purpose when possible.

## Session Update Rules

When using this skill:

1. Write or update the normalized source record in `attachments/sources/`.
2. Add a short note to `conversation.md` that the source was attached or
   referenced.
3. Do not dump the raw webpage into `notes.md`.
4. Reflect only stable clarified meaning into `notes.md`.
5. Record only PM-confirmed boundaries in `decisions.md`.

## Classification Guidance

Until dedicated adapters exist:

- Use `source_type: "url"` for generic links.
- Use `source_type: "feishu_doc"` only when the source is clearly a Feishu doc
  and the available context is enough to justify that classification.
- Use `source_type: "bilibili_video"` or `source_type: "douyin_video"` only
  when the video platform is certain, even if extraction remains shallow.

## MVP Limits

For the first implementation wave, this skill should:

- prefer link registration over deep crawling;
- prefer user-supplied summaries over speculative extraction;
- keep records small and reviewable;
- surface uncertainty in `risks`.

It should not:

- invent scope from an uninspected link;
- mark a session `ready_for_goal: yes` from a link alone;
- replace clarification questions when ambiguity remains.
