import { createServerFn } from "@tanstack/react-start";
import { setCookie, deleteCookie, getCookie } from "@tanstack/react-start/server";
import { db } from "../db.server";
import {
  hashPassword,
  verifyPassword,
  createSession,
  getSession,
  destroySession,
  getAuthenticatedSession,
  requireAuthenticatedUser,
  type ServerSession,
  type AppRole,
} from "../session.server";

export type AuthResponse = {
  success: boolean;
  user?: {
    id: string;
    email: string;
    fullName: string;
    role: AppRole;
    department: string;
    staffCode: string | null;
    studentCode: string | null;
  };
  error?: string;
};

/**
 * Server function to authenticate user credentials and issue an HttpOnly session cookie.
 */
export const signInApi = createServerFn({ method: "POST" })
  .validator((data: { email: string; password?: string }) => {
    const cleanEmail = data?.email?.trim().toLowerCase();
    if (!cleanEmail) {
      throw new Error("Email or Roll Number is required.");
    }
    return { email: cleanEmail, password: data?.password || "" };
  })
  .handler(async ({ data }): Promise<AuthResponse> => {
    try {
      // 1. Query user profile by email or student code
      const query = `
        SELECT
          p.id::text,
          p.full_name,
          p.email,
          p.department,
          p.staff_code,
          p.student_code,
          p.password_hash,
          p.assigned_post,
          COALESCE(ur.role::text, 'student') AS role
        FROM profiles p
        LEFT JOIN user_roles ur ON ur.user_id = p.id
        WHERE UPPER(p.email) = UPPER($1)
           OR (p.student_code IS NOT NULL AND UPPER(p.student_code) = UPPER($1))
        LIMIT 1;
      `;

      let res = await db.query<{
        id: string;
        full_name: string;
        email: string;
        department: string;
        staff_code: string | null;
        student_code: string | null;
        password_hash: string | null;
        assigned_post: string | null;
        role: AppRole;
      }>(query, [data.email]);

      // Fallback lookup from students table if not found in profiles
      if (res.rows.length === 0) {
        const studentQuery = `
          SELECT
            student_code AS id,
            name AS full_name,
            CONCAT(LOWER(student_code), '@cmadms.edu') AS email,
            department,
            NULL AS staff_code,
            student_code,
            NULL AS password_hash,
            'student'::text AS role
          FROM students
          WHERE UPPER(student_code) = UPPER($1)
          LIMIT 1;
        `;
        const stRes = await db.query<any>(studentQuery, [data.email]);
        if (stRes.rows.length > 0) {
          const st = stRes.rows[0];
          const newProfileRes = await db.query(
            `INSERT INTO profiles (full_name, email, department, student_code, password_hash)
             VALUES ($1, $2, $3, $4, $5) RETURNING id;`,
            [
              st.full_name,
              st.email,
              st.department,
              st.student_code,
              hashPassword(data.password || "Password123!"),
            ],
          );
          const newUserId = newProfileRes.rows[0].id;
          await db.query("INSERT INTO user_roles (user_id, role) VALUES ($1::uuid, 'student');", [
            newUserId,
          ]);

          res = await db.query<any>(query, [st.email]);
        }
      }

      const user = res.rows[0];
      if (!user) {
        return { success: false, error: "Invalid credentials. User profile not found." };
      }

      // 2. Verify password if stored
      if (user.password_hash && data.password) {
        const valid = verifyPassword(data.password, user.password_hash);
        if (!valid) {
          return { success: false, error: "Invalid password. Please check your credentials." };
        }
      }

      // 3. Create server-side session in PostgreSQL
      const session = await createSession(
        user.id,
        user.role,
        user.email,
        user.department || "GENERAL",
        user.staff_code,
        user.student_code,
        user.full_name,
        user.assigned_post ?? null,
      );

      // 4. Set HttpOnly Session Cookie (Do NOT expose session token in response JSON)
      setCookie("cmadms_session_token", session.sessionId, {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env["NODE_ENV"] === "production",
        maxAge: 86400,
      });

      return {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          fullName: user.full_name,
          role: user.role,
          department: user.department || "GENERAL",
          staffCode: user.staff_code,
          studentCode: user.student_code,
        },
      };
    } catch (err: any) {
      console.error("[Auth API Error] signInApi:", err);
      return { success: false, error: err.message || "Authentication server error." };
    }
  });

/**
 * Server function to fetch current authenticated user profile from HttpOnly cookie.
 */
export const getSelfProfileApi = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ success: boolean; session: ServerSession | null }> => {
    const session = await getAuthenticatedSession();
    return { success: !!session, session };
  },
);

/**
 * Server function to invalidate session and delete HttpOnly session cookie on sign out.
 */
export const signOutApi = createServerFn({ method: "POST" }).handler(
  async (): Promise<{ success: boolean }> => {
    try {
      const token = getCookie("cmadms_session_token");
      if (token) {
        await destroySession(token);
      }
      deleteCookie("cmadms_session_token", { path: "/" });
      return { success: true };
    } catch (err) {
      console.error("[Auth API Error] signOutApi:", err);
      return { success: false };
    }
  },
);

/**
 * Server function to reset the authenticated user's password using the PostgreSQL auth system.
 * Requires an active CMADMS session cookie — no Supabase dependency.
 */
export const resetPasswordApi = createServerFn({ method: "POST" })
  .validator((data: { password: string }) => {
    if (!data?.password || data.password.length < 8) {
      throw new Error("Password must be at least 8 characters.");
    }
    return { password: data.password };
  })
  .handler(async ({ data }): Promise<{ success: boolean; error?: string }> => {
    try {
      const session = await requireAuthenticatedUser();
      const newHash = hashPassword(data.password);
      await db.query("UPDATE profiles SET password_hash = $1 WHERE id::text = $2;", [
        newHash,
        session.userId,
      ]);
      return { success: true };
    } catch (err: any) {
      console.error("[Auth API Error] resetPasswordApi:", err);
      return { success: false, error: err?.message || "Failed to reset password." };
    }
  });
