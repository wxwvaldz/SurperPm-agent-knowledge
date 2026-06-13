"""Standalone Discussions — pre-goal brainstorming chat (no goal_id required)."""
import asyncio
import logging

import anthropic
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.database import async_session, get_session
from app.models.discussion import Discussion
from app.models.workspace import Workspace
from app.routes.deps import require_auth
from app.services.event_bus import DISCUSSION_CREATED, DISCUSSION_DELTA, bus

_logger = logging.getLogger(__name__)

router = APIRouter()


async def _get_default_workspace_id(session: AsyncSession) -> str:
    stmt = select(Workspace).limit(1)
    result = await session.execute(stmt)
    ws = result.scalar_one_or_none()
    if not ws:
        raise HTTPException(status_code=404, detail="No workspace found")
    return ws.id


class StandaloneDiscussionCreate(BaseModel):
    content: str
    role: str = "user"
    topic_id: int | None = None
    image_data_uri: str | None = None


@router.get("")
async def list_standalone_discussions(
    topic_id: int | None = None,
    limit: int = 50,
    offset: int = 0,
    session: AsyncSession = Depends(get_session),
    _user: dict = Depends(require_auth),
):
    workspace_id = await _get_default_workspace_id(session)
    stmt = (
        select(Discussion)
        .where(Discussion.workspace_id == workspace_id)
        .where(Discussion.goal_id.is_(None))  # type: ignore[union-attr]
    )
    if topic_id is not None:
        stmt = stmt.where(Discussion.topic_id == topic_id)
    stmt = stmt.order_by(Discussion.created_at.asc()).limit(limit).offset(offset)
    result = await session.execute(stmt)
    return result.scalars().all()


@router.post("")
async def create_standalone_discussion(
    body: StandaloneDiscussionCreate,
    session: AsyncSession = Depends(get_session),
    _user: dict = Depends(require_auth),
):
    workspace_id = await _get_default_workspace_id(session)

    discussion = Discussion(
        workspace_id=workspace_id,
        goal_id=None,
        role=body.role,
        content=body.content,
        topic_id=body.topic_id,
        author=_user.get("username"),
    )
    session.add(discussion)
    await session.commit()
    await session.refresh(discussion)

    await bus.emit(DISCUSSION_CREATED, {
        "id": discussion.id,
        "workspace_id": workspace_id,
        "goal_id": None,
        "role": body.role,
        "content": body.content,
        "topic_id": body.topic_id,
        "created_at": discussion.created_at.isoformat(),
    })

    if body.role == "user":
        asyncio.create_task(
            _generate_ai_reply_standalone(
                workspace_id, body.content, body.image_data_uri, body.topic_id,
            )
        )

    return discussion


_SYSTEM_PROMPT = (
    "You are a helpful project management assistant for SuperPmAgent. "
    "You help brainstorm ideas, discuss project direction, and clarify goals. "
    "Be concise and actionable. Reply in the same language the user uses."
)

_MAX_CONTEXT_MESSAGES = 20


async def _generate_ai_reply_standalone(
    workspace_id: str,
    user_content: str,
    image_data_uri: str | None = None,
    topic_id: int | None = None,
) -> None:
    from app.services.ai_key_resolver import resolve_ai_base_url, resolve_ai_key, resolve_ai_model

    api_key = await resolve_ai_key()

    disc_id: int | None = None
    try:
        if not api_key:
            async with async_session() as db:
                err_msg = Discussion(
                    workspace_id=workspace_id,
                    goal_id=None,
                    content="⚠️ 当前 AI API 未配置，请在 Settings → AI Model 中设置 API Key。",
                    role="agent",
                    topic_id=topic_id,
                )
                db.add(err_msg)
                await db.commit()
                await db.refresh(err_msg)
            await bus.emit(DISCUSSION_CREATED, {
                "id": err_msg.id,
                "workspace_id": workspace_id,
                "goal_id": None,
                "role": "agent",
                "content": err_msg.content,
                "topic_id": topic_id,
                "created_at": err_msg.created_at.isoformat(),
            })
            await bus.emit(DISCUSSION_DELTA, {
                "workspace_id": workspace_id,
                "goal_id": None,
                "discussion_id": err_msg.id,
                "delta": "",
                "done": True,
            })
            return

        async with async_session() as db:
            agent_msg = Discussion(
                workspace_id=workspace_id,
                goal_id=None,
                content="",
                role="agent",
                topic_id=topic_id,
            )
            db.add(agent_msg)
            await db.commit()
            await db.refresh(agent_msg)
            disc_id = agent_msg.id

        await bus.emit(DISCUSSION_CREATED, {
            "id": disc_id,
            "workspace_id": workspace_id,
            "goal_id": None,
            "role": "agent",
            "content": "",
            "topic_id": topic_id,
            "created_at": agent_msg.created_at.isoformat(),
        })

        async with async_session() as db:
            stmt = (
                select(Discussion)
                .where(Discussion.workspace_id == workspace_id)
                .where(Discussion.goal_id.is_(None))  # type: ignore[union-attr]
            )
            if topic_id is not None:
                stmt = stmt.where(Discussion.topic_id == topic_id)
            stmt = stmt.order_by(Discussion.created_at.desc()).limit(_MAX_CONTEXT_MESSAGES)
            result = await db.execute(stmt)
            recent = list(reversed(result.scalars().all()))

        messages: list[dict] = []
        for msg in recent:
            if msg.id == disc_id:
                continue
            role = "user" if msg.role == "user" else "assistant"
            messages.append({"role": role, "content": msg.content})

        if image_data_uri and messages and messages[-1]["role"] == "user":
            media_type = "image/png"
            b64_data = image_data_uri
            if image_data_uri.startswith("data:"):
                header, b64_data = image_data_uri.split(",", 1)
                if "image/jpeg" in header:
                    media_type = "image/jpeg"
            messages[-1]["content"] = [
                {
                    "type": "image",
                    "source": {
                        "type": "base64",
                        "media_type": media_type,
                        "data": b64_data,
                    },
                },
                {"type": "text", "text": messages[-1]["content"]},
            ]

        base_url = await resolve_ai_base_url()
        model = await resolve_ai_model()
        client = anthropic.AsyncAnthropic(
            api_key=api_key,
            base_url=base_url or None,
        )
        full_text = ""

        async with client.messages.stream(
            model=model,
            max_tokens=1024,
            system=_SYSTEM_PROMPT,
            messages=messages,
        ) as stream:
            async for text in stream.text_stream:
                full_text += text
                await bus.emit(DISCUSSION_DELTA, {
                    "workspace_id": workspace_id,
                    "goal_id": None,
                    "discussion_id": disc_id,
                    "delta": text,
                })

        async with async_session() as db:
            stmt = select(Discussion).where(Discussion.id == disc_id)
            result = await db.execute(stmt)
            row = result.scalar_one_or_none()
            if row:
                row.content = full_text
                db.add(row)
                await db.commit()

        await bus.emit(DISCUSSION_DELTA, {
            "workspace_id": workspace_id,
            "goal_id": None,
            "discussion_id": disc_id,
            "delta": "",
            "done": True,
        })

    except Exception as e:
        _logger.warning("Standalone AI reply failed: %s", e)
        if disc_id is not None:
            await bus.emit(DISCUSSION_DELTA, {
                "workspace_id": workspace_id,
                "goal_id": None,
                "discussion_id": disc_id,
                "delta": "",
                "error": f"AI 回复出错: {e}",
            })
