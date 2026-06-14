"""Standalone Discussions — pre-goal brainstorming chat (no goal_id required)."""
import asyncio

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.routes.deps import require_auth
from app.services.event_bus import DISCUSSION_CREATED, bus
from app.services.helpers import get_default_workspace_id as _get_default_workspace_id
from app.services.knowledge_store import KnowledgeStore, get_store

router = APIRouter()


class StandaloneDiscussionCreate(BaseModel):
    content: str
    role: str = "user"
    topic_id: int | None = None
    image_data_uri: str | None = None
    card_response: dict | None = None


@router.get("")
async def list_standalone_discussions(
    topic_id: int | None = None,
    limit: int = 50,
    offset: int = 0,
    store: KnowledgeStore = Depends(get_store),
    _user: dict = Depends(require_auth),
):
    workspace_id = _get_default_workspace_id(store)
    rows = store.list_discussions(topic_id=topic_id)
    filtered = [
        r for r in rows
        if r.get("workspace_id") == workspace_id and r.get("goal_id") is None
    ]
    filtered.sort(key=lambda r: r.get("created_at", ""))
    return filtered[offset:offset + limit]


@router.post("")
async def create_standalone_discussion(
    body: StandaloneDiscussionCreate,
    store: KnowledgeStore = Depends(get_store),
    _user: dict = Depends(require_auth),
):
    workspace_id = _get_default_workspace_id(store)

    disc_data: dict = {
        "workspace_id": workspace_id,
        "goal_id": None,
        "role": body.role,
        "content": body.content,
        "topic_id": body.topic_id,
        "author": _user.get("username"),
    }
    if body.image_data_uri:
        disc_data["image_data_uri"] = body.image_data_uri
    if body.card_response:
        disc_data["card_response"] = body.card_response
    discussion = await store.create_discussion(disc_data)

    await bus.emit(DISCUSSION_CREATED, {
        "id": discussion["id"],
        "workspace_id": workspace_id,
        "goal_id": None,
        "role": body.role,
        "content": body.content,
        "topic_id": body.topic_id,
        "created_at": discussion["created_at"],
    })

    if body.role == "user":
        from app.services.ai_chat import generate_ai_reply

        asyncio.create_task(
            generate_ai_reply(
                workspace_id, body.content,
                image_data_uri=body.image_data_uri,
                topic_id=body.topic_id,
                username=_user.get("username"),
            )
        )

    return discussion


