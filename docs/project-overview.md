# CMADMS / CampusGuard Pro — Project Overview & Institutional Baseline

---

## 1. EXECUTIVE SUMMARY & PROJECT OVERVIEW

### 1.1 Project Identity
* **Official Title**: Campus Movement Authorization & Disciplinary Management System (CMADMS)
* **Product Brand**: CampusGuard Pro
* **Version**: v1.0 Production Release
* **Deployment Architecture**: Server-Side Rendered Progressive Web Application (PWA) with PostgreSQL & Real-Time Event Bus

---

### 1.2 Problem Statement
Higher education institutions face critical operational challenges regarding campus security, student movement verification, class attendance integrity, and emergency incident response:
1. **Manual Gate Pass Verification**: Paper gate passes or verbal permissions are easily forged, lost, or reused beyond valid time windows.
2. **Untracked Student Movement**: Faculty members lack real-time visibility into whether a student absent during a scheduled lecture has an authorized movement pass or is engaging in unauthorized movement.
3. **Fragmented Disciplinary Workflows**: Violation reports filed by faculty often get lost in informal email threads or paper forms without transparent tracking, student explanation mechanisms, or departmental HOD resolution oversight.
4. **Lack of Emergency Response Coordination**: Campus security emergencies (medical incidents, altercations) rely on ad-hoc phone calls, lacking structured status progression, responder assignment, and immutable audit trails.

---

### 1.3 Motivation & Objectives
The primary objective of CMADMS is to replace fragmented paper-based processes with an end-to-end, server-authoritative digital campus security ecosystem.

**Core System Objectives**:
- **Automate Gate Authorizations**: Issue digital QR-encoded movement passes validated against server-authoritative time windows.
- **Integrate Academic Timetables**: Resolve student locations in real time based on Department + Year + Section + Timetable schedule.
- **Enforce Departmental HOD Authority**: Ensure Department HODs hold final resolution and dismissal authority over disciplinary cases within their department.
- **Provide Mobile-First Security Gate App**: Upgrade security gate verification into a PWA equipped for mobile security officers.
- **Establish Critical Emergency Response**: Provide a 6-stage emergency incident command system with instant notifications.

---

### 1.4 Existing System vs. Proposed CMADMS

| Operational Feature | Legacy / Existing Campus Process | Proposed CMADMS System |
| :--- | :--- | :--- |
| **Pass Generation** | Manual paper slips signed by wardens/HODs | Digital QR pass with server-authoritative time validation |
| **Gate Verification** | Visual inspection of paper pass by guards | Instant mobile QR scan or Roll No query via Security PWA |
| **Timetable Cross-Check** | None (Faculty must manually check physical attendance) | Instant automated timetable resolution (Department + Year + Section) |
| **Disciplinary Process** | Unstructured verbal or physical incident notes | Structured workflow (`reported` $\rightarrow$ `under_review` $\rightarrow$ `resolved`/`dismissed`) |
| **Student Explanation** | Informal verbal appeal | Formal 24-hour digital explanation submission window |
| **Emergency Response** | Uncoordinated phone calls | 6-stage Incident Command (`reported` $\rightarrow$ `acknowledged` $\rightarrow$ `assigned` $\rightarrow$ `responding` $\rightarrow$ `controlled` $\rightarrow$ `resolved`) |
| **Auditability** | Vulnerable to paper loss or alteration | Immutable PostgreSQL-backed audit logs for all security actions |

---

### 1.5 Target User Roles
1. **Students**: Apply for movement passes, view real-time approval status, present digital QR gate passes, and submit explanations for violation cases.
2. **Faculty Members**: Search student locations, verify timetable schedules, detect unauthorized movement, and report class violations.
3. **Head of Department (HOD)**: Review departmental movement pass requests, investigate violation reports, review student explanations, and execute final case resolutions.
4. **Security Officers**: Scan digital QR passes, verify gate exit/entry status, authorize Early Exit when permitted, and manage gate security via mobile PWA.
5. **Institutional Admin**: Manage institution master data (users, departments, courses, rooms, timetables) and oversee system-wide audit logs and emergency incidents.

---

## 2. ROLE-BASED ACCESS CONTROL (RBAC) MATRIX

CMADMS strictly enforces server-side Role-Based Access Control (RBAC) across 5 primary roles:

| Role | Main Operational Responsibilities | Primary Route Access | Scope Boundaries |
| :--- | :--- | :--- | :--- |
| **Student** | Apply movement passes, view digital QR pass, submit violation explanations, view notifications. | `/student/dashboard`<br>`/student/passes`<br>`/student/explanations` | Restricted strictly to own student record and movement passes. |
| **Faculty** | Lookup student schedule, verify current timetable slot, submit movement violation reports. | `/faculty/dashboard`<br>`/faculty/check`<br>`/faculty/reports` | Can view student schedules and file reports; cannot alter HOD decisions. |
| **HOD** | Departmental pass approval, case investigation, review student explanations, resolve/dismiss cases. | `/hod/dashboard`<br>`/hod/cases`<br>`/hod/passes` | **Final Departmental Authority**. Strictly isolated to own department's cases and passes. |
| **Security** | Mobile QR scan, roll number check, Early Exit authorization, gate exit/entry recording. | `/security/dashboard`<br>`/security/check`<br>`/security/reports` | Full campus gate checking authority; cannot modify pass dates or HOD decisions. |
| **Admin** | Manage institution master tables, monitor global audit logs, emergency command center. | `/admin/dashboard`<br>`/admin/users`<br>`/admin/timetable`<br>`/admin/emergency` | System-wide oversight; cannot bypass HOD departmental authority on active cases. |

---

## 3. TECHNOLOGY STACK

The application is built using a modern, robust full-stack architecture:

```
[ Frontend Client ] <---> [ Server / API Layer ] <---> [ Database & Event Bus ]
(React, Tailwind, PWA)     (TanStack Start, Nitro)      (PostgreSQL, EventBus)
```

* **Frontend Framework**: React 18 with TanStack Router & TanStack Start (Server-Side Rendering).
* **Styling & UI**: TailwindCSS with shadcn/ui components, Lucide icons, and Sonner toast notifications.
* **Backend Server**: Nitro server engine powered by H3 with TypeScript runtime API functions.
* **Database Engine**: PostgreSQL with native `pg` client pool and parameterized queries.
* **Authentication**: HTTP-only session cookies stored in PostgreSQL `user_sessions` with `scrypt` password hashing.
* **Real-Time Layer**: Node.js Event Emitter server bus with frontend fallback to 15s polling.
* **PWA Engine**: Service Worker static app shell caching with Web App Manifest (`public/manifest.json`).
* **Validation & QR**: Zod schema validation, `qrcode` generator, `jsQR` camera scanner library.
* **Testing Tooling**: Automated TypeScript test runners (`tsx`).

---

## 4. KEY PROJECT ACHIEVEMENTS

1. **End-to-End Campus Safety Workflow**: Successfully integrated 5 distinct campus roles into a unified movement authorization lifecycle.
2. **Strict Department Isolation**: Implemented database-level department filtering ensuring HODs only access cases and passes within their academic domain.
3. **HOD Final Authority**: Established Department HODs as the authoritative decision-makers for all student violation cases.
4. **Server-Authoritative Time Engine**: Prevented client clock manipulation by enforcing server-calculated time windows (`BEFORE_VALIDITY`, `ACTIVE`, `EXPIRED`).
5. **642/642 Verified Timetable Slots**: Validated complete faculty schedule coverage across 25 faculty members and 7 departments with 0 room collisions or double-booking conflicts.
6. **Mobile Security Gate PWA**: Engineered an offline-aware PWA optimized for mobile security officers with 44px+ touch targets and camera QR scanning.
7. **6-Stage Emergency Command System**: Built a structured campus incident command workflow with real-time responder dispatches.
8. **Real-Time Notification Event Bus**: Delivered instant targeted notifications to students, HODs, faculty, security, and admins with automatic PostgreSQL synchronization.
9. **Backward-Compatible Password Hardening**: Migrated passwords to `salt:derivedHash` format using `scrypt` with 16-byte random salts.
10. **100% Auditability**: Logged all critical security actions into immutable PostgreSQL audit logs.

---

## 5. ONE-MINUTE PROJECT PITCH (VIVA SUMMARY)

> *"CMADMS, or CampusGuard Pro, is an enterprise-grade digital campus movement authorization and disciplinary management system designed to replace vulnerable paper gate passes and uncoordinated safety workflows.*
>
> *The system connects Students, Faculty, HODs, Security Officers, and Institutional Admins into a single server-authoritative platform. Students request digital movement passes which are approved by HODs and verified at campus gates by security officers using a Progressive Web App.*
>
> *Faculty members can look up any student's live location against a verified 642-slot timetable. If a student is out of class without permission, faculty can file a violation report which routes directly to the student's HOD. The HOD investigates, reviews student explanations, and holds final resolution authority.*
>
> *Key technical highlights include scrypt password hashing with unique random salts, real-time notification dispatching, a 6-stage emergency incident command system, and zero client-side caching of sensitive security decisions. The system has achieved 100% pass across all 733 verification tests and is fully production-ready."*

---

## 6. FINAL PROJECT STATUS

* **Real-World Edge-Case Suite**: **15 / 15 PASS**
* **Security Hardening Suite**: **16 / 16 PASS**
* **Complete E2E Workflow Audit**: **28 / 28 PASS**
* **Faculty Timetable Integrity**: **642 / 642 PASS**
* **Real-Time Notification Suite**: **15 / 15 PASS**
* **Security Gate PWA Suite**: **17 / 17 PASS**
* **TypeScript Compiler**: **0 Errors**
* **Production Build**: **SUCCESS**

**Final System Status**: **PRODUCTION READY**
