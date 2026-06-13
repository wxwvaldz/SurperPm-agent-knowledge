"""Goal execution service using claude-agent-sdk."""
import asyncio
import uuid
from datetime import datetime

from claude_agent_sdk import ClaudeAgentOptions, query
from claude_agent_sdk.types import AssistantMessage, ResultMessage, TextBlock


class GoalRunnerService:
    def __init__(self):
        self.runs: dict[str, dict] = {}

    async def start_goal(self, text: str, plugin_path: str, repo_path: str) -> str:
        run_id = str(uuid.uuid4())[:8]
        self.runs[run_id] = {
            "id": run_id,
            "status": "running",
            "goal_text": text,
            "logs": [],
            "started_at": datetime.now().isoformat(),
            "finished_at": None,
            "cost_usd": 0.0,
        }
        asyncio.create_task(self._execute(run_id, text, plugin_path, repo_path))
        return run_id

    async def _execute(self, run_id: str, text: str, plugin_path: str, repo_path: str):
        options = ClaudeAgentOptions(
            plugins=[{"type": "local", "path": plugin_path}],
            allowed_tools=["Read", "Edit", "Write", "Bash", "Grep", "Glob"],
            permission_mode="acceptEdits",
            cwd=repo_path,
            max_turns=50,
        )
        try:
            async for msg in query(
                prompt=f'/SuperPmAgent-core:goal "{text}"',
                options=options,
            ):
                if isinstance(msg, AssistantMessage):
                    for block in msg.content:
                        if isinstance(block, TextBlock):
                            self.runs[run_id]["logs"].append(block.text)
                elif isinstance(msg, ResultMessage):
                    self.runs[run_id]["cost_usd"] = getattr(msg, "total_cost_usd", 0.0)
            self.runs[run_id]["status"] = "done"
        except Exception as e:
            self.runs[run_id]["status"] = "failed"
            self.runs[run_id]["logs"].append(f"Error: {e}")
        finally:
            self.runs[run_id]["finished_at"] = datetime.now().isoformat()

    def get_run(self, run_id: str) -> dict | None:
        return self.runs.get(run_id)

    def list_runs(self) -> list[dict]:
        return list(self.runs.values())
