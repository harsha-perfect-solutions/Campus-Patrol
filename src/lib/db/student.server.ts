import { db } from "../db.server";
import { getStudentByCode, type DBStudent } from "./students.server";
import type { DBPermission } from "./permissions.server";
import type { DBViolationReport } from "./violations.server";

export type StudentDashboardStats = {
  activeGatePass: string | null;
  validUntil: string | null;
  confirmedViolations: number;
  pendingExplanationCount: number;
  activePermissionsCount: number;
  approvedPermissionsCount: number;
  rejectedPermissionsCount: number;
};

/**
 * Retrieves full student profile combining students and profiles table information.
 */
export async function getMyStudentProfile(studentCode: string): Promise<{
  student: DBStudent | null;
  email?: string;
  photoUrl?: string;
}> {
  const cleanCode = studentCode.trim().toUpperCase();
  if (!cleanCode) return { student: null };

  try {
    const student = await getStudentByCode(cleanCode);

    // Also attempt lookup in profiles table for email if available
    const profileQuery = `
      SELECT email, avatar_url
      FROM profiles
      WHERE UPPER(student_code) = UPPER($1)
      LIMIT 1;
    `;
    const profileRes = await db.query<{ email: string; avatar_url: string }>(profileQuery, [
      cleanCode,
    ]);

    const emailVal = profileRes.rows[0]?.email;
    const photoVal = profileRes.rows[0]?.avatar_url || student?.photo_url || undefined;

    return {
      student,
      ...(emailVal ? { email: emailVal } : {}),
      ...(photoVal ? { photoUrl: photoVal } : {}),
    };
  } catch (error) {
    console.error("[Student DB Error] Error in getMyStudentProfile:", error);
    throw new Error("Failed to query student profile from database.");
  }
}

/**
 * Retrieves movement permissions belonging strictly to the authenticated student.
 */
export async function getMyMovementPermissions(studentCode: string): Promise<DBPermission[]> {
  const cleanCode = studentCode.trim().toUpperCase();
  if (!cleanCode) return [];

  try {
    const query = `
      SELECT *
      FROM movement_permissions
      WHERE UPPER(student_code) = UPPER($1)
      ORDER BY date DESC, created_at DESC;
    `;
    const result = await db.query<DBPermission>(query, [cleanCode]);
    return result.rows;
  } catch (error) {
    console.error("[Student DB Error] Error in getMyMovementPermissions:", error);
    throw new Error("Failed to query student movement permissions.");
  }
}

/**
 * Requests a new movement permission for the student with status = 'pending'.
 * Includes atomic audit log creation.
 */
export async function requestMovementPermission(
  studentCode: string,
  reason: string,
  date: string,
  validFrom: string,
  validUntil: string,
): Promise<DBPermission> {
  const cleanCode = studentCode.trim().toUpperCase();
  const cleanReason = reason.trim();
  const cleanDate = date.trim();
  const cleanFrom = validFrom.trim();
  const cleanUntil = validUntil.trim();

  if (!cleanCode || !cleanReason || !cleanDate || !cleanFrom || !cleanUntil) {
    throw new Error("Invalid or incomplete movement permission request arguments.");
  }

  try {
    await db.query("BEGIN");

    // Insert new movement permission request with forced status = 'pending'
    const insertQuery = `
      INSERT INTO movement_permissions (
        student_code,
        reason,
        date,
        valid_from,
        valid_until,
        status,
        issued_by
      ) VALUES ($1, $2, $3, $4, $5, 'pending', 'Student Requested')
      RETURNING *;
    `;

    const result = await db.query<DBPermission>(insertQuery, [
      cleanCode,
      cleanReason,
      cleanDate,
      cleanFrom,
      cleanUntil,
    ]);

    const createdPermission = result.rows[0];
    if (!createdPermission) {
      throw new Error("Failed to insert movement permission record.");
    }

    // Insert atomic audit log entry
    const auditQuery = `
      INSERT INTO audit_logs (
        actor,
        actor_role,
        action,
        target,
        target_id,
        metadata
      ) VALUES ($1, 'student', 'movement_permission_requested', 'movement_permission', $2, $3);
    `;

    const metadata = JSON.stringify({
      reason: cleanReason,
      date: cleanDate,
      valid_from: cleanFrom,
      valid_until: cleanUntil,
      status: "pending",
    });

    await db.query(auditQuery, [cleanCode, String(createdPermission.id), metadata]);

    await db.query("COMMIT");
    return createdPermission;
  } catch (error) {
    await db.query("ROLLBACK");
    console.error("[Student DB Error] Error requesting movement permission:", error);
    throw new Error("Failed to record movement permission request in database.");
  }
}

/**
 * Retrieves violation reports belonging strictly to the authenticated student.
 */
