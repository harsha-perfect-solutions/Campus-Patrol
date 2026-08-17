import { db } from "../db.server";
import {
  findStudentUserIdByCode,
  createNotificationServer,
} from "./notifications.server";

export type DBPermission = {
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

export type NewPermissionInput = {
  studentCode: string;
  reason: string;
  validFrom: string;
  validUntil: string;
  issuedBy: string;
};

/**
 * Retrieves all movement permissions for a student by student_code.
 */
export async function getPermissionsByStudentCode(studentCode: string): Promise<DBPermission[]> {
  const cleanCode = studentCode.trim().toUpperCase();
  if (!cleanCode) return [];

  try {
    const query = `
      SELECT
        id::text,
        student_code,
        reason,
        to_char(date, 'YYYY-MM-DD') AS date,
        valid_from::text,
        valid_until::text,
        status,
        issued_by,
        created_at::text
      FROM movement_permissions
      WHERE UPPER(student_code) = $1
      ORDER BY created_at DESC;
    `;
    const result = await db.query<DBPermission>(query, [cleanCode]);
    return result.rows;
  } catch (error) {
    console.error("[Database Error] Error fetching movement permissions:", error);
    throw new Error("Failed to query movement permissions.");
  }
}

/**
 * Creates a new movement permission in PostgreSQL database.
 */
export async function createMovementPermission(input: NewPermissionInput): Promise<DBPermission> {
  const cleanCode = input.studentCode.trim().toUpperCase();
  try {
    const query = `
      INSERT INTO movement_permissions (
        student_code,
        reason,
        date,
        valid_from,
        valid_until,
        status,
        issued_by
      ) VALUES ($1, $2, CURRENT_DATE, $3::time, $4::time, 'approved', $5)
      RETURNING
        id::text,
        student_code,
        reason,
        to_char(date, 'YYYY-MM-DD') AS date,
        valid_from::text,
        valid_until::text,
        status,
        issued_by,
        created_at::text;
    `;
    const values = [cleanCode, input.reason, input.validFrom, input.validUntil, input.issuedBy];
    const result = await db.query<DBPermission>(query, values);
    if (!result.rows[0]) {
      throw new Error("Failed to return created permission row.");
    }
    return result.rows[0];
  } catch (error) {
    console.error("[Database Error] Error creating movement permission:", error);
    throw new Error("Failed to insert movement permission.");
  }
}

/**
 * Admin / HOD: Approves or rejects a student's pending movement permission.
 */
export async function approveMovementPermission(
  passId: string,
  newStatus: "approved" | "rejected",
  approverName: string,
): Promise<DBPermission> {
  const cleanId = passId.trim();
  try {
    const query = `
      UPDATE movement_permissions
      SET status = $1, issued_by = $2
      WHERE id::text = $3
      RETURNING
        id::text,
        student_code,
        reason,
        to_char(date, 'YYYY-MM-DD') AS date,
        valid_from::text,
        valid_until::text,
        status,
        issued_by,
        created_at::text;
    `;
    const res = await db.query<DBPermission>(query, [newStatus, approverName, cleanId]);
    const updated = res.rows[0];
    if (!updated) {
      throw new Error(`Movement permission ${cleanId} not found.`);
    }

    // Notify the specific student about the approval/rejection
    const studentUserId = await findStudentUserIdByCode(updated.student_code);
    if (studentUserId) {
      const isApproved = newStatus === "approved";
      await createNotificationServer({
        recipientUserId: studentUserId,
        recipientRole: "student",
        recipientId: updated.student_code,
        type: isApproved ? "gate_pass_approved" : "gate_pass_rejected",
        title: isApproved ? "Gate Pass Approved ✅" : "Gate Pass Rejected ❌",
        detail: isApproved
          ? `Your gate pass request has been approved by ${approverName}. Reason: ${updated.reason?.slice(0, 80) ?? ""}`
          : `Your gate pass request has been rejected by ${approverName}. Please contact your HOD for further information.`,
        tone: isApproved ? "resolved" : "violation",
        relatedId: cleanId,
        relatedType: "movement_permission",
      });
    }

    return updated;
  } catch (error) {
    console.error("[Database Error] Error approving movement permission:", error);
    throw new Error("Failed to update movement permission status.");
  }
}
