"""MCP Server management — workspace-scoped CRUD + auto-discovery + connection test."""

import asyncio
import json as _json
import logging
import re
from datetime import UTC, datetime
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.config import settings
from app.database import get_session
from app.models.mcp_server import MCPServer
from app.routes.deps import require_auth
from app.services.event_bus import MCP_SERVER_CREATED, MCP_SERVER_DELETED, MCP_SERVER_UPDATED, bus

router = APIRouter()
_logger = logging.getLogger(__name__)

_PLUGIN_SUBDIRS = ("SuperPmAgent-core", "SuperPmAgent-coding", "SuperPmAgent-business")


# ── Request schemas ──────────────────────────────────────────────


class MCPServerCreate(BaseModel):
    name: str
    transport: str = "stdio"  # stdio | sse | http
    command: str | None = None
    args: str | None = None   # JSON array string
    env: str | None = None    # JSON object string
    url: str | None = None
    headers: str | None = None  # JSON object string
    enabled: bool = True


class MCPServerUpdate(BaseModel):
    name: str | None = None
    transport: str | None = None
    command: str | None = None
    args: str | None = None
    env: str | None = None
    url: str | None = None
    headers: str | None = None
    enabled: bool | None = None


# ── Helpers ──────────────────────────────────────────────────────


def _plugin_root() -> Path | None:
    root = settings.plugin_repo_path
    if not root:
        return None
    p = Path(root)
    return p if p.is_dir() else None


async def _discover_from_plugins() -> list[dict]:
    """Scan SuperPmAgent-*/.mcp.json files and return discovered server configs."""
    root = _plugin_root()
    if not root:
        return []

    discovered: list[dict] = []
    for sub in _PLUGIN_SUBDIRS:
        plugin_dir = root / sub
        mcp_json = plugin_dir / ".mcp.json"
        if not mcp_json.is_file():
            continue
        try:
            data = _json.loads(mcp_json.read_text(encoding="utf-8"))
        except (ValueError, OSError):
            _logger.warning("mcp: failed to parse %s", mcp_json)
            continue
        servers = data.get("mcpServers", {}) if isinstance(data, dict) else {}
        for name, cfg in servers.items():
            if not isinstance(cfg, dict):
                continue
            discovered.append({
                "name": name,
                "transport": cfg.get("type", "stdio"),
                "command": cfg.get("command"),
                "args": _json.dumps(cfg.get("args", [])) if cfg.get("args") else None,
                "env": _json.dumps(cfg.get("env", {})) if cfg.get("env") else None,
                "url": cfg.get("url"),
                "headers": _json.dumps(cfg.get("headers", {})) if cfg.get("headers") else None,
                "plugin_source": sub,
            })
    return discovered


# ── Server list & create ───────────────────────────────────────


@router.get("/servers")
async def list_servers(
    workspace_id: str,
    session: AsyncSession = Depends(get_session),
    _user: dict = Depends(require_auth),
):
    """List MCP servers — both manually configured and auto-discovered from plugins."""
    stmt = (
        select(MCPServer)
        .where(MCPServer.workspace_id == workspace_id)
        .order_by(MCPServer.name)
    )
    result = await session.execute(stmt)
    manual = list(result.scalars().all())

    # Merge auto-discovered servers that aren't yet in the DB
    discovered = await _discover_from_plugins()
    existing_names = {s.name for s in manual}
    merged = [s.model_dump() for s in manual]
    for d in discovered:
        if d["name"] not in existing_names:
            merged.append({
                "id": None,
                "workspace_id": workspace_id,
                "name": d["name"],
                "transport": d["transport"],
                "command": d["command"],
                "args": d["args"],
                "env": d["env"],
                "url": d["url"],
                "headers": d["headers"],
                "enabled": False,
                "plugin_source": d["plugin_source"],
                "created_at": None,
                "updated_at": None,
            })
    return merged


