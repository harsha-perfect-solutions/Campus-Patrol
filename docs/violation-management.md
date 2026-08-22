# CMADMS — Violation Management Architecture

## Overview
Violation management in CMADMS handles unauthorized student movements, faculty reporting, mandatory student 24-hour explanations, HOD departmental investigations, and case resolution.

---

## Violation Case Lifecycle

```mermaid
flowchart TD
    A[Faculty detects Unauthorized Student on /check] --> B[Faculty manually submits Explicit Violation Report]
    B --> C[Report Created status = 'reported']
    C --> D[Notification sent to Student & HOD]
    D --> E[Student submits mandatory 24h Explanation Statement]
    E --> F[Status transitions to 'under_review']
    F --> G{HOD Case Investigation}
    G -- Resolved --> H[Status set to 'resolved' + Action/Penalty logged]
    G -- Dismissed --> I[Status set to 'dismissed' + Dismissal Reason logged]
```

---

## Key Design & Policy Principles

### 1. Explicit Faculty Reporting
- Detection of an unauthorized student on `/check` does **NOT** automatically log a violation report.
- Faculty members evaluate situational context (e.g. medical emergency, faculty note) and must make an explicit decision to create a report.

### 2. Mandatory 24-Hour Student Explanation Window
- When a report is created, an `explanation_deadline` is set to `created_at + 24 hours`.
- Students view flagged reports in `/student/explanations` and submit their written explanation statement within the 24-hour window.

### 3. HOD Departmental Authority & Isolation
- Violation reports land in the HOD departmental queue (`/hod/violations`).
- HODs investigate cases using student schedule data, gate verification logs, and student explanations.
- Cross-department resolution is strictly blocked server-side by HOD department validation.
