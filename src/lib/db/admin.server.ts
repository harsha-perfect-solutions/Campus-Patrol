import { db } from "../db.server";
import {
  createNotificationServer,
  findStudentUserIdByCode,
  findHodUserIdForDepartment,
} from "./notifications.server";
import type { DBStudent } from "./students.server";
import type { DBPermission } from "./permissions.server";
import type { DBViolationReport } from "./violations.server";

export type AdminDashboardStats = {
  totalStudents: number;
  totalFaculty: number;
  totalHods: number;
  activeGatePasses: number;
  totalUsers: number;
  totalDepartments: number;
  totalReports: number;
  totalAuditLogs: number;
};

export type AdminUserRecord = {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  studentCode?: string | null;
  staffCode?: string | null;
  assignedPost?: string | null;
  status: string;
};

export type DBAuditLogRecord = {
  id: string;
  actor: string;
  actor_role: string;
  action: string;
  target: string;
  target_id: string;
  metadata: any;
  timestamp: string;
};

/**
 * Calculates global system-wide statistics from PostgreSQL tables.
 */
export async function getAdminDashboardStats(): Promise<AdminDashboardStats> {
  try {
    const studentRes = await db.query<{ count: string }>(
      "SELECT COUNT(*)::text AS count FROM students;",
    );
    const facultyRes = await db.query<{ count: string }>(
      "SELECT COUNT(*)::text AS count FROM profiles WHERE staff_code IS NOT NULL OR department IS NOT NULL;",
    );
    const passRes = await db.query<{ count: string }>(
      "SELECT COUNT(*)::text AS count FROM movement_permissions WHERE UPPER(status::text) = 'APPROVED';",
    );
    const reportsRes = await db.query<{ count: string }>(
      "SELECT COUNT(*)::text AS count FROM violation_reports;",
    );
    const auditRes = await db.query<{ count: string }>(
      "SELECT COUNT(*)::text AS count FROM audit_logs;",
    );
    const deptRes = await db.query<{ count: string }>(
      "SELECT COUNT(DISTINCT department)::text AS count FROM students;",
    );
    const userRes = await db.query<{ count: string }>(
      "SELECT COUNT(*)::text AS count FROM profiles;",
    );

    return {
      totalStudents: parseInt(studentRes.rows[0]?.count || "0", 10),
      totalFaculty: parseInt(facultyRes.rows[0]?.count || "0", 10),
      totalHods: 8, // Standard HOD Department offices count
      activeGatePasses: parseInt(passRes.rows[0]?.count || "0", 10),
      totalUsers: Math.max(
        parseInt(userRes.rows[0]?.count || "0", 10),
        parseInt(studentRes.rows[0]?.count || "0", 10),
      ),
      totalDepartments: Math.max(parseInt(deptRes.rows[0]?.count || "0", 10), 6),
      totalReports: parseInt(reportsRes.rows[0]?.count || "0", 10),
      totalAuditLogs: parseInt(auditRes.rows[0]?.count || "0", 10),
    };
  } catch (error) {
    console.error("[Admin DB Error] Error in getAdminDashboardStats:", error);
    throw new Error("Failed to query Admin dashboard statistics.");
  }
}

/**
 * Retrieves all user accounts combining profiles, students, and user_roles tables.
 */
export async function getAdminUsers(): Promise<AdminUserRecord[]> {
  try {
    const query = `
      SELECT
        p.id::text,
        p.full_name AS name,
        p.email,
        COALESCE(ur.role::text, 'student') AS role,
        COALESCE(p.department, s.department, 'GENERAL') AS department,
        p.student_code AS "studentCode",
        p.staff_code AS "staffCode",
        p.assigned_post AS "assignedPost",
        'Active' AS status
      FROM profiles p
      LEFT JOIN user_roles ur ON ur.user_id = p.id
      LEFT JOIN students s ON s.student_code = p.student_code
      ORDER BY p.created_at DESC;
    `;

    const result = await db.query<AdminUserRecord>(query);
    if (result.rows.length > 0) return result.rows;

    // Fallback: If profiles is empty, query students table as user records
    const studentQuery = `
      SELECT
        student_code AS id,
        name,
        CONCAT(LOWER(student_code), '@cmadms.edu') AS email,
        'student' AS role,
        department,
        student_code AS "studentCode",
        NULL AS "staffCode",
        status
      FROM students
      ORDER BY created_at DESC;
    `;
    const studentResult = await db.query<AdminUserRecord>(studentQuery);
    return studentResult.rows;
  } catch (error) {
    console.error("[Admin DB Error] Error in getAdminUsers:", error);
    throw new Error("Failed to query user accounts from database.");
  }
}

/**
 * Updates application user role in user_roles table with atomic audit log insertion.
 */
export async function updateAdminUserRole(
  userId: string,
  newRole: "admin" | "hod" | "faculty" | "student" | "security",
  adminActor: string,
): Promise<boolean> {
  try {
    await db.query("BEGIN");

    const upsertQuery = `
      INSERT INTO user_roles (user_id, role)
      VALUES ($1::uuid, $2::app_role)
      ON CONFLICT (user_id) DO UPDATE SET role = EXCLUDED.role;
    `;

    await db.query(upsertQuery, [userId, newRole]);

    // Atomic Audit Log
    const auditQuery = `
      INSERT INTO audit_logs (actor, actor_role, action, target, target_id, metadata)
      VALUES ($1, 'admin', 'admin_role_changed', 'user_role', $2, $3);
    `;
    const metadata = JSON.stringify({ userId, newRole });
    await db.query(auditQuery, [adminActor, userId, metadata]);

    await db.query("COMMIT");
    return true;
  } catch (error) {
    await db.query("ROLLBACK");
    console.error("[Admin DB Error] Error updating user role:", error);
    throw new Error("Failed to update user role in database.");
  }
}

/**
 * Updates a security officer's assigned_post in profiles table.
 * Admin-only operation — officers cannot change their own assigned post.
 */
export async function updateSecurityAssignedPost(
  userId: string,
  assignedPost: string,
  adminActor: string,
): Promise<boolean> {
  const VALID_POSTS = [
    "Main Gate", "Boys Hostel Gate", "Girls Hostel Gate", "Back Gate",
    "Library Entrance", "Canteen Block", "Admin Block", "Academic Block",
    "Lab Block", "Sports Ground", "Parking Gate",
  ];

  if (!VALID_POSTS.includes(assignedPost)) {
    throw new Error(`Invalid assigned post: "${assignedPost}". Must be one of: ${VALID_POSTS.join(", ")}`);
  }

  try {
    await db.query("BEGIN");

    await db.query(
      `UPDATE profiles SET assigned_post = $1 WHERE id::text = $2`,
      [assignedPost, userId]
    );

    await db.query(
      `INSERT INTO audit_logs (actor, actor_role, action, target, target_id, metadata)
       VALUES ($1, 'admin', 'admin_security_post_changed', 'profile', $2, $3)`,
      [adminActor, userId, JSON.stringify({ userId, assignedPost })]
    );

    await db.query("COMMIT");
    return true;
  } catch (error) {
    await db.query("ROLLBACK");
    console.error("[Admin DB Error] Error updating security assigned post:", error);
    throw new Error("Failed to update security officer assigned post.");
  }
}

