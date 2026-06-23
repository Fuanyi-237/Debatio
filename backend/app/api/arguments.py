from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Depends
from bson import ObjectId

from app.core.database import get_db
from app.core.security import get_current_active_user
from app.models.argument import (
    ArgumentCreate,
    ArgumentResponse,
    ArgumentInDB,
    ArgumentType,
    Evidence
)
from app.models.session import SessionStatus, ParticipantRole

router = APIRouter()


@router.post("/", response_model=ArgumentResponse)
async def create_argument(
    argument_data: ArgumentCreate,
    current_user: dict = Depends(get_current_active_user)
):
    db = get_db()
    
    # Verify session exists and is live
    session = await db.sessions.find_one({"_id": ObjectId(argument_data.session_id)})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    if session["status"] != SessionStatus.LIVE:
        raise HTTPException(status_code=400, detail="Session not live")
    
    # Verify user is a participant
    user_id = str(current_user["_id"])
    participant = next(
        (p for p in session.get("participants", []) if p["user_id"] == user_id),
        None
    )
    
    if not participant:
        raise HTTPException(status_code=403, detail="Not a participant")
    
    if participant["role"] == ParticipantRole.OBSERVER:
        raise HTTPException(status_code=403, detail="Observers cannot submit arguments")
    
    # Calculate depth if replying to another argument
    depth = 0
    if argument_data.parent_id:
        parent = await db.arguments.find_one({"_id": ObjectId(argument_data.parent_id)})
        if parent:
            depth = parent.get("depth", 0) + 1
    
    argument_dict = {
        "_id": ObjectId(),
        **argument_data.dict(),
        "user_id": user_id,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
        "is_edited": False,
        "upvotes": 0,
        "downvotes": 0,
        "quality_score": 0.0,
        "children": [],
        "depth": depth
    }
    
    await db.arguments.insert_one(argument_dict)
    
    # Update parent with child reference
    if argument_data.parent_id:
        await db.arguments.update_one(
            {"_id": ObjectId(argument_data.parent_id)},
            {"$push": {"children": str(argument_dict["_id"])}}
        )
    
    # Add to session transcript
    await db.sessions.update_one(
        {"_id": ObjectId(argument_data.session_id)},
        {
            "$push": {
                "transcript": {
                    "type": "argument",
                    "argument_id": str(argument_dict["_id"]),
                    "user_id": user_id,
                    "timestamp": datetime.utcnow()
                }
            }
        }
    )
    
    # Get author info
    author = {
        "_id": str(current_user["_id"]),
        "username": current_user.get("username"),
        "full_name": current_user.get("full_name"),
        "avatar_url": current_user.get("avatar_url")
    }
    
    return ArgumentResponse(
        **argument_dict,
        _id=str(argument_dict["_id"]),
        author=author
    )


@router.get("/session/{session_id}", response_model=List[ArgumentResponse])
async def get_session_arguments(
    session_id: str,
    parent_id: Optional[str] = None,
    current_user: dict = Depends(get_current_active_user)
):
    db = get_db()
    
    query = {"session_id": session_id}
    if parent_id:
        query["parent_id"] = parent_id
    else:
        query["parent_id"] = None  # Root arguments
    
    cursor = db.arguments.find(query).sort("created_at", 1)
    arguments = await cursor.to_list(length=100)
    
    response_arguments = []
    for arg in arguments:
        # Get author info
        author = await db.users.find_one({"_id": ObjectId(arg["user_id"])})
        author_info = None
        if author:
            author_info = {
                "_id": str(author["_id"]),
                "username": author.get("username"),
                "full_name": author.get("full_name"),
                "avatar_url": author.get("avatar_url")
            }
        
        response_arguments.append(ArgumentResponse(
            **arg,
            _id=str(arg["_id"]),
            author=author_info
        ))
    
    return response_arguments


@router.get("/{argument_id}", response_model=ArgumentResponse)
async def get_argument(
    argument_id: str,
    current_user: dict = Depends(get_current_active_user)
):
    db = get_db()
    
    argument = await db.arguments.find_one({"_id": ObjectId(argument_id)})
    if not argument:
        raise HTTPException(status_code=404, detail="Argument not found")
    
    # Get author info
    author = await db.users.find_one({"_id": ObjectId(argument["user_id"])})
    author_info = None
    if author:
        author_info = {
            "_id": str(author["_id"]),
            "username": author.get("username"),
            "full_name": author.get("full_name"),
            "avatar_url": author.get("avatar_url")
        }
    
    return ArgumentResponse(
        **argument,
        _id=str(argument["_id"]),
        author=author_info
    )


