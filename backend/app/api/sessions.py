import random
import string
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, HTTPException, status, Depends, Query
from pydantic import BaseModel
from bson import ObjectId

from app.core.database import get_db
from app.core.security import get_current_active_user
from app.models.session import (
    SessionCreate,
    SessionResponse,
    SessionDetail,
    SessionType,
    SessionStatus,
    SessionVisibility,
    SessionPhase,
    Participant,
    ParticipantRole,
    JoinRequest,
    JoinRequestAction,
    DebateRule,
    RoundTableRule,
    TimerState,
    FairnessReport,
    PhaseChangeRequest,
    QuestionCreate,
    QuestionVote,
    ReactionCreate,
    ViolationIssue,
    ViolationType,
    ViolationAction,
)

router = APIRouter()


def parse_object_id(value: str) -> ObjectId:
    if not ObjectId.is_valid(value):
        raise HTTPException(status_code=400, detail="Invalid session id")
    return ObjectId(value)


def generate_session_code(length: int = 8):
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=length))


class SessionCreateRequest(BaseModel):
    title: str
    description: Optional[str] = None
    topic: str
    tags: List[str] = []
    session_type: SessionType
    visibility: SessionVisibility = SessionVisibility.PUBLIC
    category: Optional[str] = None
    scheduled_start: Optional[datetime] = None
    rules: Optional[dict] = None


@router.post("/", response_model=SessionResponse, response_model_by_alias=False)
async def create_session(
    session_data: SessionCreateRequest,
    current_user: dict = Depends(get_current_active_user)
):
    db = get_db()
    
    # Generate default rules if not provided
    if not session_data.rules:
        if session_data.session_type == SessionType.DEBATE:
            session_data.rules = DebateRule(
                name="Standard Debate",
                description="3 rounds, 5 minutes per speaker",
                max_speaking_time=300,
                rounds=3,
                time_per_round=600
            ).dict()
        else:
            session_data.rules = RoundTableRule(
                name="Open Roundtable",
                description="Collaborative discussion with equal speaking time",
                max_speaking_time=180,
                consensus_threshold=0.66
            ).dict()
    
    session_dict = {
        "_id": ObjectId(),
        **session_data.dict(),
        "host_id": str(current_user["_id"]),
        "session_code": generate_session_code(),
        "status": SessionStatus.SCHEDULED,
        "phase": SessionPhase.LOBBY,
        "current_round": 0,
        "participants": [
            Participant(
                user_id=str(current_user["_id"]),
                role=ParticipantRole.HOST
            ).dict()
        ],
        "pending_requests": [],
        "current_speaker": None,
        "speaking_queue": [],
        "timer": TimerState().dict(),
        "questions": [],
        "reactions": [],
        "fairness": FairnessReport().dict(),
        "created_at": datetime.utcnow(),
        "started_at": None,
        "ended_at": None,
        "transcript": [],
        "consensus_reached": False,
        "consensus_statements": []
    }
    
    await db.sessions.insert_one(session_dict)
    
    session_response = {
        **session_dict,
        "_id": str(session_dict["_id"]),
        "participant_count": 1,
        "is_live": False
    }

    return SessionResponse(**session_response)


@router.get("/", response_model=List[SessionResponse], response_model_by_alias=False)
async def list_sessions(
    status: Optional[SessionStatus] = None,
    session_type: Optional[SessionType] = None,
    category: Optional[str] = None,
    visibility: Optional[SessionVisibility] = SessionVisibility.PUBLIC,
    search: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user: dict = Depends(get_current_active_user)
):
    db = get_db()

    query = {"visibility": visibility}

    if status:
        query["status"] = status
    if session_type:
        query["session_type"] = session_type
    if category:
        query["category"] = category
    if search:
        query["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"topic": {"$regex": search, "$options": "i"}},
            {"tags": {"$in": [search]}}
        ]

    cursor = db.sessions.find(query).sort("created_at", -1).skip(skip).limit(limit)
    sessions = await cursor.to_list(length=limit)

    response_sessions = []
    for session in sessions:
        session_dict = {
            **session,
            "_id": str(session["_id"]),
            "participant_count": len(session.get("participants", [])),
            "is_live": session.get("status") == SessionStatus.LIVE
        }
        response_sessions.append(SessionResponse(**session_dict))

    return response_sessions


@router.get("/my-sessions", response_model=List[SessionResponse], response_model_by_alias=False)
async def my_sessions(
    current_user: dict = Depends(get_current_active_user)
):
    db = get_db()
    user_id = str(current_user["_id"])
    
    cursor = db.sessions.find({
        "$or": [
            {"host_id": user_id},
            {"participants.user_id": user_id}
        ]
    }).sort("created_at", -1)
    
    sessions = await cursor.to_list(length=100)
    
    response_sessions = []
    for session in sessions:
        session_dict = {
            **session,
            "_id": str(session["_id"]),
            "participant_count": len(session.get("participants", [])),
            "is_live": session.get("status") == SessionStatus.LIVE
        }
        response_sessions.append(SessionResponse(**session_dict))
    
    return response_sessions


