import { db } from "../db.server";

// ─── Notification Types ────────────────────────────────────────────────────

export type NotificationType =
  | "violation_report_created"
  | "critical_incident"
  | "critical_security_alert"
  | "emergency_reported"
  | "emergency_response_required"
  | "emergency_responder_assigned"
  | "emergency_controlled"
  | "emergency_resolved"
  | "student_explanation_submitted"
  | "violation_review_started"
  | "violation_resolved"
  | "violation_dismissed"
  | "violation_escalated"
  | "gate_pass_requested"
  | "movement_pass_requested"
  | "gate_pass_approved"
  | "movement_pass_approved"
  | "gate_pass_rejected"
  | "movement_pass_rejected"
  | "movement_pass_cancelled"
  | "movement_pass_revoked"
  | "gate_exit_authorized"
  | "gate_entry_verified"
  | "gate_exit_denied"
  | "violation_decision_updated"
  | "info";

export type NotificationTone = "violation" | "pending" | "resolved" | "info";

export type DBNotification = {
  id: string;
  recipientUserId: string | null;
  recipientRole: string;
  recipientId: string | null;
  department: string | null;
  type: NotificationType;
  title: string;
  detail: string;
  tone: NotificationTone;
  read: boolean;
  relatedId: string | null;
  relatedType: string | null;
  /** @deprecated use relatedId instead */
  relatedReportId: string | null;
  createdAt: string;
};

export type CreateNotificationInput = {
  recipientUserId?: string | null;
  type: NotificationType;
  title: string;
  detail: string;
  tone: NotificationTone;
  relatedId?: string | null;
  relatedType?: string | null;
  // Legacy / Routing fields
  recipientRole?: string;
  department?: string;
  recipientId?: string | null;
};

// ─── Recipient Lookup Helpers ──────────────────────────────────────────────

/**
 * Server-side: Given a student_code, resolves student's actual department
 * and then finds the HOD's profile.id for that department.
 * Returns null if no HOD found for department.
 */
export async function findHodUserIdForStudentCode(
  studentCode: string,
): Promise<string | null> {
  const cleanCode = studentCode.trim().toUpperCase();

  try {
    // 1. Get student's actual department from DB (not from client)
    const studentRes = await db.query<{ department: string }>(
      "SELECT department FROM students WHERE UPPER(student_code) = UPPER($1) LIMIT 1",
      [cleanCode],
    );
    const dept = studentRes.rows[0]?.department;
    if (!dept) {
      console.warn(
        `[Notification] No student found for code ${cleanCode}, cannot resolve HOD`,
      );
      return null;
    }

    // 2. Look up HOD user ID for that department
    return await findHodUserIdForDepartment(dept);
  } catch (err) {
    console.error(
      "[Notification] Error resolving HOD for student code:",
      err,
    );
    return null;
  }
}

/**
 * Server-side: Given a department string, finds the HOD profile.id.
 * Returns null if no HOD account found.
 */
export async function findHodUserIdForDepartment(
  department: string,
): Promise<string | null> {
  const cleanDept = department.trim().toUpperCase();

  try {
    const res = await db.query<{ id: string }>(
      `SELECT p.id
       FROM profiles p
       JOIN user_roles ur ON ur.user_id = p.id
       WHERE UPPER(p.department) = $1
         AND ur.role = 'hod'
       LIMIT 1`,
      [cleanDept],
    );
    if (res.rows[0]?.id) return res.rows[0].id;

    // Fallback: search profile directly
    const fallback = await db.query<{ id: string }>(
      `SELECT id FROM profiles WHERE UPPER(department) = $1 AND role = 'hod' LIMIT 1`,
      [cleanDept]
    );
    return fallback.rows[0]?.id ?? null;
  } catch (err) {
    console.error(
      "[Notification] Error looking up HOD user ID for department:",
      err,
    );
    return null;
  }
}

/**
 * Server-side: Finds a faculty user ID by name or email.
 */
