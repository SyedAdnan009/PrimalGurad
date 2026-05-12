# backend/app/routers/admin.py
from fastapi import APIRouter, HTTPException, Header, UploadFile, File, status
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import os, uuid

from app.core.store import USERS, SESSIONS

router = APIRouter(prefix="/admin", tags=["Admin"])


# -----------------------------------------------------------
# UTILS
# -----------------------------------------------------------
def require_admin(authorization: str = Header(None)):
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing token")

    token = authorization.split(" ", 1)[1]
    session = SESSIONS.get(token)

    if not session:
        raise HTTPException(status_code=401, detail="Invalid token")

    if session["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    return USERS[session["username"]]


# -----------------------------------------------------------
# MODELS
# -----------------------------------------------------------
class CreateUserRequest(BaseModel):
    username: str
    password: str
    role: str


class UpdateUserRequest(BaseModel):
    role: Optional[str] = None
    active: Optional[bool] = None


class ResetPasswordRequest(BaseModel):
    newPassword: str


# -----------------------------------------------------------
# USERS
# -----------------------------------------------------------
@router.get("/users")
def get_users(authorization: str = Header(None)):
    require_admin(authorization)
    return list(USERS.values())


@router.post("/users")
def create_user(payload: CreateUserRequest, authorization: str = Header(None)):
    require_admin(authorization)

    if payload.username in USERS:
        raise HTTPException(400, "Username already exists")

    USERS[payload.username] = {
        "username": payload.username,
        "password": payload.password,
        "role": payload.role,
        "active": True,
        "createdAt": datetime.utcnow().isoformat(),
        "lastLogin": None
    }

    return {"message": "User created"}


@router.put("/users/{username}")
def update_user(username: str, payload: UpdateUserRequest, authorization: str = Header(None)):
    require_admin(authorization)

    user = USERS.get(username)
    if not user:
        raise HTTPException(404, "User not found")

    if payload.role:
        user["role"] = payload.role

    if payload.active is not None:
        user["active"] = payload.active

    return {"message": "User updated"}


@router.post("/users/{username}/reset-password")
def reset_password(username: str, payload: ResetPasswordRequest, authorization: str = Header(None)):
    require_admin(authorization)

    user = USERS.get(username)
    if not user:
        raise HTTPException(404, "User not found")

    user["password"] = payload.newPassword
    return {"message": "Password reset"}
