"""Goal lifecycle — provision sandbox, run agent via claude-agent-sdk, track state.

Two modes:
  - "local": run agent via claude-agent-sdk on the local machine.
  - "lap":   remote K8s pod via LAP API.

Usage (from routes/goal.py):
    from app.services.goal_runner import create_sandbox, list_sandboxes, ...
    handle = await create_sandbox(goal_submit)  # -> GoalRun
"""

from __future__ import annotations

import asyncio
import json
import os
import shutil
import tempfile
import time
import uuid
from dataclasses import asdict, dataclass, field
from pathlib import Path

import httpx

from app.config import settings
from app.models import GoalRun, GoalSubmit

# Since v0.2.82: claude_agent_sdk.query() handles the agent loop internally,
# bundling the Claude Code CLI binary. We wrap it with lifecycle control.
from app.services.agent import run_goal_agent


def _inject_sdk_env() -> None:
    """Inject env vars claude-agent-sdk needs (reads from .env then Settings)."""
    # Look for .env relative to backend root (3 levels up from this file)
    env_path = Path(__file__).resolve().parent.parent.parent / ".env"
    if env_path.exists():
        from dotenv import load_dotenv

        load_dotenv(env_path, override=False)
    os.environ.setdefault("ANTHROPIC_API_KEY", settings.anthropic_api_key)
    os.environ.setdefault("ANTHROPIC_BASE_URL", settings.anthropic_base_url)


# =========================================================================
# Internal state — NOT exposed to routes/frontend
# =========================================================================


@dataclass
class SandboxHandle:
    """Everything the sandbox needs to track internally."""

    goal_id: str
    status: str  # creating | running | paused | waiting_human | done | failed
    mode: str  # "local" | "lap"

    # --- original request ---
    goal_text: str
    session_id: str | None = None
    max_iterations: int = 50
    token_budget: int = 500_000
    max_duration_min: int = 60

    # --- mode-specific runtime ---
    workdir: str | None = None  # local: worktree path; lap: container mount
    sandbox_url: str | None = None  # lap: pod HTTP address
    pid: int | None = None  # local: subprocess PID (deprecated, kept for bkwd compat)
    pod_name: str | None = None  # lap: K8s pod name
    namespace: str | None = None  # lap: K8s namespace
    cc_session_id: str | None = None  # (unused with SDK, kept for Lap compat)

    # --- progress ---
    iteration: int = 0
    tokens_used: int = 0
    pr_url: str | None = None
    distill_pr_urls: list[str] = field(default_factory=list)

    # --- time ---
    created_at: float = 0.0
    updated_at: float = 0.0

    # --- error ---
    failure_reason: str | None = None


# =========================================================================
# Persistence — JSON file (no DB)
# =========================================================================

_STATE_DIR = Path.home() / ".SuperPmAgent"
_STATE_FILE = _STATE_DIR / "goal_state.json"


def _load_state() -> dict[str, SandboxHandle]:
    if not _STATE_FILE.exists():
        return {}
    try:
        raw = json.loads(_STATE_FILE.read_text("utf-8"))
        return {k: SandboxHandle(**v) for k, v in raw.items()}
    except (json.JSONDecodeError, TypeError, KeyError):
        return {}


def _save_state(goals: dict[str, SandboxHandle]) -> None:
    _STATE_DIR.mkdir(parents=True, exist_ok=True)
    raw = {k: asdict(v) for k, v in goals.items()}
    _STATE_FILE.write_text(
        json.dumps(raw, indent=2, default=str, ensure_ascii=False),
        encoding="utf-8",
    )


# =========================================================================
# LocalSandbox — claude-agent-sdk on the local machine
# =========================================================================


