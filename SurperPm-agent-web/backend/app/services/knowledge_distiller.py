"""Knowledge distillation — write execution summary to claude-for-knowledge/sessions/."""
import logging
from datetime import datetime, timezone
from pathlib import Path

from app.config import settings
from app.models.execution import Execution
from app.models.goal import Goal

_logger = logging.getLogger(__name__)

KNOWLEDGE_ROOT = Path(settings.knowledge_repo_path) if settings.knowledge_repo_path else Path("knowledge")


def distill_execution(goal: Goal, execution: Execution) -> str | None:
    """Write a summary markdown for a completed execution. Returns the file path or None."""
    if not execution.summary:
        return None

    sessions_dir = KNOWLEDGE_ROOT / "sessions"
    sessions_dir.mkdir(parents=True, exist_ok=True)

    ts = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    filename = f"{goal.id}_{ts}.md"
    filepath = sessions_dir / filename

    lines = [
        f"# {goal.title}",
        "",
        f"**Goal ID**: {goal.id}",
        f"**Execution ID**: {execution.id}",
        f"**Status**: {execution.status}",
        f"**Tokens used**: {execution.token_used or 0}",
        f"**Started**: {execution.started_at}",
        f"**Finished**: {execution.finished_at}",
        "",
        "## Summary",
        "",
        execution.summary,
    ]

    if goal.description:
        lines.extend(["", "## Goal description", "", goal.description])

    if execution.artifacts:
        lines.extend(["", "## Artifacts", "", execution.artifacts])

    if execution.pr_url:
        lines.extend(["", "## PR", "", execution.pr_url])

    if execution.error:
        lines.extend(["", "## Error", "", execution.error])

    filepath.write_text("\n".join(lines) + "\n", encoding="utf-8")
    _logger.info("Distilled execution %s → %s", execution.id, filepath)
    return str(filepath)
