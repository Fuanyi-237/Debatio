from datetime import datetime
from typing import Optional, List, Dict
from enum import Enum
from pydantic import BaseModel, Field
from bson import ObjectId

from app.models.user import PyObjectId


class SessionType(str, Enum):
    DEBATE = "debate"
    ROUNDTABLE = "roundtable"


class SessionStatus(str, Enum):
    SCHEDULED = "scheduled"
    LIVE = "live"
    PAUSED = "paused"
    ENDED = "ended"


class SessionVisibility(str, Enum):
    PUBLIC = "public"
    PRIVATE = "private"
    COMMUNITY = "community"


class SessionPhase(str, Enum):
    LOBBY = "lobby"
    OPENING = "opening"
    ARGUMENT = "argument"
    REBUTTAL = "rebuttal"
    OPEN_DISCUSSION = "open_discussion"
    CONCLUSION = "conclusion"


class ViolationType(str, Enum):
    INTERRUPTION = "interruption"
    TIME_EXCEEDED = "time_exceeded"
    RULE_BREAK = "rule_break"
    INAPPROPRIATE = "inappropriate"


class ViolationAction(str, Enum):
    WARNING = "warning"
    MUTE = "mute"
    TEMP_BAN = "temp_ban"
    PERM_BAN = "perm_ban"


class DebateRule(BaseModel):
    name: str = "Standard Debate"
    description: str = "3 rounds, 5 minutes per speaker"
    max_speaking_time: int = 300
    warning_time: int = 30
    allow_interruptions: bool = False
    allow_rebuttal: bool = True
    allow_challenge: bool = False
    challenge_time: int = 60
    require_evidence: bool = False
    auto_mute_on_expiry: bool = True
    extension_allowed: bool = True
    max_extensions: int = 1
    extension_time: int = 60
    rounds: int = 3
    time_per_round: int = 600
    violation_thresholds: Dict[str, int] = {
        "interruption": 3,
        "time_exceeded": 2,
        "rule_break": 2,
    }


class RoundTableRule(BaseModel):
    name: str = "Open Roundtable"
    description: str = "Collaborative discussion with equal speaking time"
    max_speaking_time: int = 180
    warning_time: int = 30
    allow_interruptions: bool = False
    allow_rebuttal: bool = True
    allow_challenge: bool = False
    challenge_time: int = 60
    auto_mute_on_expiry: bool = True
    extension_allowed: bool = True
    max_extensions: int = 2
    extension_time: int = 60
    consensus_threshold: float = 0.66
    violation_thresholds: Dict[str, int] = {
        "interruption": 3,
        "time_exceeded": 2,
        "rule_break": 2,
    }


class ParticipantRole(str, Enum):
    HOST = "host"
    MODERATOR = "moderator"
    SPEAKER = "speaker"
    OBSERVER = "observer"


class Violation(BaseModel):
    type: ViolationType
    action: ViolationAction
    issued_by: str
    issued_at: datetime = Field(default_factory=datetime.utcnow)
    reason: Optional[str] = None


class Participant(BaseModel):
    user_id: str
    role: ParticipantRole
    joined_at: datetime = Field(default_factory=datetime.utcnow)
    is_active: bool = True
    is_speaking: bool = False
    is_muted: bool = True
    has_raised_hand: bool = False
    hand_raised_at: Optional[datetime] = None
    speaking_time_remaining: int = 0
    total_speaking_time: int = 0
    speaking_turns: int = 0
    extensions_used: int = 0
    violations: List[Violation] = []
    is_temp_banned: bool = False
    temp_ban_until: Optional[datetime] = None


class Reaction(BaseModel):
    type: str
    user_id: str
    username: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class Question(BaseModel):
    id: str = Field(default_factory=lambda: str(ObjectId()))
    text: str
    asked_by: str
    asked_by_username: Optional[str] = None
    upvotes: int = 0
    upvoted_by: List[str] = []
    is_answered: bool = False
    answered_by: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


class TimerState(BaseModel):
    time_remaining: int = 0
    is_running: bool = False
    warning_issued: bool = False
    speaker_id: Optional[str] = None
    started_at: Optional[datetime] = None


class FairnessReport(BaseModel):
    total_speaking_time: int = 0
    participant_times: Dict[str, int] = {}
    dominant_speakers: List[str] = []
    underrepresented_speakers: List[str] = []
    fairness_score: float = 100.0


class SessionBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    topic: str = Field(..., min_length=1, max_length=300)
    tags: List[str] = []
    session_type: SessionType
    visibility: SessionVisibility = SessionVisibility.PUBLIC
    category: Optional[str] = None
    scheduled_start: Optional[datetime] = None
    scheduled_end: Optional[datetime] = None


class SessionCreate(BaseModel):
    title: str = Field(..., min_length=5, max_length=200)
    description: Optional[str] = None
    topic: str = Field(..., min_length=5, max_length=300)
    tags: List[str] = []
    session_type: SessionType
    visibility: SessionVisibility = SessionVisibility.PUBLIC
    category: Optional[str] = None
    scheduled_start: Optional[datetime] = None
    scheduled_end: Optional[datetime] = None
    rules: Optional[dict] = None


