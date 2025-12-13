---
name: ws
description: Generate a WebSocket endpoint with connection management and authentication
argument-hint: "[endpoint_name] [--auth] [--rooms] [--broadcast]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
---

# Generate WebSocket Endpoint

Generate a WebSocket endpoint with connection management, authentication, and optional room support.

## Required Information

Before generating, gather:
1. **Endpoint name** (e.g., "chat", "notifications", "live_updates")
2. **Authentication required?** - Token validation
3. **Room support?** - Multiple channels/rooms
4. **Broadcast capability?** - Send to all connected clients
5. **Message types** - What message types to handle

## Connection Manager Template

```python
# app/websocket/manager.py
from fastapi import WebSocket
from typing import Dict, Set, Optional, List
import json
import asyncio
from datetime import datetime
import structlog

logger = structlog.get_logger()

class ConnectionManager:
    """
    Manages WebSocket connections with room support.

    Features:
    - User-to-connection mapping
    - Room-based grouping
    - Broadcast capabilities
    - Connection health monitoring
    """

    def __init__(self):
        # user_id -> WebSocket connection
        self.active_connections: Dict[str, WebSocket] = {}
        # room_id -> set of user_ids
        self.rooms: Dict[str, Set[str]] = {}
        # user_id -> set of room_ids
        self.user_rooms: Dict[str, Set[str]] = {}

    async def connect(
        self,
        websocket: WebSocket,
        user_id: str,
        room_id: Optional[str] = None
    ) -> bool:
        """Accept connection and optionally join room."""
        try:
            await websocket.accept()
            self.active_connections[user_id] = websocket

            if room_id:
                await self.join_room(user_id, room_id)

            logger.info(
                "websocket_connected",
                user_id=user_id,
                room_id=room_id,
                total_connections=len(self.active_connections)
            )
            return True

        except Exception as e:
            logger.error("websocket_connect_failed", user_id=user_id, error=str(e))
            return False

    def disconnect(self, user_id: str):
        """Remove user from all rooms and connections."""
        # Remove from all rooms
        if user_id in self.user_rooms:
            for room_id in list(self.user_rooms[user_id]):
                self.leave_room(user_id, room_id)
            del self.user_rooms[user_id]

        # Remove connection
        self.active_connections.pop(user_id, None)

        logger.info(
            "websocket_disconnected",
            user_id=user_id,
            total_connections=len(self.active_connections)
        )

    async def join_room(self, user_id: str, room_id: str):
        """Add user to a room."""
        if room_id not in self.rooms:
            self.rooms[room_id] = set()

        self.rooms[room_id].add(user_id)

        if user_id not in self.user_rooms:
            self.user_rooms[user_id] = set()
        self.user_rooms[user_id].add(room_id)

        # Notify room members
        await self.broadcast_to_room(room_id, {
            "type": "user_joined",
            "user_id": user_id,
            "room_id": room_id,
            "timestamp": datetime.utcnow().isoformat()
        }, exclude={user_id})

        logger.info("user_joined_room", user_id=user_id, room_id=room_id)

    def leave_room(self, user_id: str, room_id: str):
        """Remove user from a room."""
        if room_id in self.rooms:
            self.rooms[room_id].discard(user_id)
            if not self.rooms[room_id]:
                del self.rooms[room_id]

        if user_id in self.user_rooms:
            self.user_rooms[user_id].discard(room_id)

        logger.info("user_left_room", user_id=user_id, room_id=room_id)

    async def send_personal(
        self,
        user_id: str,
        message: dict
    ) -> bool:
        """Send message to specific user."""
        websocket = self.active_connections.get(user_id)
        if websocket:
            try:
                await websocket.send_json(message)
                return True
            except Exception as e:
                logger.warning("send_failed", user_id=user_id, error=str(e))
                self.disconnect(user_id)
        return False

    async def broadcast_to_room(
        self,
        room_id: str,
        message: dict,
        exclude: Optional[Set[str]] = None
    ):
        """Broadcast message to all users in a room."""
        exclude = exclude or set()

        if room_id not in self.rooms:
            return

        tasks = []
        for user_id in self.rooms[room_id]:
            if user_id not in exclude:
                websocket = self.active_connections.get(user_id)
                if websocket:
                    tasks.append(self._safe_send(websocket, user_id, message))

        await asyncio.gather(*tasks, return_exceptions=True)

    async def broadcast_all(
        self,
        message: dict,
        exclude: Optional[Set[str]] = None
    ):
        """Broadcast message to all connected users."""
        exclude = exclude or set()

        tasks = []
        for user_id, websocket in self.active_connections.items():
            if user_id not in exclude:
                tasks.append(self._safe_send(websocket, user_id, message))

        await asyncio.gather(*tasks, return_exceptions=True)

    async def _safe_send(
        self,
        websocket: WebSocket,
        user_id: str,
        message: dict
    ):
        """Send message with error handling."""
        try:
            await websocket.send_json(message)
        except Exception as e:
            logger.warning("broadcast_send_failed", user_id=user_id, error=str(e))
            self.disconnect(user_id)

    def get_room_users(self, room_id: str) -> List[str]:
        """Get list of users in a room."""
        return list(self.rooms.get(room_id, set()))

    def get_user_rooms(self, user_id: str) -> List[str]:
        """Get list of rooms user is in."""
        return list(self.user_rooms.get(user_id, set()))

    @property
    def connection_count(self) -> int:
        return len(self.active_connections)

# Singleton instance
manager = ConnectionManager()
```

