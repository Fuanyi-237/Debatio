import socketio
import asyncio
from bson import ObjectId
from datetime import datetime, timedelta

from app.core.database import get_db
from app.models.session import SessionStatus, SessionPhase, ParticipantRole

sio = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins="*",
    logger=True
)


class ConnectionManager:
    def __init__(self):
        self.active_connections: dict = {}  # sid -> {user_id, session_id}
        self.session_rooms: dict = {}  # session_id -> set of sids
        self.timer_tasks: dict = {}  # session_id -> asyncio.Task

    async def connect(self, sid, user_id, session_id=None):
        self.active_connections[sid] = {
            "user_id": user_id,
            "session_id": session_id,
            "joined_at": datetime.utcnow()
        }
        
        if session_id:
            if session_id not in self.session_rooms:
                self.session_rooms[session_id] = set()
            self.session_rooms[session_id].add(sid)
            await sio.enter_room(sid, session_id)

    async def disconnect(self, sid):
        conn = self.active_connections.pop(sid, None)
        if conn and conn.get("session_id"):
            session_id = conn["session_id"]
            if session_id in self.session_rooms:
                self.session_rooms[session_id].discard(sid)
            await sio.leave_room(sid, session_id)

    async def broadcast_to_session(self, session_id: str, event: str, data: dict, skip_sid=None):
        await sio.emit(event, data, room=session_id, skip_sid=skip_sid)

    async def send_to_user(self, user_id: str, event: str, data: dict):
        for sid, conn in self.active_connections.items():
            if conn["user_id"] == user_id:
                await sio.emit(event, data, to=sid)


manager = ConnectionManager()


@sio.event
async def connect(sid, environ, auth=None):
    """Accept all connections - authentication happens via authenticate event"""
    print(f"Client connected: {sid}, auth={auth}")


@sio.event
async def disconnect(sid):
    await manager.disconnect(sid)
    print(f"Client disconnected: {sid}")


@sio.event
async def authenticate(sid, data):
    """Authenticate user and store their info"""
    from app.core.security import decode_token
    
    token = data.get("token")
    if not token:
        await sio.emit("auth_error", {"message": "No token provided"}, to=sid)
        return
    
    payload = decode_token(token)
    if not payload:
        await sio.emit("auth_error", {"message": "Invalid token"}, to=sid)
        return
    
    user_id = payload.get("sub")
    session_id = data.get("session_id")
    
    await manager.connect(sid, user_id, session_id)
    await sio.emit("authenticated", {"user_id": user_id}, to=sid)


@sio.event
async def join_session(sid, data):
    """Join a debate/roundtable session"""
    session_id = data.get("session_id")
    user_id = manager.active_connections.get(sid, {}).get("user_id")

    if not user_id:
        await sio.emit("error", {"message": "Not authenticated"}, to=sid)
        return

    db = get_db()
    session = await db.sessions.find_one({"_id": ObjectId(session_id)})

    if not session:
        await sio.emit("error", {"message": "Session not found"}, to=sid)
        return

    # Check if user is participant
    participant = next(
        (p for p in session.get("participants", []) if p["user_id"] == user_id),
        None
    )

    if not participant:
        waiting_entry = await db.waiting_room.find_one({
            "session_id": session_id,
            "user_id": user_id,
            "status": "approved"
        })

        if waiting_entry:
            approved_role = waiting_entry.get("approved_role", ParticipantRole.OBSERVER)
            user = await db.users.find_one({"_id": ObjectId(user_id)})
            from app.models.session import Participant
            participant = Participant(
                user_id=user_id,
                role=approved_role,
                is_active=True,
                joined_at=datetime.utcnow()
            ).dict()
            participant["username"] = user.get("username", "Unknown") if user else "Unknown"
            await db.sessions.update_one(
                {"_id": ObjectId(session_id)},
                {"$push": {"participants": participant}}
            )
        else:
            await sio.emit("waiting_room_required", {
                "message": "Waiting room approval required before joining."
            }, to=sid)
            await sio.emit("error", {"message": "Not authorized to join"}, to=sid)
            return

    # Update connection with session
    await manager.connect(sid, user_id, session_id)

    # Update participant as active
    await db.sessions.update_one(
        {
            "_id": ObjectId(session_id),
            "participants.user_id": user_id
        },
        {
            "$set": {
                "participants.$.is_active": True,
                "participants.$.joined_at": datetime.utcnow()
            }
        }
    )

    # Get active participant count
    active_count = len(manager.session_rooms.get(session_id, set()))

    # Get user info for the participant
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    participant_with_username = {**participant, "username": user.get("username", "Unknown") if user else "Unknown"}

    # Serialize datetime fields for JSON
    def serialize_datetime(obj):
        if isinstance(obj, datetime):
            return obj.isoformat()
        return obj

    participant_serialized = {k: serialize_datetime(v) for k, v in participant_with_username.items()}

    # Notify others
    await manager.broadcast_to_session(
        session_id,
        "user_joined",
        {
            "user_id": user_id,
            "participant": participant_serialized,
            "active_count": active_count,
            "timestamp": datetime.utcnow().isoformat()
        },
        skip_sid=sid
    )

    await sio.emit("joined", {
        "session_id": session_id,
        "participant": participant_serialized,
        "active_count": active_count
    }, to=sid)


