# CMADMS — Emergency Response Architecture

## Overview
The Emergency Response System provides real-time reporting, dispatch, responder tracking, and incident resolution for campus safety incidents (e.g. physical altercations, medical emergencies, fire hazards).

---

## Emergency Incident Lifecycle

```mermaid
flowchart TD
    Report[Incident Reported via /admin/emergency] --> Status1[status: reported]
    Status1 --> Ack[Admin / Responder Acknowledges Incident]
    Ack --> Status2[status: acknowledged + acknowledged_at timestamp]
    Status2 --> Assign[Assign Campus Security / Medical Responder]
    Assign --> Status3[status: assigned + assigned_at timestamp]
    Status3 --> Dispatch[Responder En Route / On Site]
    Dispatch --> Status4[status: responding + responding_at timestamp]
    Status4 --> Control[Incident Controlled]
    Control --> Status5[status: controlled + controlled_at timestamp]
    Status5 --> Resolve[Incident Resolved + Resolution Remarks]
    Resolve --> Status6[status: resolved + resolved_at timestamp]
```

---

## Response Metric Tracking
For every emergency incident, the system records milestone timestamps in `emergency_incidents`:
- **Response Time**: `acknowledged_at - created_at`
- **Dispatch Time**: `assigned_at - acknowledged_at`
- **Containment Time**: `controlled_at - responding_at`
- **Total Resolution Duration**: `resolved_at - created_at`

All emergency state transitions generate high-priority notifications and immutable audit log entries.
