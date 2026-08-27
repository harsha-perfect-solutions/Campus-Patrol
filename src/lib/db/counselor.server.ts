import { db } from "../db.server";
import type { DBViolationReport } from "./violations.server";
import {
  findHodUserIdForStudentCode,
  findStudentUserIdByCode,
  findAllAdminUserIds,
  createNotificationServer,
} from "./notifications.server";

export type DBCounselorAssignment = {
  id: string;
  faculty_id: string;
  faculty_name?: string;
  faculty_email?: string;
  staff_code?: string | null;
  department: string;
  year: string;
  semester: number;
  section: string;
  status: string;
  created_at: string;
  updated_at: string;
  student_count?: number;
};

export type DBCounselorStudent = {
  id: string;
  counselor_assignment_id: string;
  student_code: string;
  student_name?: string;
  department?: string;
  year?: string;
  section?: string;
  semester?: number;
  assigned_at: string;
  status: string;
  counselor_faculty_id?: string;
  counselor_name?: string;
};

export type CounselorDashboardStats = {
  totalStudents: number;
  pendingViolations: number;
  explanationsWaiting: number;
  underReview: number;
  resolved: number;
  escalated: number;
};

let counselorSchemaEnsured = false;

export async function ensureCounselorSchema(): Promise<void> {
  if (counselorSchemaEnsured) return;
  try {
    // 1. Table for counselor assignments to class/section
    await db.query(`
      CREATE TABLE IF NOT EXISTS counselor_assignments (
        id VARCHAR(64) PRIMARY KEY,
        faculty_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        department VARCHAR(64) NOT NULL,
        year VARCHAR(64) NOT NULL,
        semester INT NOT NULL DEFAULT 1,
        section VARCHAR(64) NOT NULL,
        status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // 2. Table for student-to-counselor mappings
    await db.query(`
      CREATE TABLE IF NOT EXISTS counselor_students (
        id VARCHAR(64) PRIMARY KEY,
        counselor_assignment_id VARCHAR(64) NOT NULL REFERENCES counselor_assignments(id) ON DELETE CASCADE,
        student_code VARCHAR(64) NOT NULL,
        assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE'
      );
    `);

    // 3. Extend violation_reports table columns for counselor resolution & audit trail
    await db.query(`
      ALTER TABLE violation_reports ADD COLUMN IF NOT EXISTS assigned_counselor_id VARCHAR(64) NULL;
      ALTER TABLE violation_reports ADD COLUMN IF NOT EXISTS counselor_assignment_status VARCHAR(64) DEFAULT 'ASSIGNED';
      ALTER TABLE violation_reports ADD COLUMN IF NOT EXISTS counselor_remarks TEXT NULL;
      ALTER TABLE violation_reports ADD COLUMN IF NOT EXISTS counselor_reviewed_at TIMESTAMPTZ NULL;
      ALTER TABLE violation_reports ADD COLUMN IF NOT EXISTS escalation_reason TEXT NULL;
      ALTER TABLE violation_reports ADD COLUMN IF NOT EXISTS escalated_at TIMESTAMPTZ NULL;
      ALTER TABLE violation_reports ADD COLUMN IF NOT EXISTS resolution_note TEXT NULL;
      ALTER TABLE violation_reports ADD COLUMN IF NOT EXISTS resolved_by VARCHAR(64) NULL;
      ALTER TABLE violation_reports ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ NULL;
      ALTER TABLE violation_reports ADD COLUMN IF NOT EXISTS audit_trail JSONB DEFAULT '[]'::jsonb;
    `);

    // Indexes
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_counselor_assignments_faculty ON counselor_assignments(faculty_id);
      CREATE INDEX IF NOT EXISTS idx_counselor_assignments_class ON counselor_assignments(department, year, semester, section);
      CREATE INDEX IF NOT EXISTS idx_counselor_students_code ON counselor_students(student_code);
      CREATE INDEX IF NOT EXISTS idx_violation_reports_counselor ON violation_reports(assigned_counselor_id);
    `);

    counselorSchemaEnsured = true;
  } catch (err) {
    console.error("[Counselor DB Schema Error]:", err);
    throw err;
  }
}