async def populate_participant_usernames(db, session: dict) -> dict:
    """Populate usernames for all participants in a session"""
    participants = session.get("participants", [])
    if not participants:
        return session

    # Get all user IDs from participants
    user_ids = [p["user_id"] for p in participants]

    # Fetch users from database
    users_cursor = db.users.find({"_id": {"$in": [ObjectId(uid) for uid in user_ids]}})
    users = await users_cursor.to_list(length=len(user_ids))

    # Create a mapping of user_id to username
    user_map = {str(u["_id"]): u.get("username", "Unknown") for u in users}

    # Add username to each participant
    for participant in participants:
        participant["username"] = user_map.get(participant["user_id"], "Unknown")

    session["participants"] = participants
    return session


@router.get("/{session_id}", response_model=SessionDetail, response_model_by_alias=False)
async def get_session(
    session_id: str,
    current_user: dict = Depends(get_current_active_user)
):
    db = get_db()

    oid = parse_object_id(session_id)
    session = await db.sessions.find_one({"_id": oid})

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Populate usernames for participants
    session = await populate_participant_usernames(db, session)

    # Also populate usernames in transcript
    transcript = session.get("transcript", [])
    if transcript:
        user_ids_in_transcript = list(set([entry.get("user_id") for entry in transcript if entry.get("user_id")]))
        if user_ids_in_transcript:
            users_cursor = db.users.find({"_id": {"$in": [ObjectId(uid) for uid in user_ids_in_transcript]}})
            users = await users_cursor.to_list(length=len(user_ids_in_transcript))
            user_map = {str(u["_id"]): u.get("username", "Unknown") for u in users}
            for entry in transcript:
                if entry.get("user_id") and not entry.get("username"):
                    entry["username"] = user_map.get(entry["user_id"], "Unknown")
        session["transcript"] = transcript

    session_dict = {
        **session,
        "_id": str(session["_id"]),
        "participant_count": len(session.get("participants", [])),
        "is_live": session.get("status") == SessionStatus.LIVE
    }

    return SessionDetail(**session_dict)


@router.post("/{session_id}/join")
async def request_join(
    session_id: str,
    requested_role: ParticipantRole = ParticipantRole.OBSERVER,
    message: Optional[str] = None,
    current_user: dict = Depends(get_current_active_user)
):
    db = get_db()
    
    oid = parse_object_id(session_id)
    session = await db.sessions.find_one({"_id": oid})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    user_id = str(current_user["_id"])
    
    # Check if already a participant
    existing = next(
        (p for p in session.get("participants", []) if p["user_id"] == user_id),
        None
    )
    if existing:
        raise HTTPException(status_code=400, detail="Already a participant")
    
    # Check if already pending
    pending = next(
        (r for r in session.get("pending_requests", []) if r["user_id"] == user_id),
        None
    )
    if pending:
        raise HTTPException(status_code=400, detail="Join request already pending")
    
    join_request = JoinRequest(
        user_id=user_id,
        requested_role=requested_role,
        message=message
    ).dict()
    
    await db.sessions.update_one(
        {"_id": oid},
        {"$push": {"pending_requests": join_request}}
    )
    
    return {"message": "Join request submitted"}


@router.post("/{session_id}/requests/{user_id}")
async def handle_join_request(
    session_id: str,
    user_id: str,
    action: JoinRequestAction,
    current_user: dict = Depends(get_current_active_user)
):
    db = get_db()
    
    oid = parse_object_id(session_id)
    session = await db.sessions.find_one({"_id": oid})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Verify current user is host or moderator
    current_user_id = str(current_user["_id"])
    participant = next(
        (p for p in session.get("participants", []) if p["user_id"] == current_user_id),
        None
    )
    
    if not participant or participant["role"] not in [ParticipantRole.HOST, ParticipantRole.MODERATOR]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Find and remove the pending request
    pending_request = next(
        (r for r in session.get("pending_requests", []) if r["user_id"] == user_id),
        None
    )
    
    if not pending_request:
        raise HTTPException(status_code=404, detail="Join request not found")
    
    await db.sessions.update_one(
        {"_id": oid},
        {"$pull": {"pending_requests": {"user_id": user_id}}}
    )
    
    if action.action == "approve":
        role = action.role or pending_request.get("requested_role", ParticipantRole.OBSERVER)
        new_participant = Participant(
            user_id=user_id,
            role=role
        ).dict()
        
        await db.sessions.update_one(
            {"_id": oid},
            {"$push": {"participants": new_participant}}
        )
        
        return {"message": "Join request approved"}
    else:
        return {"message": "Join request rejected"}


@router.post("/{session_id}/start")
async def start_session(
    session_id: str,
    current_user: dict = Depends(get_current_active_user)
):
    db = get_db()
    
    oid = parse_object_id(session_id)
    session = await db.sessions.find_one({"_id": oid})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Only host can start
    if session["host_id"] != str(current_user["_id"]):
        raise HTTPException(status_code=403, detail="Only host can start session")
    
    if session["status"] != SessionStatus.SCHEDULED:
        raise HTTPException(status_code=400, detail="Session already started or ended")
    
    await db.sessions.update_one(
        {"_id": oid},
        {
            "$set": {
                "status": SessionStatus.LIVE,
                "phase": SessionPhase.LOBBY,
                "started_at": datetime.utcnow()
            }
        }
    )

    return {"message": "Session started"}


