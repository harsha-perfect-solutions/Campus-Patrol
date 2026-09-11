import { db } from "../db.server";
import type { DBViolationReport } from "./violations.server";
import {
  findHodUserIdForStudentCode,
  findStudentUserIdByCode,
  findFacultyUserIdByName,
  findAllAdminUserIds,
  createNotificationServer,
} from "./notifications.server";

export type HODDashboardStats = {
  pendingCases: number;
  awaitingExplanation: number;
  underReview: number;
  exonerated: number;
  warnings: number;
  escalated: number;
  totalCases: number;
  totalReports: number;
  newReports: number;
  highSeverity: number;
  criticalIncidents: number;
  violenceReports: number;
  resolved: number;
  dismissed: number;
};

const HOD_VIOLATION_COLUMNS = `
  id, student_code, student_name, department, year_section, class_name,
  subject_code, scheduled_time, room, scheduled_faculty, incident_time,
  observed_at::text, location, violation_type, severity, remarks, witness_notes,
  evidence, reported_by, status::text, explanation, explanation_submitted_at::text,
  decision, decision_by, decision_at::text, semester, explanation_deadline::text, created_at::text,
  assigned_counselor_id, counselor_assignment_status, counselor_remarks, counselor_reviewed_at::text,
  escalation_reason, escalated_at::text, resolution_note, resolved_by, resolved_at::text, audit_trail
`;

/**
 * Fetches violation reports for an HOD's department with multi-criteria filtering.
 * Strict department isolation: HOD can only access their own department's reports.
 */
export async function getHodViolationReports(
  department: string,
  filters?: {
    status?: string;
    severity?: string;
    violationType?: string;
    search?: string;
  },
): Promise<DBViolationReport[]> {
  const cleanDept = department.trim();
  if (!cleanDept) return [];

  try {
    const conditions: string[] = ["UPPER(department) = UPPER($1)"];
    const params: any[] = [cleanDept];

    if (filters?.status && filters.status !== "ALL") {
      params.push(filters.status.toLowerCase());
      conditions.push(`LOWER(status::text) = $${params.length}`);
    }

    if (filters?.severity && filters.severity !== "ALL") {
      params.push(filters.severity);
      conditions.push(`severity = $${params.length}`);
    }

    if (filters?.violationType && filters.violationType !== "ALL") {
      params.push(`%${filters.violationType}%`);
      conditions.push(`violation_type ILIKE $${params.length}`);
    }

    if (filters?.search?.trim()) {
      params.push(`%${filters.search.trim()}%`);
      const pIdx = params.length;
      conditions.push(`(
        student_name ILIKE $${pIdx} OR
        student_code ILIKE $${pIdx} OR
        id ILIKE $${pIdx} OR
        violation_type ILIKE $${pIdx} OR
        reported_by ILIKE $${pIdx}
      )`);
    }

    const query = `
      SELECT ${HOD_VIOLATION_COLUMNS}
      FROM violation_reports
      WHERE ${conditions.join(" AND ")}
      ORDER BY 
        CASE 
          WHEN severity = 'Critical' THEN 1
          WHEN severity = 'High' THEN 2
          WHEN severity = 'Medium' THEN 3
          ELSE 4
        END ASC,
        created_at DESC;
    `;

    const result = await db.query<DBViolationReport>(query, params);
    return result.rows;
  } catch (error) {
    console.error("[HOD DB Error] Error fetching HOD violation reports:", error);
    throw new Error("Failed to query department violation reports.");
  }
}

/**
 * Fetches a single violation report by ID, strictly enforcing department isolation.
 */
export async function getHodViolationReportById(
  reportId: string,
  department: string,
): Promise<DBViolationReport | null> {
  const cleanId = reportId.trim();
  const cleanDept = department.trim();
  if (!cleanId || !cleanDept) return null;

  try {
    const query = `
      SELECT ${HOD_VIOLATION_COLUMNS}
      FROM violation_reports
      WHERE UPPER(id) = UPPER($1)
        AND UPPER(department) = UPPER($2)
      LIMIT 1;
    `;

    const result = await db.query<DBViolationReport>(query, [cleanId, cleanDept]);
    return result.rows[0] ?? null;
  } catch (error) {
    console.error("[HOD DB Error] Error fetching violation report by ID:", error);
    throw new Error("Failed to query violation report.");
  }
}

