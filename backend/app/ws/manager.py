import asyncio
import json
from datetime import datetime, timezone

from fastapi import WebSocket
from loguru import logger


class ConnectionManager:
    def __init__(self):
        self._connections: dict[int, list[WebSocket]] = {}
        self._lock = asyncio.Lock()

    async def connect(self, websocket: WebSocket, user_id: int):
        await websocket.accept()
        async with self._lock:
            if user_id not in self._connections:
                self._connections[user_id] = []
            self._connections[user_id].append(websocket)
        logger.info(f"WebSocket connected: user {user_id}")

    async def disconnect(self, websocket: WebSocket, user_id: int):
        async with self._lock:
            if user_id in self._connections:
                self._connections[user_id] = [
                    ws for ws in self._connections[user_id] if ws != websocket
                ]
                if not self._connections[user_id]:
                    del self._connections[user_id]
        logger.info(f"WebSocket disconnected: user {user_id}")

    async def send_to_user(
        self, user_id: int, message_type: str, channel: str, payload: dict
    ):
        message = {
            "type": message_type,
            "channel": channel,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "payload": payload,
        }
        async with self._lock:
            connections = list(self._connections.get(user_id, []))

        disconnected = []
        for ws in connections:
            try:
                await ws.send_text(json.dumps(message, default=str))
            except Exception:
                disconnected.append(ws)

        for ws in disconnected:
            await self.disconnect(ws, user_id)

    async def broadcast(self, message_type: str, channel: str, payload: dict):
        async with self._lock:
            all_user_ids = list(self._connections.keys())
        for user_id in all_user_ids:
            await self.send_to_user(user_id, message_type, channel, payload)


ws_manager = ConnectionManager()
