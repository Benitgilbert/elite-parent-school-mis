# Elite Parent School MIS

A role-based Management Information System (MIS) for Elite Parent School. The MIS digitizes core school operations and provides self-service reporting for parents and staff.

Key dashboards/roles:
- Student
- Teacher
- Headmaster
- Director of Studies
- Director of Discipline
- Accountant
- Registrar/Secretary
- Patron (boys discipline)
- Matron (girls discipline)
- IT Support

Core modules (phase 1):
- Enrollment & Student Records
- Timetable & Class Management
- Attendance & Conduct/Discipline
- Assessment, Grading & Transcripts (bulletins)
- Fees/Billing, Payments & Receipts
- Messaging/Notifications & Parent Portal
- Reporting & Analytics

Recommended stack
- Frontend: Next.js (TypeScript), Material UI, TanStack Query, React Hook Form, Zod
- Backend: FastAPI (Python), SQLAlchemy 2.0 + Alembic, Pydantic v2
- Database: PostgreSQL
- Auth: OAuth2 (password) with JWT, httpOnly cookies; Role-Based Access Control (RBAC)
- Async & Cache: Redis (background jobs, notifications)
- Reporting: WeasyPrint (PDF), OpenPyXL (Excel); CSV exports
- Dev: Docker Compose, pre-commit, Ruff/Black/mypy, pytest; ESLint/Prettier/Vitest/Playwright

Local development
- Backend: uvicorn dev server on port 8000
- Frontend: Next.js dev server on port 3000
- Postgres + Redis via docker-compose (to be added)

Next steps
- Flesh out data model and RBAC policy
- Add Docker Compose and CI
- Scaffold Next.js app and core FastAPI modules
