# CMADMS / CampusGuard Pro — Security Architecture & Hardening Controls

---

## 1. IMPLEMENTED SECURITY MECHANISMS SUMMARY

CMADMS incorporates 13 security and hardening controls to ensure zero unauthorized access, data leakage, or privilege escalation across the campus environment:

```
[ Ingress Request ]
       │
       ▼
[ Rate Limiter ] ──► Exceeds 5 attempts? ──► Block Request (HTTP 429)
       │
       ▼
[ Session Authenticator ] ──► Valid PostgreSQL Session? ──► Extract Role & Dept
       │
       ▼
[ Server-Side RBAC Guard ] ──► Authorized Role for Endpoint? ──► Continue
       │
       ▼
[ Department Isolation Filter ] ──► Matches User's Department? ──► Continue
       │
       ▼
[ Parameterized SQL Query ] ──► Executes Safely against PostgreSQL
```

---

## 2. DETAILED SECURITY CONTROL BREAKDOWN

### 2.1 Password Hashing & Salt Strategy (`scrypt`)
- **Algorithm**: Node.js native `crypto.scryptSync`.
- **Salt Generation**: 16-byte cryptographically secure random salt generated via `crypto.randomBytes(16)` per user password.
- **Stored Password Format**: `salt:derivedHash` (e.g. `a1b2c3d4e5f6...:9f8e7d6c5b4a...`).
- **Why It Matters**: Prevents rainbow table attacks and pre-computed hash lookup attacks. Identical passwords submitted by different users produce completely distinct hashes.

### 2.2 Transparent Legacy Password Migration
- **Backward Compatibility**: System supports verification of legacy single-secret `scrypt` hashes.
- **Transparent Migration**: When a user with a legacy hash logs in successfully, `verifyPasswordDetailed()` flags `isLegacy: true`. The server automatically re-hashes the raw password using the new salted format (`salt:derivedHash`) and updates the `profiles` table in PostgreSQL.
- **Why It Matters**: Upgrades database password security without forcing user password resets or disrupting active accounts.

### 2.3 Timing-Safe Comparison
- **Implementation**: Utilizes `crypto.timingSafeEqual` during hash comparisons.
- **Why It Matters**: Mitigates timing side-channel attacks by ensuring verification time remains constant regardless of whether the password guess is correct or incorrect.

### 2.4 Login Rate Limiting
- **Threshold**: Activates after 5 consecutive failed authentication attempts for a specific account.
- **Reset Trigger**: Cleared immediately upon a successful login.
- **Why It Matters**: Protects student and staff user accounts from automated brute-force credential stuffing attacks.

### 2.5 PostgreSQL Session Validation
- **Session Tokens**: Cryptographically generated UUID session identifiers stored in HTTP-only cookies and recorded in `user_sessions`.
- **Server Verification**: Every request resolves active session state against PostgreSQL. Expired sessions (`NOW() > expires_at`) are rejected immediately.
- **Why It Matters**: Prevents session hijacking, stolen cookie reuse, and client-side session forgery.

### 2.6 Server-Side Role-Based Access Control (RBAC)
- **Helper Functions**: `requireRole(session, allowedRoles)` and `requireAnyRole(session, allowedRoles)`.
- **Enforcement Site**: Executed on the server inside API endpoints and route loaders before performing business logic.
- **Why It Matters**: Ensures client-side URL tampering or role modification cannot grant access to unauthorized features.

### 2.7 Departmental SQL Isolation
- **Mechanism**: Every HOD query explicitly appends `WHERE UPPER(department) = UPPER($session_department)`.
- **Why It Matters**: Guarantees complete data segregation between academic departments. HODs cannot view or modify violation reports from other departments.

### 2.8 Parameterized SQL Queries
- **Implementation**: All database interactions use positional parameters (`$1`, `$2`, `$3`) via the PostgreSQL native driver `db.query(sql, params)`.
- **Why It Matters**: Eliminates SQL injection vulnerabilities across all search inputs, roll number fields, and report descriptions.

### 2.9 Server-Authoritative Time Engine
- **Mechanism**: All movement pass validity evaluations use PostgreSQL `CURRENT_DATE` and `CURRENT_TIME`.
- **Why It Matters**: Prevents students or mobile security officers from altering their device system clocks to falsely authorize expired or future gate passes.

### 2.10 Immutable Audit Logging
- **Table**: `audit_logs`.
- **Coverage**: Records every security check, pass creation, HOD approval, violation filing, resolution decision, and emergency incident update.
- **Why It Matters**: Provides absolute operational transparency for institutional compliance and forensic investigation.

### 2.11 Sensitive Data Sanitization
- **Sanitization**: Password hashes, session secrets, and internal database keys are stripped from user objects prior to returning API responses.
- **Why It Matters**: Prevents accidental exposure of security credentials in client-side console logs or Network inspection tools.

### 2.12 PWA API Caching Restrictions
- **Service Worker Rule** (`public/sw.js`): Explicitly bypasses all `/api` endpoints and non-GET HTTP requests.
- **Why It Matters**: Prevents the browser Service Worker from caching gate verification responses, guaranteeing that security officers always execute real-time server validations.
