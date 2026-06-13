"""Knowledge — tree + file read/write + session chat."""
from fastapi import APIRouter

router = APIRouter()


@router.get("/tree")
async def tree() -> dict:
    """Return the knowledge/ directory tree of the active fork."""
    # TODO (W2): GitHub Trees API
    return {"path": "knowledge/", "children": []}


@router.get("/file")
async def file(path: str) -> dict:
    """Read a single file by path."""
    # TODO (W2): GitHub Contents API
    return {"path": path, "content": ""}


@router.put("/file")
async def update_file(payload: dict) -> dict:
    """Write a file (commit to fork)."""
    # TODO (W2): GitHub Commits API
    return {"ok": True}


@router.post("/session/new")
async def new_session(payload: dict) -> dict:
    """Create a new session folder under knowledge/sessions/."""
    # TODO (W2): create folder + 4 empty files + commit
    return {"name": payload.get("name", ""), "path": "knowledge/sessions/"}


@router.post("/session/chat")
async def session_chat(payload: dict) -> dict:
    """Append a chat turn to the session's conversation.md."""
    # TODO (W2): call Anthropic, stream response, commit conversation.md
    return {"reply": ""}
