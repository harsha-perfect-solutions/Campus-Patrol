# CMADMS / CampusGuard Pro — Live Demonstration Script

This script provides a 15-step chronological demonstration sequence for project presentation, committee review, or academic viva evaluation.

---

## DEMO SEQUENCE OVERVIEW (10–15 MINUTES)

```
1. Student Login ──► 2. Request Pass ──► 3. HOD Approves ──► 4. View QR Pass
                                                                     │
8. Faculty Check ◄── 7. Early Exit ◄── 6. Before-Validity ◄── 5. Security Scan
       │
       ▼
9. Report Violation ──► 10. HOD Case Review ──► 11. Student Explanation ──► 12. HOD Resolution
                                                                                    │
15. Admin Audit Logs ◄── 14. Emergency Center ◄── 13. Real-Time Toast ◄─────────────┘
```

---

## STEP-BY-STEP LIVE DEMO SCRIPT

### Step 1: Student Authentication
- **WHAT TO CLICK**: Open `/login`. Select **Student Login** or use demo shortcut `23CSE1012`. Click **[ SIGN IN ]**.
- **WHAT TO SHOW**: Student Dashboard displaying active semester, profile info, and recent movement passes.
- **WHAT TO EXPLAIN**: Explain that student authentication establishes a secure PostgreSQL session with role `student`.

### Step 2: Movement Pass Application
- **WHAT TO CLICK**: Navigate to `/student/passes`. Click **[ APPLY MOVEMENT PASS ]**. Select Reason (*Medical Appointment*), Date (*Today*), Valid From (*02:00 PM*), Valid Until (*05:00 PM*). Click **[ SUBMIT REQUEST ]**.
- **WHAT TO SHOW**: New pass appears in student list with status `PENDING`.
- **WHAT TO EXPLAIN**: Point out that initial status is `pending` awaiting Department HOD authorization.

### Step 3: HOD Pass Approval
- **WHAT TO CLICK**: Switch browser session to **CSE HOD** (`hod.cse@cmadms.edu`). Navigate to `/hod/passes`.
- **WHAT TO SHOW**: HOD Department Queue showing the pending pass request from student Ashok Dora (`23CSE1012`).
- **WHAT TO EXPLAIN**: Emphasize **Department Isolation**: CSE HOD only sees CSE student pass requests. Click **[ APPROVE ]**.

### Step 4: Digital QR Pass Generation
- **WHAT TO CLICK**: Switch back to Student window. Refresh or view active pass card.
- **WHAT TO SHOW**: Approved pass status `APPROVED` displaying a unique digital QR pass (`CMADMS-PASS-XXXXXX`).
- **WHAT TO EXPLAIN**: Show that the QR code encodes pass token metadata for gate verification.

### Step 5: Security Gate Verification (PWA)
- **WHAT TO CLICK**: Open Security Portal `/security/check` as Security Officer (`security@cmadms.edu`). Click **[ SCAN QR PASS ]** or enter pass ID `CMADMS-PASS-101`.
- **WHAT TO SHOW**: High-contrast mobile verification card showing student photo, name, roll number, and status `AUTHORIZED`.
- **WHAT TO EXPLAIN**: Highlight the **Mobile PWA Interface** designed for security officers with 44px+ touch buttons.

### Step 6: Demonstration of BEFORE_VALIDITY State
- **WHAT TO CLICK**: Verify a pass whose `valid_from` time is in the future (e.g., scheduled for 04:00 PM when current time is 02:30 PM).
- **WHAT TO SHOW**: Amber Golden Card displaying `⏳ PASS NOT STARTED / BEFORE VALIDITY` and `Pass starts in 90 minutes`.
- **WHAT TO EXPLAIN**: Explain **Server-Authoritative Time**: Gate pass exit is not authorized before the valid start time.

