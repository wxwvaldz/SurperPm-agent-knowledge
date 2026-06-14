"""Synchronous AI chat endpoint — used by feishu-bot and other API clients."""

import logging

import anthropic
from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.routes.deps import require_auth
from app.services.ai_key_resolver import resolve_ai_base_url, resolve_ai_key, resolve_ai_model

_logger = logging.getLogger(__name__)

router = APIRouter()


class ChatRequest(BaseModel):
    message: str
    session_name: str | None = None  # reserved for future session tracking


class ChatResponse(BaseModel):
    reply: str


@router.post("", response_model=ChatResponse)
async def chat(body: ChatRequest, _user: dict = Depends(require_auth)) -> ChatResponse:
    """Simple request/response AI chat.

    Resolves credentials from GlobalConfig / ai_config.json / env,
    calls the configured LLM, and returns the reply synchronously.
    """
    api_key = await resolve_ai_key()
    if not api_key:
        return ChatResponse(reply="AI API not configured. Please set an API key in Settings.")

    base_url = await resolve_ai_base_url()
    model = await resolve_ai_model()

    client = anthropic.AsyncAnthropic(
        api_key=api_key,
        base_url=base_url or None,
    )

    messages = [{"role": "user", "content": body.message}]

    try:
        response = await client.messages.create(
            model=model,
            max_tokens=2048,
            system=(
                "You are SuperPmAgent, a helpful AI project management assistant. "
                "Be concise and actionable. Reply in the user's language."
            ),
            messages=messages,
        )
        reply = "".join(b.text for b in response.content if b.type == "text")
    except anthropic.APIError as e:
        _logger.warning("chat: Anthropic API error: %s", e)
        return ChatResponse(reply=f"AI service error: {e.message}")
    except Exception as e:
        _logger.warning("chat: unexpected error: %s", e)
        return ChatResponse(reply=f"Unexpected error: {e}")

    return ChatResponse(reply=reply)
