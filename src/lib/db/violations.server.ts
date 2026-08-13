import { db } from "../db.server";

export type DBViolationReport = {
  id: string;
  student_code: string;
  student_name: string;
  department: string;
  year_section: string;
  class_name: string;
  scheduled_time: string;
  room: string;
  incident_time: string;
  location: string;
  remarks: string;
  evidence: string | null;
  reported_by: string;
  status: string;
  explanation: string | null;
  explanation_submitted_at: string | null;
  decision: string | null;
  decision_by: string | null;
  decision_at: string | null;
  semester: number;
  explanation_deadline: string;
  created_at: string;
};

export type NewViolationReportInput = {
  studentCode: string;
  studentName: string;
  department: string;
  yearSection: string;
  className: string;
  scheduledTime: string;
  room: string;
  incidentTime: string;
  location: string;
  remarks: string;
  evidence?: string | null;
  reportedBy: string;
  semester?: number;
};

/**
 * Creates a new violation report record in PostgreSQL database.
 * Automatically inserts an audit log entry into audit_logs.
 */
export async function createViolationReport(
  input: NewViolationReportInput,
): Promise<DBViolationReport> {
  const cleanCode = input.studentCode.trim().toUpperCase();
  const reportId = `RPT-${Date.now().toString().slice(-6)}`;

  try {
    await db.query("BEGIN");

    // 1. Resolve student department from PostgreSQL DB (Requirement 4: Server resolves studentCode -> students.department)
    const stQuery = `SELECT department FROM students WHERE UPPER(student_code) = UPPER($1) LIMIT 1;`;
    const stRes = await db.query<{ department: string }>(stQuery, [cleanCode]);
    const resolvedDepartment = stRes.rows[0]?.department || input.department;

    const insertQuery = `
      INSERT INTO violation_reports (
        id,
        student_code,
        student_name,
        department,
        year_section,
        class_name,
        scheduled_time,
        room,
        incident_time,
        location,
        remarks,
        evidence,
        reported_by,
        status,
        semester,
        explanation_deadline
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'reported', $14, (now() + INTERVAL '24 hours')
      )
      RETURNING *;
    `;

    const values = [
      reportId,
      cleanCode,
      input.studentName,
      resolvedDepartment,
      input.yearSection,
      input.className,
      input.scheduledTime,
      input.room,
      input.incidentTime,
      input.location,
      input.remarks,
      input.evidence ?? null,
      input.reportedBy,
      input.semester ?? 6,
    ];

    const result = await db.query<DBViolationReport>(insertQuery, values);
    const report = result.rows[0];

    if (!report) {
      throw new Error("Failed to insert violation report.");
    }

    // 2. Insert Audit Log entry into audit_logs
    const auditQuery = `
      INSERT INTO audit_logs (
        actor,
        actor_role,
        action,
        target,
        target_id,
        metadata
      ) VALUES ($1, 'faculty', 'violation_report_created', 'violation_report', $2, $3);
    `;

    const metadata = JSON.stringify({
      student_code: cleanCode,
      student_name: input.studentName,
      location: input.location,
      department: resolvedDepartment,
    });

    await db.query(auditQuery, [input.reportedBy, reportId, metadata]);

    // 3. Insert Department-Specific HOD Notification into notifications table (Requirement 8)
    const hodNotifQuery = `
      INSERT INTO notifications (
        recipient_role,
        department,
        title,
        detail,
        tone,
        related_report_id
      ) VALUES ('hod', $1, 'New Violation Case', $2, 'pending', $3);
    `;
    const notifDetail = `${input.studentName} (${cleanCode}) reported by ${input.reportedBy} at ${input.location}.`;
    await db.query(hodNotifQuery, [resolvedDepartment, notifDetail, reportId]);

    // 4. Insert Student Notification into notifications table
    const studentNotifQuery = `
      INSERT INTO notifications (
        recipient_role,
        recipient_id,
        department,
        title,
        detail,
        tone,
        related_report_id
      ) VALUES ('student', $1, $2, 'Violation Reported', $3, 'violation', $4);
    `;
    const studentNotifDetail = `Violation report logged for ${input.className}. Submit explanation within 24 hours.`;
    await db.query(studentNotifQuery, [
      cleanCode,
      resolvedDepartment,
      studentNotifDetail,
      reportId,
    ]);

    await db.query("COMMIT");
    return report;
  } catch (error) {
    await db.query("ROLLBACK");
    console.error("[Database Error] Error creating violation report:", error);
    throw new Error("Failed to submit violation report to PostgreSQL.");
  }
}

/**
 * Retrieves all violation reports created by a specific Faculty member.
 */
export async function getFacultyReports(facultyName: string): Promise<DBViolationReport[]> {
  const cleanName = facultyName.trim();
  if (!cleanName) return [];

  try {
    const query = `
      SELECT
        id,
        student_code,
        student_name,
        department,
        year_section,
        class_name,
        scheduled_time,
        room,
        incident_time,
        location,
        remarks,
        evidence,
        reported_by,
        status,
        explanation,
        explanation_submitted_at::text,
        decision,
        decision_by,
        decision_at::text,
        semester,
        explanation_deadline::text,
        created_at::text
      FROM violation_reports
      WHERE LOWER(reported_by) = LOWER($1)
      ORDER BY created_at DESC;
    `;

    const result = await db.query<DBViolationReport>(query, [cleanName]);
    return result.rows;
  } catch (error) {
    console.error("[Database Error] Error fetching faculty violation reports:", error);
    throw new Error("Failed to query faculty violation reports.");
  }
}

