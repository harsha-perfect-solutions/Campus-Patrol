# CMADMS — Timetable Architecture & Class Verification

## Overview
The CMADMS Timetable System manages the master academic schedule across 7 departments, 25 academic groups, 25 faculty members, and 642 weekly timetable slots. It powers real-time class verification in the Faculty `/check` portal.

---

## Timetable Resolution Hierarchy

```mermaid
flowchart TD
    Dept[Department] + Year[Academic Year] + Sec[Section] --> Grp[Academic Group]
    Grp --> Schedule[Timetable System]
    Day[Server Day of Week] + Time[Server Current Time] --> Resolution[Real-Time Class Lookup]
    Schedule --> Resolution
    Resolution --> Result{Active Class Scheduled?}
    
    Result -- Yes --> Info[Subject + Faculty + Room]
    Result -- No --> Free[Free Period / No Class Scheduled]
```

---

## Verified Timetable Integrity Benchmarks
- **Total Timetable Slots**: 642 slots
- **Faculty Members Assigned**: 25 faculty members
- **Departments Covered**: 7 (AIML, CIVIL, CSE, ECE, EEE, IT, MECH)
- **Academic Groups Covered**: 25 groups
- **Faculty Conflicts**: 0 conflicts
- **Room Conflicts**: 0 conflicts
- **Academic Group Conflicts**: 0 conflicts
- **Lunch Break Conflicts**: 0 conflicts

---

## Real-Time Class & Outside Status Resolution (`/check`)

When a faculty member checks a student on `/check`:

1. **Student Academic Group Lookup**:
   - Retrieves student record by `student_code` (e.g. `23CSE1012`).
   - Resolves academic group (e.g. `Department: CSE`, `Year: 3rd Year`, `Section: Section A`).

2. **Server-Authoritative Time Match**:
   - Obtains current server day of week (e.g. `Monday`) and current time (e.g. `10:42 AM`).
   - Queries `class_schedules` matching Academic Group + Day + Time window.

3. **Pass Status Verification**:
   - If an active class is scheduled, queries `movement_permissions` for an `approved` movement pass for the student covering the current date and time window.

4. **Resolution Outcomes**:
   - **No Class Scheduled**: Student is in a free period or outside class hours (No violation possible).
   - **Active Class + Approved Pass**: Authorized movement (Pass details displayed).
   - **Active Class + No Approved Pass**: **UNAUTHORIZED** (Student is outside during scheduled class hours without permission).
