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
  qr_token: string | null;
};

/**
 * Retrieves a single student by student_code (roll number) from PostgreSQL.
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
        photo_url,
        qr_token
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

/**
 * Retrieves a single student by unique opaque qr_token.
 */
export async function getStudentByQrToken(qrToken: string): Promise<DBStudent | null> {
  const cleanToken = qrToken.trim();
  if (!cleanToken) return null;

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
        photo_url,
        qr_token
      FROM students
      WHERE UPPER(qr_token) = UPPER($1)
      LIMIT 1;
    `;

    const result = await db.query<DBStudent>(query, [cleanToken]);
    return result.rows[0] ?? null;
  } catch (error) {
    console.error("[Database Error] Error fetching student by QR token:", error);
    return null;
  }
}

/**
 * Resolves a student from either a QR Token (CMADMS-ID-...) or a Student Roll Number.
 */
export async function resolveStudentByQuery(input: string): Promise<DBStudent | null> {
  const clean = input.trim();
  if (!clean) return null;

  // 1. Try QR token lookup
  if (clean.toUpperCase().startsWith("CMADMS-ID-") || clean.length >= 16) {
    const byQr = await getStudentByQrToken(clean);
    if (byQr) return byQr;
  }

  // 2. Try Roll Number lookup
  const byCode = await getStudentByRollNo(clean);
  if (byCode) return byCode;

  // 3. Fallback: try raw QR token match without prefix
  const fallbackQr = await getStudentByQrToken(`CMADMS-ID-${clean.toUpperCase()}`);
  return fallbackQr;
}