@sio.event
async def leave_session(sid, data):
    """Leave a session"""
    session_id = data.get("session_id")
    user_id = manager.active_connections.get(sid, {}).get("user_id")

    if session_id and user_id:
        db = get_db()

        await db.sessions.update_one(
            {
                "_id": ObjectId(session_id),
                "participants.user_id": user_id
            },
            {"$set": {"participants.$.is_active": False}}
        )

        # Remove from session rooms before getting count
        await manager.disconnect(sid)

        # Get updated active participant count
        active_count = len(manager.session_rooms.get(session_id, set()))

        await manager.broadcast_to_session(
            session_id,
            "user_left",
            {
                "user_id": user_id,
                "active_count": active_count,
                "timestamp": datetime.utcnow().isoformat()
            }
        )

        await sio.emit("left", {"session_id": session_id, "active_count": active_count}, to=sid)


@sio.event
async def raise_hand(sid, data):
    """Raise hand to speak"""
    session_id = data.get("session_id")
    user_id = manager.active_connections.get(sid, {}).get("user_id")
    
    if not session_id or not user_id:
        return
    
    db = get_db()
    session = await db.sessions.find_one({"_id": ObjectId(session_id)})
    
    if not session:
        return
    
    # Update participant
    await db.sessions.update_one(
        {
            "_id": ObjectId(session_id),
            "participants.user_id": user_id
        },
        {
            "$set": {
                "participants.$.has_raised_hand": True,
                "participants.$.hand_raised_at": datetime.utcnow()
            }
        }
    )
    
    # Add to speaking queue if not already there
    if user_id not in session.get("speaking_queue", []):
        await db.sessions.update_one(
            {"_id": ObjectId(session_id)},
            {"$push": {"speaking_queue": user_id}}
        )
    
    # Notify moderator and host
    await manager.broadcast_to_session(
        session_id,
        "hand_raised",
        {
            "user_id": user_id,
            "timestamp": datetime.utcnow().isoformat()
        }
    )


@sio.event
async def lower_hand(sid, data):
    """Lower hand"""
    session_id = data.get("session_id")
    user_id = manager.active_connections.get(sid, {}).get("user_id")
    
    if not session_id or not user_id:
        return
    
    db = get_db()
    
    await db.sessions.update_one(
        {
            "_id": ObjectId(session_id),
            "participants.user_id": user_id
        },
        {
            "$set": {
                "participants.$.has_raised_hand": False,
                "participants.$.hand_raised_at": None
            }
        }
    )
    
    await db.sessions.update_one(
        {"_id": ObjectId(session_id)},
        {"$pull": {"speaking_queue": user_id}}
    )
    
    await manager.broadcast_to_session(
        session_id,
        "hand_lowered",
        {"user_id": user_id}
    )


@sio.event
async def assign_speaking_turn(sid, data):
    """Moderator assigns speaking turn"""
    session_id = data.get("session_id")
    target_user_id = data.get("user_id")
    moderator_id = manager.active_connections.get(sid, {}).get("user_id")
    
    if not session_id or not moderator_id:
        return
    
    db = get_db()
    session = await db.sessions.find_one({"_id": ObjectId(session_id)})
    
    if not session:
        return
    
    # Verify moderator is authorized
    moderator = next(
        (p for p in session.get("participants", []) if p["user_id"] == moderator_id),
        None
    )
    
    if not moderator or moderator["role"] not in [ParticipantRole.HOST, ParticipantRole.MODERATOR]:
        await sio.emit("error", {"message": "Not authorized"}, to=sid)
        return
    
    # Get rules for speaking time
    rules = session.get("rules", {})
    max_speaking_time = rules.get("max_speaking_time", 180)
    
    # Update current speaker
    await db.sessions.update_one(
        {"_id": ObjectId(session_id)},
        {
            "$set": {
                "current_speaker": target_user_id,
                "participants.$[elem].is_speaking": True,
                "participants.$[elem].is_muted": False,
                "participants.$[elem].speaking_time_remaining": max_speaking_time
            }
        },
        array_filters=[{"elem.user_id": target_user_id}]
    )
    
    # Remove from queue
    await db.sessions.update_one(
        {"_id": ObjectId(session_id)},
        {"$pull": {"speaking_queue": target_user_id}}
    )
    
    await db.sessions.update_one(
        {
            "_id": ObjectId(session_id),
            "participants.user_id": target_user_id
        },
        {
            "$set": {
                "participants.$.has_raised_hand": False,
                "participants.$.hand_raised_at": None
            }
        }
    )
    
    await manager.broadcast_to_session(
        session_id,
        "speaking_turn_assigned",
        {
            "user_id": target_user_id,
            "max_speaking_time": max_speaking_time,
            "assigned_by": moderator_id,
            "timestamp": datetime.utcnow().isoformat()
        }
    )


