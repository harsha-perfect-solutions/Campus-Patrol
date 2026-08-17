import { db } from "../db.server";
import { getStudentByCode, type DBStudent } from "./students.server";
import type { DBPermission } from "./permissions.server";
import type { DBViolationReport } from "./violations.server";
import {
  findHodUserIdForStudentCode,
  findStudentUserIdByCode,
  createNotificationServer,
} from "./notifications.server";

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
      SELECT
        id::text,
        student_code,
        reason,
        to_char(date, 'YYYY-MM-DD') AS date,
        valid_from::text,
        valid_until::text,
        status::text,
        issued_by,
        exit_at::text,
        entry_at::text,
        checkpoint,
        verified_by,
        revoked_at::text,
        cancelled_at::text,
        created_at::text
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
      ) VALUES ($1, $2, $3::date, $4::time, $5::time, 'pending', 'Student Requested')
      RETURNING
        id::text,
        student_code,
        reason,
        to_char(date, 'YYYY-MM-DD') AS date,
        valid_from::text,
        valid_until::text,
        status::text,
        issued_by,
        exit_at::text,
        entry_at::text,
        checkpoint,
        verified_by,
        created_at::text;
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
      ) VALUES ($1, 'student', 'movement_pass_requested', $2, $3, $4);
    `;

    const auditMetadata = JSON.stringify({
      student_code: cleanCode,
      reason: cleanReason,
      date: cleanDate,
      valid_from: cleanFrom,
      valid_until: cleanUntil,
      status: "pending",
      timestamp: new Date().toISOString(),
    });

    await db.query(auditQuery, [cleanCode, cleanCode, String(createdPermission.id), auditMetadata]);

    // 1. Notify Student: confirmation that request was submitted
    const studentUserId = await findStudentUserIdByCode(cleanCode);
    await createNotificationServer({
      recipientUserId: studentUserId,
      recipientId: cleanCode,
      recipientRole: "student",
      type: "movement_pass_requested",
      title: "Movement Pass Submitted",
      detail: "Your movement pass request is pending HOD approval.",
      tone: "pending",
      relatedId: String(createdPermission.id),
      relatedType: "movement_permission",
    });

    // 2. Notify HOD of student's actual department about the movement pass request
    const hodUserId = await findHodUserIdForStudentCode(cleanCode);
    if (hodUserId) {
      // Look up student's department for notification context
      const stRes = await db.query<{ department: string; name: string }>(
        "SELECT department, name FROM students WHERE UPPER(student_code) = UPPER($1) LIMIT 1",
        [cleanCode],
      );
      const dept = stRes.rows[0]?.department ?? "Unknown";
      const studentName = stRes.rows[0]?.name ?? cleanCode;
      await createNotificationServer({
        recipientUserId: hodUserId,
        recipientRole: "hod",
        department: dept,
        type: "gate_pass_requested",
        title: "New Movement Pass Request",
        detail: `${studentName} (${cleanCode}) has requested permission to leave campus. Reason: ${cleanReason.slice(0, 80)}`,
        tone: "pending",
        relatedId: String(createdPermission.id),
        relatedType: "movement_permission",
      });
    }

    await db.query("COMMIT");
    return createdPermission;
  } catch (error) {
    await db.query("ROLLBACK").catch(() => {});
    console.error("[Student DB Error] Error requesting movement permission:", error);
    throw new Error("Failed to record movement permission request in database.");
  }
}

export type StudentViolationStats = {
  totalIncidents: number;
  openCases: number;
  awaitingMyResponse: number;
  underHodReview: number;
  escalated: number;
  resolved: number;
  dismissed: number;
};

export type StudentViolationFilters = {
  status?: string | undefined;
  severity?: string | undefined;
  violationType?: string | undefined;
  search?: string | undefined;
};

export type StudentTimelineEvent = {
  id: string;
  actor: string;
  actorRole: string;
  action: string;
  timestamp: string;
  description: string;
};

const STUDENT_VIOLATION_COLUMNS = `
  id, student_code, student_name, department, year_section, class_name,
  subject_code, scheduled_time, room, scheduled_faculty, incident_time,
  location, violation_type, severity, remarks, witness_notes, evidence,
  reported_by, status, explanation, explanation_submitted_at::text,
  decision, decision_by, decision_at::text, semester,
  explanation_deadline::text, created_at::text, observed_at::text
