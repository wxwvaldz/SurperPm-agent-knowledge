#!/usr/bin/env python3
"""Generate app-50 repository manifest and AP-* benchmark cases."""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BENCH = ROOT / "benchmark"
CASES = BENCH / "cases"


REPOS = [
    ("ap-gitea", "https://github.com/go-gitea/gitea.git", "go-web-app", "Repository hosting"),
    ("ap-gogs", "https://github.com/gogs/gogs.git", "go-web-app", "Repository hosting"),
    ("ap-memos", "https://github.com/usememos/memos.git", "go-react-app", "Knowledge/memo app"),
    ("ap-miniflux", "https://github.com/miniflux/v2.git", "go-web-app", "RSS reader"),
    ("ap-listmonk", "https://github.com/knadh/listmonk.git", "go-web-app", "Newsletter manager"),
    ("ap-filebrowser", "https://github.com/filebrowser/filebrowser.git", "go-vue-app", "File manager"),
    ("ap-gotify", "https://github.com/gotify/server.git", "go-web-app", "Notification server"),
    ("ap-drone", "https://github.com/harness/drone.git", "go-web-app", "CI dashboard"),
    ("ap-navidrome", "https://github.com/navidrome/navidrome.git", "go-react-app", "Music server"),
    ("ap-photoprism", "https://github.com/photoprism/photoprism.git", "go-vue-app", "Photo management"),
    ("ap-umami", "https://github.com/umami-software/umami.git", "next-app", "Analytics dashboard"),
    ("ap-formbricks", "https://github.com/formbricks/formbricks.git", "next-app", "Survey platform"),
    ("ap-documenso", "https://github.com/documenso/documenso.git", "next-app", "Document signing"),
    ("ap-twenty", "https://github.com/twentyhq/twenty.git", "fullstack-ts", "CRM"),
    ("ap-plane", "https://github.com/makeplane/plane.git", "fullstack-app", "Project management"),
    ("ap-typebot", "https://github.com/baptisteArno/typebot.io.git", "fullstack-ts", "Chatbot builder"),
    ("ap-budibase", "https://github.com/Budibase/budibase.git", "fullstack-js", "Internal tools"),
    ("ap-directus", "https://github.com/directus/directus.git", "node-vue-app", "Headless CMS"),
    ("ap-strapi", "https://github.com/strapi/strapi.git", "node-react-app", "Headless CMS"),
    ("ap-payload", "https://github.com/payloadcms/payload.git", "next-app", "CMS"),
    ("ap-medusa", "https://github.com/medusajs/medusa.git", "node-app", "Commerce backend"),
    ("ap-n8n", "https://github.com/n8n-io/n8n.git", "node-vue-app", "Workflow automation"),
    ("ap-novu", "https://github.com/novuhq/novu.git", "fullstack-ts", "Notification platform"),
    ("ap-keep", "https://github.com/keephq/keep.git", "python-react-app", "Alert management"),
    ("ap-rocket-chat", "https://github.com/RocketChat/Rocket.Chat.git", "node-react-app", "Team chat"),
    ("ap-chatwoot", "https://github.com/chatwoot/chatwoot.git", "rails-vue-app", "Support inbox"),
    ("ap-discourse", "https://github.com/discourse/discourse.git", "rails-app", "Forum"),
    ("ap-mastodon", "https://github.com/mastodon/mastodon.git", "rails-react-app", "Social network"),
    ("ap-forem", "https://github.com/forem/forem.git", "rails-app", "Community publishing"),
    ("ap-huginn", "https://github.com/huginn/huginn.git", "rails-app", "Automation agents"),
    ("ap-lobsters", "https://github.com/lobsters/lobsters.git", "rails-app", "Link aggregator"),
    ("ap-healthchecks", "https://github.com/healthchecks/healthchecks.git", "django-app", "Cron monitoring"),
    ("ap-pretalx", "https://github.com/pretalx/pretalx.git", "django-app", "Conference management"),
    ("ap-netbox", "https://github.com/netbox-community/netbox.git", "django-app", "Infrastructure inventory"),
    ("ap-superset", "https://github.com/apache/superset.git", "python-react-app", "BI dashboard"),
    ("ap-changedetection", "https://github.com/dgtlmoon/changedetection.io.git", "python-web-app", "Change monitoring"),
    ("ap-django-cms", "https://github.com/django-cms/django-cms.git", "django-app", "CMS"),
    ("ap-saleor", "https://github.com/saleor/saleor.git", "django-graphql-app", "Commerce platform"),
    ("ap-django-oscar", "https://github.com/django-oscar/django-oscar.git", "django-app", "Commerce platform"),
    ("ap-paperless", "https://github.com/paperless-ngx/paperless-ngx.git", "django-app", "Document management"),
    ("ap-akaunting", "https://github.com/akaunting/akaunting.git", "laravel-app", "Accounting"),
    ("ap-invoiceninja", "https://github.com/invoiceninja/invoiceninja.git", "laravel-app", "Invoicing"),
    ("ap-monica", "https://github.com/monicahq/monica.git", "laravel-app", "Personal CRM"),
    ("ap-kanboard", "https://github.com/kanboard/kanboard.git", "php-app", "Kanban"),
    ("ap-wallabag", "https://github.com/wallabag/wallabag.git", "symfony-app", "Read-it-later"),
    ("ap-appsmith", "https://github.com/appsmithorg/appsmith.git", "java-react-app", "Internal tools"),
    ("ap-tooljet", "https://github.com/ToolJet/ToolJet.git", "node-react-app", "Internal tools"),
    ("ap-node-red", "https://github.com/node-red/node-red.git", "node-app", "Flow automation"),
    ("ap-calcom", "https://github.com/calcom/cal.com.git", "next-app", "Scheduling"),
    ("ap-infisical", "https://github.com/Infisical/infisical.git", "node-react-app", "Secret management"),
]


