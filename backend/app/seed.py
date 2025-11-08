import os
import sys
from sqlalchemy.exc import IntegrityError

from .db import SessionLocal
from . import models
from .security import hash_password

ROLE_NAMES = [
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


def main() -> int:
    admin_email = os.getenv("ADMIN_EMAIL")
    admin_password = os.getenv("ADMIN_PASSWORD")
    if not admin_email or not admin_password:
        print("Set ADMIN_EMAIL and ADMIN_PASSWORD environment variables before running seeder.")
        return 1

    db = SessionLocal()
    try:
        # Seed roles
        existing_roles = {r.name for r in db.query(models.Role).all()}
        for name in ROLE_NAMES:
            if name not in existing_roles:
                db.add(models.Role(name=name))
        db.flush()

        # Ensure admin user
        user = db.query(models.User).filter(models.User.email == admin_email).first()
        if not user:
            user = models.User(
                email=admin_email,
                full_name="Administrator",
                hashed_password=hash_password(admin_password),
                is_active=True,
            )
            db.add(user)
            db.flush()

        # Give admin all roles (adjust as needed)
        roles = db.query(models.Role).all()
        user.roles = roles

        db.commit()
        print(f"Seeded roles and admin user: {admin_email}")
        return 0
    except IntegrityError as e:
        db.rollback()
        print(f"IntegrityError: {e}")
        return 2
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())
