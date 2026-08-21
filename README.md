# CMADMS — Campus Movement & Administration Digital Management System

[![Build Status](https://img.shields.io/badge/build-passing-emerald.svg)](file:///d:/patrol)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19.2-61dafb.svg)](https://react.dev/)
[![TanStack Router](https://img.shields.io/badge/TanStack%20Router-1.170-ff4154.svg)](https://tanstack.com/router)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-pg%208.23-336791.svg)](https://www.postgresql.org/)

**CMADMS (Campus Movement & Administration Digital Management System)** is an enterprise-grade, role-based campus governance and safety platform. It automates student corridor and gate movement permissions, digital QR pass verifications, faculty-to-HOD disciplinary violation reporting, 24-hour student explanation due process, and real-time campus Emergency Command Center incident response.

---

## 📋 Table of Contents

- [Overview & Core Value](#-overview--core-value)
- [Technology Stack](#-technology-stack)
- [System Architecture](#-system-architecture)
- [User Roles & Permissions](#-user-roles--permissions)
- [Directory & Module Hierarchy](#-directory--module-hierarchy)
- [Core Workflows](#-core-workflows)
  - [1. Student Movement Pass & QR Gate Check](#1-student-movement-pass--qr-gate-check)
  - [2. Faculty Incident Reporting & HOD Case Investigation](#2-faculty-incident-reporting--hod-case-investigation)
  - [3. Emergency Command Center Workflow](#3-emergency-command-center-workflow)
- [Database Architecture](#-database-architecture)
- [Authentication & Security](#-authentication--security)
- [Getting Started & Installation](#-getting-started--installation)
- [Verification & Production Build](#-verification--production-build)
- [Project Presentation Guide](#-project-presentation-guide)

---

## 🎯 Overview & Core Value

Traditional educational institutions struggle with unmonitored student movement during lecture hours, slow paper-based pass approvals, manual gate verification delays, unverified student absence claims, and fragmented crisis responses.

**CMADMS** solves these challenges by connecting Students, Faculty, Security Officers, Department HODs, and Administrators into a unified digital ecosystem:

- **Automated Corridor & Gate Movement**: Replaces paper slips with cryptographically signed digital QR passes and server-authoritative time-window validation.
- **Closed-Loop Disciplinary Governance**: Faculty observations link directly to real-time classroom timetables, triggering 24-hour student explanation windows before HOD case resolution.
- **Emergency Crisis Management**: Real-time incident command tracking response states (`Active` → `Responding` → `Controlled` → `Resolved`) with response duration analytics.
- **Immutable Auditability**: Complete chronological audit trail for all movement permissions, early exit overrides, case resolutions, and emergency command transitions.

---

## 💻 Technology Stack

| Layer | Technology | Version | Purpose & Description |
| :--- | :--- | :--- | :--- |
| **Frontend UI** | React | `19.2.0` | UI component rendering with Server Functions integration |
| **Language** | TypeScript | `5.8.3` | Strict static typing across client components, API routes, and DB schemas |
| **Routing & SSR** | TanStack Router & Start | `1.170.18` / `1.168.32` | Type-safe SSR file-based routing with server functions (`createServerFn`) |
| **Styling & System** | Tailwind CSS & CVA | `4.2.1` / `0.7.1` | Tailored HSL theme, glassmorphism, responsive utilities, variant handling |
| **UI Primitives** | Radix UI & Lucide Icons | Latest | Accessible modals, select dropdowns, switch controls, tabs, icons (`lucide-react`) |
| **State & Fetching** | TanStack Query & Context | `5.101.1` | Server-state caching and client authentication state context (`useAuth`) |
| **Notifications** | Sonner | `2.0.7` | Non-blocking toast notifications across all asynchronous user actions |
| **QR Code Engine** | `qrcode` & `jsqr` | `1.5.4` / `1.4.0` | Digital QR pass generation and client/security scanner decoding |
| **Server Runtime** | Vite SSR & Nitro | `8.2.0` / `3.0` | Full-stack JavaScript/TypeScript server execution environment |
| **Database** | PostgreSQL | `pg 8.23.0` | Native database query parameterization via connection pooling |
| **Session Security**| HTTP-Only Cookie Sessions | Custom | Server-authoritative session validation with 24-hour expiration |

---

## 🏗️ System Architecture

```
         +-------------------------------------------------------+
         |                    Browser / Client                   |
         |  React 19 + TanStack Router + Tailwind CSS + Lucide  |
         +---------------------------+---------------------------+
                                     |
                                     | HTTP Cookies / Server Fn
                                     v
         +-------------------------------------------------------+
         |                  TanStack Start Server                |
         |  Vite SSR + Nitro Runtime + Session Middleware        |
         +---------------------------+---------------------------+
                                     |
                                     | Parameterized SQL (pg Pool)
                                     v
         +-------------------------------------------------------+
         |                 PostgreSQL Database                   |
         |  users | auth_sessions | permissions | violations     |
         |  emergency | gate_verifications | audit_logs          |
         +-------------------------------------------------------+
```

---

## 👥 User Roles & Permissions

CMADMS enforces strict **Role-Based Access Control (RBAC)** across five distinct roles:

### 1. Student (`student`)
- **Dashboard**: `/student/dashboard`
- **Capabilities**: Request movement permission passes, view active/historical digital QR passes, submit mandatory 24-hour explanation statements for flagged violations, view personal notification feed and academic timetable.

### 2. Faculty (`faculty`)
- **Dashboard**: `/faculty/dashboard`
- **Capabilities**: Conduct real-time student verification against live classroom timetables (`/check`), check student pass validity, file official violation reports with evidence photo attachments, track submitted reports.

### 3. Security (`security`)
- **Dashboard**: `/security/check`
- **Capabilities**: Scan digital QR passes or enter Roll Numbers at campus gates, evaluate server-authoritative time windows, grant authorized early exits with mandatory override logging, record physical entry/exit timestamps.

### 4. Head of Department (`hod`)
- **Dashboard**: `/hod/dashboard`
- **Capabilities**: Authorize or reject departmental movement pass requests, investigate student violation reports, evaluate attached evidence and student 24h explanations, render binding resolution or dismissal decisions.

### 5. Administrator (`admin`)
- **Dashboard**: `/admin/dashboard`
- **Capabilities**: Command Emergency Center operations (acknowledge, assign responders, mark controlled, resolve), oversee global compliance and violations, manage system users/roles (`/admin/users`), configure campus setup (departments, courses, rooms), inspect system audit logs.

---

## 📁 Directory & Module Hierarchy

```
d:/patrol/src/
├── components/                 # Shared UI components
│   ├── ui/                     # Radix UI + Tailwind primitives (Button, Input, Dialog, Sheet)
│   ├── page-header.tsx         # Standardized page header with breadcrumbs
│   ├── role-guard.tsx          # Client-side RBAC protection component
│   ├── qr-code.tsx             # QR Code generator component
│   └── status-badge.tsx        # Semantic badge indicators
├── lib/                        # Core libraries, API contracts & server database layer
│   ├── api/                    # Server function API exports (student, faculty, security, hod, admin)
│   ├── db/                     # PostgreSQL database query implementations (*.server.ts)
│   ├── auth.tsx                # React authentication context provider (useAuth)
│   ├── db.server.ts            # PostgreSQL connection pool setup
│   └── session.server.ts       # Server HTTP cookie session validation middleware
└── routes/                     # TanStack Router file-based route definitions
    ├── auth.tsx                # Portal Selection & Login page
    ├── check.tsx               # Student Verification & Incident Reporting console
    ├── reports.$reportId.tsx   # Detailed Case Report view
    ├── admin/                  # Admin Portal (emergency, violations, users, setup, audit-logs)
    ├── faculty/                # Faculty Portal (dashboard, passes, reports, timetable)
    ├── hod/                    # HOD Portal (dashboard, violations, cases, passes, analytics)
    ├── security/               # Security Portal (check, passes, profile)
    └── student/                # Student Portal (dashboard, passes, explanations, profile)
```

---

## 🔄 Core Workflows

### 1. Student Movement Pass & QR Gate Check

```
[Student Application] ---> [HOD Review Queue] ---> (Approved?) 
                                                        |
                                                 (Yes)  v
[Security Gate Logged] <--- [Time-Window Evaluation] <--- [Digital QR Pass Generated]
```

1. **Application**: Student applies at `/student/passes` providing movement reason, date, `validFrom`, and `validUntil`.
2. **Authorization**: Department HOD reviews pass at `/hod/passes` and approves request.
3. **QR Generation**: System generates a digital QR code containing the signed pass ID.
4. **Gate Verification**: Security scans QR code at `/security/check`. The server evaluates current server time:
   - **Within Window**: Gate exit allowed immediately.
   - **Before Validity**: Marked `NOT STARTED`. Security can issue an `[ ALLOW EARLY EXIT ]` override log.
   - **Expired**: Marked `EXPIRED` and exit rejected.
5. **Timestamping**: System logs exact physical `exit_at` and `entry_at` timestamps in `movement_permissions`.

### 2. Faculty Incident Reporting & HOD Case Investigation

```
[Faculty Timetable Check] ---> [Violation Filed + Evidence] ---> [Case Status: Reported]
                                                                        |
                                                                        v
[Binding Decision Logged] <--- [HOD Review & Explanation] <--- [Student 24h Explanation Window]
```

1. **Verification**: Faculty searches student roll number at `/check` to verify classroom schedule vs current location.
2. **Filing**: If unauthorized, Faculty files a report with severity level, remarks, and optional evidence photo.
3. **Student Due Process**: Case status becomes `reported`. Student is notified and given a 24-hour countdown window at `/student/explanations` to submit an official explanation statement.
4. **HOD Case Review**: HOD inspects case at `/hod/violations`, evaluating historical timetable snapshot, faculty observation, photo evidence, and student explanation statement.
5. **Final Decision**: HOD renders a binding decision (`Resolve` with corrective action or `Dismiss` with reason).

### 3. Emergency Command Center Workflow

1. **Alert Trigger**: High-severity incident or violence report triggers emergency state (`active`).
2. **Acknowledgement**: Admin acknowledges crisis at `/admin/emergency` (`acknowledged`).
3. **Responder Assignment**: Security personnel assigned and dispatched to location (`responding`).
4. **Physical Control**: Admin/Security marks situation physical conflict ceased (`controlled`). Timer freezes.
5. **Resolution**: Mandatory resolution remarks recorded and emergency closed (`resolved`).

---

## 🗄️ Database Architecture

The system connects to PostgreSQL via parameterized direct SQL connection pooling (`pg.Pool`).

```
                              +--------------------+
                              |       users        |
                              +---------+----------+
                                        |
      +------------------+--------------+--------------+-------------------+
      |                  |                             |                   |
      v                  v                             v                   v
+-----+------------+ +---+-------------------+ +-------+-----------+ +-----+------------+
|  auth_sessions   | | movement_permissions  | | violation_reports | |emergency_incidents|
+------------------+ +-----------+-----------+ +---------+---------+ +--------+---------+
                                 |                       |                  |
                                 v                       v                  v
                     +-----------+-----------+ +---------+---------+ +--------+---------+
                     |   gate_verifications  | |violation_audit_log| | emergency_log/resp|
                     +-----------------------+ +-------------------+ +------------------+
```

### Key Database Tables

- **`users`**: User records, credentials, roll/staff code, role (`student`, `faculty`, `security`, `hod`, `admin`), department.
- **`auth_sessions`**: HTTP-Only session IDs, user ID, role, 24-hour expiration dates.
- **`movement_permissions`**: Student pass requests, reason, date, valid times, status (`pending`, `approved`, `rejected`), exit/entry timestamps.
- **`gate_verifications`**: Security gate scans, pass ID, staff code, outcome (`allowed`, `rejected`, `early_exit`), override reasons.
- **`violation_reports`**: Incident reports, student code, severity, violation category, faculty remarks, evidence photo, student explanation, HOD decision.
- **`violation_audit_logs`**: Immutable audit logs tracking violation status transitions.
- **`emergency_incidents`**: Emergency crises, incident type, severity, location, status (`active`, `acknowledged`, `responding`, `controlled`, `resolved`), time metrics.
- **`emergency_audit_logs`**: Chronological audit trail for emergency actions.
- **`notifications`**: User notification alerts (`user_id`, `title`, `message`, `read`, `created_at`).

---

## 🔐 Authentication & Security

- **Cookie Sessions**: Authentication relies on `cmadms_session` HTTP-Only cookies.
- **Server Middleware**: Every server function executes `requireAuthenticatedUser(request)` or `requireRole(request, allowedRoles)` in `src/lib/session.server.ts`.
- **Client Route Guards**: UI components wrap protected screens with `<RoleGuard allowedRoles={["..."]}>`, automatically redirecting unauthorized roles to `/auth`.
- **SQL Parameterization**: All database operations use strictly parameterized SQL queries (`$1, $2`), preventing SQL injection risks.

---

## 🚀 Getting Started & Installation

### Prerequisites

- **Node.js**: `v18.0.0` or higher
- **npm**: `v9.0.0` or higher
- **PostgreSQL**: `v14` or higher

### Environment Configuration

Create a `.env` file in the root directory:

```env
DATABASE_URL="postgresql://username:password@localhost:5432/cmadms_db"
SESSION_SECRET="your-secure-random-session-secret"
```

### Installation Steps

1. **Clone Repository**:
   ```bash
   git clone https://github.com/Hanish0717/campus-guard-pro.git
   cd campus-guard-pro
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Start Development Server**:
   ```bash
   npm run dev
   ```
   Open `http://localhost:8080` (or displayed Vite port) in your browser.

---

## 🧪 Verification & Production Build

To verify code formatting, static types, and production bundle compilation:

```bash
# Run TypeScript static type check
npx tsc --noEmit

# Build production bundle
npm run build

# Preview production build locally
npm run preview
```

---

## 🎤 Project Presentation Guide

If presenting CMADMS to a evaluator, professor, or technical interviewer:

1. **30s Pitch**: *"CMADMS is a digital campus movement and administration system that replaces manual pass slips and unmonitored student movement with QR-verified permissions, automated 24-hour explanation workflows, and an Emergency Command Center."*
2. **Demo Flow**:
   - Log in as **Student** (`23CSE1044`) $\rightarrow$ Apply for a Movement Pass.
   - Log in as **HOD** (`hod_cse`) $\rightarrow$ Approve the pending pass request.
   - Switch back to **Student** $\rightarrow$ Show generated digital **QR Code Pass**.
   - Log in as **Security** (`sec_gate1`) $\rightarrow$ Scan/enter pass ID at `/security/check` and show server time-window verification.
   - Log in as **Faculty** (`fac_cse1`) $\rightarrow$ Perform live classroom timetable verification at `/check` and file a violation report.
   - Log in as **Admin** (`admin_main`) $\rightarrow$ Open `/admin/emergency` to demonstrate Emergency Command response tracking.

---

## 📜 License

This project is maintained for institutional campus safety and movement administration. All rights reserved. © 2026 CMADMS Team.
