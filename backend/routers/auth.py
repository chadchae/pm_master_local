"""Authentication endpoints."""

import time
from collections import defaultdict
from fastapi import APIRouter, Request, HTTPException
from pydantic import BaseModel

from services import auth_service

router = APIRouter(prefix="/api/auth", tags=["auth"])

# Simple in-memory rate limiter: max 5 failures per IP within 15 minutes
_MAX_FAILURES = 5
_BLOCK_SECONDS = 900  # 15 minutes
_failure_counts: dict[str, list[float]] = defaultdict(list)


def _check_rate_limit(ip: str) -> None:
    now = time.monotonic()
    window_start = now - _BLOCK_SECONDS
    attempts = [t for t in _failure_counts[ip] if t > window_start]
    _failure_counts[ip] = attempts
    if len(attempts) >= _MAX_FAILURES:
        raise HTTPException(status_code=429, detail="Too many failed attempts. Try again later.")


def _record_failure(ip: str) -> None:
    _failure_counts[ip].append(time.monotonic())


class LoginRequest(BaseModel):
    password: str


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


@router.post("/login")
def login(request: Request, body: LoginRequest):
    """Authenticate with password and receive a token."""
    client_ip = request.client.host if request.client else "unknown"
    _check_rate_limit(client_ip)
    token = auth_service.login(body.password)
    if token is None:
        _record_failure(client_ip)
        raise HTTPException(status_code=401, detail="Invalid password")
    # Clear failures on successful login
    _failure_counts.pop(client_ip, None)
    return {"token": token}


@router.post("/change-password")
def change_password(body: ChangePasswordRequest):
    """Change the password."""
    success = auth_service.change_password(body.current_password, body.new_password)
    if not success:
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    return {"message": "Password changed successfully"}


@router.get("/verify")
def verify_token(request: Request):
    """Verify token validity (already checked by middleware)."""
    return {"valid": True}