class SessionInDB(SessionBase):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    host_id: str
    session_code: str = Field(..., min_length=6, max_length=10)
    status: SessionStatus = SessionStatus.SCHEDULED
    phase: SessionPhase = SessionPhase.LOBBY
    current_round: int = 0
    participants: List[Participant] = []
    pending_requests: List[dict] = []
    current_speaker: Optional[str] = None
    speaking_queue: List[str] = []
    timer: TimerState = TimerState()
    rules: dict = {}
    questions: List[Question] = []
    reactions: List[Reaction] = []
    fairness: FairnessReport = FairnessReport()
    created_at: datetime = Field(default_factory=datetime.utcnow)
    started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    transcript: List[dict] = []
    consensus_reached: bool = False
    consensus_statements: List[dict] = []


class SessionResponse(SessionBase):
    id: str = Field(..., alias="_id")
    host_id: str
    session_code: str
    status: SessionStatus
    phase: SessionPhase = SessionPhase.LOBBY
    current_round: int = 0
    participants: List[Participant]
    current_speaker: Optional[str]
    speaking_queue: List[str]
    timer: TimerState = TimerState()
    created_at: datetime
    participant_count: int = 0
    is_live: bool = False

    class Config:
        json_encoders = {ObjectId: str}
        populate_by_name = True


class SessionDetail(SessionResponse):
    rules: dict
    pending_requests: List[dict]
    consensus_statements: List[dict]
    transcript: List[dict]
    questions: List[Question] = []
    fairness: FairnessReport = FairnessReport()


class JoinRequest(BaseModel):
    user_id: str
    requested_role: ParticipantRole
    message: Optional[str] = None
    requested_at: datetime = Field(default_factory=datetime.utcnow)


class JoinRequestAction(BaseModel):
    action: str
    role: Optional[ParticipantRole] = None


class PhaseChangeRequest(BaseModel):
    phase: SessionPhase


class ExtensionRequest(BaseModel):
    session_id: str


class ChallengeRequest(BaseModel):
    session_id: str
    challenged_user_id: str
    reason: Optional[str] = None


class QuestionCreate(BaseModel):
    text: str = Field(..., min_length=5, max_length=500)


class QuestionVote(BaseModel):
    vote: int = Field(..., ge=-1, le=1)


class ReactionCreate(BaseModel):
    type: str = Field(..., min_length=1, max_length=20)


class ViolationIssue(BaseModel):
    user_id: str
    type: ViolationType
    reason: Optional[str] = None


class RecordingStatus(str, Enum):
    SCHEDULED = "scheduled"
    RECORDING = "recording"
    PAUSED = "paused"
    COMPLETED = "completed"
    FAILED = "failed"


class Recording(BaseModel):
    id: str = Field(default_factory=lambda: str(ObjectId()))
    session_id: str
    started_at: datetime = Field(default_factory=datetime.utcnow)
    ended_at: Optional[datetime] = None
    status: RecordingStatus = RecordingStatus.SCHEDULED
    recording_url: Optional[str] = None
    duration_seconds: int = 0
    file_size_mb: Optional[float] = None
    recorded_by: str
    include_audio: bool = True
    include_video: bool = True
    include_screen: bool = False


class RecordingCreate(BaseModel):
    include_audio: bool = True
    include_video: bool = True
    include_screen: bool = False


class RecordingUpdate(BaseModel):
    status: Optional[RecordingStatus] = None
    recording_url: Optional[str] = None
    duration_seconds: Optional[int] = None
    file_size_mb: Optional[float] = None


class Note(BaseModel):
    id: str = Field(default_factory=lambda: str(ObjectId()))
    session_id: str
    user_id: str
    content: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None
    is_private: bool = True


class NoteCreate(BaseModel):
    content: str = Field(..., min_length=1, max_length=5000)
    is_private: bool = True


class NoteUpdate(BaseModel):
    content: Optional[str] = None
    is_private: Optional[bool] = None


class WaitingRoomStatus(str, Enum):
    WAITING = "waiting"
    APPROVED = "approved"
    REJECTED = "rejected"


class WaitingRoomEntry(BaseModel):
    id: str = Field(default_factory=lambda: str(ObjectId()))
    session_id: str
    user_id: str
    username: str
    requested_at: datetime = Field(default_factory=datetime.utcnow)
    status: WaitingRoomStatus = WaitingRoomStatus.WAITING
    approved_by: Optional[str] = None
    approved_at: Optional[datetime] = None
    message: Optional[str] = None
    device_info: Optional[dict] = None


class BreakoutRoom(BaseModel):
    id: str = Field(default_factory=lambda: str(ObjectId()))
    session_id: str
    name: str
    topic: str
    participants: List[str] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: str
    is_active: bool = True
    duration_minutes: int = 15
    started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None


class BreakoutRoomCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    topic: str = Field(..., min_length=1, max_length=300)
    participant_ids: List[str]
    duration_minutes: int = 15


class CustomBranding(BaseModel):
    logo_url: Optional[str] = None
    primary_color: str = "#6366f1"
    secondary_color: Optional[str] = None
    background_color: Optional[str] = None
    custom_css: Optional[str] = None
    welcome_message: Optional[str] = None
    footer_text: Optional[str] = None
