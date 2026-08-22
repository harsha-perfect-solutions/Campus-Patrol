# CMADMS — Notification & Audit System Architecture

## Overview
The Notification and Audit System provides user-facing event alerts and maintains an institutional audit log for security compliance.

---

## 1. Notification Subsystem (`notifications` table)
- **Real-Time Feed**: In-app notifications generated for students, faculty, security, and HODs.
- **Trigger Events**:
  - Movement pass approval or rejection $\rightarrow$ Sent to Student.
  - New violation report created $\rightarrow$ Sent to Student and HOD.
  - Student explanation submitted $\rightarrow$ Sent to HOD.
  - Violation case resolved or dismissed $\rightarrow$ Sent to Student.
  - Emergency incident reported or status updated $\rightarrow$ Sent to Admin and Security Command.

---

## 2. Immutable Audit Subsystem (`audit_logs` table)
- **Compliance Audit Trail**: Every sensitive institutional operation writes an immutable record to PostgreSQL `audit_logs`.
- **Logged Attributes**: `actor_id`, `actor_name`, `actor_role`, `action`, `resource`, `details` (JSON object), `ip_address`, `created_at`.
- **Logged Actions**:
  - User login & authentication events.
  - Movement pass requests, approvals, and rejections.
  - Security gate verifications and early exit overrides.
  - Violation report submissions, student explanations, and HOD resolutions.
  - Emergency incident dispatches and resolutions.
  - Administrative user management and timetable adjustments.
