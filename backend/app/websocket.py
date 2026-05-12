# backend/app/websocket.py
"""from fastapi import WebSocket, WebSocketDisconnect
import json

ACTIVE_CONNECTIONS = []

async def connect_ws(websocket: WebSocket):
    await websocket.accept()
    ACTIVE_CONNECTIONS.append(websocket)

async def disconnect_ws(websocket: WebSocket):
    if websocket in ACTIVE_CONNECTIONS:
        ACTIVE_CONNECTIONS.remove(websocket)

async def broadcast_threat(threat):
    # Convert Pydantic model -> dict -> JSON
    data = json.dumps(threat)
    for ws in ACTIVE_CONNECTIONS:
        try:
            await ws.send_text(data)
        except:
            pass"""