/**
 * Starts HOD review on a newly reported violation case.
 * Valid transition: 'reported' / 'awaiting_explanation' / 'notified' -> 'under_review'.
 */
export async function startViolationReview(
  reportId: string,
  hodName: string,
  hodDept: string,
): Promise<DBViolationReport> {
  const cleanId = reportId.trim();
  const cleanDept = hodDept.trim();

  try {
    await db.query("BEGIN");

    // 1. Check current status & department ownership
    const checkQuery = `
      SELECT id, status::text, department, student_name, student_code, reported_by
      FROM violation_reports
      WHERE UPPER(id) = UPPER($1)
      LIMIT 1;
    `;
    const checkRes = await db.query(checkQuery, [cleanId]);
    const report = checkRes.rows[0];

    if (!report) {
      throw new Error(`Report with ID ${cleanId} not found.`);
    }

    if (report.department.toUpperCase() !== cleanDept.toUpperCase()) {
      throw new Error(`Department mismatch: HOD of ${cleanDept} cannot review reports for ${report.department}.`);
    }

    if (report.status === "resolved" || report.status === "dismissed" || report.status === "exonerated") {
      throw new Error(`Cannot start review on a case that is already ${report.status}.`);
    }

    // 2. Update status to under_review
    const updateQuery = `
      UPDATE violation_reports
      SET status = 'under_review'::violation_status
      WHERE UPPER(id) = UPPER($1)
      RETURNING ${HOD_VIOLATION_COLUMNS};
    `;
    const result = await db.query<DBViolationReport>(updateQuery, [cleanId]);
    const updated = result.rows[0];

    if (!updated) {
      throw new Error(`Failed to update report ${cleanId} to under_review.`);
    }

    // 3. Log audit event
    await db.query(
      `INSERT INTO audit_logs (actor, actor_role, action, target, target_id, metadata)
       VALUES ($1, 'hod', 'violation_review_started', 'violation_report', $2, $3);`,
      [
        hodName,
        cleanId,
        JSON.stringify({
          previous_status: report.status,
          new_status: "under_review",
          student_code: report.student_code,
          department: cleanDept,
        }),
      ],
    );

    // 4. Notify Faculty reporter
    const facultyUserId = await findFacultyUserIdByName(report.reported_by);
    await createNotificationServer({
      recipientUserId: facultyUserId || null,
      recipientRole: "faculty",
      recipientId: report.reported_by,
      department: cleanDept,
      type: "violation_report_created",
      title: "Violation Report Under Review",
      detail: `Your violation report for ${report.student_name} (${report.student_code}) is now under HOD review.`,
      tone: "pending",
      relatedId: cleanId,
      relatedType: "violation_report",
    });

    // 5. Notify Student
    const studentUserId = await findStudentUserIdByCode(report.student_code);
    if (studentUserId) {
      await createNotificationServer({
        recipientUserId: studentUserId,
        recipientRole: "student",
        recipientId: report.student_code,
        department: cleanDept,
        type: "violation_report_created",
        title: "Incident Under HOD Review",
        detail: `Incident #${cleanId} is currently under formal review by your Department HOD.`,
        tone: "pending",
        relatedId: cleanId,
        relatedType: "violation_report",
      });
    }

    await db.query("COMMIT");
    return updated;
  } catch (error) {
    await db.query("ROLLBACK");
    console.error("[HOD DB Error] Error starting violation review:", error);
    throw error;
  }
}

/**
 * Resolves a violation report with mandatory HOD remarks.
 * Enforces valid transition: cannot reopen resolved or dismissed cases.
 */
