from __future__ import annotations

from typing import Iterable, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import text, inspect
from sqlalchemy.orm import Session

from .. import schemas, models, settings
from ..db import get_db
from ..auth import require_roles
from ..security import hash_password
from ..logging_utils import get_logs, logs_as_text
from pydantic import BaseModel, EmailStr, Field, validator
import json

try:
    import redis  # type: ignore
except Exception:
    redis = None

router = APIRouter(prefix="/admin", tags=["admin"]) 

AdminGuard = Depends(require_roles("IT Support", "Headmaster"))


def _roles_by_name(db: Session, names: Iterable[str]) -> list[models.Role]:
    if not names:
        return []
    return list(db.query(models.Role).filter(models.Role.name.in_(list(names))).all())


class SystemSettingsModel(BaseModel):
    maintenance_mode: bool = False
    cors_origins: list[str] = Field(default_factory=list)
    email_from: EmailStr | None = None

    @validator("cors_origins", pre=True)
    def _ensure_list(cls, v):
        if v is None:
            return []
        if isinstance(v, str):
            # support comma-separated
            return [s.strip() for s in v.split(",") if s.strip()]
        return v


_SETTINGS_KEY = "system:settings"
_memory_settings: SystemSettingsModel | None = None


def _load_settings() -> SystemSettingsModel:
    global _memory_settings
    if redis:
        try:
            r = redis.Redis.from_url(settings.REDIS_URL)
            raw = r.get(_SETTINGS_KEY)
            if raw:
                data = json.loads(raw)
                return SystemSettingsModel(**data)
        except Exception:
            pass
    if _memory_settings is not None:
        return _memory_settings
    # defaults from env where applicable
    _memory_settings = SystemSettingsModel(
        maintenance_mode=False,
        cors_origins=[],
        email_from=settings.SMTP_FROM,
    )
    return _memory_settings


def _save_settings(data: SystemSettingsModel) -> None:
    global _memory_settings
    if redis:
        try:
            r = redis.Redis.from_url(settings.REDIS_URL)
            r.set(_SETTINGS_KEY, json.dumps(data.dict()))
            _memory_settings = data
            return
        except Exception:
            pass
    _memory_settings = data


@router.get("/settings", response_model=SystemSettingsModel)
def get_settings(_: models.User = AdminGuard):
    return _load_settings()


@router.put("/settings", response_model=SystemSettingsModel)
def put_settings(payload: SystemSettingsModel, _: models.User = AdminGuard):
    _save_settings(payload)
    return payload


@router.get("/health")
def admin_health(_: models.User = AdminGuard, db: Session = Depends(get_db)):
    status_map = {"status": "ok"}
    try:
        db.execute(text("SELECT 1"))
        status_map["db"] = "ok"
    except Exception as e:
        status_map["db"] = f"error:{e.__class__.__name__}"

    try:
        if redis:
            r = redis.Redis.from_url(settings.REDIS_URL)
            r.ping()
            status_map["redis"] = "ok"
        else:
            status_map["redis"] = "unavailable"
    except Exception as e:
        status_map["redis"] = f"error:{e.__class__.__name__}"
    return status_map


