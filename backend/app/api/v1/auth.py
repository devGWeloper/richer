from fastapi import APIRouter, Depends, status
from loguru import logger
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.core.exceptions import ConflictError, UnauthorizedError
from app.core.security import decode_token
from app.models.user import User
from app.schemas.auth import (
    RefreshRequest,
    TokenResponse,
    UserLogin,
    UserRegister,
    UserResponse,
)
from app.services.auth_service import authenticate_user, create_tokens, create_user

router = APIRouter()


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(body: UserRegister, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(select(User).where(User.username == body.username))
    if existing.scalar_one_or_none():
        logger.bind(category="auth").warning(f"Registration failed: username '{body.username}' already exists")
        raise ConflictError("Username already taken")

    user = await create_user(db, body.username, body.password)
    logger.bind(category="auth").info(f"User registered: {user.id} ({body.username})")
    return create_tokens(user.id)


@router.post("/login", response_model=TokenResponse)
async def login(body: UserLogin, db: AsyncSession = Depends(get_db)):
    user = await authenticate_user(db, body.username, body.password)
    if not user:
        logger.bind(category="auth").warning(f"Login failed: invalid credentials for '{body.username}'")
        raise UnauthorizedError("Invalid username or password")
    logger.bind(category="auth").info(f"User logged in: {user.id} ({body.username})")
    return create_tokens(user.id)


@router.post("/refresh", response_model=TokenResponse)
async def refresh(body: RefreshRequest):
    payload = decode_token(body.refresh_token)
    if not payload or payload.get("type") != "refresh":
        logger.bind(category="auth").warning("Token refresh failed: invalid refresh token")
        raise UnauthorizedError("Invalid refresh token")
    user_id = int(payload["sub"])
    logger.bind(category="auth").debug(f"Token refreshed for user: {user_id}")
    return create_tokens(user_id)


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user
