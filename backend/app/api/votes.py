from datetime import datetime
from typing import List
from fastapi import APIRouter, HTTPException, Depends
from bson import ObjectId

from app.core.database import get_db
from app.core.security import get_current_active_user
from app.models.vote import (
    ConsensusStatement,
    ConsensusVote,
    StatementCreate,
    StatementVote,
    VoteType
)
from app.models.session import SessionStatus, ParticipantRole

router = APIRouter()


@router.post("/sessions/{session_id}/statements")
async def create_statement(
    session_id: str,
    statement_data: StatementCreate,
    current_user: dict = Depends(get_current_active_user)
):
    db = get_db()
    
    session = await db.sessions.find_one({"_id": ObjectId(session_id)})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    if session["status"] != SessionStatus.LIVE:
        raise HTTPException(status_code=400, detail="Session not live")
    
    user_id = str(current_user["_id"])
    participant = next(
        (p for p in session.get("participants", []) if p["user_id"] == user_id),
        None
    )
    
    if not participant or participant["role"] == ParticipantRole.OBSERVER:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    statement = ConsensusStatement(
        statement=statement_data.statement,
        proposed_by=user_id
    ).dict()
    
    await db.sessions.update_one(
        {"_id": ObjectId(session_id)},
        {"$push": {"consensus_statements": statement}}
    )
    
    return {"message": "Statement proposed", "statement_id": statement["id"]}


@router.post("/sessions/{session_id}/statements/{statement_id}/vote")
async def vote_statement(
    session_id: str,
    statement_id: str,
    vote_data: StatementVote,
    current_user: dict = Depends(get_current_active_user)
):
    db = get_db()
    
    session = await db.sessions.find_one({"_id": ObjectId(session_id)})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    if session["status"] != SessionStatus.LIVE:
        raise HTTPException(status_code=400, detail="Session not live")
    
    user_id = str(current_user["_id"])
    participant = next(
        (p for p in session.get("participants", []) if p["user_id"] == user_id),
        None
    )
    
    if not participant:
        raise HTTPException(status_code=403, detail="Not a participant")
    
    # Find the statement
    statements = session.get("consensus_statements", [])
    statement = next((s for s in statements if s["id"] == statement_id), None)
    
    if not statement:
        raise HTTPException(status_code=404, detail="Statement not found")
    
    # Update vote
    statement["votes"][user_id] = vote_data.vote.value
    
    # Recalculate agreement percentage
    votes = list(statement["votes"].values())
    total_votes = len(votes)
    
    if total_votes > 0:
        agree_count = votes.count(VoteType.AGREE.value)
        statement["agreement_percentage"] = (agree_count / total_votes) * 100
        
        # Check for consensus (66% agreement)
        if statement["agreement_percentage"] >= 66 and not statement["is_accepted"]:
            statement["is_accepted"] = True
            statement["accepted_at"] = datetime.utcnow()
    
    # Update session
    await db.sessions.update_one(
        {
            "_id": ObjectId(session_id),
            "consensus_statements.id": statement_id
        },
        {"$set": {"consensus_statements.$": statement}}
    )
    
    return {
        "message": "Vote recorded",
        "agreement_percentage": statement["agreement_percentage"],
        "is_accepted": statement["is_accepted"]
    }


@router.get("/sessions/{session_id}/statements")
async def get_statements(
    session_id: str,
    current_user: dict = Depends(get_current_active_user)
):
    db = get_db()
    
    session = await db.sessions.find_one({"_id": ObjectId(session_id)})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    return session.get("consensus_statements", [])


@router.get("/sessions/{session_id}/consensus-report")
async def get_consensus_report(
    session_id: str,
    current_user: dict = Depends(get_current_active_user)
):
    db = get_db()
    
    session = await db.sessions.find_one({"_id": ObjectId(session_id)})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    statements = session.get("consensus_statements", [])
    
    accepted = [s for s in statements if s["is_accepted"]]
    pending = [s for s in statements if not s["is_accepted"]]
    
    participant_count = len(session.get("participants", []))
    total_votes_cast = sum(len(s["votes"]) for s in statements)
    avg_participation = total_votes_cast / len(statements) if statements else 0
    
    return {
        "session_id": session_id,
        "participant_count": participant_count,
        "total_statements": len(statements),
        "accepted_statements": len(accepted),
        "pending_statements": len(pending),
        "average_participation": avg_participation,
        "accepted": accepted,
        "pending": pending,
        "overall_consensus_reached": session.get("consensus_reached", False)
    }
