# CampusGuard Pro (CMADMS — Campus Movement & Attendance Decision Support System)

[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19.0-cyan.svg)](https://react.dev/)
[![TanStack Start](https://img.shields.io/badge/TanStack_Start-1.168-orange.svg)](https://tanstack.com/router/latest)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14+-blue.svg)](https://www.postgresql.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4.2-38bdf8.svg)](https://tailwindcss.com/)
[![Build Status](https://img.shields.io/badge/Build-SUCCESS-brightgreen.svg)]()
[![Security Tests](https://img.shields.io/badge/Security_Hardening-16%2F16_PASS-brightgreen.svg)]()
[![Workflow Tests](https://img.shields.io/badge/Complete_Workflow-28%2F28_PASS-brightgreen.svg)]()
[![Timetable Integrity](https://img.shields.io/badge/Timetable_Integrity-642%2F642_PASS-brightgreen.svg)]()
[![Realtime Notifications](https://img.shields.io/badge/Realtime_Notifications-15%2F15_PASS-brightgreen.svg)]()
[![Security PWA](https://img.shields.io/badge/Security_PWA-17%2F17_PASS-brightgreen.svg)]()
[![Edge Cases](https://img.shields.io/badge/Real--World_Edge_Cases-15%2F15_PASS-brightgreen.svg)]()

**CampusGuard Pro (CMADMS)** is an enterprise full-stack campus management platform designed to automate student movement permissions, gate QR code security checks, class attendance verification, disciplinary violation handling, emergency response dispatch, real-time notifications, mobile PWA gate operations, and institutional audit logging.

---

## 🏛️ System Architecture

CMADMS is built on a type-safe full-stack architecture using **TanStack Start**, **React 19**, **Tailwind CSS v4**, and **PostgreSQL**:

```
Institutional User Roles (Student, Faculty, Security, HOD, Admin)
                      ↓
 Role-Based Portals (/student, /faculty, /security, /hod, /admin)
                      ↓
 Application & Security Tier (TanStack Start, HttpOnly Sessions, Zod)
                      ↓
 Business Logic (Pass Engine, Timetable Engine, Violation Lifecycle, Emergency Command)
                      ↓
 PostgreSQL Database & Event Bus (Profiles, Schedules, Permissions, Notifications, Audit Logs)
```

---

## 🛠️ Technology Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend UI** | React 19, Tailwind CSS v4, Radix UI, Lucide Icons | Responsive role-based portals & UI components |
| **Meta-Framework** | TanStack Start, TanStack React Router | Full-stack server functions (`createServerFn`) & file routing |
| **Database Tier** | PostgreSQL (`pg` Pool) | Relational database tier with connection pool error handling |
| **Data Validation** | Zod v3.24 | Schema validation for APIs, forms, and environment variables |
| **Security & Auth** | Node.js Crypto (`scrypt` with per-user 16-byte salt) | `salt:derivedHash` password hashing & HttpOnly cookies |
| **PWA & Mobile** | Web App Manifest, Service Worker | Mobile-first offline-aware Security Gate verification app |
| **Real-Time Bus** | Node.js Event Emitter Server Bus | Instant targeted notifications with 15s polling fallback |
| **QR Code Engine** | `qrcode`, `jsqr` | Digital QR pass generation & camera gate verification |
| **Build System** | Vite, Nitro | High-performance dev server & production bundle compiler |

---

## 🔒 Security Features

1. **Per-User Salted Password Hashing**: Uses `crypto.scryptSync()` with unique 16-byte random salts per password (`salt:derivedHash`).
2. **Transparent Legacy Password Migration**: Automatically upgrades legacy single-secret password hashes to `salt:derivedHash` in PostgreSQL upon successful login.
3. **Timing-Safe Comparison**: Hashes are compared using `crypto.timingSafeEqual()` to prevent timing side-channel attacks.
4. **Login Rate Limiting**: In-memory rate limiter enforces a 5-attempt limit per 15-minute window with generic non-revealing error responses.
5. **Server-Side RBAC**: Every server function enforces strict role validation (`requireRole`, `requireAnyRole`) on the server side.
6. **HOD Departmental Isolation**: SQL queries enforce strict department filters (`WHERE UPPER(department) = UPPER($dept)`).
7. **Server-Authoritative Time Engine**: Pass validity windows evaluated using PostgreSQL `CURRENT_DATE` and `CURRENT_TIME`.
8. **PWA Cache Restrictions**: Service Worker explicitly bypasses `/api` routes from caching to guarantee zero stale authorization states.

---

## 👥 Role & Portal Matrix

- **Student Portal** (`/student/dashboard`, `/student/passes`, `/student/explanations`): Submit movement pass requests, display digital QR pass tokens, and submit mandatory 24h violation explanations.
- **Faculty Portal** (`/faculty/dashboard`, `/faculty/check`, `/faculty/reports`): Verify student presence against active timetable slots, detect unauthorized movements, and submit explicit violation reports.
- **Security Gate Portal** (`/security/dashboard`, `/security/check`): Scan QR pass tokens, evaluate time validity windows (`BEFORE_VALIDITY`, `ACTIVE`, `EXPIRED`), authorize Early Exit overrides, and record gate timestamps via Mobile PWA.
- **HOD Decision Portal** (`/hod/dashboard`, `/hod/passes`, `/hod/cases`): Approve movement pass applications, investigate departmental violation cases, and issue formal resolution or dismissal orders (**Final Departmental Authority**).
- **Admin Command Center** (`/admin/dashboard`, `/admin/users`, `/admin/timetable`, `/admin/emergency`, `/admin/audit-logs`): Manage institutional master data, emergency response dispatches, user roles, and immutable audit logs.

---

## 📚 Complete Project Documentation Package

Detailed academic and presentation documentation files are available under `docs/`:

- **[Project Overview](file:///d:/patrol/docs/project-overview.md)** — Problem statement, objectives, RBAC matrix, achievements, and 60s pitch.
- **[System Architecture](file:///d:/patrol/docs/system-architecture.md)** — Multi-tier architecture diagrams and layer responsibilities.
- **[Workflows & State Machines](file:///d:/patrol/docs/workflows.md)** — 5 role lifecycles and 6-stage Emergency Incident Command workflow.
- **[Security Architecture](file:///d:/patrol/docs/security-architecture.md)** — Implemented security mechanisms and hardening controls.
- **[Testing & Subsystems](file:///d:/patrol/docs/testing-report.md)** — Timetable integrity, real-time notifications, PWA, database schemas, master test matrix.
- **[Live Demo Script](file:///d:/patrol/docs/demo-script.md)** — 15-step chronological presentation demo script.
- **[Viva Questions & Answers](file:///d:/patrol/docs/viva-questions.md)** — 30 comprehensive viva questions with concise answers.
- **[Future Scope Roadmap](file:///d:/patrol/docs/future-scope.md)** — Implemented baseline vs future roadmap.
- **[Presentation Notes](file:///d:/patrol/docs/project-presentation-notes.md)** — Slide-by-slide presentation deck notes.

---

## ⚡ Quick Start & Development

### 1. Prerequisites
- Node.js v18.x or higher
- PostgreSQL v14.x or higher

### 2. Installation & Setup
```bash
# Clone the repository
git clone https://github.com/Hanish0717/campus-guard-pro.git
cd campus-guard-pro

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env
```

### 3. Running Development Server
```bash
npm run dev
```
Open [http://localhost:8081](http://localhost:8081) in your browser.

---

## 🧪 Verification & Testing Commands

Execute all 6 automated test suites to verify system integrity (733/733 points PASS):

```bash
# 1. Real-World Edge-Case Suite (15/15 PASS)
npx tsx ./scratch/test-real-world-edge-cases.ts

# 2. Security Hardening Suite (16/16 PASS)
npx tsx ./scratch/test-security-hardening-suite.ts

# 3. Complete End-to-End Workflow Audit (28/28 PASS)
npx tsx ./scratch/test-complete-workflow.ts

# 4. Faculty Timetable Integrity Audit (642/642 PASS)
npx tsx ./scratch/test-faculty-timetable-integrity.ts

# 5. Real-Time Notification System Test (15/15 PASS)
npx tsx ./scratch/test-realtime-notifications.ts

# 6. Security Gate PWA Test Suite (17/17 PASS)
npx tsx ./scratch/test-security-pwa.ts

# 7. TypeScript Static Type Check (0 Errors)
npx tsc --noEmit
```

---

## 📦 Production Build & Deployment

```bash
# 1. Build production bundle
npm run build

# 2. Start production server
npm start
```

