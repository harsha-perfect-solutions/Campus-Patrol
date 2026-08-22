# CMADMS — Final Live Demonstration Checklist

This checklist provides step-by-step route and action instructions for demonstrating **CampusGuard Pro (CMADMS)** to project evaluators.

---

## 1. Student Portal Demonstration
- [ ] **Login**: Navigate to `/login` and sign in with `student@cmadms.edu` / `Password123!`.
- [ ] **Dashboard**: View active student details (Ashok Dora, 23CSE1012), attendance summary, and quick links.
- [ ] **Request Movement Pass**: Go to `/student/passes` $\rightarrow$ Submit pass request (*Reason: Library Reference, Time: 10:00 AM - 12:00 PM*). Show status set to `pending`.
- [ ] **View Digital QR Pass**: Once approved, view the generated digital QR code pass token.
- [ ] **Submit 24h Explanation**: Go to `/student/explanations` $\rightarrow$ Select flagged violation case `RPT-890453` $\rightarrow$ Submit written explanation statement.

---

## 2. Faculty Portal Demonstration
- [ ] **Login**: Sign in with `faculty.cse@campus.edu` / `Password123!`.
- [ ] **Verify Student (`/check`)**: Enter student roll number `23CSE1012`.
- [ ] **Timetable Schedule Lookup**: Observe real-time resolution of active class (Data Structures, Room C-204).
- [ ] **Outside-Class Verification**: Show system detection of **UNAUTHORIZED** status when a student is outside class hours without an approved pass.
- [ ] **Report Violation**: Click **Report Violation** to submit an explicit report to the HOD queue.
- [ ] **My Timetable**: View `/faculty/timetable` to show assigned teaching periods with live "In Session" indicators.

---

## 3. Department HOD Portal Demonstration
- [ ] **Login**: Sign in with `hod.cse@campus.edu` / `Password123!`.
- [ ] **Movement Pass Approval**: Go to `/hod/passes` $\rightarrow$ Review student pass application $\rightarrow$ Click **Approve**.
- [ ] **Violation Investigation Queue**: Go to `/hod/violations` $\rightarrow$ View flagged violation case `RPT-890453`.
- [ ] **Review Evidence & Explanation**: Inspect faculty violation remarks and student explanation statement.
- [ ] **Resolve / Dismiss Case**: Click **Resolve Case** to enforce action or **Dismiss Case** to excuse the student.
- [ ] **Department Isolation Check**: Demonstrate server-side isolation blocking access to non-CSE department cases.

---

## 4. Security Gate Verification Demonstration
- [ ] **Login**: Sign in with `security@cmadms.edu` / `Password123!`.
- [ ] **Scan / Verify Pass**: Open `/security/check` $\rightarrow$ Enter or scan QR pass token.
- [ ] **Time Window Evaluation**: Show server-authoritative time evaluation (`BEFORE_VALIDITY`, `ACTIVE`, `EXPIRED`).
- [ ] **Early Exit Override**: Demonstrate authorizing an **Early Exit** for urgent student departures before `valid_from`.
- [ ] **Gate Exit & Entry Logging**: Record `exit_at` timestamp on departure and `entry_at` timestamp upon return.

---

## 5. Admin Command Center Demonstration
- [ ] **Login**: Sign in with `admin@cmadms.edu` / `Password123!`.
- [ ] **Institutional Dashboard**: View real-time campus statistics, active movement passes, and violation metrics.
- [ ] **Master Timetable Manager**: Open `/admin/timetable` $\rightarrow$ View, add, or edit 642 master class slots.
- [ ] **Emergency Command Center**: Open `/admin/emergency` $\rightarrow$ Report safety incident, acknowledge alert, assign responder, and transition status to `resolved`.
- [ ] **Immutable Audit Logs**: Open `/admin/audit-logs` $\rightarrow$ Filter system lifecycle actions with actor details, timestamps, and IP addresses.
