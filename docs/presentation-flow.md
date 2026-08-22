# CMADMS — Presentation & Live Demonstration Guide

This guide provides ready-to-use scripts for presenting **CampusGuard Pro (CMADMS)** during project reviews, PPT presentations, and viva demonstrations.

---

## 1. The 1-Minute Elevator Pitch ("What is CMADMS?")

> "Good morning/afternoon, Respected Evaluators. 
> 
> **CMADMS (Campus Movement and Attendance Decision Support System)** is an automated, multi-role campus management platform designed to eliminate unauthorized student movement and streamline gate security.
> 
> Currently, colleges face major challenges tracking students who leave classrooms or campus during active class hours. CMADMS solves this by connecting Students, Faculty, Security Guards, Department Heads (HODs), and Administrators into a unified digital workflow. 
> 
> When a student requests a digital movement pass, the HOD approves it digitally. Gate security guards scan QR passes to verify real-time validity, while faculty members use our `/check` portal to verify whether a student outside during class hours holds an authorized pass. Built using React 19, TanStack Start, and PostgreSQL, CMADMS ensures complete security, zero timetable conflicts, and full institutional audit compliance."

---

## 2. The 3-Minute Technical Overview ("How does it work?")

> "Technically, CMADMS is built on a type-safe full-stack architecture using **TanStack Start**, **React 19**, **Tailwind CSS v4**, and **PostgreSQL**.
> 
> The system enforces strict **Role-Based Access Control (RBAC)** across five distinct portals:
> 1. **Student Portal**: Students apply for passes, view active QR codes, and respond to violation reports within a mandatory 24-hour window.
> 2. **Faculty Portal (`/check`)**: Faculty members enter a student's roll number to check real-time schedule status. The system automatically cross-references our 642-slot deterministic timetable engine against active movement passes to detect unauthorized movements.
> 3. **Security Gate Portal**: Security guards scan QR pass tokens. The system checks server-authoritative time against validity windows (`BEFORE_VALIDITY`, `ACTIVE`, `EXPIRED`), logs gate entry/exit timestamps, and supports guard-authorized Early Exit overrides.
> 4. **HOD Decision Portal**: HODs approve pass requests and investigate departmental violations under strict server-side departmental isolation (e.g. CSE HOD cannot access ECE records).
> 5. **Admin Command Center**: Manages emergency response dispatches, user roles, rooms, timetables, and immutable audit logs.
> 
> On the security side, CMADMS uses `scrypt` password hashing with unique per-user 16-byte random salts (`salt:derivedHash`), transparent legacy hash migration, login rate limiting, and Zod environment validation."

---

## 3. The 5-Minute Live Demonstration Script

Follow this step-by-step route sequence for a seamless live demonstration:

1. **Step 1: Student Login & Pass Request**
   - Navigate to `/login` $\rightarrow$ Log in as Student (`student@cmadms.edu`).
   - Open `/student/passes` $\rightarrow$ Submit a new Movement Pass request (Reason: *Library Reference*, Date: *Today*, Valid From: *10:00 AM*, Valid Until: *12:00 PM*).
   - Show status is currently `pending`.

2. **Step 2: HOD Pass Approval**
   - Log out and log in as CSE HOD (`hod.cse@campus.edu`).
   - Open `/hod/passes` $\rightarrow$ Review the pending pass request $\rightarrow$ Click **Approve**.

3. **Step 3: Student Digital QR Pass Verification**
   - Log back in as Student $\rightarrow$ Open `/student/passes`.
   - Show updated status (`approved`) and open the generated **Digital QR Pass Token**.

4. **Step 4: Security Gate Verification**
   - Navigate to `/security/check` $\rightarrow$ Scan or submit pass ID.
   - Show real-time time evaluation (`ACTIVE / AUTHORIZED`) and click **Record Gate Exit** to log `exit_at` timestamp.

5. **Step 5: Faculty Check & Unauthorized Violation Reporting**
   - Log in as Faculty (`faculty.cse@campus.edu`) $\rightarrow$ Navigate to `/check`.
   - Perform lookup for student `23CSE1012`.
   - Demonstrate active class detection $\rightarrow$ Select a student without a pass to show **UNAUTHORIZED** status.
   - Click **Report Violation** to log case `RPT-XXXXXX`.

6. **Step 6: Student 24h Explanation Submission**
   - Log in as Student $\rightarrow$ Open `/student/explanations`.
   - Select flagged violation $\rightarrow$ Submit written explanation statement (*"Attended lab session with permission"*).

7. **Step 7: HOD Investigation & Case Resolution**
   - Log in as CSE HOD $\rightarrow$ Open `/hod/violations`.
   - View student explanation and investigation details $\rightarrow$ Click **Resolve Case**.
   - Show updated status (`resolved`) and corresponding entry in `/admin/audit-logs`.