class LocalSandbox:
    """Runs a /goal via claude_agent_sdk.query() on the local machine.

    Uses cooperative pause/resume via asyncio.Event (no OS signals).
    The agent loop runs in a background asyncio.Task; callers interact
    through the handle-based lifecycle methods.
    """

    _tasks: dict[str, asyncio.Task] = {}
    _pause_events: dict[str, asyncio.Event] = {}
    _cancel_tokens: dict[str, asyncio.Event] = {}

    async def start(self, goal: GoalSubmit) -> SandboxHandle:
        _inject_sdk_env()

        handle = SandboxHandle(
            goal_id=_new_id(),
            status="creating",
            mode="local",
            goal_text=goal.text,
            session_id=goal.session_id,
            max_iterations=goal.max_iterations,
            token_budget=goal.token_budget,
            max_duration_min=goal.max_duration_min,
            created_at=time.time(),
            updated_at=time.time(),
        )

        # 1. Create working directory
        workdir = Path(tempfile.mkdtemp(prefix=f"SuperPmAgent-{handle.goal_id}-"))
        handle.workdir = str(workdir)

        # 2. Clone conduit repo if configured
        # conduit_repo = os.environ.get("CONDUIT_REPO", "")
        # if conduit_repo:
        #     loop = asyncio.get_running_loop()
        #     await loop.run_in_executor(
        #         None,
        #         lambda: __import__("subprocess").run(
        #             ["git", "clone", "--depth=1", conduit_repo, str(workdir / "repo")],
        #             capture_output=True,
        #             timeout=120,
        #         ),
        #     )

        # 3. Create lifecycle primitives
        pause_ev = asyncio.Event()
        cancel_ev = asyncio.Event()
        self._pause_events[handle.goal_id] = pause_ev
        self._cancel_tokens[handle.goal_id] = cancel_ev

        # 4. Start agent in background task
        task = asyncio.create_task(
            run_goal_agent(
                goal_text=goal.text,
                cwd=str(workdir),
                max_turns=goal.max_iterations,
                allowed_tools=[
                    "Read", "Write", "Edit", "Bash", "Glob", "Grep",
                    "WebSearch", "WebFetch",
                ],
                disallowed_tools=["AskUserQuestion"],
                resume=goal.session_id,
                model=settings.agent_model or None,
                pause_event=pause_ev,
                cancel_token=cancel_ev,
            )
        )
        self._tasks[handle.goal_id] = task

        # 5. Attach completion callback
        task.add_done_callback(lambda t: self._on_done(handle, t))

        handle.status = "running"
        handle.updated_at = time.time()
        return handle

    def _on_done(self, handle: SandboxHandle, task: asyncio.Task) -> None:
        """Completion callback — update handle from AgentResult."""
        try:
            if task.cancelled():
                handle.status = "stopped"
            else:
                result = task.result()
                handle.status = "done"
                handle.iteration = result.iterations
                handle.tokens_used = result.tokens_used
                handle.pr_url = result.pr_url
                handle.cc_session_id = result.session_id  # for future resume
        except Exception as exc:
            handle.status = "failed"
            handle.failure_reason = str(exc)
        finally:
            handle.updated_at = time.time()
            state = _load_state()
            state[handle.goal_id] = handle
            _save_state(state)
            self._cleanup(handle.goal_id)

    async def pause(self, handle: SandboxHandle) -> SandboxHandle:
        ev = self._pause_events.get(handle.goal_id)
        if ev:
            ev.set()
        handle.status = "paused"
        handle.updated_at = time.time()
        return handle

    async def resume(self, handle: SandboxHandle) -> SandboxHandle:
        ev = self._pause_events.get(handle.goal_id)
        if ev:
            ev.clear()
        handle.status = "running"
        handle.updated_at = time.time()
        return handle

    async def stop(self, handle: SandboxHandle) -> SandboxHandle:
        ev = self._cancel_tokens.get(handle.goal_id)
        if ev:
            ev.set()
        task = self._tasks.get(handle.goal_id)
        if task and not task.done():
            task.cancel()
        # Clean up workdir
        if handle.workdir and Path(handle.workdir).exists():
            shutil.rmtree(handle.workdir, ignore_errors=True)
        handle.status = "stopped"
        handle.workdir = None
        handle.updated_at = time.time()
        self._cleanup(handle.goal_id)
        return handle

    async def get_status(self, handle: SandboxHandle) -> SandboxHandle:
        state = _load_state()
        fresh = state.get(handle.goal_id)
        if fresh:
            handle.status = fresh.status
            handle.iteration = fresh.iteration
            handle.tokens_used = fresh.tokens_used
            handle.pr_url = fresh.pr_url
            handle.failure_reason = fresh.failure_reason
            handle.updated_at = fresh.updated_at
        return handle

    def _cleanup(self, goal_id: str) -> None:
        self._tasks.pop(goal_id, None)
        self._pause_events.pop(goal_id, None)
        self._cancel_tokens.pop(goal_id, None)


# =========================================================================
# LapSandbox — remote K8s pod via LAP API
# =========================================================================