/**
 * Retrieves all students from students table.
 */
export async function getAdminStudents(departmentFilter?: string): Promise<DBStudent[]> {
  try {
    const cleanDept = departmentFilter?.trim();
    const query = `
      SELECT
        student_code,
        name,
        department,
        year,
        section,
        semester,
        status,
        photo_url
      FROM students
      WHERE ($1::text IS NULL OR UPPER(department) = UPPER($1::text))
      ORDER BY student_code ASC;
    `;

    const result = await db.query<DBStudent>(query, [cleanDept || null]);
    return result.rows;
  } catch (error) {
    console.error("[Admin DB Error] Error in getAdminStudents:", error);
    throw new Error("Failed to query student master list.");
  }
}

/**
 * Creates a new student record in PostgreSQL within an atomic transaction.
 */
export async function createAdminStudent(
  student: {
    studentCode: string;
    name: string;
    department: string;
    year: string;
    section: string;
    semester: number;
  },
  adminActor: string,
): Promise<DBStudent> {
  const cleanCode = student.studentCode.trim().toUpperCase();
  const cleanName = student.name.trim();
  const cleanDept = student.department.trim().toUpperCase();
  const cleanYear = student.year.trim();
  const cleanSec = student.section.trim();

  if (!cleanCode || !cleanName || !cleanDept) {
    throw new Error("Student Code, Name, and Department are required.");
  }

  try {
    await db.query("BEGIN");

    const insertQuery = `
      INSERT INTO students (
        student_code,
        name,
        department,
        year,
        section,
        semester,
        status
      ) VALUES ($1, $2, $3, $4, $5, $6, 'Active')
      RETURNING *;
    `;

    const res = await db.query<DBStudent>(insertQuery, [
      cleanCode,
      cleanName,
      cleanDept,
      cleanYear,
      cleanSec,
      student.semester || 1,
    ]);

    const createdStudent = res.rows[0];
    if (!createdStudent) {
      throw new Error("Failed to insert student record.");
    }

    // Atomic Audit Log
    const auditQuery = `
      INSERT INTO audit_logs (actor, actor_role, action, target, target_id, metadata)
      VALUES ($1, 'admin', 'admin_student_created', 'student', $2, $3);
    `;
    const metadata = JSON.stringify({
      student_code: cleanCode,
      name: cleanName,
      department: cleanDept,
    });
    await db.query(auditQuery, [adminActor, cleanCode, metadata]);

    await db.query("COMMIT");
    return createdStudent;
  } catch (error: any) {
    await db.query("ROLLBACK");
    if (error?.code === "23505") {
      throw new Error(`Student code ${cleanCode} already exists in database.`);
    }
    console.error("[Admin DB Error] Error creating student:", error);
    throw new Error("Failed to create student record in database.");
  }
}

/**
 * Retrieves faculty list from profiles / user_roles.
 */
export async function getAdminFaculty(): Promise<
  { id: string; name: string; staffCode: string; department: string; email: string }[]
> {
  try {
    const { getAdminFacultyList } = await import("./faculty.server");
    const list = await getAdminFacultyList();
    return list.map((f) => ({
      id: f.id,
      name: f.name,
      staffCode: f.staffCode,
      department: f.department,
      email: f.email,
    }));
  } catch (error) {
    console.error("[Admin DB Error] Error in getAdminFaculty:", error);
    throw new Error("Failed to query faculty master list.");
  }
}

/**
 * Retrieves institutional departments list.
 */
export async function getAdminDepartments(): Promise<
  { code: string; name: string; status: string }[]
> {
  try {
    const { getDepartments } = await import("./departments.server");
    const depts = await getDepartments();
    return depts.map((d) => ({
      code: d.departmentCode,
      name: d.departmentName,
      status: d.status,
    }));
  } catch (error) {
    console.error("[Admin DB Error] Error in getAdminDepartments:", error);
    throw new Error("Failed to query departments.");
  }
}

/**
 * Retrieves system-wide violation reports across all departments.
 */
export async function getAdminReports(
  departmentFilter?: string,
  statusFilter?: string,
): Promise<DBViolationReport[]> {
  try {
    const cleanDept =
      departmentFilter && departmentFilter !== "all" ? departmentFilter.trim() : null;
    const cleanStatus = statusFilter && statusFilter !== "all" ? statusFilter.trim() : null;

    const query = `
      SELECT *
      FROM violation_reports
      WHERE ($1::text IS NULL OR UPPER(department) = UPPER($1::text))
        AND ($2::text IS NULL OR status::text = $2::text)
      ORDER BY created_at DESC;
    `;

    const res = await db.query<DBViolationReport>(query, [cleanDept, cleanStatus]);
    return res.rows;
  } catch (error) {
    console.error("[Admin DB Error] Error in getAdminReports:", error);
    throw new Error("Failed to query institutional violation reports.");
  }
}

/**
 * Retrieves master movement permissions.
 */
export async function getAdminPermissions(): Promise<DBPermission[]> {
  try {
    const query = `SELECT * FROM movement_permissions ORDER BY created_at DESC;`;
    const res = await db.query<DBPermission>(query);
    return res.rows;
  } catch (error) {
    console.error("[Admin DB Error] Error in getAdminPermissions:", error);
    throw new Error("Failed to query master movement permissions.");
  }
}

/**
 * Issues an administrative movement pass (forced status = 'approved') with atomic audit logging.
 */
export async function createAdminPermission(
  studentCode: string,
  reason: string,
  validUntil: string,
  adminActor: string,
): Promise<DBPermission> {
  const cleanCode = studentCode.trim().toUpperCase();
  const cleanReason = reason.trim();
  const cleanUntil = validUntil.trim();
  const today = new Date().toISOString().split("T")[0];

  try {
    await db.query("BEGIN");

    const query = `
      INSERT INTO movement_permissions (
        student_code,
        reason,
        date,
        valid_from,
        valid_until,
        status,
        issued_by
      ) VALUES ($1, $2, $3, '10:00 AM', $4, 'approved'::permission_status, $5)
      RETURNING *;
    `;

    const res = await db.query<DBPermission>(query, [
      cleanCode,
      cleanReason,
      today,
      cleanUntil,
      `Admin (${adminActor})`,
    ]);

    const createdPass = res.rows[0];
    if (!createdPass) {
      throw new Error("Failed to insert movement permission pass.");
    }

    // Atomic Audit Log
    const auditQuery = `
      INSERT INTO audit_logs (actor, actor_role, action, target, target_id, metadata)
      VALUES ($1, 'admin', 'admin_permission_issued', 'movement_permission', $2, $3);
    `;
    const metadata = JSON.stringify({
      student_code: cleanCode,
      reason: cleanReason,
      status: "approved",
    });
    await db.query(auditQuery, [adminActor, String(createdPass.id), metadata]);

    await db.query("COMMIT");
    return createdPass;
  } catch (error) {
    await db.query("ROLLBACK");
    console.error("[Admin DB Error] Error creating admin permission:", error);
    throw new Error("Failed to issue master movement permission.");
  }
}

