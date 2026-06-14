"""GoalGroup API — workspace-scoped goal categorisation."""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.routes.deps import require_auth
from app.services.knowledge_store import KnowledgeStore, get_store

router = APIRouter()

_COL = "goal_groups"


class GoalGroupCreate(BaseModel):
    workspace_id: str
    name: str


class GoalGroupUpdate(BaseModel):
    name: str


@router.get("")
async def list_goal_groups(
    workspace_id: str,
    store: KnowledgeStore = Depends(get_store),
    _user: dict = Depends(require_auth),
):
    return store.list(_COL, workspace_id=workspace_id)


@router.post("", status_code=201)
async def create_goal_group(
    body: GoalGroupCreate,
    store: KnowledgeStore = Depends(get_store),
    _user: dict = Depends(require_auth),
):
    return await store.create(_COL, {"workspace_id": body.workspace_id, "name": body.name})


@router.patch("/{group_id}")
async def update_goal_group(
    group_id: int,
    body: GoalGroupUpdate,
    store: KnowledgeStore = Depends(get_store),
    _user: dict = Depends(require_auth),
):
    updated = await store.update(_COL, group_id, {"name": body.name})
    if not updated:
        raise HTTPException(status_code=404, detail="GoalGroup not found")
    return updated


@router.delete("/{group_id}", status_code=204)
async def delete_goal_group(
    group_id: int,
    store: KnowledgeStore = Depends(get_store),
    _user: dict = Depends(require_auth),
):
    for goal in store.list("goals", group_id=group_id):
        await store.update("goals", goal["id"], {"group_id": None})
    deleted = await store.delete(_COL, group_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="GoalGroup not found")
