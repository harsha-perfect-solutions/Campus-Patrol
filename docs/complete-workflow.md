# CMADMS — Complete End-to-End Workflows

This document details the exact operational workflows implemented in CMADMS, matching the verified source code implementation.

---

## 1. Student Movement Pass Workflow

```mermaid
flowchart TD
    A[Student Login] --> B[Access /student/passes]
    B --> C[Submit Pass Request: Reason, Date, Valid From, Valid Until]
    C --> D[Pass Created with status = 'pending']
    D --> E{HOD Action}
    E -- Rejected --> F[Status set to 'rejected' + Rejection Reason logged]
    E -- Approved --> G[Status set to 'approved' + Digital QR Pass Token Generated]
    G --> H[Student displays QR Code at Campus Gate]
```

---

## 2. Security Gate Verification Workflow

```mermaid
flowchart TD
    A[Security Guard scans Student QR Code] --> B[System evaluates Server Time & Pass Validity Window]
    B --> C{Pass Validity Status}
    
    C -- Valid From > Current Time --> D[Status: BEFORE_VALIDITY]
    C -- Current Time between Valid From & Valid Until --> E[Status: ACTIVE / AUTHORIZED]
    C -- Current Time > Valid Until --> F[Status: EXPIRED / REJECTED]
    
    D --> D1{Early Exit Authorized?}
    D1 -- Yes --> D2[Override logged with Guard Reason & Exit Recorded]
    D1 -- No --> D3[Exit Denied]
    
    E --> E1[Record Gate Exit Timestamp exit_at]
    E1 --> E2[Upon return: Record Gate Entry Timestamp entry_at]
    
    F --> F1[Gate Exit Denied]
```

---

## 3. Faculty Verification & Attendance Workflow (`/check`)

```mermaid
flowchart TD
    A[Faculty logs into /check portal] --> B[Enter Student Code or Scan Student ID]
    B --> C[System queries Academic Group: Dept + Year + Section]
    C --> D[System checks Class Schedule for Current Day & Server Time]
    
    D --> E{Active Class Scheduled?}
    E -- No Class Scheduled --> F[Display: Free Period / No Class Scheduled]
    E -- Class Scheduled --> G{Active Movement Pass Approved?}
    
    G -- Approved Pass Exists --> H[Display: Authorized Movement Pass Active]
    G -- No Approved Pass --> I[Display: UNAUTHORIZED — Student Outside Class Hours]
    
    I --> J{Faculty Action}
    J -- Dismiss --> K[No Report Created]
    J -- Create Violation Report --> L[Submit Explicit Violation Report + Optional Evidence]
    L --> M[Violation Report Created with status = 'reported']
```

---

## 4. Violation & Investigation Lifecycle Workflow

```mermaid
flowchart TD
    A[Faculty creates Violation Report status='reported'] --> B[System notifies Student & HOD]
    B --> C[Student accesses /student/explanations]
    C --> D[Student submits 24h Mandatory Explanation Statement]
    
    D --> E[Status updated to 'awaiting_explanation' -> 'under_review']
    E --> F[HOD accesses /hod/violations]
    F --> G{HOD Departmental Verification}
    
    G -- Cross-Dept Action --> H[BLOCKED: Department Mismatch Error]
    G -- Same Dept Action --> I{HOD Decision}
    
    I -- Resolve Case --> J[Status set to 'resolved' + Resolution Remarks logged]
    I -- Dismiss Case --> K[Status set to 'dismissed' + Dismissal Reason logged]
    
    J --> L[System Audit Log & Student Notification Created]
    K --> L
```

---

## 5. Emergency Incident Response Workflow

```mermaid
flowchart TD
    A[Emergency Reported via /admin/emergency] --> B[Incident created with status='reported']
    B --> C[Admin / Responder Acknowledges Incident]
    C --> D[Status updated to 'acknowledged' + timestamp logged]
    D --> E[Responder Assigned]
    E --> F[Status updated to 'assigned']
    F --> G[Responder En Route / Responding]
    G --> H[Status updated to 'responding']
    H --> I[Incident Controlled status='controlled']
    I --> J[Incident Resolved status='resolved' + Resolution Remarks logged]
```