class LapSandbox:
    """Manages a remote LAP/K8s pod for a single /goal."""

    async def start(self, goal: GoalSubmit) -> SandboxHandle:
        handle = SandboxHandle(
            goal_id=_new_id(),
            status="creating",
            mode="lap",
            goal_text=goal.text,
            session_id=goal.session_id,
            max_iterations=goal.max_iterations,
            token_budget=goal.token_budget,
            max_duration_min=goal.max_duration_min,
            created_at=time.time(),
            updated_at=time.time(),
        )
        lap_url = settings.lap_url or _get_env("LAP_URL", "")
        lap_token = settings.lap_token or _get_env("LAP_TOKEN", "")
        if not lap_url:
            handle.status = "failed"
            handle.failure_reason = "LAP_URL not configured"
            handle.updated_at = time.time()
            return handle

        # POST /pods to LAP API — create a new pod
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{lap_url}/pods",
                headers={"Authorization": f"Bearer {lap_token}"} if lap_token else {},
                json={
                    "session_id": goal.session_id,
                    "goal_text": goal.text,
                    "max_iterations": goal.max_iterations,
                    "token_budget": goal.token_budget,
                    "max_duration_min": goal.max_duration_min,
                    "conduit_repo": _get_env("CONDUIT_REPO", ""),
                    "marketplace_repo": settings.github_repo,
                },
                timeout=30,
            )
            if resp.status_code >= 400:
                handle.status = "failed"
                handle.failure_reason = f"LAP create pod failed: {resp.status_code} {resp.text}"
                handle.updated_at = time.time()
                return handle

        pod = resp.json()
        handle.pod_name = pod.get("name") or pod.get("id", f"SuperPmAgent-{handle.goal_id}")
        handle.namespace = pod.get("namespace", "default")
        handle.sandbox_url = pod.get("url") or pod.get(
            "sandbox_url", f"{lap_url}/pods/{handle.pod_name}"
        )
        handle.status = "running"
        handle.updated_at = time.time()

        # Background: poll pod status until completion
        asyncio.create_task(self._poll_pod(handle, lap_url, lap_token))
        return handle

    async def _poll_pod(
        self,
        handle: SandboxHandle,
        lap_url: str,
        lap_token: str,
    ) -> None:
        """Poll pod status every 30s until done/failed."""
        headers = {"Authorization": f"Bearer {lap_token}"} if lap_token else {}
        while True:
            await asyncio.sleep(30)
            state = _load_state()
            h = state.get(handle.goal_id)
            if not h or h.status in ("done", "failed", "stopped"):
                return

            try:
                async with httpx.AsyncClient() as client:
                    resp = await client.get(
                        f"{lap_url}/pods/{handle.pod_name}",
                        headers=headers,
                        timeout=15,
                    )
                    if resp.status_code == 200:
                        data = resp.json()
                        pod_status = data.get("status", "unknown")
                        if pod_status in ("succeeded", "done"):
                            h.status = "done"
                            h.pr_url = data.get("pr_url")
                            h.tokens_used = data.get("tokens_used", 0)
                            h.distill_pr_urls = data.get("distill_pr_urls", [])
                        elif pod_status in ("failed", "error"):
                            h.status = "failed"
                            h.failure_reason = data.get("error", "pod failed")
                        elif pod_status == "paused":
                            h.status = "paused"
                        else:
                            h.status = "running"
                        h.iteration = data.get("iterations", h.iteration)
                        h.updated_at = time.time()
                        _save_state(state)
                    elif resp.status_code == 404:
                        h.status = "failed"
                        h.failure_reason = "pod not found"
                        h.updated_at = time.time()
                        _save_state(state)
                        return
            except httpx.RequestError as exc:
                h = state.get(handle.goal_id)
                if h:
                    h.failure_reason = f"LAP poll failed: {exc}"
                    h.updated_at = time.time()
                    _save_state(state)

    async def pause(self, handle: SandboxHandle) -> SandboxHandle:
        lap_url = settings.lap_url or _get_env("LAP_URL", "")
        lap_token = settings.lap_token or _get_env("LAP_TOKEN", "")
        if lap_url:
            async with httpx.AsyncClient() as client:
                await client.post(
                    f"{lap_url}/pods/{handle.pod_name}/pause",
                    headers={"Authorization": f"Bearer {lap_token}"} if lap_token else {},
                    timeout=15,
                )
        handle.status = "paused"
        handle.updated_at = time.time()
        return handle

    async def resume(self, handle: SandboxHandle) -> SandboxHandle:
        lap_url = settings.lap_url or _get_env("LAP_URL", "")
        lap_token = settings.lap_token or _get_env("LAP_TOKEN", "")
        if lap_url:
            async with httpx.AsyncClient() as client:
                await client.post(
                    f"{lap_url}/pods/{handle.pod_name}/resume",
                    headers={"Authorization": f"Bearer {lap_token}"} if lap_token else {},
                    json={"cc_session_id": handle.cc_session_id},
                    timeout=15,
                )
        handle.status = "running"
        handle.updated_at = time.time()
        return handle

    async def stop(self, handle: SandboxHandle) -> SandboxHandle:
        lap_url = settings.lap_url or _get_env("LAP_URL", "")
        lap_token = settings.lap_token or _get_env("LAP_TOKEN", "")
        if lap_url:
            async with httpx.AsyncClient() as client:
                await client.delete(
                    f"{lap_url}/pods/{handle.pod_name}",
                    headers={"Authorization": f"Bearer {lap_token}"} if lap_token else {},
                    timeout=15,
                )
        handle.status = "stopped"
        handle.updated_at = time.time()
        return handle

    async def get_status(self, handle: SandboxHandle) -> SandboxHandle:
        # Status is updated by _poll_pod background task;
        # just reload from persisted state for latest.
        state = _load_state()
        fresh = state.get(handle.goal_id)
        if fresh:
            handle.status = fresh.status
            handle.iteration = fresh.iteration
            handle.tokens_used = fresh.tokens_used
            handle.pr_url = fresh.pr_url
            handle.distill_pr_urls = fresh.distill_pr_urls
            handle.failure_reason = fresh.failure_reason
            handle.updated_at = fresh.updated_at
        return handle


