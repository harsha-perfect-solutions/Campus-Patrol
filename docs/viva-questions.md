# CMADMS / CampusGuard Pro — Comprehensive Viva Questions & Answers

---

## 1. SYSTEM CONCEPTS & ARCHITECTURE

#### Q1: What is CMADMS and what core problem does it solve?
**A**: CMADMS (CampusGuard Pro) is a digital campus movement authorization and disciplinary management system. It replaces insecure paper gate passes, untracked student class absences, and uncoordinated emergency responses with a server-authoritative platform connecting Students, Faculty, HODs, Security, and Admins.

#### Q2: Why did you choose PostgreSQL over a NoSQL database like MongoDB?
**A**: CMADMS requires strict relational data integrity, ACID-compliant multi-table transactions (e.g., updating pass status, creating audit logs, and dispatching notifications atomically), and complex SQL joins for timetable and departmental isolation. PostgreSQL provides superior relational security and performance.

#### Q3: Why is server-authoritative time critical in CMADMS?
**A**: Relying on client device time allows users or security guards to manipulate their system clock to validate expired or future passes. CMADMS evaluates all time states (`BEFORE_VALIDITY`, `ACTIVE`, `EXPIRED`) using server-authoritative PostgreSQL timestamps (`CURRENT_DATE` and `CURRENT_TIME`).

#### Q4: Why does the Department HOD hold final authority over violation cases?
**A**: HODs are academically and administratively responsible for students in their department. Institutional policy dictates that faculty report violations, but HODs investigate, review explanations, and execute final disciplinary resolutions or dismissals.

#### Q5: How does Role-Based Access Control (RBAC) work in CMADMS?
**A**: RBAC is enforced server-side using helper functions (`requireRole`, `requireAnyRole`) that extract role identity from the PostgreSQL-backed session cookie. If a user attempts to access an endpoint unauthorized for their role, the server rejects the request with HTTP 403 Forbidden.

---

## 2. SECURITY & AUTHENTICATION

#### Q6: How are user passwords secured in CMADMS?
**A**: Passwords are hashed using Node.js `scrypt` with a cryptographically secure 16-byte random salt generated per user (`crypto.randomBytes(16)`). Passwords are stored in `salt:derivedHash` format.

#### Q7: How does the system handle legacy password migration?
**A**: When a user with a legacy single-secret hash logs in, `verifyPasswordDetailed()` validates the credential and flags `isLegacy: true`. The server automatically re-hashes the raw password using the new random salt format and updates PostgreSQL without forcing a user password reset.

#### Q8: What is timing-safe password verification and why is it used?
**A**: We use `crypto.timingSafeEqual` during hash comparisons. This prevents timing side-channel attacks where an attacker deduces password hash characters based on subtle differences in response execution times.

#### Q9: How does login rate limiting protect the system?
**A**: The rate limiter tracks failed authentication attempts by user account. If 5 consecutive failed attempts occur on production environment, the account is temporarily blocked to prevent brute-force credential stuffing. Successful login resets the counter.

#### Q10: How does CMADMS prevent SQL Injection attacks?
**A**: 100% of database queries use parameterized SQL inputs (`$1`, `$2`, `$3`) handled by the native PostgreSQL `pg` driver. User input is never concatenated directly into raw SQL strings.

---

## 3. WORKFLOWS & WORKFLOW STATE MACHINES

#### Q11: Explain the lifecycle of a student movement pass.
**A**: Student requests pass (`pending`) $\rightarrow$ HOD approves (`approved`) $\rightarrow$ Digital QR generated $\rightarrow$ Security scans QR $\rightarrow$ Gate exit recorded (`exit_at`) $\rightarrow$ Gate entry recorded (`entry_at`) $\rightarrow$ Pass status becomes `COMPLETED`.

#### Q12: How does the "Early Exit" feature work?
**A**: If a student presents an approved pass at the gate *before* its valid start time (`BEFORE_VALIDITY` state), the security officer can click **[ ALLOW EARLY EXIT ]**. This prompts a confirmation modal, logs `early_exit_authorized = TRUE`, records the officer's ID, and permits gate exit.