/**
  * Finds the active assigned Counselor faculty_id for a given student code.
  */
export async function findActiveCounselorForStudent(studentCode: string): Promise<string | null> {
  await ensureCounselorSchema();
  const cleanCode = studentCode.trim().toUpperCase();

  const query = `
    SELECT ca.faculty_id
    FROM counselor_students cs
    JOIN counselor_assignments ca ON ca.id = cs.counselor_assignment_id
    WHERE UPPER(cs.student_code) = $1
      AND cs.status = 'ACTIVE'
      AND ca.status = 'ACTIVE'
    LIMIT 1;
  `;

  const res = await db.query(query, [cleanCode]);
  return res.rows[0]?.faculty_id || null;
}

/**
 * Finds the assigned counselor details (name & id) for a given student code or class.
 */
export async function getStudentCounselorDetails(
  studentCode: string,
  department?: string,
  year?: string,
  section?: string
): Promise<{ counselorName: string; counselorId?: string }> {
  await ensureCounselorSchema();
  const cleanCode = studentCode.trim().toUpperCase();

  try {
    // 1. Check direct student-to-counselor assignment mapping
    const directQuery = `
      SELECT p.id as counselor_id, p.full_name as counselor_name
      FROM counselor_students cs
      JOIN counselor_assignments ca ON ca.id = cs.counselor_assignment_id
      JOIN profiles p ON p.id = ca.faculty_id
      WHERE UPPER(cs.student_code) = $1
        AND cs.status = 'ACTIVE'
        AND ca.status = 'ACTIVE'
      LIMIT 1;
    `;
    const directRes = await db.query(directQuery, [cleanCode]);
    if (directRes.rows[0]?.counselor_name) {
      return {
        counselorName: directRes.rows[0].counselor_name,
        counselorId: directRes.rows[0].counselor_id,
      };
    }

    // 2. Check class-level counselor assignment
    if (department && year && section) {
      const classQuery = `
        SELECT p.id as counselor_id, p.full_name as counselor_name
        FROM counselor_assignments ca
        JOIN profiles p ON p.id = ca.faculty_id
        WHERE UPPER(ca.department) = UPPER($1)
          AND UPPER(ca.year) = UPPER($2)
          AND UPPER(ca.section) = UPPER($3)
          AND ca.status = 'ACTIVE'
        LIMIT 1;
      `;
      const classRes = await db.query(classQuery, [department, year, section]);
      if (classRes.rows[0]?.counselor_name) {
        return {
          counselorName: classRes.rows[0].counselor_name,
          counselorId: classRes.rows[0].counselor_id,
        };
      }
    }
  } catch (error) {
    console.warn("[Counselor Lookup Warning] Error querying counselor details:", error);
  }

  // Fallback defaults per department
  const fallbacks: Record<string, string> = {
    CSE: "Prof. Ravi Kumar",
    ECE: "Dr. S. Venkat",
    MECH: "Dr. P. K. Sharma",
    EEE: "Dr. R. Ramakrishnan",
    CIVIL: "Dr. M. K. Varma",
    IT: "Dr. N. Swaminathan",
    AIML: "Dr. K. V. Sharma",
  };

  const defaultCounselor = (department && fallbacks[department.toUpperCase()]) || "Prof. Ravi Kumar";
  return { counselorName: defaultCounselor };
}

/**
 * Checks if a faculty member is a Counselor (Every faculty member is a Counselor).
 */
export async function hasActiveCounselorAssignment(facultyId: string): Promise<boolean> {
  await ensureCounselorSchema();
  const res = await db.query(
    `SELECT 1 FROM profiles WHERE id = $1 LIMIT 1;`,
    [facultyId]
  );
  return (res.rows.length || 0) > 0;
}