@router.post("/servers", status_code=201)
async def create_server(
    workspace_id: str,
    body: MCPServerCreate,
    session: AsyncSession = Depends(get_session),
    _user: dict = Depends(require_auth),
):
    if body.transport not in ("stdio", "sse", "http"):
        raise HTTPException(status_code=400, detail="transport must be stdio, sse, or http")
    if body.transport == "stdio" and not body.command:
        raise HTTPException(status_code=400, detail="command is required for stdio transport")
    if body.transport in ("sse", "http") and not body.url:
        raise HTTPException(status_code=400, detail="url is required for sse/http transport")

    srv = MCPServer(
        workspace_id=workspace_id,
        name=body.name,
        transport=body.transport,
        command=body.command,
        args=body.args,
        env=body.env,
        url=body.url,
        headers=body.headers,
        enabled=body.enabled,
    )
    session.add(srv)
    await session.commit()
    await session.refresh(srv)
    await bus.emit(MCP_SERVER_CREATED, {
        "server_id": srv.id, "workspace_id": workspace_id, "name": srv.name,
    })
    return srv


# ── JSON Import ─────────────────────────────────────────────────


class MCPImportRequest(BaseModel):
    """Raw .mcp.json content — the full {"mcpServers": {...}} object."""
    json_text: str


@router.post("/import", status_code=201)
async def import_from_json(
    workspace_id: str,
    body: MCPImportRequest,
    session: AsyncSession = Depends(get_session),
    _user: dict = Depends(require_auth),
):
    """Paste a .mcp.json snippet and batch-create MCP servers."""
    try:
        data = _json.loads(body.json_text)
    except _json.JSONDecodeError as e:
        raise HTTPException(status_code=400, detail=f"Invalid JSON: {e}")

    # Accept both {"mcpServers": {...}} and bare server configs
    if isinstance(data, dict) and "mcpServers" in data:
        servers = data["mcpServers"]
    elif isinstance(data, dict):
        servers = data
    else:
        raise HTTPException(status_code=400, detail="Expected a JSON object with mcpServers")

    created: list[dict] = []
    for name, cfg in servers.items():
        if not isinstance(cfg, dict):
            continue
        transport = cfg.get("type", "stdio")
        if transport not in ("stdio", "sse", "http"):
            transport = "stdio"

        srv = MCPServer(
            workspace_id=workspace_id,
            name=name,
            transport=transport,
            command=cfg.get("command"),
            args=_json.dumps(cfg.get("args", [])) if cfg.get("args") else None,
            env=_json.dumps(cfg.get("env", {})) if cfg.get("env") else None,
            url=cfg.get("url"),
            headers=_json.dumps(cfg.get("headers", {})) if cfg.get("headers") else None,
            enabled=True,
        )
        session.add(srv)
        await session.commit()
        await session.refresh(srv)
        created.append({"name": name, "id": srv.id})
        await bus.emit(MCP_SERVER_CREATED, {
            "server_id": srv.id, "workspace_id": workspace_id, "name": name,
        })

    return {"created": len(created), "servers": created}


# ── Discover ─────────────────────────────────────────────────────


@router.post("/discover")
async def discover_servers(
    workspace_id: str,
    session: AsyncSession = Depends(get_session),
    _user: dict = Depends(require_auth),
):
    """Scan SuperPmAgent-*/.mcp.json and upsert discovered servers into the DB."""
    discovered = await _discover_from_plugins()
    upserted: list[dict] = []

    for d in discovered:
        stmt = select(MCPServer).where(
            MCPServer.workspace_id == workspace_id, MCPServer.name == d["name"]
        )
        result = await session.execute(stmt)
        existing = result.scalar_one_or_none()

        if existing:
            existing.transport = d["transport"]
            existing.command = d["command"]
            existing.args = d["args"]
            existing.env = d["env"]
            existing.url = d["url"]
            existing.headers = d["headers"]
            existing.plugin_source = d["plugin_source"]
            existing.updated_at = datetime.now(UTC)
            session.add(existing)
            upserted.append({"action": "updated", "name": d["name"]})
        else:
            srv = MCPServer(
                workspace_id=workspace_id,
                name=d["name"],
                transport=d["transport"],
                command=d["command"],
                args=d["args"],
                env=d["env"],
                url=d["url"],
                headers=d["headers"],
                plugin_source=d["plugin_source"],
                enabled=False,
            )
            session.add(srv)
            upserted.append({"action": "created", "name": d["name"]})

    if upserted:
        await session.commit()
        for item in upserted:
            await bus.emit(MCP_SERVER_CREATED if item["action"] == "created" else MCP_SERVER_UPDATED, {
                "workspace_id": workspace_id, "name": item["name"],
            })

    return {"discovered": len(discovered), "upserted": upserted}