@sio.event
async def end_speaking_turn(sid, data):
    """End current speaking turn"""
    session_id = data.get("session_id")
    user_id = manager.active_connections.get(sid, {}).get("user_id")
    
    if not session_id or not user_id:
        return
    
    db = get_db()
    session = await db.sessions.find_one({"_id": ObjectId(session_id)})
    
    if not session:
        return
    
    current_speaker = session.get("current_speaker")
    
    # Either speaker ends their turn or moderator/host ends it
    participant = next(
        (p for p in session.get("participants", []) if p["user_id"] == user_id),
        None
    )
    
    can_end = (
        user_id == current_speaker or
        (participant and participant["role"] in [ParticipantRole.HOST, ParticipantRole.MODERATOR])
    )
    
    if not can_end:
        return
    
    # Reset current speaker
    await db.sessions.update_one(
        {"_id": ObjectId(session_id)},
        {
            "$set": {
                "current_speaker": None,
                "participants.$[elem].is_speaking": False,
                "participants.$[elem].is_muted": True,
                "participants.$[elem].speaking_time_remaining": 0
            }
        },
        array_filters=[{"elem.user_id": current_speaker}]
    )
    
    await manager.broadcast_to_session(
        session_id,
        "speaking_turn_ended",
        {
            "user_id": current_speaker,
            "ended_by": user_id,
            "timestamp": datetime.utcnow().isoformat()
        }
    )


@sio.event
async def mute_user(sid, data):
    """Moderator mutes a user"""
    session_id = data.get("session_id")
    target_user_id = data.get("user_id")
    moderator_id = manager.active_connections.get(sid, {}).get("user_id")
    
    if not session_id or not moderator_id:
        return
    
    db = get_db()
    session = await db.sessions.find_one({"_id": ObjectId(session_id)})
    
    if not session:
        return
    
    moderator = next(
        (p for p in session.get("participants", []) if p["user_id"] == moderator_id),
        None
    )
    
    if not moderator or moderator["role"] not in [ParticipantRole.HOST, ParticipantRole.MODERATOR]:
        return
    
    await db.sessions.update_one(
        {
            "_id": ObjectId(session_id),
            "participants.user_id": target_user_id
        },
        {"$set": {"participants.$.is_muted": True}}
    )
    
    await manager.broadcast_to_session(
        session_id,
        "user_muted",
        {
            "user_id": target_user_id,
            "muted_by": moderator_id
        }
    )


@sio.event
async def unmute_user(sid, data):
    """Moderator unmutes a user"""
    session_id = data.get("session_id")
    target_user_id = data.get("user_id")
    moderator_id = manager.active_connections.get(sid, {}).get("user_id")
    
    if not session_id or not moderator_id:
        return
    
    db = get_db()
    session = await db.sessions.find_one({"_id": ObjectId(session_id)})
    
    if not session:
        return
    
    moderator = next(
        (p for p in session.get("participants", []) if p["user_id"] == moderator_id),
        None
    )
    
    if not moderator or moderator["role"] not in [ParticipantRole.HOST, ParticipantRole.MODERATOR]:
        return
    
    await db.sessions.update_one(
        {
            "_id": ObjectId(session_id),
            "participants.user_id": target_user_id
        },
        {"$set": {"participants.$.is_muted": False}}
    )
    
    await manager.broadcast_to_session(
        session_id,
        "user_unmuted",
        {
            "user_id": target_user_id,
            "unmuted_by": moderator_id
        }
    )


@sio.event
async def send_chat_message(sid, data):
    """Send chat message in session"""
    session_id = data.get("session_id")
    user_id = manager.active_connections.get(sid, {}).get("user_id")
    message = data.get("message")

    if not session_id or not user_id or not message:
        return

    # Get user info for username
    db = get_db()
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    username = user.get("username", "Unknown") if user else "Unknown"

    # Store in transcript
    await db.sessions.update_one(
        {"_id": ObjectId(session_id)},
        {
            "$push": {
                "transcript": {
                    "type": "chat",
                    "user_id": user_id,
                    "username": username,
                    "message": message,
                    "timestamp": datetime.utcnow()
                }
            }
        }
    )

    await manager.broadcast_to_session(
        session_id,
        "chat_message",
        {
            "user_id": user_id,
            "username": username,
            "message": message,
            "timestamp": datetime.utcnow().isoformat()
        },
        skip_sid=sid
    )


