# CMADMS — Role Responsibility Matrix

This matrix documents the exact permissions and capabilities enforced across the 5 institutional user roles in CMADMS, based on server-side RBAC validation.

---

| Operational Feature | Student (`student`) | Faculty (`faculty`) | Security (`security`) | HOD (`hod`) | Admin (`admin`) |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Portal Sign-in & Authentication** | Yes | Yes | Yes | Yes | Yes |
| **Request Movement Permission Pass** | Yes | No | No | No | No |
| **View Personal Digital QR Pass** | Yes | No | No | No | No |
| **Submit 24h Violation Explanation** | Yes | No | No | No | No |
| **Student Timetable Lookup (`/check`)** | No | Yes | No | No | Yes |
| **Verify Outside-Class Status** | No | Yes | No | No | Yes |
| **Create Explicit Violation Report** | No | Yes | No | No | Yes |
| **Gate QR Code Scanning & Check** | No | No | Yes | No | Yes |
| **Authorize Early Exit Override** | No | No | Yes | No | Yes |
| **Record Gate Exit & Entry Timestamps** | No | No | Yes | No | Yes |
| **Approve / Reject Movement Passes** | No | No | No | Yes (Dept Only) | Yes |
| **HOD Violation Investigation Queue** | No | No | No | Yes (Dept Only) | Yes |
| **Resolve or Dismiss Violation Cases** | No | No | No | Yes (Dept Only) | Yes |
| **Trigger & Control Emergency Incidents**| No | No | No | No | Yes |
| **Institutional User & Role Management** | No | No | No | No | Yes |
| **Timetable System Configuration** | No | No | No | No | Yes |
| **Department, Course & Room Management**| No | No | No | No | Yes |
| **View Full Immutable Audit Logs** | No | No | No | No | Yes |

---

## Key Security Notes
1. **Student Isolation**: Students can only view their own movement passes, notifications, and timetable.
2. **HOD Departmental Isolation**: HOD permissions are locked to their assigned department (e.g. CSE HOD cannot approve ECE passes or resolve ECE violations).
3. **Faculty Non-Automatic Reporting**: Faculty members use `/check` to verify student presence; reporting a violation requires an explicit manual decision by the faculty member.
4. **Security Gate Enforcement**: Gate security guards verify digital QR pass signatures and record real-time gate entry/exit timestamps.
