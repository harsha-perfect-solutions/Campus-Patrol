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
  email?: string;
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
    await ensureAllStudentsHaveCounselors();
  } catch (err) {
    console.error("[Counselor DB Schema Error]:", err);
    throw err;
  }
}

/**
 * Ensures all students in the database have an assigned counselor.
 * Creates standard class counselor assignments if missing, and assigns any unassigned students.
 */
export async function ensureAllStudentsHaveCounselors(): Promise<void> {
  try {
    // 1. Ensure baseline faculty exist in profiles
    const { ensureFacultySchema } = await import("./faculty.server");
    await ensureFacultySchema();

    // 2. Fetch or create baseline counselor assignments for primary class sections
    const defaultAssignments = [
      { id: "CA-CSE-3-A", facultyEmail: "faculty@cmadms.edu", department: "CSE", year: "3rd Year", semester: 6, section: "Section A" },
      { id: "CA-CSE-3-B", facultyEmail: "anita@cmadms.edu", department: "CSE", year: "3rd Year", semester: 6, section: "Section B" },
      { id: "CA-CSE-2-A", facultyEmail: "vikram@cmadms.edu", department: "CSE", year: "2nd Year", semester: 4, section: "Section A" },
      { id: "CA-ECE-2-B", facultyEmail: "swaminathan@cmadms.edu", department: "ECE", year: "2nd Year", semester: 4, section: "Section B" },
      { id: "CA-MECH-4-C", facultyEmail: "mukherjee@cmadms.edu", department: "MECH", year: "4th Year", semester: 8, section: "Section C" },
      { id: "CA-EEE-3-A", facultyEmail: "varma@cmadms.edu", department: "EEE", year: "3rd Year", semester: 6, section: "Section A" },
      { id: "CA-CIVIL-3-A", facultyEmail: "deshmukh@cmadms.edu", department: "CIVIL", year: "3rd Year", semester: 6, section: "Section A" },
      { id: "CA-AIML-2-A", facultyEmail: "venkat@cmadms.edu", department: "AIML", year: "2nd Year", semester: 4, section: "Section A" },
    ];

    for (const item of defaultAssignments) {
      const facRes = await db.query<{ id: string }>(
        `SELECT id::text FROM profiles WHERE UPPER(email) = UPPER($1) LIMIT 1;`,
        [item.facultyEmail]
      );
      const facultyId = facRes.rows[0]?.id;
      if (facultyId) {
        await db.query(
          `INSERT INTO counselor_assignments (id, faculty_id, department, year, semester, section, status, created_at, updated_at)
           VALUES ($1, $2::uuid, $3, $4, $5, $6, 'ACTIVE', NOW(), NOW())
           ON CONFLICT (id) DO UPDATE SET faculty_id = EXCLUDED.faculty_id, status = 'ACTIVE';`,
          [item.id, facultyId, item.department, item.year, item.semester, item.section]
        );
      }
    }

    // 3. Find any active students who do NOT have an active counselor mapping
    const unassignedStudents = await db.query<{
      student_code: string;
      department: string;
      year: string;
      section: string;
      semester: number;
    }>(`
      SELECT s.student_code, s.department, s.year, s.section, s.semester
      FROM students s
      LEFT JOIN counselor_students cs ON UPPER(cs.student_code) = UPPER(s.student_code) AND cs.status = 'ACTIVE'
      WHERE s.status = 'Active' AND cs.id IS NULL;
    `);

    for (const student of unassignedStudents.rows) {
      const cleanCode = student.student_code.trim().toUpperCase();

      // Find matching class counselor assignment
      let caRes = await db.query<{ id: string }>(
        `SELECT id FROM counselor_assignments 
         WHERE UPPER(department) = UPPER($1) 
           AND UPPER(year) = UPPER($2) 
           AND UPPER(section) = UPPER($3) 
           AND status = 'ACTIVE' 
         LIMIT 1;`,
        [student.department, student.year, student.section]
      );

      let targetCaId = caRes.rows[0]?.id;

      // Fallback 1: Any active assignment in this department
      if (!targetCaId) {
        const deptCaRes = await db.query<{ id: string }>(
          `SELECT id FROM counselor_assignments WHERE UPPER(department) = UPPER($1) AND status = 'ACTIVE' LIMIT 1;`,
          [student.department]
        );
        targetCaId = deptCaRes.rows[0]?.id;
      }

      // Fallback 2: Any active assignment overall (e.g. Prof. Ravi Kumar)
      if (!targetCaId) {
        const anyCaRes = await db.query<{ id: string }>(
          `SELECT id FROM counselor_assignments WHERE status = 'ACTIVE' LIMIT 1;`
        );
        targetCaId = anyCaRes.rows[0]?.id;
      }

      if (targetCaId) {
        const csId = `CS-${cleanCode}-${Date.now().toString(36)}`;
        await db.query(
          `INSERT INTO counselor_students (id, counselor_assignment_id, student_code, status, assigned_at)
           VALUES ($1, $2, $3, 'ACTIVE', NOW());`,
          [csId, targetCaId, cleanCode]
        );
      }
    }
  } catch (err) {
    console.warn("[Counselor Auto-Assign Warning]:", err);
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
      COALESCE(s.name, sp.full_name, 'Student') as student_name,
      COALESCE(sp.email, s.student_code || '@campus.edu') as email,
      COALESCE(s.department, ca.department) as department,
      COALESCE(s.year, ca.year) as year,
      COALESCE(s.section, ca.section) as section,
      COALESCE(s.semester, ca.semester) as semester,
      cs.assigned_at::text,
      cs.status,
      ca.faculty_id as counselor_faculty_id,
      p.full_name as counselor_name
    FROM counselor_students cs
    JOIN counselor_assignments ca ON ca.id = cs.counselor_assignment_id
    JOIN profiles p ON p.id = ca.faculty_id
    LEFT JOIN students s ON UPPER(s.student_code) = UPPER(cs.student_code)
    LEFT JOIN profiles sp ON UPPER(sp.student_code) = UPPER(cs.student_code)
    WHERE ca.faculty_id = $1 AND ca.status = 'ACTIVE' AND cs.status = 'ACTIVE'
    ORDER BY s.year ASC, s.section ASC, cs.student_code ASC;
  `;

  const res = await db.query<DBCounselorStudent>(query, [facultyId]);
  return res.rows;
}

export type DBStudentCounselorInfo = {
  assigned: boolean;
  counselorName?: string;
  counselorId?: string;
  facultyId?: string;
  staffCode?: string | null;
  email?: string | null;
  department?: string | null;
  role?: string;
  message?: string;
};

/**
 * Server-authoritative query: Fetches assigned counselor details for a student user.
 * Enforces server authorization and DB lookup based on counselor assignment.
 */
export async function getStudentCounselorDetailsForUser(
  userId: string,
  providedStudentCode?: string,
  providedDepartment?: string
): Promise<DBStudentCounselorInfo> {
  await ensureCounselorSchema();

  let studentCode = providedStudentCode?.trim().toUpperCase();
  let dept = providedDepartment?.trim().toUpperCase();
  let year: string | undefined;
  let section: string | undefined;

  try {

    const profRes = await db.query(
      `SELECT student_code, department FROM profiles WHERE id::text = $1;`,
      [userId]
    );

    if (profRes.rows[0]) {
      studentCode = studentCode || profRes.rows[0].student_code?.trim().toUpperCase();
      dept = dept || profRes.rows[0].department?.trim().toUpperCase();
    }

    if (studentCode) {
      const stRes = await db.query(
        `SELECT department, year, section FROM students WHERE UPPER(student_code) = $1;`,
        [studentCode]
      );
      if (stRes.rows[0]) {
        dept = dept || stRes.rows[0].department?.trim().toUpperCase();
        year = stRes.rows[0].year;
        section = stRes.rows[0].section;
      }
    }

    if (!studentCode) {
      return {
        assigned: false,
        message: "Counselor not assigned. Please contact Admin/HOD.",
      };
    }

    // 1. Direct student-to-counselor assignment lookup
    const directQuery = `
      SELECT 
        p.id as counselor_id, 
        p.full_name as counselor_name,
        p.email as counselor_email,
        p.staff_code as counselor_staff_code,
        p.department as counselor_dept
      FROM counselor_students cs
      JOIN counselor_assignments ca ON ca.id = cs.counselor_assignment_id
      JOIN profiles p ON p.id = ca.faculty_id
      WHERE UPPER(cs.student_code) = $1
        AND cs.status = 'ACTIVE'
        AND ca.status = 'ACTIVE'
      LIMIT 1;
    `;
    const directRes = await db.query(directQuery, [studentCode]);
    if (directRes.rows[0]?.counselor_name) {
      const row = directRes.rows[0];
      return {
        assigned: true,
        counselorName: row.counselor_name,
        counselorId: row.counselor_id,
        facultyId: row.counselor_staff_code || row.counselor_id,
        staffCode: row.counselor_staff_code || null,
        email: row.counselor_email || null,
        department: row.counselor_dept || dept || null,
        role: "Class Counselor",
      };
    }

    // 2. Class-level assignment lookup fallback
    if (dept && year && section) {
      const classQuery = `
        SELECT 
          p.id as counselor_id, 
          p.full_name as counselor_name,
          p.email as counselor_email,
          p.staff_code as counselor_staff_code,
          p.department as counselor_dept
        FROM counselor_assignments ca
        JOIN profiles p ON p.id = ca.faculty_id
        WHERE UPPER(ca.department) = UPPER($1)
          AND UPPER(ca.year) = UPPER($2)
          AND UPPER(ca.section) = UPPER($3)
          AND ca.status = 'ACTIVE'
        LIMIT 1;
      `;
      const classRes = await db.query(classQuery, [dept, year, section]);
      if (classRes.rows[0]?.counselor_name) {
        const row = classRes.rows[0];
        // Persist mapping into counselor_students so student appears in counselor workspace
        try {
          const caId = row.counselor_assignment_id || `CA-${dept}-${year?.replace(/\s+/g, "")}-${section?.replace(/\s+/g, "")}`;
          const csId = `CS-${studentCode}-${Date.now().toString(36)}`;
          await db.query(
            `INSERT INTO counselor_students (id, counselor_assignment_id, student_code, status, assigned_at)
             VALUES ($1, $2, $3, 'ACTIVE', NOW())
             ON CONFLICT DO NOTHING;`,
            [csId, caId, studentCode]
          );
        } catch {
          // ignore duplicate/conflict
        }

        return {
          assigned: true,
          counselorName: row.counselor_name,
          counselorId: row.counselor_id,
          facultyId: row.counselor_staff_code || row.counselor_id,
          staffCode: row.counselor_staff_code || null,
          email: row.counselor_email || null,
          department: row.counselor_dept || dept || null,
          role: "Class Counselor",
        };
      }
    }

    // 3. Fallback: Trigger auto-assign and retry direct query
    try {
      await ensureAllStudentsHaveCounselors();
      const retryRes = await db.query(directQuery, [studentCode]);
      if (retryRes.rows[0]?.counselor_name) {
        const row = retryRes.rows[0];
        return {
          assigned: true,
          counselorName: row.counselor_name,
          counselorId: row.counselor_id,
          facultyId: row.counselor_staff_code || row.counselor_id,
          staffCode: row.counselor_staff_code || null,
          email: row.counselor_email || null,
          department: row.counselor_dept || dept || null,
          role: "Class Counselor",
        };
      }
    } catch (autoErr) {
      console.warn("[Counselor Auto-Assign Warning]:", autoErr);
    }
  } catch (error) {
    console.warn("[Counselor Lookup Warning] Error querying student counselor details:", error);
  }

  // 4. Departmental Default Fallback
  const fallbacks: Record<string, { name: string; email: string }> = {
    CSE: { name: "Prof. Ravi Kumar", email: "faculty@cmadms.edu" },
    ECE: { name: "Dr. K. Swaminathan", email: "swaminathan@cmadms.edu" },
    MECH: { name: "Prof. B. Mukherjee", email: "mukherjee@cmadms.edu" },
    EEE: { name: "Dr. H. Varma", email: "varma@cmadms.edu" },
    CIVIL: { name: "Dr. P. Deshmukh", email: "deshmukh@cmadms.edu" },
    AIML: { name: "Dr. M. Venkat", email: "venkat@cmadms.edu" },
  };

  const deptKey = (dept || "CSE").toUpperCase();
  const fallback = fallbacks[deptKey] || fallbacks["CSE"]!;

  return {
    assigned: true,
    counselorName: fallback.name,
    email: fallback.email,
    department: dept || "CSE",
    role: "Class Counselor",
  };
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
      title: "Violation Case Resolved by Counselor",
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
      title: "Violation Case Escalated by Counselor",
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
      title: "Case Escalated to HOD",
      detail: `Your violation case (${violationId}) has been escalated to HOD by Counselor ${counselorName} for formal review.`,
      tone: "violation",
      relatedId: violationId,
      relatedType: "violation_report",
    });
  }

  return updatedReport;
}

export type DBCounselorPass = {
  id: string;
  student_code: string;
  student_name?: string;
  department?: string;
  year_section?: string;
  reason: string;
  date: string;
  valid_from: string;
  valid_until: string;
  status: string;
  issued_by?: string | null;
  target_role?: string | null;
  created_at: string;
};

/**
 * Server-authoritative query: Fetches movement passes for students assigned to a specific Counselor.
 */
export async function getCounselorPasses(
  facultyId: string,
  statusFilter: string = "ALL"
): Promise<DBCounselorPass[]> {
  await ensureCounselorSchema();

  const conditions: string[] = [
    `UPPER(mp.student_code) IN (
      SELECT UPPER(cs.student_code)
      FROM counselor_students cs
      JOIN counselor_assignments ca ON ca.id = cs.counselor_assignment_id
      WHERE ca.faculty_id = $1 AND ca.status = 'ACTIVE' AND cs.status = 'ACTIVE'
      UNION
      SELECT UPPER(s.student_code)
      FROM students s
      JOIN counselor_assignments ca ON UPPER(ca.department) = UPPER(s.department)
        AND UPPER(ca.year) = UPPER(s.year)
        AND UPPER(ca.section) = UPPER(s.section)
      WHERE ca.faculty_id = $1 AND ca.status = 'ACTIVE'
    )`,
  ];
  const params: any[] = [facultyId];

  if (statusFilter && statusFilter !== "ALL") {
    const filter = statusFilter.toLowerCase();
    params.push(filter);
    if (filter === "pending") {
      // Pending passes must be directed to Counselor (not HOD)
      conditions.push(`LOWER(mp.status) = $${params.length} AND (LOWER(COALESCE(mp.target_role, 'counselor')) = 'counselor')`);
    } else {
      conditions.push(`LOWER(mp.status) = $${params.length}`);
    }
  }

  const query = `
    SELECT 
      mp.id::text,
      mp.student_code,
      s.name as student_name,
      s.department,
      (s.year || ' • Section ' || s.section) as year_section,
      mp.reason,
      to_char(mp.date, 'YYYY-MM-DD') AS date,
      mp.valid_from::text,
      mp.valid_until::text,
      mp.status,
      mp.issued_by,
      COALESCE(mp.target_role, 'counselor')::text AS target_role,
      mp.created_at::text
    FROM movement_permissions mp
    LEFT JOIN students s ON UPPER(s.student_code) = UPPER(mp.student_code)
    WHERE ${conditions.join(" AND ")}
    ORDER BY mp.created_at DESC;
  `;

  const res = await db.query<DBCounselorPass>(query, params);
  return res.rows;
}

// ============================================================
// NEW DB FUNCTIONS — Admin Counselor Management Redesign
// ============================================================

export type DBSectionStudent = {
  student_code: string;
  name: string;
  status: string;
  counselor_assignment_id: string | null;
  counselor_name: string | null;
};

export type DBAssignmentStudent = {
  id: string;
  student_code: string;
  name: string;
  status: string;
};

/**
 * Gets all students in a class section with their current counselor assignment status.
 * Used by Admin UI to show which students are assigned vs unassigned.
 */
export async function getSectionStudentsForAdmin(
  department: string,
  year: string,
  section: string
): Promise<DBSectionStudent[]> {
  await ensureCounselorSchema();
  const query = `
    SELECT
      s.student_code,
      COALESCE(s.name, s.student_code) as name,
      COALESCE(s.status, 'Active') as status,
      cs.counselor_assignment_id,
      p.full_name as counselor_name
    FROM students s
    LEFT JOIN counselor_students cs
      ON UPPER(cs.student_code) = UPPER(s.student_code)
      AND cs.status = 'ACTIVE'
    LEFT JOIN counselor_assignments ca
      ON ca.id = cs.counselor_assignment_id
      AND ca.status = 'ACTIVE'
    LEFT JOIN profiles p ON p.id = ca.faculty_id
    WHERE UPPER(s.department) = UPPER($1)
      AND UPPER(s.year) = UPPER($2)
      AND UPPER(s.section) = UPPER($3)
      AND s.status = 'Active'
    ORDER BY s.student_code ASC;
  `;
  const res = await db.query<DBSectionStudent>(query, [department, year, section]);
  return res.rows;
}

/**
 * Gets all active students assigned to a specific counselor assignment.
 */
export async function getCounselorStudentsByAssignmentId(
  assignmentId: string
): Promise<DBAssignmentStudent[]> {
  await ensureCounselorSchema();
  const query = `
    SELECT
      cs.id,
      cs.student_code,
      COALESCE(s.name, cs.student_code) as name,
      COALESCE(s.status, 'Active') as status
    FROM counselor_students cs
    LEFT JOIN students s ON UPPER(s.student_code) = UPPER(cs.student_code)
    WHERE cs.counselor_assignment_id = $1
      AND cs.status = 'ACTIVE'
    ORDER BY cs.student_code ASC;
  `;
  const res = await db.query<DBAssignmentStudent>(query, [assignmentId]);
  return res.rows;
}

/**
 * Updates the student list for a counselor assignment.
 * - Students no longer in newStudentCodes → marked INACTIVE
 * - Students newly in newStudentCodes → inserted ACTIVE (previous active assignment in same section deactivated first)
 * Historical INACTIVE records are never deleted.
 */
export async function updateAssignmentStudents(
  assignmentId: string,
  newStudentCodes: string[]
): Promise<void> {
  await ensureCounselorSchema();
  const cleanCodes = newStudentCodes.map(c => c.trim().toUpperCase());

  // Get assignment context (dept/year/section) once
  const caRes = await db.query<{ department: string; year: string; section: string }>(
    `SELECT department, year, section FROM counselor_assignments WHERE id = $1;`,
    [assignmentId]
  );
  const ca = caRes.rows[0];
  if (!ca) throw new Error("Counselor assignment not found.");

  // Get currently active students for this assignment
  const currentRes = await db.query<{ student_code: string }>(
    `SELECT student_code FROM counselor_students WHERE counselor_assignment_id = $1 AND status = 'ACTIVE';`,
    [assignmentId]
  );
  const currentCodes = new Set<string>(currentRes.rows.map((r: { student_code: string }) => r.student_code.toUpperCase()));
  const targetCodes = new Set(cleanCodes);

  // Mark removed students INACTIVE
  for (const code of Array.from(currentCodes)) {
    if (!targetCodes.has(code)) {
      await db.query(
        `UPDATE counselor_students SET status = 'INACTIVE'
         WHERE counselor_assignment_id = $1 AND UPPER(student_code) = $2 AND status = 'ACTIVE';`,
        [assignmentId, String(code)]
      );
    }
  }

  // Insert newly added students
  for (const code of targetCodes) {
    if (!currentCodes.has(code)) {
      // Deactivate any other active mapping for this student in same section
      await db.query(
        `UPDATE counselor_students cs SET status = 'INACTIVE'
         FROM counselor_assignments ca2
         WHERE ca2.id = cs.counselor_assignment_id
           AND UPPER(cs.student_code) = $1
           AND UPPER(ca2.department) = UPPER($2)
           AND UPPER(ca2.year) = UPPER($3)
           AND UPPER(ca2.section) = UPPER($4)
           AND cs.counselor_assignment_id <> $5
           AND cs.status = 'ACTIVE';`,
        [code, ca.department, ca.year, ca.section, assignmentId]
      );

      // Check if already active for this assignment (avoid duplicate insert)
      const existCheck = await db.query(
        `SELECT id FROM counselor_students WHERE counselor_assignment_id = $1 AND UPPER(student_code) = $2 AND status = 'ACTIVE';`,
        [assignmentId, code]
      );
      if (existCheck.rows.length === 0) {
        const csId = `CS-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        await db.query(
          `INSERT INTO counselor_students (id, counselor_assignment_id, student_code, status, assigned_at)
           VALUES ($1, $2, $3, 'ACTIVE', NOW());`,
          [csId, assignmentId, code]
        );
      }
    }
  }
}

