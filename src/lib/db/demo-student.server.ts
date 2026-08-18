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

    // 1. Ensure Demo Student 1: Ashok Dora (23CSE1012 / student@cmadms.edu)
    const st1Check = await db.query(`SELECT student_code FROM students WHERE UPPER(student_code) = '23CSE1012';`);
    if (st1Check.rows.length === 0) {
      await db.query(
        `INSERT INTO students (student_code, name, department, year, section, semester, status)
         VALUES ('23CSE1012', 'Ashok Dora', 'CSE', '3rd Year', 'Section A', 6, 'Active');`
      );
    }

    const p1Check = await db.query(`SELECT id::text FROM profiles WHERE UPPER(email) = 'STUDENT@CMADMS.EDU' OR UPPER(student_code) = '23CSE1012';`);
    let user1Id: string | null = null;
    if (p1Check.rows.length > 0) {
      user1Id = p1Check.rows[0].id;
      await db.query(
        `UPDATE profiles SET password_hash = $1, student_code = '23CSE1012' WHERE id = $2;`,
        [passwordHash, user1Id]
      );
    } else {
      const p1Res = await db.query(
        `INSERT INTO profiles (full_name, email, department, student_code, password_hash)
         VALUES ('Ashok Dora', 'student@cmadms.edu', 'CSE', '23CSE1012', $1)
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
        `UPDATE profiles SET password_hash = $1, student_code = '23CSE9999' WHERE id = $2;`,
        [passwordHash, user2Id]
      );
    } else {
      const p2Res = await db.query(
        `INSERT INTO profiles (full_name, email, department, student_code, password_hash)
         VALUES ('Rahul Sharma (Demo Student)', 'student.demo@campus.edu', 'CSE', '23CSE9999', $1)
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
      email: "student@cmadms.edu",
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
      email: "student@cmadms.edu",
      role: "student",
      samplePassId: "99999999-9999-4999-a999-999999999999",
      sampleReportId: "RPT-890453",
    };
  }
}