## WebSocket Endpoint Template

```python
# app/routes/websocket.py
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, HTTPException
from typing import Optional
import structlog

from app.websocket.manager import manager
from app.core.security import decode_token

logger = structlog.get_logger()
router = APIRouter()

@router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    token: str = Query(..., description="JWT authentication token")
):
    """
    WebSocket endpoint with authentication.

    Query Parameters:
        token: JWT token for authentication

    Message Format (send):
        {
            "type": "message_type",
            "data": {...}
        }

    Message Types:
        - join_room: {"type": "join_room", "room_id": "..."}
        - leave_room: {"type": "leave_room", "room_id": "..."}
        - message: {"type": "message", "room_id": "...", "content": "..."}
        - ping: {"type": "ping"}
    """
    # Authenticate
    try:
        payload = decode_token(token)
        user_id = payload["sub"]
        logger.info("websocket_auth_success", user_id=user_id)
    except Exception as e:
        logger.warning("websocket_auth_failed", error=str(e))
        await websocket.close(code=4001, reason="Authentication failed")
        return

    # Connect
    connected = await manager.connect(websocket, user_id)
    if not connected:
        return

    try:
        # Send connection confirmation
        await manager.send_personal(user_id, {
            "type": "connected",
            "user_id": user_id,
            "message": "Successfully connected"
        })

        # Message loop
        while True:
            data = await websocket.receive_json()
            await handle_message(user_id, data)

    except WebSocketDisconnect:
        logger.info("websocket_disconnect", user_id=user_id)
    except Exception as e:
        logger.error("websocket_error", user_id=user_id, error=str(e))
    finally:
        manager.disconnect(user_id)

async def handle_message(user_id: str, data: dict):
    """Process incoming WebSocket message."""
    message_type = data.get("type")

    handlers = {
        "join_room": handle_join_room,
        "leave_room": handle_leave_room,
        "message": handle_chat_message,
        "ping": handle_ping,
        "typing": handle_typing,
    }

    handler = handlers.get(message_type)
    if handler:
        await handler(user_id, data)
    else:
        await manager.send_personal(user_id, {
            "type": "error",
            "message": f"Unknown message type: {message_type}"
        })

async def handle_join_room(user_id: str, data: dict):
    """Handle room join request."""
    room_id = data.get("room_id")
    if not room_id:
        await manager.send_personal(user_id, {
            "type": "error",
            "message": "room_id is required"
        })
        return

    await manager.join_room(user_id, room_id)
    await manager.send_personal(user_id, {
        "type": "room_joined",
        "room_id": room_id,
        "users": manager.get_room_users(room_id)
    })

async def handle_leave_room(user_id: str, data: dict):
    """Handle room leave request."""
    room_id = data.get("room_id")
    if room_id:
        manager.leave_room(user_id, room_id)

        # Notify room
        await manager.broadcast_to_room(room_id, {
            "type": "user_left",
            "user_id": user_id,
            "room_id": room_id
        })

        await manager.send_personal(user_id, {
            "type": "room_left",
            "room_id": room_id
        })

async def handle_chat_message(user_id: str, data: dict):
    """Handle chat message."""
    room_id = data.get("room_id")
    content = data.get("content")

    if not room_id or not content:
        await manager.send_personal(user_id, {
            "type": "error",
            "message": "room_id and content are required"
        })
        return

    # Broadcast to room
    await manager.broadcast_to_room(room_id, {
        "type": "message",
        "room_id": room_id,
        "user_id": user_id,
        "content": content,
        "timestamp": datetime.utcnow().isoformat()
    })

async def handle_ping(user_id: str, data: dict):
    """Handle ping (keep-alive)."""
    await manager.send_personal(user_id, {
        "type": "pong",
        "timestamp": datetime.utcnow().isoformat()
    })

async def handle_typing(user_id: str, data: dict):
    """Handle typing indicator."""
    room_id = data.get("room_id")
    if room_id:
        await manager.broadcast_to_room(room_id, {
            "type": "typing",
            "user_id": user_id,
            "room_id": room_id
        }, exclude={user_id})
```

