"""Platform API tools for Discuss AI — exposed as Anthropic tool_use."""
import json
import logging

from app.services.knowledge_store import get_store

_logger = logging.getLogger(__name__)

TOOLS = [
    {
        "name": "query_goals",
        "description": "Query goals in the current workspace. Returns list of goals with id, title, status, topic_id, plugins, repo_url.",
        "input_schema": {
            "type": "object",
            "properties": {
                "status": {"type": "string", "description": "Filter by status: todo, doing, review, done, failed, scheduled", "enum": ["todo", "doing", "review", "done", "failed", "scheduled"]},
                "topic_id": {"type": "integer", "description": "Filter by topic ID"},
            },
        },
    },
    {
        "name": "query_topics",
        "description": "List all discussion topics in the workspace.",
        "input_schema": {"type": "object", "properties": {}},
    },
    {
        "name": "query_learnings",
        "description": "Query distilled learnings. Returns list with title, category, importance, score, body.",
        "input_schema": {
            "type": "object",
            "properties": {
                "category": {"type": "string", "description": "Filter by category", "enum": ["decision", "pattern", "mistake", "insight", "external"]},
            },
        },
    },
    {
        "name": "query_knowledge_tree",
        "description": "Get the knowledge repository file tree structure. Use this to discover what's available, then use query_knowledge_file to read specific files.",
        "input_schema": {
            "type": "object",
            "properties": {
                "path": {"type": "string", "description": "Subdirectory to explore. Default: root. Use 'plugins/SuperPmAgent-io' etc. to drill into specific areas."},
            },
        },
    },
    {
        "name": "query_knowledge_file",
        "description": "Read the full content of a file from the knowledge repository. CRITICAL: Use this BEFORE proposing a Goal to understand skills, domain knowledge, or any reference material. Always read a skill's SKILL.md first to determine if a Goal is even needed.",
        "input_schema": {
            "type": "object",
            "properties": {
                "path": {"type": "string", "description": "Path to the file relative to knowledge root, e.g. 'plugins/SuperPmAgent-io/skills/normalize-feishu-doc/SKILL.md'"},
            },
            "required": ["path"],
        },
    },
    {
        "name": "query_plugins",
        "description": "List installed plugins with their names, descriptions, and available skills.",
        "input_schema": {"type": "object", "properties": {}},
    },
    {
        "name": "propose_goal",
        "description": "Build a goal proposal for the user to review and confirm. Does NOT create the goal — returns structured data that you MUST output as a ```goal-proposal code block so the frontend renders an interactive card.",
        "input_schema": {
            "type": "object",
            "properties": {
                "title": {"type": "string", "description": "Goal title"},
                "description": {"type": "string", "description": "Detailed description and acceptance criteria"},
                "repo_url": {"type": "string", "description": "GitHub repo as owner/repo or full URL"},
                "plugins": {"type": "array", "items": {"type": "string"}, "description": "Plugin names to use"},
                "schedule": {"type": "string", "description": "Hours interval for recurring goals"},
                "delay_minutes": {"type": "integer", "description": "Start after N minutes"},
            },
            "required": ["title"],
        },
    },
]


