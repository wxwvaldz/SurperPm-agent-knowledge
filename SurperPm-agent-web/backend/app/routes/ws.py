from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.ws import hub

router = APIRouter()

@router.websocket("/ws/{workspace_id}")
async def websocket_endpoint(websocket: WebSocket, workspace_id: str):
    await hub.connect(workspace_id, websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        hub.disconnect(workspace_id, websocket)


@router.websocket("/ws/goal/{goal_id}")
async def websocket_goal_endpoint(websocket: WebSocket, goal_id: int):
    key = f"goal:{goal_id}"
    await hub.connect(key, websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        hub.disconnect(key, websocket)