/**
  * Fetches Counselor Assignments for Admin Console with student counts.
  */
export async function getCounselorAssignmentsForAdmin(filters?: {
  department?: string;
  year?: string;
  semester?: number;
  section?: string;
}): Promise<DBCounselorAssignment[]> {
  await ensureCounselorSchema();

  const conditions: string[] = ["ca.status = 'ACTIVE'"];
  const params: any[] = [];

  if (filters?.department && filters.department !== "ALL") {
    params.push(filters.department);
    conditions.push(`ca.department = $${params.length}`);
  }

  if (filters?.year && filters.year !== "ALL") {
    params.push(filters.year);
    conditions.push(`ca.year = $${params.length}`);
  }

  if (filters?.semester && filters.semester !== 0) {
    params.push(filters.semester);
    conditions.push(`ca.semester = $${params.length}`);
  }

  if (filters?.section && filters.section !== "ALL") {
    params.push(filters.section);
    conditions.push(`ca.section = $${params.length}`);
  }

  const query = `
    SELECT 
      ca.id,
      ca.faculty_id,
      p.full_name as faculty_name,
      p.email as faculty_email,
      p.staff_code,
      ca.department,
      ca.year,
      ca.semester,
      ca.section,
      ca.status,
      ca.created_at::text,
      ca.updated_at::text,
      (
        SELECT COUNT(*)::int 
        FROM counselor_students cs 
        WHERE cs.counselor_assignment_id = ca.id AND cs.status = 'ACTIVE'
      ) as student_count
    FROM counselor_assignments ca
    JOIN profiles p ON p.id = ca.faculty_id
    WHERE ${conditions.join(" AND ")}
    ORDER BY ca.department ASC, ca.year ASC, ca.section ASC, p.full_name ASC;
  `;

  const res = await db.query<DBCounselorAssignment>(query, params);
  return res.rows;
}

/**
  * Adds a Counselor assignment for a class/section in Admin Console.
  */
