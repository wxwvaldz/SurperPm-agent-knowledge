"""Standalone Topics — discussion channels not tied to any goal."""
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.database import get_session
from app.models.topic import Topic
from app.models.workspace import Workspace
from app.routes.deps import require_auth

router = APIRouter()


async def _get_default_workspace_id(session: AsyncSession) -> str:
    stmt = select(Workspace).limit(1)
    result = await session.execute(stmt)
    ws = result.scalar_one_or_none()
    if not ws:
        raise HTTPException(status_code=404, detail="No workspace found")
    return ws.id


class TopicCreate(BaseModel):
    name: str
    description: str | None = None


class TopicUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    archived: bool | None = None


@router.get("")
async def list_standalone_topics(
    session: AsyncSession = Depends(get_session),
    _user: dict = Depends(require_auth),
):
    workspace_id = await _get_default_workspace_id(session)
    stmt = (
        select(Topic)
        .where(Topic.workspace_id == workspace_id)
        .where(Topic.goal_id.is_(None))  # type: ignore[union-attr]
        .where(Topic.archived == False)  # noqa: E712
        .order_by(Topic.created_at.asc())
    )
    result = await session.execute(stmt)
    return result.scalars().all()


@router.post("")
async def create_standalone_topic(
    body: TopicCreate,
    session: AsyncSession = Depends(get_session),
    _user: dict = Depends(require_auth),
):
    workspace_id = await _get_default_workspace_id(session)
    topic = Topic(
        workspace_id=workspace_id,
        goal_id=None,
        name=body.name,
        description=body.description,
    )
    session.add(topic)
    await session.commit()
    await session.refresh(topic)
    return topic


@router.patch("/{topic_id}")
async def update_standalone_topic(
    topic_id: int,
    body: TopicUpdate,
    session: AsyncSession = Depends(get_session),
    _user: dict = Depends(require_auth),
):
    topic = await session.get(Topic, topic_id)
    if not topic or topic.goal_id is not None:
        raise HTTPException(status_code=404, detail="Topic not found")
    if body.name is not None:
        topic.name = body.name
    if body.description is not None:
        topic.description = body.description
    if body.archived is not None:
        topic.archived = body.archived
    topic.updated_at = datetime.now(UTC)
    session.add(topic)
    await session.commit()
    await session.refresh(topic)
    return topic


@router.delete("/{topic_id}")
async def delete_standalone_topic(
    topic_id: int,
    session: AsyncSession = Depends(get_session),
    _user: dict = Depends(require_auth),
):
    topic = await session.get(Topic, topic_id)
    if not topic or topic.goal_id is not None:
        raise HTTPException(status_code=404, detail="Topic not found")
    topic.archived = True
    topic.updated_at = datetime.now(UTC)
    session.add(topic)
    await session.commit()
    return {"ok": True}