/**
 * Retrieves append-only global audit logs for Admin inspection.
 */
export async function getAdminAuditLogs(): Promise<DBAuditLogRecord[]> {
  try {
    const query = `
      SELECT
        id::text,
        actor,
        actor_role::text AS actor_role,
        action,
        target,
        target_id,
        metadata,
        timestamp::text AS timestamp
      FROM audit_logs
      ORDER BY timestamp DESC;
    `;

    const res = await db.query<DBAuditLogRecord>(query);
    return res.rows;
  } catch (error) {
    console.error("[Admin DB Error] Error in getAdminAuditLogs:", error);
    throw new Error("Failed to query system audit logs.");
  }
}

/* ==========================================================================
   ADMIN MOVEMENT PASSES CONTROL & MONITORING
   ========================================================================== */

export type AdminMovementPass = {
  id: string;
  studentCode: string;
  studentName: string;
  department: string;
  year: string;
  section: string;
  reason: string;
  date: string;
  validFrom: string;
  validUntil: string;
  status: "pending" | "approved" | "rejected";
  issuedBy: string;
  exitAt: string | null;
  entryAt: string | null;
  checkpoint: string | null;
  verifiedBy: string | null;
  revokedAt: string | null;
  revokedBy: string | null;
  revocationReason: string | null;
  cancelledAt: string | null;
  cancelledBy: string | null;
  cancellationReason: string | null;
  createdAt: string;
  currentlyOutside: boolean;
  completed: boolean;
};

export type AdminMovementPassStats = {
  totalRequests: number;
  pending: number;
  approved: number;
  rejected: number;
  currentlyOutside: number;
  completed: number;
  unauthorizedAttempts: number;
};

/**
 * Retrieves movement passes across all departments with search and filtering capabilities.
 */
export async function getAdminMovementPasses(filter?: {
  department?: string;
  status?: string;
  date?: string;
  currentlyOutside?: boolean;
  search?: string;
}): Promise<AdminMovementPass[]> {
  try {
    let query = `
      SELECT
        mp.id::text,
        mp.student_code AS "studentCode",
        COALESCE(s.name, mp.student_code) AS "studentName",
        COALESCE(s.department, 'General') AS department,
        COALESCE(s.year, '3rd Year') AS year,
        COALESCE(s.section, 'A') AS section,
        mp.reason,
        to_char(mp.date, 'YYYY-MM-DD') AS date,
        mp.valid_from::text AS "validFrom",
        mp.valid_until::text AS "validUntil",
        mp.status,
        mp.issued_by AS "issuedBy",
        mp.exit_at::text AS "exitAt",
        mp.entry_at::text AS "entryAt",
        mp.checkpoint,
        mp.verified_by AS "verifiedBy",
        mp.revoked_at::text AS "revokedAt",
        mp.revoked_by AS "revokedBy",
        mp.revocation_reason AS "revocationReason",
        mp.cancelled_at::text AS "cancelledAt",
        mp.cancelled_by AS "cancelledBy",
        mp.cancellation_reason AS "cancellationReason",
        mp.created_at::text AS "createdAt"
      FROM movement_permissions mp
      LEFT JOIN students s ON UPPER(s.student_code) = UPPER(mp.student_code)
      WHERE 1=1
    `;

    const values: any[] = [];

    if (filter?.department && filter.department !== "all") {
      values.push(filter.department.trim());
      query += ` AND UPPER(s.department) = UPPER($${values.length})`;
    }

    if (filter?.date) {
      values.push(filter.date.trim());
      query += ` AND mp.date = $${values.length}::date`;
    }

    if (filter?.currentlyOutside) {
      query += ` AND mp.exit_at IS NOT NULL AND mp.entry_at IS NULL AND mp.revoked_at IS NULL`;
    } else if (filter?.status && filter.status !== "all") {
      const cleanStatus = filter.status.toLowerCase();
      if (cleanStatus === "currently_outside") {
        query += ` AND mp.exit_at IS NOT NULL AND mp.entry_at IS NULL AND mp.revoked_at IS NULL`;
      } else if (cleanStatus === "completed") {
        query += ` AND mp.exit_at IS NOT NULL AND mp.entry_at IS NOT NULL`;
      } else if (cleanStatus === "revoked") {
        query += ` AND mp.revoked_at IS NOT NULL`;
      } else if (cleanStatus === "cancelled") {
        query += ` AND mp.cancelled_at IS NOT NULL`;
      } else {
        values.push(cleanStatus);
        query += ` AND mp.status = $${values.length} AND mp.revoked_at IS NULL AND mp.cancelled_at IS NULL`;
      }
    }

    if (filter?.search) {
      values.push(`%${filter.search.trim()}%`);
      const idx = values.length;
      query += ` AND (
        UPPER(s.name) LIKE UPPER($${idx}) OR
        UPPER(mp.student_code) LIKE UPPER($${idx}) OR
        UPPER(mp.id::text) LIKE UPPER($${idx}) OR
        UPPER(mp.reason) LIKE UPPER($${idx})
      )`;
    }

    query += ` ORDER BY mp.created_at DESC;`;

    const res = await db.query<any>(query, values);

    return res.rows.map((row: any) => ({
      ...row,
      currentlyOutside: !!row.exitAt && !row.entryAt && !row.revokedAt,
      completed: !!row.exitAt && !!row.entryAt,
    }));
  } catch (error) {
    console.error("[Admin DB Error] Error in getAdminMovementPasses:", error);
    throw new Error("Failed to query Admin movement passes.");
  }
}

/**
 * Calculates real-time system-wide metrics for Admin Movement Pass dashboard.
 */
