import os
import shutil
import tempfile
import pytest
from fastapi.testclient import TestClient

# Configure DB URL before importing the app
TEST_DB_DIR = tempfile.mkdtemp(prefix="eps_test_")
TEST_DB_PATH = os.path.join(TEST_DB_DIR, "test.db")
os.environ.setdefault("DATABASE_URL", f"sqlite:///{TEST_DB_PATH}")

from app.db import Base, engine, SessionLocal  # noqa: E402
from app import models  # noqa: E402
from app.main import app  # noqa: E402
from app.security import hash_password  # noqa: E402


@pytest.fixture(scope="session", autouse=True)
def _db_setup_teardown():
    # fresh schema
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield
    # cleanup temp db
    try:
        shutil.rmtree(TEST_DB_DIR)
    except Exception:
        pass


@pytest.fixture()
def db_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture()
def client(db_session):
    # seed roles and admin
    role_names = [
        "Student",
        "Teacher",
        "Headmaster",
        "Director of Studies",
        "Director of Discipline",
        "Accountant",
        "Registrar/Secretary",
        "Patron",
        "Matron",
        "IT Support",
    ]
    existing = {r.name for r in db_session.query(models.Role).all()}
    for rn in role_names:
        if rn not in existing:
            db_session.add(models.Role(name=rn))
    db_session.flush()

    admin = db_session.query(models.User).filter(models.User.email == "admin@example.com").first()
    if not admin:
        admin = models.User(
            email="admin@example.com",
            full_name="Admin",
            hashed_password=hash_password("secret123"),
            is_active=True,
        )
        db_session.add(admin)
        db_session.flush()
    # grant all roles
    admin.roles = db_session.query(models.Role).all()
    db_session.commit()

    return TestClient(app)