/**
 * Moves a single student from one counselor assignment to another.
 * Safe: marks old mapping INACTIVE, inserts new ACTIVE. Historical records are never deleted.
 */
export async function moveCounselorStudent(
  studentCode: string,
  fromAssignmentId: string,
  toAssignmentId: string
): Promise<void> {
  await ensureCounselorSchema();
  const cleanCode = studentCode.trim().toUpperCase();

  // Deactivate current mapping
  await db.query(
    `UPDATE counselor_students SET status = 'INACTIVE'
     WHERE counselor_assignment_id = $1 AND UPPER(student_code) = $2 AND status = 'ACTIVE';`,
    [fromAssignmentId, cleanCode]
  );

  // Insert new active mapping
  const csId = `CS-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  await db.query(
    `INSERT INTO counselor_students (id, counselor_assignment_id, student_code, status, assigned_at)
     VALUES ($1, $2, $3, 'ACTIVE', NOW());`,
    [csId, toAssignmentId, cleanCode]
  );
}

/**
 * Changes the faculty member for an existing counselor assignment.
 * All student mappings (counselor_students) remain intact.
 * Historical disciplinary ownership on violation_reports is NOT changed.
 */
export async function changeCounselorAssignmentFaculty(
  assignmentId: string,
  newFacultyId: string
): Promise<void> {
  await ensureCounselorSchema();
  const fCheck = await db.query(`SELECT id FROM profiles WHERE id = $1;`, [newFacultyId]);
  if (!fCheck.rows[0]) throw new Error("Faculty profile not found.");

  await db.query(
    `UPDATE counselor_assignments SET faculty_id = $1::uuid, updated_at = NOW() WHERE id = $2;`,
    [newFacultyId, assignmentId]
  );
}

// ──────────────────────────────────────────────────────────────
// Pass stats per counselor assignment (Admin overview)
// ──────────────────────────────────────────────────────────────

export type DBCounselorPassStats = {
  assignment_id: string;
  pending: number;
  approved: number;
  rejected: number;
  active_now: number;
  total: number;
};

/**
 * Batch query: returns movement-pass counts for each counselor assignment.
 * Uses a single SQL query to avoid N+1 per card.
 *
 * Status buckets:
 *   pending    → pass awaiting counselor/HOD approval
 *   approved   → counselor/HOD approved (not yet used / expired)
 *   rejected   → rejected by counselor or HOD
 *   active_now → currently within the valid window (date = today AND valid_from <= now <= valid_until)
 *   total      → all passes (any status) from students of this counselor
 */
export async function getCounselorPassStatsBatch(
  assignmentIds: string[]
): Promise<DBCounselorPassStats[]> {
  if (assignmentIds.length === 0) return [];
  await ensureCounselorSchema();

  const query = `
    SELECT
      ca.id AS assignment_id,
      COUNT(mp.id) FILTER (
        WHERE LOWER(mp.status::text) IN ('pending', 'counselor_pending', 'hod_pending')
      )::int AS pending,
      COUNT(mp.id) FILTER (
        WHERE LOWER(mp.status::text) IN ('approved', 'counselor_approved', 'hod_approved', 'granted')
      )::int AS approved,
      COUNT(mp.id) FILTER (
        WHERE LOWER(mp.status::text) IN ('rejected', 'counselor_rejected', 'hod_rejected', 'denied')
      )::int AS rejected,
      COUNT(mp.id) FILTER (
        WHERE LOWER(mp.status::text) IN ('approved', 'counselor_approved', 'hod_approved', 'granted')
          AND mp.date = CURRENT_DATE
          AND NOW()::time >= (mp.valid_from::time)
          AND NOW()::time <= (mp.valid_until::time)
      )::int AS active_now,
      COUNT(mp.id)::int AS total
    FROM counselor_assignments ca
    LEFT JOIN counselor_students cs
      ON cs.counselor_assignment_id = ca.id
      AND cs.status = 'ACTIVE'
    LEFT JOIN movement_permissions mp
      ON UPPER(mp.student_code) = UPPER(cs.student_code)
    WHERE ca.id = ANY($1::text[])
    GROUP BY ca.id;
  `;

  const res = await db.query<DBCounselorPassStats>(query, [assignmentIds]);
  return res.rows;
}

// ──────────────────────────────────────────────────────────────
// Detailed pass list per counselor assignment (Admin drill-down)
// ──────────────────────────────────────────────────────────────

export type DBCounselorPassDetail = {
  pass_id: string;
  student_code: string;
  student_name: string;
  department: string | null;
  year: string | null;
  section: string | null;
  reason: string;
  date: string;
  valid_from: string;
  valid_until: string;
  status: string;
  issued_by: string | null;
  target_role: string | null;
  created_at: string;
  is_active_now: boolean;
};

/**
 * Returns full pass rows for all students assigned to a counselor assignment.
 * Optionally filtered by status bucket: 'pending' | 'approved' | 'rejected' | 'active' | 'all'.
 */
export async function getCounselorPassesDetailedForAdmin(
  assignmentId: string,
  statusFilter: "all" | "pending" | "approved" | "rejected" | "active" = "all"
): Promise<DBCounselorPassDetail[]> {
  await ensureCounselorSchema();

  const conditions: string[] = [
    `cs.counselor_assignment_id = $1`,
    `cs.status = 'ACTIVE'`,
  ];
  const params: unknown[] = [assignmentId];

  if (statusFilter === "pending") {
    conditions.push(`LOWER(mp.status::text) IN ('pending', 'counselor_pending', 'hod_pending')`);
  } else if (statusFilter === "approved") {
    conditions.push(`LOWER(mp.status::text) IN ('approved', 'counselor_approved', 'hod_approved', 'granted')`);
  } else if (statusFilter === "rejected") {
    conditions.push(`LOWER(mp.status::text) IN ('rejected', 'counselor_rejected', 'hod_rejected', 'denied')`);
  } else if (statusFilter === "active") {
    conditions.push(`LOWER(mp.status::text) IN ('approved', 'counselor_approved', 'hod_approved', 'granted')`);
    conditions.push(`mp.date = CURRENT_DATE`);
    conditions.push(`NOW()::time >= mp.valid_from::time`);
    conditions.push(`NOW()::time <= mp.valid_until::time`);
  }

  const query = `
    SELECT
      mp.id::text                                          AS pass_id,
      mp.student_code,
      COALESCE(s.name, mp.student_code)                   AS student_name,
      COALESCE(s.department, ca.department)               AS department,
      COALESCE(s.year, ca.year)                           AS year,
      COALESCE(s.section, ca.section)                     AS section,
      mp.reason,
      to_char(mp.date, 'YYYY-MM-DD')                      AS date,
      mp.valid_from::text                                  AS valid_from,
      mp.valid_until::text                                 AS valid_until,
      LOWER(mp.status::text)                              AS status,
      mp.issued_by,
      COALESCE(mp.target_role, 'counselor')::text         AS target_role,
      mp.created_at::text                                  AS created_at,
      (
        mp.date = CURRENT_DATE
        AND NOW()::time >= mp.valid_from::time
        AND NOW()::time <= mp.valid_until::time
        AND LOWER(mp.status::text) IN ('approved', 'counselor_approved', 'hod_approved', 'granted')
      )                                                    AS is_active_now
    FROM counselor_students cs
    JOIN counselor_assignments ca ON ca.id = cs.counselor_assignment_id
    JOIN movement_permissions mp ON UPPER(mp.student_code) = UPPER(cs.student_code)
    LEFT JOIN students s ON UPPER(s.student_code) = UPPER(cs.student_code)
    WHERE ${conditions.join(" AND ")}
    ORDER BY mp.created_at DESC;
  `;

  const res = await db.query<DBCounselorPassDetail>(query, params);
  return res.rows;
}
