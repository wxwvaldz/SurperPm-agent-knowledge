"""Agent lifecycle — wraps claude_agent_sdk.query() for sandbox use."""

from .runner import AgentResult, run_goal_agent

__all__ = ["AgentResult", "run_goal_agent"]