@router.post("/{session_id}/end")
async def end_session(
    session_id: str,
    current_user: dict = Depends(get_current_active_user)
):
    db = get_db()

    oid = parse_object_id(session_id)
    
    session = await db.sessions.find_one({"_id": oid})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Only host can end
    if session["host_id"] != str(current_user["_id"]):
        raise HTTPException(status_code=403, detail="Only host can end session")
    
    if session["status"] != SessionStatus.LIVE:
        raise HTTPException(status_code=400, detail="Session not live")
    
    await db.sessions.update_one(
        {"_id": oid},
        {
            "$set": {
                "status": SessionStatus.ENDED,
                "ended_at": datetime.utcnow()
            }
        }
    )
    
    return {"message": "Session ended"}


@router.delete("/{session_id}")
async def delete_session(
    session_id: str,
    current_user: dict = Depends(get_current_active_user)
):
    db = get_db()
    oid = parse_object_id(session_id)
    session = await db.sessions.find_one({"_id": oid})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    if session["host_id"] != str(current_user["_id"]):
        raise HTTPException(status_code=403, detail="Only host can delete session")

    await db.sessions.delete_one({"_id": oid})
    return {"message": "Session deleted"}


@router.post("/{session_id}/leave")
async def leave_session(
    session_id: str,
    current_user: dict = Depends(get_current_active_user)
):
    db = get_db()
    user_id = str(current_user["_id"])
    
    oid = parse_object_id(session_id)
    session = await db.sessions.find_one({"_id": oid})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Cannot leave if host
    if session["host_id"] == user_id:
        raise HTTPException(status_code=400, detail="Host cannot leave session")
    
    await db.sessions.update_one(
        {"_id": oid},
        {"$pull": {"participants": {"user_id": user_id}}}
    )
    
    return {"message": "Left session"}


@router.post("/{session_id}/pause")
async def pause_session(
    session_id: str,
    current_user: dict = Depends(get_current_active_user)
):
    db = get_db()
    oid = parse_object_id(session_id)
    session = await db.sessions.find_one({"_id": oid})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    user_id = str(current_user["_id"])
    participant = next(
        (p for p in session.get("participants", []) if p["user_id"] == user_id),
        None
    )
    if not participant or participant["role"] not in [ParticipantRole.HOST, ParticipantRole.MODERATOR]:
        raise HTTPException(status_code=403, detail="Not authorized")

    if session["status"] != SessionStatus.LIVE:
        raise HTTPException(status_code=400, detail="Session not live")

    await db.sessions.update_one(
        {"_id": oid},
        {
            "$set": {
                "status": SessionStatus.PAUSED,
                "timer.is_running": False
            }
        }
    )

    return {"message": "Session paused"}


@router.post("/{session_id}/resume")
async def resume_session(
    session_id: str,
    current_user: dict = Depends(get_current_active_user)
):
    db = get_db()
    oid = parse_object_id(session_id)
    session = await db.sessions.find_one({"_id": oid})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    user_id = str(current_user["_id"])
    participant = next(
        (p for p in session.get("participants", []) if p["user_id"] == user_id),
        None
    )
    if not participant or participant["role"] not in [ParticipantRole.HOST, ParticipantRole.MODERATOR]:
        raise HTTPException(status_code=403, detail="Not authorized")

    if session["status"] != SessionStatus.PAUSED:
        raise HTTPException(status_code=400, detail="Session not paused")

    await db.sessions.update_one(
        {"_id": oid},
        {
            "$set": {
                "status": SessionStatus.LIVE,
                "timer.is_running": True
            }
        }
    )

    return {"message": "Session resumed"}


@router.post("/{session_id}/phase")
async def change_phase(
    session_id: str,
    phase_data: PhaseChangeRequest,
    current_user: dict = Depends(get_current_active_user)
):
    db = get_db()
    oid = parse_object_id(session_id)
    session = await db.sessions.find_one({"_id": oid})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    user_id = str(current_user["_id"])
    participant = next(
        (p for p in session.get("participants", []) if p["user_id"] == user_id),
        None
    )
    if not participant or participant["role"] not in [ParticipantRole.HOST, ParticipantRole.MODERATOR]:
        raise HTTPException(status_code=403, detail="Not authorized")

    update_fields = {"phase": phase_data.phase}

    if phase_data.phase == SessionPhase.OPENING:
        update_fields["current_round"] = 1
    elif phase_data.phase == SessionPhase.ARGUMENT:
        update_fields["current_round"] = session.get("current_round", 0) + 1

    await db.sessions.update_one(
        {"_id": oid},
        {"$set": update_fields}
    )

    return {"message": f"Phase changed to {phase_data.phase}", "phase": phase_data.phase}


@router.get("/{session_id}/questions")
async def get_questions(
    session_id: str,
    current_user: dict = Depends(get_current_active_user)
):
    db = get_db()
    oid = parse_object_id(session_id)
    session = await db.sessions.find_one({"_id": oid})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    questions = session.get("questions", [])
    return sorted(questions, key=lambda q: q.get("upvotes", 0), reverse=True)


@router.post("/{session_id}/questions")
async def create_question(
    session_id: str,
    question_data: QuestionCreate,
    current_user: dict = Depends(get_current_active_user)
):
    db = get_db()
    oid = parse_object_id(session_id)
    session = await db.sessions.find_one({"_id": oid})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    user_id = str(current_user["_id"])
    from app.models.session import Question
    question = Question(
        text=question_data.text,
        asked_by=user_id,
        asked_by_username=current_user.get("username")
    ).dict()

    await db.sessions.update_one(
        {"_id": oid},
        {"$push": {"questions": question}}
    )

    return {"message": "Question submitted", "question_id": question["id"]}