async def execute_tool(tool_name: str, tool_input: dict, workspace_id: str, topic_id: int | None = None) -> str:
    """Execute a tool call and return the result as a string."""
    store = get_store()

    if tool_name == "query_goals":
        filters: dict = {}
        if workspace_id:
            filters["workspace_id"] = workspace_id
        if tool_input.get("status"):
            filters["status"] = tool_input["status"]
        if tool_input.get("topic_id"):
            filters["topic_id"] = tool_input["topic_id"]
        goals = store.list("goals", **filters)
        summary = [
            {"id": g["id"], "title": g["title"], "status": g.get("status"),
             "topic_id": g.get("topic_id"), "plugins": g.get("plugins"),
             "repo_url": g.get("repo_url")}
            for g in goals
        ]
        return json.dumps(summary[:20], ensure_ascii=False)

    if tool_name == "query_topics":
        topics = store.list("topics", workspace_id=workspace_id)
        topics = [t for t in topics if t.get("goal_id") is None]
        return json.dumps(
            [{"id": t["id"], "name": t["name"]} for t in topics],
            ensure_ascii=False,
        )

    if tool_name == "query_learnings":
        from app.services.knowledge_distiller import list_learnings
        learnings = list_learnings()
        cat = tool_input.get("category")
        if cat:
            learnings = [l for l in learnings if l.get("category") == cat]
        summary = [
            {"title": l["title"], "category": l.get("category"),
             "score": round(l.get("score", 0), 2), "body": l.get("body", "")[:200]}
            for l in learnings[:10]
        ]
        return json.dumps(summary, ensure_ascii=False)

    if tool_name == "query_knowledge_tree":
        root = store.knowledge_root
        subpath = tool_input.get("path", "").strip().lstrip("/")
        if subpath:
            root = root / subpath
            if not root.exists():
                return json.dumps({"error": f"Path not found: {subpath}"}, ensure_ascii=False)
        dirs = []
        for p in sorted(root.iterdir()):
            if p.name.startswith(".") or p.name == "__pycache__":
                continue
            if p.is_dir():
                children = [f.name for f in sorted(p.iterdir()) if not f.name.startswith(".")][:15]
                dirs.append({"name": p.name, "type": "dir", "children": children})
            elif p.is_file():
                dirs.append({"name": p.name, "type": "file"})
        return json.dumps(dirs, ensure_ascii=False)

    if tool_name == "query_knowledge_file":
        import os as _os
        path = tool_input.get("path", "").strip().lstrip("/")
        if not path:
            return json.dumps({"error": "path is required"}, ensure_ascii=False)
        filepath = store.knowledge_root / path
        # Security: prevent path traversal
        try:
            filepath = filepath.resolve()
            root_resolved = store.knowledge_root.resolve()
            if not str(filepath).startswith(str(root_resolved)):
                return json.dumps({"error": "Access denied: path traversal detected"}, ensure_ascii=False)
        except Exception:
            return json.dumps({"error": "Invalid path"}, ensure_ascii=False)
        if not filepath.is_file():
            return json.dumps({"error": f"File not found: {path}"}, ensure_ascii=False)
        # Limit file size (max 100KB)
        if filepath.stat().st_size > 100 * 1024:
            return json.dumps({"error": f"File too large ({filepath.stat().st_size} bytes). Max 100KB."}, ensure_ascii=False)
        try:
            content = filepath.read_text(encoding="utf-8")
            # Truncate extremely long files to avoid context overflow
            if len(content) > 15000:
                content = content[:15000] + "\n\n... (truncated, use path parameter to read a shorter file)"
            return json.dumps({"path": path, "content": content}, ensure_ascii=False)
        except Exception as e:
            return json.dumps({"error": f"Failed to read file: {e}"}, ensure_ascii=False)

    if tool_name == "query_plugins":
        root = store.knowledge_root / "plugins"
        plugins = []
        if root.is_dir():
            for d in sorted(root.iterdir()):
                if not d.is_dir() or d.name.startswith("."):
                    continue
                manifest = d / ".claude-plugin" / "plugin.json"
                if manifest.is_file():
                    m = json.loads(manifest.read_text(encoding="utf-8"))
                    plugins.append({"name": m.get("name", d.name), "description": m.get("description", "")})
        return json.dumps(plugins, ensure_ascii=False)

    if tool_name == "propose_goal":
        proposal = {k: v for k, v in tool_input.items() if v is not None}
        return json.dumps({
            "instruction": "Output this as a ```goal-proposal code block so the frontend renders an interactive card.",
            "proposal": proposal,
        }, ensure_ascii=False)

    return json.dumps({"error": f"Unknown tool: {tool_name}"})