APP_TASKS = {
    "ap-gitea": (
        "Repository stale-review badge and filter",
        "Add a `lastReviewedAt` review signal to repositories and propagate it through the repository list/detail API, UI badge, stale-review filter, and tests or documented verification.",
    ),
    "ap-gogs": (
        "Repository visibility review workflow",
        "Introduce a repository visibility review state that distinguishes public/internal/private review needs, exposes it through API responses, and adds a list filter plus UI indicator without weakening existing access control.",
    ),
    "ap-memos": (
        "Memo review reminder surface",
        "Add a per-memo review reminder timestamp that appears in memo lists and detail/edit flows, supports filtering overdue reminders, and preserves markdown memo behavior.",
    ),
    "ap-miniflux": (
        "Feed privacy-audit status",
        "Add a feed-level privacy audit marker for feeds with external media/tracker handling, surface it in feed management and entry views, and keep default reader behavior unchanged.",
    ),
    "ap-listmonk": (
        "Campaign compliance approval gate",
        "Add a campaign compliance review state before sending newsletters, carry it through campaign APIs, list badges, send-action validation, and tests or blocker evidence.",
    ),
    "ap-filebrowser": (
        "File expiration and restore affordance",
        "Add an optional expiration/retention marker for files or shares, expose it in the API/UI list, and add a restore/clear affordance while respecting the project's maintenance-only scope.",
    ),
    "ap-gotify": (
        "Notification snooze metadata",
        "Add a snooze-until metadata path for messages or applications, propagate it through REST/WebSocket/UI status handling, and make default message lists hide snoozed items where appropriate.",
    ),
    "ap-drone": (
        "Pipeline visibility propagation",
        "Add execution visibility metadata for pipelines/executions and carry it through store types, API/swagger, execution list/detail UI, and verification without dependency churn.",
    ),
    "ap-navidrome": (
        "Playlist curation review flow",
        "Add playlist curation status metadata that appears in playlist list/detail views, supports a reviewed/unreviewed filter, and preserves existing music streaming behavior.",
    ),
    "ap-photoprism": (
        "Photo curation flag workflow",
        "Add a curator-review flag for photos or albums, expose it through search/filter UI and API/model paths, and ensure existing privacy/search semantics remain intact.",
    ),
    "ap-umami": (
        "Website analytics anomaly review",
        "Add an anomaly-review marker for tracked websites or reports, propagate it through server data access and dashboard UI, and provide a filter for unresolved anomalies.",
    ),
    "ap-formbricks": (
        "Survey response triage queue",
        "Add a triage status for survey responses, expose it in response APIs and dashboard filters, and include UI affordances for unresolved/high-priority feedback.",
    ),
    "ap-documenso": (
        "Document signing risk review",
        "Add a risk-review state to documents before sending/signing, propagate it through document list/detail UI and API validation, and avoid changing signing cryptography.",
    ),
    "ap-twenty": (
        "CRM record stewardship workflow",
        "Add record-stewardship metadata for companies/people, surface stale or unassigned stewardship in CRM list/detail views, and preserve existing role/permission behavior.",
    ),
    "ap-plane": (
        "Issue escalation and cycle signal",
        "Add an escalation state for issues that affects issue list/cycle/roadmap views, exposes API/client state, and keeps existing project workflow semantics intact.",
    ),
    "ap-typebot": (
        "Bot conversation handoff review",
        "Add a human-handoff review marker for bot conversation results, propagate it through builder/runtime data surfaces, and add dashboard filtering for unresolved handoffs.",
    ),
    "ap-budibase": (
        "App publish approval gate",
        "Add an approval state before an internal app can be published, wire it through app metadata, API/service validation, builder UI, and relevant tests or verification notes.",
    ),
    "ap-directus": (
        "Collection compliance review",
        "Add a compliance-review metadata path for collections/items, expose it through API/admin UI list filtering, and respect existing permission and schema conventions.",
    ),
    "ap-strapi": (
        "Content review escalation state",
        "Add an escalation state for content entries that appears in admin list/detail views and API responses while preserving existing draft/publish behavior.",
    ),
    "ap-payload": (
        "Collection publish readiness checklist",
        "Add a publish-readiness metadata field for collection documents, carry it through admin UI and API reads, and ensure draft/publish flows still behave correctly.",
    ),
    "ap-medusa": (
        "Order fulfillment exception queue",
        "Add fulfillment-exception metadata for orders, propagate it through services/API/admin display, and keep payment/order state transitions safe.",
    ),
    "ap-n8n": (
        "Workflow change approval guard",
        "Add an approval-required state for editing existing workflows, surface it in workflow list/editor UI, and prevent unapproved execution changes in service/API paths.",
    ),
    "ap-novu": (
        "Notification template rollout status",
        "Add a staged-rollout status for notification templates, expose it in API/dashboard surfaces, and make default send paths respect non-active templates.",
    ),
    "ap-keep": (
        "Alert ownership acknowledgement",
        "Add owner acknowledgement metadata for alerts, surface acknowledged/unacknowledged filters in the UI/API, and preserve existing alert routing behavior.",
    ),
    "ap-rocket-chat": (
        "Channel moderation review queue",
        "Add moderation-review metadata for channels or messages, expose it in list/detail/admin views, and avoid weakening existing room permissions.",
    ),
    "ap-chatwoot": (
        "Conversation SLA breach triage",
        "Add an SLA breach triage state for conversations, propagate it through inbox APIs and UI badges/filters, and keep assignment/status behavior compatible.",
    ),
    "ap-discourse": (
        "Topic policy review marker",
        "Add a policy-review marker for topics, show it in moderation/list views, and preserve trust-level and permission checks.",
    ),
    "ap-mastodon": (
        "Report escalation audit trail",
        "Add an escalation audit marker for moderation reports, expose it in admin report views and API/model paths, and preserve federation safety behavior.",
    ),
    "ap-forem": (
        "Article editorial readiness flow",
        "Add editorial readiness metadata for posts/articles, surface it in author/admin views, and preserve published/draft behavior.",
    ),
    "ap-huginn": (
        "Agent run safety review",
        "Add a safety-review state for automation agents or recent runs, surface it in agent/run UI and service responses, and keep scheduling behavior intact.",
    ),
    "ap-lobsters": (
        "Story review and source quality signal",
        "Add a source-quality review marker for submitted stories, display it in story/moderation views, and preserve voting/comment behavior.",
    ),
    "ap-healthchecks": (
        "Check maintenance-window awareness",
        "Add maintenance-window metadata for checks so scheduled downtime is visible in API/UI and default alerting or status views account for it.",
    ),
    "ap-pretalx": (
        "Proposal review conflict indicator",
        "Add a reviewer-conflict indicator for talk proposals, propagate it through review assignment UI/API, and preserve existing scoring workflows.",
    ),
    "ap-netbox": (
        "Asset decommission review workflow",
        "Add a decommission-review state for selected infrastructure objects, surface it in list/detail/API views, and preserve existing status semantics.",
    ),
    "ap-superset": (
        "Dashboard certification review queue",
        "Add a certification-review marker for dashboards or charts, expose it in list/detail UI and API data, and preserve existing permission checks.",
    ),
    "ap-changedetection": (
        "Watch change importance triage",
        "Add an importance triage status for watched changes, expose unresolved important changes in list/detail UI and backend state, and keep notification behavior safe.",
    ),
    "ap-django-cms": (
        "Page publication readiness state",
        "Add publication readiness metadata for CMS pages, surface it in admin/list views, and preserve existing draft/publish permission behavior.",
    ),
    "ap-saleor": (
        "Product catalog compliance review",
        "Add compliance-review metadata for products, expose it in GraphQL/admin surfaces, and keep product availability and channel behavior intact.",
    ),
    "ap-django-oscar": (
        "Order risk review flag",
        "Add an order risk-review flag through model/API/admin or dashboard surfaces, and preserve existing order pipeline semantics.",
    ),
    "ap-paperless": (
        "Document retention review queue",
        "Add retention-review metadata for documents, surface it in search/list/detail views, and avoid changing OCR/import behavior.",
    ),
    "ap-akaunting": (
        "Invoice approval exception workflow",
        "Add an approval-exception state for invoices or bills, expose it in list/detail UI and service validation, and preserve accounting totals.",
    ),
    "ap-invoiceninja": (
        "Client payment-risk marker",
        "Add a payment-risk marker for clients or invoices, propagate it through API/list/detail UI, and avoid changing payment gateway behavior.",
    ),
    "ap-monica": (
        "Contact follow-up review flow",
        "Add follow-up review metadata for contacts, expose overdue/unreviewed contacts in UI/API surfaces, and preserve existing relationship tracking.",
    ),
    "ap-kanboard": (
        "Task blocked-state review surface",
        "Add a blocked-state review marker for tasks, show it on board/list/detail views, and preserve swimlane/project permissions.",
    ),
    "ap-wallabag": (
        "Article reading-priority workflow",
        "Add a reading-priority/review state for saved articles, expose it in filters/list/detail views, and preserve tagging/archive behavior.",
    ),
    "ap-appsmith": (
        "Internal app deployment approval",
        "Add deployment approval metadata for internal apps, carry it through server/API/editor surfaces, and prevent unapproved publish where the repo supports it.",
    ),
    "ap-tooljet": (
        "Tool workflow owner approval",
        "Add owner approval metadata for ToolJet apps or workflows, expose it in builder/list UI and API validation, and preserve existing permissions.",
    ),
    "ap-node-red": (
        "Flow deployment review gate",
        "Add a review-required state before deploying flows, surface it in editor/runtime metadata, and keep existing flow execution behavior safe.",
    ),
    "ap-calcom": (
        "Booking policy exception review",
        "Add policy-exception review metadata for bookings/event types, expose it in scheduling/admin surfaces, and preserve availability calculations.",
    ),
    "ap-infisical": (
        "Secret rotation review workflow",
        "Add rotation-review metadata for secrets or projects, surface overdue review state in API/dashboard UI, and avoid exposing secret values in logs or tests.",
    ),
}