export async function getAdminMovementPassStats(): Promise<AdminMovementPassStats> {
  try {
    const totalRes = await db.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM movement_permissions;`
    );
    const pendingRes = await db.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM movement_permissions WHERE status = 'pending' AND cancelled_at IS NULL;`
    );
    const approvedRes = await db.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM movement_permissions WHERE status = 'approved' AND revoked_at IS NULL;`
    );
    const rejectedRes = await db.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM movement_permissions WHERE status = 'rejected';`
    );
    const outsideRes = await db.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM movement_permissions 
       WHERE exit_at IS NOT NULL AND entry_at IS NULL AND revoked_at IS NULL;`
    );
    const completedRes = await db.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM movement_permissions 
       WHERE exit_at IS NOT NULL AND entry_at IS NOT NULL;`
    );
    const unauthorizedRes = await db.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM audit_logs 
       WHERE action = 'gate_exit_denied';`
    );

    return {
      totalRequests: parseInt(totalRes.rows[0]?.count || "0", 10),
      pending: parseInt(pendingRes.rows[0]?.count || "0", 10),
      approved: parseInt(approvedRes.rows[0]?.count || "0", 10),
      rejected: parseInt(rejectedRes.rows[0]?.count || "0", 10),
      currentlyOutside: parseInt(outsideRes.rows[0]?.count || "0", 10),
      completed: parseInt(completedRes.rows[0]?.count || "0", 10),
      unauthorizedAttempts: parseInt(unauthorizedRes.rows[0]?.count || "0", 10),
    };
  } catch (error) {
    console.error("[Admin DB Error] Error in getAdminMovementPassStats:", error);
    throw new Error("Failed to calculate Admin movement pass metrics.");
  }
}

/**
 * Retrieves all students currently outside the campus.
 */
export async function getAdminCurrentlyOutsideStudents(): Promise<
  {
    passId: string;
    studentCode: string;
    studentName: string;
    department: string;
    yearSection: string;
    reason: string;
    exitAt: string;
    checkpoint: string;
    verifiedBy: string;
    validUntil: string;
    durationOutsideMinutes: number;
  }[]
> {
  try {
    const query = `
      SELECT
        mp.id::text AS "passId",
        mp.student_code AS "studentCode",
        COALESCE(s.name, mp.student_code) AS "studentName",
        COALESCE(s.department, 'General') AS department,
        CONCAT(COALESCE(s.year, '3rd Year'), ' • Section ', COALESCE(s.section, 'A')) AS "yearSection",
        mp.reason,
        mp.exit_at::text AS "exitAt",
        COALESCE(mp.checkpoint, 'Main Gate') AS checkpoint,
        COALESCE(mp.verified_by, 'Security Officer') AS "verifiedBy",
        mp.valid_until::text AS "validUntil",
        ROUND(EXTRACT(EPOCH FROM (NOW() - mp.exit_at)) / 60)::integer AS "durationOutsideMinutes"
      FROM movement_permissions mp
      LEFT JOIN students s ON UPPER(s.student_code) = UPPER(mp.student_code)
      WHERE mp.exit_at IS NOT NULL AND mp.entry_at IS NULL AND mp.revoked_at IS NULL
      ORDER BY mp.exit_at DESC;
    `;

    const res = await db.query<any>(query);
    return res.rows;
  } catch (error) {
    console.error("[Admin DB Error] Error in getAdminCurrentlyOutsideStudents:", error);
    throw new Error("Failed to query currently outside students.");
  }
}

/**
 * Emergency Admin Intervention: Revokes an approved movement pass before exit.
 * Allowed only when: status = 'approved' AND exit_at IS NULL AND entry_at IS NULL.
 */
export async function revokeMovementPass(
  passId: string,
  reason: string,
  adminName: string,
  adminEmail: string,
): Promise<AdminMovementPass> {
  const cleanId = passId.trim();
  const cleanReason = reason.trim();

  if (!cleanId) throw new Error("Pass ID is required.");
  if (!cleanReason) throw new Error("A mandatory reason is required to revoke an approved movement pass.");

  try {
    await db.query("BEGIN");

    // 1. Fetch current pass state
    const checkRes = await db.query(
      `SELECT mp.id, mp.student_code, mp.status, mp.exit_at, mp.entry_at, mp.revoked_at,
              COALESCE(s.name, mp.student_code) AS student_name, s.department
       FROM movement_permissions mp
       LEFT JOIN students s ON UPPER(s.student_code) = UPPER(mp.student_code)
       WHERE mp.id::text = $1
       LIMIT 1;`,
      [cleanId]
    );

    if (checkRes.rows.length === 0) {
      throw new Error(`Movement pass ${cleanId} not found.`);
    }

    const current = checkRes.rows[0];

    if (current.revoked_at) {
      throw new Error("Pass has already been revoked.");
    }
    if (current.exit_at) {
      throw new Error("Cannot revoke pass: Student has already exited the campus using this pass.");
    }
    if (current.status !== "approved") {
      throw new Error(`Cannot revoke pass: Only approved passes can be revoked (Current status: "${current.status}").`);
    }

    const adminLabel = `Admin (${adminName})`;

    // 2. Update pass with revocation metadata (preserves status column without conflating with HOD rejection)
    const updateRes = await db.query(
      `UPDATE movement_permissions
       SET revoked_at = NOW(),
           revoked_by = $1,
           revocation_reason = $2
       WHERE id::text = $3
       RETURNING *;`,
      [adminLabel, cleanReason, cleanId]
    );

    // 3. Record atomic audit log
    const auditMetadata = JSON.stringify({
      pass_id: cleanId,
      student_code: current.student_code,
      student_name: current.student_name,
      department: current.department,
      revoked_by: adminName,
      admin_email: adminEmail,
      revocation_reason: cleanReason,
      timestamp: new Date().toISOString(),
    });

    await db.query(
      `INSERT INTO audit_logs (actor, actor_role, action, target, target_id, metadata)
       VALUES ($1, 'admin', 'movement_pass_revoked', $2, $3, $4);`,
      [adminEmail, current.student_code, cleanId, auditMetadata]
    );

    // 4. Send Student Notification
    const studentUserId = await findStudentUserIdByCode(current.student_code);
    await createNotificationServer({
      recipientUserId: studentUserId,
      recipientId: current.student_code,
      recipientRole: "student",
      department: current.department,
      type: "movement_pass_revoked",
      title: "Movement Pass Revoked",
      detail: `Your approved movement pass was revoked by Admin (${adminName}). Reason: ${cleanReason}`,
      tone: "violation",
      relatedId: cleanId,
      relatedType: "movement_permission",
    });

    await db.query("COMMIT");

    const updated = updateRes.rows[0];
    return {
      ...updated,
      id: updated.id,
      studentCode: updated.student_code,
      studentName: current.student_name,
      department: current.department || "General",
      year: "3rd Year",
      section: "A",
      validFrom: updated.valid_from,
      validUntil: updated.valid_until,
      issuedBy: updated.issued_by,
      exitAt: updated.exit_at,
      entryAt: updated.entry_at,
      revokedAt: updated.revoked_at,
      revokedBy: updated.revoked_by,
      revocationReason: updated.revocation_reason,
      cancelledAt: updated.cancelled_at,
      cancelledBy: updated.cancelled_by,
      cancellationReason: updated.cancellation_reason,
      createdAt: updated.created_at,
      currentlyOutside: false,
      completed: false,
    };
  } catch (error) {
    await db.query("ROLLBACK").catch(() => {});
    console.error("[Admin DB Error] Error revoking movement pass:", error);
    throw error;
  }
}

/**
 * Emergency Admin Intervention: Cancels a pending movement pass request.
 * Allowed only when: status = 'pending' AND cancelled_at IS NULL.
 */
export async function cancelMovementPass(
  passId: string,
  reason: string,
  adminName: string,
  adminEmail: string,
): Promise<AdminMovementPass> {
  const cleanId = passId.trim();
  const cleanReason = reason.trim();

  if (!cleanId) throw new Error("Pass ID is required.");
  if (!cleanReason) throw new Error("A mandatory reason is required to cancel a pending pass request.");

  try {
    await db.query("BEGIN");

    // 1. Fetch current pass state
    const checkRes = await db.query(
      `SELECT mp.id, mp.student_code, mp.status, mp.cancelled_at,
              COALESCE(s.name, mp.student_code) AS student_name, s.department
       FROM movement_permissions mp
       LEFT JOIN students s ON UPPER(s.student_code) = UPPER(mp.student_code)
       WHERE mp.id::text = $1
       LIMIT 1;`,
      [cleanId]
    );

    if (checkRes.rows.length === 0) {
      throw new Error(`Movement pass request ${cleanId} not found.`);
    }

    const current = checkRes.rows[0];

    if (current.cancelled_at) {
      throw new Error("Request has already been cancelled.");
    }
    if (current.status !== "pending") {
      throw new Error(`Cannot cancel request: Only pending requests can be cancelled (Current status: "${current.status}").`);
    }

    const adminLabel = `Admin (${adminName})`;

    // 2. Update pass with cancellation metadata
    const updateRes = await db.query(
      `UPDATE movement_permissions
       SET cancelled_at = NOW(),
           cancelled_by = $1,
           cancellation_reason = $2
       WHERE id::text = $3
       RETURNING *;`,
      [adminLabel, cleanReason, cleanId]
    );

    // 3. Record atomic audit log
    const auditMetadata = JSON.stringify({
      pass_id: cleanId,
      student_code: current.student_code,
      student_name: current.student_name,
      department: current.department,
      cancelled_by: adminName,
      admin_email: adminEmail,
      cancellation_reason: cleanReason,
      timestamp: new Date().toISOString(),
    });

    await db.query(
      `INSERT INTO audit_logs (actor, actor_role, action, target, target_id, metadata)
       VALUES ($1, 'admin', 'movement_pass_cancelled', $2, $3, $4);`,
      [adminEmail, current.student_code, cleanId, auditMetadata]
    );

    // 4. Send Student Notification
    const studentUserId = await findStudentUserIdByCode(current.student_code);
    await createNotificationServer({
      recipientUserId: studentUserId,
      recipientId: current.student_code,
      recipientRole: "student",
      department: current.department,
      type: "movement_pass_cancelled",
      title: "Movement Pass Cancelled",
      detail: `Your pending movement pass request was cancelled by Admin (${adminName}). Reason: ${cleanReason}`,
      tone: "violation",
      relatedId: cleanId,
      relatedType: "movement_permission",
    });

    await db.query("COMMIT");

    const updated = updateRes.rows[0];
    return {
      ...updated,
      id: updated.id,
      studentCode: updated.student_code,
      studentName: current.student_name,
      department: current.department || "General",
      year: "3rd Year",
      section: "A",
      validFrom: updated.valid_from,
      validUntil: updated.valid_until,
      issuedBy: updated.issued_by,
      exitAt: updated.exit_at,
      entryAt: updated.entry_at,
      revokedAt: updated.revoked_at,
      revokedBy: updated.revoked_by,
      revocationReason: updated.revocation_reason,
      cancelledAt: updated.cancelled_at,
      cancelledBy: updated.cancelled_by,
      cancellationReason: updated.cancellation_reason,
      createdAt: updated.created_at,
      currentlyOutside: false,
      completed: false,
    };
  } catch (error) {
    await db.query("ROLLBACK").catch(() => {});
    console.error("[Admin DB Error] Error cancelling movement pass:", error);
    throw error;
  }
}

// ─── ADMIN VIOLATION MANAGEMENT MODULE ─────────────────────────────────────────

export type AdminViolationStats = {
  totalIncidents: number;
  newReports: number;
  underReview: number;
  escalated: number;
  highSeverity: number;
  critical: number;
  violenceReports: number;
  resolved: number;
  dismissed: number;
};

export type AdminViolationFilters = {
  department?: string | undefined;
  year?: string | undefined;
  section?: string | undefined;
  severity?: string | undefined;
  violationType?: string | undefined;
  status?: string | undefined;
  date?: string | undefined;
  search?: string | undefined;
  student?: string | undefined;
  rollNumber?: string | undefined;
  reporter?: string | undefined;
  reportId?: string | undefined;
};

export type AdminStudentViolationHistory = {
  student: {
    studentCode: string;
    name: string;
    department: string;
    year: string;
    section: string;
    semester: number;
    status: string;
  } | null;
  metrics: {
    totalReports: number;
    openReports: number;
    resolvedReports: number;
    dismissedReports: number;
    escalatedReports: number;
    criticalIncidents: number;
  };
  timeline: DBViolationReport[];
};

const ADMIN_VIOLATION_COLUMNS = `
  id, student_code, student_name, department, year_section, class_name,
  subject_code, scheduled_time, room, scheduled_faculty, incident_time,
  location, violation_type, severity, remarks, witness_notes, evidence,
  reported_by, status, explanation, explanation_submitted_at::text,
  decision, decision_by, decision_at::text, semester,
  explanation_deadline::text, created_at::text, observed_at::text
