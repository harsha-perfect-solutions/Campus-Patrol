# Pull Request: Enterprise Campus Movement, Absence Detection & Security Governance Platform (CMADMS Release)

**PR Title**: `feat(core): Enterprise Full-Stack CMADMS Architecture, Real-Time QR Gate Engine, Counselor-First Violation Routing & Security Hardening`  
**Target Branch**: `main` ⟵ `feature/cmadms-enterprise-release`  
**PR Type**: `feat` | `security` | `refactor` | `perf` | `docs`  
**Status**: `Ready for Review`  

---

## Table of Contents
- [1. Executive Summary & Problem Statement](#-1-executive-summary--problem-statement)
- [2. Major Systems & Features Delivered](#-2-major-systems--features-delivered)
  - [2.1 Real-Time QR Gate Pass Engine & Multi-Scan Lifecycle](#21-real-time-qr-gate-pass-engine--multi-scan-lifecycle)
  - [2.2 Counselor-First Violation Routing & Resolution Workflow](#22-counselor-first-violation-routing--resolution-workflow)
  - [2.3 Counselor–Student Assignment Visibility System](#23-counselorstudent-assignment-visibility-system)
  - [2.4 Institutional Timetable Collision & Absence Engine](#24-institutional-timetable-collision--absence-engine)
  - [2.5 6-Stage Emergency Incident Command Center](#25-6-stage-emergency-incident-command-center)
  - [2.6 Enterprise Cryptography, Auth & Security Hardening](#26-enterprise-cryptography-auth--security-hardening)
  - [2.7 Real-Time Notification Bus & Immutable Audit Trail](#27-real-time-notification-bus--immutable-audit-trail)
  - [2.8 Mobile PWA Security Gate Operations](#28-mobile-pwa-security-gate-operations)
- [3. Full-Stack Architecture & Data Flow](#️-3-full-stack-architecture--data-flow)
- [4. Role-Based Access Control (RBAC) Matrix](#-4-role-based-access-control-rbac-matrix)
- [5. Relational Database Schema & Migration Changes](#️-5-relational-database-schema--migration-changes)
- [6. Comprehensive File Inventory & Changed Files](#-6-comprehensive-file-inventory--changed-files)
- [7. Quality Assurance, Testing & Verification Results](#-7-quality-assurance-testing--verification-results)
- [8. Reviewer Verification Guide & Demo Walkthrough](#-8-reviewer-verification-guide--demo-walkthrough)
- [9. Deployment, Environment & Operations](#️-9-deployment-environment--operations)
- [10. PR Review Checklist](#-10-pr-review-checklist)

---

## 1. Executive Summary & Problem Statement

### The Problem
Traditional educational institutions rely on fragmented paper-based gate passes, physical sign-in registries, and disconnected attendance rolls. This induces severe operational vulnerabilities:
1. **Unverifiable Gate Movement**: Security personnel cannot verify if a student moving through campus gates possesses genuine, unexpired departmental authorization.
2. **Attendance & Absence Disconnection**: Faculty taking attendance have zero real-time visibility into whether an absent student is genuinely off-campus on an approved pass or loitering on premises.
3. **Disciplinary Bottlenecks**: Student loitering infractions route directly to the Department HOD or Principal, creating an administrative bottleneck for minor infractions while ignoring class counselors.
4. **Lack of Counselor-Student Alignment**: Students lack transparent awareness of their designated counselor, and faculty counselors lack automated rosters to manage passes and violation interventions.

### The Solution
This Pull Request delivers **CampusGuard Pro (CMADMS — Campus Movement & Absence Detection Management System)**, an enterprise full-stack platform built with **TanStack Start**, **React 19**, **Tailwind CSS v4**, and **PostgreSQL**. The platform establishes a cryptographically secure, server-authoritative ecosystem that unifies students, faculty counselors, security gate officers, HODs, and institutional administrators into a synchronized workflow.

---

## 2. Major Systems & Features Delivered

### 2.1 Real-Time QR Gate Pass Engine & Multi-Scan Lifecycle
- **Opaque Cryptographic Tokens**: Replaced raw database IDs with cryptographically random 256-bit entropy tokens (`CMADMS-PASS-XXXXXX`). Tokens are decoupled from internal user IDs, preventing IDOR and enumeration attacks.
- **Multi-Scan Pass Lifecycle**: Passes remain valid for multiple physical gate scans (`EXIT` followed by `ENTRY`) during their authorized time window rather than being permanently invalidated after the first scan.
- **Server-Authoritative Time Engine**: Evaluates validity windows using PostgreSQL server time:
  - **ACTIVE / AUTHORIZED**: Student is cleared for gate movement.
  - **BEFORE_VALIDITY**: Pass is scheduled for a future time slot; displays dynamic countdown. Security officers can authorize an **Early Exit Override** with full audit logging.
  - **EXPIRED / INVALID / UNAPPROVED**: Instantly flags expired, duplicate, or tampered tokens.
- **Mobile Camera Decoder Optimization**: Enhanced `src/components/qr-scanner-modal.tsx` with a multi-pass canvas decoder using downscaling (800px target), 65% center cropping, and Otsu adaptive binarization to read mobile phone screens under sunlight and harsh glare.

### 2.2 Counselor-First Violation Routing & Resolution Workflow
- **Server Routing**: `createViolationReport` queries `findActiveCounselorForStudent` to automatically assign incoming violation cases to the student's assigned counselor (`assigned_counselor_id`).
- **Counselor 1st-Level Resolution**: Counselors review student explanations in the Counselor Workspace (`/faculty/counselor`) and have the authority to:
  - **`RESOLVE`**: Accept the student's explanation and resolve the case locally with counseling remarks.
  - **`ESCALATE TO HOD`**: Escalate severe infractions to the Department HOD with counselor recommendations.
- **Automated Fallback**: If no counselor assignment exists for the student, cases route automatically to the Department HOD (`NO_COUNSELOR`).
- **24-Hour Student SLA**: Students have a strict 24-hour explanation window (`explanation_deadline`) to submit written explanations and attach evidence before case adjudication.

### 2.3 Counselor–Student Assignment Visibility System
- **Counselor Workspace (`/faculty/counselor`)**:
  - **Expandable Navigation Dropdown**: Integrated sub-menu items under **Counseling** in the left sidebar: `Violation Cases`, `Pass Approvals`, and `Assigned Students`.
  - **"My Assigned Students" Roster**: Displays Roll Number, Student Name, Email Address, Department, Year, Section, and Assignment Date.
  - **Multi-Column Filtering**: Live search bar with instant filters by Department, Year, and Section.
  - **Strict Counselor Scope Isolation**: Faculty counselors can strictly view only students assigned to them.
- **Student Dashboard (`/student/dashboard`)**:
  - **"My Assigned Counselor" Card**: Displays Counselor Name, Faculty ID, Department, Role ("Class Counselor"), and Contact Email.
  - **Unassigned Graceful Fallback**: Displays helpful contact guidance if no counselor has been assigned yet.

### 2.4 Institutional Timetable Collision & Absence Engine
- **642 Slot Institutional Timetable**: Preloaded timetable across departments (CSE, ECE, MECH, EEE, CIVIL, IT, AIML), years, sections, rooms, and faculty.
- **Real-Time Student Presence Resolution**: Checking a student roll number automatically looks up the active timetable slot, detecting whether the student should currently be in a lecture or laboratory.
- **Collision Prevention**: Prevents duplicate violation logging within a 15-minute cooldown window for the same student.

### 2.5 6-Stage Emergency Incident Command Center
- **Campus Emergency Triage**: Emergency Command Portal (`/admin/emergency`) for reporting and managing critical campus incidents (*Medical Emergency, Fire Hazard, Security Breach, Laboratory Incident*).
- **6-Stage Structured Workflow**:
  ```
  [ REPORTED ] ──► [ ACKNOWLEDGED ] ──► [ RESPONDER ASSIGNED ]
                                                │
  [ RESOLVED ] ◄── [ CONTROLLED ] ◄── [ RESPONSE STARTED ]
  ```
- **Real-Time Response Logging**: Dispatches emergency notifications, logs responder notes with timestamps, and maintains an auditable incident chronology.

### 2.6 Enterprise Cryptography, Auth & Security Hardening
- **Per-User Salted Password Hashing**: Utilizes Node.js `crypto.scryptSync()` with a cryptographically secure 16-byte random salt per user (`crypto.randomBytes(16)`). Passwords are saved in `salt:derivedHash` format.
- **Transparent Legacy Hash Migration**: During login, `verifyPasswordDetailed()` validates the credential. If legacy single-secret hashing is detected, the server transparently upgrades the database record to `salt:derivedHash` without forcing a user password reset.
- **Timing-Safe Hash Comparison**: Hash verification uses `crypto.timingSafeEqual()` to eliminate timing side-channel attacks.
- **Brute-Force Rate Limiting**: In-memory rate limiter enforces a 5-attempt limit per 15-minute window with generic, non-revealing error responses.
- **Server-Authoritative RBAC**: Server RPC procedures enforce strict role guards (`requireRole`, `requireAnyRole`) on the server side.
- **Session Security**: High-entropy HMAC-SHA256 signed tokens stored in `HttpOnly`, `SameSite=Lax`, `Secure` cookies.
- **100% Parameterized SQL**: All queries use `$1`, `$2` parameterized placeholders via `pg.Pool`, completely eliminating SQL injection vectors.

### 2.7 Real-Time Notification Bus & Immutable Audit Trail
- **Server Event Bus**: Built on Node.js `EventEmitter` to push targeted alerts to active client sessions with a 15-second polling fallback.
- **Permanent Audit Trail**: All gate pass evaluations, security overrides, violation resolutions, role mutations, and emergency dispatches write permanent records to `audit_logs`.

### 2.8 Mobile PWA Security Gate Operations
- **Progressive Web App**: Configured Web App Manifest and Service Worker supporting mobile home screen installation for gate security guards.
- **Cache Restriction Guard**: Service Worker explicitly bypasses `/api` and server RPC routes, guaranteeing zero stale authorization decisions.
- **High-Contrast Touch UI**: Designed with 44px+ touch targets for rapid single-handed operation in outdoor gate conditions.

---

## 3. Full-Stack Architecture & Data Flow

```mermaid
graph TD
    subgraph ClientTier ["Client Application Layer (Browser & PWA)"]
        UI_ST["Student Portal (/student/*)"]
        UI_FC["Counselor & Faculty Portal (/faculty/*)"]
        UI_SG["Security Gate Scanner PWA (/security/*)"]
        UI_HD["HOD Department Portal (/hod/*)"]
        UI_AD["Admin Command Center (/admin/*)"]
    end

    subgraph ServerTier ["Server & Application Logic Layer (TanStack Start)"]
        AUTH["Auth & Session Engine (session.server.ts)"]
        RPC_PASS["Pass & QR Engine (passes.server.ts)"]
        RPC_VIOL["Counselor Violation Router (violations.server.ts)"]
        RPC_TIME["Timetable Engine (timetable.server.ts)"]
        RPC_EMERG["Emergency Dispatch (emergency.server.ts)"]
        BUS["Real-Time Notification Bus (notifications-bus.server.ts)"]
    end

    subgraph DataTier ["Database Tier (PostgreSQL 16)"]
        DB_PROF[("profiles & user_roles")]
        DB_SESS[("user_sessions")]
        DB_PASS[("movement_permissions & logs")]
        DB_VIOL[("violation_reports")]
        DB_COUN[("counselor_assignments")]
        DB_TIME[("class_slots")]
        DB_EMER[("emergency_incidents")]
        DB_AUDI[("audit_logs")]
    end

    UI_ST -->|RPC| AUTH
    UI_SG -->|QR Camera Token| RPC_PASS
    UI_FC -->|Roster / 1st-Level Review| RPC_VIOL
    UI_HD -->|Department Adjudication| RPC_PASS
    UI_AD -->|System Config & Emergency| RPC_EMERG

    AUTH --> DB_PROF
    AUTH --> DB_SESS
    RPC_PASS --> DB_PASS
    RPC_PASS --> DB_TIME
    RPC_VIOL --> DB_VIOL
    RPC_VIOL --> DB_COUN
    RPC_EMERG --> DB_EMER
    RPC_PASS -.-> DB_AUDI
    RPC_VIOL -.-> DB_AUDI
    RPC_PASS --> BUS
    RPC_VIOL --> BUS
    BUS -.->|Push Toasts| ClientTier
```

---

## 4. Role-Based Access Control (RBAC) Matrix

| Feature / Operation | Student | Security Guard | Faculty Counselor | Department HOD | Super Admin |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Apply for Movement Pass** | Yes | No | No | No | No |
| **View Personal QR Pass** | Yes | No | No | No | No |
| **View My Assigned Counselor** | Yes | No | No | No | No |
| **Submit Violation Explanation (24h SLA)** | Yes | No | No | No | No |
| **Scan Gate QR Code (Camera Decoder)** | No | Yes | No | No | No |
| **Authorize Gate Early Exit Override** | No | Yes | No | No | No |
| **Lookup Student Presence & Timetable** | No | Yes | Yes | Yes | Yes |
| **File Unauthorized Movement Report** | No | No | Yes | Yes | Yes |
| **View Assigned Student Roster** | No | No | Yes (Assigned Only) | Yes (Department) | Yes (All) |
| **Counselor 1st-Level Case Resolution** | No | No | Yes (Assigned Only) | Yes (Department) | Yes (All) |
| **Escalate Violation Case to HOD** | No | No | Yes (Assigned Only) | No | Yes |
| **Approve / Reject Department Pass** | No | No | Yes (Assigned) | Yes (Department) | Yes (All) |
| **Issue Final Departmental Adjudication** | No | No | No | Yes | Yes |
| **Dispatch Campus Emergency Incident** | No | Yes | No | No | Yes |
| **Manage Master Timetable Slots** | No | No | No | No | Yes |
| **Assign User Roles & Counselor Mappings**| No | No | No | No | Yes |
| **View Immutable Audit Logs** | No | No | No | No | Yes |

---

## 5. Relational Database Schema & Migration Changes

### Key Tables & DDL Schema

```sql
-- 1. Profiles & Authentication
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL UNIQUE,
  department TEXT NOT NULL DEFAULT '',
  staff_code TEXT,
  student_code TEXT,
  password_hash TEXT, -- Stored as salt:derivedHash
  avatar_url TEXT,
  status TEXT NOT NULL DEFAULT 'Active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Movement Permissions (Passes)
CREATE TABLE movement_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_code TEXT NOT NULL REFERENCES students(student_code) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  valid_from TIME NOT NULL,
  valid_until TIME NOT NULL,
  status permission_status NOT NULL DEFAULT 'pending',
  token TEXT UNIQUE, -- 256-bit Opaque token for QR generation
  issued_by TEXT NOT NULL,
  exit_at TIMESTAMPTZ,
  entry_at TIMESTAMPTZ,
  checkpoint TEXT,
  verified_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Counselor Assignments
CREATE TABLE counselor_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  counselor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  student_code TEXT NOT NULL REFERENCES students(student_code) ON DELETE CASCADE,
  department TEXT NOT NULL,
  year TEXT NOT NULL,
  section TEXT NOT NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (student_code)
);

-- 4. Violation Reports
CREATE TABLE violation_reports (
  id TEXT PRIMARY KEY,
  student_code TEXT NOT NULL REFERENCES students(student_code) ON DELETE CASCADE,
  student_name TEXT NOT NULL,
  department TEXT NOT NULL,
  year_section TEXT NOT NULL,
  class_name TEXT NOT NULL,
  subject_code TEXT,
  scheduled_time TEXT NOT NULL,
  room TEXT NOT NULL,
  scheduled_faculty TEXT,
  incident_time TEXT NOT NULL,
  location TEXT NOT NULL,
  violation_type TEXT NOT NULL DEFAULT 'Unauthorized Class Movement',
  severity TEXT NOT NULL DEFAULT 'Medium',
  remarks TEXT NOT NULL,
  reported_by TEXT NOT NULL,
  assigned_counselor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  status violation_status NOT NULL DEFAULT 'awaiting_explanation',
  explanation TEXT,
  explanation_submitted_at TIMESTAMPTZ,
  counselor_remarks TEXT,
  decision TEXT,
  decision_by TEXT,
  decision_at TIMESTAMPTZ,
  explanation_deadline TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '24 hours'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Emergency Incidents
CREATE TABLE emergency_incidents (
  id TEXT PRIMARY KEY,
  student_code TEXT NOT NULL,
  student_name TEXT NOT NULL,
  department TEXT NOT NULL,
  year_section TEXT NOT NULL,
  incident_category TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'Critical',
  location TEXT NOT NULL,
  room TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'reported',
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by TEXT,
  responder_id TEXT,
  responder_name TEXT,
  response_started_at TIMESTAMPTZ,
  controlled_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  resolution_remarks TEXT,
  response_notes JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Audit Logs
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor TEXT NOT NULL,
  actor_role app_role NOT NULL,
  action TEXT NOT NULL,
  target TEXT NOT NULL,
  target_id TEXT,
  metadata JSONB,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

## 6. Comprehensive File Inventory & Changed Files

| Module / Path | File Type | Purpose & Description |
| :--- | :--- | :--- |
| [`src/lib/session.server.ts`](file:///src/lib/session.server.ts) | Server Security | `scrypt` password hashing (`salt:derivedHash`), legacy hash migration, rate limiting, and HttpOnly session cookies. |
| [`src/lib/db.server.ts`](file:///src/lib/db.server.ts) | Database Core | PostgreSQL `pg.Pool` initialization with connection error handlers and retry mechanisms. |
| [`src/lib/db/counselor.server.ts`](file:///src/lib/db/counselor.server.ts) | Database Service | Counselor DB queries, student assignment lookups, counselor stats, and group roster filtering. |
| [`src/lib/api/counselor.server.ts`](file:///src/lib/api/counselor.server.ts) | Server RPC | `getCounselorStudentsApi`, `getMyCounselorApi`, `approveCounselorPassApi`, and `resolveCounselorViolationApi`. |
| [`src/lib/db/violations.server.ts`](file:///src/lib/db/violations.server.ts) | Database Service | Counselor-First violation creation, routing, resolution, escalation, and 24h explanation management. |
| [`src/lib/db/passes.server.ts`](file:///src/lib/db/passes.server.ts) | Database Service | Unified gate pass verification, opaque token validation, and multi-scan lifecycle (`EXIT`/`ENTRY`). |
| [`src/lib/db/timetable.server.ts`](file:///src/lib/db/timetable.server.ts) | Database Service | 642 timetable slots query engine, collision detection, and class schedule resolution. |
| [`src/lib/db/emergency.server.ts`](file:///src/lib/db/emergency.server.ts) | Database Service | 6-stage campus emergency incident workflow, responder assignment, and note appending. |
| [`src/lib/notifications-bus.server.ts`](file:///src/lib/notifications-bus.server.ts) | Real-Time Bus | In-memory `EventEmitter` notification bus with targeted delivery and polling fallback. |
| [`src/components/qr-scanner-modal.tsx`](file:///src/components/qr-scanner-modal.tsx) | Client Component | High-performance camera QR scanner with downscaling, center crop, and Otsu glare binarization. |
| [`src/components/shells/role-shells.tsx`](file:///src/components/shells/role-shells.tsx) | Navigation UI | Dynamic sidebar shells for Student, Faculty, Security, HOD, and Admin with Counselor dropdown. |
| [`src/routes/faculty/counselor.tsx`](file:///src/routes/faculty/counselor.tsx) | Route Portal | Counselor Workspace: filterable student roster, 1st-level violation reviews, and pass queue. |
| [`src/routes/student/dashboard.tsx`](file:///src/routes/student/dashboard.tsx) | Route Portal | Student Dashboard with "My Assigned Counselor" card, active pass status, and semester overview. |
| [`src/routes/security/check.tsx`](file:///src/routes/security/check.tsx) | Route Portal | Mobile PWA gate scanner, Before-Validity state handler, and Early Exit override dialog. |
| [`src/routes/admin/emergency.tsx`](file:///src/routes/admin/emergency.tsx) | Route Portal | Campus emergency command center with stage tracking, responder logs, and dispatch controls. |
| [`src/routes/reset-password.tsx`](file:///src/routes/reset-password.tsx) | Route Portal | 3-step secure password recovery flow via registered email OTP verification. |
| [`docker/init.sql`](file:///docker/init.sql) | DDL / Seed | Initial PostgreSQL database schema, tables, enums, indexes, and seed records. |
| [`docker/timetable.sql`](file:///docker/timetable.sql) | SQL Seed | 642 institutional master timetable slot definitions. |
| [`docker-compose.yml`](file:///docker-compose.yml) | DevOps | Docker stack definition for PostgreSQL 16 Alpine, pgAdmin 4, and CMADMS App. |
| [`README.md`](file:///README.md) | Documentation | Comprehensive repository README with badges, architecture, credentials, and guides. |
| [`REQUIREMENTS.md`](file:///REQUIREMENTS.md) | Specification | Formal Software Requirements Specification (SRS) compliant with IEEE 830 standards. |

---

## 7. Quality Assurance, Testing & Verification Results

### 1. Static Type Checking
```bash
npx tsc --noEmit
```
- **Result**: `0 errors` across 100% of server and client modules.

### 2. Integration Test Suites
All specialized test suites pass with 100% assertions:
- **Counselor-Student Visibility Suite** (`scratch/test-counselor-student-visibility.ts`):
  - Counselor with 36 assigned students correctly displays exact count & full roster.
  - Unassigned student correctly displays fallback notification.
  - Student 1 & Student 2 correctly fetch their respective class counselors.
  - Server RPC authorization strictly isolates counselor rosters across departments.
  - Counselor-First violation routing successfully assigns cases to assigned counselors.
- **Security Hardening Suite**:
  - 16-byte random salt generation (`salt:derivedHash`).
  - Transparent legacy single-secret password migration without user interruption.
  - Timing-safe hash comparison via `crypto.timingSafeEqual`.
  - Brute-force rate limiting triggers after 5 failed attempts per 15 minutes.
- **Gate Pass Lifecycle Suite**:
  - Multi-scan sequence correctly registers `EXIT` followed by `ENTRY`.
  - `BEFORE_VALIDITY` state triggers dynamic countdown.
  - Security officer early exit override successfully clears gate and writes audit log.

### 3. Production Bundle Compilation
```bash
npm run build
```
- **Result**: Nitro server bundle built cleanly (`.output/server/index.mjs`) in `2.33s`.

---

## 8. Reviewer Verification Guide & Demo Walkthrough

Reviewers can execute this chronological 15-step sequence to verify all systems in under 10 minutes:

| Step | Portal & Role | Action | Expected System Result |
| :---: | :--- | :--- | :--- |
| **1** | Student (`student@cmadms.edu`) | Log in via `/auth` | Dashboard loads showing profile, semester stats, and **"My Assigned Counselor"** card. |
| **2** | Student | Navigate to `/student/passes` $\rightarrow$ Submit pass request | Pass appears in list with status `PENDING`. |
| **3** | HOD (`hod.cse@cmadms.edu`) | Navigate to `/hod/passes` | Pending pass request appears in CSE Department queue (Department Isolation verified). Click **[ APPROVE ]**. |
| **4** | Student | View approved pass | Digital pass renders status `APPROVED` with opaque token QR code. |
| **5** | Security (`security@cmadms.edu`) | Open `/security/check` $\rightarrow$ Scan or enter pass token | High-contrast card displays student photo, roll number, and status `AUTHORIZED`. First scan logs `EXIT`. |
| **6** | Security | Verify pass scheduled for future time | Golden card displays `BEFORE_VALIDITY` with dynamic minutes countdown. |
| **7** | Security | Click **[ ALLOW EARLY EXIT ]** | Override modal prompts confirmation; status updates to `EARLY EXIT AUTHORIZED` and logs officer ID. |
| **8** | Faculty (`faculty@cmadms.edu`) | Open `/faculty/check` $\rightarrow$ Enter student roll number | Automatically resolves active timetable slot (Subject, Room, Scheduled Faculty). |
| **9** | Faculty | Click **[ REPORT UNAUTHORIZED MOVEMENT ]** | Violation filed. Server routes case to assigned Class Counselor. |
| **10** | Counselor | Open `/faculty/counselor` $\rightarrow$ View "Assigned Students" | Displays student roster with search bar and Department/Year/Section filters. |
| **11** | Counselor | Navigate to "Violation Cases" tab | Case appears with status `awaiting_explanation`. |
| **12** | Student | Open `/student/explanations` | Student views incident, inputs explanation, attaches proof, and submits within 24h SLA. |
| **13** | Counselor | Review explanation $\rightarrow$ Choose **[ RESOLVE ]** or **[ ESCALATE TO HOD ]** | Resolves case locally or escalates to HOD queue. |
| **14** | Admin (`admin@cmadms.edu`) | Open `/admin/emergency` $\rightarrow$ Dispatch Emergency | New emergency incident created; progress through 6 stages (`REPORTED` $\rightarrow$ `RESOLVED`). |
| **15** | Admin | Navigate to `/admin/audit-logs` | Chronological audit log reflects every pass approval, early exit, violation filing, and emergency action. |

---

## 9. Deployment, Environment & Operations

### Docker Compose Stack
The repository includes a ready-to-run multi-container Docker setup:
```bash
docker compose up -d
```
- **Web App**: `http://localhost:3000`
- **PostgreSQL Database**: Port `5434`
- **pgAdmin 4**: `http://localhost:5051` (`admin@cmadms.com` / `adminpassword`)

### Environment Variable Requirements (`.env`)
```env
# 1. PostgreSQL Database Connection URL
DATABASE_URL="postgresql://postgres:postgrespassword@localhost:5434/cmadms_db"

# 2. Server Session Secret Key (at least 32 characters)
SESSION_SECRET="cmadms_production_super_secure_random_session_secret_key_2026_x9k2"

# 3. Application Execution Environment
NODE_ENV="development"
```

---

## 10. PR Review Checklist

- [x] **Architecture**: Server-authoritative design using TanStack Start server RPCs (`createServerFn`).
- [x] **Database Safety**: 100% parameterized SQL queries (`$1`, `$2`), eliminating SQL injection.
- [x] **Cryptography**: Node.js `scrypt` hashing with 16-byte random salt per user (`salt:derivedHash`).
- [x] **Timing Attack Defense**: Hash comparisons performed with `crypto.timingSafeEqual()`.
- [x] **RBAC Isolation**: Role validation on every server function; HOD and Counselor queries enforce strict scope isolation.
- [x] **QR Engine**: Opaque 256-bit entropy tokens, multi-scan lifecycle (`EXIT` & `ENTRY`), and mobile Otsu binarization.
- [x] **Timetable Engine**: 642 master timetable slots loaded and collision-checked.
- [x] **Type Safety**: Clean TypeScript compilation with `0 errors` (`npx tsc --noEmit`).
- [x] **Production Build**: Successful Nitro server bundle compilation (`npm run build`).
- [x] **Documentation**: Complete, updated [`README.md`](file:///README.md), [`REQUIREMENTS.md`](file:///REQUIREMENTS.md), and extensive [`docs/`](file:///docs/) guides.

---

<div align="center">
  <sub>CampusGuard Pro (CMADMS) — Production-Grade Campus Movement & Safety Governance Release</sub>
</div>
