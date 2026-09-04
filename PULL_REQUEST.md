# Pull Request: Real-Time QR Verification, Counselor-First Violation Routing & Counselor-Student Assignment Visibility System

## 📌 Executive Summary

This Pull Request delivers three major production systems to **CMADMS (Campus Movement & Absence Detection Management System)**:

1. **Real-Time QR Verification System** — A unified, server-authoritative engine handling both **Normal Movement QR** and **Club / Event QR** passes with multi-scan lifecycle (`EXIT` and `ENTRY`), opaque cryptographic token verification, and enhanced mobile browser camera decoding.
2. **Counselor-First Violation Routing & Resolution Workflow** — Server-authoritative routing of student violation reports to their assigned Class Counselor for 1st-level counseling and resolution (`Resolve` vs. `Escalate to HOD`).
3. **Counselor–Student Assignment Visibility System** — Complete bidirectional visibility for Counselors (filterable roster of assigned students, active counts, and movement pass approvals) and Students (read-only "My Assigned Counselor" card on Student Dashboard).

---

## 🚀 Key Features & Architectural Changes

### 1. Real-Time QR Verification System
- **Unified Backend Engine**: `verifyGatePassApi` validates both `NORMAL_MOVEMENT` and `CLUB_EVENT` passes against PostgreSQL database constraints.
- **Cryptographic & Opaque Tokens**: QR codes store non-predictable opaque tokens linked to DB records without exposing raw student IDs.
- **Multi-Scan Pass Lifecycle**: Passes remain valid for multiple gate transactions (`EXIT` → `ENTRY`) during their authorized time window rather than being permanently invalidated on first scan.
- **Safe Relational Database Schema**: Replaced unsafe polymorphic keys with explicit nullable foreign keys (`movement_permission_id`, `event_participant_id`) enforced by a `CHECK` constraint (`EXACTLY_ONE_PERMISSION_SOURCE`).
- **Mobile Camera Decoder Optimization**: Enhanced `src/components/qr-scanner-modal.tsx` with multi-pass scanning (downscaled 800px target, 65% center crop, and Otsu adaptive glare binarization for mobile phone screens).

### 2. Counselor-First Violation Workflow
- **Server Routing**: `createViolationReport` uses `findActiveCounselorForStudent` to automatically assign incoming violation cases to the student's assigned counselor (`assigned_counselor_id`).
- **Counselor 1st-Level Resolution**: Counselors can review student explanations in the Counselor Workspace (`/faculty/counselor`) and either:
  - **`RESOLVE`**: Resolves the violation report locally.
  - **`ESCALATE TO HOD`**: Escalates the case to the Department HOD with counselor remarks.
- **Fallback**: If no active counselor assignment exists, cases route directly to the HOD (`NO_COUNSELOR`).

### 3. Counselor–Student Assignment Visibility System
- **Faculty Counselor Workspace (`/faculty/counselor`)**:
  - **Expandable Sidebar Dropdown**: Added sub-menu items under **Counseling** in the left sidebar (`Violation Cases`, `Pass Approvals`, `Assigned Students`).
  - **"My Assigned Students" Roster**: Displays Roll Number, Student Name, Email Address, Department, Year, Section, and Assignment Date.
  - **Search & Multi-Column Filters**: Filter assigned students by Search string, Department, Year, and Section.
  - **Strict Roster Isolation**: Counselors can strictly view only students assigned to them.
- **Student Dashboard (`/student/dashboard`)**:
  - **"My Assigned Counselor" Card**: Displays Counselor Name, Faculty ID, Department, Role ("Class Counselor"), and Email.
  - **Unassigned Fallback**: Shows `"Counselor not assigned. Please contact Admin/HOD."` if no counselor mapping exists.
- **RPC Endpoint Security**: Created `getCounselorStudentsApi` (faculty role) and `getMyCounselorApi` (student role) using TanStack Start `createServerFn` RPC wrappers.

---

