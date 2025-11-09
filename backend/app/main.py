from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from . import settings
from .logging_utils import install_memory_handler
from .db import engine, Base
from .routers import auth as auth_router
from .routers import users as users_router
from .routers import admin as admin_router
from .routers import students as students_router
from .routers import secretary as secretary_router
from .routers import attendance as attendance_router
from .routers import public as public_router
from .routers import exams as exams_router
from .routers import comm as comm_router
from .routers import academics as academics_router
from .routers import teachers as teachers_router
from .routers import analytics as analytics_router
from .routers import discipline as discipline_router
from .routers import report_cards as report_cards_router

try:
    import redis  # type: ignore
except Exception:
    redis = None

app = FastAPI(title="Elite Parent School MIS API", version="0.1.0")

# Install memory log handler for admin logs view
install_memory_handler()

# Ensure all SQLAlchemy models are imported before creating tables
from . import models as _models  # noqa: F401

# DEV: Auto-create tables if they don't exist (use Alembic in production)
Base.metadata.create_all(bind=engine)

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
app.include_router(attendance_router.router)
app.include_router(exams_router.router)
app.include_router(comm_router.router)
app.include_router(academics_router.router)
app.include_router(teachers_router.router)
app.include_router(analytics_router.router)
app.include_router(discipline_router.router)
app.include_router(report_cards_router.router)


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