_BASE_SYSTEM_PROMPT = (
    "You are the AI collaborator of SuperPmAgent — a platform built on one philosophy:\n"
    "**Discuss → Goal → Learning**.\n"
    "- **Discuss**: Ideas emerge through conversation. You think alongside the user.\n"
    "- **Goal**: Every intention becomes a Goal — the universal unit of action. "
    "AI executes it autonomously: coding, research, distillation, anything.\n"
    "- **Learning**: Every execution leaves knowledge. The system remembers so the team grows.\n\n"
    "This cycle is a flywheel: better discussions produce sharper goals, "
    "richer learnings feed back into future discussions.\n\n"
    "Be concise and actionable. Reply in the same language the user uses.\n\n"
    "## ⭐ CORE WORKFLOW: Clarify → Skill → Goal (IN THIS ORDER)\n\n"
    "**The most important rule: NEVER jump to propose_goal prematurely.**\n\n"
    "### Phase 1: Requirement Clarification (MANDATORY FIRST STEP)\n"
    "Before ANY tool call, read the user's message carefully and ask yourself:\n"
    "1. What does the user ACTUALLY want? What problem are they solving?\n"
    "2. Is the request clear enough to act on? What's ambiguous?\n"
    "3. Have they provided all necessary context (inputs, scope, constraints)?\n\n"
    "If ANYTHING is unclear → ASK clarifying questions first. Use a ```card to let "
    "the user pick from options or fill in missing details. Do NOT assume.\n\n"
    "### Phase 2: Check Available Skills FIRST\n"
    "BEFORE proposing a Goal, check the Available Skills list in your context:\n"
    "- Can an existing skill handle this directly? → Use it! No Goal needed for exploration.\n"
    "- The user wants to understand/test a skill? → Read the skill file, explain it, ask questions.\n"
    "- The user needs a small clarification / code review / bug triage? → These ARE skills. "
    "Use the skill's approach, not a Goal.\n\n"
    "**Skills are for interaction & clarification. Goals are for confirmed, executable tasks.**\n\n"
    "### Phase 3: Goal Proposal (ONLY when requirements are CONFIRMED)\n"
    "Only propose a Goal when:\n"
    "1. Requirements are FULLY clarified (no ambiguities)\n"
    "2. The user has explicitly CONFIRMED what they want\n"
    "3. The task is substantial enough to warrant async execution\n\n"
    "When you DO propose a Goal, explain WHY a Goal is the right tool for this task. "
    "The user confirms the goal-proposal card → Goal runs ASYNCHRONOUSLY in the background.\n"
    "The user can continue discussing while it executes.\n\n"
    "### Anti-Patterns (NEVER do these)\n"
    "- ❌ User says \"test this skill\" → you immediately create a Goal\n"
    "- ❌ User shares a vague idea → you jump to propose_goal\n"
    "- ❌ User asks a question → you treat it as a task to execute\n"
    "- ✅ User says \"test this skill\" → you read the skill, explain what it does, "
    "ask what input to use, THEN discuss whether a Goal is needed\n"
    "- ✅ User shares a vague idea → you ask clarifying questions, narrow scope, "
    "THEN propose a Goal if appropriate\n\n"
    "## IMPORTANT: Numbering Convention\n"
    "Use DIFFERENT numbering styles for different purposes:\n"
    "- Your own explanation lists → use `1)`, `-`, or `•`\n"
    "- Asking the user to choose → use letters `A) B) C)`, NEVER numbers\n"
    "This prevents the system from confusing your explanations with interactive options.\n\n"
    "## CRITICAL: Interactive Cards (MUST USE)\n"
    "When you need the user to make a choice, select options, or provide structured input, "
    "you MUST output a `card` code block with a JavaScript object. "
    "NEVER output plain-text A/B/C lists — always use the card format so the user can click.\n\n"
    "### Radio (single choice)\n"
    "```card\n"
    "const card = {\n"
    '  type: "radio",\n'
    '  title: "Which approach?",\n'
    "  options: [\n"
    '    { label: "A) Frontend-first", description: "Build UI then connect API" },\n'
    '    { label: "B) Backend-first", description: "API ready before UI work" },\n'
    '    { label: "C) Full-stack", description: "Iterate both together" }\n'
    "  ]\n"
    "};\n"
    "```\n"
    "### Checkbox (multi-select)\n"
    "```card\n"
    "const card = {\n"
    '  type: "checkbox",\n'
    '  title: "Which features?",\n'
    "  options: [\n"
    '    { label: "User auth", description: "Login + OAuth" },\n'
    '    { label: "Role-based access" },\n'
    '    { label: "Audit logging" },\n'
    '    { label: "Export to PDF" }\n'
    "  ]\n"
    "};\n"
    "```\n"
    "### Text (fill parameters)\n"
    "```card\n"
    "const card = {\n"
    '  type: "text",\n'
    '  title: "Fill in the details",\n'
    "  fields: [\n"
    '    { key: "name", label: "Module Name", required: true, placeholder: "e.g. user-service" },\n'
    '    { key: "stack", label: "Tech Stack", placeholder: "e.g. React + Go" },\n'
    '    { key: "deadline", label: "Deadline", type: "date" }\n'
    "  ]\n"
    "};\n"
    "```\n"
    "RULES:\n"
    "- ALWAYS use ```card ... ``` when asking the user to choose from options\n"
    "- One card = one question. Ask one thing at a time, wait for response\n"
    "- Use radio for picking ONE from 2-5 alternatives\n"
    "- Use checkbox for selecting multiple items\n"
    "- Use text when you need named parameters\n"
    "- Wrap exactly as shown: ```card\\nconst card = { type: \"...\", ... };\\n```\n\n"
    "## Onboarding\n"
    "When greeting a new user, introduce the platform through its three pillars:\n"
    "1) **Discuss** — this chat. Think out loud, brainstorm, clarify.\n"
    "2) **Goal** — turn any idea into an executable goal. AI runs it end-to-end.\n"
    "3) **Learning** — knowledge distills automatically. The team's memory grows.\n"
    "Then say: '想体验一下吗？告诉我你想做什么，我帮你变成一个 Goal。'\n"
    "If user says '闯关' or 'onboarding', follow the Onboarding Quest skill.\n\n"
    "## Tools\n"
    "You have platform tools:\n"
    "- **Query**: `query_goals`, `query_topics`, `query_learnings`, "
    "`query_knowledge_tree`, `query_plugins`, `query_knowledge_file` — look up data before answering.\n"
    "- **File Read**: `query_knowledge_file` — read the full content of any file in the knowledge repo. "
    "ALWAYS use this to read a SKILL.md before discussing a skill, or to check domain knowledge. "
    "This is your primary tool for understanding what something does.\n"
    "- **Propose**: `propose_goal` — build a goal proposal. ONLY use after you have:\n"
    "  1) Read relevant skill files with `query_knowledge_file`\n"
    "  2) Fully clarified the user's requirements\n"
    "  3) Confirmed a Goal is actually needed (not just a skill read / discussion)\n"
    "After calling propose_goal, you MUST output the returned proposal as a ```goal-proposal code block.\n"
    "Example:\n"
    "```goal-proposal\n"
    '{"title": "Fix login bug", "repo_url": "owner/repo", "plugins": ["SuperPmAgent-coding"]}\n'
    "```\n"
    "Always include `repo_url` when the user mentions a specific repo.\n\n"
    "## IO & Reference Materials\n"
    "When the user shares a URL (Feishu doc, GitHub issue, Bilibili video, etc.):\n"
    "1. Suggest the user open it in the browser panel (left side)\n"
    "2. Ask clarifying questions about what aspects are relevant\n"
    "3. When ready, use `propose_goal` to create an interactive card\n\n"
    "## Browser Panel & Artifacts\n"
    "The user has a browser panel on the left side of the Discuss page. "
    "When a Goal executes and produces files (HTML, Markdown, DrawIO, etc), "
    "they become downloadable artifacts at URLs like: /api/artifacts/goal-{id}/filename.html\n"
    "After a Goal completes, you will receive a system message with the artifact URLs. "
    "Tell the user to expand the browser panel to preview the result.\n"
    "Keep your output concise — use URLs for rich content, not inline text."
)


