# CMADMS — Movement Pass System Architecture

## Overview
The Movement Pass System manages digital movement permission requests, HOD authorization workflows, QR code pass generation, real-time gate time verification, and early exit overrides.

---

## Pass Lifecycle & State Engine

```mermaid
flowchart TD
    Req[Student submits Request on /student/passes] --> Pending[Status: pending]
    Pending --> Decision{HOD Review}
    Decision -- Reject --> Rejected[Status: rejected + Rejection Reason]
    Decision -- Approve --> Approved[Status: approved + QR Token Generated]
    
    Approved --> GateScan[Security Guard Scans QR at Gate]
    GateScan --> TimeCheck{Server Time vs Valid From / Valid Until}
    
    TimeCheck -- Current Time < Valid From --> BeforeVal[BEFORE_VALIDITY]
    TimeCheck -- Valid From <= Current Time <= Valid Until --> Active[ACTIVE / AUTHORIZED]
    TimeCheck -- Current Time > Valid Until --> Expired[EXPIRED / REJECTED]
    
    BeforeVal --> EarlyExitCheck{Early Exit Override?}
    EarlyExitCheck -- Authorized by Security --> GateExit[Recorded: Gate Exit Timestamp exit_at]
    EarlyExitCheck -- Denied --> ExitBlocked[Gate Exit Blocked]
    
    Active --> GateExit
    GateExit --> GateEntry[Recorded: Gate Return Entry Timestamp entry_at]
```

---

## Key Operational Rules

1. **Digital QR Code Tokens**:
   - Approved passes generate a signed digital QR code token containing pass UUID, student code, valid window, and issue signature.

2. **Time Validity Evaluation**:
   - **`BEFORE_VALIDITY`**: Attempting to exit prior to `valid_from` start time.
   - **`ACTIVE`**: Current time is within `valid_from` and `valid_until`.
   - **`EXPIRED`**: Exceeds `valid_until` timestamp.

3. **Early Exit Override Mechanics**:
   - Guards can authorize an **Early Exit** for urgent student departures prior to `valid_from`.
   - Authorizing an Early Exit logs `early_exit_override = true` and the guard's reason in `gate_verifications` without altering the original pass validity parameters.
