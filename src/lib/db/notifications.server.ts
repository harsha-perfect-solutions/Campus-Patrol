import { db } from "../db.server";
import { publishNotificationRealtime } from "../notifications-bus.server";

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
  | "event_cancelled"
  | "event_permission_granted"
  | "info";

export type NotificationTone = "violation" | "pending" | "resolved" | "info" | "critical";

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

export type UserRecipientContext = {
  userId: string;
  role?: string;
  department?: string | null;
  staffCode?: string | null;
  studentCode?: string | null;
  fullName?: string | null;
  email?: string | null;
};

// ─── Schema Auto-Initialization ─────────────────────────────────────────────

let schemaEnsured = false;

export async function ensureNotificationsSchema(): Promise<void> {
  if (schemaEnsured) return;
  try {
    // 1. Ensure app_role enum contains 'security'
    await db.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_enum JOIN pg_type ON pg_enum.enumtypid = pg_type.oid 
          WHERE pg_type.typname = 'app_role' AND pg_enum.enumlabel = 'security'
        ) THEN
          ALTER TYPE app_role ADD VALUE 'security';
        END IF;
      END$$;
    `);

    // 2. Ensure profiles columns
    await db.query(`
      ALTER TABLE profiles ADD COLUMN IF NOT EXISTS password_hash TEXT;
      ALTER TABLE profiles ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT TRUE;
      ALTER TABLE profiles ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Active';
      ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone TEXT DEFAULT '';
      ALTER TABLE profiles ADD COLUMN IF NOT EXISTS assigned_post TEXT;
      ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT;
    `);

    // 3. Ensure user_sessions table
    await db.query(`
      CREATE TABLE IF NOT EXISTS user_sessions (
        session_id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        role TEXT NOT NULL,
        email TEXT NOT NULL,
        department TEXT NOT NULL DEFAULT 'GENERAL',
        staff_code TEXT,
        student_code TEXT,
        full_name TEXT NOT NULL,
        assigned_post TEXT,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at);
      CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
    `);

    // 4. Ensure notifications indices
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_notifications_recipient_user_id ON notifications(recipient_user_id);
      CREATE INDEX IF NOT EXISTS idx_notifications_recipient_id ON notifications(recipient_id);
      CREATE INDEX IF NOT EXISTS idx_notifications_recipient_role ON notifications(recipient_role);
      CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
      CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
    `);

    schemaEnsured = true;
  } catch (err) {
    console.warn("[Notifications DB Warning] Schema initialization notice:", err);
  }
}

// ─── Recipient Lookup Helpers ──────────────────────────────────────────────

/**
 * Server-side: Given a student_code, resolves student's actual department
 * and then finds the HOD's profile.id for that department.
 * Returns null if no HOD found for department.
 */
