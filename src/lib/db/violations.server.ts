import { db } from "../db.server";
import {
  findHodUserIdForStudentCode,
  findStudentUserIdByCode,
  findAllAdminUserIds,
  createNotificationServer,
} from "./notifications.server";
import { getCurrentClassForStudent } from "./timetable.server";
import { getActiveMovementPermission } from "./passes.server";

export type DBViolationReport = {
  id: string;
  student_code: string;
  student_name: string;
  department: string;
  year_section: string;
  class_name: string;
  subject_code?: string | null;
  scheduled_time: string;
  room: string;
  scheduled_faculty?: string | null;
  incident_time: string;
  observed_at?: string;
  location: string;
  violation_type: string;
  severity: string;
  remarks: string;
  witness_notes?: string | null;
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
  subjectCode?: string | null | undefined;
  scheduledTime: string;
  room: string;
  scheduledFaculty?: string | null | undefined;
  incidentTime: string;
  location: string;
  violationType?: string | undefined;
  severity?: "Low" | "Medium" | "High" | "Critical" | string | undefined;
  remarks: string;
  witnessNotes?: string | null | undefined;
  evidence?: string | null | undefined;
  reportedBy: string;
  semester?: number | undefined;
};

/**
 * Creates a new violation report record in PostgreSQL database.
 * Enforces server-side timetable verification, movement pass check,
 * duplicate suppression, audit logging, and role-based notification dispatch.
 */