@sio.event
async def update_participant_role(sid, data):
    """Update participant role (host only)"""
    session_id = data.get("session_id")
    target_user_id = data.get("user_id")
    new_role = data.get("role")
    host_id = manager.active_connections.get(sid, {}).get("user_id")
    
    if not session_id or not host_id:
        return
    
    db = get_db()
    session = await db.sessions.find_one({"_id": ObjectId(session_id)})
    
    if not session or session["host_id"] != host_id:
        await sio.emit("error", {"message": "Only host can change roles"}, to=sid)
        return
    
    await db.sessions.update_one(
        {
            "_id": ObjectId(session_id),
            "participants.user_id": target_user_id
        },
        {"$set": {"participants.$.role": new_role}}
    )
    
    await manager.broadcast_to_session(
        session_id,
        "role_updated",
        {
            "user_id": target_user_id,
            "new_role": new_role,
            "updated_by": host_id
        }
    )


@sio.event
async def signal(sid, data):
    """WebRTC signaling"""
    session_id = data.get("session_id")
    target_user_id = data.get("to")
    signal_data = data.get("signal")
    from_user_id = manager.active_connections.get(sid, {}).get("user_id")

    if not session_id or not from_user_id:
        return

    await manager.send_to_user(
        target_user_id,
        "signal",
        {
            "from": from_user_id,
            "signal": signal_data,
            "type": data.get("type")
        }
    )


# ==================== TIMER ENGINE ====================

async def run_timer(session_id: str):
    """Background timer that ticks every second for a session"""
    db = get_db()
    try:
        while True:
            await asyncio.sleep(1)
            session = await db.sessions.find_one({"_id": ObjectId(session_id)})
            if not session:
                break

            timer = session.get("timer", {})
            if not timer.get("is_running", False):
                break

            time_remaining = timer.get("time_remaining", 0) - 1
            rules = session.get("rules", {})
            warning_time = rules.get("warning_time", 30)
            auto_mute = rules.get("auto_mute_on_expiry", True)

            update = {"timer.time_remaining": time_remaining}

            # Warning
            if time_remaining == warning_time and not timer.get("warning_issued", False):
                update["timer.warning_issued"] = True
                await manager.broadcast_to_session(session_id, "timer_warning", {
                    "time_remaining": time_remaining,
                    "session_id": session_id
                })

            # Timer expired
            if time_remaining <= 0:
                update["timer.is_running"] = False
                update["timer.time_remaining"] = 0
                current_speaker = session.get("current_speaker")

                if current_speaker and auto_mute:
                    # Auto-mute and end turn
                    await db.sessions.update_one(
                        {"_id": ObjectId(session_id)},
                        {
                            "$set": {
                                **update,
                                "current_speaker": None,
                                "participants.$[elem].is_speaking": False,
                                "participants.$[elem].is_muted": True,
                                "participants.$[elem].speaking_time_remaining": 0,
                            }
                        },
                        array_filters=[{"elem.user_id": current_speaker}]
                    )

                    # Track speaking time
                    started_at = timer.get("started_at")
                    if started_at:
                        elapsed = int((datetime.utcnow() - datetime.fromisoformat(started_at)).total_seconds())
                        await db.sessions.update_one(
                            {"_id": ObjectId(session_id), "participants.user_id": current_speaker},
                            {"$inc": {"participants.$.total_speaking_time": elapsed, "participants.$.speaking_turns": 1}}
                        )

                    await manager.broadcast_to_session(session_id, "timer_expired", {
                        "user_id": current_speaker,
                        "session_id": session_id
                    })
                    await manager.broadcast_to_session(session_id, "speaking_turn_ended", {
                        "user_id": current_speaker,
                        "ended_by": "system",
                        "reason": "time_expired",
                        "timestamp": datetime.utcnow().isoformat()
                    })

                    # Check fairness
                    await check_fairness(session_id)
                break

            await db.sessions.update_one(
                {"_id": ObjectId(session_id)},
                {"$set": update}
            )

            await manager.broadcast_to_session(session_id, "timer_tick", {
                "time_remaining": time_remaining,
                "session_id": session_id
            })

    except asyncio.CancelledError:
        pass
    except Exception as e:
        print(f"Timer error for session {session_id}: {e}")


async def start_timer(session_id: str, speaker_id: str, max_time: int):
    """Start the countdown timer for a speaker"""
    db = get_db()
    await db.sessions.update_one(
        {"_id": ObjectId(session_id)},
        {"$set": {
            "timer.time_remaining": max_time,
            "timer.is_running": True,
            "timer.warning_issued": False,
            "timer.speaker_id": speaker_id,
            "timer.started_at": datetime.utcnow().isoformat()
        }}
    )

    # Cancel existing timer if any
    if session_id in manager.timer_tasks:
        manager.timer_tasks[session_id].cancel()

    manager.timer_tasks[session_id] = asyncio.create_task(run_timer(session_id))


async def stop_timer(session_id: str):
    """Stop the timer for a session"""
    db = get_db()
    if session_id in manager.timer_tasks:
        manager.timer_tasks[session_id].cancel()
        del manager.timer_tasks[session_id]

    await db.sessions.update_one(
        {"_id": ObjectId(session_id)},
        {"$set": {"timer.is_running": False}}
    )