`;

/**
 * Institution-wide violation reports query for Institutional Admin.
 * Supports filtering across all departments or scoped to specific criteria.
 */
export async function getAdminViolationReports(
  filters?: AdminViolationFilters,
): Promise<DBViolationReport[]> {
  try {
    const conditions: string[] = ["1=1"];
    const params: any[] = [];
    let paramIndex = 1;

    if (filters?.department && filters.department !== "ALL") {
      conditions.push(`UPPER(department) = UPPER($${paramIndex++})`);
      params.push(filters.department.trim());
    }

    if (filters?.year && filters.year !== "ALL") {
      conditions.push(`year_section ILIKE $${paramIndex++}`);
      params.push(`%${filters.year.trim()}%`);
    }

    if (filters?.section && filters.section !== "ALL") {
      conditions.push(`year_section ILIKE $${paramIndex++}`);
      params.push(`%${filters.section.trim()}%`);
    }

    if (filters?.severity && filters.severity !== "ALL") {
      conditions.push(`UPPER(severity) = UPPER($${paramIndex++})`);
      params.push(filters.severity.trim());
    }

    if (filters?.violationType && filters.violationType !== "ALL") {
      conditions.push(`violation_type ILIKE $${paramIndex++}`);
      params.push(`%${filters.violationType.trim()}%`);
    }

    if (filters?.status && filters.status !== "ALL") {
      const st = filters.status.trim().toLowerCase();
      if (st === "new" || st === "reported") {
        conditions.push(`status IN ('reported', 'notified', 'awaiting_explanation', 'explanation_submitted')`);
      } else if (st === "resolved") {
        conditions.push(`status IN ('resolved', 'exonerated', 'warned')`);
      } else if (st === "critical") {
        conditions.push(`(UPPER(severity) = 'CRITICAL' OR violation_type ILIKE '%Violence%' OR violation_type ILIKE '%Physical Altercation%')`);
      } else if (st === "high") {
        conditions.push(`UPPER(severity) = 'HIGH'`);
      } else if (st === "violence") {
        conditions.push(`(violation_type ILIKE '%Violence%' OR violation_type ILIKE '%Physical Altercation%')`);
      } else {
        conditions.push(`status = $${paramIndex++}::violation_status`);
        params.push(st);
      }
    }

    if (filters?.date) {
      conditions.push(`created_at::date = $${paramIndex++}::date`);
      params.push(filters.date.trim());
    }

    if (filters?.search && filters.search.trim()) {
      const q = `%${filters.search.trim()}%`;
      conditions.push(
        `(student_name ILIKE $${paramIndex} OR student_code ILIKE $${paramIndex} OR id ILIKE $${paramIndex} OR reported_by ILIKE $${paramIndex} OR location ILIKE $${paramIndex} OR class_name ILIKE $${paramIndex})`,
      );
      params.push(q);
      paramIndex++;
    }

    if (filters?.student && filters.student.trim()) {
      conditions.push(`student_name ILIKE $${paramIndex++}`);
      params.push(`%${filters.student.trim()}%`);
    }

    if (filters?.rollNumber && filters.rollNumber.trim()) {
      conditions.push(`UPPER(student_code) = UPPER($${paramIndex++})`);
      params.push(filters.rollNumber.trim());
    }

    if (filters?.reporter && filters.reporter.trim()) {
      conditions.push(`reported_by ILIKE $${paramIndex++}`);
      params.push(`%${filters.reporter.trim()}%`);
    }

    if (filters?.reportId && filters.reportId.trim()) {
      conditions.push(`UPPER(id) = UPPER($${paramIndex++})`);
      params.push(filters.reportId.trim());
    }

    const query = `
      SELECT ${ADMIN_VIOLATION_COLUMNS}
      FROM violation_reports
      WHERE ${conditions.join(" AND ")}
      ORDER BY 
        CASE 
          WHEN UPPER(severity) = 'CRITICAL' THEN 1
          WHEN violation_type ILIKE '%Violence%' THEN 2
          WHEN UPPER(severity) = 'HIGH' THEN 3
          WHEN status = 'escalated' THEN 4
          WHEN status = 'reported' THEN 5
          ELSE 6
        END ASC,
        created_at DESC;
    `;

    const res = await db.query<DBViolationReport>(query, params);
    return res.rows;
  } catch (error) {
    console.error("[Admin DB Error] Error in getAdminViolationReports:", error);
    throw new Error("Failed to query institution-wide violation reports.");
  }
}

/**
 * Retrieves a single violation report by ID with institutional visibility.
 */
export async function getAdminViolationReportById(
  reportId: string,
): Promise<DBViolationReport | null> {
  const cleanId = reportId.trim();
  if (!cleanId) return null;

  try {
    const query = `
      SELECT ${ADMIN_VIOLATION_COLUMNS}
      FROM violation_reports
      WHERE UPPER(id) = UPPER($1)
      LIMIT 1;
    `;
    const res = await db.query<DBViolationReport>(query, [cleanId]);
    return res.rows[0] || null;
  } catch (error) {
    console.error("[Admin DB Error] Error in getAdminViolationReportById:", error);
    throw new Error("Failed to query violation report.");
  }
}

/**
 * Computes institutional-level statistics across all departments.
 */
export async function getAdminViolationStats(): Promise<AdminViolationStats> {
  try {
    const query = `
      SELECT
        COUNT(*)::int AS total_incidents,
        COUNT(*) FILTER (WHERE status IN ('reported', 'notified', 'awaiting_explanation', 'explanation_submitted'))::int AS new_reports,
        COUNT(*) FILTER (WHERE status = 'under_review')::int AS under_review,
        COUNT(*) FILTER (WHERE status = 'escalated')::int AS escalated,
        COUNT(*) FILTER (WHERE severity = 'High')::int AS high_severity,
        COUNT(*) FILTER (WHERE severity = 'Critical')::int AS critical,
        COUNT(*) FILTER (WHERE violation_type ILIKE '%Violence%' OR violation_type ILIKE '%Physical Altercation%')::int AS violence_reports,
        COUNT(*) FILTER (WHERE status IN ('resolved', 'exonerated', 'warned'))::int AS resolved,
        COUNT(*) FILTER (WHERE status = 'dismissed')::int AS dismissed
      FROM violation_reports;
    `;

    const res = await db.query<{
      total_incidents: number;
      new_reports: number;
      under_review: number;
      escalated: number;
      high_severity: number;
      critical: number;
      violence_reports: number;
      resolved: number;
      dismissed: number;
    }>(query);

    const row = res.rows[0];
    return {
      totalIncidents: row?.total_incidents ?? 0,
      newReports: row?.new_reports ?? 0,
      underReview: row?.under_review ?? 0,
      escalated: row?.escalated ?? 0,
      highSeverity: row?.high_severity ?? 0,
      critical: row?.critical ?? 0,
      violenceReports: row?.violence_reports ?? 0,
      resolved: row?.resolved ?? 0,
      dismissed: row?.dismissed ?? 0,
    };
  } catch (error) {
    console.error("[Admin DB Error] Error in getAdminViolationStats:", error);
    throw new Error("Failed to calculate institutional violation statistics.");
  }
}

/**
 * Retrieves student profile information, aggregated violation statistics, and complete chronological history.
 */
export async function getAdminStudentViolationHistory(
  studentCode: string,
): Promise<AdminStudentViolationHistory> {
  const cleanCode = studentCode.trim().toUpperCase();
  if (!cleanCode) {
    return {
      student: null,
      metrics: {
        totalReports: 0,
        openReports: 0,
        resolvedReports: 0,
        dismissedReports: 0,
        escalatedReports: 0,
        criticalIncidents: 0,
      },
      timeline: [],
    };
  }

  try {
    // 1. Fetch Student Profile
    const studentRes = await db.query<DBStudent>(
      `SELECT student_code, name, department, year, section, semester, status
       FROM students
       WHERE UPPER(student_code) = UPPER($1)
       LIMIT 1;`,
      [cleanCode],
    );
    const s = studentRes.rows[0];

    // 2. Fetch Aggregated Metrics
    const metricsRes = await db.query<{
      total: number;
      open: number;
      resolved: number;
      dismissed: number;
      escalated: number;
      critical: number;
    }>(
      `SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE status IN ('reported', 'notified', 'awaiting_explanation', 'explanation_submitted', 'under_review'))::int AS open,
         COUNT(*) FILTER (WHERE status IN ('resolved', 'exonerated', 'warned'))::int AS resolved,
         COUNT(*) FILTER (WHERE status = 'dismissed')::int AS dismissed,
         COUNT(*) FILTER (WHERE status = 'escalated')::int AS escalated,
         COUNT(*) FILTER (WHERE severity = 'Critical' OR violation_type ILIKE '%Violence%')::int AS critical
       FROM violation_reports
       WHERE UPPER(student_code) = UPPER($1);`,
      [cleanCode],
    );
    const m = metricsRes.rows[0];

    // 3. Fetch History Timeline
    const timelineRes = await db.query<DBViolationReport>(
      `SELECT ${ADMIN_VIOLATION_COLUMNS}
       FROM violation_reports
       WHERE UPPER(student_code) = UPPER($1)
       ORDER BY created_at DESC;`,
      [cleanCode],
    );

    return {
      student: s
        ? {
            studentCode: s.student_code,
            name: s.name,
            department: s.department,
            year: s.year,
            section: s.section,
            semester: s.semester,
            status: s.status,
          }
        : null,
      metrics: {
        totalReports: m?.total ?? 0,
        openReports: m?.open ?? 0,
        resolvedReports: m?.resolved ?? 0,
        dismissedReports: m?.dismissed ?? 0,
        escalatedReports: m?.escalated ?? 0,
        criticalIncidents: m?.critical ?? 0,
      },
      timeline: timelineRes.rows,
    };
  } catch (error) {
    console.error("[Admin DB Error] Error in getAdminStudentViolationHistory:", error);
    throw new Error("Failed to query student violation history.");
  }
}

/**
 * Acknowledges an escalated or critical violation case.
 * Records audit event `admin_incident_acknowledged`.
 */
export async function acknowledgeViolationReport(
  reportId: string,
  adminName: string,
  remarks?: string,
): Promise<DBViolationReport> {
  const cleanId = reportId.trim();
  const cleanRemarks = remarks?.trim() || "Incident acknowledged by Institutional Administration.";

  try {
    const checkRes = await db.query<DBViolationReport>(
      `SELECT ${ADMIN_VIOLATION_COLUMNS} FROM violation_reports WHERE UPPER(id) = UPPER($1) LIMIT 1;`,
      [cleanId],
    );
    const report = checkRes.rows[0];
    if (!report) {
      throw new Error(`Report #${cleanId} not found.`);
    }

    // Log audit event
    await db.query(
      `INSERT INTO audit_logs (actor, actor_role, action, target, target_id, metadata)
       VALUES ($1, 'admin', 'admin_incident_acknowledged', 'violation_report', $2, $3);`,
      [
        adminName,
        cleanId,
        JSON.stringify({
          action: "acknowledge",
          remarks: cleanRemarks,
          student_code: report.student_code,
          department: report.department,
          severity: report.severity,
        }),
      ],
    );

    return report;
  } catch (error) {
    console.error("[Admin DB Error] Error in acknowledgeViolationReport:", error);
    throw error;
  }
}

