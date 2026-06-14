"""Remote Agent registry — manage cc-connect Agent endpoints."""

import json
import logging
from pathlib import Path

import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.routes.deps import require_auth
from app.services.knowledge_store import get_store

router = APIRouter()
_logger = logging.getLogger(__name__)


def _agents_file() -> Path:
    store = get_store()
    return store._root.parent / "agents.json"


def _read_agents() -> dict:
    f = _agents_file()
    if not f.is_file():
        return {}
    try:
        data = json.loads(f.read_text(encoding="utf-8"))
        return data.get("agents", {}) if isinstance(data, dict) else {}
    except (ValueError, OSError):
        return {}


def _write_agents(agents: dict) -> None:
    f = _agents_file()
    f.write_text(
        json.dumps({"agents": agents}, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


class AgentRegister(BaseModel):
    name: str
    cc_api_url: str
    cc_api_token: str | None = None
    project: str = "default"
    description: str | None = None


@router.get("")
async def list_agents(_user: dict = Depends(require_auth)):
    return list(_read_agents().values())


@router.post("", status_code=201)
async def register_agent(
    body: AgentRegister,
    _user: dict = Depends(require_auth),
):
    agents = _read_agents()
    agents[body.name] = {
        "name": body.name,
        "cc_api_url": body.cc_api_url.rstrip("/"),
        "cc_api_token": body.cc_api_token,
        "project": body.project,
        "description": body.description,
        "status": "unknown",
    }
    _write_agents(agents)
    return {"ok": True, "name": body.name}


@router.delete("/{name}", status_code=204)
async def unregister_agent(
    name: str, _user: dict = Depends(require_auth),
):
    agents = _read_agents()
    if name not in agents:
        raise HTTPException(status_code=404, detail="Agent not found")
    del agents[name]
    _write_agents(agents)


@router.get("/{name}/ping")
async def ping_agent(
    name: str, _user: dict = Depends(require_auth),
):
    agents = _read_agents()
    agent = agents.get(name)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    url = agent["cc_api_url"]
    headers = {}
    if agent.get("cc_api_token"):
        headers["Authorization"] = f"Bearer {agent['cc_api_token']}"

    try:
        async with httpx.AsyncClient(timeout=5) as client:
            r = await client.get(f"{url}/api/v1/status", headers=headers)
            ok = r.status_code < 400
            agents[name]["status"] = "online" if ok else "error"
            _write_agents(agents)
            return {"ok": ok, "status": r.status_code, "agent": name}
    except Exception as e:
        agents[name]["status"] = "offline"
        _write_agents(agents)
        return {"ok": False, "error": str(e), "agent": name}
