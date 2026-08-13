import { db } from "../db.server";
import type { DBViolationReport } from "./violations.server";

export type HODDashboardStats = {
  pendingCases: number;
  awaitingExplanation: number;
  underReview: number;
  exonerated: number;
  warnings: number;
  escalated: number;
  totalCases: number;
};

/**
 * Fetches active cases queue for a specific HOD department from PostgreSQL.
 * Department isolation: HOD will ONLY see cases belonging to their department.
 */
export async function getHodCases(department: string): Promise<DBViolationReport[]> {
  const cleanDept = department.trim();
  if (!cleanDept) return [];

  try {
    const query = `
      SELECT
        id, student_code, student_name, department, year_section, class_name,
        scheduled_time, room, incident_time, location, remarks, evidence, reported_by, status,
        explanation, explanation_submitted_at::text, decision, decision_by, decision_at::text,
        semester, explanation_deadline::text, created_at::text
      FROM violation_reports
      WHERE UPPER(department) = UPPER($1)
        AND status IN ('reported', 'notified', 'awaiting_explanation', 'explanation_submitted', 'under_review')
      ORDER BY created_at DESC;
    `;

    const result = await db.query<DBViolationReport>(query, [cleanDept]);
    return result.rows;
  } catch (error) {
    console.error("[HOD DB Error] Error in getHodCases:", error);
    throw new Error("Failed to query department cases from database.");
  }
}

/**
 * Fetches a single violation report by ID, verifying department isolation.
 */
export async function getHodCaseById(
  reportId: string,
  department?: string,
): Promise<DBViolationReport | null> {
  const cleanId = reportId.trim();
  const cleanDept = department?.trim();
  if (!cleanId) return null;

  try {
    const query = `
      SELECT
        id, student_code, student_name, department, year_section, class_name,
        scheduled_time, room, incident_time, location, remarks, evidence, reported_by, status,
        explanation, explanation_submitted_at::text, decision, decision_by, decision_at::text,
        semester, explanation_deadline::text, created_at::text
      FROM violation_reports
      WHERE UPPER(id) = UPPER($1)
        AND ($2::text IS NULL OR UPPER(department) = UPPER($2::text))
      LIMIT 1;
    `;

    const result = await db.query<DBViolationReport>(query, [cleanId, cleanDept || null]);
    return result.rows[0] ?? null;
  } catch (error) {
    console.error("[HOD DB Error] Error in getHodCaseById:", error);
    throw new Error("Failed to query case details from database.");
  }
}

/**
 * Submits an HOD decision for a violation case using an atomic transaction.
 * Updates violation_reports status, decision text, decision_by, decision_at,
 * and inserts an audit log entry into audit_logs.
 */
export async function submitHodDecision(
  reportId: string,
  decision: "exonerated" | "warned" | "escalated",
  decisionText: string,
  hodName: string,
  hodDept: string,
): Promise<DBViolationReport> {
  const cleanId = reportId.trim();
  const cleanDept = hodDept.trim();

  try {
    await db.query("BEGIN");

    // 1. Update violation_reports with department isolation verification
    const updateQuery = `
      UPDATE violation_reports
      SET
        status = $1::violation_status,
        decision = $2,
        decision_by = $3,
        decision_at = NOW()
      WHERE UPPER(id) = UPPER($4)
        AND UPPER(department) = UPPER($5)
      RETURNING *;
    `;

    const result = await db.query<DBViolationReport>(updateQuery, [
      decision,
      decisionText || `Decision: ${decision}`,
      hodName,
      cleanId,
      cleanDept,
    ]);

    const updatedReport = result.rows[0];
    if (!updatedReport) {
      throw new Error(`Case ${cleanId} not found or unauthorized for department ${cleanDept}.`);
    }

    // 2. Insert Audit Log entry (Atomic with decision update)
    const auditAction = `hod_decision_${decision}`;
    const auditQuery = `
      INSERT INTO audit_logs (
        actor,
        actor_role,
        action,
        target,
        target_id,
        metadata
      ) VALUES ($1, 'hod', $2, 'violation_report', $3, $4);
    `;

    const metadata = JSON.stringify({
      decision,
      status: decision,
      decision_text: decisionText,
      student_code: updatedReport.student_code,
      department: updatedReport.department,
    });

    await db.query(auditQuery, [hodName, auditAction, cleanId, metadata]);

    // 3. Create Notification for Student (Atomic)
    const notifQuery = `
      INSERT INTO notifications (recipient_role, department, title, detail, tone, related_report_id)
      VALUES ('student', $1, $2, $3, $4, $5);
    `;
    const notifTitle = `HOD Decision Recorded for Case ${cleanId}`;
    const notifDetail = `HOD ${hodName} recorded decision (${decision.toUpperCase()}) for your incident in ${updatedReport.class_name}.`;
    const notifTone = decision === "exonerated" ? "resolved" : "violation";

    await db.query(notifQuery, [
      updatedReport.department,
      notifTitle,
      notifDetail,
      notifTone,
      cleanId,
    ]);

    await db.query("COMMIT");
    return updatedReport;
  } catch (error) {
    await db.query("ROLLBACK");
    console.error("[HOD DB Error] Error submitting HOD decision:", error);
    throw new Error("Failed to record HOD decision in database.");
  }
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

    // 3. Create Notification for Department HOD (Atomic)
    const notifQuery = `
      INSERT INTO notifications (recipient_role, department, title, detail, tone, related_report_id)
      VALUES ('hod', $1, $2, $3, 'info', $4);
    `;
    const notifTitle = `Student Explanation Submitted for Case ${cleanId}`;
    const notifDetail = `Student ${updatedReport.student_name} (${updatedReport.student_code}) submitted explanation and evidence for ${updatedReport.class_name}.`;

    await db.query(notifQuery, [updatedReport.department, notifTitle, notifDetail, cleanId]);

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
        COUNT(*)::int AS total_cases
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
