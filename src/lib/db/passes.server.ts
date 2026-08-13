import { db } from "../db.server";

export type DBMovementPermission = {
  id: string;
  student_code: string;
  reason: string;
  date: string;
  valid_from: string;
  valid_until: string;
  status: "pending" | "approved" | "rejected";
  issued_by: string;
  created_at: string;
};

/**
 * Checks PostgreSQL movement_permissions table for an active, approved pass
 * valid for the current date and time for the given student roll number.
 */
export async function getActiveMovementPermission(
  studentCode: string,
): Promise<DBMovementPermission | null> {
  const cleanCode = studentCode.trim().toUpperCase();
  if (!cleanCode) return null;

  try {
    const query = `
      SELECT
        id,
        student_code,
        reason,
        to_char(date, 'YYYY-MM-DD') AS date,
        valid_from::text,
        valid_until::text,
        status,
        issued_by,
        created_at
      FROM movement_permissions
      WHERE UPPER(student_code) = $1
        AND status = 'approved'
        AND date = CURRENT_DATE
        AND CURRENT_TIME BETWEEN valid_from AND valid_until
      ORDER BY created_at DESC
      LIMIT 1;
    `;

    const result = await db.query<DBMovementPermission>(query, [cleanCode]);
    return result.rows[0] ?? null;
  } catch (error) {
    console.error("[Database Error] Error checking active movement permission:", error);
    throw new Error("Failed to query active movement permission.");
  }
}