@router.post("/{session_id}/questions/{question_id}/vote")
async def vote_question(
    session_id: str,
    question_id: str,
    vote_data: QuestionVote,
    current_user: dict = Depends(get_current_active_user)
):
    db = get_db()
    oid = parse_object_id(session_id)
    session = await db.sessions.find_one({"_id": oid})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    user_id = str(current_user["_id"])
    questions = session.get("questions", [])
    question = next((q for q in questions if q["id"] == question_id), None)
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")

    if user_id in question.get("upvoted_by", []):
        raise HTTPException(status_code=400, detail="Already voted")

    question["upvotes"] = question.get("upvotes", 0) + vote_data.vote
    question.setdefault("upvoted_by", []).append(user_id)

    await db.sessions.update_one(
        {"_id": oid, "questions.id": question_id},
        {"$set": {"questions.$": question}}
    )

    return {"message": "Vote recorded"}


@router.post("/{session_id}/questions/{question_id}/answer")
async def answer_question(
    session_id: str,
    question_id: str,
    current_user: dict = Depends(get_current_active_user)
):
    db = get_db()
    oid = parse_object_id(session_id)
    session = await db.sessions.find_one({"_id": oid})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    user_id = str(current_user["_id"])
    await db.sessions.update_one(
        {"_id": oid, "questions.id": question_id},
        {"$set": {"questions.$.is_answered": True, "questions.$.answered_by": user_id}}
    )

    return {"message": "Question marked as answered"}


@router.post("/{session_id}/reactions")
async def create_reaction(
    session_id: str,
    reaction_data: ReactionCreate,
    current_user: dict = Depends(get_current_active_user)
):
    db = get_db()
    oid = parse_object_id(session_id)
    session = await db.sessions.find_one({"_id": oid})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    user_id = str(current_user["_id"])
    from app.models.session import Reaction
    reaction = Reaction(
        type=reaction_data.type,
        user_id=user_id,
        username=current_user.get("username")
    ).dict()

    await db.sessions.update_one(
        {"_id": oid},
        {"$push": {"reactions": reaction}}
    )

    return {"message": "Reaction recorded"}


@router.get("/{session_id}/fairness")
async def get_fairness_report(
    session_id: str,
    current_user: dict = Depends(get_current_active_user)
):
    db = get_db()
    oid = parse_object_id(session_id)
    session = await db.sessions.find_one({"_id": oid})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    participants = session.get("participants", [])
    participant_times = {}
    total_time = 0
    dominant = []
    underrepresented = []

    for p in participants:
        t = p.get("total_speaking_time", 0)
        participant_times[p["user_id"]] = t
        total_time += t

    if total_time > 0 and len(participants) > 1:
        avg_time = total_time / len(participants)
        for p in participants:
            t = participant_times.get(p["user_id"], 0)
            if t > avg_time * 1.5:
                dominant.append(p["user_id"])
            elif t < avg_time * 0.5 and p.get("role") != ParticipantRole.OBSERVER:
                underrepresented.append(p["user_id"])

        max_deviation = 0
        for t in participant_times.values():
            deviation = abs(t - avg_time) / max(avg_time, 1)
            max_deviation = max(max_deviation, deviation)

        fairness_score = max(0, 100 - (max_deviation * 50))
    else:
        fairness_score = 100.0

    report = {
        "total_speaking_time": total_time,
        "participant_times": participant_times,
        "dominant_speakers": dominant,
        "underrepresented_speakers": underrepresented,
        "fairness_score": fairness_score
    }

    await db.sessions.update_one(
        {"_id": oid},
        {"$set": {"fairness": report}}
    )

    return report


