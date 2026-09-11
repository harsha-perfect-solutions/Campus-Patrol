# CampusGuard Pro (CMADMS) — Software Requirements Specification (SRS)
### *Campus Movement & Absence Detection Management System*

**Document Version**: 2.4.0 (Production Release)  
**Standard Compliance**: IEEE 830 / ISO/IEC/IEEE 29148 Standard for Systems and Software Engineering  
**System Identifier**: CMADMS-SRS-2026-V2.4  
**Classification**: Institutional Production Specification  
**Last Updated**: September 2026  

---

## Table of Contents

- [1. Introduction & Project Scope](#1-introduction--project-scope)
  - [1.1 Document Purpose](#11-document-purpose)
  - [1.2 Project Scope & Vision](#12-project-scope--vision)
  - [1.3 Problem Statement](#13-problem-statement)
  - [1.4 Definitions, Acronyms & Abbreviations](#14-definitions-acronyms--abbreviations)
  - [1.5 References & Compliance](#15-references--compliance)
- [2. Overall System Description](#2-overall-system-description)
  - [2.1 Product Perspective & Context](#21-product-perspective--context)
  - [2.2 User Classes & Personas](#22-user-classes--personas)
  - [2.3 Operating Environment](#23-operating-environment)
  - [2.4 Design & Implementation Constraints](#24-design--implementation-constraints)
  - [2.5 Assumptions & Dependencies](#25-assumptions--dependencies)
- [3. Functional Requirements (FR)](#3-functional-requirements-fr)
  - [FR-01: Authentication, Cryptography & Session Management](#fr-01-authentication-cryptography--session-management)
  - [FR-02: Digital Movement Pass Engine](#fr-02-digital-movement-pass-engine)
  - [FR-03: Real-Time Gate QR Verification & Multi-Scan Lifecycle](#fr-03-real-time-gate-qr-verification--multi-scan-lifecycle)
  - [FR-04: Counselor-First Disciplinary Violation Routing](#fr-04-counselor-first-disciplinary-violation-routing)
  - [FR-05: Counselor–Student Assignment Visibility System](#fr-05-counselorstudent-assignment-visibility-system)
  - [FR-06: Master Timetable & Absence Cross-Referencing Engine](#fr-06-master-timetable--absence-cross-referencing-engine)
  - [FR-07: 6-Stage Campus Emergency Incident Command](#fr-07-6-stage-campus-emergency-incident-command)
  - [FR-08: Security Gate Mobile PWA Operations](#fr-08-security-gate-mobile-pwa-operations)
  - [FR-09: Real-Time Notification Event Bus](#fr-09-real-time-notification-event-bus)
  - [FR-10: Institutional Audit Trail & System Analytics](#fr-10-institutional-audit-trail--system-analytics)
- [4. External Interface Requirements](#4-external-interface-requirements)
  - [4.1 User Interfaces (UI/UX)](#41-user-interfaces-uiux)
  - [4.2 Hardware Interfaces](#42-hardware-interfaces)
  - [4.3 Software & Database Interfaces](#43-software--database-interfaces)
  - [4.4 Communication Interfaces](#44-communication-interfaces)
- [5. Non-Functional Requirements (NFR)](#5-non-functional-requirements-nfr)
  - [NFR-01: Performance & Latency Requirements](#nfr-01-performance--latency-requirements)
  - [NFR-02: Security, Privacy & OWASP Top 10 Defenses](#nfr-02-security-privacy--owasp-top-10-defenses)
  - [NFR-03: Availability, Reliability & Resilience](#nfr-03-availability-reliability--resilience)
  - [NFR-04: Scalability & Capacity](#nfr-04-scalability--capacity)
  - [NFR-05: Maintainability & Code Quality](#nfr-05-maintainability--code-quality)
  - [NFR-06: Usability & Accessibility](#nfr-06-usability--accessibility)
- [6. Requirements Traceability Matrix (RTM)](#6-requirements-traceability-matrix-rtm)
- [7. Verification & Acceptance Criteria](#7-verification--acceptance-criteria)

---

## 1. Introduction & Project Scope

### 1.1 Document Purpose
This Software Requirements Specification (SRS) formally defines the functional, non-functional, behavioral, and architectural requirements for **CampusGuard Pro (CMADMS — Campus Movement & Absence Detection Management System)**. It serves as the authoritative baseline for engineering implementation, quality assurance audits, security reviews, and institutional academic evaluation.

### 1.2 Project Scope & Vision
**CampusGuard Pro (CMADMS)** is an enterprise full-stack web and Progressive Web App (PWA) platform designed to eliminate manual, paper-based gate passes and disconnected roll-call registries in higher educational institutions. CMADMS provides:
- Automated student movement pass issuance and multi-tier approval.
- Sub-second camera-based gate QR code verification with cryptographic opaque tokens.
- Cross-referencing against 642 master academic timetable slots for real-time loitering and absence detection.
- Counselor-First disciplinary routing for rapid, empathetic resolution of student movement infractions.
- 6-stage campus emergency incident command dispatching.
- Immutable audit logging for 100% compliance with institutional campus safety regulations.

### 1.3 Problem Statement
Traditional educational campuses face significant security vulnerabilities and administrative delays due to legacy workflows:
1. **Unverifiable Gate Movement**: Security personnel stationed at physical campus boundaries rely on paper slips, handwritten signatures, and physical logbooks that are easily forged, lost, or backdated.
2. **Disconnected Attendance & Absence Logs**: Class absence records are isolated from gate movements. Faculty taking attendance cannot determine whether an absent student is legitimately off-campus on an approved pass or roaming on premises.
3. **Disciplinary Bottlenecks**: Minor student infractions bypass class counselors and flood the Department HOD or Principal, causing multi-week delays in resolution and escalating administrative workload.
4. **Lack of Counselor-Student Alignment**: Students lack clear visibility into who their assigned class counselor is, and counselors lack real-time digital rosters to monitor and mentor their assigned cohort.

### 1.4 Definitions, Acronyms & Abbreviations

| Term / Acronym | Definition |
| :--- | :--- |
| **CMADMS** | Campus Movement & Absence Detection Management System (system code name: CampusGuard Pro). |
| **SRS** | Software Requirements Specification. |
| **RBAC** | Role-Based Access Control: Security mechanism restricting system access based on user roles. |
| **PWA** | Progressive Web App: Web technology enabling native-like app experiences on mobile devices. |
| **Opaque Token** | Cryptographically random, non-predictable token containing zero internal database metadata. |
| **IDOR** | Insecure Direct Object Reference: Vulnerability mitigated by server session isolation. |
| **SLA** | Service Level Agreement (e.g., student 24-hour explanation submission window). |
| **SSR** | Server-Side Rendering: Web rendering pattern executed via TanStack Start. |
| **HOD** | Head of Department: Chief departmental administrative authority. |
| **Scrypt** | Memory-hard key derivation function used for cryptographic password hashing. |
| **RTM** | Requirements Traceability Matrix: Cross-referencing requirements against verified tests. |

### 1.5 References & Compliance
- **IEEE Std 830-1998**: Recommended Practice for Software Requirements Specifications.
- **OWASP Top 10 Web Application Security Standard (2021/2025)**.
- **CMADMS Technical Architecture & Database Design Documentation** ([`docs/`](file:///f:/Projects/Campus%20guard%20pro/docs)).
- **Project Full Inventory Specification** ([`docs/PROJECT_FULL_INVENTORY.md`](file:///f:/Projects/Campus%20guard%20pro/docs/PROJECT_FULL_INVENTORY.md)).

---

## 2. Overall System Description

### 2.1 Product Perspective & Context
CMADMS operates as a centralized web platform connecting five distinct institutional user groups across mobile and desktop interfaces:

```
                  ┌─────────────────────────────────────┐
                  │       Institutional Admin Console   │
                  └──────────────────┬──────────────────┘
                                     │
                  ┌──────────────────┴──────────────────┐
                  │       Department HOD Portal         │
                  └──────────────────┬──────────────────┘
                                     │
                  ┌──────────────────┴──────────────────┐
                  │      Faculty & Counselor Workspace  │
                  └─────────┬─────────────────┬─────────┘
                            │                 │
            ┌───────────────┴───┐         ┌───┴───────────────┐
            │  Student Portal   │         │  Security Gate PWA│
            │  (Mobile/Desktop) │         │  (Mobile Scanner) │
            └───────────────────┘         └───────────────────┘
```

### 2.2 User Classes & Personas

1. **Student (`student`)**:
   - Applies for single-day or scheduled out-passes (*Medical, Library, Lab, Placement, HOD Duty, Sports*).
   - Presents digital opaque QR passes at campus exit/entry gates.
   - Views assigned Class Counselor details on the personal dashboard.
   - Submits written explanations and evidentiary attachments for loitering infractions within a 24-hour window.

2. **Faculty / Class Counselor (`faculty`)**:
   - Performs presence verification against live timetable slots via roll-call lookup.
   - Reports unauthorized campus movements with anti-duplicate cooldown protections.
   - Accesses designated Counselor Workspace to view assigned cohort rosters, approve cohort movement passes, and resolve 1st-level disciplinary cases.

3. **Security Gate Officer (`security`)**:
   - Operates mobile camera-based PWA QR scanner at campus boundary checkpoints.
   - Verifies pass validity windows, student identity photos, and movement authorization.
   - Authorizes Early Exit overrides for legitimate early departures with permanent audit logging.
   - Triage and status management for campus emergencies.

4. **Head of Department (`hod`)**:
   - Exercises departmental governance over student movement passes.
   - Conducts formal case reviews for disciplinary violations escalated by counselors.
   - Issues formal disciplinary sanctions (*Warning, Exonerated, Dismissed, Escalated*).
   - Enforces departmental isolation (only accesses departmental students, faculty, and cases).

5. **Institutional Administrator (`admin`)**:
   - Oversees campus-wide master timetables (642 slots), departmental structures, and course offerings.
   - Manages user profiles, role assignments, and counselor-student cohort mappings.
   - Operates the 6-Stage Emergency Command Center.
   - Audits immutable system transaction logs across all campus security events.

### 2.3 Operating Environment
- **Server Runtime**: Node.js `v20.x` or higher (compatible with Bun `v1.1+`).
- **Database Engine**: PostgreSQL `14.x` / `16-alpine` with connection pooling (`pg`).
- **Client Browsers**: Modern Evergreen Browsers (Chrome 120+, Safari 17+, Firefox 120+, Edge 120+) with HTML5 WebRTC camera access.
- **Containerization**: Multi-container Docker Compose stack (`docker-compose.yml`).

### 2.4 Design & Implementation Constraints
- **Zero Direct Client Database Access**: All database operations must execute through server RPC functions (`createServerFn`) inside `*.server.ts` modules.
- **Server-Authoritative Time**: Pass validity windows and expiration checks must be computed using server/database timestamps (`CURRENT_TIME`, `CURRENT_DATE`), never client system clocks.
- **IDOR Defense**: All queries involving student records must enforce server session validation (`session.studentCode` or `session.department`).
- **Cryptographic Security**: Passwords must be hashed using per-user random salted `scrypt`; timing-safe comparisons must be enforced.

### 2.5 Assumptions & Dependencies
- Mobile devices deployed at campus gates possess functional cameras supporting WebRTC `getUserMedia()` API.
- Campus gate checkpoints have active network connectivity (with graceful PWA offline-awareness).
- PostgreSQL service maintains high availability with persistent volume storage.

---

## 3. Functional Requirements (FR)

### FR-01: Authentication, Cryptography & Session Management
- **FR-01.1 (Salted Password Hashing)**: The system shall hash user passwords using Node.js `crypto.scryptSync()` with a unique, cryptographically random 16-byte salt per user (`crypto.randomBytes(16)`). Passwords shall be stored in `salt:derivedHash` format.
- **FR-01.2 (Legacy Migration)**: The authentication engine shall automatically detect legacy single-secret password hashes during login, verify credentials, and transparently upgrade the hash in PostgreSQL to `salt:derivedHash` without forcing a user reset.
- **FR-01.3 (Timing-Safe Equality)**: Password hash verification shall use `crypto.timingSafeEqual()` to mitigate timing side-channel attacks.
- **FR-01.4 (Brute-Force Rate Limiting)**: The system shall enforce an in-memory rate limiter restricting failed login attempts to a maximum of 5 attempts per 15-minute window per IP/account, returning generic, non-revealing error messages.
- **FR-01.5 (Session Security)**: Authenticated sessions shall be managed via an encrypted, signed `cmadms_session_token` stored in an `HttpOnly`, `SameSite=Lax`, `Secure` cookie.
- **FR-01.6 (Self-Service Password Reset)**: The system shall provide a 3-step password recovery flow at `/reset-password` utilizing registered email OTP verification.

### FR-02: Digital Movement Pass Engine
- **FR-02.1 (Application Submission)**: Students shall be able to submit movement pass applications specifying Reason (*Medical, Library, Lab, Placement, HOD Duty, Sports, Other*), Date, Valid From time, and Valid Until time.
- **FR-02.2 (Approval Workflow)**: Applications shall enter `pending` status, requiring approval by the student's assigned Counselor or Department HOD.
- **FR-02.3 (Opaque Token Issuance)**: Upon approval, the system shall generate a cryptographically random 256-bit entropy token (`CMADMS-PASS-XXXXXX`) representing the pass. The token must be decoupled from the student's database ID.
- **FR-02.4 (Pass Cancellation)**: Students and administrators shall have the ability to cancel pending or approved passes prior to exit scan, recording the cancellation timestamp and reason.

### FR-03: Real-Time Gate QR Verification & Multi-Scan Lifecycle
- **FR-03.1 (Camera QR Decoder)**: The security portal (`/security/check`) shall provide a sub-second web camera QR code scanner using `jsqr` with canvas downscaling, 65% center crop, and Otsu adaptive binarization for reading mobile screens under sunlight.
- **FR-03.2 (Multi-Scan Lifecycle)**: An approved pass shall support a dual-transaction lifecycle during its validity window:
  1. **First Scan (`EXIT`)**: Logs gate departure timestamp and changes active pass state to `OUT_OF_CAMPUS`.
  2. **Second Scan (`ENTRY`)**: Logs campus return timestamp and closes the pass lifecycle as `COMPLETED`.
- **FR-03.3 (Server-Authoritative Time Check)**:
  - If current time is within `valid_from` and `valid_until`: Displays **ACTIVE / AUTHORIZED** card with student photo, name, and roll number.
  - If current time is prior to `valid_from`: Displays **BEFORE_VALIDITY** golden card with dynamic minutes countdown.
  - If current time exceeds `valid_until`: Displays **EXPIRED** crimson card denying exit.
- **FR-03.4 (Security Early Exit Override)**: In `BEFORE_VALIDITY` state, a security officer shall be authorized to execute an **"Allow Early Exit"** override through a confirmation dialog, recording the officer ID, timestamp, and justification into `movement_logs` and `audit_logs`.

### FR-04: Counselor-First Disciplinary Violation Routing
- **FR-04.1 (Violation Creation)**: Faculty members shall be able to file unauthorized movement violations (`/faculty/check`) specifying Student Roll Number, Incident Location, Observed Time, Severity (*Low, Medium, High, Critical*), and Remarks.
- **FR-04.2 (Anti-Duplicate Throttling)**: The system shall reject duplicate violation reports submitted for the same student within a 15-minute cooldown period.
- **FR-04.3 (Counselor-First Routing)**: Incoming violations shall automatically query `counselor_assignments`. If an active counselor is found, `assigned_counselor_id` is set to that faculty member. If unassigned, the case routes directly to the Department HOD (`NO_COUNSELOR`).
- **FR-04.4 (Student 24h Explanation SLA)**: The student shall be notified and granted a 24-hour deadline (`explanation_deadline`) to submit a written explanation and attach proof documents (`/student/explanations`).
- **FR-04.5 (Counselor 1st-Level Resolution)**: The assigned counselor shall review the explanation and either:
  - **`RESOLVE`**: Accept the student's justification and close the case locally with counseling remarks.
  - **`ESCALATE TO HOD`**: Forward the case to the Department HOD queue with counselor escalation notes.
- **FR-04.6 (HOD Final Adjudication)**: The HOD shall hold final authority over departmental cases, with permissions to issue formal warnings, exonerate, or enforce disciplinary actions.

### FR-05: Counselor–Student Assignment Visibility System
- **FR-05.1 (Counselor Workspace Navigation)**: The faculty interface shall provide an expandable **Counseling** dropdown in the sidebar containing:
  - `Violation Cases`: Active cohort disciplinary reviews.
  - `Pass Approvals`: Movement passes submitted by assigned students.
  - `Assigned Students`: Complete cohort student roster.
- **FR-05.2 (Filterable Cohort Roster)**: The roster view at `/faculty/counselor` shall display Roll Number, Name, Email, Department, Year, Section, and Assignment Date, with live search and multi-column filtering.
- **FR-05.3 (Roster Scope Isolation)**: Counselors shall strictly be prevented from viewing student rosters belonging to other faculty or departments.
- **FR-05.4 (Student Dashboard Visibility)**: The Student Dashboard (`/student/dashboard`) shall display a read-only **"My Assigned Counselor"** card detailing Counselor Name, Faculty ID, Department, Role ("Class Counselor"), and Email address. If unassigned, the card shall provide clear contact guidance.

### FR-06: Master Timetable & Absence Cross-Referencing Engine
- **FR-06.1 (Master Schedule Database)**: The system shall maintain 642 master class slot records across departments, years, sections, rooms, and faculty.
- **FR-06.2 (Live Presence Resolution)**: Querying a student roll number shall compute the student's active schedule based on `day_of_week` (1–6) and `CURRENT_TIME`, returning:
  - Scheduled Course Code and Subject Name.
  - Assigned Room Number.
  - Scheduled Faculty Instructor.
- **FR-06.3 (Absence Loitering Detection)**: If a student is scanned or checked during an active lecture slot without an approved movement pass, the system shall flag the event as an **Unauthorized Class Movement**.

### FR-07: 6-Stage Campus Emergency Incident Command
- **FR-07.1 (Emergency Incident Triage)**: Administrators and Security Officers shall be able to dispatch campus-wide emergency incidents across categories: *Medical Emergency, Fire Incident, Security Breach, Laboratory Hazard*.
- **FR-07.2 (6-Stage Workflow Engine)**: Emergency incidents shall transition through 6 sequential, auditable lifecycle stages:
  1. `REPORTED`: Incident filed with location and initial severity.
  2. `ACKNOWLEDGED`: Central dispatch confirms awareness.
  3. `RESPONDER_ASSIGNED`: Specific response team member assigned.
  4. `RESPONSE_STARTED`: Team arrives on scene; stopwatch commences.
  5. `CONTROLLED`: Hazard neutralized or patient stabilized.
  6. `RESOLVED`: Incident formally closed with resolution summary.
- **FR-07.3 (Live Response Notes)**: Responders and dispatchers shall be able to append timestamped JSONB logs (`response_notes`) throughout the incident lifecycle.

### FR-08: Security Gate Mobile PWA Operations
- **FR-08.1 (PWA Installation)**: The web platform shall supply a valid `manifest.json` and service worker enabling installation to mobile device home screens.
- **FR-08.2 (Cache Safety)**: The service worker shall explicitly exclude all `/api` and server RPC routes from caching, guaranteeing that gate authorization decisions are never evaluated against stale cache data.
- **FR-08.3 (Touch-First UI)**: The security interface shall maintain a minimum touch target size of 44×44 pixels with high-contrast color indicators for direct sunlight readability.

### FR-09: Real-Time Notification Event Bus
- **FR-09.1 (Push Alert Dispatch)**: The backend shall implement a Node.js `EventEmitter` server bus broadcasting real-time events (*Pass Approved, Violation Filed, Case Resolved, Emergency Dispatched*).
- **FR-09.2 (Targeted Delivery)**: Notifications shall be routed based on user ID, role, or department filter.
- **FR-09.3 (Client Toast Integration)**: Real-time events shall render immediate Sonner toast notifications in the active user session, supported by a 15-second background polling fallback.

### FR-10: Institutional Audit Trail & System Analytics
- **FR-10.1 (Immutable Transaction Logging)**: The system shall record an immutable entry into `audit_logs` for every gate scan, pass status mutation, early exit override, disciplinary resolution, emergency update, and role reassignment.
- **FR-10.2 (Audit Metadata)**: Each audit log entry must capture: `actor`, `actor_role`, `action`, `target`, `target_id`, `metadata` (JSONB), and `timestamp`.
- **FR-10.3 (Administrative Audit Console)**: The Admin portal shall provide a searchable, filterable audit explorer at `/admin/audit-logs`.

---

## 4. External Interface Requirements

### 4.1 User Interfaces (UI/UX)
- **Design Framework**: Modern enterprise dark-mode aesthetic built with Tailwind CSS v4 and Radix UI primitives.
- **Color Palette & Visual Tokens**:
  - Surface Dark: `#0a0f1d` / `#111827`
  - Primary Accent: Royal Electric Blue (`#3b82f6`)
  - Success / Clearance: Emerald Green (`#10b981`)
  - Before-Validity Warning: Amber Gold (`#f59e0b`)
  - Violation / Denial: Crimson Red (`#ef4444`)
- **Responsive Breakpoints**: Seamless scaling across Mobile Phones (360px–480px), Tablets (768px–1024px), and Desktop Workstations (1280px+).

### 4.2 Hardware Interfaces
- **Camera Sensors**: Front and rear-facing smartphone cameras accessed via HTML5 `navigator.mediaDevices.getUserMedia()`.
- **Touch Displays**: Capacitive touch screens with minimum 44px hit-box targets.

### 4.3 Software & Database Interfaces
- **Database Connection**: PostgreSQL 14+ connected via `pg.Pool` with SSL support and parameterized queries.
- **Server Framework**: TanStack Start with Vite dev server and Nitro SSR bundle engine.

### 4.4 Communication Interfaces
- **Protocol**: HTTPS (TLS 1.3 standard) for all network communication.
- **RPC Format**: JSON-RPC over HTTP POST using TanStack Start `createServerFn`.

---

## 5. Non-Functional Requirements (NFR)

### NFR-01: Performance & Latency Requirements
- **NFR-01.1 (QR Gate Decode Latency)**: Camera QR code detection and decoding via `jsqr` must complete in **< 500 ms** on standard mid-range mobile devices.
- **NFR-01.2 (Gate Verification Roundtrip)**: Total roundtrip latency for `verifyGatePassApi` (client scan to screen clearance) must not exceed **800 ms** over 4G/Wi-Fi connections.
- **NFR-01.3 (Timetable Presence Lookup)**: Server schedule resolution against 642 slots must execute in **< 50 ms**.

### NFR-02: Security, Privacy & OWASP Top 10 Defenses
- **NFR-02.1 (SQL Injection Prevention)**: 100% of database queries must utilize parameterized placeholders (`$1`, `$2`). Raw string concatenation in SQL queries is strictly prohibited.
- **NFR-02.2 (Broken Access Control / IDOR)**: Server functions must inspect session tokens (`requireRole`, `requireAnyRole`) and enforce row-level ownership or departmental isolation on every mutation.
- **NFR-02.3 (Cryptographic Token Decoupling)**: Public-facing QR codes must never embed internal database primary keys (`UUID` / `id`). Tokens must be 256-bit cryptographically random strings.
- **NFR-02.4 (Data Sanitization)**: Password hashes, internal salts, and server session tokens must be stripped before returning user objects to client components.

### NFR-03: Availability, Reliability & Resilience
- **NFR-03.1 (High Availability)**: The system shall target 99.9% uptime during institutional academic hours (07:00–20:00).
- **NFR-03.2 (Database Connection Resilience)**: `pg.Pool` shall automatically handle intermittent database network drops, execute reconnect retries, and emit structured diagnostics without terminating the Node.js process.
- **NFR-03.3 (Data Integrity)**: All multi-table updates (e.g., Early Exit override logging) must execute within PostgreSQL transactions (`BEGIN ... COMMIT`) to prevent partial state writes.

### NFR-04: Scalability & Capacity
- **NFR-04.1 (Concurrent Gate Throughput)**: The system shall support at least 50 concurrent security gate scanners handling 1,200 scans per minute during peak morning and evening gate rushes.
- **NFR-04.2 (Database Capacity)**: The database schema shall support up to 50,000 active student records, 500,000 movement log entries, and 1,000,000 audit log rows with sub-100ms index lookup performance.

### NFR-05: Maintainability & Code Quality
- **NFR-05.1 (TypeScript Strict Typing)**: The codebase must pass `npx tsc --noEmit` with **0 type errors**.
- **NFR-05.2 (Architectural Separation)**: Client UI components must never import server-only modules (`*.server.ts`). Server RPC wrappers must strictly demarcate client/server boundaries.

### NFR-06: Usability & Accessibility
- **NFR-06.1 (Accessibility Standards)**: All interactive form elements and buttons must comply with WCAG 2.1 Level AA color contrast and screen-reader accessibility standards.
- **NFR-06.2 (Outdoor Legibility)**: The Security Gate scanner UI must employ high-contrast color cards (Emerald, Amber, Crimson) legible in bright sunlight.

---

## 6. Requirements Traceability Matrix (RTM)

The following matrix maps each functional requirement to its implementation files and verification test suites:

| Requirement ID | Requirement Name | Implementation Files | Verification Test / Method | Status |
| :---: | :--- | :--- | :--- | :---: |
| **FR-01** | Salted Scrypt Cryptography & Session Auth | `session.server.ts`, `auth.server.ts` | Security Hardening Suite (16/16 PASS) | **VERIFIED** |
| **FR-02** | Digital Movement Pass & Opaque Tokens | `passes.server.ts`, `student/passes.tsx` | End-to-End Workflow Audit (28/28 PASS) | **VERIFIED** |
| **FR-03** | Gate QR Multi-Scan & Before-Validity | `qr-scanner-modal.tsx`, `security/check.tsx` | Gate Lifecycle Suite (17/17 PASS) | **VERIFIED** |
| **FR-04** | Counselor-First Violation Routing | `violations.server.ts`, `counselor.tsx` | Counselor-Student Visibility Suite (8/8 PASS) | **VERIFIED** |
| **FR-05** | Counselor-Student Assignment Roster | `counselor.server.ts`, `dashboard.tsx` | Counselor Visibility Suite (8/8 PASS) | **VERIFIED** |
| **FR-06** | 642 Master Timetable Engine | `timetable.server.ts`, `faculty/check.tsx`| Timetable Integrity Audit (642/642 PASS) | **VERIFIED** |
| **FR-07** | 6-Stage Emergency Command System | `emergency.server.ts`, `emergency.tsx` | Emergency Response Audit | **VERIFIED** |
| **FR-08** | Security Gate Mobile PWA | `public/manifest.json`, `service-worker.js`| PWA Cache Bypass & Touch Target Test | **VERIFIED** |
| **FR-09** | Real-Time Notification Bus | `notifications-bus.server.ts` | Real-Time Notification Suite (15/15 PASS)| **VERIFIED** |
| **FR-10** | Institutional Immutable Audit Logs | `audit_logs` DDL, `admin/audit-logs.tsx` | Real-World Edge Case Suite (15/15 PASS) | **VERIFIED** |

---

## 7. Verification & Acceptance Criteria

To achieve formal institutional acceptance and deployment sign-off, the following criteria must be satisfied:

1. **Static Type Cleanliness**: Execution of `npx tsc --noEmit` returns code `0` with 0 compilation errors across all modules.
2. **Automated Test Validation**: All automated test suites (733/733 total verification points) pass cleanly without failures or skipped assertions.
3. **Zero IDOR Leaks**: Security audit verifies that students cannot access other students' passes or explanations by mutating request parameters.
4. **Sub-Second Gate Scan**: Live camera verification on mobile hardware confirms scan clearance times under 800 ms.
5. **Clean Production Build**: Execution of `npm run build` compiles the production Nitro bundle cleanly.

---

<div align="center">
  <sub>CampusGuard Pro (CMADMS) — Formal Software Requirements Specification (SRS)</sub><br>
  <sub>Approved for Institutional Deployment & Production Release</sub>
</div>
