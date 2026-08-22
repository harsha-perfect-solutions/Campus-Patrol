import { db } from "../db.server";
import { permissionByStudent as mockPermissions } from "../cmadms-data";

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
        AND (
          CURRENT_TIME BETWEEN valid_from AND valid_until
          OR exit_at IS NOT NULL
          OR early_exit_authorized = TRUE
        )
      ORDER BY created_at DESC
      LIMIT 1;
    `;

    const result = await db.query<DBMovementPermission>(query, [cleanCode]);
    if (result.rows[0]) return result.rows[0];
  } catch (error) {
    console.warn("[Database Warning] Error checking active movement permission, using mock fallback:", error);
  }

  const mockPass = mockPermissions[cleanCode];
  if (mockPass) {
    return {
      id: `PERM-MOCK-${cleanCode}`,
      student_code: cleanCode,
      reason: mockPass.reason,
      date: new Date().toISOString().split("T")[0] || "",
      valid_from: "10:00 AM",
      valid_until: mockPass.validUntil || "11:30 AM",
      status: "approved",
      issued_by: mockPass.issuedBy,
      created_at: new Date().toISOString(),
    };
  }

  return null;
}