/**
 * Retrieves all violation reports for an HOD's department (or all reports if unspecified).
 */
export async function getHodReports(department?: string): Promise<DBViolationReport[]> {
  const cleanDept = department?.trim();

  try {
    let query: string;
    let params: any[] = [];

    const cols = `id, student_code, student_name, department, year_section, class_name,
        scheduled_time, room, incident_time, location, remarks, evidence, reported_by, status,
        explanation, explanation_submitted_at::text, decision, decision_by, decision_at::text,
        semester, explanation_deadline::text, created_at::text`;
    if (cleanDept) {
      query = `
        SELECT ${cols}
        FROM violation_reports
        WHERE UPPER(department) = UPPER($1)
        ORDER BY created_at DESC;
      `;
      params = [cleanDept];
    } else {
      query = `
        SELECT ${cols}
        FROM violation_reports
        ORDER BY created_at DESC;
      `;
    }

    const result = await db.query<DBViolationReport>(query, params);
    return result.rows;
  } catch (error) {
    console.error("[Database Error] Error fetching HOD department reports:", error);
    throw new Error("Failed to query HOD department violation reports.");
  }
}

/**
 * Retrieves a single violation report by report ID.
 */
export async function getViolationReportById(reportId: string): Promise<DBViolationReport | null> {
  const cleanId = reportId.trim();
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
      LIMIT 1;
    `;

    const result = await db.query<DBViolationReport>(query, [cleanId]);
    return result.rows[0] ?? null;
  } catch (error) {
    console.error("[Database Error] Error fetching violation report by ID:", error);
    throw new Error("Failed to query violation report by ID.");
  }
}

/**
 * Submits an HOD decision for a case, updating status and adding an audit log.
 */
export async function submitHodDecision(
  reportId: string,
  decision: "exonerate" | "warning" | "escalate",
  remarks: string,
  hodName: string,
): Promise<DBViolationReport> {
  const cleanId = reportId.trim();

  const statusMap: Record<typeof decision, string> = {
    exonerate: "exonerated",
    warning: "warned",
    escalate: "escalated",
  };

  const statusValue = statusMap[decision] || "under_review";

  try {
    await db.query("BEGIN");

    const updateQuery = `
      UPDATE violation_reports
      SET
        status = $1::violation_status,
        decision = $2,
        decision_by = $3,
        decision_at = NOW()
      WHERE UPPER(id) = UPPER($4)
      RETURNING *;
    `;

    const result = await db.query<DBViolationReport>(updateQuery, [
      statusValue,
      remarks || `Decision executed: ${decision}`,
      hodName,
      cleanId,
    ]);

    const updatedReport = result.rows[0];
    if (!updatedReport) {
      throw new Error(`Report ${cleanId} not found.`);
    }

    // Insert Audit Log entry
    const auditQuery = `
      INSERT INTO audit_logs (
        actor,
        actor_role,
        action,
        target,
        target_id,
        metadata
      ) VALUES ($1, 'hod', 'hod_decision_executed', 'violation_report', $2, $3);
    `;

    const metadata = JSON.stringify({
      decision,
      status: statusValue,
      remarks,
      student_code: updatedReport.student_code,
    });

    await db.query(auditQuery, [hodName, cleanId, metadata]);

    await db.query("COMMIT");
    return updatedReport;
  } catch (error) {
    await db.query("ROLLBACK");
    console.error("[Database Error] Error recording HOD decision:", error);
    throw new Error("Failed to record HOD decision in database.");
  }
}

/**
 * Submits a student explanation for a case, updating status and adding an audit log.
 */
export async function submitStudentExplanation(
  reportId: string,
  explanation: string,
  studentCode: string,
): Promise<DBViolationReport> {
  const cleanId = reportId.trim();
  const cleanCode = studentCode.trim().toUpperCase();

  try {
    await db.query("BEGIN");

    const updateQuery = `
      UPDATE violation_reports
      SET
        explanation = $1,
        explanation_submitted_at = NOW(),
        status = 'explanation_submitted'::violation_status
      WHERE UPPER(id) = UPPER($2)
      RETURNING *;
    `;

    const result = await db.query<DBViolationReport>(updateQuery, [explanation.trim(), cleanId]);

    const updatedReport = result.rows[0];
    if (!updatedReport) {
      throw new Error(`Report ${cleanId} not found.`);
    }

    // Insert Audit Log entry
    const auditQuery = `
      INSERT INTO audit_logs (
        actor,
        actor_role,
        action,
        target,
        target_id,
        metadata
      ) VALUES ($1, 'student', 'explanation_submitted', 'violation_report', $2, $3);
    `;

    const metadata = JSON.stringify({
      student_code: cleanCode,
      explanation_length: explanation.length,
    });

    await db.query(auditQuery, [cleanCode || updatedReport.student_code, cleanId, metadata]);

    await db.query("COMMIT");
    return updatedReport;
  } catch (error) {
    await db.query("ROLLBACK");
    console.error("[Database Error] Error submitting student explanation:", error);
    throw new Error("Failed to save student explanation in database.");
  }
}
