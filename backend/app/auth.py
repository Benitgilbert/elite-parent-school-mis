from __future__ import annotations

from typing import Annotated, Callable
from datetime import datetime, timedelta, timezone

from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from . import settings, models
from .db import get_db
from .security import verify_password

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/token", auto_error=False)


def authenticate_user(db: Session, email: str, password: str) -> models.User | None:
    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    return user


def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or settings.ACCESS_TOKEN_EXPIRE)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


class TokenError(HTTPException):
    def __init__(self):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )


def get_current_user(
    request: Request,
    token: Annotated[str | None, Depends(oauth2_scheme)] = None,
    db: Annotated[Session, Depends(get_db)] = None,
) -> models.User:
    raw = request.cookies.get(settings.ACCESS_TOKEN_COOKIE_NAME) or token
    if not raw:
        raise TokenError()
    try:
        payload = jwt.decode(raw, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        sub: str | None = payload.get("sub")
        if sub is None:
            raise TokenError()
    except JWTError:
        raise TokenError()

    user = db.query(models.User).filter(models.User.email == sub).first()
    if not user:
        raise TokenError()
    return user


def require_roles(*required: str) -> Callable:
    def dependency(current_user: Annotated[models.User, Depends(get_current_user)]) -> models.User:
        if not required:
            return current_user
        user_roles = {r.name for r in (current_user.roles or [])}
        if any(role in user_roles for role in required):
            return current_user
        raise HTTPException(status_code=403, detail="Insufficient role")

    return dependency