@router.post("/{argument_id}/vote")
async def vote_argument(
    argument_id: str,
    vote_type: str,  # upvote, downvote
    current_user: dict = Depends(get_current_active_user)
):
    db = get_db()
    
    if vote_type not in ["upvote", "downvote"]:
        raise HTTPException(status_code=400, detail="Invalid vote type")
    
    argument = await db.arguments.find_one({"_id": ObjectId(argument_id)})
    if not argument:
        raise HTTPException(status_code=404, detail="Argument not found")
    
    # Check if user already voted
    existing_vote = await db.argument_votes.find_one({
        "argument_id": argument_id,
        "user_id": str(current_user["_id"])
    })
    
    if existing_vote:
        # Remove old vote effect
        old_vote_type = existing_vote["vote_type"]
        if old_vote_type == "upvote":
            await db.arguments.update_one(
                {"_id": ObjectId(argument_id)},
                {"$inc": {"upvotes": -1}}
            )
        else:
            await db.arguments.update_one(
                {"_id": ObjectId(argument_id)},
                {"$inc": {"downvotes": -1}}
            )
        
        # Update vote
        await db.argument_votes.update_one(
            {"_id": existing_vote["_id"]},
            {"$set": {"vote_type": vote_type, "voted_at": datetime.utcnow()}}
        )
    else:
        # Create new vote
        await db.argument_votes.insert_one({
            "argument_id": argument_id,
            "user_id": str(current_user["_id"]),
            "vote_type": vote_type,
            "voted_at": datetime.utcnow()
        })
    
    # Apply new vote
    if vote_type == "upvote":
        await db.arguments.update_one(
            {"_id": ObjectId(argument_id)},
            {"$inc": {"upvotes": 1}}
        )
    else:
        await db.arguments.update_one(
            {"_id": ObjectId(argument_id)},
            {"$inc": {"downvotes": 1}}
        )
    
    # Recalculate quality score
    updated = await db.arguments.find_one({"_id": ObjectId(argument_id)})
    upvotes = updated.get("upvotes", 0)
    downvotes = updated.get("downvotes", 0)
    total = upvotes + downvotes
    
    if total > 0:
        quality_score = (upvotes / total) * 100
        await db.arguments.update_one(
            {"_id": ObjectId(argument_id)},
            {"$set": {"quality_score": quality_score}}
        )
    
    return {"message": "Vote recorded"}


@router.delete("/{argument_id}")
async def delete_argument(
    argument_id: str,
    current_user: dict = Depends(get_current_active_user)
):
    db = get_db()
    
    argument = await db.arguments.find_one({"_id": ObjectId(argument_id)})
    if not argument:
        raise HTTPException(status_code=404, detail="Argument not found")
    
    # Only author or moderator can delete
    user_id = str(current_user["_id"])
    session = await db.sessions.find_one({"_id": ObjectId(argument["session_id"])})
    
    participant = next(
        (p for p in session.get("participants", []) if p["user_id"] == user_id),
        None
    )
    
    can_delete = (
        argument["user_id"] == user_id or
        (participant and participant["role"] in [ParticipantRole.MODERATOR, ParticipantRole.HOST])
    )
    
    if not can_delete:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Remove from parent's children if applicable
    if argument.get("parent_id"):
        await db.arguments.update_one(
            {"_id": ObjectId(argument["parent_id"])},
            {"$pull": {"children": argument_id}}
        )
    
    # Delete all child arguments recursively
    async def delete_children(parent_id):
        children = await db.arguments.find({"parent_id": parent_id}).to_list(length=100)
        for child in children:
            await db.arguments.delete_one({"_id": child["_id"]})
            await delete_children(str(child["_id"]))
    
    await delete_children(argument_id)
    
    await db.arguments.delete_one({"_id": ObjectId(argument_id)})
    
    return {"message": "Argument deleted"}