export async function findFacultyUserIdByName(facultyName: string): Promise<string | null> {
  const clean = facultyName.trim();
  if (!clean) return null;

  try {
    const res = await db.query<{ id: string }>(
      `SELECT id FROM profiles WHERE LOWER(full_name) = LOWER($1) OR LOWER(email) = LOWER($1) LIMIT 1;`,
      [clean],
    );
    return res.rows[0]?.id ?? null;
  } catch (err) {
    console.error("[Notification] Error looking up faculty user ID:", err);
    return null;
  }
}

/**
 * Server-side: Given a student_code, finds the student's profile.id (user account id).
 * If no profile account exists yet, falls back to student_code so student can receive notifications.
 */
export async function findStudentUserIdByCode(
  studentCode: string,
): Promise<string> {
  const cleanCode = studentCode.trim().toUpperCase();

  try {
    const res = await db.query<{ id: string }>(
      "SELECT id FROM profiles WHERE UPPER(student_code) = $1 LIMIT 1",
      [cleanCode],
    );
    return res.rows[0]?.id ?? cleanCode;
  } catch (err) {
    console.error(
      "[Notification] Error looking up student user ID by code:",
      err,
    );
    return cleanCode;
  }
}

/**
 * Server-side: Retrieves all active Admin user profile IDs.
 */
export async function findAllAdminUserIds(): Promise<string[]> {
  try {
    const res = await db.query<{ id: string }>(
      `SELECT p.id 
       FROM profiles p
       JOIN user_roles ur ON ur.user_id = p.id
       WHERE ur.role = 'admin'`
    );
    if (res.rows.length > 0) {
      return res.rows.map((r) => r.id);
    }
    const fallbackRes = await db.query<{ id: string }>(
      `SELECT id FROM profiles WHERE role = 'admin' OR staff_code = 'ADM-001'`
    );
    return fallbackRes.rows.map((r) => r.id);
  } catch (err) {
    console.error("[Notification] Error looking up Admin user IDs:", err);
    return [];
  }
}

/**
 * Server-side: Retrieves all active Security officer profile IDs.
 */
export async function findAllSecurityUserIds(): Promise<string[]> {
  try {
    const res = await db.query<{ id: string }>(
      `SELECT p.id 
       FROM profiles p
       JOIN user_roles ur ON ur.user_id = p.id
       WHERE ur.role = 'security'`
    );
    if (res.rows.length > 0) {
      return res.rows.map((r) => r.id);
    }
    const fallbackRes = await db.query<{ id: string }>(
      `SELECT id FROM profiles WHERE role = 'security' OR staff_code LIKE 'SEC-%'`
    );
    return fallbackRes.rows.map((r) => r.id);
  } catch (err) {
    console.error("[Notification] Error looking up Security user IDs:", err);
    return [];
  }
}

