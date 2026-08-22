import crypto from "crypto";
import { getCookie } from "@tanstack/react-start/server";
import { db } from "./db.server";

const INSECURE_DEFAULT_SECRETS = new Set([
  "",
  "cmadms_super_secret_session_key_2026",
  "cmadms_secure_salt_2026",
  "default",
  "secret",
  "password",
  "123456",
  "change_me",
  "cmadms_secret",
  "development_secret_key_only_2026",
]);

/**
 * Resolves and validates the SESSION_SECRET environment variable.
 * In production mode (NODE_ENV === "production"), enforces fail-fast verification
 * rejecting missing, empty, or default insecure fallback values.
 */
export function getSessionSecret(): string {
  const isProduction = process.env["NODE_ENV"] === "production";
  const secret = (process.env["SESSION_SECRET"] || "").trim();

  if (isProduction) {
    if (!secret || INSECURE_DEFAULT_SECRETS.has(secret.toLowerCase())) {
      throw new Error("SESSION_SECRET must be configured in production.");
    }
    return secret;
  }

  // Development / Test fallback
  return secret || "development_secret_key_only_2026";
}

/**
 * Immediate fail-fast verification for production startup.
 */
export function verifyProductionSessionSecretOnStartup(): void {
  getSessionSecret();
}

// Perform fail-fast check during module initialization
try {
  verifyProductionSessionSecretOnStartup();
} catch (err: any) {
  if (process.env["NODE_ENV"] === "production") {
    console.error("[FATAL SECURITY ERROR] Production startup validation failed.");
    throw err;
  }
}

const SESSION_DURATION_HOURS = 24;

export type AppRole = "admin" | "hod" | "faculty" | "student" | "security";

export function normalizeRole(rawRole: string | null | undefined): AppRole {
  if (!rawRole) return "student";
  const clean = String(rawRole).trim().toLowerCase();
  if (
    clean === "security" ||
    clean === "security_guard" ||
    clean === "security_officer" ||
    clean === "gate_security" ||
    clean === "guard"
  ) {
    return "security";
  }
  if (clean === "admin" || clean === "superadmin" || clean === "administrator") {
    return "admin";
  }
  if (clean === "hod" || clean === "head_of_department" || clean === "head") {
    return "hod";
  }
  if (
    clean === "faculty" ||
    clean === "professor" ||
    clean === "teacher" ||
    clean === "instructor"
  ) {
    return "faculty";
  }
  return "student";
}

export type ServerSession = {
  sessionId: string;
  userId: string;
  role: AppRole;
  email: string;
  department: string;
  staffCode: string | null;
  studentCode: string | null;
  fullName: string;
  assignedPost: string | null;
  expiresAt: string;
};

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derived}`;
}

export function isLegacyPasswordHash(expectedHash: string): boolean {
  return typeof expectedHash === "string" && expectedHash.length > 0 && !expectedHash.includes(":");
}

export function verifyPasswordDetailed(
  password: string,
  expectedHash: string,
): { valid: boolean; isLegacy: boolean } {
  if (!password || !expectedHash || typeof expectedHash !== "string") {
    return { valid: false, isLegacy: false };
  }

  try {
    if (expectedHash.includes(":")) {
      const parts = expectedHash.split(":");
      if (parts.length !== 2) return { valid: false, isLegacy: false };
      const [salt, key] = parts;
      if (!salt || !key) return { valid: false, isLegacy: false };

      const computed = crypto.scryptSync(password, salt, 64).toString("hex");
      const bufComputed = Buffer.from(computed, "hex");
      const bufExpected = Buffer.from(key, "hex");

      if (bufComputed.length !== bufExpected.length) {
        return { valid: false, isLegacy: false };
      }

      const valid = crypto.timingSafeEqual(bufComputed, bufExpected);
      return { valid, isLegacy: false };
    } else {
      const secret = getSessionSecret();
      const computed = crypto.scryptSync(password, secret, 64).toString("hex");
      const bufComputed = Buffer.from(computed, "hex");
      const bufExpected = Buffer.from(expectedHash, "hex");

      if (bufComputed.length !== bufExpected.length) {
        return { valid: false, isLegacy: false };
      }

      const valid = crypto.timingSafeEqual(bufComputed, bufExpected);
      return { valid, isLegacy: true };
    }
  } catch {
    return { valid: false, isLegacy: false };
  }
}

export function verifyPassword(password: string, expectedHash: string): boolean {
  return verifyPasswordDetailed(password, expectedHash).valid;
}

let userSessionsSchemaEnsured = false;

export async function ensureUserSessionsSchema(): Promise<void> {
  if (userSessionsSchemaEnsured) return;
  try {
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at);
    `);
    userSessionsSchemaEnsured = true;
  } catch (err) {
    console.warn("[User Sessions DB Warning] Index initialization notice:", err);
  }
}

/**
 * Idempotently cleans up expired user sessions from user_sessions table in PostgreSQL.
 * Preserves all active sessions (expires_at > NOW()).
 */
export async function cleanupExpiredSessions(): Promise<{ deletedCount: number }> {
  await ensureUserSessionsSchema();
  try {
    const query = `
      DELETE FROM user_sessions
      WHERE expires_at <= NOW()
      RETURNING session_id;
    `;
    const res = await db.query(query);
    return { deletedCount: res.rows.length };
  } catch (error) {
    console.error("[Session Cleanup Error] Failed to delete expired sessions:", error);
    return { deletedCount: 0 };
  }
}

/**
 * Creates a server-side session in user_sessions table in PostgreSQL.
 */
export async function createSession(
  userId: string,
  role: AppRole | string,
  email: string,
  department: string,
  staffCode: string | null,
  studentCode: string | null,
  fullName: string,
  assignedPost: string | null = null,
): Promise<ServerSession> {
  // Fail fast in production if SESSION_SECRET is invalid
  getSessionSecret();
  await ensureUserSessionsSchema();

  const normalizedRole = normalizeRole(role);
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
      assigned_post,
      expires_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING *;
  `;

  await db.query(query, [
    sessionId,
    userId,
    normalizedRole,
    email,
    department || "GENERAL",
    staffCode,
    studentCode,
    fullName,
    assignedPost,
    expiresAt,
  ]);

  return {
    sessionId,
    userId,
    role: normalizedRole,
    email,
    department: department || "GENERAL",
    staffCode,
    studentCode,
    fullName,
    assignedPost,
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
        assigned_post AS "assignedPost",
        expires_at::text AS "expiresAt"
      FROM user_sessions
      WHERE session_id = $1 AND expires_at > NOW()
      LIMIT 1;
    `;

    const res = await db.query<ServerSession>(query, [cleanToken]);
    const row = res.rows[0];
    if (!row) return null;

    return {
      ...row,
      role: normalizeRole(row.role),
    };
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
  const userRole = normalizeRole(session.role);
  const targetRole = normalizeRole(allowedRole);
  if (userRole !== targetRole) {
    throw new Error(`Forbidden: Role "${targetRole.toUpperCase()}" required for this action.`);
  }
  return session;
}

/**
 * Server-side authorization helper: Requires any matching role in allowed array.
 */
export async function requireAnyRole(allowedRoles: AppRole[]): Promise<ServerSession> {
  const session = await requireAuthenticatedUser();
  const userRole = normalizeRole(session.role);
  const targetRoles = allowedRoles.map(normalizeRole);
  if (!targetRoles.includes(userRole)) {
    throw new Error(`Forbidden: Access restricted to authorized roles only.`);
  }
  return session;
}