# ── Single-server CRUD ─────────────────────────────────────────


@router.get("/servers/{server_id}")
async def get_server(
    workspace_id: str,
    server_id: int,
    session: AsyncSession = Depends(get_session),
    _user: dict = Depends(require_auth),
):
    stmt = select(MCPServer).where(
        MCPServer.id == server_id, MCPServer.workspace_id == workspace_id
    )
    srv = (await session.execute(stmt)).scalar_one_or_none()
    if not srv:
        raise HTTPException(status_code=404, detail="MCP server not found")
    return srv


@router.put("/servers/{server_id}")
async def update_server(
    workspace_id: str,
    server_id: int,
    body: MCPServerUpdate,
    session: AsyncSession = Depends(get_session),
    _user: dict = Depends(require_auth),
):
    stmt = select(MCPServer).where(
        MCPServer.id == server_id, MCPServer.workspace_id == workspace_id
    )
    srv = (await session.execute(stmt)).scalar_one_or_none()
    if not srv:
        raise HTTPException(status_code=404, detail="MCP server not found")

    update_data = body.model_dump(exclude_unset=True)
    for key, val in update_data.items():
        setattr(srv, key, val)

    if "transport" in update_data and update_data["transport"] not in ("stdio", "sse", "http"):
        raise HTTPException(status_code=400, detail="transport must be stdio, sse, or http")

    srv.updated_at = datetime.now(UTC)
    session.add(srv)
    await session.commit()
    await session.refresh(srv)
    await bus.emit(MCP_SERVER_UPDATED, {
        "server_id": srv.id, "workspace_id": workspace_id, "name": srv.name,
    })
    return srv


@router.put("/servers/{server_id}/import")
async def update_server_from_json(
    workspace_id: str,
    server_id: int,
    body: MCPImportRequest,
    session: AsyncSession = Depends(get_session),
    _user: dict = Depends(require_auth),
):
    """Update an existing MCP server from a raw JSON config snippet."""
    stmt = select(MCPServer).where(
        MCPServer.id == server_id, MCPServer.workspace_id == workspace_id
    )
    srv = (await session.execute(stmt)).scalar_one_or_none()
    if not srv:
        raise HTTPException(status_code=404, detail="MCP server not found")

    try:
        data = _json.loads(body.json_text)
    except _json.JSONDecodeError as e:
        raise HTTPException(status_code=400, detail=f"Invalid JSON: {e}")

    if isinstance(data, dict) and "mcpServers" in data:
        servers = data["mcpServers"]
    elif isinstance(data, dict):
        servers = data
    else:
        raise HTTPException(status_code=400, detail="Expected a JSON object")

    # Use the first (or only) server config to update this server
    name, cfg = next(iter(servers.items())) if servers else (None, None)
    if not cfg or not isinstance(cfg, dict):
        raise HTTPException(status_code=400, detail="No server config found in JSON")

    transport = cfg.get("type", "stdio")
    if transport not in ("stdio", "sse", "http"):
        transport = "stdio"

    if name:
        srv.name = name
    srv.transport = transport
    srv.command = cfg.get("command")
    srv.args = _json.dumps(cfg.get("args", [])) if cfg.get("args") else None
    srv.env = _json.dumps(cfg.get("env", {})) if cfg.get("env") else None
    srv.url = cfg.get("url")
    srv.headers = _json.dumps(cfg.get("headers", {})) if cfg.get("headers") else None
    srv.updated_at = datetime.now(UTC)
    session.add(srv)
    await session.commit()
    await session.refresh(srv)
    await bus.emit(MCP_SERVER_UPDATED, {
        "server_id": srv.id, "workspace_id": workspace_id, "name": srv.name,
    })
    return srv


