# CMADMS / CampusGuard Pro — Feature Baseline vs. Future Scope Roadmap

---

## 1. IMPLEMENTED & VERIFIED FEATURE BASELINE

The following capabilities represent the **currently implemented, tested, and production-ready** feature set of CMADMS v1.0. Every item listed below has been verified against live PostgreSQL databases and automated test suites:

| Subsystem | Implemented & Verified Capabilities | Status |
| :--- | :--- | :---: |
| **Authentication** | `scrypt` password hashing, 16-byte random salts, legacy hash migration, rate limiting, timing-safe checks. | **VERIFIED** |
| **RBAC Controls** | Server-side role protection across Student, Faculty, HOD, Security, and Admin roles. | **VERIFIED** |
| **Department Isolation** | PostgreSQL query-level department isolation (`WHERE UPPER(department) = UPPER($dept)`). | **VERIFIED** |
| **Pass Management** | Digital QR movement pass generation, HOD approval queue, valid time window enforcement. | **VERIFIED** |
| **Timetable Resolution** | 642 verified timetable slots across 25 faculty members and 7 departments with 0 collisions. | **VERIFIED** |
| **Security Gate PWA** | Mobile PWA, camera QR scanner, Early Exit override, offline connection banner, API cache isolation. | **VERIFIED** |
| **Case Disciplinary** | Faculty violation reporting, 15-min duplicate throttling, 24h student explanation, HOD resolution. | **VERIFIED** |
| **Emergency System** | 6-stage Emergency Command System (`reported` $\rightarrow$ `acknowledged` $\rightarrow$ `assigned` $\rightarrow$ `responding` $\rightarrow$ `controlled` $\rightarrow$ `resolved`). | **VERIFIED** |
| **Notifications** | PostgreSQL persistence, server-side event bus, 15s fallback polling, unread synchronization. | **VERIFIED** |
| **Audit Logging** | Immutable audit logs for all security actions backed by PostgreSQL. | **VERIFIED** |

---

## 2. FUTURE SCOPE & POTENTIAL ENHANCEMENTS

The following features represent **FUTURE SCOPE ARCHITECTURE** designed for future expansion beyond v1.0. These items are *not* required for current deployment and are clearly demarcated from implemented features:

### 2.1 Hardware Turnstile & Biometric RFID Integration
- **Concept**: Integrate physical gate turnstiles equipped with optical QR readers, RFID card scanners, and facial recognition terminals.
- **Workflow**: Upon scanning a digital QR pass at a physical turnstile, an embedded IoT gateway will query the CMADMS Security API and trigger a relay output to open the gate barrier automatically.

### 2.2 Distributed Redis Rate Limiting & Caching
- **Concept**: Transition in-memory login rate limiting and real-time notification subscriptions to a distributed Redis cluster.
- **Benefit**: Enables multi-node load balancing across horizontal server instances for large-scale multi-campus deployments (50,000+ active students).

### 2.3 AI-Driven Anomaly & Pattern Detection
- **Concept**: Incorporate Machine Learning models to analyze historical movement pass requests and violation logs.
- **Functionality**: Automatically flag unusual movement patterns (e.g., student requesting movement passes during identical lecture blocks every week) for proactive HOD review.

### 2.4 SMS & Cellular Emergency Dispatch Gateway
- **Concept**: Integrate Twilio or Karix cellular SMS gateways.
- **Functionality**: Dispatch instant SMS text alerts and automated phone calls to security officers and campus medical teams during Critical emergency incidents, guaranteeing delivery even if mobile internet connectivity drops.

### 2.5 Multi-Campus Federated Node Architecture
- **Concept**: Support multi-campus university systems where a student enrolled at Campus A can visit Campus B using unified federated cross-campus movement permissions.