export async function resolveViolationReport(
  reportId: string,
  remarks: string,
  hodName: string,
  hodDept: string,
): Promise<DBViolationReport> {
  const cleanId = reportId.trim();
  const cleanDept = hodDept.trim();
  const cleanRemarks = remarks?.trim();

  if (!cleanRemarks) {
    throw new Error("Resolution remarks are mandatory.");
  }

  try {
    await db.query("BEGIN");

    // 1. Check current status & department ownership
    const checkQuery = `
      SELECT id, status::text, department, student_name, student_code, reported_by
      FROM violation_reports
      WHERE UPPER(id) = UPPER($1)
      LIMIT 1;
    `;
    const checkRes = await db.query(checkQuery, [cleanId]);
    const report = checkRes.rows[0];

    if (!report) {
      throw new Error(`Report with ID ${cleanId} not found.`);
    }

    if (report.department.toUpperCase() !== cleanDept.toUpperCase()) {
      throw new Error(`Department mismatch: HOD of ${cleanDept} cannot resolve reports for ${report.department}.`);
    }

    if (report.status === "resolved" || report.status === "dismissed") {
      throw new Error(`Cannot resolve a case that is already ${report.status}.`);
    }

    // 2. Update status to resolved
    const updateQuery = `
      UPDATE violation_reports
      SET 
        status = 'resolved'::violation_status,
        decision = $1,
        decision_by = $2,
        decision_at = NOW()
      WHERE UPPER(id) = UPPER($3)
      RETURNING ${HOD_VIOLATION_COLUMNS};
    `;
    const result = await db.query<DBViolationReport>(updateQuery, [
      cleanRemarks,
      hodName,
      cleanId,
    ]);
    const updated = result.rows[0];
    if (!updated) {
      throw new Error(`Failed to update report ${cleanId} to resolved.`);
    }

    // 3. Log audit event
    await db.query(
      `INSERT INTO audit_logs (actor, actor_role, action, target, target_id, metadata)
       VALUES ($1, 'hod', 'violation_resolved', 'violation_report', $2, $3);`,
      [
        hodName,
        cleanId,
        JSON.stringify({
          action: "resolve",
          remarks: cleanRemarks,
          student_code: report.student_code,
          department: cleanDept,
        }),
      ],
    );

    // 4. Notify Faculty reporter
    const facultyUserId = await findFacultyUserIdByName(report.reported_by);
    await createNotificationServer({
      recipientUserId: facultyUserId || null,
      recipientRole: "faculty",
      recipientId: report.reported_by,
      department: cleanDept,
      type: "violation_decision_updated",
      title: "Violation Report Resolved",
      detail: `The violation report for ${report.student_name} (${report.student_code}) has been resolved by HOD: "${cleanRemarks.slice(0, 120)}"`,
      tone: "resolved",
      relatedId: cleanId,
      relatedType: "violation_report",
    });

    // 5. Notify Student
    const studentUserId = await findStudentUserIdByCode(report.student_code);
    if (studentUserId) {
      await createNotificationServer({
        recipientUserId: studentUserId,
        recipientRole: "student",
        recipientId: report.student_code,
        department: cleanDept,
        type: "violation_decision_updated",
        title: "Violation Report Resolved",
        detail: `Your incident report #${cleanId} has been reviewed and resolved by the Department HOD.`,
        tone: "resolved",
        relatedId: cleanId,
        relatedType: "violation_report",
      });
    }

    await db.query("COMMIT");
    return updated;
  } catch (error) {
    await db.query("ROLLBACK");
    console.error("[HOD DB Error] Error resolving violation report:", error);
    throw error;
  }
}

/**
 * Dismisses a violation report with a mandatory dismissal reason.
 * Enforces valid transition: cannot reopen resolved or dismissed cases.
 */
