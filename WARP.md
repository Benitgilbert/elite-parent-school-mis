# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

Project overview
- Monorepo with two top-level apps:
  - backend: FastAPI service (Python). Currently includes a minimal app with /health.
  - frontend: Next.js app (TypeScript) to be scaffolded (see frontend/README.md).
- Planned stack per README: PostgreSQL, Redis, SQLAlchemy + Alembic, Pydantic v2, JWT auth with RBAC; on the web side, MUI, TanStack Query, React Hook Form, Zod; tests via pytest (backend) and Vitest/Playwright (frontend).

Important docs
- README.md: project scope, roles, and modules; “Local development” expectations.
- frontend/README.md: how to scaffold the Next.js app and library conventions.
- No CLAUDE, Cursor, or Copilot rules are present.

Backend (FastAPI) — setup and common commands
Prereqs
- Python and virtualenv available.

Setup (Windows PowerShell)
- py -m venv .venv
- .\.venv\Scripts\Activate.ps1
- pip install -r backend/requirements.txt

Run dev server
- From backend/: uvicorn app.main:app --reload --port 8000
- Health check: GET http://localhost:8000/health

Auth & RBAC
- Cookie login: POST /auth/login with JSON { email, password } → sets httpOnly cookie "access_token"
- Logout: POST /auth/logout (clears cookie)
- Bearer token (alt): POST /auth/token with form fields username=<email>, password=<password>
- Current user: GET /users/me (reads token from cookie or Authorization header)
- Role-guarded example: GET /admin/ping requires one of: IT Support, Headmaster

Admin APIs
- GET /admin/roles — list roles
- GET /admin/users — list users
- POST /admin/users — create user { email, full_name?, password, role_names[] }
- PATCH /admin/users/{id} — update { full_name?, is_active?, password?, role_names? }
- DELETE /admin/users/{id}

Lint/format (planned per README; run once configured)
- Ruff check: ruff check backend/
- Format (Black or Ruff): black backend/  (or)  ruff format backend/

Type-check (planned)
- mypy backend/

Tests (planned)
- All tests: pytest backend/
- Single test file: pytest backend/tests/test_example.py
- Single test function: pytest backend/tests/test_example.py::test_case

Seed data (roles and an admin user)
- Set environment variables then run (from backend/):
  - $env:ADMIN_EMAIL="{{ADMIN_EMAIL}}"; $env:ADMIN_PASSWORD="{{ADMIN_PASSWORD}}"; python -m app.seed

Migrations (Alembic)
- Apply latest (from backend/): alembic -c alembic.ini upgrade head
- Create new revision (autogenerate): alembic -c alembic.ini revision --autogenerate -m "message"
- Downgrade one: alembic -c alembic.ini downgrade -1

Frontend (Next.js) — scaffold and common commands
Scaffold (from repo root; see frontend/README.md)
- npx create-next-app@latest frontend --typescript --eslint --src-dir --import-alias "@/*"
- cd frontend; npm i @mui/material @mui/icons-material @emotion/react @emotion/styled @tanstack/react-query zod react-hook-form @hookform/resolvers

Run dev server (after scaffold)
- cd frontend; npm run dev  (defaults to http://localhost:3000)

Build/lint/test (after scaffold/config)
- Build: npm run build
- Lint: npm run lint
- Unit tests (Vitest): npx vitest  (single test: npx vitest path/to/file.test.ts -t "name")
- E2E (Playwright): npx playwright test  (single test: npx playwright test path/to/spec.ts -g "name")

Running both apps locally
- Use two terminals:
  - Terminal A: backend/ → uvicorn app.main:app --reload --port 8000
  - Terminal B: frontend/ → npm run dev
- Postgres and Redis are provided via docker-compose (see Infrastructure below).

Infrastructure (Docker Compose)
- Start: docker compose up -d
- Stop: docker compose down
- Logs: docker compose logs -f db | docker compose logs -f redis
- Reset data (drops volumes): docker compose down -v
- psql shell: docker compose exec db psql -U postgres -d eps_mis

Environment variables used by backend
- DATABASE_URL (default: postgresql+psycopg://postgres:postgres@localhost:5432/eps_mis)
- REDIS_URL (default: redis://localhost:6379/0)

High-level architecture and structure
- Roles and RBAC: The MIS is role-based (Student, Teacher, Headmaster, Directors, Accountant, Registrar, Patron/Matron, IT). Authorization should enforce RBAC on backend endpoints and frontend routes.
- Backend layers (intended):
  - API (FastAPI routers) → dependency-injected services → data access (SQLAlchemy ORM).
  - Schemas (Pydantic v2) for request/response models.
  - Auth: OAuth2 password flow issuing JWTs; httpOnly cookies on the client; password hashing (passlib) and token signing (python-jose).
  - Persistence: PostgreSQL; migrations via Alembic.
  - Async/caching: Redis for background jobs and notifications.
  - Reporting: WeasyPrint for PDFs (e.g., bulletins), OpenPyXL for Excel, plus CSV exports.
- Frontend layers (intended):
  - Next.js (App Router) with MUI for UI.
  - Data fetching with TanStack Query; optimistic updates where appropriate (e.g., attendance/discipline).
  - Forms and validation via React Hook Form + Zod.
  - Centralized API client (Axios or fetch) with auth interceptors; route protection via middleware and role checks.
- Core domains (phase 1 per README): Enrollment/Records, Timetable/Classes, Attendance/Discipline, Assessment/Grading/Transcripts, Fees/Billing/Payments, Messaging/Notifications/Parent Portal, Reporting/Analytics.

Notes for future setup
- Add CI and pre-commit hooks (Ruff/Black/mypy, ESLint/Prettier, tests).
