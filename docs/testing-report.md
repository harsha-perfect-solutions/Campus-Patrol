# CMADMS / CampusGuard Pro — Testing, Verification & Subsystem Documentation

---

## 1. MASTER TESTING & VERIFICATION MATRIX

The CMADMS application has undergone comprehensive automated regression, security, workflow, notification, and real-world edge-case testing. All tests have been executed on the live codebase and verified against PostgreSQL database states.

| Audit Suite / Verification Area | Command Executed | Total Points | Pass Count | Fail Count | Status |
| :--- | :--- | :---: | :---: | :---: | :---: |
| **Real-World Edge-Case Suite** | `npx tsx ./scratch/test-real-world-edge-cases.ts` | 15 | **15** | 0 | **PASS** |
| **Security Hardening Suite** | `npx tsx ./scratch/test-security-hardening-suite.ts` | 16 | **16** | 0 | **PASS** |
| **Complete E2E Workflow Audit** | `npx tsx ./scratch/test-complete-workflow.ts` | 28 | **28** | 0 | **PASS** |
| **Faculty Timetable Integrity** | `npx tsx ./scratch/test-faculty-timetable-integrity.ts` | 642 | **642** | 0 | **PASS** |
| **Real-Time Notification Suite** | `npx tsx ./scratch/test-realtime-notifications.ts` | 15 | **15** | 0 | **PASS** |
| **Security Gate PWA Suite** | `npx tsx ./scratch/test-security-pwa.ts` | 17 | **17** | 0 | **PASS** |
| **TypeScript Type Compiler** | `npx tsc --noEmit` | — | **0 Errors** | 0 | **PASS** |
| **Production Bundle Build** | `npm run build` | — | **SUCCESS** | 0 | **PASS** |
| **TOTAL VERIFICATION POINTS** | — | **733** | **733** | **0** | **100% PASS** |

---

## 2. FACULTY TIMETABLE SYSTEM & INTEGRITY REPORT

The faculty timetable system maps physical classroom schedules to specific academic groups, subjects, rooms, and assigned faculty members.

### Verified Timetable Benchmarks:
* **Total Timetable Slots**: `642`
* **Assigned Faculty Members**: `25`
* **Academic Departments Covered**: `7` (AIML, CIVIL, CSE, ECE, EEE, IT, MECH)
* **Academic Groups Covered**: `25`
* **Faculty Double-Booking Conflicts**: `0`
* **Room Collision Conflicts**: `0`
* **Academic Group Overlaps**: `0`
* **Lunch Break Protection**: Preserved across all 7 departments

### How Timetable Data Supports Faculty Verification:
When a faculty member queries a student's Roll Number during lecture hours:
1. System resolves student's Department + Year + Section.
2. System checks `class_schedules` table for the current time slot.
3. If an active class exists for that group and the student is absent without an approved movement pass, the system flags **"Unauthorized Class Movement"** and pre-fills the violation report with the exact Subject, Room, and Scheduled Faculty Name.

---

## 3. REAL-TIME NOTIFICATION SUBSYSTEM

CMADMS implements a hybrid real-time notification system combining database persistence, a server-side event bus, and automatic frontend polling fallbacks.

```
PostgreSQL Database ──► Insert Notification Record
                             │
                             ▼
                    Server Event Bus (NotificationBus)
                             │
                             ├─► Active WebSocket / SSE ──► Real-Time Toast Notification
                             │
                             └─► Offline Client ──────────► Polls /api/notifications (15s)
```

### Key Technical Features:
- **Persistence First**: Every notification is saved to the `notifications` table in PostgreSQL *before* broadcasting.
- **Targeted Routing**: Event bus routes alerts strictly to matching `recipientUserId`, `recipientRole`, or `department`.
- **15-Second Fallback Polling**: If real-time connection drops, React frontend hook (`use-realtime-notifications.ts`) automatically polls `/api/notifications` every 15 seconds.
- **Reconnection Sync**: Upon network reconnection, unread notifications are synchronized automatically from PostgreSQL.

---

## 4. SECURITY GATE PWA SUBSYSTEM

The Security Gate Verification portal (`/security/check`) is configured as a standalone Progressive Web App (PWA) tailored for Android/mobile security officers.

### Technical Implementation:
- **Manifest (`public/manifest.json`)**: Configured with `CMADMS Security Gate` name, `standalone` display mode, portrait orientation, and `#0f172a` dark theme color.
- **Service Worker (`public/sw.js`)**: Caches static app shell assets (`/`, `/security/check`, `/favicon.svg`, `/manifest.json`).
- **Cache Isolation Rule**: Service Worker explicitly bypasses `/api/` endpoints to prevent caching pass validity decisions on the client device.
- **Offline Connection Banner**: Monitors `navigator.onLine`. Displays a high-contrast red warning (`CONNECTION LOST`) and disables submit actions during internet outages.

---

## 5. DATABASE ENTITY MODEL (POSTGRESQL SCHEMA)

CMADMS relies on 11 core database tables in PostgreSQL:

| Entity / Table Name | Primary Key | Purpose | Key Access Roles |
| :--- | :--- | :--- | :--- |
| **`users`** | `id` | Core user identity & role assignment | Admin |
| **`profiles`** | `id` | Extended profile metadata & `salt:derivedHash` passwords | All Roles (Self) |
| **`students`** | `id` | Student academic records (Roll No, Dept, Year, Section) | All Roles |
| **`faculty`** | `id` | Faculty staff records and department assignments | Faculty, HOD, Admin |
| **`departments`** | `id` | Academic department master definitions | Admin |
| **`class_schedules`** | `id` | 642 master timetable slots (Subject, Room, Time, Faculty) | Faculty, HOD, Admin |
| **`movement_permissions`** | `id` | Digital movement passes (Valid window, QR, Early Exit) | Student, HOD, Security |
| **`violation_reports`** | `id` | Class movement violation cases & HOD decisions | Faculty, HOD, Admin |
| **`emergency_incidents`** | `id` | 6-stage campus emergency tracking records | Security, Admin, HOD |
| **`notifications`** | `id` | User notification logs & unread status | All Roles |
| **`audit_logs`** | `id` | Immutable security audit event log | Admin, Security, HOD |
