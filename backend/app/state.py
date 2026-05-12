# backend/app/state.py
from typing import List, Dict, Any
from fastapi import WebSocket

# ===============================================================
# 🔹 Shared Global In-Memory State
# ===============================================================
# This keeps track of all detected threats and connected clients
threats: List[Dict[str, Any]] = []
active_dashboard_connections: List[WebSocket] = []

# ===============================================================
# 🔹 Broadcast Utility
# ===============================================================
async def broadcast_new_threat(threat: Dict[str, Any]):
    """
    Send a new threat to all connected dashboard WebSockets.
    Removes any clients that got disconnected.
    """
    disconnected_clients = []
    for ws in active_dashboard_connections:
        try:
            await ws.send_json(threat)
        except Exception as e:
            print(f"[WARN] WebSocket send failed: {e}")
            disconnected_clients.append(ws)

    # Remove disconnected clients
    for ws in disconnected_clients:
        if ws in active_dashboard_connections:
            active_dashboard_connections.remove(ws)
