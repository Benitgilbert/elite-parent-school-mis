# Elite Parent School MIS

A role-based Management Information System (MIS) for Elite Parent School. The MIS digitizes core school operations and provides self-service reporting for parents and staff.

## Tech Stack
- Frontend: Next.js 16 (TypeScript), React 19, Material UI, TanStack Query, React Hook Form, Zod, Recharts (data visualization)
- Backend: FastAPI, SQLAlchemy 2.x, Pydantic, Uvicorn, Python-multipart, Email libraries
- Database: PostgreSQL (docker-compose provided)
- Cache/Jobs: Redis (docker-compose provided)
- Auth: JWT with httpOnly cookie, optional bearer header; RBAC per role
- Reporting/Exports: WeasyPrint (PDF), OpenPyXL (Excel), CSV exports
- Communication: Email templates, SMS integration, Background task processing
- Notifications: Real-time notification system with multi-channel support

## Roles and Dashboards

### Teaching Staff
- **Teacher**: Overview, Grade Entry, My Students, Report Cards, Attendance, Class Analytics
- **Dean / Director of Studies**: Teacher assignments, Academic Settings, Class Reports, Analytics, Teacher Performance

### Administrative Staff
- **Secretary**: Applications, Students, Class Assignment, Attendance, Exams, Communications
- **Accountant**: Fee Collection, Financial Reports, Expenses, Payroll, Analytics
- **Admin/IT Support**: System Administration, User Management, Database Tools, Security Center

### Support Staff
- **Matron**: Student Welfare, Discipline Cases, Reports
- **Patron**: Student Discipline, Case Management, Reports

### Management
- **Director**: School-wide Analytics, Approvals, Teacher Management, Settings

## Implemented Features

### Core Management Modules
- **Teacher Dashboard**
  - Grade Entry: editable table, debounced autosave, CSV upload/template download, restricted to assigned classes/subjects
  - Report Cards: per-student view and CSV export
  - Attendance: per-class daily presence/absence with bulk All Present/All Absent
  - Analytics: class/term filters, KPIs, subject breakdown, CSV export

- **Dean Tools**
  - Teacher Assignments: assign class/subject to teachers; only assigned combos visible to teachers across pages
  - Academic Settings: Terms, Classes, Grading Scales with visibility fixes for dark themes
  - Class Reports: comprehensive analytics with CSV export capabilities
  - Teacher Performance: analytics and export tools

- **Secretary Module**
  - Student Management: comprehensive student records and class assignments
  - Applications: admission processing and management
  - Attendance: daily attendance tracking and reporting
  - Exams: assessment and results management
  - Communications: integrated communication tools

### Financial Management
- **Fee Management System**
  - Fee Invoices: create, manage, and track student fee invoices
  - Fee Payments: record and process payments with automatic balance updates
  - Fee Structures: configurable fee components (tuition, boarding, activities, exams)
  - Fee Waivers: manage fee exemptions and discounts
  - Overdue Tracking: automatic late fee calculation and overdue notifications
  - Financial Reporting: comprehensive fee collection reports and analytics

- **Accounting Module**
  - Expense Management: track and categorize school expenses
  - Payroll Processing: staff salary management and reporting
  - Financial Analytics: revenue, expenses, and net income tracking
  - Export Capabilities: CSV exports for fees, expenses, and payroll

### Communication & Notifications
- **Communication System**
  - Email Templates: customizable templates for various notifications
  - Bulk Messaging: send emails and SMS to groups of recipients
  - Individual Messaging: targeted communication to specific students/parents
  - Parent Notifications: automated updates on student progress

- **Notification Service**
  - Real-time Notifications: instant updates for grades, attendance, fees, discipline
  - Email Integration: HTML email templates with advanced formatting
  - SMS Support: text message notifications for critical updates
  - Preference Management: users can customize notification preferences
  - Background Tasks: automated fee reminders and overdue notifications

### Advanced Features
- **Analytics & Reporting**
  - Comprehensive Analytics: performance tracking across all modules
  - Export Functionality: CSV, PDF, and Excel exports throughout the system
  - Report Generation: automated monthly statements and performance reports
  - Data Visualization: charts and graphs for key metrics

