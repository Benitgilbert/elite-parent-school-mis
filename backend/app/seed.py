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


from .settings import settings

def main() -> int:
    if not settings.ADMIN_EMAIL or not settings.ADMIN_PASSWORD:
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
        user = db.query(models.User).filter(models.User.email == settings.ADMIN_EMAIL).first()
        if not user:
            user = models.User(
                email=settings.ADMIN_EMAIL,
                full_name="Administrator",
                hashed_password=hash_password(settings.ADMIN_PASSWORD),
                is_active=True,
            )
            db.add(user)
            db.flush()

        # Give admin all roles (adjust as needed)
        roles = db.query(models.Role).all()
        user.roles = roles

        db.commit()
        print(f"Seeded roles and admin user: {settings.ADMIN_EMAIL}")
        return 0
    except IntegrityError as e:
        db.rollback()
        print(f"IntegrityError: {e}")
        return 2
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())