@router.delete("/servers/{server_id}", status_code=204)
async def delete_server(
    workspace_id: str,
    server_id: int,
    session: AsyncSession = Depends(get_session),
    _user: dict = Depends(require_auth),
):
    stmt = select(MCPServer).where(
        MCPServer.id == server_id, MCPServer.workspace_id == workspace_id
    )
    srv = (await session.execute(stmt)).scalar_one_or_none()
    if not srv:
        raise HTTPException(status_code=404, detail="MCP server not found")

    await session.delete(srv)
    await session.commit()
    await bus.emit(MCP_SERVER_DELETED, {
        "server_id": server_id, "workspace_id": workspace_id, "name": srv.name,
    })


# ── Connection test ─────────────────────────────────────────────


@router.post("/servers/{server_id}/test")
async def test_server(
    workspace_id: str,
    server_id: int,
    session: AsyncSession = Depends(get_session),
    _user: dict = Depends(require_auth),
):
    stmt = select(MCPServer).where(
        MCPServer.id == server_id, MCPServer.workspace_id == workspace_id
    )
    srv = (await session.execute(stmt)).scalar_one_or_none()
    if not srv:
        raise HTTPException(status_code=404, detail="MCP server not found")

    if srv.transport == "stdio":
        return await _test_stdio(srv)
    elif srv.transport in ("sse", "http"):
        return await _test_http(srv)
    else:
        return {"ok": False, "error": f"Unknown transport: {srv.transport}"}


async def _test_stdio(srv: MCPServer) -> dict:
    if not srv.command:
        return {"ok": False, "error": "No command configured"}
    try:
        args = _json.loads(srv.args) if srv.args else []
        env = _json.loads(srv.env) if srv.env else {}
    except _json.JSONDecodeError as e:
        return {"ok": False, "error": f"Invalid JSON in args/env: {e}"}

    import os

    proc_env = {**os.environ, **env}
    try:
        proc = await asyncio.create_subprocess_exec(
            srv.command, *args,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            env=proc_env,
        )
        try:
            stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=5)
        except asyncio.TimeoutError:
            proc.kill()
            await proc.wait()
            return {"ok": False, "error": "Command timed out after 5 seconds"}

        if proc.returncode == 0:
            return {"ok": True, "stdout": stdout.decode()[:500]}
        else:
            return {"ok": False, "error": stderr.decode()[:500] or f"Exit code: {proc.returncode}"}
    except FileNotFoundError:
        return {"ok": False, "error": f"Command not found: {srv.command}"}
    except Exception as e:
        return {"ok": False, "error": str(e)}


async def _test_http(srv: MCPServer) -> dict:
    if not srv.url:
        return {"ok": False, "error": "No URL configured"}
    import httpx
    try:
        headers = _json.loads(srv.headers) if srv.headers else {}
    except _json.JSONDecodeError as e:
        return {"ok": False, "error": f"Invalid JSON in headers: {e}"}
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            resp = await client.get(srv.url, headers=headers)
            return {"ok": True, "status": resp.status_code}
    except httpx.ConnectError:
        return {"ok": False, "error": f"Connection refused: {srv.url}"}
    except httpx.TimeoutException:
        return {"ok": False, "error": "Request timed out after 5 seconds"}
    except Exception as e:
        return {"ok": False, "error": str(e)}
