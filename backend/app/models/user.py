from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr, Field, ConfigDict
from bson import ObjectId


class PyObjectId(ObjectId):
    @classmethod
    def __get_pydantic_core_schema__(cls, source_type, handler):
        from pydantic_core import core_schema
        return core_schema.with_info_before_validator_function(
            cls.validate,
            core_schema.str_schema(),
            serialization=core_schema.to_string_ser_schema()
        )

    @classmethod
    def validate(cls, v):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid objectid")
        return ObjectId(v)


class UserBase(BaseModel):
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=50)
    full_name: Optional[str] = None
    bio: Optional[str] = None
    avatar_url: Optional[str] = None
    is_verified: bool = False
    role: str = "user"  # user, moderator, admin
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    model_config = ConfigDict(
        json_encoders={ObjectId: str},
        populate_by_name=True
    )


class UserCreate(UserBase):
    password: str = Field(..., min_length=8)


class UserInDB(UserBase):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    hashed_password: str
    disabled: bool = False


class UserResponse(UserBase):
    id: str = Field(..., alias="_id")

    model_config = ConfigDict(
        json_encoders={ObjectId: str},
        populate_by_name=True
    )


class UserProfile(BaseModel):
    user: UserResponse
    stats: dict
    sessions_participated: int = 0
    sessions_hosted: int = 0
    arguments_made: int = 0
    consensus_reached: int = 0