export async function getMyViolationReports(studentCode: string): Promise<DBViolationReport[]> {
  const cleanCode = studentCode.trim().toUpperCase();
  if (!cleanCode) return [];

  try {
    const query = `
      SELECT
        id, student_code, student_name, department, year_section, class_name,
        scheduled_time, room, incident_time, location, remarks, evidence, reported_by, status,
        explanation, explanation_submitted_at::text, decision, decision_by, decision_at::text,
        semester, explanation_deadline::text, created_at::text
      FROM violation_reports
      WHERE UPPER(student_code) = UPPER($1)
      ORDER BY created_at DESC;
    `;
    const result = await db.query<DBViolationReport>(query, [cleanCode]);
    return result.rows;
  } catch (error) {
    console.error("[Student DB Error] Error in getMyViolationReports:", error);
    throw new Error("Failed to query student violation reports.");
  }
}

/**
 * Retrieves a single violation report by ID, verifying student ownership.
 */
export async function getMyViolationById(
  reportId: string,
  studentCode: string,
): Promise<DBViolationReport | null> {
  const cleanId = reportId.trim();
  const cleanCode = studentCode.trim().toUpperCase();

  if (!cleanId || !cleanCode) return null;

  try {
    const query = `
      SELECT
        id, student_code, student_name, department, year_section, class_name,
        scheduled_time, room, incident_time, location, remarks, evidence, reported_by, status,
        explanation, explanation_submitted_at::text, decision, decision_by, decision_at::text,
        semester, explanation_deadline::text, created_at::text
      FROM violation_reports
      WHERE UPPER(id) = UPPER($1)
        AND UPPER(student_code) = UPPER($2)
      LIMIT 1;
    `;
    const result = await db.query<DBViolationReport>(query, [cleanId, cleanCode]);
    return result.rows[0] ?? null;
  } catch (error) {
    console.error("[Student DB Error] Error in getMyViolationById:", error);
    throw new Error("Failed to query student violation report detail.");
  }
}

/**
 * Calculates student dashboard metrics strictly from PostgreSQL database tables.
 */
export async function getMyStudentDashboardStats(
  studentCode: string,
): Promise<StudentDashboardStats> {
  const cleanCode = studentCode.trim().toUpperCase();
  if (!cleanCode) {
    return {
      activeGatePass: null,
      validUntil: null,
      confirmedViolations: 0,
      pendingExplanationCount: 0,
      activePermissionsCount: 0,
      approvedPermissionsCount: 0,
      rejectedPermissionsCount: 0,
    };
  }

  try {
    // 1. Query active gate pass
    const passRes = await db.query<{ reason: string; valid_until: string }>(
      `SELECT reason, valid_until FROM movement_permissions WHERE UPPER(student_code) = UPPER($1) AND UPPER(status::text) = 'APPROVED' ORDER BY created_at DESC LIMIT 1;`,
      [cleanCode],
    );

    // 2. Query violation stats
    const violQuery = `
      SELECT
        COUNT(*) FILTER (WHERE status::text NOT IN ('exonerated', 'Exonerated'))::int AS confirmed_violations,
        COUNT(*) FILTER (WHERE status::text IN ('awaiting_explanation', 'notified', 'reported') AND (explanation IS NULL OR explanation = ''))::int AS pending_explanations
      FROM violation_reports
      WHERE UPPER(student_code) = UPPER($1);
    `;
    const violRes = await db.query<{ confirmed_violations: number; pending_explanations: number }>(
      violQuery,
      [cleanCode],
    );

    // 3. Query movement permission counts
    const permQuery = `
      SELECT
        COUNT(*) FILTER (WHERE UPPER(status::text) = 'APPROVED')::int AS approved_count,
        COUNT(*) FILTER (WHERE UPPER(status::text) = 'REJECTED')::int AS rejected_count,
        COUNT(*) FILTER (WHERE UPPER(status::text) = 'PENDING')::int AS pending_count
      FROM movement_permissions
      WHERE UPPER(student_code) = UPPER($1);
    `;
    const permRes = await db.query<{
      approved_count: number;
      rejected_count: number;
      pending_count: number;
    }>(permQuery, [cleanCode]);

    const pass = passRes.rows[0];
    const viol = violRes.rows[0];
    const perm = permRes.rows[0];

    return {
      activeGatePass: pass?.reason ?? null,
      validUntil: pass?.valid_until ?? null,
      confirmedViolations: viol?.confirmed_violations ?? 0,
      pendingExplanationCount: viol?.pending_explanations ?? 0,
      activePermissionsCount: perm?.approved_count ?? 0,
      approvedPermissionsCount: perm?.approved_count ?? 0,
      rejectedPermissionsCount: perm?.rejected_count ?? 0,
    };
  } catch (error) {
    console.error("[Student DB Error] Error in getMyStudentDashboardStats:", error);
    throw new Error("Failed to calculate student dashboard statistics.");
  }
}
