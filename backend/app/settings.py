import os
from datetime import timedelta

# Default to local docker-compose services
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+psycopg://postgres:postgres@localhost:5432/eps_mis",
)
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

# Auth settings
SECRET_KEY = os.getenv("SECRET_KEY", "change-me")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))
ACCESS_TOKEN_EXPIRE = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)

# Cookie settings for session-style auth
ACCESS_TOKEN_COOKIE_NAME = os.getenv("ACCESS_TOKEN_COOKIE_NAME", "access_token")
COOKIE_SECURE = os.getenv("COOKIE_SECURE", "false").lower() == "true"
COOKIE_SAMESITE = os.getenv("COOKIE_SAMESITE", "lax").capitalize()  # 'Lax'|'Strict'|'None'
COOKIE_DOMAIN = os.getenv("COOKIE_DOMAIN")  # optional
COOKIE_PATH = "/"
