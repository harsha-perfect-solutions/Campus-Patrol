import { db } from "../db.server";
import { students as mockStudents } from "../cmadms-data";

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
    if (result.rows[0]) return result.rows[0];
  } catch (error) {
    console.warn("[Database Warning] Error fetching student by roll number, using mock fallback:", error);
  }

  // Fallback to in-memory mock students data
  const mockFound = mockStudents.find((s) => s.id.toUpperCase() === cleanCode);
  if (mockFound) {
    return {
      student_code: mockFound.id,
      name: mockFound.name,
      department: mockFound.department,
      year: mockFound.year,
      section: mockFound.section,
      semester: mockFound.semester,
      status: mockFound.status,
      photo_url: null,
      qr_token: `CMADMS-ID-${mockFound.id}`,
    };
  }

  return null;
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
    if (result.rows[0]) return result.rows[0];
  } catch (error) {
    console.warn("[Database Warning] Error fetching student by QR token, using mock fallback:", error);
  }

  const codeFromToken = cleanToken.replace(/^CMADMS-ID-/i, "").trim().toUpperCase();
  const mockFound = mockStudents.find((s) => s.id.toUpperCase() === codeFromToken);
  if (mockFound) {
    return {
      student_code: mockFound.id,
      name: mockFound.name,
      department: mockFound.department,
      year: mockFound.year,
      section: mockFound.section,
      semester: mockFound.semester,
      status: mockFound.status,
      photo_url: null,
      qr_token: `CMADMS-ID-${mockFound.id}`,
    };
  }

  return null;
}

/**
 * Resolves a student from a QR Token, URL, JSON payload, or Student Roll Number.
 */
export async function resolveStudentByQuery(input: string): Promise<DBStudent | null> {
  let clean = input.trim();
  if (!clean) return null;

  // 1. Try URL parsing
  try {
    if (clean.startsWith("http://") || clean.startsWith("https://")) {
      const url = new URL(clean);
      const param =
        url.searchParams.get("student") ||
        url.searchParams.get("code") ||
        url.searchParams.get("id") ||
        url.searchParams.get("rollNo");
      if (param) clean = param.trim();
    }
  } catch {
    // Ignore URL parse error
  }

  // 2. Try JSON parsing
  if (clean.startsWith("{") && clean.endsWith("}")) {
    try {
      const parsed = JSON.parse(clean);
      const code =
        parsed.student_code ||
        parsed.studentCode ||
        parsed.student_id ||
        parsed.id ||
        parsed.rollNo;
      if (code && typeof code === "string") clean = code.trim();
    } catch {
      // Ignore JSON parse error
    }
  }

  // 3. Extract Roll Number regex match if present (e.g. 23CSE1012, 22ECE045, etc.)
  const rollMatch = clean.match(/[0-9]{2}[A-Za-z]{3,4}[0-9]{3,4}/);
  const targetCode = rollMatch ? rollMatch[0].toUpperCase() : clean.toUpperCase();

  // 4. Try Roll Number lookup
  const byCode = await getStudentByRollNo(targetCode);
  if (byCode) return byCode;

  // 5. Try QR token lookup
  const byQr = await getStudentByQrToken(clean);
  if (byQr) return byQr;

  // 6. Try fallback prefix
  const fallbackQr = await getStudentByQrToken(`CMADMS-ID-${targetCode}`);
  if (fallbackQr) return fallbackQr;

  // 7. Last resort: search mock data for match
  const mockFound = mockStudents.find(
    (s) => s.id.toUpperCase() === targetCode || targetCode.includes(s.id.toUpperCase()),
  );
  if (mockFound) {
    return {
      student_code: mockFound.id,
      name: mockFound.name,
      department: mockFound.department,
      year: mockFound.year,
      section: mockFound.section,
      semester: mockFound.semester,
      status: mockFound.status,
      photo_url: null,
      qr_token: `CMADMS-ID-${mockFound.id}`,
    };
  }

  return null;
}