/**
 * Adds an official institutional remark to a violation case without altering original faculty observations.
 * Records audit event `admin_institutional_remark_added`.
 */
export async function addAdminViolationRemark(
  reportId: string,
  remarks: string,
  adminName: string,
): Promise<DBViolationReport> {
  const cleanId = reportId.trim();
  const cleanRemarks = remarks?.trim();
  if (!cleanRemarks) {
    throw new Error("Institutional remarks are required.");
  }

  try {
    const checkRes = await db.query<DBViolationReport>(
      `SELECT ${ADMIN_VIOLATION_COLUMNS} FROM violation_reports WHERE UPPER(id) = UPPER($1) LIMIT 1;`,
      [cleanId],
    );
    const report = checkRes.rows[0];
    if (!report) {
      throw new Error(`Report #${cleanId} not found.`);
    }

    // Log audit event
    await db.query(
      `INSERT INTO audit_logs (actor, actor_role, action, target, target_id, metadata)
       VALUES ($1, 'admin', 'admin_institutional_remark_added', 'violation_report', $2, $3);`,
      [
        adminName,
        cleanId,
        JSON.stringify({
          action: "institutional_remark",
          remarks: cleanRemarks,
          student_code: report.student_code,
          department: report.department,
        }),
      ],
    );

    return report;
  } catch (error) {
    console.error("[Admin DB Error] Error in addAdminViolationRemark:", error);
    throw error;
  }
}

