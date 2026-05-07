"""User authentication service: JWT tokens + bcrypt password hashing."""
from __future__ import annotations

import os
import uuid
from datetime import datetime, timezone, timedelta

import bcrypt
import jwt

from models import UserProfile

SECRET_KEY = os.getenv("APP_SECRET", "change_me")
ALGORITHM = "HS256"
TOKEN_EXPIRE_HOURS = 72


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())


def create_access_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(hours=TOKEN_EXPIRE_HOURS),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_access_token(token: str) -> dict | None:
    """Returns payload dict or None if invalid/expired."""
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
        return None


def generate_user_id() -> str:
    return str(uuid.uuid4())
