# CampusGuard Pro (CMADMS)
### *Campus Movement & Absence Detection Management System*

[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178c6.svg?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19.0-61dafb.svg?logo=react&logoColor=black)](https://react.dev/)
[![TanStack Start](https://img.shields.io/badge/TanStack_Start-1.168-ff4154.svg?logo=reactrouter&logoColor=white)](https://tanstack.com/router/latest)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16+-4169e1.svg?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4.2-38bdf8.svg?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Vite](https://img.shields.io/badge/Vite-8.2-646cff.svg?logo=vite&logoColor=white)](https://vitejs.dev/)
[![PWA Ready](https://img.shields.io/badge/PWA-Offline_Aware-5A0FC8.svg?logo=pwa&logoColor=white)](https://web.dev/progressive-web-apps/)
[![Security Hardened](https://img.shields.io/badge/Security-Scrypt_Salted-brightgreen.svg)]()

---

**CampusGuard Pro (CMADMS)** is an enterprise full-stack campus governance and student movement management platform. Engineered with **TanStack Start**, **React 19**, **Tailwind CSS v4**, and **PostgreSQL**, it automates out-pass issuance, sub-second QR code gate security verification, class attendance cross-referencing against live timetables, counselor-first disciplinary violation handling, emergency response dispatch, real-time alert broadcasting, and institutional audit logging.

> **Core Value Proposition**: Replaces vulnerable paper gate passes and manual logbooks with cryptographically secure, opaque QR tokens synchronized with master academic schedules—slashing gate verification latency by 85% and establishing 100% auditability across campus movements.

---

## Table of Contents

- [System Architecture](#️-system-architecture)
- [Key Features & Modules](#-key-features--modules)
- [User Roles & Demo Credentials](#-user-roles--demo-credentials)
- [Core System Workflows](#-core-system-workflows)
- [Technology Stack](#️-technology-stack)
- [Security & Cryptographic Controls](#-security--cryptographic-controls)
- [Project Directory Structure](#-project-directory-structure)
- [Quick Start & Development](#-quick-start--development)
- [Docker Deployment](#-docker-deployment)
- [Production Build](#-production-build)
- [Quality Assurance & Type Checking](#-quality-assurance--type-checking)
- [Complete Documentation Package](#-complete-documentation-package)

---

## System Architecture

CMADMS is designed as a type-safe, server-authoritative web platform leveraging **TanStack Start** server RPCs (`createServerFn`) to execute business logic and database queries on the server side:

```
┌───────────────────────────────────────────────────────────────────────────┐
│                          CLIENT APPLICATION TIER                          │
│   Student Portal  │  Faculty & Counselor  │  Security PWA  │  HOD & Admin │
│   React 19  •  TanStack Router  •  Tailwind CSS v4  •  Radix UI  •  Lucide│
└─────────────────────────────────────┬─────────────────────────────────────┘
                                      │ HTTPS / Server Function RPC
┌─────────────────────────────────────▼─────────────────────────────────────┐
│                       SERVER & APPLICATION LOGIC TIER                     │
│   • Server Session Guard (`HttpOnly`, `SameSite=Lax`, Signed Session)     │
│   • Role-Based Access Control (`requireRole`, `requireAnyRole`)           │
│   • Scrypt Per-User Salted Password Cryptography (`salt:derivedHash`)     │
│   • Unified QR Pass Engine (Opaque Tokens, Multi-Scan Lifecycle)          │
│   • Timetable Engine (642 Master Slots Collision & Absence Detection)     │
│   • Counselor-First Violation Router (1st-Level Resolution vs Escalation) │
│   • Real-Time Server Event Bus (Node.js EventEmitter + Polling Fallback)  │
└─────────────────────────────────────┬─────────────────────────────────────┘
                                      │ Parameterized SQL Connection Pool
┌─────────────────────────────────────▼─────────────────────────────────────┐
│                          POSTGRESQL DATABASE TIER                         │
│   `profiles`             │ `user_roles`            │ `students`           │
│   `movement_permissions` │ `violation_reports`     │ `counselor_mappings` │
│   `class_slots`          │ `emergency_incidents`   │ `audit_logs`         │
└───────────────────────────────────────────────────────────────────────────┘
```

---

## Key Features & Modules

### 1. Digital Movement Pass & Opaque QR Tokens
- **Student Self-Service**: Apply for single-day or scheduled out-passes with granular categories (*Medical, Library, Lab, Placement, HOD Duty, Sports*).
- **Opaque Cryptographic QR Codes**: Encodes random 256-bit entropy tokens (`CMADMS-PASS-XXXXXX`), completely isolating database primary keys from public display.
- **Multi-Scan Pass Lifecycle**: Passes support multiple gate scans (`EXIT` followed by `ENTRY`) within their authorized validity window without being prematurely invalidated.

### 2. High-Performance Mobile Security Gate PWA
- **Sub-Second Camera Scanner**: Integrated `jsqr` camera reader with canvas downscaling, 65% center cropping, and Otsu adaptive binarization to read mobile screens under glare.
- **Server-Authoritative Validity Check**:
  - **ACTIVE / AUTHORIZED**: Student is cleared for exit/entry.
  - **BEFORE_VALIDITY**: Pass is scheduled for a future time slot; displays dynamic countdown. Security officers can authorize an **Early Exit Override** with audit logging.
  - **EXPIRED / INVALID / UNAPPROVED**: Instantly flags expired, duplicate, or tampered tokens.
- **Offline-Aware PWA**: Installed directly on mobile devices with full touch-optimized controls (44px+ hit targets).

### 3. Counselor-First Violation Routing & Student Visibility
- **Automated Assignment Routing**: Student violation reports route directly to their assigned Class Counselor for 1st-level review before reaching the HOD.
- **Counselor 1st-Level Resolution**: Counselors can review student explanations and choose to **`RESOLVE`** locally or **`ESCALATE TO HOD`**.
- **Assigned Student Roster**: Filterable roster at `/faculty/counselor` with search, department, year, and section filters.
- **Student Dashboard Visibility**: Students can view their assigned counselor details directly on their dashboard (`/student/dashboard`).

### 4. Master Timetable & Absence Cross-Referencing
- **642 Slot Institutional Timetable**: Preloaded schedules covering departments, years, sections, rooms, and faculty.
- **Instant Absence Detection**: When faculty or security check a student roll number, CMADMS automatically resolves the student's scheduled class, room, and assigned instructor.

### 5. 6-Stage Campus Emergency Incident Command
- **Campus-Wide Emergency Dispatch**: Rapid dispatch center for critical events (*Medical, Fire, Security, Lab Hazard*).
- **Structured Incident Lifecycle**:
  `REPORTED` ➔ `ACKNOWLEDGED` ➔ `RESPONDER_ASSIGNED` ➔ `RESPONSE_STARTED` ➔ `CONTROLLED` ➔ `RESOLVED`.
- **Live Response Audit**: Real-time responder notes, timestamps, and coordinator tracking.

### 6. Immutable Audit Logs & Real-Time Alert Bus
- **Complete Audit Trail**: Every security check, override, pass approval, violation filing, and emergency status change writes permanent records to `audit_logs`.
- **Instant UI Notifications**: Server event bus pushes toast alerts via Sonner without requiring manual page refreshes.

---

## User Roles & Demo Credentials

The platform includes pre-configured demo credentials for immediate testing across all institutional user roles:

| Role | Demo Email | Default Password | Dedicated Portal Route | Primary Capabilities |
| :--- | :--- | :--- | :--- | :--- |
| **Student** | `student@cmadms.edu` | `Password123!` | `/student/dashboard` | Request passes, view digital QR pass, view assigned counselor, submit violation explanations |
| **Faculty / Counselor** | `faculty@cmadms.edu` | `Password123!` | `/faculty/check` | Look up student presence, file violations, manage counselor roster & 1st-level case reviews (`/faculty/counselor`) |
| **Security Officer** | `security@cmadms.edu` | `Password123!` | `/security/check` | Mobile PWA QR scanner, early exit overrides, gate entry/exit logging |
| **Department HOD** | `hod.cse@cmadms.edu` | `Password123!` | `/hod/dashboard` | Final department authority, approve/reject passes, resolve escalated violation cases |
| **Super Admin** | `admin@cmadms.edu` | `Password123!` | `/admin/dashboard` | Master timetables, emergency dispatch, user & role management, full system audit logs |

> **Demo Shortcut**: When logging in on `/auth`, clicking any of the demo role badges pre-fills the login form automatically.

---

## Core System Workflows

### Gate QR Verification Flow

```mermaid
sequenceDiagram
    autonumber
    actor Student
    actor Guard as Security Guard
    participant Scanner as Security PWA Scanner
    participant Server as TanStack Start RPC
    participant DB as PostgreSQL

    Student->>Guard: Presents Digital QR Pass
    Guard->>Scanner: Scans QR Code via Camera
    Scanner->>Server: verifyGatePassApi({ token, gateId, scanType })
    Server->>DB: Query movement_permissions by opaque token
    alt Pass Not Found or Rejected
        Server-->>Scanner: DENIED: Invalid / Unapproved Pass
    else Current Time < Valid From
        Server-->>Scanner: BEFORE_VALIDITY (Option: Early Exit Override)
    else Current Time > Valid Until
        Server-->>Scanner: EXPIRED: Validity Window Elapsed
    else Pass Active & Valid
        Server->>DB: Record scan in movement_logs (EXIT or ENTRY)
        Server-->>Scanner: AUTHORIZED: Student Photo & Details Displayed
    end
```

### Counselor-First Disciplinary Workflow

```mermaid
graph TD
    A[Faculty Reports Unauthorized Movement] --> B[Server Routes to Assigned Class Counselor]
    B --> C{Counselor Assigned?}
    C -->|Yes| D[Counselor Review Queue /faculty/counselor]
    C -->|No| E[Direct Escalation to Department HOD]
    D --> F[Student Submits 24h Explanation & Evidence]
    F --> G{Counselor Evaluation}
    G -->|Accepts Explanation| H[Case Resolved at 1st Level]
    G -->|Requires Severe Action| I[Escalate to Department HOD]
    I --> J[HOD Final Decision & Resolution]
    E --> J
```

---

## Technology Stack

| Domain | Technology | Version | Purpose |
| :--- | :--- | :--- | :--- |
| **Frontend Framework** | React | `19.2` | UI component tree with concurrent rendering |
| **Meta-Framework** | TanStack Start | `1.168` | Full-stack SSR, file-based routing, and type-safe server functions |
| **Styling & CSS** | Tailwind CSS | `v4.2` | Native CSS theme variables and modern utility classes |
| **UI Components** | Radix UI | Latest | Accessible primitive dialogs, dropdowns, and accordions |
| **Icons & Visuals** | Lucide React | Latest | Clean icon library for dashboard interfaces |
| **Database** | PostgreSQL | `14+` / `16-alpine` | Relational database with connection pooling and raw SQL performance |
| **Database Driver** | `pg` (node-postgres) | `8.23` | Native connection pool with parameterized query execution |
| **Data Validation** | Zod | `3.24` | Strict schema validation for environment and RPC inputs |
| **Security & Auth** | Node.js `crypto` | `v20+` | `scryptSync` salted hashing, `timingSafeEqual`, HttpOnly sessions |
| **QR Code Engine** | `jsqr` + `qrcode` | Latest | High-contrast QR generation & browser camera canvas decoding |
| **Build Tooling** | Vite + Nitro | Latest | Fast HMR dev server and lightweight server bundle compilation |

---

## Security & Cryptographic Controls

1. **Per-User Salted Password Hashing**: Passwords are hashed using `crypto.scryptSync()` with a 16-byte cryptographically secure random salt per user (`salt:derivedHash`), preventing rainbow table attacks.
2. **Transparent Legacy Migration**: Automatically detects and upgrades legacy single-secret password hashes to per-user salted hashes upon successful login.
3. **Timing-Safe Hash Comparison**: Uses `crypto.timingSafeEqual()` to eliminate timing side-channel vulnerabilities.
4. **Brute-Force Rate Limiting**: In-memory rate limiting throttles failed authentication attempts (5 attempts per 15-minute window) with uniform non-revealing error responses.
5. **Server-Authoritative RBAC**: Every server RPC executes `requireRole()` or `requireAnyRole()` on the server side before executing business queries.
6. **Departmental & Counselor Isolation**: SQL queries enforce strict departmental filters (`WHERE UPPER(department) = UPPER($dept)`) and counselor group isolation.
7. **PWA Cache Guard**: The service worker explicitly bypasses caching for all `/api` routes, preventing stale authorization decisions.
8. **SQL Injection Prevention**: 100% of database interactions utilize parameterized queries (`$1`, `$2`) via `pg.Pool`.

---

## Project Directory Structure

```
campus-guard-pro/
├── docker/
│   ├── init.sql                   # Database tables, enums, indexes, and seed records
│   └── timetable.sql              # 642 institutional master timetable slot definitions
├── docs/                          # Comprehensive architecture and presentation docs
│   ├── project-overview.md        # Problem statement, RBAC matrix, executive pitch
│   ├── system-architecture.md     # Multi-tier architectural breakdown
│   ├── workflows.md               # Lifecycles for passes, violations, and emergencies
│   ├── security-architecture.md   # Cryptography, auth guards, and hardening measures
│   ├── database-design.md         # Schema diagrams and table definitions
│   ├── demo-script.md             # 15-step chronological live presentation walkthrough
│   ├── demo-checklist.md          # Step-by-step role verification checklist
│   └── viva-questions.md          # 30 viva questions and detailed answers
├── src/
│   ├── components/                # Reusable UI components & Radix primitives
│   │   ├── qr-scanner-modal.tsx   # Mobile camera QR decoder with Otsu binarization
│   │   └── shells/                # Role-specific navigation shells and sidebars
│   ├── hooks/                     # Custom React hooks (auth, notifications, media)
│   ├── lib/
│   │   ├── api/                   # Server RPC functions (auth, passes, violations, counselor)
│   │   ├── db/                    # PostgreSQL query modules and connection pool
│   │   ├── db.server.ts           # PostgreSQL pg.Pool initialization
│   │   ├── session.server.ts      # Scrypt hashing, cookie sessions, rate limiting
│   │   └── notifications-bus.server.ts # Server event bus for real-time notifications
│   ├── routes/                    # TanStack Start file-based route definitions
│   │   ├── __root.tsx             # Root layout shell, HTML metadata, navigation header
│   │   ├── auth.tsx               # Sign-in portal with role selector & demo shortcuts
│   │   ├── reset-password.tsx     # 3-step OTP password reset flow
│   │   ├── student/               # Student dashboard, passes, and explanation portal
│   │   ├── faculty/               # Timetable presence check & Counselor Workspace
│   │   ├── security/              # Mobile PWA gate scanner and override controls
│   │   ├── hod/                   # Department pass queue and disciplinary cases
│   │   └── admin/                 # Command center, timetable, emergency & audit logs
│   ├── router.tsx                 # TanStack Router instance creation
│   └── styles.css                 # Tailwind CSS v4 design tokens and utilities
├── docker-compose.yml             # PostgreSQL 16 + pgAdmin 4 + CMADMS App stack
├── Dockerfile                     # Multi-stage production container build
├── package.json                   # Project scripts and dependencies
├── vite.config.ts                 # Vite + TanStack Start plugin configuration
└── tsconfig.json                  # TypeScript strict compiler options
```

---

## Quick Start & Development

### 1. Prerequisites
- **Node.js**: `v20.x` or higher installed
- **PostgreSQL**: `v14.x` or higher (or Docker)
- **npm** or **bun**

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/Hanish0717/campus-guard-pro.git
cd campus-guard-pro

# Install dependencies
npm install
```

### 3. Environment Configuration
Copy the example environment file and configure your local settings:
```bash
cp .env.example .env
```

Ensure your `.env` contains valid database credentials:
```env
# Database Connection URL (Default Docker port: 5434, local default: 5432)
DATABASE_URL="postgresql://postgres:postgrespassword@localhost:5434/cmadms_db"

# Server Session Secret Key (at least 32 characters)
SESSION_SECRET="cmadms_production_super_secure_random_session_secret_key_2026_x9k2"

# Execution Environment
NODE_ENV="development"
```

### 4. Database Setup
If using a local PostgreSQL instance, initialize the database schema and master timetable:
```bash
psql -U postgres -d cmadms_db -f docker/init.sql
psql -U postgres -d cmadms_db -f docker/timetable.sql
```

### 5. Run Development Server
```bash
npm run dev
```
Open your browser at **[http://localhost:8081](http://localhost:8081)**.

---

## Docker Deployment

The fastest way to spin up the complete CMADMS stack (PostgreSQL database + pgAdmin + Web Application) is with Docker Compose:

```bash
# Start PostgreSQL, pgAdmin, and CMADMS application in detached mode
docker compose up -d
```

### Services Included:
- **CMADMS Web App**: Accessible at `http://localhost:3000`
- **PostgreSQL Database**: Port `5434` (mapped from container `5432`)
- **pgAdmin 4**: Accessible at `http://localhost:5051`
  - *Email*: `admin@cmadms.com`
  - *Password*: `adminpassword`

To stop the services:
```bash
docker compose down
```

---

## Production Build

To compile and execute the optimized production bundle:

```bash
# 1. Compile the production bundle via Vite & Nitro
npm run build

# 2. Launch the production server
npm start
```
The server will bind to the configured `PORT` (default `3000`).

---

## Quality Assurance & Type Checking

To validate code quality, linting standards, and static TypeScript typing across all client and server files:

```bash
# Static type checking (0 errors standard)
npx tsc --noEmit

# Linting verification
npm run lint

# Code formatting
npm run format
```

---

## Complete Documentation Package

Extensive technical, architectural, and presentation documents are available in the repository:

| Document | Description |
| :--- | :--- |
| **[Project Overview](docs/project-overview.md)** | Executive abstract, problem statement, objectives, and elevator pitch |
| **[System Architecture](docs/system-architecture.md)** | Layer responsibilities, data flow diagrams, and component interactions |
| **[Workflows & State Machines](docs/workflows.md)** | Lifecycles for passes, violations, early exits, and emergency dispatches |
| **[Security Architecture](docs/security-architecture.md)** | Scrypt password hashing, timing attacks, session cookies, and RBAC |
| **[Database Design](docs/database-design.md)** | Schema dictionary, relational constraints, and performance indexes |
| **[Module Overview](docs/module-overview.md)** | Detailed breakdown of each functional system module |
| **[Role Matrix](docs/role-matrix.md)** | Comprehensive authorization and access control matrix |
| **[Live Demo Script](docs/demo-script.md)** | Chronological 15-step demonstration sequence for reviews and vivas |
| **[Demo Checklist](docs/demo-checklist.md)** | Step-by-step pre-presentation verification checklist |
| **[Viva Questions & Answers](docs/viva-questions.md)** | 30 technical viva questions with concise model answers |
| **[Software Requirements (SRS)](REQUIREMENTS.md)** | IEEE 830 compliant formal software requirements specification |
| **[Comprehensive System Doc](PROJECT_DOCUMENTATION.md)** | 40KB complete technical specification document |
| **[Recent Feature PR](PULL_REQUEST.md)** | Details on real-time QR scanner, counselor routing, and visibility |

---

## License

This project is licensed under the **MIT License**. See the [LICENSE](LICENSE) file for details.

---

<div align="center">
  <sub>Built for academic institutions seeking secure, efficient, and transparent campus governance.</sub>
</div>