async def check_fairness(session_id: str):
    """Check speaking time fairness and alert if needed"""
    db = get_db()
    session = await db.sessions.find_one({"_id": ObjectId(session_id)})
    if not session:
        return

    participants = session.get("participants", [])
    if len(participants) < 2:
        return

    total_time = sum(p.get("total_speaking_time", 0) for p in participants)
    if total_time == 0:
        return

    avg_time = total_time / len(participants)
    dominant = []
    underrepresented = []

    for p in participants:
        t = p.get("total_speaking_time", 0)
        if t > avg_time * 1.5:
            dominant.append(p["user_id"])
        elif t < avg_time * 0.5 and p.get("role") != ParticipantRole.OBSERVER:
            underrepresented.append(p["user_id"])

    if dominant or underrepresented:
        await manager.broadcast_to_session(session_id, "fairness_alert", {
            "dominant_speakers": dominant,
            "underrepresented_speakers": underrepresented,
            "average_time": avg_time,
            "timestamp": datetime.utcnow().isoformat()
        })


# ==================== PHASE & SESSION CONTROL ====================

@sio.event
async def change_phase(sid, data):
    """Change session phase (host/moderator only)"""
    session_id = data.get("session_id")
    new_phase = data.get("phase")
    user_id = manager.active_connections.get(sid, {}).get("user_id")

    if not session_id or not user_id or not new_phase:
        return

    db = get_db()
    session = await db.sessions.find_one({"_id": ObjectId(session_id)})
    if not session:
        return

    participant = next(
        (p for p in session.get("participants", []) if p["user_id"] == user_id),
        None
    )
    if not participant or participant["role"] not in [ParticipantRole.HOST, ParticipantRole.MODERATOR]:
        await sio.emit("error", {"message": "Not authorized"}, to=sid)
        return

    update_fields = {"phase": new_phase}
    if new_phase == SessionPhase.OPENING:
        update_fields["current_round"] = 1
    elif new_phase == SessionPhase.ARGUMENT:
        update_fields["current_round"] = session.get("current_round", 0) + 1

    await db.sessions.update_one(
        {"_id": ObjectId(session_id)},
        {"$set": update_fields}
    )

    await manager.broadcast_to_session(session_id, "phase_changed", {
        "phase": new_phase,
        "current_round": update_fields.get("current_round", session.get("current_round", 0)),
        "changed_by": user_id,
        "timestamp": datetime.utcnow().isoformat()
    })


@sio.event
async def pause_session(sid, data):
    """Pause a live session"""
    session_id = data.get("session_id")
    user_id = manager.active_connections.get(sid, {}).get("user_id")

    if not session_id or not user_id:
        return

    db = get_db()
    session = await db.sessions.find_one({"_id": ObjectId(session_id)})
    if not session:
        return

    participant = next(
        (p for p in session.get("participants", []) if p["user_id"] == user_id),
        None
    )
    if not participant or participant["role"] not in [ParticipantRole.HOST, ParticipantRole.MODERATOR]:
        return

    await stop_timer(session_id)
    await db.sessions.update_one(
        {"_id": ObjectId(session_id)},
        {"$set": {"status": SessionStatus.PAUSED, "timer.is_running": False}}
    )

    await manager.broadcast_to_session(session_id, "session_paused", {
        "paused_by": user_id,
        "timestamp": datetime.utcnow().isoformat()
    })


@sio.event
async def resume_session(sid, data):
    """Resume a paused session"""
    session_id = data.get("session_id")
    user_id = manager.active_connections.get(sid, {}).get("user_id")

    if not session_id or not user_id:
        return

    db = get_db()
    session = await db.sessions.find_one({"_id": ObjectId(session_id)})
    if not session or session.get("status") != SessionStatus.PAUSED:
        return

    participant = next(
        (p for p in session.get("participants", []) if p["user_id"] == user_id),
        None
    )
    if not participant or participant["role"] not in [ParticipantRole.HOST, ParticipantRole.MODERATOR]:
        return

    timer = session.get("timer", {})
    await db.sessions.update_one(
        {"_id": ObjectId(session_id)},
        {"$set": {"status": SessionStatus.LIVE}}
    )

    # Resume timer if there's time remaining
    if timer.get("time_remaining", 0) > 0 and timer.get("speaker_id"):
        await start_timer(session_id, timer["speaker_id"], timer["time_remaining"])

    await manager.broadcast_to_session(session_id, "session_resumed", {
        "resumed_by": user_id,
        "timestamp": datetime.utcnow().isoformat()
    })


# ==================== TIMER & SPEAKING EXTENSIONS ====================