@router.get("/{session_id}/replay")
async def get_session_replay(
    session_id: str,
    current_user: dict = Depends(get_current_active_user)
):
    """Get session timeline for replay with indexed discussion"""
    db = get_db()
    oid = parse_object_id(session_id)
    session = await db.sessions.find_one({"_id": oid})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Build timeline from transcript and arguments
    timeline = []

    # Add transcript entries
    for entry in session.get("transcript", []):
        timeline.append({
            "type": entry.get("type", "chat"),
            "timestamp": entry.get("timestamp"),
            "user_id": entry.get("user_id"),
            "username": entry.get("username"),
            "data": entry.get("message") if entry.get("type") == "chat" else entry,
            "phase": entry.get("phase", session.get("phase"))
        })

    # Add argument submissions
    arguments_cursor = db.arguments.find({"session_id": session_id})
    arguments = await arguments_cursor.to_list(length=1000)
    for arg in arguments:
        timeline.append({
            "type": "argument",
            "timestamp": arg.get("created_at"),
            "user_id": arg.get("user_id"),
            "username": arg.get("author", {}).get("username") if arg.get("author") else None,
            "data": {
                "id": str(arg.get("_id")),
                "content": arg.get("content"),
                "type": arg.get("type"),
                "evidence": arg.get("evidence", []),
                "quality_score": arg.get("quality_score", 0)
            },
            "phase": arg.get("phase", "argument")
        })

    # Add phase changes from timer events
    for entry in session.get("timer", {}).get("events", []):
        if entry.get("type") in ["phase_changed", "timer_expired", "speaking_turn_assigned", "speaking_turn_ended"]:
            timeline.append({
                "type": entry.get("type"),
                "timestamp": entry.get("timestamp"),
                "user_id": entry.get("user_id"),
                "data": entry,
                "phase": entry.get("phase")
            })

    # Sort by timestamp
    timeline.sort(key=lambda x: x.get("timestamp") or datetime.min)

    # Build indexed speakers
    speakers = {}
    for entry in timeline:
        uid = entry.get("user_id")
        if uid and uid not in speakers:
            speakers[uid] = {
                "user_id": uid,
                "username": entry.get("username"),
                "first_speaking_time": entry.get("timestamp"),
                "entry_count": 0
            }
        if uid:
            speakers[uid]["entry_count"] += 1
            speakers[uid]["last_speaking_time"] = entry.get("timestamp")

    # Build key moments (phase changes, consensus reached, violations)
    key_moments = []
    current_phase = None
    for entry in timeline:
        if entry.get("phase") != current_phase:
            key_moments.append({
                "timestamp": entry.get("timestamp"),
                "type": "phase_change",
                "description": f"Phase changed to {entry.get('phase')}"
            })
            current_phase = entry.get("phase")

    return {
        "session_id": session_id,
        "title": session.get("title"),
        "topic": session.get("topic"),
        "session_type": session.get("session_type"),
        "started_at": session.get("started_at"),
        "ended_at": session.get("ended_at"),
        "timeline": timeline,
        "speakers": list(speakers.values()),
        "key_moments": key_moments,
        "total_entries": len(timeline),
        "duration_minutes": (
            (session.get("ended_at") - session.get("started_at")).total_seconds() / 60
            if session.get("ended_at") and session.get("started_at")
            else None
        )
    }


@router.get("/{session_id}/summary")
async def get_session_summary(
    session_id: str,
    current_user: dict = Depends(get_current_active_user)
):
    """Get AI-assisted session summary with key points and consensus"""
    db = get_db()
    oid = parse_object_id(session_id)
    session = await db.sessions.find_one({"_id": oid})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Get all arguments
    arguments_cursor = db.arguments.find({"session_id": session_id})
    arguments = await arguments_cursor.to_list(length=1000)

    # Calculate key metrics
    total_arguments = len(arguments)
    arguments_by_type = {}
    for arg in arguments:
        arg_type = arg.get("type", "unknown")
        arguments_by_type[arg_type] = arguments_by_type.get(arg_type, 0) + 1

    # Top arguments by quality score
    top_arguments = sorted(
        [arg for arg in arguments if arg.get("quality_score", 0) > 0],
        key=lambda x: x.get("quality_score", 0),
        reverse=True
    )[:5]

    # Get consensus statements
    consensus_statements = session.get("consensus_statements", [])
    accepted_statements = [s for s in consensus_statements if s.get("is_accepted")]

    # Calculate speaking time distribution
    participants = session.get("participants", [])
    speaking_times = [
        {
            "user_id": p.get("user_id"),
            "username": p.get("username"),
            "total_speaking_time": p.get("total_speaking_time", 0),
            "speaking_turns": p.get("speaking_turns", 0)
        }
        for p in participants
        if p.get("total_speaking_time", 0) > 0
    ]
    speaking_times.sort(key=lambda x: x["total_speaking_time"], reverse=True)

    # Key topics (from tags and extracted from arguments)
    key_topics = list(set(session.get("tags", [])))

    return {
        "session_id": session_id,
        "title": session.get("title"),
        "topic": session.get("topic"),
        "summary": {
            "total_arguments": total_arguments,
            "arguments_by_type": arguments_by_type,
            "total_participants": len(participants),
            "active_participants": len([p for p in participants if p.get("total_speaking_time", 0) > 0]),
            "consensus_reached": len(accepted_statements) > 0,
            "accepted_statements_count": len(accepted_statements)
        },
        "top_arguments": [
            {
                "id": str(arg.get("_id")),
                "content": arg.get("content")[:200] + "..." if len(arg.get("content", "")) > 200 else arg.get("content"),
                "type": arg.get("type"),
                "quality_score": arg.get("quality_score", 0),
                "upvotes": arg.get("upvotes", 0)
            }
            for arg in top_arguments
        ],
        "accepted_statements": [
            {
                "statement": s.get("statement"),
                "agreement_percentage": s.get("agreement_percentage", 0)
            }
            for s in accepted_statements[:5]
        ],
        "speaking_distribution": speaking_times[:5],
        "key_topics": key_topics,
        "fairness_score": session.get("fairness", {}).get("fairness_score", 100),
        "duration_minutes": (
            (session.get("ended_at") - session.get("started_at")).total_seconds() / 60
            if session.get("ended_at") and session.get("started_at")
            else None
        )
    }