`;

/**
 * Retrieves violation reports belonging strictly to the authenticated student.
 */
export async function getMyViolationReports(
  studentCode: string,
  filters?: StudentViolationFilters,
): Promise<DBViolationReport[]> {
  const cleanCode = studentCode.trim().toUpperCase();
  if (!cleanCode) return [];

  try {
    const conditions: string[] = ["UPPER(student_code) = UPPER($1)"];
    const params: any[] = [cleanCode];
    let paramIndex = 2;

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
      if (st === "awaiting_response" || st === "awaiting_explanation") {
        conditions.push(`status IN ('reported', 'notified', 'awaiting_explanation') AND (explanation IS NULL OR explanation = '')`);
      } else if (st === "open") {
        conditions.push(`status IN ('reported', 'notified', 'awaiting_explanation', 'explanation_submitted', 'under_review')`);
      } else if (st === "resolved") {
        conditions.push(`status IN ('resolved', 'exonerated', 'warned')`);
      } else {
        conditions.push(`status = $${paramIndex++}::violation_status`);
        params.push(st);
      }
    }

    if (filters?.search && filters.search.trim()) {
      const q = `%${filters.search.trim()}%`;
      conditions.push(
        `(id ILIKE $${paramIndex} OR violation_type ILIKE $${paramIndex} OR class_name ILIKE $${paramIndex} OR location ILIKE $${paramIndex} OR reported_by ILIKE $${paramIndex})`,
      );
      params.push(q);
      paramIndex++;
    }

    const query = `
      SELECT ${STUDENT_VIOLATION_COLUMNS}
      FROM violation_reports
      WHERE ${conditions.join(" AND ")}
      ORDER BY created_at DESC;
    `;
    const result = await db.query<DBViolationReport>(query, params);
    return result.rows;
  } catch (error) {
    console.error("[Student DB Error] Error in getMyViolationReports:", error);
    throw new Error("Failed to query student violation reports.");
  }
}

/**
 * Retrieves a single violation report by ID, strictly verifying student ownership.
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
      SELECT ${STUDENT_VIOLATION_COLUMNS}
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

export const getMyViolationReportById = getMyViolationById;

/**
 * Computes violation and discipline metrics strictly for the authenticated student.
 */
export async function getMyViolationStats(studentCode: string): Promise<StudentViolationStats> {
  const cleanCode = studentCode.trim().toUpperCase();
  if (!cleanCode) {
    return {
      totalIncidents: 0,
      openCases: 0,
      awaitingMyResponse: 0,
      underHodReview: 0,
      escalated: 0,
      resolved: 0,
      dismissed: 0,
    };
  }

  try {
    const query = `
      SELECT
        COUNT(*)::int AS total_incidents,
        COUNT(*) FILTER (WHERE status IN ('reported', 'notified', 'awaiting_explanation', 'explanation_submitted', 'under_review'))::int AS open_cases,
        COUNT(*) FILTER (WHERE status IN ('reported', 'notified', 'awaiting_explanation') AND (explanation IS NULL OR explanation = '') AND (explanation_deadline IS NULL OR explanation_deadline > NOW()))::int AS awaiting_response,
        COUNT(*) FILTER (WHERE status = 'under_review')::int AS under_review,
        COUNT(*) FILTER (WHERE status = 'escalated')::int AS escalated,
        COUNT(*) FILTER (WHERE status IN ('resolved', 'exonerated', 'warned'))::int AS resolved,
        COUNT(*) FILTER (WHERE status = 'dismissed')::int AS dismissed
      FROM violation_reports
      WHERE UPPER(student_code) = UPPER($1);
    `;

    const res = await db.query<{
      total_incidents: number;
      open_cases: number;
      awaiting_response: number;
      under_review: number;
      escalated: number;
      resolved: number;
      dismissed: number;
    }>(query, [cleanCode]);

    const row = res.rows[0];
    return {
      totalIncidents: row?.total_incidents ?? 0,
      openCases: row?.open_cases ?? 0,
      awaitingMyResponse: row?.awaiting_response ?? 0,
      underHodReview: row?.under_review ?? 0,
      escalated: row?.escalated ?? 0,
      resolved: row?.resolved ?? 0,
      dismissed: row?.dismissed ?? 0,
    };
  } catch (error) {
    console.error("[Student DB Error] Error in getMyViolationStats:", error);
    throw new Error("Failed to calculate student incident stats.");
  }
}

/**
 * Retrieves chronological timeline of events for an incident, verifying student ownership.
 */
export async function getMyViolationTimeline(
  reportId: string,
  studentCode: string,
): Promise<StudentTimelineEvent[]> {
  const cleanId = reportId.trim();
  const cleanCode = studentCode.trim().toUpperCase();

  if (!cleanId || !cleanCode) return [];

  try {
    // 1. Verify ownership
    const report = await getMyViolationById(cleanId, cleanCode);
    if (!report) {
      throw new Error(`Violation report #${cleanId} not found or access denied.`);
    }

    // 2. Query audit logs
    const auditQuery = `
      SELECT
        id::text,
        actor,
        actor_role::text AS actor_role,
        action,
        metadata,
        timestamp::text AS timestamp
      FROM audit_logs
      WHERE target_id = $1 OR target = $1 OR metadata->>'report_id' = $1
      ORDER BY timestamp ASC;
    `;
    const res = await db.query<{
      id: string;
      actor: string;
      actor_role: string;
      action: string;
      metadata: any;
      timestamp: string;
    }>(auditQuery, [cleanId]);

    // Map into student-safe timeline events
    return res.rows.map((row) => {
      let description = "Event recorded";
      const act = row.action;

      if (act === "violation_reported" || act === "violation_report_created") {
        description = `Incident report filed by Faculty (${report.reported_by})`;
      } else if (act === "violation_review_started") {
        description = "Department HOD started case review & investigation";
      } else if (act === "student_explanation_submitted") {
        description = "Your explanation statement was submitted to Department HOD";
      } else if (act === "violation_resolved") {
        description = "Case reviewed and resolved by Department HOD";
      } else if (act === "violation_dismissed") {
        description = "Report reviewed and dismissed by Department HOD";
      } else if (act === "violation_escalated_admin") {
        description = "Case escalated for Institutional Administration oversight";
      } else if (act === "admin_incident_acknowledged") {
        description = "Institutional Administration acknowledged incident";
      } else if (act === "admin_institutional_remark_added") {
        description = "Institutional administrative remark recorded";
      } else if (act === "admin_case_closed") {
        description = "Institutional disciplinary case closed by Admin";
      } else if (act === "admin_case_returned_to_hod") {
        description = "Case returned by Admin to Department HOD for mentor counseling";
      } else if (act === "admin_disciplinary_committee_required") {
        description = "Referred for Proctorial Disciplinary Committee review";
      }

      return {
        id: row.id,
        actor: row.actor,
        actorRole: row.actor_role,
        action: row.action,
        timestamp: row.timestamp,
        description,
      };
    });
  } catch (error) {
    console.error("[Student DB Error] Error in getMyViolationTimeline:", error);
    throw error;
  }
}

