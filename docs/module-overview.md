# CMADMS — Module Overview

This document provides a functional breakdown of the 12 core modules comprising CMADMS.

---

## 1. Authentication & Session Management (`src/lib/api/auth.server.ts`, `src/lib/session.server.ts`)
- Manages user login, session cookie issuance (`cmadms_session_token`), password hashing with per-user salts (`salt:derivedHash`), transparent legacy hash migration, rate limiting, and sign-out.

## 2. Student Movement Permission Module (`src/routes/student/*`, `src/lib/db/passes.server.ts`)
- Enables students to apply for movement passes, view status (`pending`, `approved`, `rejected`), display digital QR pass tokens, and view past movement history.

## 3. Security Gate Verification Module (`src/routes/security/*`, `src/lib/db/security.server.ts`)
- Enables security guards to scan QR pass tokens, verify validity windows (`BEFORE_VALIDITY`, `ACTIVE`, `EXPIRED`), authorize Early Exit overrides, and record real-time gate exit/entry timestamps.

## 4. Faculty Verification & Attendance Module (`src/routes/check.tsx`, `src/lib/db/faculty.server.ts`)
- Allows faculty members to look up students by Roll Number / ID, resolve active timetable sessions, verify whether students outside class hold approved passes, and create explicit violation reports.

## 5. Timetable Management Module (`src/routes/admin/timetable.tsx`, `src/lib/db/timetable.server.ts`)
- Manages the master 642-slot weekly academic schedule, mapping academic groups (Dept + Year + Section), subjects, rooms, faculty, and time slots without conflicts.

## 6. Violation & Explanation Module (`src/routes/student/explanations.tsx`, `src/lib/db/violations.server.ts`)
- Provides a dedicated portal for students to review flagged movement violations and submit mandatory 24-hour written explanation statements.

## 7. HOD Approval & Investigation Module (`src/routes/hod/*`, `src/lib/db/hod.server.ts`)
- Serves as the decision support portal for Department Heads to review movement pass applications, investigate departmental violation reports, evaluate student explanations, and issue formal resolution or dismissal orders under strict departmental isolation.

## 8. Emergency Response Command Module (`src/routes/admin/emergency.tsx`, `src/lib/db/emergency.server.ts`)
- Command center for reporting campus safety incidents, acknowledging alerts, dispatching responders, tracking containment metrics, and resolving emergency events.

## 9. User & Role Management Module (`src/routes/admin/users.tsx`, `src/lib/db/admin.server.ts`)
- Administrative interface for viewing institutional profiles, staff codes, student roll numbers, and assigning server-side RBAC roles.

## 10. Department, Course & Room Metadata Module (`src/routes/admin/*`)
- Manages institutional metadata tables including departments, courses, room capacities, building locations, and room availability status.

## 11. Notification Subsystem (`src/lib/db/notifications.server.ts`)
- Handles system event notification dispatches to user feeds upon pass approvals, violation reports, explanation submissions, resolutions, and emergency alerts.

## 12. Audit Logging Subsystem (`src/routes/admin/audit-logs.tsx`, `src/lib/db/admin.server.ts`)
- Maintains an immutable security audit log recording all institutional lifecycle actions with actor details, timestamps, resource keys, and IP addresses.