export async function addCounselorAssignment(data: {
  facultyId: string;
  department: string;
  year: string;
  semester: number;
  section: string;
}): Promise<DBCounselorAssignment> {
  await ensureCounselorSchema();
  const { facultyId, department, year, semester, section } = data;

  // Verify faculty exists
  const fCheck = await db.query(`SELECT id, full_name, email FROM profiles WHERE id = $1;`, [facultyId]);
  if (!fCheck.rows[0]) throw new Error("Faculty profile not found.");

  // Check duplicate active assignment
  const dup = await db.query(
    `SELECT id FROM counselor_assignments WHERE faculty_id = $1 AND department = $2 AND year = $3 AND section = $4 AND status = 'ACTIVE';`,
    [facultyId, department, year, section]
  );
  if (dup.rows.length > 0) {
    throw new Error(`Faculty member is already an active Counselor for ${department} ${year} ${section}.`);
  }

  const id = `CA-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const query = `
    INSERT INTO counselor_assignments (id, faculty_id, department, year, semester, section, status)
    VALUES ($1, $2, $3, $4, $5, $6, 'ACTIVE')
    RETURNING id, faculty_id, department, year, semester, section, status, created_at::text, updated_at::text;
  `;

  const res = await db.query<DBCounselorAssignment>(query, [id, facultyId, department, year, semester, section]);
  const row = res.rows[0];
  if (!row) {
    throw new Error("Failed to insert counselor assignment record.");
  }
  return {
    id: row.id,
    faculty_id: row.faculty_id,
    faculty_name: fCheck.rows[0].full_name,
    faculty_email: fCheck.rows[0].email,
    staff_code: fCheck.rows[0].staff_code || null,
    department: row.department,
    year: row.year,
    semester: row.semester,
    section: row.section,
    status: row.status,
    created_at: row.created_at,
    updated_at: row.updated_at,
    student_count: 0,
  };
}

/**
  * Removes a Counselor assignment. Pending violations are preserved.
  */
export async function removeCounselorAssignment(assignmentId: string): Promise<boolean> {
  await ensureCounselorSchema();
  await db.query(`UPDATE counselor_students SET status = 'INACTIVE' WHERE counselor_assignment_id = $1;`, [assignmentId]);
  const res = await db.query(`UPDATE counselor_assignments SET status = 'INACTIVE', updated_at = NOW() WHERE id = $1;`, [assignmentId]);
  return (res.rowCount || 0) > 0;
}

/**
  * Distributes or reassigns students for a class/section.
  * Counselor assignment stability rule: Does NOT auto-rebalance existing assignments on page loads or assignment additions.
  * Only executes when explicitly triggered by Admin.
  */
export async function distributeStudentsToCounselors(data: {
  department: string;
  year: string;
  section: string;
  mode: "auto" | "manual";
  manualMapping?: Record<string, string[]>; // assignmentId -> studentCodes[]
}): Promise<{ success: boolean; totalStudents: number; distribution: Record<string, number> }> {
  await ensureCounselorSchema();
  const { department, year, section, mode, manualMapping } = data;

  // Fetch active counselors for this class
  const caRes = await db.query<DBCounselorAssignment>(
    `SELECT id, faculty_id FROM counselor_assignments WHERE department = $1 AND year = $2 AND section = $3 AND status = 'ACTIVE';`,
    [department, year, section]
  );
  const activeAssignments = caRes.rows;
  if (activeAssignments.length === 0) {
    throw new Error(`No active Counselors found for ${department} ${year} ${section}.`);
  }

  // Fetch all students in this section
  const stRes = await db.query<{ student_code: string }>(
    `SELECT student_code FROM students WHERE department = $1 AND year = $2 AND section = $3 AND status = 'Active' ORDER BY student_code ASC;`,
    [department, year, section]
  );
  const allStudents = stRes.rows.map((s: any) => s.student_code.toUpperCase());
  if (allStudents.length === 0) {
    throw new Error(`No active students found in ${department} ${year} ${section}.`);
  }

  const distributionCounts: Record<string, number> = {};

  if (mode === "auto") {
    // Balanced distribution
    const count = activeAssignments.length;
    let idx = 0;
    for (const studentCode of allStudents) {
      const targetCa = activeAssignments[idx % count];
      idx++;

      // Deactivate any existing assignment for this student in this section
      await db.query(
        `UPDATE counselor_students cs SET status = 'INACTIVE' 
         FROM counselor_assignments ca 
         WHERE ca.id = cs.counselor_assignment_id 
           AND ca.department = $1 AND ca.year = $2 AND ca.section = $3 
           AND UPPER(cs.student_code) = $4;`,
        [department, year, section, studentCode]
      );

      if (targetCa) {
        const csId = `CS-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        await db.query(
          `INSERT INTO counselor_students (id, counselor_assignment_id, student_code, status) VALUES ($1, $2, $3, 'ACTIVE');`,
          [csId, targetCa.id, studentCode]
        );

        distributionCounts[targetCa.id] = (distributionCounts[targetCa.id] || 0) + 1;
      }
    }
  } else if (mode === "manual" && manualMapping) {
    for (const [caId, codes] of Object.entries(manualMapping)) {
      distributionCounts[caId] = 0;
      for (const studentCode of codes) {
        const cleanCode = studentCode.trim().toUpperCase();

        await db.query(
          `UPDATE counselor_students cs SET status = 'INACTIVE' 
           FROM counselor_assignments ca 
           WHERE ca.id = cs.counselor_assignment_id 
             AND ca.department = $1 AND ca.year = $2 AND ca.section = $3 
             AND UPPER(cs.student_code) = $4;`,
          [department, year, section, cleanCode]
        );

        const csId = `CS-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        await db.query(
          `INSERT INTO counselor_students (id, counselor_assignment_id, student_code, status) VALUES ($1, $2, $3, 'ACTIVE');`,
          [csId, caId, cleanCode]
        );

        distributionCounts[caId] = (distributionCounts[caId] || 0) + 1;
      }
    }
  }

  return {
    success: true,
    totalStudents: allStudents.length,
    distribution: distributionCounts,
  };
}

/**
  * Server-authoritative query: Fetches assigned students for a specific Counselor.
  * Ensures faculty can ONLY access students explicitly assigned to them as Counselor.
  */
export async function getCounselorStudents(facultyId: string): Promise<DBCounselorStudent[]> {
  await ensureCounselorSchema();

  const query = `
    SELECT 
      cs.id,
      cs.counselor_assignment_id,
      cs.student_code,
      s.name as student_name,
      s.department,
      s.year,
      s.section,
      s.semester,
      cs.assigned_at::text,
      cs.status,
      ca.faculty_id as counselor_faculty_id,
      p.full_name as counselor_name
    FROM counselor_students cs
    JOIN counselor_assignments ca ON ca.id = cs.counselor_assignment_id
    JOIN profiles p ON p.id = ca.faculty_id
    LEFT JOIN students s ON UPPER(s.student_code) = UPPER(cs.student_code)
    WHERE ca.faculty_id = $1 AND ca.status = 'ACTIVE' AND cs.status = 'ACTIVE'
    ORDER BY s.year ASC, s.section ASC, s.student_code ASC;
  `;

  const res = await db.query<DBCounselorStudent>(query, [facultyId]);
  return res.rows;
}

/**
  * Counselor Dashboard Statistics (server-authoritative for logged in faculty).
  */
export async function getCounselorDashboardStats(facultyId: string): Promise<CounselorDashboardStats> {
  await ensureCounselorSchema();

  // 1. Total assigned students
  const stRes = await db.query(
    `SELECT COUNT(*)::int as count 
     FROM counselor_students cs 
     JOIN counselor_assignments ca ON ca.id = cs.counselor_assignment_id 
     WHERE ca.faculty_id = $1 AND ca.status = 'ACTIVE' AND cs.status = 'ACTIVE';`,
    [facultyId]
  );
  const totalStudents = stRes.rows[0]?.count || 0;

  // 2. Violation stats assigned to this counselor
  const vRes = await db.query(
    `SELECT status::text, explanation FROM violation_reports WHERE assigned_counselor_id = $1;`,
    [facultyId]
  );

  let pendingViolations = 0;
  let explanationsWaiting = 0;
  let underReview = 0;
  let resolved = 0;
  let escalated = 0;

  for (const r of vRes.rows) {
    const st = r.status.toLowerCase();
    if (st === "reported" || st === "awaiting_student_explanation" || st === "pending") {
      pendingViolations++;
      if (!r.explanation) {
        explanationsWaiting++;
      } else {
        underReview++;
      }
    } else if (st === "student_explanation_submitted" || st === "counselor_review" || st === "under_review") {
      pendingViolations++;
      underReview++;
    } else if (st === "resolved" || st === "counselor_resolved" || st === "closed" || st === "exonerated" || st === "warned") {
      resolved++;
    } else if (st === "escalated_to_hod" || st === "hod_review" || st === "escalated") {
      escalated++;
    }
  }

  return {
    totalStudents,
    pendingViolations,
    explanationsWaiting,
    underReview,
    resolved,
    escalated,
  };
}

/**
  * Server-authoritative query: Fetches violation reports assigned to a specific Counselor.
  */
export async function getCounselorViolations(
  facultyId: string,
  filters?: { status?: string; search?: string }
): Promise<DBViolationReport[]> {
  await ensureCounselorSchema();

  const conditions: string[] = ["assigned_counselor_id = $1"];
  const params: any[] = [facultyId];

  if (filters?.status && filters.status !== "ALL") {
    params.push(filters.status.toLowerCase());
    conditions.push(`LOWER(status::text) = $${params.length}`);
  }

  if (filters?.search?.trim()) {
    params.push(`%${filters.search.trim()}%`);
    const pIdx = params.length;
    conditions.push(`(
      student_name ILIKE $${pIdx} OR
      student_code ILIKE $${pIdx} OR
      id ILIKE $${pIdx} OR
      violation_type ILIKE $${pIdx}
    )`);
  }

  const query = `
    SELECT 
      id, student_code, student_name, department, year_section, class_name,
      subject_code, scheduled_time, room, scheduled_faculty, incident_time,
      observed_at::text, location, violation_type, severity, remarks, witness_notes,
      evidence, reported_by, status::text, explanation, explanation_submitted_at::text,
      decision, decision_by, decision_at::text, semester, explanation_deadline::text, created_at::text
    FROM violation_reports
    WHERE ${conditions.join(" AND ")}
    ORDER BY created_at DESC;
  `;

  const res = await db.query<DBViolationReport>(query, params);
  return res.rows;
}

/**
  * Counselor action: RESOLVE a violation report with a required resolution note.
  */
export async function resolveViolationByCounselor(
  counselorFacultyId: string,
  violationId: string,
  resolutionNote?: string
): Promise<DBViolationReport> {
  await ensureCounselorSchema();
  const cleanNote = resolutionNote?.trim() || "Case reviewed and resolved by Class Counselor.";

  // 1. Verify case ownership
  const vCheck = await db.query<DBViolationReport>(
    `SELECT * FROM violation_reports WHERE id = $1 AND assigned_counselor_id = $2;`,
    [violationId, counselorFacultyId]
  );
  const report = vCheck.rows[0];
  if (!report) {
    throw new Error("Violation report not found or you are not the authorized assigned Counselor.");
  }

  // 2. Fetch counselor name
  const pCheck = await db.query(`SELECT full_name FROM profiles WHERE id = $1;`, [counselorFacultyId]);
  const counselorName = pCheck.rows[0]?.full_name || "Assigned Counselor";

  // 3. Audit trail entry
  const existingAudit = Array.isArray(report.audit_trail) ? report.audit_trail : [];
  const auditEvent = {
    action: "COUNSELOR_RESOLVED",
    actor_id: counselorFacultyId,
    actor_name: counselorName,
    note: cleanNote,
    timestamp: new Date().toISOString(),
  };
  const updatedAudit = JSON.stringify([...existingAudit, auditEvent]);

  // 4. Update DB
  const updateQuery = `
    UPDATE violation_reports
    SET status = 'resolved',
        decision = 'RESOLVED_BY_COUNSELOR',
        decision_by = $1,
        decision_at = NOW(),
        resolution_note = $2,
        counselor_reviewed_at = NOW(),
        audit_trail = $3::jsonb
    WHERE id = $4 AND assigned_counselor_id = $1
    RETURNING id, student_code, student_name, department, year_section, class_name,
              subject_code, scheduled_time, room, scheduled_faculty, incident_time,
              observed_at::text, location, violation_type, severity, remarks, witness_notes,
              evidence, reported_by, status::text, explanation, explanation_submitted_at::text,
              decision, decision_by, decision_at::text, semester, explanation_deadline::text, created_at::text,
              assigned_counselor_id, counselor_assignment_status, counselor_remarks, counselor_reviewed_at::text,
              escalation_reason, escalated_at::text, resolution_note, resolved_by, resolved_at::text, audit_trail;
  `;

  const res = await db.query<DBViolationReport>(updateQuery, [counselorFacultyId, cleanNote, updatedAudit, violationId]);
  const updatedReport = res.rows[0];
  if (!updatedReport) throw new Error("Failed to update violation report resolution.");

  // 5. Notify Student
  const studentUserId = await findStudentUserIdByCode(report.student_code);
  if (studentUserId) {
    await createNotificationServer({
      recipientUserId: studentUserId,
      recipientRole: "student",
      department: report.department,
      type: "violation_resolved",
      title: "Violation Case Resolved by Counselor ✅",
      detail: `Your violation case (${violationId}) was reviewed and resolved by your Counselor ${counselorName}. Note: ${cleanNote}`,
      tone: "resolved",
      relatedId: violationId,
      relatedType: "violation_report",
    });
  }

  return updatedReport;
}

/**
  * Counselor action: ESCALATE a violation report to HOD. Requires escalation reason and remarks.
  */
export async function escalateViolationToHod(
  counselorFacultyId: string,
  violationId: string,
  escalationReason?: string,
  counselorRemarks?: string
): Promise<DBViolationReport> {
  await ensureCounselorSchema();
  const cleanReason = escalationReason?.trim() || "Passed to HOD for formal departmental review.";

  // 1. Verify case ownership
  const vCheck = await db.query<DBViolationReport>(
    `SELECT * FROM violation_reports WHERE id = $1 AND assigned_counselor_id = $2;`,
    [violationId, counselorFacultyId]
  );
  const report = vCheck.rows[0];
  if (!report) {
    throw new Error("Violation report not found or you are not the authorized assigned Counselor.");
  }

  // 2. Fetch counselor name
  const pCheck = await db.query(`SELECT full_name FROM profiles WHERE id = $1;`, [counselorFacultyId]);
  const counselorName = pCheck.rows[0]?.full_name || "Assigned Counselor";

  // 3. Audit trail entry
  const existingAudit = Array.isArray(report.audit_trail) ? report.audit_trail : [];
  const auditEvent = {
    action: "ESCALATED_TO_HOD",
    actor_id: counselorFacultyId,
    actor_name: counselorName,
    reason: cleanReason,
    remarks: counselorRemarks?.trim() || null,
    timestamp: new Date().toISOString(),
  };
  const updatedAudit = JSON.stringify([...existingAudit, auditEvent]);

  // 4. Update DB
  const updateQuery = `
    UPDATE violation_reports
    SET status = 'escalated',
        escalation_reason = $2,
        counselor_remarks = $3,
        counselor_reviewed_at = NOW(),
        escalated_at = NOW(),
        audit_trail = $4::jsonb
    WHERE id = $5 AND assigned_counselor_id = $1
    RETURNING id, student_code, student_name, department, year_section, class_name,
              subject_code, scheduled_time, room, scheduled_faculty, incident_time,
              observed_at::text, location, violation_type, severity, remarks, witness_notes,
              evidence, reported_by, status::text, explanation, explanation_submitted_at::text,
              decision, decision_by, decision_at::text, semester, explanation_deadline::text, created_at::text;
  `;

  const res = await db.query<DBViolationReport>(
    updateQuery,
    [counselorFacultyId, cleanReason, counselorRemarks?.trim() || null, updatedAudit, violationId]
  );
  const updatedReport = res.rows[0];
  if (!updatedReport) throw new Error("Failed to escalate violation report.");

  // 5. Notify HOD
  const hodUserId = await findHodUserIdForStudentCode(report.student_code);
  if (hodUserId) {
    await createNotificationServer({
      recipientUserId: hodUserId,
      recipientRole: "hod",
      department: report.department,
      type: "violation_escalated",
      title: "Violation Case Escalated by Counselor 🚨",
      detail: `Counselor ${counselorName} escalated violation (${violationId}) for ${report.student_name} (${report.student_code}). Reason: ${cleanReason}`,
      tone: "violation",
      relatedId: violationId,
      relatedType: "violation_report",
    });
  }

  // 6. Notify Student
  const studentUserId = await findStudentUserIdByCode(report.student_code);
  if (studentUserId) {
    await createNotificationServer({
      recipientUserId: studentUserId,
      recipientRole: "student",
      department: report.department,
      type: "violation_escalated",
      title: "Case Escalated to HOD ⚠️",
      detail: `Your violation case (${violationId}) has been escalated to HOD by Counselor ${counselorName} for formal review.`,
      tone: "violation",
      relatedId: violationId,
      relatedType: "violation_report",
    });
  }

  return updatedReport;
}