/**
 * Submits an explanation statement for a violation case with strict server-side validation.
 * Enforces ownership, minimum content length, deadline expiry, and single-submission lock.
 */
export async function submitViolationExplanation(
  reportId: string,
  studentCode: string,
  explanation: string,
  evidence?: string,
): Promise<DBViolationReport> {
  const cleanId = reportId.trim();
  const cleanCode = studentCode.trim().toUpperCase();
  const cleanExp = explanation?.trim();
  const cleanEvidence = evidence?.trim() || null;

  if (!cleanId || !cleanCode) {
    throw new Error("Report ID and Student Code are required.");
  }

  if (!cleanExp || cleanExp.length < 10) {
    throw new Error("Please provide a meaningful explanation (minimum 10 characters).");
  }

  if (cleanExp.length > 2000) {
    throw new Error("Explanation exceeds maximum limit of 2000 characters.");
  }

  try {
    await db.query("BEGIN");

    // 1. Verify ownership and current status
    const checkQuery = `
      SELECT ${STUDENT_VIOLATION_COLUMNS}
      FROM violation_reports
      WHERE UPPER(id) = UPPER($1)
        AND UPPER(student_code) = UPPER($2)
      LIMIT 1;
    `;
    const checkRes = await db.query<DBViolationReport>(checkQuery, [cleanId, cleanCode]);
    const report = checkRes.rows[0];

    if (!report) {
      throw new Error(`Violation report #${cleanId} not found or access denied.`);
    }

    if (report.explanation && report.explanation.trim().length > 0) {
      throw new Error("An explanation has already been submitted for this case. Responses cannot be modified.");
    }

    if (report.status === "resolved" || report.status === "dismissed") {
      throw new Error(`Cannot submit explanation: This case is already ${report.status}.`);
    }

    if (report.explanation_deadline && new Date(report.explanation_deadline) < new Date()) {
      throw new Error("The deadline to submit an explanation for this incident has expired.");
    }

    // 2. Update explanation and status to explanation_submitted
    const updateQuery = `
      UPDATE violation_reports
      SET
        explanation = $1,
        evidence = COALESCE($2, evidence),
        explanation_submitted_at = NOW(),
        status = 'explanation_submitted'::violation_status
      WHERE UPPER(id) = UPPER($3)
        AND UPPER(student_code) = UPPER($4)
      RETURNING ${STUDENT_VIOLATION_COLUMNS};
    `;
    const updateRes = await db.query<DBViolationReport>(updateQuery, [
      cleanExp,
      cleanEvidence,
      cleanId,
      cleanCode,
    ]);
    const updated = updateRes.rows[0];
    if (!updated) {
      throw new Error("Failed to record explanation statement in database.");
    }

    // 3. Log atomic audit event
    await db.query(
      `INSERT INTO audit_logs (actor, actor_role, action, target, target_id, metadata)
       VALUES ($1, 'student', 'student_explanation_submitted', 'violation_report', $2, $3);`,
      [
        report.student_name || cleanCode,
        cleanId,
        JSON.stringify({
          student_code: cleanCode,
          report_id: cleanId,
          explanation_length: cleanExp.length,
          has_evidence: !!cleanEvidence,
        }),
      ],
    );

    // 4. Notify HOD of student's department
    const hodUserId = await findHodUserIdForStudentCode(cleanCode);
    if (hodUserId) {
      await createNotificationServer({
        recipientUserId: hodUserId,
        recipientRole: "hod",
        department: report.department,
        type: "student_explanation_submitted",
        title: "Student Explanation Submitted",
        detail: `${report.student_name} (${cleanCode}) has submitted an explanation for incident #${cleanId}.`,
        tone: "info",
        relatedId: cleanId,
        relatedType: "violation_report",
      });
    }

    await db.query("COMMIT");
    return updated;
  } catch (error) {
    await db.query("ROLLBACK").catch(() => {});
    console.error("[Student DB Error] Error submitting violation explanation:", error);
    throw error;
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
        COUNT(*) FILTER (WHERE status::text NOT IN ('exonerated', 'Exonerated', 'dismissed'))::int AS confirmed_violations,
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