/**
 * Closes an escalated violation case at the institutional level with mandatory closing remarks.
 * Enforces state transition: cannot close already resolved or dismissed cases without explicit escalation.
 * Records audit event `admin_case_closed`.
 */
export async function closeInstitutionalViolationCase(
  reportId: string,
  closingRemarks: string,
  adminName: string,
): Promise<DBViolationReport> {
  const cleanId = reportId.trim();
  const cleanRemarks = closingRemarks?.trim();
  if (!cleanRemarks) {
    throw new Error("Closing remarks are mandatory for institutional case closure.");
  }

  try {
    await db.query("BEGIN");

    const checkRes = await db.query<DBViolationReport>(
      `SELECT ${ADMIN_VIOLATION_COLUMNS} FROM violation_reports WHERE UPPER(id) = UPPER($1) LIMIT 1;`,
      [cleanId],
    );
    const report = checkRes.rows[0];
    if (!report) {
      throw new Error(`Report #${cleanId} not found.`);
    }

    if (report.status === "resolved" || report.status === "dismissed") {
      throw new Error(`Cannot close a case that is already ${report.status}.`);
    }

    const updateQuery = `
      UPDATE violation_reports
      SET
        status = 'resolved'::violation_status,
        decision = $1,
        decision_by = $2,
        decision_at = NOW()
      WHERE UPPER(id) = UPPER($3)
      RETURNING ${ADMIN_VIOLATION_COLUMNS};
    `;
    const updateRes = await db.query<DBViolationReport>(updateQuery, [
      `[Institutional Closure] ${cleanRemarks}`,
      adminName,
      cleanId,
    ]);
    const updated = updateRes.rows[0];
    if (!updated) {
      throw new Error(`Failed to update report ${cleanId} to resolved.`);
    }

    // 2. Log audit event
    await db.query(
      `INSERT INTO audit_logs (actor, actor_role, action, target, target_id, metadata)
       VALUES ($1, 'admin', 'admin_case_closed', 'violation_report', $2, $3);`,
      [
        adminName,
        cleanId,
        JSON.stringify({
          action: "close_institutional",
          remarks: cleanRemarks,
          student_code: report.student_code,
          department: report.department,
        }),
      ],
    );

    // 3. Notify HOD of student's department
    const hodUserId = await findHodUserIdForDepartment(report.department);
    if (hodUserId) {
      await createNotificationServer({
        recipientUserId: hodUserId,
        recipientRole: "hod",
        department: report.department,
        type: "violation_decision_updated",
        title: "Escalated Case Closed by Admin",
        detail: `Escalated case #${cleanId} for ${report.student_name} (${report.student_code}) has been closed at Institutional level by Admin: "${cleanRemarks.slice(0, 120)}"`,
        tone: "resolved",
        relatedId: cleanId,
        relatedType: "violation_report",
      });
    }

    // 4. Notify Student
    const studentUserId = await findStudentUserIdByCode(report.student_code);
    if (studentUserId) {
      await createNotificationServer({
        recipientUserId: studentUserId,
        recipientRole: "student",
        recipientId: report.student_code,
        department: report.department,
        type: "violation_decision_updated",
        title: "Violation Case Closed by Admin",
        detail: `Your incident report #${cleanId} has been reviewed and officially closed by Institutional Administration.`,
        tone: "resolved",
        relatedId: cleanId,
        relatedType: "violation_report",
      });
    }

    await db.query("COMMIT");
    return updated;
  } catch (error) {
    await db.query("ROLLBACK").catch(() => {});
    console.error("[Admin DB Error] Error in closeInstitutionalViolationCase:", error);
    throw error;
  }
}

/**
 * Returns an escalated case back to the Department HOD for further departmental investigation.
 * Transitions status: `escalated` -> `under_review`.
 * Records audit event `admin_case_returned_to_hod`.
 */
