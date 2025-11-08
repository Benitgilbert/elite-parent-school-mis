from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status, Response
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from ..db import get_db
from .. import schemas
from ..auth import authenticate_user, create_access_token
from .. import settings

router = APIRouter()


@router.post("/login", response_model=schemas.Token)
def login_with_cookie(
    payload: schemas.LoginIn,
    response: Response,
    db: Session = Depends(get_db),
):
    user = authenticate_user(db, payload.email, payload.password)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect email or password")

    token = create_access_token({"sub": user.email}, expires_delta=settings.ACCESS_TOKEN_EXPIRE)

    # Set httpOnly cookie
    response.set_cookie(
        key=settings.ACCESS_TOKEN_COOKIE_NAME,
        value=token,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
        domain=settings.COOKIE_DOMAIN,
        path=settings.COOKIE_PATH,
        max_age=int(settings.ACCESS_TOKEN_EXPIRE.total_seconds()),
    )
    return schemas.Token(access_token=token)


@router.post("/logout")
def logout(response: Response):
    response.delete_cookie(
        key=settings.ACCESS_TOKEN_COOKIE_NAME,
        domain=settings.COOKIE_DOMAIN,
        path=settings.COOKIE_PATH,
    )
    return {"ok": True}


@router.post("/token", response_model=schemas.Token)
def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    user = authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect email or password")

    access_token = create_access_token({"sub": user.email}, expires_delta=settings.ACCESS_TOKEN_EXPIRE)
    return schemas.Token(access_token=access_token)
