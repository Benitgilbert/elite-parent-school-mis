# Elite Parent School MIS

A role-based Management Information System (MIS) for Elite Parent School. The MIS digitizes core school operations and provides self-service reporting for parents and staff.

## Tech Stack
- Frontend: Next.js 16 (TypeScript), React 19, Material UI, TanStack Query, React Hook Form, Zod
- Backend: FastAPI, SQLAlchemy 2.x, Pydantic, Uvicorn
- Database: PostgreSQL (docker-compose provided)
- Cache/Jobs: Redis (docker-compose provided)
- Auth: JWT with httpOnly cookie, optional bearer header; RBAC per role
- Reporting/Exports: WeasyPrint (PDF), OpenPyXL (Excel), CSV exports

## Roles and Dashboards
- Teacher: Overview, Grade Entry, My Students, Report Cards, Attendance, Class Analytics
- Dean / Director of Studies: Assign teachers to classes/subjects, Academic Settings (Terms, Classes, Grading Scales)
- Secretary: Applications, Students, Class Assignment, Attendance, Exams, Communications
- Admin/IT Support: Admin tools and system utilities

## Implemented Features
- Teacher Dashboard
  - Grade Entry: editable table, debounced autosave, CSV upload/template download, restricted to assigned classes/subjects
  - Report Cards: per-student view and CSV export
  - Attendance: per-class daily presence/absence with bulk All Present/All Absent
  - Analytics: class/term filters, KPIs, subject breakdown, CSV export
- Dean Tools
  - Teacher Assignments: assign class/subject to teachers; only assigned combos visible to teachers across pages
  - Academic Settings: Terms, Classes, Grading Scales with visibility fixes for dark themes
- Auth & Access
  - Login sets httpOnly JWT cookie; logout clears it
  - Backend guards expanded to include Dean/Director of Studies where applicable
- UI/Theme
  - Dean layout and tabs adjusted for proper contrast; global logout page

## Project Structure
- backend/app/main.py: FastAPI app, routers, CORS, health check
- backend/app/routers/: auth, users, students, secretary, attendance, exams, teachers, analytics, report_cards, academics, admin, discipline, timetable
- backend/app/models.py: ORM models (users, roles, students, attendance, assessments, exam results, terms, classes, grading scales, teachers, teacher_assignments)
- frontend/src/app/: Next.js App Router
  - teacher/: dashboard pages (grade-entry, attendance, report-cards, analytics)
  - dean/: assignments and settings; layout with AppBar + drawer
  - secretary/: applications, students, class assignment, attendance, exams
  - admin/: admin dashboard and users
  - login, logout, me, page.tsx (root), layout.tsx, theme-registry, providers
- next.config.ts: dev proxy rewrites /api/* to http://127.0.0.1:8000
- docker-compose.yml: postgres and redis services for local dev

## Local Development
1) Start infrastructure (optional but recommended)

```bash
docker compose up -d
```

2) Backend (FastAPI)

```bash
# from backend/
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

3) Frontend (Next.js)

```bash
# from frontend/
npm install
npm run dev
# open http://localhost:3000
```

Frontend proxies API calls to the backend via Next.js rewrites:
- /api/:path* -> http://127.0.0.1:8000/:path*

## Authentication
- POST /api/auth/login sets an httpOnly cookie with the JWT.
- Client may also include Authorization: Bearer <token> (stored in localStorage when needed).
- POST /api/auth/logout clears the cookie; a dedicated frontend route /logout performs logout and redirects to /login.

## Key API Endpoints (non-exhaustive)
- Auth: /api/auth/login, /api/auth/logout, /api/users/me
- Students: /api/students
- Attendance: /api/attendance
- Exams/Assessments/Results: /api/exams/* (teachers limited to assigned class/subject)
- Teachers & Assignments: /api/teachers/*
- Academics Settings: /api/settings/academics/*
- Report Cards: /api/report-cards/* (CSV)
- Analytics: /api/analytics/* (CSV)

## Notes
- Database tables are auto-created in development (see app.main). Use Alembic for production migrations.
- WeasyPrint is optional; if missing, PDF features will warn accordingly.
- Some endpoints enforce RBAC and will return 403 for unauthorized roles.

## License
Proprietary – for Elite Parent School use.
