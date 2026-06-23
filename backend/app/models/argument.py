from datetime import datetime
from typing import Optional, List
from enum import Enum
from pydantic import BaseModel, Field
from bson import ObjectId

from app.models.user import PyObjectId


class ArgumentType(str, Enum):
    OPENING = "opening"
    REBUTTAL = "rebuttal"
    COUNTER = "counter"
    EVIDENCE = "evidence"
    QUESTION = "question"
    ANSWER = "answer"
    CLOSING = "closing"


class Evidence(BaseModel):
    title: str
    url: Optional[str] = None
    description: Optional[str] = None
    type: str = "link"  # link, file, scripture, quote
    uploaded_at: datetime = Field(default_factory=datetime.utcnow)


class ArgumentBase(BaseModel):
    content: str = Field(..., min_length=10, max_length=5000)
    type: ArgumentType
    evidence: List[Evidence] = []
    tags: List[str] = []


class ArgumentCreate(ArgumentBase):
    session_id: str
    parent_id: Optional[str] = None  # For threaded replies
    replying_to: Optional[str] = None  # User ID being replied to


class ArgumentInDB(ArgumentBase):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    session_id: str
    user_id: str
    parent_id: Optional[str] = None
    replying_to: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    is_edited: bool = False
    upvotes: int = 0
    downvotes: int = 0
    quality_score: float = 0.0
    children: List[str] = []  # IDs of child arguments
    depth: int = 0


class ArgumentResponse(ArgumentBase):
    id: str = Field(..., alias="_id")
    session_id: str
    user_id: str
    author: Optional[dict] = None
    parent_id: Optional[str]
    replying_to: Optional[str]
    created_at: datetime
    is_edited: bool
    upvotes: int
    downvotes: int
    quality_score: float
    children: List[str]
    depth: int

    class Config:
        json_encoders = {ObjectId: str}
        populate_by_name = True


class ArgumentTree(BaseModel):
    root: ArgumentResponse
    children: List['ArgumentTree'] = []


class ArgumentVote(BaseModel):
    argument_id: str
    user_id: str
    vote_type: str  # upvote, downvote
    voted_at: datetime = Field(default_factory=datetime.utcnow)
