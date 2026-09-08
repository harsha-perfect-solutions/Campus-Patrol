import { db } from "../db.server";
import { hashPassword } from "../session.server";

export type DemoStudentDetails = {
  studentCode: string;
  name: string;
  department: string;
  year: string;
  section: string;
  semester: number;
  email: string;
  role: "student";
  samplePassId: string;
  sampleReportId: string;
};

/**
 * Seeds and ensures demo student records exist in PostgreSQL database for validation testing.
 */
export async function seedDemoStudentAccount(): Promise<DemoStudentDetails> {
  try {
    const passwordHash = await hashPassword("Password123!");

    // 1. Ensure Demo Student 1: Ashok Dora (23CSE1012 / chodiashokdora278@gmail.com)
    const st1Check = await db.query(`SELECT student_code FROM students WHERE UPPER(student_code) = '23CSE1012';`);
    if (st1Check.rows.length === 0) {
      await db.query(
        `INSERT INTO students (student_code, name, department, year, section, semester, status)
         VALUES ('23CSE1012', 'Ashok Dora', 'CSE', '3rd Year', 'Section A', 6, 'Active');`
      );
    }

    const p1Check = await db.query(`SELECT id::text FROM profiles WHERE UPPER(email) IN ('STUDENT@CMADMS.EDU', 'CHODIASHOKDORA278@GMAIL.COM') OR UPPER(student_code) = '23CSE1012';`);
    let user1Id: string | null = null;
    if (p1Check.rows.length > 0) {
      user1Id = p1Check.rows[0].id;
      await db.query(
        `UPDATE profiles SET email = 'chodiashokdora278@gmail.com', full_name = 'Ashok Dora', password_hash = $1, must_change_password = FALSE, status = 'Active', student_code = '23CSE1012' WHERE id = $2;`,
        [passwordHash, user1Id]
      );
    } else {
      const p1Res = await db.query(
        `INSERT INTO profiles (full_name, email, department, student_code, password_hash, must_change_password, status)
         VALUES ('Ashok Dora', 'chodiashokdora278@gmail.com', 'CSE', '23CSE1012', $1, FALSE, 'Active')
         RETURNING id::text;`,
        [passwordHash]
      );
      user1Id = p1Res.rows[0]?.id || null;
    }

    if (user1Id) {
      const r1 = await db.query(`SELECT user_id FROM user_roles WHERE user_id = $1;`, [user1Id]);
      if (r1.rows.length === 0) {
        await db.query(`INSERT INTO user_roles (user_id, role) VALUES ($1, 'student');`, [user1Id]);
      }
    }

    // 2. Ensure Demo Student 2: Rahul Sharma (23CSE9999 / student.demo@campus.edu)
    const st2Check = await db.query(`SELECT student_code FROM students WHERE UPPER(student_code) = '23CSE9999';`);
    if (st2Check.rows.length === 0) {
      await db.query(
        `INSERT INTO students (student_code, name, department, year, section, semester, status)
         VALUES ('23CSE9999', 'Rahul Sharma (Demo Student)', 'CSE', '3rd Year', 'Section A', 6, 'Active');`
      );
    }

    const p2Check = await db.query(`SELECT id::text FROM profiles WHERE UPPER(email) = 'STUDENT.DEMO@CAMPUS.EDU' OR UPPER(student_code) = '23CSE9999';`);
    let user2Id: string | null = null;
    if (p2Check.rows.length > 0) {
      user2Id = p2Check.rows[0].id;
      await db.query(
        `UPDATE profiles SET password_hash = COALESCE(password_hash, $1), status = 'Active', student_code = '23CSE9999' WHERE id = $2;`,
        [passwordHash, user2Id]
      );
    } else {
      const p2Res = await db.query(
        `INSERT INTO profiles (full_name, email, department, student_code, password_hash, must_change_password, status)
         VALUES ('Rahul Sharma (Demo Student)', 'student.demo@campus.edu', 'CSE', '23CSE9999', $1, FALSE, 'Active')
         RETURNING id::text;`,
        [passwordHash]
      );
      user2Id = p2Res.rows[0]?.id || null;
    }

    if (user2Id) {
      const r2 = await db.query(`SELECT user_id FROM user_roles WHERE user_id = $1;`, [user2Id]);
      if (r2.rows.length === 0) {
        await db.query(`INSERT INTO user_roles (user_id, role) VALUES ($1, 'student');`, [user2Id]);
      }
    }

    // 2b. Ensure Demo Security Account: security@cmadms.edu
    const pSecCheck = await db.query(`SELECT id::text FROM profiles WHERE UPPER(email) = 'SECURITY@CMADMS.EDU';`);
    let secUserId: string | null = null;
    if (pSecCheck.rows.length > 0) {
      secUserId = pSecCheck.rows[0].id;
      await db.query(
        `UPDATE profiles SET password_hash = COALESCE(password_hash, $1), status = 'Active', department = 'Main Gate', assigned_post = 'Main Gate' WHERE id = $2;`,
        [passwordHash, secUserId]
      );
    } else {
      const pSecRes = await db.query(
        `INSERT INTO profiles (full_name, email, department, staff_code, assigned_post, password_hash, must_change_password, status)
         VALUES ('Security Officer Rajesh', 'security@cmadms.edu', 'Main Gate', 'SEC-001', 'Main Gate', $1, FALSE, 'Active')
         RETURNING id::text;`,
        [passwordHash]
      );
      secUserId = pSecRes.rows[0]?.id || null;
    }
    if (secUserId) {
      const rSec = await db.query(`SELECT user_id FROM user_roles WHERE user_id = $1;`, [secUserId]);
      if (rSec.rows.length === 0) {
        await db.query(`INSERT INTO user_roles (user_id, role) VALUES ($1, 'security');`, [secUserId]);
      } else {
        await db.query(`UPDATE user_roles SET role = 'security' WHERE user_id = $1;`, [secUserId]);
      }
    }

    // 2c. Ensure Demo Faculty Account: faculty@cmadms.edu
    const pFacCheck = await db.query(`SELECT id::text FROM profiles WHERE UPPER(email) = 'FACULTY@CMADMS.EDU';`);
    let facUserId: string | null = null;
    if (pFacCheck.rows.length > 0) {
      facUserId = pFacCheck.rows[0].id;
      await db.query(`UPDATE profiles SET password_hash = COALESCE(password_hash, $1), status = 'Active' WHERE id = $2;`, [passwordHash, facUserId]);
    } else {
      const pFacRes = await db.query(
        `INSERT INTO profiles (full_name, email, department, staff_code, password_hash, must_change_password, status)
         VALUES ('Prof. Ravi Kumar', 'faculty@cmadms.edu', 'AIML', 'F-101', $1, FALSE, 'Active')
         RETURNING id::text;`,
        [passwordHash]
      );
      facUserId = pFacRes.rows[0]?.id || null;
    }
    if (facUserId) {
      const rFac = await db.query(`SELECT user_id FROM user_roles WHERE user_id = $1;`, [facUserId]);
      if (rFac.rows.length === 0) {
        await db.query(`INSERT INTO user_roles (user_id, role) VALUES ($1, 'faculty');`, [facUserId]);
      } else {
        await db.query(`UPDATE user_roles SET role = 'faculty' WHERE user_id = $1;`, [facUserId]);
      }
    }

    // 2d. Ensure Demo HOD Account: hod.cse@cmadms.edu
    const pHodCheck = await db.query(`SELECT id::text FROM profiles WHERE UPPER(email) = 'HOD.CSE@CMADMS.EDU';`);
    let hodUserId: string | null = null;
    if (pHodCheck.rows.length > 0) {
      hodUserId = pHodCheck.rows[0].id;
      await db.query(`UPDATE profiles SET password_hash = COALESCE(password_hash, $1), status = 'Active' WHERE id = $2;`, [passwordHash, hodUserId]);
    } else {
      const pHodRes = await db.query(
        `INSERT INTO profiles (full_name, email, department, staff_code, password_hash, must_change_password, status)
         VALUES ('Dr. K. V. Sharma (HOD CSE)', 'hod.cse@cmadms.edu', 'CSE', 'HOD-CSE', $1, FALSE, 'Active')
         RETURNING id::text;`,
        [passwordHash]
      );
      hodUserId = pHodRes.rows[0]?.id || null;
    }
    if (hodUserId) {
      const rHod = await db.query(`SELECT user_id FROM user_roles WHERE user_id = $1;`, [hodUserId]);
      if (rHod.rows.length === 0) {
        await db.query(`INSERT INTO user_roles (user_id, role) VALUES ($1, 'hod');`, [hodUserId]);
      } else {
        await db.query(`UPDATE user_roles SET role = 'hod' WHERE user_id = $1;`, [hodUserId]);
      }
    }

    // 2e. Ensure Demo Admin Account: admin@cmadms.edu
    const pAdmCheck = await db.query(`SELECT id::text FROM profiles WHERE UPPER(email) = 'ADMIN@CMADMS.EDU';`);
    let admUserId: string | null = null;
    if (pAdmCheck.rows.length > 0) {
      admUserId = pAdmCheck.rows[0].id;
      await db.query(`UPDATE profiles SET password_hash = COALESCE(password_hash, $1), status = 'Active' WHERE id = $2;`, [passwordHash, admUserId]);
    } else {
      const pAdmRes = await db.query(
        `INSERT INTO profiles (full_name, email, department, staff_code, password_hash, must_change_password, status)
         VALUES ('System Administrator', 'admin@cmadms.edu', 'ADMIN', 'ADM-001', $1, FALSE, 'Active')
         RETURNING id::text;`,
        [passwordHash]
      );
      admUserId = pAdmRes.rows[0]?.id || null;
    }
    if (admUserId) {
      const rAdm = await db.query(`SELECT user_id FROM user_roles WHERE user_id = $1;`, [admUserId]);
      if (rAdm.rows.length === 0) {
        await db.query(`INSERT INTO user_roles (user_id, role) VALUES ($1, 'admin');`, [admUserId]);
      } else {
        await db.query(`UPDATE user_roles SET role = 'admin' WHERE user_id = $1;`, [admUserId]);
      }
    }

    // 3. Ensure Sample Violation Report for 23CSE1012 (RPT-890453)
    const rptCheck = await db.query(`SELECT id FROM violation_reports WHERE id = 'RPT-890453';`);
    if (rptCheck.rows.length === 0) {
      const now = new Date();
      const deadline = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      await db.query(
        `INSERT INTO violation_reports (
           id, student_code, student_name, department, year_section,
           class_name, scheduled_time, room, incident_time, location,
           remarks, reported_by, status, explanation_deadline, created_at
         ) VALUES (
           'RPT-890453', '23CSE1012', 'Ashok Dora', 'CSE', '3rd Year • Section A',
           'Data Structures (CS-304)', '10:00 AM - 11:00 AM', 'Room C-204', '10:42 AM', 'Main Corridor — Block C',
           'Student observed roaming near cafeteria during scheduled Data Structures session without valid movement pass.',
           'Prof. Ravi Kumar', 'awaiting_explanation', $1, $2
         );`,
        [deadline.toISOString(), now.toISOString()]
      );
    }

    // 4. Ensure Sample Movement Pass for 23CSE1012 (99999999-9999-4999-a999-999999999999)
    const passCheck = await db.query(`SELECT id FROM movement_permissions WHERE student_code = '23CSE1012' AND status = 'approved' AND date = CURRENT_DATE LIMIT 1;`);
    let samplePassId = "99999999-9999-4999-a999-999999999999";
    if (passCheck.rows.length === 0) {
      const passIns = await db.query(
        `INSERT INTO movement_permissions (
           student_code, reason, date, valid_from, valid_until, status, issued_by, created_at
         ) VALUES (
           '23CSE1012', 'Library — Reference Book Issue', CURRENT_DATE,
           '10:00:00', '12:00:00', 'approved', 'Dr. Anjali Rao (HOD CSE)', NOW()
         ) RETURNING id::text;`
      );
      samplePassId = passIns.rows[0]?.id || samplePassId;
    } else {
      samplePassId = passCheck.rows[0].id;
    }

    // 5. Ensure Class Schedule for 23CSE1012
    const schedCheck = await db.query(`SELECT id FROM class_schedules WHERE student_code = '23CSE1012' LIMIT 1;`);
    if (schedCheck.rows.length === 0) {
      await db.query(
        `INSERT INTO class_schedules (
           student_code, subject_code, subject, start_time, end_time, room, faculty_name, day_of_week, batch
         ) VALUES (
           '23CSE1012', 'CS-304', 'Data Structures & Algorithms', '10:00:00', '11:00:00', 'Room C-204', 'Prof. Ravi Kumar', 'Monday', 'CSE-3A'
         );`
      );
    }

    return {
      studentCode: "23CSE1012",
      name: "Ashok Dora (Demo Validation Student)",
      department: "CSE",
      year: "3rd Year",
      section: "Section A",
      semester: 6,
      email: "chodiashokdora278@gmail.com",
      role: "student",
      samplePassId: samplePassId,
      sampleReportId: "RPT-890453",
    };
  } catch (error) {
    console.error("[Seed Warning] Failed to seed demo student account:", error);
    return {
      studentCode: "23CSE1012",
      name: "Ashok Dora",
      department: "CSE",
      year: "3rd Year",
      section: "Section A",
      semester: 6,
      email: "chodiashokdora278@gmail.com",
      role: "student",
      samplePassId: "99999999-9999-4999-a999-999999999999",
      sampleReportId: "RPT-890453",
    };
  }
}
