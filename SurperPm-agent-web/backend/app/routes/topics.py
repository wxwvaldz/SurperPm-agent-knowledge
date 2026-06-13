"""Topics API — goal-scoped conversation channels."""
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.database import get_session
from app.models.goal import Goal
from app.models.topic import Topic
from app.routes.deps import require_auth
from app.services.event_bus import TOPIC_CREATED, TOPIC_UPDATED, bus

router = APIRouter()


class TopicCreate(BaseModel):
    name: str
    description: str | None = None
    repo_url: str | None = None


class TopicUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    pinned: bool | None = None
    archived: bool | None = None


@router.get("")
async def list_topics(
    goal_id: int,
    session: AsyncSession = Depends(get_session),
    _user: dict = Depends(require_auth),
):
    goal = await session.get(Goal, goal_id)
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    stmt = (
        select(Topic)
        .where(
            Topic.workspace_id == goal.workspace_id,
            Topic.goal_id == goal_id,
            Topic.archived == False,  # noqa: E712
        )
        .order_by(Topic.pinned.desc(), Topic.updated_at.desc())
    )
    result = await session.execute(stmt)
    return result.scalars().all()


@router.post("", status_code=201)
async def create_topic(
    goal_id: int,
    body: TopicCreate,
    session: AsyncSession = Depends(get_session),
    _user: dict = Depends(require_auth),
):
    goal = await session.get(Goal, goal_id)
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    topic = Topic(
        workspace_id=goal.workspace_id,
        name=body.name,
        description=body.description,
        goal_id=goal_id,
        repo_url=body.repo_url,
    )
    session.add(topic)
    await session.commit()
    await session.refresh(topic)
    await bus.emit(TOPIC_CREATED, {
        "topic_id": topic.id,
        "workspace_id": goal.workspace_id,
        "goal_id": goal_id,
        "name": topic.name,
    })
    return topic


@router.get("/{topic_id}")
async def get_topic(
    goal_id: int,
    topic_id: int,
    session: AsyncSession = Depends(get_session),
    _user: dict = Depends(require_auth),
):
    goal = await session.get(Goal, goal_id)
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    stmt = select(Topic).where(
        Topic.id == topic_id,
        Topic.workspace_id == goal.workspace_id,
        Topic.goal_id == goal_id,
    )
    result = await session.execute(stmt)
    topic = result.scalar_one_or_none()
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")
    return topic


@router.patch("/{topic_id}")
async def update_topic(
    goal_id: int,
    topic_id: int,
    body: TopicUpdate,
    session: AsyncSession = Depends(get_session),
    _user: dict = Depends(require_auth),
):
    goal = await session.get(Goal, goal_id)
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    stmt = select(Topic).where(
        Topic.id == topic_id,
        Topic.workspace_id == goal.workspace_id,
        Topic.goal_id == goal_id,
    )
    result = await session.execute(stmt)
    topic = result.scalar_one_or_none()
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")
    update_data = body.model_dump(exclude_unset=True)
    for key, val in update_data.items():
        setattr(topic, key, val)
    topic.updated_at = datetime.now(UTC)
    session.add(topic)
    await session.commit()
    await session.refresh(topic)
    await bus.emit(TOPIC_UPDATED, {
        "topic_id": topic.id,
        "workspace_id": goal.workspace_id,
        "goal_id": goal_id,
        "name": topic.name,
    })
    return topic


@router.delete("/{topic_id}", status_code=204)
async def delete_topic(
    goal_id: int,
    topic_id: int,
    session: AsyncSession = Depends(get_session),
    _user: dict = Depends(require_auth),
):
    goal = await session.get(Goal, goal_id)
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    stmt = select(Topic).where(
        Topic.id == topic_id,
        Topic.workspace_id == goal.workspace_id,
        Topic.goal_id == goal_id,
    )
    result = await session.execute(stmt)
    topic = result.scalar_one_or_none()
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")
    if topic.name == "general":
        raise HTTPException(status_code=400, detail="Cannot delete the #general topic")
    await session.delete(topic)
    await session.commit()