export async function dismissViolationReport(
  reportId: string,
  dismissalReason: string,
  hodName: string,
  hodDept: string,
): Promise<DBViolationReport> {
  const cleanId = reportId.trim();
  const cleanDept = hodDept.trim();
  const cleanReason = dismissalReason?.trim();

  if (!cleanReason) {
    throw new Error("Dismissal reason is mandatory.");
  }

  try {
    await db.query("BEGIN");

    // 1. Check current status & department ownership
    const checkQuery = `
      SELECT id, status::text, department, student_name, student_code, reported_by
      FROM violation_reports
      WHERE UPPER(id) = UPPER($1)
      LIMIT 1;
    `;
    const checkRes = await db.query(checkQuery, [cleanId]);
    const report = checkRes.rows[0];

    if (!report) {
      throw new Error(`Report with ID ${cleanId} not found.`);
    }

    if (report.department.toUpperCase() !== cleanDept.toUpperCase()) {
      throw new Error(`Department mismatch: HOD of ${cleanDept} cannot dismiss reports for ${report.department}.`);
    }

    if (report.status === "resolved" || report.status === "dismissed") {
      throw new Error(`Cannot dismiss a case that is already ${report.status}.`);
    }

    // 2. Update status to dismissed
    const updateQuery = `
      UPDATE violation_reports
      SET 
        status = 'dismissed'::violation_status,
        decision = $1,
        decision_by = $2,
        decision_at = NOW()
      WHERE UPPER(id) = UPPER($3)
      RETURNING ${HOD_VIOLATION_COLUMNS};
    `;
    const result = await db.query<DBViolationReport>(updateQuery, [
      cleanReason,
      hodName,
      cleanId,
    ]);
    const updated = result.rows[0];
    if (!updated) {
      throw new Error(`Failed to update report ${cleanId} to dismissed.`);
    }

    // 3. Log audit event
    await db.query(
      `INSERT INTO audit_logs (actor, actor_role, action, target, target_id, metadata)
       VALUES ($1, 'hod', 'violation_dismissed', 'violation_report', $2, $3);`,
      [
        hodName,
        cleanId,
        JSON.stringify({
          action: "dismiss",
          reason: cleanReason,
          student_code: report.student_code,
          department: cleanDept,
        }),
      ],
    );

    // 4. Notify Faculty reporter
    const facultyUserId = await findFacultyUserIdByName(report.reported_by);
    await createNotificationServer({
      recipientUserId: facultyUserId || null,
      recipientRole: "faculty",
      recipientId: report.reported_by,
      department: cleanDept,
      type: "violation_decision_updated",
      title: "Violation Report Dismissed",
      detail: `The violation report for ${report.student_name} (${report.student_code}) was dismissed by HOD: "${cleanReason.slice(0, 120)}"`,
      tone: "info",
      relatedId: cleanId,
      relatedType: "violation_report",
    });

    // 5. Notify Student
    const studentUserId = await findStudentUserIdByCode(report.student_code);
    if (studentUserId) {
      await createNotificationServer({
        recipientUserId: studentUserId,
        recipientRole: "student",
        recipientId: report.student_code,
        department: cleanDept,
        type: "violation_decision_updated",
        title: "Violation Report Dismissed",
        detail: `Your incident report #${cleanId} has been reviewed and dismissed by the Department HOD.`,
        tone: "info",
        relatedId: cleanId,
        relatedType: "violation_report",
      });
    }

    await db.query("COMMIT");
    return updated;
  } catch (error) {
    await db.query("ROLLBACK");
    console.error("[HOD DB Error] Error dismissing violation report:", error);
    throw error;
  }
}

/**
 * Escalates a critical violation case to Institutional Admin.
 */
export async function escalateViolationReport(
  reportId: string,
  escalationReason: string,
  hodName: string,
  hodDept: string,
): Promise<DBViolationReport> {
  const cleanId = reportId.trim();
  const cleanDept = hodDept.trim();
  const cleanReason = escalationReason?.trim();

  if (!cleanReason) {
    throw new Error("Escalation reason is mandatory.");
  }

  try {
    await db.query("BEGIN");

    // 1. Check current status & department ownership
    const checkQuery = `
      SELECT id, status::text, department, student_name, student_code, reported_by, violation_type, severity
      FROM violation_reports
      WHERE UPPER(id) = UPPER($1)
      LIMIT 1;
    `;
    const checkRes = await db.query(checkQuery, [cleanId]);
    const report = checkRes.rows[0];

    if (!report) {
      throw new Error(`Report with ID ${cleanId} not found.`);
    }

    if (report.department.toUpperCase() !== cleanDept.toUpperCase()) {
      throw new Error(`Department mismatch: HOD of ${cleanDept} cannot escalate reports for ${report.department}.`);
    }

    // 2. Update status to escalated
    const updateQuery = `
      UPDATE violation_reports
      SET 
        status = 'escalated'::violation_status,
        decision = $1,
        decision_by = $2,
        decision_at = NOW()
      WHERE UPPER(id) = UPPER($3)
      RETURNING ${HOD_VIOLATION_COLUMNS};
    `;
    const result = await db.query<DBViolationReport>(updateQuery, [
      cleanReason,
      hodName,
      cleanId,
    ]);
    const updated = result.rows[0];
    if (!updated) {
      throw new Error(`Failed to update report ${cleanId} to escalated.`);
    }

    // 3. Log audit event
    await db.query(
      `INSERT INTO audit_logs (actor, actor_role, action, target, target_id, metadata)
       VALUES ($1, 'hod', 'violation_escalated_admin', 'violation_report', $2, $3);`,
      [
        hodName,
        cleanId,
        JSON.stringify({
          action: "escalate_admin",
          reason: cleanReason,
          student_code: report.student_code,
          department: cleanDept,
        }),
      ],
    );

    // 4. Notify All Admins
    const adminIds = await findAllAdminUserIds();
    for (const adminId of adminIds) {
      await createNotificationServer({
        recipientUserId: adminId,
        recipientRole: "admin",
        department: cleanDept,
        type: "critical_incident",
        title: "Critical Incident Escalated by HOD",
        detail: `Incident #${cleanId} for ${report.student_name} (${report.student_code}) in ${cleanDept} was escalated to Admin by ${hodName}: ${cleanReason}`,
        tone: "violation",
        relatedId: cleanId,
        relatedType: "violation_report",
      });
    }

    // 5. Notify Faculty reporter
    const facultyUserId = await findFacultyUserIdByName(report.reported_by);
    await createNotificationServer({
      recipientUserId: facultyUserId || null,
      recipientRole: "faculty",
      recipientId: report.reported_by,
      department: cleanDept,
      type: "violation_decision_updated",
      title: "Violation Report Escalated to Admin",
      detail: `Your violation report for ${report.student_name} (${report.student_code}) was escalated to Institution Admin by HOD.`,
      tone: "violation",
      relatedId: cleanId,
      relatedType: "violation_report",
    });

    // 6. Notify Student
    const studentUserId = await findStudentUserIdByCode(report.student_code);
    if (studentUserId) {
      await createNotificationServer({
        recipientUserId: studentUserId,
        recipientRole: "student",
        recipientId: report.student_code,
        department: cleanDept,
        type: "violation_decision_updated",
        title: "Incident Escalated to Institutional Administration",
        detail: `Incident #${cleanId} has been escalated by your Department HOD for Institutional Disciplinary Committee review.`,
        tone: "violation",
        relatedId: cleanId,
        relatedType: "violation_report",
      });
    }

    await db.query("COMMIT");
    return updated;
  } catch (error) {
    await db.query("ROLLBACK");
    console.error("[HOD DB Error] Error escalating violation report:", error);
    throw error;
  }
}