def yaml_list(items: list[str]) -> str:
    return "\n".join(f"  - {item}" for item in items)


def case_text(index: int, slug: str, stack: str, domain: str) -> str:
    case_id = f"AP-{index:02d}"
    task_title, task_goal = APP_TASKS[slug]
    allowed = [
        "app/**",
        "apps/**",
        "src/**",
        "frontend/**",
        "backend/**",
        "server/**",
        "client/**",
        "web/**",
        "packages/**",
        "tests/**",
        "test/**",
        "spec/**",
    ]
    forbidden = [
        "package-lock.json",
        "pnpm-lock.yaml",
        "yarn.lock",
        "requirements*.txt",
        "uv.lock",
        "poetry.lock",
        "Pipfile.lock",
        "go.sum",
        "Cargo.lock",
        "Gemfile.lock",
        "composer.lock",
    ]
    return f"""---
id: {case_id}
title: {task_title}
level: AP
track: B
target_repo_type: {stack}
target_repo: {slug}
scope: app-l2plus-cross-module
allowed_backend_change: true
allowed_paths:
{yaml_list(allowed)}
forbidden_paths:
{yaml_list(forbidden)}
dependency_policy: no-dependency-or-lockfile-churn
required_checks:
  - Use repository evidence to run the narrowest relevant lint/test/build command
  - Inspect final diff for cross-module propagation and dependency churn
oracle: |
  L2+ application task: {task_goal}
  The implementation should touch multiple relevant surfaces when the repo supports them (model/service/API/client/UI/tests), avoid dependency churn, and record blockers honestly when local environment prevents full verification.
review_status: pending
---

# {case_id} {task_title}

## Goal

在 `{domain}` 应用仓中完成一个 L2+ 级别的跨模块需求：{task_goal}

请先探索仓库结构并识别真实的数据流，不要假设固定框架。实现应尽量覆盖数据/服务/API/前端展示或交互/测试中的至少两个以上相关层面。若仓库缺少某一层或本地环境无法运行检查，必须在交付证据中明确记录 blocker 和 verification gap。

## Acceptance Criteria

- 需求不是单文件 helper 改动，而是基于仓库真实结构完成跨模块传播。
- 改动遵循现有代码风格、路由/服务/状态/测试约定。
- 若涉及后端契约变化，前端调用或展示面同步更新。
- 若涉及 UI，至少包含可观察的列表、详情、表单、筛选或状态提示变化之一。
- 不新增依赖，不携带 lockfile/manifest churn，除非仓库自身明确要求且证据充分。
- 运行最接近 CI 的窄检查；无法运行时记录环境/setup blocker。

## Expected Find

- `SuperPmAgent-coding/skills/repo-explorer/SKILL.md`
- `SuperPmAgent-coding/skills/code-context/SKILL.md`
- `SuperPmAgent-coding/skills/coding/SKILL.md`
- `SuperPmAgent-coding/skills/run-tests/SKILL.md`
- `SuperPmAgent-coding/skills/acceptance-review/SKILL.md`
- Business skill if the repo evidence matches field/API/form propagation.

## Expected Locate

- Top-level manifest and CI/test config.
- Domain model, service/controller/API route, client/query, UI list/detail/form, and nearby tests when present.
- Existing conventions for status fields, metadata fields, filters, badges, or validation.

## Required Checks

- Run the narrowest relevant lint/test/build command discovered from repo evidence.
- If checks cannot run, classify the reason as environment/setup and include the first blocker.
- Inspect git diff to ensure the change is scoped and lockfiles/manifests did not churn.

## Failure Conditions

- Only edits a README or single helper without satisfying cross-module behavior.
- Changes dependency manifests or lockfiles without explicit need.
- Claims success without tests/checks or a documented blocker.
- Updates backend response without frontend/client alignment when UI consumption is part of the goal.
- Fabricates file paths or framework assumptions instead of using repo evidence.
"""


def main() -> int:
    if len(REPOS) != 50:
        raise SystemExit(f"expected 50 repos, got {len(REPOS)}")
    BENCH.mkdir(parents=True, exist_ok=True)
    CASES.mkdir(parents=True, exist_ok=True)

    manifest = {
        "schema": 1,
        "description": "Fifty application/full-stack repositories for L2+ SuperPmAgent generalization soak.",
        "ap_pool": [f"AP-{i:02d}" for i in range(1, 51)],
        "targets": {},
    }

    for i, (slug, url, stack, domain) in enumerate(REPOS, 1):
        manifest["targets"][slug] = {
            "path": f"benchmark-targets/{slug}",
            "clone_url": url,
            "reset": True,
            "stack": stack,
            "domain": domain,
            "complexity": "L2+",
        }
        (CASES / f"AP-{i:02d}-{slug.removeprefix('ap-')}.md").write_text(
            case_text(i, slug, stack, domain),
            encoding="utf-8",
        )

    (BENCH / "app50.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print("wrote benchmark/app50.json and AP-01..AP-50 cases")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