@sio.event
async def request_extension(sid, data):
    """Speaker requests time extension"""
    session_id = data.get("session_id")
    user_id = manager.active_connections.get(sid, {}).get("user_id")

    if not session_id or not user_id:
        return

    db = get_db()
    session = await db.sessions.find_one({"_id": ObjectId(session_id)})
    if not session:
        return

    if session.get("current_speaker") != user_id:
        return

    rules = session.get("rules", {})
    if not rules.get("extension_allowed", True):
        await sio.emit("error", {"message": "Extensions not allowed"}, to=sid)
        return

    participant = next(
        (p for p in session.get("participants", []) if p["user_id"] == user_id),
        None
    )
    if not participant:
        return

    extensions_used = participant.get("extensions_used", 0)
    max_extensions = rules.get("max_extensions", 1)
    if extensions_used >= max_extensions:
        await sio.emit("error", {"message": "Max extensions reached"}, to=sid)
        return

    await manager.broadcast_to_session(session_id, "extension_requested", {
        "user_id": user_id,
        "extensions_used": extensions_used,
        "max_extensions": max_extensions,
        "timestamp": datetime.utcnow().isoformat()
    })


@sio.event
async def grant_extension(sid, data):
    """Moderator grants time extension"""
    session_id = data.get("session_id")
    target_user_id = data.get("user_id")
    moderator_id = manager.active_connections.get(sid, {}).get("user_id")

    if not session_id or not moderator_id:
        return

    db = get_db()
    session = await db.sessions.find_one({"_id": ObjectId(session_id)})
    if not session:
        return

    moderator = next(
        (p for p in session.get("participants", []) if p["user_id"] == moderator_id),
        None
    )
    if not moderator or moderator["role"] not in [ParticipantRole.HOST, ParticipantRole.MODERATOR]:
        return

    rules = session.get("rules", {})
    extension_time = rules.get("extension_time", 60)

    await db.sessions.update_one(
        {"_id": ObjectId(session_id), "participants.user_id": target_user_id},
        {"$inc": {"participants.$.extensions_used": 1}}
    )

    current_remaining = session.get("timer", {}).get("time_remaining", 0)
    new_time = current_remaining + extension_time

    await db.sessions.update_one(
        {"_id": ObjectId(session_id)},
        {"$set": {"timer.time_remaining": new_time, "timer.warning_issued": False}}
    )

    await manager.broadcast_to_session(session_id, "extension_granted", {
        "user_id": target_user_id,
        "additional_time": extension_time,
        "new_time_remaining": new_time,
        "granted_by": moderator_id,
        "timestamp": datetime.utcnow().isoformat()
    })


# ==================== CHALLENGE ====================

@sio.event
async def issue_challenge(sid, data):
    """Issue a challenge (if allowed by rules)"""
    session_id = data.get("session_id")
    challenged_user_id = data.get("user_id")
    reason = data.get("reason")
    challenger_id = manager.active_connections.get(sid, {}).get("user_id")

    if not session_id or not challenger_id:
        return

    db = get_db()
    session = await db.sessions.find_one({"_id": ObjectId(session_id)})
    if not session:
        return

    rules = session.get("rules", {})
    if not rules.get("allow_challenge", False):
        await sio.emit("error", {"message": "Challenges not allowed"}, to=sid)
        return

    challenger = next(
        (p for p in session.get("participants", []) if p["user_id"] == challenger_id),
        None
    )
    if not challenger or challenger["role"] == ParticipantRole.OBSERVER:
        return

    challenge_time = rules.get("challenge_time", 60)

    # Pause current speaker's timer and give challenger the floor
    await stop_timer(session_id)

    await db.sessions.update_one(
        {"_id": ObjectId(session_id)},
        {"$set": {
            "current_speaker": challenger_id,
            "participants.$[elem].is_speaking": True,
            "participants.$[elem].is_muted": False,
            "participants.$[elem].speaking_time_remaining": challenge_time
        }},
        array_filters=[{"elem.user_id": challenger_id}]
    )

    await start_timer(session_id, challenger_id, challenge_time)

    await manager.broadcast_to_session(session_id, "challenge_issued", {
        "challenger_id": challenger_id,
        "challenged_user_id": challenged_user_id,
        "reason": reason,
        "challenge_time": challenge_time,
        "timestamp": datetime.utcnow().isoformat()
    })


# ==================== REACTIONS ====================

@sio.event
async def send_reaction(sid, data):
    """Send a non-disruptive reaction"""
    session_id = data.get("session_id")
    reaction_type = data.get("type")
    user_id = manager.active_connections.get(sid, {}).get("user_id")

    if not session_id or not user_id or not reaction_type:
        return

    db = get_db()
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    username = user.get("username", "Unknown") if user else "Unknown"

    reaction = {
        "type": reaction_type,
        "user_id": user_id,
        "username": username,
        "timestamp": datetime.utcnow().isoformat()
    }

    await db.sessions.update_one(
        {"_id": ObjectId(session_id)},
        {"$push": {"reactions": reaction}}
    )

    await manager.broadcast_to_session(session_id, "reaction", reaction)


# ==================== QUESTIONS ====================