/**
 * Legacy alias for submitHodDecision
 */
export async function submitHodDecision(
  reportId: string,
  decision: "exonerated" | "warned" | "escalated",
  decisionText: string,
  hodName: string,
  hodDept: string,
): Promise<DBViolationReport> {
  if (decision === "escalated") {
    return escalateViolationReport(reportId, decisionText || "Escalated", hodName, hodDept);
  }
  return resolveViolationReport(reportId, decisionText || `Decision: ${decision}`, hodName, hodDept);
}

/**
 * Retrieves chronological audit history for a specific violation report.
 */
export async function getViolationAuditHistory(
  reportId: string,
): Promise<{ id: string; actor: string; actorRole: string; action: string; metadata: any; timestamp: string }[]> {
  const cleanId = reportId.trim();
  if (!cleanId) return [];

  try {
    const query = `
      SELECT id, actor, actor_role AS "actorRole", action, metadata, timestamp::text
      FROM audit_logs
      WHERE target_id = $1 OR target = $1
      ORDER BY timestamp ASC;
    `;
    const res = await db.query(query, [cleanId]);
    return res.rows;
  } catch (err) {
    console.error("[HOD DB Error] Error fetching violation audit history:", err);
    return [];
  }
}

/**
 * Fetches active cases queue for a specific HOD department from PostgreSQL.
 * Department isolation: HOD will ONLY see cases belonging to their department.
 */
export async function getHodCases(department: string): Promise<DBViolationReport[]> {
  return getHodViolationReports(department);
}

/**
 * Fetches a single violation report by ID, verifying department isolation.
 */
export async function getHodCaseById(
  reportId: string,
  department?: string,
): Promise<DBViolationReport | null> {
  return getHodViolationReportById(reportId, department || "");
}

/**
 * Submits a student explanation for a violation case using an atomic transaction.
 * Verifies that the student_code matches the case owner.
 */