@router.post("/{session_id}/violations")
async def issue_violation(
    session_id: str,
    violation_data: ViolationIssue,
    current_user: dict = Depends(get_current_active_user)
):
    db = get_db()
    oid = parse_object_id(session_id)
    session = await db.sessions.find_one({"_id": oid})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    user_id = str(current_user["_id"])
    issuer = next(
        (p for p in session.get("participants", []) if p["user_id"] == user_id),
        None
    )
    if not issuer or issuer["role"] not in [ParticipantRole.HOST, ParticipantRole.MODERATOR]:
        raise HTTPException(status_code=403, detail="Not authorized")

    target = next(
        (p for p in session.get("participants", []) if p["user_id"] == violation_data.user_id),
        None
    )
    if not target:
        raise HTTPException(status_code=404, detail="Participant not found")

    rules = session.get("rules", {})
    thresholds = rules.get("violation_thresholds", {})
    violation_type = violation_data.type.value

    existing_violations = [v for v in target.get("violations", []) if v.get("type") == violation_type]
    count = len(existing_violations) + 1

    threshold = thresholds.get(violation_type, 3)

    if count >= threshold + 1:
        action = ViolationAction.TEMP_BAN
    elif count >= threshold:
        action = ViolationAction.MUTE
    else:
        action = ViolationAction.WARNING

    from app.models.session import Violation
    violation = Violation(
        type=violation_data.type,
        action=action,
        issued_by=user_id,
        reason=violation_data.reason
    ).dict()

    update_fields = {
        f"participants.$[elem].violations": violation
    }

    if action == ViolationAction.MUTE:
        update_fields["participants.$[elem].is_muted"] = True
    elif action == ViolationAction.TEMP_BAN:
        from datetime import timedelta
        update_fields["participants.$[elem].is_temp_banned"] = True
        update_fields["participants.$[elem].temp_ban_until"] = datetime.utcnow() + timedelta(minutes=5)

    await db.sessions.update_one(
        {"_id": oid},
        {"$push": update_fields},
        array_filters=[{"elem.user_id": violation_data.user_id}]
    )

    if action in [ViolationAction.MUTE, ViolationAction.TEMP_BAN]:
        set_fields = {}
        if action == ViolationAction.MUTE:
            set_fields["participants.$[elem].is_muted"] = True
        if action == ViolationAction.TEMP_BAN:
            from datetime import timedelta
            set_fields["participants.$[elem].is_temp_banned"] = True
            set_fields["participants.$[elem].temp_ban_until"] = datetime.utcnow() + timedelta(minutes=5)
        if set_fields:
            await db.sessions.update_one(
                {"_id": oid},
                {"$set": set_fields},
                array_filters=[{"elem.user_id": violation_data.user_id}]
            )

    return {
        "message": "Violation recorded",
        "action": action.value,
        "violation_count": count,
        "threshold": threshold
    }


# ==================== RECORDING ENDPOINTS ====================

@router.post("/{session_id}/recordings/start")
async def start_recording(
    session_id: str,
    recording_data: dict,
    current_user: dict = Depends(get_current_active_user)
):
    """Start recording a session"""
    db = get_db()
    oid = parse_object_id(session_id)
    session = await db.sessions.find_one({"_id": oid})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    user_id = str(current_user["_id"])
    participant = next(
        (p for p in session.get("participants", []) if p["user_id"] == user_id),
        None
    )
    if not participant or participant["role"] not in [ParticipantRole.HOST, ParticipantRole.MODERATOR]:
        raise HTTPException(status_code=403, detail="Not authorized")

    from app.models.session import Recording, RecordingStatus
    recording = Recording(
        session_id=session_id,
        recorded_by=user_id,
        include_audio=recording_data.get("include_audio", True),
        include_video=recording_data.get("include_video", True),
        include_screen=recording_data.get("include_screen", False),
        status=RecordingStatus.RECORDING
    )

    result = await db.recordings.insert_one(recording.dict())

    await db.sessions.update_one(
        {"_id": oid},
        {"$set": {"recording_id": str(result.inserted_id), "is_recording": True}}
    )

    return {"recording_id": str(result.inserted_id), "status": "recording", "started_at": datetime.utcnow()}


@router.post("/{session_id}/recordings/{recording_id}/stop")
async def stop_recording(
    session_id: str,
    recording_id: str,
    current_user: dict = Depends(get_current_active_user)
):
    """Stop a recording"""
    db = get_db()
    oid = parse_object_id(session_id)
    session = await db.sessions.find_one({"_id": oid})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    user_id = str(current_user["_id"])
    participant = next(
        (p for p in session.get("participants", []) if p["user_id"] == user_id),
        None
    )
    if not participant or participant["role"] not in [ParticipantRole.HOST, ParticipantRole.MODERATOR]:
        raise HTTPException(status_code=403, detail="Not authorized")

    recording = await db.recordings.find_one({"_id": ObjectId(recording_id)})
    if not recording:
        raise HTTPException(status_code=404, detail="Recording not found")

    from app.models.session import RecordingStatus
    duration = (datetime.utcnow() - recording.get("started_at", datetime.utcnow())).total_seconds()

    await db.recordings.update_one(
        {"_id": ObjectId(recording_id)},
        {"$set": {
            "status": RecordingStatus.COMPLETED,
            "ended_at": datetime.utcnow(),
            "duration_seconds": int(duration)
        }}
    )

    await db.sessions.update_one(
        {"_id": oid},
        {"$unset": {"recording_id": "", "is_recording": ""}}
    )

    return {"recording_id": recording_id, "status": "completed", "duration_seconds": int(duration)}


