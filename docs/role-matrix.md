# CMADMS — Role Responsibility Matrix

This matrix documents the exact permissions and capabilities enforced across the 5 institutional user roles in CMADMS, based on server-side RBAC validation.

---

| Operational Feature | Student (`student`) | Faculty (`faculty`) | Security (`security`) | HOD (`hod`) | Admin (`admin`) |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Portal Sign-in & Authentication** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Request Movement Permission Pass** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **View Personal Digital QR Pass** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Submit 24h Violation Explanation** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Student Timetable Lookup (`/check`)** | ❌ | ✅ | ❌ | ❌ | ✅ |
| **Verify Outside-Class Status** | ❌ | ✅ | ❌ | ❌ | ✅ |
| **Create Explicit Violation Report** | ❌ | ✅ | ❌ | ❌ | ✅ |
| **Gate QR Code Scanning & Check** | ❌ | ❌ | ✅ | ❌ | ✅ |
| **Authorize Early Exit Override** | ❌ | ❌ | ✅ | ❌ | ✅ |
| **Record Gate Exit & Entry Timestamps** | ❌ | ❌ | ✅ | ❌ | ✅ |
| **Approve / Reject Movement Passes** | ❌ | ❌ | ❌ | ✅ (Dept Only) | ✅ |
| **HOD Violation Investigation Queue** | ❌ | ❌ | ❌ | ✅ (Dept Only) | ✅ |
| **Resolve or Dismiss Violation Cases** | ❌ | ❌ | ❌ | ✅ (Dept Only) | ✅ |
| **Trigger & Control Emergency Incidents**| ❌ | ❌ | ❌ | ❌ | ✅ |
| **Institutional User & Role Management** | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Timetable System Configuration** | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Department, Course & Room Management**| ❌ | ❌ | ❌ | ❌ | ✅ |
| **View Full Immutable Audit Logs** | ❌ | ❌ | ❌ | ❌ | ✅ |

---

## Key Security Notes
1. **Student Isolation**: Students can only view their own movement passes, notifications, and timetable.
2. **HOD Departmental Isolation**: HOD permissions are locked to their assigned department (e.g. CSE HOD cannot approve ECE passes or resolve ECE violations).
3. **Faculty Non-Automatic Reporting**: Faculty members use `/check` to verify student presence; reporting a violation requires an explicit manual decision by the faculty member.
4. **Security Gate Enforcement**: Gate security guards verify digital QR pass signatures and record real-time gate entry/exit timestamps.