export async function findHodUserIdForStudentCode(
  studentCode: string,
): Promise<string | null> {
  await ensureNotificationsSchema();
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
  await ensureNotificationsSchema();
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

    // Fallback: search profile directly by staff code or email
    const fallback = await db.query<{ id: string }>(
      `SELECT id FROM profiles WHERE UPPER(department) = $1 AND (staff_code LIKE 'HOD%' OR email LIKE 'hod%') LIMIT 1`,
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
  await ensureNotificationsSchema();
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
  await ensureNotificationsSchema();
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
  await ensureNotificationsSchema();
  try {
    const res = await db.query<{ id: string }>(
      `SELECT p.id 
       FROM profiles p
       JOIN user_roles ur ON ur.user_id = p.id
       WHERE ur.role = 'admin'`
    );
    if (res.rows.length > 0) {
      return res.rows.map((r: any) => r.id);
    }
    const fallbackRes = await db.query<{ id: string }>(
      `SELECT id FROM profiles WHERE staff_code LIKE 'ADM%' OR email LIKE 'admin%'`
    );
    return fallbackRes.rows.map((r: any) => r.id);
  } catch (err) {
    console.error("[Notification] Error looking up Admin user IDs:", err);
    return [];
  }
}

/**
 * Server-side: Retrieves all active Security officer profile IDs.
 */
export async function findAllSecurityUserIds(): Promise<string[]> {
  await ensureNotificationsSchema();
  try {
    const res = await db.query<{ id: string }>(
      `SELECT p.id 
       FROM profiles p
       JOIN user_roles ur ON ur.user_id = p.id
       WHERE ur.role = 'security'`
    );
    if (res.rows.length > 0) {
      return res.rows.map((r: any) => r.id);
    }
    const fallbackRes = await db.query<{ id: string }>(
      `SELECT id FROM profiles WHERE staff_code LIKE 'SEC%' OR email LIKE 'security%'`
    );
    return fallbackRes.rows.map((r: any) => r.id);
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
  await ensureNotificationsSchema();
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

  const recRole = recipientRole || "user";
  const recId =
    recipientId ||
    recipientUserId ||
    (recRole !== "user" ? recRole.toUpperCase() : null);
  const effectiveUserId = recipientUserId || recId;

  if (!effectiveUserId && !recId) {
    console.warn(
      "[Notification] createNotificationServer called without recipientUserId or recipientId — skipping",
    );
    return;
  }

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

  const insertRes = await db.query<{ id: string }>(
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
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, false, $9, $10, $11, NOW())
    RETURNING id::text;`,
    [
      uuidUserId,
      recRole,
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

  const newNotifId = insertRes.rows[0]?.id || `notif-${Date.now()}`;

  // Broadcast to real-time subscribers via notification event bus
  try {
    publishNotificationRealtime({
      id: newNotifId,
      recipientUserId: uuidUserId,
      recipientRole: recRole,
      recipientId: recId ?? null,
      department: department ?? null,
      type,
      title,
      detail,
      tone,
      read: false,
      relatedId: relatedId ? String(relatedId) : null,
      relatedType: relatedType ?? null,
      relatedReportId: relatedId ? String(relatedId) : null,
      createdAt: new Date().toISOString(),
    });
  } catch (pubErr) {
    // Non-blocking fallback: notification is safely persisted in PostgreSQL
    console.warn("[Notification Bus Notice] Real-time publish skipped:", pubErr);
  }
}

// ─── Recipient Query SQL Builder ───────────────────────────────────────────

function buildRecipientMatchCondition(params: {
  userId: string;
  role?: string;
  department?: string | null;
  staffCode?: string | null;
  studentCode?: string | null;
  fullName?: string | null;
  email?: string | null;
}): { sql: string; values: any[] } {
  const cleanUserId = (params.userId || "").trim();
  const cleanRole = (params.role || "").trim().toLowerCase();
  const cleanDept = (params.department || "").trim().toUpperCase();
  const cleanStudentCode = (params.studentCode || "").trim().toUpperCase();
  const cleanStaffCode = (params.staffCode || "").trim().toUpperCase();
  const cleanFullName = (params.fullName || "").trim();
  const cleanEmail = (params.email || "").trim().toLowerCase();

  const clauses: string[] = [];
  const values: any[] = [];
  let idx = 1;

  // 1. Direct user ID match (UUID or string ID)
  if (cleanUserId) {
    clauses.push(`(recipient_user_id::text = $${idx} OR recipient_id = $${idx})`);
    values.push(cleanUserId);
    idx++;
  }

  // 2. Student code match
  if (cleanStudentCode) {
    clauses.push(`UPPER(recipient_id) = UPPER($${idx})`);
    values.push(cleanStudentCode);
    idx++;
  }

  // 3. Staff code match
  if (cleanStaffCode) {
    clauses.push(`UPPER(recipient_id) = UPPER($${idx})`);
    values.push(cleanStaffCode);
    idx++;
  }

  // 4. Faculty / Reporter name match
  if (cleanFullName) {
    clauses.push(`LOWER(recipient_id) = LOWER($${idx})`);
    values.push(cleanFullName);
    idx++;
  }

  // 5. Email match
  if (cleanEmail) {
    clauses.push(`LOWER(recipient_id) = LOWER($${idx})`);
    values.push(cleanEmail);
    idx++;
  }

  // 6. Role-based matching
  if (cleanRole === "admin") {
    clauses.push(`(recipient_role = 'admin' OR UPPER(recipient_id) = 'ADMIN')`);
  } else if (cleanRole === "security") {
    clauses.push(`(recipient_role = 'security' OR UPPER(recipient_id) = 'SECURITY')`);
  } else if (cleanRole === "hod") {
    if (cleanDept) {
      clauses.push(`(recipient_role = 'hod' AND (department IS NULL OR UPPER(department) = UPPER($${idx})))`);
      values.push(cleanDept);
      idx++;
    } else {
      clauses.push(`recipient_role = 'hod'`);
    }
  }

  const sql = clauses.length > 0 ? `(${clauses.join(" OR ")})` : "1=0";
  return { sql, values };
}

function resolveContext(
  userArg: string | UserRecipientContext,
  roleArg?: string,
  studentCodeArg?: string | null,
  staffCodeArg?: string | null,
  departmentArg?: string | null,
  fullNameArg?: string | null,
  emailArg?: string | null,
): UserRecipientContext {
  if (typeof userArg === "object" && userArg !== null) {
    return userArg;
  }
  return {
    userId: userArg,
    role: roleArg,
    studentCode: studentCodeArg,
    staffCode: staffCodeArg,
    department: departmentArg,
    fullName: fullNameArg,
    email: emailArg,
  };
}

// ─── Query Functions ───────────────────────────────────────────────────────

/**
 * Returns all notifications for a specific user.
 * Strictly filtered by recipient identity and role scope.
 */
export async function getNotificationsForUser(
  userArg: string | UserRecipientContext,
  userRole?: string,
  studentCode?: string | null,
  staffCode?: string | null,
  department?: string | null,
  fullName?: string | null,
  email?: string | null,
): Promise<DBNotification[]> {
  await ensureNotificationsSchema();
  const ctx = resolveContext(userArg, userRole, studentCode, staffCode, department, fullName, email);
  const { sql, values } = buildRecipientMatchCondition(ctx);

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
     WHERE ${sql}
     ORDER BY created_at DESC
     LIMIT 100
  `;
  const res = await db.query<DBNotification>(query, values);
  return res.rows;
}

/**
 * Returns count of unread notifications for a specific user.
 */
export async function getUnreadCountForUser(
  userArg: string | UserRecipientContext,
  studentCode?: string | null,
  staffCode?: string | null,
  department?: string | null,
  fullName?: string | null,
  email?: string | null,
): Promise<number> {
  await ensureNotificationsSchema();
  const ctx = resolveContext(userArg, undefined, studentCode, staffCode, department, fullName, email);
  const { sql, values } = buildRecipientMatchCondition(ctx);

  const query = `
    SELECT COUNT(*)::text AS count 
    FROM notifications 
    WHERE ${sql} AND read = false
  `;
  const res = await db.query<{ count: string }>(query, values);
  return parseInt(res.rows[0]?.count ?? "0", 10);
}

/**
 * Marks a single notification as read.
 * Verifies recipient ownership before updating.
 */
export async function markNotificationRead(
  notifId: string,
  userArg: string | UserRecipientContext,
  studentCode?: string | null,
  staffCode?: string | null,
  department?: string | null,
  fullName?: string | null,
  email?: string | null,
): Promise<boolean> {
  await ensureNotificationsSchema();
  const ctx = resolveContext(userArg, undefined, studentCode, staffCode, department, fullName, email);
  const { sql, values } = buildRecipientMatchCondition(ctx);

  const query = `
    UPDATE notifications
    SET read = true
    WHERE id::text = $${values.length + 1}
      AND ${sql}
    RETURNING id
  `;
  const res = await db.query(query, [...values, notifId]);
  return (res.rowCount ?? 0) > 0;
}

/**
 * Marks all notifications for a specific user as read.
 * Strictly scoped to the authenticated user.
 */
export async function markAllNotificationsRead(
  userArg: string | UserRecipientContext,
  studentCode?: string | null,
  staffCode?: string | null,
  department?: string | null,
  fullName?: string | null,
  email?: string | null,
): Promise<number> {
  await ensureNotificationsSchema();
  const ctx = resolveContext(userArg, undefined, studentCode, staffCode, department, fullName, email);
  const { sql, values } = buildRecipientMatchCondition(ctx);

  const query = `
    UPDATE notifications
    SET read = true
    WHERE ${sql} AND read = false
  `;
  const res = await db.query(query, values);
  return res.rowCount ?? 0;
}