# =========================================================================
# Factory — routes/goal.py calls these
# =========================================================================

_sandboxes: dict[str, LocalSandbox | LapSandbox] = {
    "local": LocalSandbox(),
    "lap": LapSandbox(),
}


def _get_sandbox(mode: str) -> LocalSandbox | LapSandbox:
    sb = _sandboxes.get(mode)
    if not sb:
        raise ValueError(f"unknown sandbox mode: {mode!r} (expected local/lap)")
    return sb


def _new_id() -> str:
    return f"GL{uuid.uuid4().hex[:8].upper()}"


def _handle_to_run(h: SandboxHandle) -> GoalRun:
    """Convert internal handle -> public GoalRun response."""
    return GoalRun(
        id=h.goal_id,
        status=h.status,
        iter=h.iteration,
        tokens_used=h.tokens_used,
        pr_url=h.pr_url,
        distill_pr_urls=h.distill_pr_urls or [],
    )


def _get_env(key: str, default: str = "") -> str:
    """Read from env with fallback."""
    return os.environ.get(key, default)


# ------------------------------------------------------------------
# Public API — one function per route in goal.py
# ------------------------------------------------------------------


async def create_sandbox(goal: GoalSubmit) -> GoalRun:
    state = _load_state()
    sandbox = _get_sandbox(goal.sandbox)
    handle = await sandbox.start(goal)
    state[handle.goal_id] = handle
    _save_state(state)
    return _handle_to_run(handle)


async def list_sandboxes() -> list[GoalRun]:
    state = _load_state()
    return [
        _handle_to_run(h) for h in sorted(state.values(), key=lambda x: x.created_at, reverse=True)
    ]


async def get_sandbox(goal_id: str) -> GoalRun | None:
    state = _load_state()
    h = state.get(goal_id)
    return _handle_to_run(h) if h else None


async def pause_sandbox(goal_id: str) -> GoalRun | None:
    state = _load_state()
    h = state.get(goal_id)
    if not h:
        return None
    sandbox = _get_sandbox(h.mode)
    h = await sandbox.pause(h)
    state[goal_id] = h
    _save_state(state)
    return _handle_to_run(h)


async def resume_sandbox(goal_id: str) -> GoalRun | None:
    state = _load_state()
    h = state.get(goal_id)
    if not h:
        return None
    sandbox = _get_sandbox(h.mode)
    h = await sandbox.resume(h)
    state[goal_id] = h
    _save_state(state)
    return _handle_to_run(h)


async def stop_sandbox(goal_id: str) -> GoalRun | None:
    state = _load_state()
    h = state.get(goal_id)
    if not h:
        return None
    sandbox = _get_sandbox(h.mode)
    h = await sandbox.stop(h)
    state[goal_id] = h
    _save_state(state)
    return _handle_to_run(h)


async def reply_sandbox(goal_id: str, payload: dict) -> bool:
    """Forward a HITL reply to the running sandbox."""
    # TODO (W2): local ? write to agent runner HITL channel
    #           lap ? POST {lap_url}/pods/{pod_name}/reply
    del goal_id, payload
    return True