@sio.event
async def submit_question(sid, data):
    """Submit a question for the Q&A"""
    session_id = data.get("session_id")
    text = data.get("text")
    user_id = manager.active_connections.get(sid, {}).get("user_id")

    if not session_id or not user_id or not text:
        return

    db = get_db()
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    username = user.get("username", "Unknown") if user else "Unknown"

    question = {
        "id": str(ObjectId()),
        "text": text,
        "asked_by": user_id,
        "asked_by_username": username,
        "upvotes": 0,
        "upvoted_by": [],
        "is_answered": False,
        "answered_by": None,
        "created_at": datetime.utcnow().isoformat()
    }

    await db.sessions.update_one(
        {"_id": ObjectId(session_id)},
        {"$push": {"questions": question}}
    )

    await manager.broadcast_to_session(session_id, "question_submitted", question)


@sio.event
async def upvote_question(sid, data):
    """Upvote a question"""
    session_id = data.get("session_id")
    question_id = data.get("question_id")
    user_id = manager.active_connections.get(sid, {}).get("user_id")

    if not session_id or not user_id or not question_id:
        return

    db = get_db()
    session = await db.sessions.find_one({"_id": ObjectId(session_id)})
    if not session:
        return

    questions = session.get("questions", [])
    question = next((q for q in questions if q["id"] == question_id), None)
    if not question:
        return

    if user_id in question.get("upvoted_by", []):
        return

    question["upvotes"] = question.get("upvotes", 0) + 1
    question.setdefault("upvoted_by", []).append(user_id)

    await db.sessions.update_one(
        {"_id": ObjectId(session_id), "questions.id": question_id},
        {"$set": {"questions.$": question}}
    )

    await manager.broadcast_to_session(session_id, "question_upvoted", {
        "question_id": question_id,
        "upvotes": question["upvotes"],
        "upvoted_by": user_id
    })


@sio.event
async def answer_question(sid, data):
    """Mark a question as answered"""
    session_id = data.get("session_id")
    question_id = data.get("question_id")
    user_id = manager.active_connections.get(sid, {}).get("user_id")

    if not session_id or not user_id or not question_id:
        return

    db = get_db()
    await db.sessions.update_one(
        {"_id": ObjectId(session_id), "questions.id": question_id},
        {"$set": {"questions.$.is_answered": True, "questions.$.answered_by": user_id}}
    )

    await manager.broadcast_to_session(session_id, "question_answered", {
        "question_id": question_id,
        "answered_by": user_id,
        "timestamp": datetime.utcnow().isoformat()
    })


# ==================== VIOLATIONS ====================

@sio.event
async def issue_violation(sid, data):
    """Issue a violation to a participant"""
    session_id = data.get("session_id")
    target_user_id = data.get("user_id")
    violation_type = data.get("type")
    reason = data.get("reason")
    moderator_id = manager.active_connections.get(sid, {}).get("user_id")

    if not session_id or not moderator_id or not target_user_id:
        return

    db = get_db()
    session = await db.sessions.find_one({"_id": ObjectId(session_id)})
    if not session:
        return

    moderator = next(
        (p for p in session.get("participants", []) if p["user_id"] == moderator_id),
        None
    )
    if not moderator or moderator["role"] not in [ParticipantRole.HOST, ParticipantRole.MODERATOR]:
        return

    target = next(
        (p for p in session.get("participants", []) if p["user_id"] == target_user_id),
        None
    )
    if not target:
        return

    rules = session.get("rules", {})
    thresholds = rules.get("violation_thresholds", {})
    threshold = thresholds.get(violation_type, 3)

    existing = [v for v in target.get("violations", []) if v.get("type") == violation_type]
    count = len(existing) + 1

    if count >= threshold + 1:
        action = "temp_ban"
    elif count >= threshold:
        action = "mute"
    else:
        action = "warning"

    violation = {
        "type": violation_type,
        "action": action,
        "issued_by": moderator_id,
        "issued_at": datetime.utcnow().isoformat(),
        "reason": reason
    }

    await db.sessions.update_one(
        {"_id": ObjectId(session_id)},
        {"$push": {f"participants.$[elem].violations": violation}},
        array_filters=[{"elem.user_id": target_user_id}]
    )

    if action == "mute":
        await db.sessions.update_one(
            {"_id": ObjectId(session_id)},
            {"$set": {"participants.$[elem].is_muted": True}},
            array_filters=[{"elem.user_id": target_user_id}]
        )
    elif action == "temp_ban":
        await db.sessions.update_one(
            {"_id": ObjectId(session_id)},
            {"$set": {
                "participants.$[elem].is_temp_banned": True,
                "participants.$[elem].temp_ban_until": (datetime.utcnow() + timedelta(minutes=5)).isoformat()
            }},
            array_filters=[{"elem.user_id": target_user_id}]
        )

    await manager.broadcast_to_session(session_id, "violation_issued", {
        "user_id": target_user_id,
        "type": violation_type,
        "action": action,
        "count": count,
        "threshold": threshold,
        "issued_by": moderator_id,
        "reason": reason,
        "timestamp": datetime.utcnow().isoformat()
    })


