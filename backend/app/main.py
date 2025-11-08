from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from . import settings
from .db import engine
from .routers import auth as auth_router
from .routers import users as users_router
from .routers import admin as admin_router
from .routers import students as students_router
from .routers import secretary as secretary_router
from .routers import public as public_router

try:
    import redis  # type: ignore
except Exception:
    redis = None

app = FastAPI(title="Elite Parent School MIS API", version="0.1.0")

# CORS for local frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(auth_router.router, prefix="/auth", tags=["auth"])
app.include_router(users_router.router, tags=["users"])
app.include_router(admin_router.router)
app.include_router(students_router.router)
app.include_router(secretary_router.router)
app.include_router(public_router.router)


@app.get("/health")
async def health():
    status = {"status": "ok"}

    # Database
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        status["db"] = "ok"
    except Exception as e:
        status["db"] = f"error:{e.__class__.__name__}"

    # Redis
    try:
        if redis:
            r = redis.Redis.from_url(settings.REDIS_URL)
            r.ping()
            status["redis"] = "ok"
        else:
            status["redis"] = "unavailable"
    except Exception as e:
        status["redis"] = f"error:{e.__class__.__name__}"

    return status
