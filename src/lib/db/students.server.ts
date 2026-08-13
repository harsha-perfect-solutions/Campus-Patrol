import { db } from "../db.server";

export type DBStudent = {
  student_code: string;
  name: string;
  department: string;
  year: string;
  section: string;
  semester: number;
  status: string;
  photo_url: string | null;
};

/**
 * Retrieves a single student by student_code (roll number) from Docker PostgreSQL database.
 * Uses parameterized queries to prevent SQL injection.
 */
export async function getStudentByRollNo(studentCode: string): Promise<DBStudent | null> {
  const cleanCode = studentCode.trim().toUpperCase();
  if (!cleanCode) return null;

  try {
    const query = `
      SELECT
        student_code,
        name,
        department,
        year,
        section,
        semester,
        status,
        photo_url
      FROM students
      WHERE UPPER(student_code) = $1
      LIMIT 1;
    `;

    const result = await db.query<DBStudent>(query, [cleanCode]);
    return result.rows[0] ?? null;
  } catch (error) {
    console.error("[Database Error] Error fetching student by roll number:", error);
    throw new Error("Failed to query student database record.");
  }
}

export const getStudentByCode = getStudentByRollNo;
