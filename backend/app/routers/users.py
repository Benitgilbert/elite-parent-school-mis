from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from .. import schemas, models
from ..db import get_db
from ..auth import get_current_user, require_roles

router = APIRouter()


@router.get("/users/me", response_model=schemas.UserOut)
def read_users_me(current_user = Depends(get_current_user)):
    # Map ORM roles to names for output
    return schemas.UserOut(
        id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name,
        roles=[r.name for r in (current_user.roles or [])],
    )


@router.get("/admin/ping")
def admin_ping(_: models.User = Depends(require_roles("IT Support", "Headmaster"))):
    return {"ok": True, "scope": "admin"}