export async function submitStudentExplanation(
  reportId: string,
  studentCode: string,
  explanation: string,
  evidence?: string,
): Promise<DBViolationReport> {
  const cleanId = reportId.trim();
  const cleanCode = studentCode.trim().toUpperCase();
  const cleanEvidence = evidence?.trim() || null;

  try {
    await db.query("BEGIN");

    // 1. Update explanation, evidence and status to explanation_submitted
    const updateQuery = `
      UPDATE violation_reports
      SET
        explanation = $1,
        evidence = COALESCE($2, evidence),
        explanation_submitted_at = NOW(),
        status = 'explanation_submitted'::violation_status
      WHERE UPPER(id) = UPPER($3)
        AND UPPER(student_code) = UPPER($4)
      RETURNING
        id, student_code, student_name, department, year_section, class_name,
        scheduled_time, room, incident_time, location, remarks, evidence, reported_by, status,
        explanation, explanation_submitted_at::text, decision, decision_by, decision_at::text,
        semester, explanation_deadline::text, created_at::text;
    `;

    const result = await db.query<DBViolationReport>(updateQuery, [
      explanation.trim(),
      cleanEvidence,
      cleanId,
      cleanCode,
    ]);

    const updatedReport = result.rows[0];
    if (!updatedReport) {
      throw new Error(`Case ${cleanId} not found or does not belong to student ${cleanCode}.`);
    }

    // 2. Insert Audit Log entry (Atomic)
    const auditQuery = `
      INSERT INTO audit_logs (
        actor,
        actor_role,
        action,
        target,
        target_id,
        metadata
      ) VALUES ($1, 'student', 'student_explanation_submitted', 'violation_report', $2, $3);
    `;

    const metadata = JSON.stringify({
      student_code: cleanCode,
      explanation_length: explanation.length,
      evidence: cleanEvidence,
    });

    await db.query(auditQuery, [cleanCode, cleanId, metadata]);

    // 3. Notify the HOD of the student's department (server-side resolution)
    const hodUserId = await findHodUserIdForStudentCode(cleanCode);
    if (hodUserId) {
      await createNotificationServer({
        recipientUserId: hodUserId,
        recipientRole: "hod",
        department: updatedReport.department,
        type: "student_explanation_submitted",
        title: "Student Explanation Submitted",
        detail: `${updatedReport.student_name} (${updatedReport.student_code}) has submitted an explanation for violation case #${cleanId}.`,
        tone: "info",
        relatedId: cleanId,
        relatedType: "violation_report",
      });
    }

    await db.query("COMMIT");
    return updatedReport;
  } catch (error) {
    await db.query("ROLLBACK");
    console.error("[HOD DB Error] Error submitting student explanation:", error);
    throw new Error("Failed to record student explanation in database.");
  }
}

/**
 * Calculates real HOD dashboard statistics from PostgreSQL violation_reports table.
 */
export async function getHodDashboardStats(department: string): Promise<HODDashboardStats> {
  const cleanDept = department.trim();

  try {
    const query = `
      SELECT
        COUNT(*) FILTER (WHERE status IN ('reported', 'notified', 'awaiting_explanation', 'explanation_submitted', 'under_review'))::int AS pending_cases,
        COUNT(*) FILTER (WHERE status = 'awaiting_explanation')::int AS awaiting_explanation,
        COUNT(*) FILTER (WHERE status = 'under_review')::int AS under_review,
        COUNT(*) FILTER (WHERE status = 'exonerated')::int AS exonerated,
        COUNT(*) FILTER (WHERE status = 'warned')::int AS warnings,
        COUNT(*) FILTER (WHERE status = 'escalated')::int AS escalated,
        COUNT(*)::int AS total_cases,
        COUNT(*)::int AS total_reports,
        COUNT(*) FILTER (WHERE status IN ('reported', 'notified', 'awaiting_explanation', 'explanation_submitted'))::int AS new_reports,
        COUNT(*) FILTER (WHERE severity = 'High')::int AS high_severity,
        COUNT(*) FILTER (WHERE severity = 'Critical')::int AS critical_incidents,
        COUNT(*) FILTER (WHERE violation_type ILIKE '%Violence%' OR violation_type ILIKE '%Physical Altercation%')::int AS violence_reports,
        COUNT(*) FILTER (WHERE status IN ('resolved', 'exonerated', 'warned'))::int AS resolved,
        COUNT(*) FILTER (WHERE status = 'dismissed')::int AS dismissed
      FROM violation_reports
      WHERE UPPER(department) = UPPER($1);
    `;

    const result = await db.query<{
      pending_cases: number;
      awaiting_explanation: number;
      under_review: number;
      exonerated: number;
      warnings: number;
      escalated: number;
      total_cases: number;
      total_reports: number;
      new_reports: number;
      high_severity: number;
      critical_incidents: number;
      violence_reports: number;
      resolved: number;
      dismissed: number;
    }>(query, [cleanDept]);

    const row = result.rows[0];
    return {
      pendingCases: row?.pending_cases ?? 0,
      awaitingExplanation: row?.awaiting_explanation ?? 0,
      underReview: row?.under_review ?? 0,
      exonerated: row?.exonerated ?? 0,
      warnings: row?.warnings ?? 0,
      escalated: row?.escalated ?? 0,
      totalCases: row?.total_cases ?? 0,
      totalReports: row?.total_reports ?? 0,
      newReports: row?.new_reports ?? 0,
      highSeverity: row?.high_severity ?? 0,
      criticalIncidents: row?.critical_incidents ?? 0,
      violenceReports: row?.violence_reports ?? 0,
      resolved: row?.resolved ?? 0,
      dismissed: row?.dismissed ?? 0,
    };
  } catch (error) {
    console.error("[HOD DB Error] Error in getHodDashboardStats:", error);
    throw new Error("Failed to calculate HOD dashboard statistics.");
  }
}

