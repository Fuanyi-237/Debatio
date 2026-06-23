from datetime import datetime
from typing import Optional, List
from enum import Enum
from pydantic import BaseModel, Field
from bson import ObjectId

from app.models.user import PyObjectId


class VoteType(str, Enum):
    AGREE = "agree"
    DISAGREE = "disagree"
    UNSURE = "unsure"


class ConsensusStatement(BaseModel):
    id: str = Field(default_factory=lambda: str(ObjectId()))
    statement: str
    proposed_by: str
    proposed_at: datetime = Field(default_factory=datetime.utcnow)
    votes: dict = {}  # user_id -> VoteType
    agreement_percentage: float = 0.0
    is_accepted: bool = False
    accepted_at: Optional[datetime] = None


class ConsensusVote(BaseModel):
    statement_id: str
    user_id: str
    vote: VoteType
    voted_at: datetime = Field(default_factory=datetime.utcnow)


class StatementCreate(BaseModel):
    statement: str = Field(..., min_length=10, max_length=500)


class StatementVote(BaseModel):
    vote: VoteType