def _build_system_prompt(username: str | None = None) -> str:
    import json

    from app.services.knowledge_distiller import get_top_learnings

    prompt = _BASE_SYSTEM_PROMPT
    store = get_store()
    root = store.knowledge_root

    sections: list[str] = []

    # 0. Dynamic goal-proposal schema
    try:
        from app.routes.goals import GoalCreate
        fields = GoalCreate.model_fields
        field_docs = []
        for name, info in fields.items():
            if name == "workspace_id":
                continue
            required = info.is_required()
            label = "required" if required else "optional"
            field_docs.append(f"- `{name}` ({label})")
        example = '{"title": "Fix login bug", "repo_url": "owner/repo", "plugins": ["SuperPmAgent-coding"]}'
        sections.append(
            "## Goal Proposal Schema\n"
            f"```goal-proposal\n{example}\n```\n"
            "Available fields:\n" + "\n".join(field_docs)
        )
    except Exception:
        pass

    # 1. Skills
    try:
        from app.routes.skills import _scan_skills
        skills = _scan_skills()
        if skills:
            lines = [f"- **{s['name']}**: {s['description']}" for s in skills]
            sections.append(
                "## Available Skills\n" + "\n".join(lines)
            )
    except Exception:
        pass

    # 2. Plugins
    try:
        plugins_dir = root / "plugins"
        if plugins_dir.is_dir():
            names = []
            for d in sorted(plugins_dir.iterdir()):
                if not d.is_dir() or d.name.startswith("."):
                    continue
                manifest = d / ".claude-plugin" / "plugin.json"
                if manifest.is_file():
                    m = json.loads(manifest.read_text(encoding="utf-8"))
                    desc = m.get("description", "")
                    names.append(f"- **{m.get('name', d.name)}**: {desc}")
            if names:
                sections.append(
                    "## Installed Plugins\n" + "\n".join(names)
                )
    except Exception:
        pass

    # 3. MCP Servers
    try:
        from app.routes.mcp import _read_servers
        servers = _read_servers()
        if servers:
            lines = []
            for name, cfg in servers.items():
                status = "enabled" if cfg.get("enabled") else "disabled"
                lines.append(f"- **{name}** ({status})")
            sections.append(
                "## MCP Servers\n" + "\n".join(lines)
            )
    except Exception:
        pass

    # 4. Knowledge structure
    try:
        dirs = []
        for p in sorted(root.iterdir()):
            if p.name.startswith(".") or p.name == "__pycache__":
                continue
            if p.is_dir():
                dirs.append(f"- `{p.name}/`")
            elif p.is_file() and p.suffix == ".md":
                dirs.append(f"- `{p.name}`")
        if dirs:
            sections.append(
                "## Knowledge Repository Structure\n" + "\n".join(dirs)
            )
    except Exception:
        pass

    # 5. Team profile
    try:
        team_md = root / "profiles" / "team.md"
        if team_md.is_file():
            content = team_md.read_text(encoding="utf-8")[:500]
            sections.append(f"## Team Profile\n{content}")
    except Exception:
        pass

    # 5b. User personal profile
    if username:
        try:
            user_md = root / "profiles" / "users" / f"{username}.md"
            if user_md.is_file():
                content = user_md.read_text(encoding="utf-8")[:600]
                sections.append(
                    f"## Current User Profile\n"
                    f"Adapt your responses based on this user's preferences:\n{content}"
                )
        except Exception:
            pass

    # 6. Domain knowledge summaries
    try:
        domain_dir = root / "domain"
        if domain_dir.is_dir():
            index = domain_dir / "INDEX.md"
            if index.is_file():
                content = index.read_text(encoding="utf-8")[:800]
                sections.append(f"## Domain Knowledge\n{content}")
    except Exception:
        pass

    # 7. Learnings
    learnings = get_top_learnings(budget_tokens=300)
    if learnings:
        sections.append(
            "## Team Learnings\n"
            "Use these to inform your answers:\n"
            f"{learnings}"
        )

    if sections:
        prompt += "\n\n" + "\n\n".join(sections)

    return prompt