/**
 * Retrieves student records specifically for the HOD's department.
 */
export async function getHodStudents(department: string): Promise<
  {
    id: string;
    name: string;
    studentCode: string;
    department: string;
    year: string;
    section: string;
    semester: number;
  }[]
> {
  const cleanDept = department.trim();

  try {
    const query = `
      SELECT
        student_code AS id,
        name,
        student_code AS "studentCode",
        department,
        year,
        section,
        semester
      FROM students
      WHERE UPPER(department) = UPPER($1)
      ORDER BY name ASC;
    `;

    const res = await db.query<{
      id: string;
      name: string;
      studentCode: string;
      department: string;
      year: string;
      section: string;
      semester: number;
    }>(query, [cleanDept]);

    return res.rows;
  } catch (error) {
    console.error("[HOD DB Error] Error in getHodStudents:", error);
    throw new Error("Failed to query department student records.");
  }
}

export type DBHodMovementPass = {
  id: string;
  student_code: string;
  student_name: string;
  department: string;
  year: string;
  section: string;
  reason: string;
  date: string;
  valid_from: string;
  valid_until: string;
  status: "pending" | "approved" | "rejected";
  issued_by: string;
  target_role?: string;
  exit_at: string | null;
  entry_at: string | null;
  checkpoint: string | null;
  verified_by: string | null;
  created_at: string;
};

/**
 * Retrieves all movement pass requests for students in the HOD's department.
 */
export async function getHodMovementPasses(department: string): Promise<DBHodMovementPass[]> {
  const cleanDept = department.trim();
  if (!cleanDept) return [];

  try {
    const query = `
      SELECT
        mp.id::text,
        mp.student_code,
        COALESCE(s.name, mp.student_code) AS student_name,
        COALESCE(s.department, $1) AS department,
        COALESCE(s.year, 'Unknown') AS year,
        COALESCE(s.section, 'A') AS section,
        mp.reason,
        to_char(mp.date, 'YYYY-MM-DD') AS date,
        mp.valid_from::text,
        mp.valid_until::text,
        mp.status,
        mp.issued_by,
        COALESCE(mp.target_role, 'hod')::text AS target_role,
        mp.exit_at::text,
        mp.entry_at::text,
        mp.checkpoint,
        mp.verified_by,
        mp.created_at::text
      FROM movement_permissions mp
      LEFT JOIN students s ON UPPER(s.student_code) = UPPER(mp.student_code)
      WHERE UPPER(s.department) = UPPER($1) OR UPPER(mp.issued_by) LIKE UPPER($2)
      ORDER BY mp.created_at DESC;
    `;

    const res = await db.query<DBHodMovementPass>(query, [cleanDept, `%${cleanDept}%`]);
    return res.rows;
  } catch (error) {
    console.error("[HOD DB Error] Error in getHodMovementPasses:", error);
    throw new Error("Failed to query departmental movement passes.");
  }
}

/**
 * HOD: Approves or rejects a student's movement pass with strict department verification,
 * atomic audit log recording (movement_pass_approved / movement_pass_rejected), and student notification.
 */