@router.get("/{session_id}/recordings")
async def get_session_recordings(
    session_id: str,
    current_user: dict = Depends(get_current_active_user)
):
    """Get all recordings for a session"""
    db = get_db()
    oid = parse_object_id(session_id)
    session = await db.sessions.find_one({"_id": oid})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    recordings = await db.recordings.find({"session_id": session_id}).to_list(length=100)
    return [{**r, "_id": str(r["_id"])} for r in recordings]


# ==================== NOTES ENDPOINTS ====================

@router.post("/{session_id}/notes")
async def create_note(
    session_id: str,
    note_data: dict,
    current_user: dict = Depends(get_current_active_user)
):
    """Create a personal note for a session"""
    db = get_db()
    oid = parse_object_id(session_id)
    session = await db.sessions.find_one({"_id": oid})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    user_id = str(current_user["_id"])

    from app.models.session import Note
    note = Note(
        session_id=session_id,
        user_id=user_id,
        content=note_data.get("content", ""),
        is_private=note_data.get("is_private", True)
    )

    result = await db.notes.insert_one(note.dict())
    return {"note_id": str(result.inserted_id), "message": "Note created"}


@router.get("/{session_id}/notes")
async def get_session_notes(
    session_id: str,
    current_user: dict = Depends(get_current_active_user)
):
    """Get all notes for current user in a session"""
    db = get_db()
    oid = parse_object_id(session_id)
    session = await db.sessions.find_one({"_id": oid})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    user_id = str(current_user["_id"])
    notes = await db.notes.find({
        "session_id": session_id,
        "user_id": user_id
    }).sort("created_at", -1).to_list(length=100)

    return [{**n, "_id": str(n["_id"])} for n in notes]


@router.put("/{session_id}/notes/{note_id}")
async def update_note(
    session_id: str,
    note_id: str,
    note_data: dict,
    current_user: dict = Depends(get_current_active_user)
):
    """Update a note"""
    db = get_db()
    user_id = str(current_user["_id"])

    note = await db.notes.find_one({"_id": ObjectId(note_id), "user_id": user_id})
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")

    update_fields = {}
    if "content" in note_data:
        update_fields["content"] = note_data["content"]
    if "is_private" in note_data:
        update_fields["is_private"] = note_data["is_private"]
    update_fields["updated_at"] = datetime.utcnow()

    await db.notes.update_one(
        {"_id": ObjectId(note_id)},
        {"$set": update_fields}
    )

    return {"message": "Note updated"}


@router.delete("/{session_id}/notes/{note_id}")
async def delete_note(
    session_id: str,
    note_id: str,
    current_user: dict = Depends(get_current_active_user)
):
    """Delete a note"""
    db = get_db()
    user_id = str(current_user["_id"])

    note = await db.notes.find_one({"_id": ObjectId(note_id), "user_id": user_id})
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")

    await db.notes.delete_one({"_id": ObjectId(note_id)})
    return {"message": "Note deleted"}


# ==================== WAITING ROOM ENDPOINTS ====================

@router.post("/{session_id}/waiting-room/join")
async def join_waiting_room(
    session_id: str,
    data: dict,
    current_user: dict = Depends(get_current_active_user)
):
    """Join the waiting room for a session"""
    db = get_db()
    oid = parse_object_id(session_id)
    session = await db.sessions.find_one({"_id": oid})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    user_id = str(current_user["_id"])
    username = current_user.get("username", "Unknown")

    from app.models.session import WaitingRoomEntry, WaitingRoomStatus
    entry = WaitingRoomEntry(
        session_id=session_id,
        user_id=user_id,
        username=username,
        message=data.get("message"),
        device_info=data.get("device_info")
    )

    existing = await db.waiting_room.find_one({
        "session_id": session_id,
        "user_id": user_id,
        "status": {"$in": [WaitingRoomStatus.WAITING, WaitingRoomStatus.APPROVED]}
    })
    if existing:
        return {
            "entry_id": str(existing["_id"]),
            "status": existing.get("status"),
            "message": "Waiting room request already exists"
        }

    result = await db.waiting_room.insert_one(entry.dict())

    return {
        "entry_id": str(result.inserted_id),
        "status": "waiting",
        "message": "Waiting for host approval"
    }


@router.get("/{session_id}/waiting-room")
async def get_waiting_room(
    session_id: str,
    current_user: dict = Depends(get_current_active_user)
):
    """Get waiting room entries (host/moderator only)"""
    db = get_db()
    oid = parse_object_id(session_id)
    session = await db.sessions.find_one({"_id": oid})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    user_id = str(current_user["_id"])
    participant = next(
        (p for p in session.get("participants", []) if p["user_id"] == user_id),
        None
    )
    if not participant or participant["role"] not in [ParticipantRole.HOST, ParticipantRole.MODERATOR]:
        raise HTTPException(status_code=403, detail="Not authorized")

    from app.models.session import WaitingRoomStatus
    entries = await db.waiting_room.find({
        "session_id": session_id,
        "status": WaitingRoomStatus.WAITING
    }).sort("requested_at", 1).to_list(length=100)

    return [{**e, "_id": str(e["_id"])} for e in entries]