## Client Example (JavaScript)

```javascript
// WebSocket client example
class WebSocketClient {
    constructor(baseUrl, token) {
        this.baseUrl = baseUrl;
        this.token = token;
        this.ws = null;
        this.handlers = {};
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
    }

    connect() {
        const url = `${this.baseUrl}/ws?token=${this.token}`;
        this.ws = new WebSocket(url);

        this.ws.onopen = () => {
            console.log('Connected');
            this.reconnectAttempts = 0;
            this.startHeartbeat();
        };

        this.ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            const handler = this.handlers[data.type];
            if (handler) handler(data);
        };

        this.ws.onclose = () => {
            console.log('Disconnected');
            this.stopHeartbeat();
            this.reconnect();
        };

        this.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
        };
    }

    reconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            setTimeout(() => this.connect(), 1000 * this.reconnectAttempts);
        }
    }

    send(type, data = {}) {
        if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ type, ...data }));
        }
    }

    on(type, handler) {
        this.handlers[type] = handler;
    }

    joinRoom(roomId) {
        this.send('join_room', { room_id: roomId });
    }

    leaveRoom(roomId) {
        this.send('leave_room', { room_id: roomId });
    }

    sendMessage(roomId, content) {
        this.send('message', { room_id: roomId, content });
    }

    startHeartbeat() {
        this.heartbeatInterval = setInterval(() => {
            this.send('ping');
        }, 30000);
    }

    stopHeartbeat() {
        clearInterval(this.heartbeatInterval);
    }
}

// Usage
const client = new WebSocketClient('wss://api.example.com', 'jwt-token');

client.on('connected', (data) => {
    console.log('Connected as:', data.user_id);
    client.joinRoom('general');
});

client.on('message', (data) => {
    console.log(`${data.user_id}: ${data.content}`);
});

client.on('user_joined', (data) => {
    console.log(`${data.user_id} joined ${data.room_id}`);
});

client.connect();
```

## Testing WebSocket

```python
# tests/test_websocket.py
import pytest
from httpx import AsyncClient
from httpx_ws import aconnect_ws

@pytest.mark.asyncio
async def test_websocket_connect(client: AsyncClient, auth_token: str):
    """Test WebSocket connection."""
    async with aconnect_ws(
        f"{client.base_url}/ws?token={auth_token}",
        client
    ) as ws:
        # Should receive connected message
        message = await ws.receive_json()
        assert message["type"] == "connected"

@pytest.mark.asyncio
async def test_websocket_join_room(client: AsyncClient, auth_token: str):
    """Test joining a room."""
    async with aconnect_ws(
        f"{client.base_url}/ws?token={auth_token}",
        client
    ) as ws:
        await ws.receive_json()  # connected

        # Join room
        await ws.send_json({"type": "join_room", "room_id": "test-room"})

        message = await ws.receive_json()
        assert message["type"] == "room_joined"
        assert message["room_id"] == "test-room"
```

## Output Files

Generate at:
- `app/websocket/manager.py` - Connection manager
- `app/routes/websocket.py` - WebSocket endpoint
- `tests/test_websocket.py` - Tests