#### Q13: How does faculty student verification work against the timetable?
**A**: Faculty enters a student's Roll Number. The server resolves the student's Department + Year + Section, queries `class_schedules` for the current time slot, and determines if an active class exists. If the student is absent without an approved pass, an unauthorized movement violation can be reported.

#### Q14: How are duplicate violation reports prevented?
**A**: The server checks if a report for the same student code, violation type, and reporting faculty exists within the last 15 minutes. If found, the duplicate submission is rejected.

#### Q15: Explain the 6-stage Emergency Incident Command workflow.
**A**: `reported` $\rightarrow$ `acknowledged` $\rightarrow$ `responder_assigned` $\rightarrow$ `responding` $\rightarrow$ `controlled` $\rightarrow$ `resolved`. Each transition records an immutable audit log entry and dispatches real-time alerts. Resolution requires mandatory remarks.

---

## 4. PWA, NOTIFICATIONS & DATA INTEGRITY

#### Q16: Why did you build the Security Gate portal as a PWA?
**A**: Security officers operate on mobile devices across campus gates. A PWA provides a native mobile application experience (home screen installation, standalone portrait view, camera QR scanning) without requiring native app store deployments.

#### Q17: Why are API responses explicitly excluded from Service Worker caching?
**A**: Caching `/api/` endpoints in the Service Worker could cause stale pass validity data to be stored on the device. Excluding API routes guarantees every security check performs live server validation.

#### Q18: How does the real-time notification engine handle connection losses?
**A**: Notifications are saved to PostgreSQL *before* broadcasting via the server event bus. If a client disconnects, the frontend hook falls back to 15-second polling and synchronizes missed notifications upon reconnection.

#### Q19: How is Department Isolation enforced for HODs?
**A**: Every HOD query includes `WHERE UPPER(department) = UPPER($hod_department)`. HODs can physically only query database records belonging to their department.

#### Q20: What role do Audit Logs play in CMADMS?
**A**: The `audit_logs` table records every security-critical action (pass approval, gate check, violation filing, resolution, emergency update) with actor identity, timestamp, and JSON metadata for institutional accountability.

---

## 5. TIMETABLE, TESTING & VIVA CONCLUDING QUESTIONS

#### Q21: How was the faculty timetable integrity verified?
**A**: An automated test suite (`test-faculty-timetable-integrity.ts`) validated all 642 master timetable slots across 25 faculty members and 7 departments, confirming 0 room collisions and 0 faculty double-booking conflicts.

#### Q22: What happens if a student has an approved movement pass during lecture hours?
**A**: When a faculty member checks the student, the system detects the active approved movement pass and suppresses unauthorized movement warnings, preventing incorrect violation reporting.

#### Q23: How does the system handle lunch break conflicts in timetables?
**A**: The timetable generator and schedule resolver explicitly exclude the 12:00 PM – 01:00 PM lunch window across all academic departments.

#### Q24: What is the difference between Resolving a case and Dismissing a case?
**A**: **Resolving** a case implies the violation occurred or required administrative action/warning. **Dismissing** a case implies the report was exonerated or filed in error. Both actions require mandatory HOD notes.

#### Q25: How did you test the complete application?
**A**: We constructed 6 automated test suites covering 733 total verification points across security, workflows, timetable integrity, real-time notifications, PWA behavior, and edge cases.

#### Q26: What is the total test pass rate of CMADMS?
**A**: 733 out of 733 verification points passed (100% success rate), with 0 TypeScript compiler errors and clean production build compilation.

#### Q27: What are the current operational limitations of CMADMS?
**A**: Current limitations include dependence on active mobile network connectivity at gates (with offline visual alert fallback) and soft-push notification delivery rather than native SMS gateway integration.

#### Q28: What is the proposed Future Scope for CMADMS?
**A**: Distributed Redis rate limiting, hardware turnstile/RFID gate integration, AI-driven student anomaly detection, and SMS emergency gateways.

#### Q29: Why TanStack Start and Nitro for backend server execution?
**A**: TanStack Start provides type-safe server functions (`createServerFn`) that execute seamlessly alongside SSR React routes, while Nitro offers an ultra-fast H3 server engine.

#### Q30: What is the final production readiness verdict for CMADMS?
**A**: **PRODUCTION READY**.