const isUuid = (str: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

/**
 * Internal server-only function: Creates a single notification row idempotently.
 *
 * IMPORTANT: Handles duplicate suppression so identical business events
 * do not create duplicate notifications.
 */
export async function createNotificationServer(
  input: CreateNotificationInput,
): Promise<void> {
  const {
    recipientUserId,
    type,
    title,
    detail,
    tone,
    relatedId = null,
    relatedType = null,
    recipientRole = "user",
    department = null,
    recipientId = null,
  } = input;

  if (!recipientUserId && !recipientId) {
    console.warn(
      "[Notification] createNotificationServer called without recipientUserId or recipientId — skipping",
    );
    return;
  }

  const effectiveUserId = recipientUserId || recipientId;
  const recId = recipientId || recipientUserId;
  const uuidUserId = recipientUserId && isUuid(recipientUserId) ? recipientUserId : null;

  // Idempotency: Prevent duplicate notifications for the same recipient, type, entity, and event title
  if (relatedId) {
    const existing = await db.query(
      `SELECT id FROM notifications 
       WHERE (recipient_user_id::text = $1 OR recipient_id = $2) 
         AND type = $3 
         AND related_id = $4 
         AND title = $5
       LIMIT 1`,
      [effectiveUserId, recId, type, String(relatedId), title]
    );
    if (existing.rows.length > 0) {
      return; // Already notified, suppress duplicate
    }
  }

  await db.query(
    `INSERT INTO notifications (
      recipient_user_id,
      recipient_role,
      recipient_id,
      department,
      type,
      title,
      detail,
      tone,
      read,
      related_id,
      related_type,
      related_report_id,
      created_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, false, $9, $10, $11, NOW())`,
    [
      uuidUserId,
      recipientRole,
      recId,
      department,
      type,
      title,
      detail,
      tone,
      relatedId ? String(relatedId) : null,
      relatedType,
      relatedId ? String(relatedId) : null,
    ],
  );
}

// ─── Query Functions ───────────────────────────────────────────────────────

/**
 * Returns all notifications for a specific user.
 * Strictly filtered by recipient_user_id / recipient_id — never returns other users' notifications.
 */
export async function getNotificationsForUser(
  userId: string,
  userRole?: string,
  studentCode?: string | null,
): Promise<DBNotification[]> {
  const query = `
    SELECT
       id::text,
       recipient_user_id::text AS "recipientUserId",
       recipient_role AS "recipientRole",
       recipient_id AS "recipientId",
       department,
       COALESCE(type, 'info') AS type,
       title,
       detail,
       tone,
       read,
       related_id AS "relatedId",
       related_type AS "relatedType",
       related_report_id AS "relatedReportId",
       created_at::text AS "createdAt"
     FROM notifications
     WHERE recipient_user_id::text = $1 
        OR recipient_id = $1
        ${studentCode ? `OR UPPER(recipient_id) = UPPER($2)` : ""}
     ORDER BY created_at DESC
     LIMIT 100
  `;
  const values = studentCode ? [userId, studentCode] : [userId];
  const res = await db.query<DBNotification>(query, values);
  return res.rows;
}

/**
 * Returns count of unread notifications for a specific user.
 */
export async function getUnreadCountForUser(
  userId: string,
  studentCode?: string | null,
): Promise<number> {
  const query = `
    SELECT COUNT(*)::text AS count 
    FROM notifications 
    WHERE (recipient_user_id::text = $1 OR recipient_id = $1 ${studentCode ? `OR UPPER(recipient_id) = UPPER($2)` : ""})
      AND read = false
  `;
  const values = studentCode ? [userId, studentCode] : [userId];
  const res = await db.query<{ count: string }>(query, values);
  return parseInt(res.rows[0]?.count ?? "0", 10);
}

/**
 * Marks a single notification as read.
 * Verifies recipient ownership before updating.
 */
export async function markNotificationRead(
  notifId: string,
  userId: string,
  studentCode?: string | null,
): Promise<boolean> {
  const query = `
    UPDATE notifications
    SET read = true
    WHERE id = $1::uuid 
      AND (recipient_user_id::text = $2 OR recipient_id = $2 ${studentCode ? `OR UPPER(recipient_id) = UPPER($3)` : ""})
    RETURNING id
  `;
  const values = studentCode ? [notifId, userId, studentCode] : [notifId, userId];
  const res = await db.query(query, values);
  return (res.rowCount ?? 0) > 0;
}

/**
 * Marks all notifications for a specific user as read.
 * Strictly scoped to the authenticated user.
 */
export async function markAllNotificationsRead(
  userId: string,
  studentCode?: string | null,
): Promise<number> {
  const query = `
    UPDATE notifications
    SET read = true
    WHERE (recipient_user_id::text = $1 OR recipient_id = $1 ${studentCode ? `OR UPPER(recipient_id) = UPPER($2)` : ""})
      AND read = false
  `;
  const values = studentCode ? [userId, studentCode] : [userId];
  const res = await db.query(query, values);
  return res.rowCount ?? 0;
}

