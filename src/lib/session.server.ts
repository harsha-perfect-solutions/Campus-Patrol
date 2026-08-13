import crypto from "crypto";
import { getCookie } from "@tanstack/react-start/server";
import { db } from "./db.server";

const SALT = "cmadms_secure_salt_2026";
const SESSION_DURATION_HOURS = 24;

export type AppRole = "admin" | "hod" | "faculty" | "student" | "security";

export type ServerSession = {
  sessionId: string;
  userId: string;
  role: AppRole;
  email: string;
  department: string;
  staffCode: string | null;
  studentCode: string | null;
  fullName: string;
  expiresAt: string;
};

export function hashPassword(password: string): string {
  return crypto.scryptSync(password, SALT, 64).toString("hex");
}

export function verifyPassword(password: string, expectedHash: string): boolean {
  try {
    const computed = hashPassword(password);
    return crypto.timingSafeEqual(Buffer.from(computed, "hex"), Buffer.from(expectedHash, "hex"));
  } catch {
    return false;
  }
}

/**
 * Creates a server-side session in user_sessions table in PostgreSQL.
 */
export async function createSession(
  userId: string,
  role: AppRole,
  email: string,
  department: string,
  staffCode: string | null,
  studentCode: string | null,
  fullName: string,
): Promise<ServerSession> {
  const sessionId = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DURATION_HOURS * 3600 * 1000).toISOString();

  const query = `
    INSERT INTO user_sessions (
      session_id,
      user_id,
      role,
      email,
      department,
      staff_code,
      student_code,
      full_name,
      expires_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *;
  `;

  await db.query(query, [
    sessionId,
    userId,
    role,
    email,
    department || "GENERAL",
    staffCode,
    studentCode,
    fullName,
    expiresAt,
  ]);

  return {
    sessionId,
    userId,
    role,
    email,
    department: department || "GENERAL",
    staffCode,
    studentCode,
    fullName,
    expiresAt,
  };
}

/**
 * Validates and retrieves an active session from user_sessions table in PostgreSQL.
 */
export async function getSession(sessionId: string): Promise<ServerSession | null> {
  const cleanToken = sessionId.trim();
  if (!cleanToken) return null;

  try {
    const query = `
      SELECT
        session_id AS "sessionId",
        user_id AS "userId",
        role,
        email,
        department,
        staff_code AS "staffCode",
        student_code AS "studentCode",
        full_name AS "fullName",
        expires_at::text AS "expiresAt"
      FROM user_sessions
      WHERE session_id = $1 AND expires_at > NOW()
      LIMIT 1;
    `;

    const res = await db.query<ServerSession>(query, [cleanToken]);
    return res.rows[0] ?? null;
  } catch (error) {
    console.error("[Session Error] Failed to query session from database:", error);
    return null;
  }
}

/**
 * Destroys a session in user_sessions table in PostgreSQL.
 */
export async function destroySession(sessionId: string): Promise<boolean> {
  const cleanToken = sessionId.trim();
  if (!cleanToken) return true;

  try {
    await db.query("DELETE FROM user_sessions WHERE session_id = $1;", [cleanToken]);
    return true;
  } catch (error) {
    console.error("[Session Error] Failed to destroy session:", error);
    return false;
  }
}

/**
 * Server-side authorization helper: Reads HttpOnly session cookie and resolves user session.
 */
export async function getAuthenticatedSession(): Promise<ServerSession | null> {
  try {
    const token = getCookie("cmadms_session_token");
    if (!token) return null;
    return await getSession(token);
  } catch (err) {
    console.error("[Session Error] Failed to read authentication cookie:", err);
    return null;
  }
}

/**
 * Server-side authorization helper: Requires active session, throwing Unauthorized error if missing.
 */
export async function requireAuthenticatedUser(): Promise<ServerSession> {
  const session = await getAuthenticatedSession();
  if (!session) {
    throw new Error("Unauthorized: Active authenticated session required.");
  }
  return session;
}

/**
 * Server-side authorization helper: Requires strict server-derived role match.
 */
export async function requireRole(allowedRole: AppRole): Promise<ServerSession> {
  const session = await requireAuthenticatedUser();
  if (session.role !== allowedRole) {
    throw new Error(`Forbidden: Role "${allowedRole.toUpperCase()}" required for this action.`);
  }
  return session;
}

/**
 * Server-side authorization helper: Requires any matching role in allowed array.
 */
export async function requireAnyRole(allowedRoles: AppRole[]): Promise<ServerSession> {
  const session = await requireAuthenticatedUser();
  if (!allowedRoles.includes(session.role)) {
    throw new Error(`Forbidden: Access restricted to authorized roles only.`);
  }
  return session;
}