- **Discipline & Welfare**
  - Case Management: track disciplinary incidents and resolutions
  - Parent Notifications: automatic alerts for serious incidents
  - Reporting: comprehensive discipline reports with export capabilities

- **Mobile Responsiveness**
  - Responsive Design: optimized for mobile devices across all user roles
  - Mobile Navigation: touch-friendly interfaces for smartphones and tablets
  - Cross-platform Compatibility: works on iOS, Android, and desktop browsers

### Administrative Tools
- **System Administration**
  - User Management: comprehensive user and role management
  - System Settings: configurable system parameters
  - Database Tools: backup, export, and maintenance utilities
  - Security Center: audit logs and security monitoring

- **Integration Features**
  - Background Task Processing: automated fee calculations and notifications
  - Multi-format Exports: support for CSV, PDF, and Excel formats
  - API Integration: comprehensive REST API for all functionalities

## Project Structure
- backend/app/main.py: FastAPI app, routers, CORS, health check
- backend/app/routers/: auth, users, students, secretary, attendance, exams, teachers, analytics, report_cards, academics, admin, discipline, timetable, fees, accounting, communication, notifications
- backend/app/models.py: ORM models (users, roles, students, attendance, assessments, exam results, terms, classes, grading scales, teachers, teacher_assignments, fee invoices, payments, structures, waivers, notifications, communication templates)
- backend/app/notification_service.py: comprehensive notification and email service
- backend/app/background_tasks.py: automated fee reminders and overdue notifications
- backend/app/mailer.py: email sending functionality with HTML templates
- frontend/src/app/: Next.js App Router
  - teacher/: dashboard pages (grade-entry, attendance, report-cards, analytics)
  - dean/: assignments, settings, class-reports, analytics, teacher-performance
  - secretary/: applications, students, class-assignment, attendance, exams, communications
  - accountant/: fees, expenses, payroll, reports
  - admin/: admin dashboard, users, tools, settings
  - student/: dashboard, fees, grades, attendance, progress
  - matron/: cases, reports
  - patron/: cases, reports
  - director/: analytics, approvals, teachers, settings
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
- **Fees Management**: /api/fees/*, /api/accounting/fees/*
- **Communication**: /api/communication/* (templates, messaging)
- **Notifications**: /api/notifications/* (preferences, management)
- **Discipline**: /api/discipline/* (cases, reports)
- **Admin Tools**: /api/admin/* (users, system, exports)

## Enhanced Features

### Authentication & Security
- **JWT Authentication**: httpOnly cookie-based authentication with optional bearer token support
- **Role-Based Access Control (RBAC)**: granular permissions for all user roles
- **Session Management**: secure logout and session handling
- **Security Center**: audit logs and security monitoring tools

### Data Export & Reporting
- **Multi-format Exports**: CSV, PDF, and Excel export capabilities across all modules
- **Automated Reports**: scheduled report generation and delivery
- **Custom Analytics**: comprehensive analytics with data visualization
- **Real-time Data**: live dashboards with up-to-date information

### Communication & Engagement
- **Multi-channel Notifications**: email, SMS, and in-app notifications
- **Template System**: customizable communication templates
- **Bulk Communication**: mass messaging capabilities for announcements
- **Parent Portal**: dedicated interface for parents to track student progress

### Automation & Background Processing
- **Automated Workflows**: fee reminders, overdue notifications, and report generation
- **Background Tasks**: scheduled processing for routine operations
- **Integration Services**: seamless communication between modules

## Notes
- Database tables are auto-created in development (see app.main). Use Alembic for production migrations.
- WeasyPrint is optional; if missing, PDF features will warn accordingly.
- Some endpoints enforce RBAC and will return 403 for unauthorized roles.
- Background task processing requires Redis for optimal performance.
- Email functionality requires proper SMTP configuration.
- Mobile responsiveness is implemented across all user interfaces.

## License
Proprietary – for Elite Parent School use.
