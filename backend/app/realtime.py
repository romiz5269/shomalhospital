from typing import Any

import socketio
from fastapi import BackgroundTasks
from jose import JWTError

from app.config import get_settings
from app.security import decode_token

_settings = get_settings()

_manager = None
if _settings.redis_url:
    try:
        _manager = socketio.AsyncRedisManager(_settings.redis_url)
    except Exception:
        _manager = None

sio = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins=_settings.cors_list,
    client_manager=_manager,
    logger=False,
    engineio_logger=False,
    ping_interval=25,
    ping_timeout=60,
    max_http_buffer_size=1_000_000,
)


@sio.event
async def connect(sid, environ):
    return True


@sio.on("join:admin")
async def on_join_admin(sid, token):
    try:
        if decode_token(token).get("adminId"):
            await sio.enter_room(sid, "admin")
    except JWTError:
        return


@sio.on("join:staff")
async def on_join_staff(sid, token):
    try:
        data = decode_token(token)
        if data.get("staffId") and data.get("role") == "staff":
            await sio.enter_room(sid, f"staff:{data['staffId']}")
    except JWTError:
        return


@sio.on("join:ticket")
async def on_join_ticket(sid, payload):
    if not isinstance(payload, dict):
        return
    token = payload.get("token")
    ticket_id = payload.get("ticketId")
    role = payload.get("role")
    if not token or not ticket_id:
        return
    try:
        claims = decode_token(token)
    except JWTError:
        return
    if role == "admin" and claims.get("adminId"):
        await sio.enter_room(sid, f"ticket:{ticket_id}")
    elif role == "staff" and claims.get("staffId") and claims.get("role") == "staff":
        await sio.enter_room(sid, f"ticket:{ticket_id}")


async def push(event: str, ticket_id: str, staff_id: str | None, payload: Any) -> None:
    body = payload if payload is not None else {"ticketId": ticket_id}
    await sio.emit(event, body, room="admin")
    if staff_id:
        await sio.emit(event, body, room=f"staff:{staff_id}")
    await sio.emit(event, body, room=f"ticket:{ticket_id}")


def enqueue(
    bg: BackgroundTasks,
    event: str,
    ticket_id: str,
    staff_id: str | None,
    payload: Any,
) -> None:
    async def _job():
        try:
            await push(event, ticket_id, staff_id, payload)
        except Exception:
            # realtime must never break the HTTP response
            return

    bg.add_task(_job)