@router.post("/cache/purge", status_code=200)
def cache_purge(prefix: Optional[str] = None, _: models.User = AdminGuard):
    if not redis:
        raise HTTPException(status_code=503, detail="Redis unavailable")
    try:
        r = redis.Redis.from_url(settings.REDIS_URL)
        pattern = f"{prefix}*" if prefix else "*"
        keys = r.keys(pattern)
        deleted = 0
        if keys:
            deleted = r.delete(*keys)
        return {"deleted": int(deleted), "prefix": prefix or "*"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Cache purge failed: {e.__class__.__name__}")


@router.get("/logs")
def admin_logs(
    level: Optional[str] = None,
    q: Optional[str] = None,
    limit: int = 500,
    dedup: bool = False,
    _: models.User = AdminGuard,
):
    limit = min(max(limit, 1), 2000)
    items = get_logs(level=level, q=q, limit=limit)
    if dedup and items:
        grouped: list[dict] = []
        last_key: tuple[str, str, str] | None = None
        for it in items:
            key = (it.get("level", ""), it.get("name", ""), it.get("message", ""))
            if key == last_key and grouped:
                grouped[-1]["count"] = grouped[-1].get("count", 1) + 1
            else:
                row = dict(it)
                row["count"] = 1
                grouped.append(row)
                last_key = key
        items = grouped
    return {"items": items}


@router.get("/logs/download")
def admin_logs_download(
    level: Optional[str] = None,
    q: Optional[str] = None,
    limit: int = 1000,
    _: models.User = AdminGuard,
):
    text_data = logs_as_text(level=level, q=q, limit=limit)
    from fastapi.responses import PlainTextResponse

    return PlainTextResponse(text_data, headers={"Content-Disposition": "attachment; filename=logs.txt"})


@router.get("/db/tables")
def admin_db_tables(_: models.User = AdminGuard, db: Session = Depends(get_db)):
    insp = inspect(db.get_bind())
    # Limit to default schema
    tables = sorted(insp.get_table_names(schema="public"))
    return {"tables": tables}


@router.get("/db/query")
def admin_db_query(sql: str, limit: int = 200, _: models.User = AdminGuard, db: Session = Depends(get_db)):
    stmt = sql.strip()
    if not stmt.lower().startswith("select"):
        raise HTTPException(status_code=400, detail="Only SELECT statements are allowed")
    if ";" in stmt[:-1]:
        raise HTTPException(status_code=400, detail="Only single statement allowed")
    # enforce limit
    limit = min(max(limit, 1), 1000)
    wrapped = f"SELECT * FROM ( {stmt} ) AS sub LIMIT :limit"
    result = db.execute(text(wrapped), {"limit": limit})
    rows = result.fetchall()
    cols = list(result.keys())
    out = [dict(zip(cols, r)) for r in rows]
    return {"columns": cols, "rows": out}


@router.get("/db/export")
def admin_db_export(table: str, _: models.User = AdminGuard, db: Session = Depends(get_db)):
    if not table.replace("_", "").isalnum():
        raise HTTPException(status_code=400, detail="Invalid table name")
    q = text(f"SELECT * FROM public.{table} LIMIT 10000")
    result = db.execute(q)
    cols = list(result.keys())
    import io, csv
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(cols)
    for r in result.fetchall():
        writer.writerow(list(r))
    data = buf.getvalue()
    from fastapi.responses import PlainTextResponse
    return PlainTextResponse(data, headers={
        "Content-Disposition": f"attachment; filename={table}.csv",
        "Content-Type": "text/csv; charset=utf-8",
    })


class SecurityPolicyModel(BaseModel):
    min_length: int = 8
    require_special: bool = False


_SECURITY_POLICY_KEY = "system:security:policy"
_memory_policy: SecurityPolicyModel | None = None


def _load_policy() -> SecurityPolicyModel:
    global _memory_policy
    if redis:
        try:
            r = redis.Redis.from_url(settings.REDIS_URL)
            raw = r.get(_SECURITY_POLICY_KEY)
            if raw:
                return SecurityPolicyModel(**json.loads(raw))
        except Exception:
            pass
    if _memory_policy is not None:
        return _memory_policy
    _memory_policy = SecurityPolicyModel()
    return _memory_policy


def _save_policy(p: SecurityPolicyModel) -> None:
    global _memory_policy
    if redis:
        try:
            r = redis.Redis.from_url(settings.REDIS_URL)
            r.set(_SECURITY_POLICY_KEY, json.dumps(p.dict()))
            _memory_policy = p
            return
        except Exception:
            pass
    _memory_policy = p


@router.get("/security/role-audit")
def security_role_audit(_: models.User = AdminGuard, db: Session = Depends(get_db)):
    roles = db.query(models.Role).all()
    out = []
    for r in roles:
        count = db.query(models.User).join(models.User.roles).filter(models.Role.id == r.id).count()
        out.append({"name": r.name, "count": count})
    users_without_roles = db.query(models.User).filter(~models.User.roles.any()).count()
    admins = db.query(models.User).join(models.User.roles).filter(models.Role.name == "IT Support").all()
    admins_list = [{"id": u.id, "email": u.email, "full_name": u.full_name} for u in admins]
    return {"roles": out, "users_without_roles": users_without_roles, "admins": admins_list}


@router.get("/security/policy", response_model=SecurityPolicyModel)
def security_get_policy(_: models.User = AdminGuard):
    return _load_policy()


@router.put("/security/policy", response_model=SecurityPolicyModel)
def security_put_policy(payload: SecurityPolicyModel, _: models.User = AdminGuard):
    if payload.min_length < 6:
        raise HTTPException(status_code=400, detail="min_length must be >= 6")
    _save_policy(payload)
    return payload


@router.post("/security/revoke-all")
def security_revoke_all(_: models.User = AdminGuard):
    # JWT is stateless; full session revocation requires token blacklist or key rotation, which is not implemented.
    raise HTTPException(status_code=501, detail="Revoke-all sessions is not implemented for stateless JWT.")


@router.get("/roles", response_model=list[schemas.RoleOut])
def list_roles(_: models.User = AdminGuard, db: Session = Depends(get_db)):
    return db.query(models.Role).order_by(models.Role.name.asc()).all()


@router.get("/users", response_model=list[schemas.UserOut])
def list_users(_: models.User = AdminGuard, db: Session = Depends(get_db)):
    users = db.query(models.User).order_by(models.User.id.asc()).all()
    out: list[schemas.UserOut] = []
    for u in users:
        out.append(
            schemas.UserOut(
                id=u.id,
                email=u.email,
                full_name=u.full_name,
                is_active=u.is_active,
                roles=[r.name for r in (u.roles or [])],
            )
        )
    return out


@router.post("/users", response_model=schemas.UserOut, status_code=201)
def create_user(payload: schemas.UserCreate, _: models.User = AdminGuard, db: Session = Depends(get_db)):
    if db.query(models.User).filter(models.User.email == payload.email).first():
        raise HTTPException(status_code=400, detail="Email already exists")
    user = models.User(
        email=payload.email,
        full_name=payload.full_name,
        hashed_password=hash_password(payload.password),
        is_active=True,
    )
    user.roles = _roles_by_name(db, payload.role_names)
    db.add(user)
    db.commit()
    db.refresh(user)
    return schemas.UserOut(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        is_active=user.is_active,
        roles=[r.name for r in (user.roles or [])],
    )


@router.patch("/users/{user_id}", response_model=schemas.UserOut)
def update_user(user_id: int, payload: schemas.UserUpdate, _: models.User = AdminGuard, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if payload.full_name is not None:
        user.full_name = payload.full_name
    if payload.is_active is not None:
        user.is_active = payload.is_active
    if payload.password:
        user.hashed_password = hash_password(payload.password)
    if payload.role_names is not None:
        user.roles = _roles_by_name(db, payload.role_names)

    db.add(user)
    db.commit()
    db.refresh(user)
    return schemas.UserOut(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        is_active=user.is_active,
        roles=[r.name for r in (user.roles or [])],
    )


@router.delete("/users/{user_id}", status_code=204)
def delete_user(user_id: int, _: models.User = AdminGuard, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        return
    db.delete(user)
    db.commit()