@router.post("/{session_id}/waiting-room/{entry_id}/approve")
async def approve_waiting_room(
    session_id: str,
    entry_id: str,
    data: dict,
    current_user: dict = Depends(get_current_active_user)
):
    """Approve a waiting room entry"""
    db = get_db()
    oid = parse_object_id(session_id)
    session = await db.sessions.find_one({"_id": oid})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    user_id = str(current_user["_id"])
    participant = next(
        (p for p in session.get("participants", []) if p["user_id"] == user_id),
        None
    )
    if not participant or participant["role"] not in [ParticipantRole.HOST, ParticipantRole.MODERATOR]:
        raise HTTPException(status_code=403, detail="Not authorized")

    from app.models.session import WaitingRoomStatus
    entry = await db.waiting_room.find_one({"_id": ObjectId(entry_id)})
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")

    await db.waiting_room.update_one(
        {"_id": ObjectId(entry_id)},
        {"$set": {
            "status": WaitingRoomStatus.APPROVED,
            "approved_role": data.get("role", "observer"),
            "approved_by": user_id,
            "approved_at": datetime.utcnow()
        }}
    )

    return {"message": "User approved"}


@router.post("/{session_id}/waiting-room/{entry_id}/reject")
async def reject_waiting_room(
    session_id: str,
    entry_id: str,
    current_user: dict = Depends(get_current_active_user)
):
    """Reject a waiting room entry"""
    db = get_db()
    oid = parse_object_id(session_id)
    session = await db.sessions.find_one({"_id": oid})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    user_id = str(current_user["_id"])
    participant = next(
        (p for p in session.get("participants", []) if p["user_id"] == user_id),
        None
    )
    if not participant or participant["role"] not in [ParticipantRole.HOST, ParticipantRole.MODERATOR]:
        raise HTTPException(status_code=403, detail="Not authorized")

    from app.models.session import WaitingRoomStatus
    await db.waiting_room.update_one(
        {"_id": ObjectId(entry_id)},
        {"$set": {
            "status": WaitingRoomStatus.REJECTED,
            "approved_by": user_id,
            "approved_at": datetime.utcnow()
        }}
    )

    return {"message": "User rejected"}


# ==================== BREAKOUT ROOMS ENDPOINTS ====================

@router.post("/{session_id}/breakout-rooms")
async def create_breakout_room(
    session_id: str,
    data: dict,
    current_user: dict = Depends(get_current_active_user)
):
    """Create a breakout room"""
    db = get_db()
    oid = parse_object_id(session_id)
    session = await db.sessions.find_one({"_id": oid})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    user_id = str(current_user["_id"])
    participant = next(
        (p for p in session.get("participants", []) if p["user_id"] == user_id),
        None
    )
    if not participant or participant["role"] not in [ParticipantRole.HOST, ParticipantRole.MODERATOR]:
        raise HTTPException(status_code=403, detail="Not authorized")

    from app.models.session import BreakoutRoom
    breakout = BreakoutRoom(
        session_id=session_id,
        name=data.get("name", "Breakout Room"),
        topic=data.get("topic", "Discussion"),
        participants=data.get("participant_ids", []),
        duration_minutes=data.get("duration_minutes", 15),
        created_by=user_id
    )

    result = await db.breakout_rooms.insert_one(breakout.dict())
    return {"breakout_room_id": str(result.inserted_id), "message": "Breakout room created"}


@router.get("/{session_id}/breakout-rooms")
async def get_breakout_rooms(
    session_id: str,
    current_user: dict = Depends(get_current_active_user)
):
    """Get all breakout rooms for a session"""
    db = get_db()
    oid = parse_object_id(session_id)
    session = await db.sessions.find_one({"_id": oid})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    breakout_rooms = await db.breakout_rooms.find({
        "session_id": session_id,
        "is_active": True
    }).to_list(length=50)

    return [{**b, "_id": str(b["_id"])} for b in breakout_rooms]


@router.post("/{session_id}/breakout-rooms/{breakout_id}/join")
async def join_breakout_room(
    session_id: str,
    breakout_id: str,
    current_user: dict = Depends(get_current_active_user)
):
    """Join a breakout room"""
    db = get_db()
    user_id = str(current_user["_id"])

    breakout = await db.breakout_rooms.find_one({"_id": ObjectId(breakout_id)})
    if not breakout:
        raise HTTPException(status_code=404, detail="Breakout room not found")

    if user_id not in breakout.get("participants", []):
        await db.breakout_rooms.update_one(
            {"_id": ObjectId(breakout_id)},
            {"$push": {"participants": user_id}}
        )

    return {"message": "Joined breakout room"}


@router.post("/{session_id}/breakout-rooms/{breakout_id}/end")
async def end_breakout_room(
    session_id: str,
    breakout_id: str,
    current_user: dict = Depends(get_current_active_user)
):
    """End a breakout room"""
    db = get_db()
    oid = parse_object_id(session_id)
    session = await db.sessions.find_one({"_id": oid})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    user_id = str(current_user["_id"])
    participant = next(
        (p for p in session.get("participants", []) if p["user_id"] == user_id),
        None
    )
    if not participant or participant["role"] not in [ParticipantRole.HOST, ParticipantRole.MODERATOR]:
        raise HTTPException(status_code=403, detail="Not authorized")

    await db.breakout_rooms.update_one(
        {"_id": ObjectId(breakout_id)},
        {"$set": {"is_active": False, "ended_at": datetime.utcnow()}}
    )

    return {"message": "Breakout room ended"}