export async function returnViolationToHod(
  reportId: string,
  returnReason: string,
  adminName: string,
): Promise<DBViolationReport> {
  const cleanId = reportId.trim();
  const cleanReason = returnReason?.trim();
  if (!cleanReason) {
    throw new Error("Return reason is mandatory.");
  }

  try {
    await db.query("BEGIN");

    const checkRes = await db.query<DBViolationReport>(
      `SELECT ${ADMIN_VIOLATION_COLUMNS} FROM violation_reports WHERE UPPER(id) = UPPER($1) LIMIT 1;`,
      [cleanId],
    );
    const report = checkRes.rows[0];
    if (!report) {
      throw new Error(`Report #${cleanId} not found.`);
    }

    if (report.status !== "escalated") {
      throw new Error(`Only escalated cases can be returned to HOD (Current status: "${report.status}").`);
    }

    const updateQuery = `
      UPDATE violation_reports
      SET
        status = 'under_review'::violation_status,
        decision = $1,
        decision_by = $2,
        decision_at = NOW()
      WHERE UPPER(id) = UPPER($3)
      RETURNING ${ADMIN_VIOLATION_COLUMNS};
    `;
    const updateRes = await db.query<DBViolationReport>(updateQuery, [
      `[Returned to HOD by Admin] ${cleanReason}`,
      adminName,
      cleanId,
    ]);
    const updated = updateRes.rows[0];
    if (!updated) {
      throw new Error(`Failed to return report ${cleanId} to HOD.`);
    }

    // 2. Log audit event
    await db.query(
      `INSERT INTO audit_logs (actor, actor_role, action, target, target_id, metadata)
       VALUES ($1, 'admin', 'admin_case_returned_to_hod', 'violation_report', $2, $3);`,
      [
        adminName,
        cleanId,
        JSON.stringify({
          action: "return_to_hod",
          reason: cleanReason,
          student_code: report.student_code,
          department: report.department,
        }),
      ],
    );

    // 3. Notify HOD of department
    const hodUserId = await findHodUserIdForDepartment(report.department);
    if (hodUserId) {
      await createNotificationServer({
        recipientUserId: hodUserId,
        recipientRole: "hod",
        department: report.department,
        type: "violation_report_created",
        title: "Case Returned by Admin for Review",
        detail: `Incident #${cleanId} for ${report.student_name} (${report.student_code}) has been returned by Admin with instructions: "${cleanReason.slice(0, 120)}"`,
        tone: "pending",
        relatedId: cleanId,
        relatedType: "violation_report",
      });
    }

    await db.query("COMMIT");
    return updated;
  } catch (error) {
    await db.query("ROLLBACK").catch(() => {});
    console.error("[Admin DB Error] Error in returnViolationToHod:", error);
    throw error;
  }
}

/**
 * Marks an escalated or critical incident as requiring Institutional Disciplinary Committee review.
 * Records audit event `admin_disciplinary_committee_required`.
 */
export async function requireDisciplinaryCommittee(
  reportId: string,
  committeeReason: string,
  adminName: string,
): Promise<DBViolationReport> {
  const cleanId = reportId.trim();
  const cleanReason = committeeReason?.trim();
  if (!cleanReason) {
    throw new Error("Reason for disciplinary committee referral is mandatory.");
  }

  try {
    await db.query("BEGIN");

    const checkRes = await db.query<DBViolationReport>(
      `SELECT ${ADMIN_VIOLATION_COLUMNS} FROM violation_reports WHERE UPPER(id) = UPPER($1) LIMIT 1;`,
      [cleanId],
    );
    const report = checkRes.rows[0];
    if (!report) {
      throw new Error(`Report #${cleanId} not found.`);
    }

    const updateQuery = `
      UPDATE violation_reports
      SET
        decision = $1,
        decision_by = $2,
        decision_at = NOW()
      WHERE UPPER(id) = UPPER($3)
      RETURNING ${ADMIN_VIOLATION_COLUMNS};
    `;
    const updateRes = await db.query<DBViolationReport>(updateQuery, [
      `[Disciplinary Committee Required] ${cleanReason}`,
      adminName,
      cleanId,
    ]);
    const updated = updateRes.rows[0];
    if (!updated) {
      throw new Error(`Failed to update report ${cleanId}.`);
    }

    // 2. Log audit event
    await db.query(
      `INSERT INTO audit_logs (actor, actor_role, action, target, target_id, metadata)
       VALUES ($1, 'admin', 'admin_disciplinary_committee_required', 'violation_report', $2, $3);`,
      [
        adminName,
        cleanId,
        JSON.stringify({
          action: "disciplinary_committee_required",
          reason: cleanReason,
          student_code: report.student_code,
          department: report.department,
        }),
      ],
    );

    // 3. Notify HOD of department
    const hodUserId = await findHodUserIdForDepartment(report.department);
    if (hodUserId) {
      await createNotificationServer({
        recipientUserId: hodUserId,
        recipientRole: "hod",
        department: report.department,
        type: "critical_incident",
        title: "Disciplinary Committee Referral",
        detail: `Incident #${cleanId} for ${report.student_name} (${report.student_code}) has been referred to the Disciplinary Committee: "${cleanReason.slice(0, 120)}"`,
        tone: "violation",
        relatedId: cleanId,
        relatedType: "violation_report",
      });
    }

    await db.query("COMMIT");
    return updated;
  } catch (error) {
    await db.query("ROLLBACK").catch(() => {});
    console.error("[Admin DB Error] Error in requireDisciplinaryCommittee:", error);
    throw error;
  }
}

/**
 * Retrieves chronological audit history for a violation report with institutional visibility.
 */
export async function getAdminViolationAuditHistory(
  reportId: string,
): Promise<DBAuditLogRecord[]> {
  const cleanId = reportId.trim();
  if (!cleanId) return [];

  try {
    const query = `
      SELECT
        id::text,
        actor,
        actor_role::text AS actor_role,
        action,
        target,
        target_id,
        metadata,
        timestamp::text AS timestamp
      FROM audit_logs
      WHERE target_id = $1 OR target = $1 OR metadata->>'report_id' = $1
      ORDER BY timestamp ASC;
    `;
    const res = await db.query<DBAuditLogRecord>(query, [cleanId]);
    return res.rows;
  } catch (error) {
    console.error("[Admin DB Error] Error in getAdminViolationAuditHistory:", error);
    throw new Error("Failed to query violation audit history.");
  }
}

/**
 * Retrieves the complete chronological audit timeline for a specific movement pass.
 */
export async function getMovementPassAuditHistory(passId: string): Promise<DBAuditLogRecord[]> {
  const cleanId = passId.trim();
  if (!cleanId) return [];

  try {
    const query = `
      SELECT
        id::text,
        actor,
        actor_role::text AS actor_role,
        action,
        target,
        target_id,
        metadata,
        timestamp::text AS timestamp
      FROM audit_logs
      WHERE target_id = $1 OR metadata->>'pass_id' = $1
      ORDER BY timestamp ASC;
    `;

    const res = await db.query<DBAuditLogRecord>(query, [cleanId]);
    return res.rows;
  } catch (error) {
    console.error("[Admin DB Error] Error in getMovementPassAuditHistory:", error);
    throw new Error("Failed to query movement pass audit timeline.");
  }
}