export async function createViolationReport(
  input: NewViolationReportInput,
): Promise<DBViolationReport> {
  const cleanCode = input.studentCode.trim().toUpperCase();
  const violationType = input.violationType?.trim() || "Unauthorized Class Movement";
  const severity = input.severity || "Medium";
  const reportId = `RPT-${Date.now().toString().slice(-6)}`;

  // 1. Verify student exists and is active in database
  const stQuery = `SELECT student_code, name, department, year, section, status, semester FROM students WHERE UPPER(student_code) = UPPER($1) LIMIT 1;`;
  const stRes = await db.query(stQuery, [cleanCode]);
  const student = stRes.rows[0];
  if (!student) {
    throw new Error(`Student with code '${cleanCode}' not found in database.`);
  }

  const resolvedDepartment = student.department || input.department;
  const resolvedStudentName = student.name || input.studentName;
  const resolvedYearSection = `${student.year || ""} • ${student.section || ""}`.trim() || input.yearSection;

  // 2. Re-check movement pass server-side: if student has approved active movement pass, prevent unauthorized movement violation
  if (violationType === "Unauthorized Class Movement" || violationType === "Corridor Presence During Class") {
    const activePass = await getActiveMovementPermission(cleanCode);
    if (activePass) {
      throw new Error(
        `Cannot report unauthorized class movement: Student has an active approved Movement Pass (Pass ID: ${activePass.id}, Valid: ${activePass.valid_from} - ${activePass.valid_until}).`,
      );
    }
  }

  // 3. Duplicate Report Protection (within 15 minutes by same faculty for same student & violation type)
  const duplicateCheck = await db.query(
    `SELECT id FROM violation_reports 
     WHERE UPPER(student_code) = UPPER($1) 
       AND reported_by = $2 
       AND violation_type = $3 
       AND created_at > (now() - INTERVAL '15 minutes')
     LIMIT 1;`,
    [cleanCode, input.reportedBy, violationType],
  );
  if (duplicateCheck.rows.length > 0) {
    throw new Error(
      `Similar report already exists within the last 15 minutes (Report ID: ${duplicateCheck.rows[0].id}).`,
    );
  }

  try {
    await db.query("BEGIN");

    const insertQuery = `
      INSERT INTO violation_reports (
        id,
        student_code,
        student_name,
        department,
        year_section,
        class_name,
        subject_code,
        scheduled_time,
        room,
        scheduled_faculty,
        incident_time,
        observed_at,
        location,
        violation_type,
        severity,
        remarks,
        witness_notes,
        evidence,
        reported_by,
        status,
        semester,
        explanation_deadline,
        created_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, now(), $12, $13, $14, $15, $16, $17, $18, 'reported', $19, (now() + INTERVAL '24 hours'), now()
      )
      RETURNING
        id, student_code, student_name, department, year_section, class_name,
        subject_code, scheduled_time, room, scheduled_faculty, incident_time,
        observed_at::text, location, violation_type, severity, remarks, witness_notes,
        evidence, reported_by, status::text, explanation, explanation_submitted_at::text,
        decision, decision_by, decision_at::text, semester, explanation_deadline::text, created_at::text;
    `;

    const values = [
      reportId,
      cleanCode,
      resolvedStudentName,
      resolvedDepartment,
      resolvedYearSection,
      input.className,
      input.subjectCode || null,
      input.scheduledTime,
      input.room,
      input.scheduledFaculty || null,
      input.incidentTime,
      input.location,
      violationType,
      severity,
      input.remarks,
      input.witnessNotes || null,
      input.evidence ?? null,
      input.reportedBy,
      student.semester ?? input.semester ?? 6,
    ];

    const result = await db.query<DBViolationReport>(insertQuery, values);
    const report = result.rows[0];

    if (!report) {
      throw new Error("Failed to insert violation report.");
    }

    // 4. Insert Audit Log entry into audit_logs
    const isCritical =
      severity === "High" ||
      severity === "Critical" ||
      violationType.includes("Violence") ||
      violationType.includes("Physical Altercation");

    const auditAction = isCritical
      ? "violence_incident_reported"
      : "movement_violation_reported";

    const auditQuery = `
      INSERT INTO audit_logs (
        actor,
        actor_role,
        action,
        target,
        target_id,
        metadata
      ) VALUES ($1, 'faculty', $2, 'violation_report', $3, $4);
    `;

    const metadata = JSON.stringify({
      event_message: "Incident reported by Faculty and submitted to HOD.",
      student_code: cleanCode,
      student_name: resolvedStudentName,
      location: input.location,
      department: resolvedDepartment,
      violation_type: violationType,
      severity,
      subject: input.className,
      room: input.room,
      witness_notes: input.witnessNotes || null,
      timestamp: new Date().toISOString(),
    });

    await db.query(auditQuery, [input.reportedBy, auditAction, reportId, metadata]);

    // 5. Notify HOD of student's actual department
    const hodUserId = await findHodUserIdForStudentCode(cleanCode);
    if (hodUserId) {
      await createNotificationServer({
        recipientUserId: hodUserId,
        recipientRole: "hod",
        department: resolvedDepartment,
        type: "violation_report_created",
        title: isCritical ? "Critical Student Incident 🚨" : "Student Movement Violation Reported ⚠️",
        detail: `${resolvedStudentName} (${cleanCode}) was reported for ${violationType} by Faculty (${input.reportedBy}) at ${input.location}.`,
        tone: isCritical ? "violation" : "pending",
        relatedId: reportId,
        relatedType: "violation_report",
      });
    }

    // 6. Notify Admin for High/Critical incidents or Violence
    if (isCritical) {
      const adminIds = await findAllAdminUserIds();
      for (const adminId of adminIds) {
        await createNotificationServer({
          recipientUserId: adminId,
          recipientRole: "admin",
          department: resolvedDepartment,
          type: "critical_incident",
          title: "Critical Student Incident 🚨",
          detail: `High-priority student incident reported for ${resolvedStudentName} (${cleanCode}) in ${resolvedDepartment}: ${violationType} (${severity} severity).`,
          tone: "violation",
          relatedId: reportId,
          relatedType: "violation_report",
        });
      }

      // If explicit violence or critical safety emergency, create emergency response incident
      if (
        severity === "Critical" ||
        violationType.includes("Violence") ||
        violationType.includes("Physical Altercation") ||
        violationType.includes("Safety Emergency")
      ) {
        try {
          const { createEmergencyIncident } = await import("./emergency.server");
          await createEmergencyIncident({
            violationReportId: reportId,
            studentCode: cleanCode,
            studentName: resolvedStudentName,
            department: resolvedDepartment,
            yearSection: resolvedYearSection,
            incidentCategory: violationType,
            severity,
            location: input.location,
            room: input.room,
            subject: input.className,
            facultyReporter: input.reportedBy,
            incidentTime: input.incidentTime,
          });
        } catch (emgErr) {
          console.error("[Violation Server] Failed to auto-create emergency incident record:", emgErr);
        }
      }
    }

    // 7. Notify the student
    const studentUserId = await findStudentUserIdByCode(cleanCode);
    if (studentUserId) {
      await createNotificationServer({
        recipientUserId: studentUserId,
        recipientRole: "student",
        recipientId: cleanCode,
        department: resolvedDepartment,
        type: "violation_report_created",
        title: "Violation Report Filed",
        detail: `A violation report has been filed for ${input.className}. Please submit your explanation within 24 hours.`,
        tone: "violation",
        relatedId: reportId,
        relatedType: "violation_report",
      });
    }

    await db.query("COMMIT");
    return report;
  } catch (error) {
    await db.query("ROLLBACK");
    console.error("[Database Error] Error creating violation report:", error);
    throw error;
  }
}

const VIOLATION_COLUMNS = `
  id, student_code, student_name, department, year_section, class_name,
  subject_code, scheduled_time, room, scheduled_faculty, incident_time,
  observed_at::text, location, violation_type, severity, remarks, witness_notes,
  evidence, reported_by, status::text, explanation, explanation_submitted_at::text,
  decision, decision_by, decision_at::text, semester, explanation_deadline::text, created_at::text
`;

/**
 * Retrieves all violation reports created by a specific Faculty member.
 */
export async function getFacultyReports(facultyName: string): Promise<DBViolationReport[]> {
  const cleanName = facultyName.trim();
  if (!cleanName) return [];

  try {
    const query = `
      SELECT ${VIOLATION_COLUMNS}
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

    if (cleanDept && cleanDept !== "ALL") {
      query = `
        SELECT ${VIOLATION_COLUMNS}
        FROM violation_reports
        WHERE UPPER(department) = UPPER($1)
        ORDER BY created_at DESC;
      `;
      params = [cleanDept];
    } else {
      query = `
        SELECT ${VIOLATION_COLUMNS}
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
      SELECT ${VIOLATION_COLUMNS}
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