export async function approveHodMovementPass(
  passId: string,
  newStatus: "approved" | "rejected",
  hodName: string,
  hodEmail: string,
  hodDept: string,
  rejectionReason?: string
): Promise<DBHodMovementPass> {
  const cleanId = passId.trim();
  const cleanDept = hodDept.trim();

  try {
    await db.query("BEGIN");

    // 1. Fetch pass and verify departmental ownership
    const passCheckQuery = `
      SELECT mp.id, mp.student_code, mp.reason, to_char(mp.date, 'YYYY-MM-DD') AS date,
             mp.valid_from::text, mp.valid_until::text, mp.status, s.department, s.name AS student_name
      FROM movement_permissions mp
      LEFT JOIN students s ON UPPER(s.student_code) = UPPER(mp.student_code)
      WHERE mp.id::text = $1
      LIMIT 1;
    `;
    const checkRes = await db.query(passCheckQuery, [cleanId]);
    if (checkRes.rows.length === 0) {
      throw new Error(`Movement pass with ID ${cleanId} not found.`);
    }

    const currentPass = checkRes.rows[0];
    if (cleanDept && currentPass.department && currentPass.department.toUpperCase() !== cleanDept.toUpperCase()) {
      throw new Error(`Department mismatch: HOD of ${cleanDept} cannot approve passes for ${currentPass.department}.`);
    }

    const approverLabel = `HOD (${hodName})`;

    // 2. Update status
    const updateQuery = `
      UPDATE movement_permissions
      SET status = $1, issued_by = $2
      WHERE id::text = $3
      RETURNING
        id::text,
        student_code,
        reason,
        to_char(date, 'YYYY-MM-DD') AS date,
        valid_from::text,
        valid_until::text,
        status,
        issued_by,
        exit_at::text,
        entry_at::text,
        checkpoint,
        verified_by,
        created_at::text;
    `;
    const updateRes = await db.query(updateQuery, [newStatus, approverLabel, cleanId]);
    const updated = updateRes.rows[0];

    // 3. Record Audit Log
    const actionName = newStatus === "approved" ? "movement_pass_approved" : "movement_pass_rejected";
    const auditQuery = `
      INSERT INTO audit_logs (
        actor,
        actor_role,
        action,
        target,
        target_id,
        metadata
      ) VALUES ($1, 'hod', $2, $3, $4, $5);
    `;
    const auditMetadata = JSON.stringify({
      pass_id: cleanId,
      student_code: updated.student_code,
      student_name: currentPass.student_name,
      department: currentPass.department,
      status: newStatus,
      approver_name: hodName,
      approver_email: hodEmail,
      date: updated.date,
      valid_from: updated.valid_from,
      valid_until: updated.valid_until,
      rejection_reason: rejectionReason || null,
    });

    await db.query(auditQuery, [hodEmail, actionName, updated.student_code, cleanId, auditMetadata]);

    // 4. Send Student Notification
    const studentUserId = await findStudentUserIdByCode(updated.student_code);
    if (studentUserId) {
      const isApproved = newStatus === "approved";
      await createNotificationServer({
        recipientUserId: studentUserId,
        recipientRole: "student",
        recipientId: updated.student_code,
        department: currentPass.department,
        type: isApproved ? "gate_pass_approved" : "gate_pass_rejected",
        title: isApproved ? "Movement Pass Approved" : "Movement Pass Rejected",
        detail: isApproved
          ? `Your movement pass (${cleanId.slice(0, 8)}) for ${updated.date} (${updated.valid_from} - ${updated.valid_until}) has been approved by HOD ${hodName}.`
          : `Your movement pass has been rejected by HOD ${hodName}.${rejectionReason ? ` Reason: ${rejectionReason}` : ""}`,
        tone: isApproved ? "resolved" : "violation",
        relatedId: cleanId,
        relatedType: "movement_permission",
      });
    }

    // 5. Generate QR pass on approval or revoke if rejected
    try {
      const { getOrCreateQRPassForMovementPermission, revokeQRPassByPermission } = await import("./qr.server");
      if (newStatus === "approved") {
        const validFromIso = new Date().toISOString();
        const validUntilIso = new Date(Date.now() + 86400000).toISOString();
        await getOrCreateQRPassForMovementPermission(cleanId, validFromIso, validUntilIso);
      } else {
        await revokeQRPassByPermission("NORMAL_MOVEMENT", cleanId);
      }
    } catch (qrErr) {
      console.warn("[QR Notice] Failed to update QR pass status on HOD decision:", qrErr);
    }

    await db.query("COMMIT");

    return {
      ...updated,
      student_name: currentPass.student_name || updated.student_code,
      department: currentPass.department || cleanDept,
      year: "3rd Year",
      section: "A",
    };
  } catch (error) {
    await db.query("ROLLBACK").catch(() => {});
    console.error("[HOD DB Error] Error approving movement permission:", error);
    throw error;
  }
}

