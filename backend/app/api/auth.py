from datetime import timedelta
from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel, EmailStr

from app.core.database import get_db
from app.core.security import (
    verify_password,
    get_password_hash,
    create_access_token,
    get_current_active_user
)
from app.models.user import UserCreate, UserResponse, UserInDB
from bson import ObjectId

router = APIRouter()


class RegisterRequest(BaseModel):
    email: EmailStr
    username: str
    password: str
    full_name: str = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


@router.post("/register", response_model=TokenResponse)
async def register(user_data: RegisterRequest):
    db = get_db()
    
    existing_user = await db.users.find_one({
        "$or": [
            {"email": user_data.email},
            {"username": user_data.username}
        ]
    })
    
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email or username already registered"
        )
    
    user_dict = user_data.dict()
    hashed_password = get_password_hash(user_dict.pop("password"))
    
    user_in_db = UserInDB(
        **user_dict,
        hashed_password=hashed_password
    )
    
    result = await db.users.insert_one(user_in_db.dict(by_alias=True))
    user_id = str(result.inserted_id)
    
    access_token = create_access_token(data={"sub": user_id})
    
    created_user = await db.users.find_one({"_id": result.inserted_id})
    created_user_dict = {k: v for k, v in created_user.items() if k != '_id'}
    created_user_dict['_id'] = user_id
    
    return TokenResponse(
        access_token=access_token,
        user=UserResponse(**created_user_dict)
    )


@router.post("/login", response_model=TokenResponse)
async def login(login_data: LoginRequest):
    db = get_db()
    
    user = await db.users.find_one({"email": login_data.email})
    
    if not user or not verify_password(login_data.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = create_access_token(data={"sub": str(user["_id"])})
    
    user_dict = {k: v for k, v in user.items() if k != '_id'}
    user_dict['_id'] = str(user["_id"])
    
    return TokenResponse(
        access_token=access_token,
        user=UserResponse(**user_dict)
    )


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_active_user)):
    user_dict = {k: v for k, v in current_user.items() if k != '_id'}
    user_dict['_id'] = str(current_user["_id"])
    return UserResponse(**user_dict)


@router.put("/me")
async def update_profile(
    update_data: dict,
    current_user: dict = Depends(get_current_active_user)
):
    db = get_db()
    
    allowed_fields = ["full_name", "bio", "avatar_url"]
    update_dict = {k: v for k, v in update_data.items() if k in allowed_fields}
    
    if update_dict:
        await db.users.update_one(
            {"_id": current_user["_id"]},
            {"$set": update_dict}
        )
    
    updated_user = await db.users.find_one({"_id": current_user["_id"]})
    user_dict = {k: v for k, v in updated_user.items() if k != '_id'}
    user_dict['_id'] = str(updated_user["_id"])
    return UserResponse(**user_dict)
