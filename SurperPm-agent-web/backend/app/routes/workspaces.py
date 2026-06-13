import json

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.database import get_session
from app.models.topic import Topic
from app.models.workspace import Workspace
from app.routes.deps import require_auth
from app.services.crypto import encrypt
from app.services.event_bus import WORKSPACE_CREATED, WORKSPACE_UPDATED, bus
from app.services.ssh_keygen import generate_ssh_keypair

router = APIRouter()


async def _get_workspace(session: AsyncSession, workspace_id: str) -> Workspace | None:
    ws = await session.get(Workspace, workspace_id)
    if ws:
        return ws
    result = await session.execute(
        select(Workspace).where(Workspace.slug == workspace_id)
    )
    return result.scalar_one_or_none()


class WorkspaceCreate(BaseModel):
    name: str
    slug: str
    repo_url: str | None = None


class WorkspaceUpdate(BaseModel):
    name: str | None = None
    repo_url: str | None = None
    knowledge_repo_url: str | None = None


@router.get("")
async def list_workspaces(
    session: AsyncSession = Depends(get_session),
    _user: dict = Depends(require_auth),
):
    result = await session.execute(select(Workspace))
    return result.scalars().all()


@router.post("", status_code=201)
async def create_workspace(
    body: WorkspaceCreate,
    session: AsyncSession = Depends(get_session),
    _user: dict = Depends(require_auth),
):
    public_key, private_key = generate_ssh_keypair()
    private_key_enc = encrypt(private_key)

    ws = Workspace(
        name=body.name,
        slug=body.slug,
        repo_url=body.repo_url,
        ssh_public_key=public_key,
        ssh_private_key_enc=private_key_enc,
    )
    session.add(ws)
    await session.commit()
    await session.refresh(ws)

    general_topic = Topic(
        workspace_id=ws.id,
        name="general",
        description="General discussion",
        pinned=True,
    )
    session.add(general_topic)
    await session.commit()

    await bus.emit(
        WORKSPACE_CREATED, {"workspace_id": ws.id, "name": ws.name}
    )
    return ws


@router.get("/{workspace_id}")
async def get_workspace(
    workspace_id: str,
    session: AsyncSession = Depends(get_session),
    _user: dict = Depends(require_auth),
):
    ws = await _get_workspace(session, workspace_id)
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")
    return ws


@router.patch("/{workspace_id}")
async def update_workspace(
    workspace_id: str,
    body: WorkspaceUpdate,
    session: AsyncSession = Depends(get_session),
    _user: dict = Depends(require_auth),
):
    ws = await _get_workspace(session, workspace_id)
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")
    update_data = body.model_dump(exclude_unset=True)
    for key, val in update_data.items():
        setattr(ws, key, val)
    session.add(ws)
    await session.commit()
    await session.refresh(ws)
    await bus.emit(
        WORKSPACE_UPDATED, {"workspace_id": ws.id, "name": ws.name}
    )
    return ws


@router.delete("/{workspace_id}", status_code=204)
async def delete_workspace(
    workspace_id: str,
    session: AsyncSession = Depends(get_session),
    _user: dict = Depends(require_auth),
):
    ws = await _get_workspace(session, workspace_id)
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")
    await session.delete(ws)
    await session.commit()


@router.get("/{workspace_id}/ssh-public-key")
async def get_ssh_public_key(
    workspace_id: str,
    session: AsyncSession = Depends(get_session),
    _user: dict = Depends(require_auth),
):
    """Return the SSH public key for a workspace."""
    ws = await _get_workspace(session, workspace_id)
    if not ws:
        raise HTTPException(
            status_code=404, detail="Workspace not found"
        )
    if not ws.ssh_public_key:
        raise HTTPException(
            status_code=404,
            detail="No SSH key generated for this workspace",
        )
    return {"public_key": ws.ssh_public_key}


def _parse_repos(ws: Workspace) -> list[str]:
    if not ws.repos:
        return []
    try:
        data = json.loads(ws.repos)
        return data if isinstance(data, list) else []
    except (json.JSONDecodeError, TypeError):
        return []


class RepoAdd(BaseModel):
    url: str


@router.get("/{workspace_id}/repos")
async def list_repos(
    workspace_id: str,
    session: AsyncSession = Depends(get_session),
    _user: dict = Depends(require_auth),
):
    ws = await _get_workspace(session, workspace_id)
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")
    return _parse_repos(ws)


@router.post("/{workspace_id}/repos", status_code=201)
async def add_repo(
    workspace_id: str,
    body: RepoAdd,
    session: AsyncSession = Depends(get_session),
    _user: dict = Depends(require_auth),
):
    ws = await _get_workspace(session, workspace_id)
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")
    repos = _parse_repos(ws)
    url = body.url.strip()
    if not url:
        raise HTTPException(status_code=400, detail="URL is required")
    if url in repos:
        raise HTTPException(status_code=409, detail="Repo already exists")
    repos.append(url)
    ws.repos = json.dumps(repos)
    session.add(ws)
    await session.commit()
    return repos


@router.delete("/{workspace_id}/repos/{index}")
async def delete_repo(
    workspace_id: str,
    index: int,
    session: AsyncSession = Depends(get_session),
    _user: dict = Depends(require_auth),
):
    ws = await _get_workspace(session, workspace_id)
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")
    repos = _parse_repos(ws)
    if index < 0 or index >= len(repos):
        raise HTTPException(status_code=404, detail="Repo index out of range")
    repos.pop(index)
    ws.repos = json.dumps(repos)
    session.add(ws)
    await session.commit()
    return repos