## 🛠️ Modified & Added Files

| File Path | Description |
| :--- | :--- |
| [`src/lib/db/counselor.server.ts`](file:///d:/patrol/src/lib/db/counselor.server.ts) | Counselor DB schema, student assignment lookups, `getCounselorStudents`, `getStudentCounselorDetailsForUser`, and dashboard stats. |
| [`src/lib/api/counselor.server.ts`](file:///d:/patrol/src/lib/api/counselor.server.ts) | Server RPC functions (`getCounselorStudentsApi`, `getMyCounselorApi`, `approveCounselorPassApi`, `resolveCounselorViolationApi`). |
| [`src/routes/faculty/counselor.tsx`](file:///d:/patrol/src/routes/faculty/counselor.tsx) | Counselor Workspace UI with sidebar tab routing, pass acceptance actions, search bar, and multi-column student filters. |
| [`src/routes/student/dashboard.tsx`](file:///d:/patrol/src/routes/student/dashboard.tsx) | Student Dashboard UI with read-only "My Assigned Counselor" card. |
| [`src/components/shells/role-shells.tsx`](file:///d:/patrol/src/components/shells/role-shells.tsx) | Updated left sidebar navigation with expandable `Counselor Workspace` dropdown menu. |
| [`src/lib/db/violations.server.ts`](file:///d:/patrol/src/lib/db/violations.server.ts) | Counselor-First violation report creation, routing, resolution, and escalation. |
| [`src/components/qr-scanner-modal.tsx`](file:///d:/patrol/src/components/qr-scanner-modal.tsx) | Upgraded camera frame capture, downscaling, center crop, and adaptive binarization. |
| [`vite.config.ts`](file:///d:/patrol/vite.config.ts) | Development server setting `allowedHosts: true` for Cloudflare Quick Tunnel access. |
| [`scratch/test-counselor-student-visibility.ts`](file:///d:/patrol/scratch/test-counselor-student-visibility.ts) | Automated integration test suite validating all 8 Counselor-Student visibility requirements. |

---

## 🧪 Verification & Automated Testing

### 1. Integration Test Suite (`scratch/test-counselor-student-visibility.ts`)
Run:
```bash
npx tsx scratch/test-counselor-student-visibility.ts
```
**Test Results**:
```text
=== RUNNING COUNSELOR-STUDENT ASSIGNMENT VISIBILITY INTEGRATION TESTS ===
✓ Fixtures created.
✓ Test Case 2 Passed: Counselor with 0 students returns count 0 & empty list.
✓ Test Case 5 Passed: Student with no counselor returns unassigned message.
✓ Test Case 1 Passed: Counselor with 36 students displays exact count & full roster.
✓ Test Case 3 Passed: Student 1 correctly fetches Counselor A (Prof. Alice Advisor).
✓ Test Case 4 Passed: Student 2 correctly fetches Counselor B (Prof. Bob Mentor).
✓ Test Case 6 Passed: Server authorization isolates counselor student rosters.
✓ Test Case 7 Passed: Admin reassignment immediately updates counselor counts and student's My Counselor view.
✓ Test Case 8 Passed: Counselor-First violation routing successfully routes to assigned Counselor B.

ALL 8 COUNSELOR-STUDENT ASSIGNMENT VISIBILITY TESTS PASSED SUCCESSFULLY! 🎉
```

### 2. TypeScript Compilation Check
Run:
```bash
npx tsc --noEmit
```
**Result**: `0 errors` (Clean compilation across all server and client modules).

### 3. Production Bundle Build
Run:
```bash
npm run build
```
**Result**: `Built Nitro server bundle in 2.33s` (`.output/nitro.json` generated successfully).

---

## 🔒 Security & Data Safety
- All data retrieval endpoints enforce server-side session authentication (`requireRole`).
- No client-side component imports `*.server.ts` modules directly.
- Student roster data is strictly scoped per logged-in counselor; students cannot view or mutate counselor assignments.