### Step 7: Demonstration of Early Exit Authorization
- **WHAT TO CLICK**: On the golden `BEFORE_VALIDITY` card, click **[ ALLOW EARLY EXIT ]**. Confirm in the modal dialog.
- **WHAT TO SHOW**: Card status transitions to `EARLY EXIT AUTHORIZED`. Exit timestamp and officer ID logged in database.
- **WHAT TO EXPLAIN**: Explain that security officers hold emergency override authority for valid early departures.

### Step 8: Faculty Student Verification & Timetable Resolution
- **WHAT TO CLICK**: Login as Faculty (`faculty.cse@cmadms.edu`). Navigate to `/faculty/check`. Input Roll No `23CSE1012`.
- **WHAT TO SHOW**: System resolves Student: Ashok Dora (CSE 3rd Year • Section A), Current Class: *Data Structures & Algorithms* in Room C-204 with Dr. K. V. Sharma.
- **WHAT TO EXPLAIN**: Show how student lookup automatically cross-references the 642 master timetable slots.

### Step 9: Movement Violation Filing
- **WHAT TO CLICK**: In Faculty Check screen, click **[ REPORT UNAUTHORIZED MOVEMENT ]**. Select Location (*Block C Corridor*), Remarks (*Student roaming during lecture*). Click **[ SUBMIT REPORT ]**.
- **WHAT TO SHOW**: Confirmation toast `Violation report filed successfully (Report ID: RPT-XXXXXX)`.
- **WHAT TO EXPLAIN**: Note that duplicate reports for the same student within 15 minutes are automatically throttled.

### Step 10: HOD Investigation Queue
- **WHAT TO CLICK**: Switch to HOD Portal `/hod/cases`.
- **WHAT TO SHOW**: New reported violation case appearing in CSE Department Queue with status `reported`.
- **WHAT TO EXPLAIN**: Click **[ START REVIEW ]**. Case status updates to `under_review`.

### Step 11: Student Explanation Submission
- **WHAT TO CLICK**: Switch to Student Portal `/student/explanations`.
- **WHAT TO SHOW**: Incident notification banner. Student opens case `#RPT-XXXXXX`, types explanation (*"Was retrieving lab manual from locker"*), attaches medical receipt. Click **[ SUBMIT EXPLANATION ]**.
- **WHAT TO EXPLAIN**: Show how student explanation is recorded within 24-hour window.

### Step 12: HOD Resolution
- **WHAT TO CLICK**: Switch back to HOD Portal `/hod/cases`. View student explanation. Enter Resolution Remarks (*"Warning issued; student advised to carry lab manual before lecture"*). Click **[ RESOLVE CASE ]**.
- **WHAT TO SHOW**: Case status transitions to `RESOLVED`. Case becomes read-only.
- **WHAT TO EXPLAIN**: Emphasize HOD final authority over departmental cases.

### Step 13: Real-Time Notification Dispatch
- **WHAT TO SHOW**: Sonner toast notification pop-up on Student screen: `Violation Report Resolved: Your incident report has been reviewed and resolved by HOD.`
- **WHAT TO EXPLAIN**: Explain how the server event bus pushes real-time alerts without full page refreshes.

### Step 14: Emergency Command Center
- **WHAT TO CLICK**: Login as Admin or Security. Open Emergency Dashboard `/admin/emergency`. Click **[ REPORT CAMPUS EMERGENCY ]**. Select Category (*Medical Emergency*), Location (*Main Staircase*).
- **WHAT TO SHOW**: Emergency Incident card created in status `REPORTED`. Demonstrate stage updates: `ACKNOWLEDGED` $\rightarrow$ `RESPONDER_ASSIGNED` $\rightarrow$ `RESOLVED`.
- **WHAT TO EXPLAIN**: Walk through the 6-stage campus emergency incident command workflow.

### Step 15: Institutional Audit Logs
- **WHAT TO CLICK**: Navigate to `/admin/audit-logs`.
- **WHAT TO SHOW**: Chronological list of all security actions logged during the demo (Pass Approved, Early Exit Granted, Violation Filed, Case Resolved, Emergency Reported).
- **WHAT TO EXPLAIN**: Conclude by showing complete 100% auditability backed by PostgreSQL.
