from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

from . import settings

# Use pool_pre_ping for better reliability; SQLAlchemy 2.0 style
engine = create_engine(settings.DATABASE_URL, future=True, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