# ==================== ENHANCED SPEAKING TURN ====================

# Override the existing assign_speaking_turn to start the timer
# We need to remove the old handler and replace it
# Since Socket.IO doesn't support removing handlers, we'll modify the existing one

async def _assign_speaking_turn_with_timer(sid, data):
    """Assign speaking turn and start timer"""
    session_id = data.get("session_id")
    target_user_id = data.get("user_id")
    moderator_id = manager.active_connections.get(sid, {}).get("user_id")

    if not session_id or not moderator_id:
        return

    db = get_db()
    session = await db.sessions.find_one({"_id": ObjectId(session_id)})

    if not session:
        return

    moderator = next(
        (p for p in session.get("participants", []) if p["user_id"] == moderator_id),
        None
    )

    if not moderator or moderator["role"] not in [ParticipantRole.HOST, ParticipantRole.MODERATOR]:
        await sio.emit("error", {"message": "Not authorized"}, to=sid)
        return

    rules = session.get("rules", {})
    max_speaking_time = rules.get("max_speaking_time", 180)

    # End any existing timer
    await stop_timer(session_id)

    # Update current speaker
    await db.sessions.update_one(
        {"_id": ObjectId(session_id)},
        {
            "$set": {
                "current_speaker": target_user_id,
                "participants.$[elem].is_speaking": True,
                "participants.$[elem].is_muted": False,
                "participants.$[elem].speaking_time_remaining": max_speaking_time
            }
        },
        array_filters=[{"elem.user_id": target_user_id}]
    )

    # Mute all others
    await db.sessions.update_many(
        {"_id": ObjectId(session_id), "participants.user_id": {"$ne": target_user_id}},
        {"$set": {"participants.$[elem].is_speaking": False}},
        array_filters=[{"elem.user_id": {"$ne": target_user_id}}]
    )

    # Remove from queue
    await db.sessions.update_one(
        {"_id": ObjectId(session_id)},
        {"$pull": {"speaking_queue": target_user_id}}
    )

    await db.sessions.update_one(
        {"_id": ObjectId(session_id), "participants.user_id": target_user_id},
        {"$set": {"participants.$.has_raised_hand": False, "participants.$.hand_raised_at": None}}
    )

    # Start timer
    await start_timer(session_id, target_user_id, max_speaking_time)

    await manager.broadcast_to_session(session_id, "speaking_turn_assigned", {
        "user_id": target_user_id,
        "max_speaking_time": max_speaking_time,
        "assigned_by": moderator_id,
        "timestamp": datetime.utcnow().isoformat()
    })


# Override the assign_speaking_turn handler
sio.handlers['/']['assign_speaking_turn'] = _assign_speaking_turn_with_timer


async def _end_speaking_turn_with_timer(sid, data):
    """End speaking turn and stop timer"""
    session_id = data.get("session_id")
    user_id = manager.active_connections.get(sid, {}).get("user_id")

    if not session_id or not user_id:
        return

    db = get_db()
    session = await db.sessions.find_one({"_id": ObjectId(session_id)})

    if not session:
        return

    current_speaker = session.get("current_speaker")

    participant = next(
        (p for p in session.get("participants", []) if p["user_id"] == user_id),
        None
    )

    can_end = (
        user_id == current_speaker or
        (participant and participant["role"] in [ParticipantRole.HOST, ParticipantRole.MODERATOR])
    )

    if not can_end:
        return

    # Stop timer
    await stop_timer(session_id)

    # Track speaking time
    timer = session.get("timer", {})
    started_at = timer.get("started_at")
    if started_at and current_speaker:
        try:
            elapsed = int((datetime.utcnow() - datetime.fromisoformat(started_at)).total_seconds())
            await db.sessions.update_one(
                {"_id": ObjectId(session_id), "participants.user_id": current_speaker},
                {"$inc": {"participants.$.total_speaking_time": elapsed, "participants.$.speaking_turns": 1}}
            )
        except (ValueError, TypeError):
            pass

    # Reset current speaker
    await db.sessions.update_one(
        {"_id": ObjectId(session_id)},
        {
            "$set": {
                "current_speaker": None,
                "participants.$[elem].is_speaking": False,
                "participants.$[elem].is_muted": True,
                "participants.$[elem].speaking_time_remaining": 0
            }
        },
        array_filters=[{"elem.user_id": current_speaker}]
    )

    await manager.broadcast_to_session(session_id, "speaking_turn_ended", {
        "user_id": current_speaker,
        "ended_by": user_id,
        "timestamp": datetime.utcnow().isoformat()
    })

    # Check fairness
    await check_fairness(session_id)


# Override the end_speaking_turn handler
sio.handlers['/']['end_speaking_turn'] = _end_speaking_turn_with_timer
