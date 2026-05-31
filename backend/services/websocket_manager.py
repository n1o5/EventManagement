"""
WebSocket Manager
-----------------
Manages per-group-room WebSocket connections and broadcasts events.
"""

import json
from typing import Dict, List
from fastapi import WebSocket


class ConnectionManager:
    def __init__(self):
        # group_id -> list of active WebSocket connections
        self.rooms: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, group_id: str):
        await websocket.accept()
        self.rooms.setdefault(group_id, []).append(websocket)

    def disconnect(self, websocket: WebSocket, group_id: str):
        room = self.rooms.get(group_id, [])
        if websocket in room:
            room.remove(websocket)
        if not room:
            self.rooms.pop(group_id, None)

    async def broadcast(self, group_id: str, event_type: str, data: dict):
        """Send a typed event to everyone in a group room."""
        message = json.dumps({"type": event_type, "data": data})
        dead = []
        for ws in self.rooms.get(group_id, []):
            try:
                await ws.send_text(message)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(ws, group_id)

    async def send_personal(self, websocket: WebSocket, event_type: str, data: dict):
        message = json.dumps({"type": event_type, "data": data})
        await websocket.send_text(message)


# Singleton used across the app
manager = ConnectionManager()


# ── Event type constants ───────────────────────────────────────────────────────
class WSEvent:
    MEMBER_JOINED = "member_joined"
    MEMBER_VOTED = "member_voted"
    SEATS_SUGGESTED = "seats_suggested"
    SEATS_LOCKED = "seats_locked"
    GROUP_CONFIRMED = "group_confirmed"
    GROUP_EXPIRED = "group_expired"
    STATUS_CHANGED = "status_changed"
    ERROR = "error"
