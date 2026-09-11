import crypto from "crypto";
import { db } from "../db.server";
import { hashPassword, verifyPasswordDetailed, destroyAllUserSessions } from "../session.server";
import { getCollegeEmailDomain, getInitialDefaultPassword } from "../env.server";
import { createNotificationServer } from "./notifications.server";

let schemaEnsured = false;

export function getTemporaryPasswordLifetimeHours(): number {
  const envVal = process.env["TEMP_PASSWORD_EXPIRES_HOURS"];
  if (envVal) {
    const parsed = parseInt(envVal, 10);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  return 72; // Default 72 hours (3 days)
}

/**
 * Generates a cryptographically strong, non-predictable temporary password
 * guaranteeing uppercase, lowercase, numeric, and special characters.
 */
export function generateTemporaryPassword(): string {
  const charsUpper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const charsLower = "abcdefghijkmnopqrstuvwxyz";
  const charsNum = "23456789";
  const charsSpec = "@#$%&*!";

  const getRandomChar = (str: string): string => str[crypto.randomInt(0, str.length)]!;

  const pwd = [
    getRandomChar(charsUpper),
    getRandomChar(charsLower),
    getRandomChar(charsLower),
    getRandomChar(charsUpper),
    getRandomChar(charsSpec),
    getRandomChar(charsNum),
    getRandomChar(charsNum),
    getRandomChar(charsLower),
    getRandomChar(charsNum),
    getRandomChar(charsSpec),
  ];

  // Securely shuffle character array
  for (let i = pwd.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);
    const temp = pwd[i]!;
    pwd[i] = pwd[j]!;
    pwd[j] = temp;
  }

  return pwd.join("");
}

export async function ensureUserManagementSchema(): Promise<void> {
  if (schemaEnsured) return;
  try {
    // 1. Ensure profiles table has required management columns
    await db.query(`
      ALTER TABLE profiles ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT TRUE;
      ALTER TABLE profiles ADD COLUMN IF NOT EXISTS temporary_password_expires_at TIMESTAMPTZ;
      ALTER TABLE profiles ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Active';
      ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone TEXT DEFAULT '';
    `);

    // 2. Create password_resets table for OTP management
    await db.query(`
      CREATE TABLE IF NOT EXISTS password_resets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        email TEXT NOT NULL,
        otp_hash TEXT NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        attempts INT DEFAULT 0,
        used BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS audit_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        actor TEXT,
        actor_role TEXT,
        action TEXT NOT NULL,
        target TEXT,
        target_id TEXT,
        metadata JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_password_resets_email ON password_resets(email);
      CREATE INDEX IF NOT EXISTS idx_password_resets_user ON password_resets(user_id);
      CREATE INDEX IF NOT EXISTS idx_students_student_code ON students(student_code);
      CREATE INDEX IF NOT EXISTS idx_profiles_student_code ON profiles(student_code);
    `);

    schemaEnsured = true;
  } catch (err) {
    console.warn("[User Management DB Warning] Schema initialization notice:", err);
  }
}

export function generateStudentCollegeEmail(rollNumber: string): string {
  const cleanRoll = rollNumber.trim().toUpperCase();
  const domain = getCollegeEmailDomain();
  return `${cleanRoll}@${domain}`;
}

export type RawStudentImportRecord = {
  rollNumber: string;
  name: string;
  department: string;
  year: string | number;
  semester: string | number;
  section: string;
};

export type ImportPreviewItem = {
  rowNumber: number;
  rollNumber: string;
  name: string;
  department: string;
  year: string;
  semester: number;
  section: string;
  generatedEmail: string;
  isValid: boolean;
  status: "VALID" | "DUPLICATE" | "INVALID";
  reason?: string;
};

export type BulkImportValidationResult = {
  totalCount: number;
  validCount: number;
  duplicateCount: number;
  invalidCount: number;
  items: ImportPreviewItem[];
};

const VALID_DEPARTMENTS = new Set([
  "CSE",
  "ECE",
  "MECH",
  "EEE",
  "CIVIL",
  "IT",
  "AIML",
  "COMPUTER SCIENCE & ENGINEERING",
  "ELECTRONICS & COMMUNICATION ENGINEERING",
  "MECHANICAL ENGINEERING",
  "ELECTRICAL & ELECTRONICS ENGINEERING",
]);

export async function validateStudentBulkImport(
  records: RawStudentImportRecord[]
): Promise<BulkImportValidationResult> {
  await ensureUserManagementSchema();

  // Load existing student codes and emails from DB for collision check
  const existingRes = await db.query(`
    SELECT UPPER(student_code) as code, UPPER(email) as email FROM profiles WHERE student_code IS NOT NULL
    UNION
    SELECT UPPER(student_code) as code, CONCAT(UPPER(student_code), '@', UPPER($1)) as email FROM students;
  `, [getCollegeEmailDomain()]);

  const existingCodes = new Set(existingRes.rows.map((r: any) => r.code));
  const existingEmails = new Set(existingRes.rows.map((r: any) => r.email));

  const seenInFileCodes = new Set<string>();
  const seenInFileEmails = new Set<string>();

  const items: ImportPreviewItem[] = [];
  let validCount = 0;
  let duplicateCount = 0;
  let invalidCount = 0;

  for (let i = 0; i < records.length; i++) {
    const raw = records[i];
    if (!raw) continue;
    const rowNum = i + 1;

    const rollNo = (raw.rollNumber || "").toString().trim().toUpperCase();
    const name = (raw.name || "").toString().trim();
    const deptRaw = (raw.department || "").toString().trim().toUpperCase();
    const yearRaw = (raw.year || "").toString().trim();
    const semRaw = parseInt(String(raw.semester || 1).trim(), 10) || 1;
    const secRaw = (raw.section || "").toString().trim().toUpperCase().replace(/^SECTION\s+/i, "");

    const generatedEmail = rollNo ? generateStudentCollegeEmail(rollNo) : "";

    // Field validations
    if (!rollNo) {
      invalidCount++;
      items.push({
        rowNumber: rowNum,
        rollNumber: rollNo,
        name,
        department: deptRaw,
        year: yearRaw,
        semester: semRaw,
        section: secRaw,
        generatedEmail,
        isValid: false,
        status: "INVALID",
        reason: "Missing Roll Number",
      });
      continue;
    }

    if (!name) {
      invalidCount++;
      items.push({
        rowNumber: rowNum,
        rollNumber: rollNo,
        name,
        department: deptRaw,
        year: yearRaw,
        semester: semRaw,
        section: secRaw,
        generatedEmail,
        isValid: false,
        status: "INVALID",
        reason: "Missing Student Name",
      });
      continue;
    }

    if (!deptRaw) {
      invalidCount++;
      items.push({
        rowNumber: rowNum,
        rollNumber: rollNo,
        name,
        department: deptRaw,
        year: yearRaw,
        semester: semRaw,
        section: secRaw,
        generatedEmail,
        isValid: false,
        status: "INVALID",
        reason: "Missing Department",
      });
      continue;
    }

    // Format Department cleanly
    let deptClean = deptRaw;
    if (deptRaw.includes("COMPUTER")) deptClean = "CSE";
    else if (deptRaw.includes("ELECTRONICS")) deptClean = "ECE";
    else if (deptRaw.includes("MECHANICAL")) deptClean = "MECH";
    else if (deptRaw.includes("ELECTRICAL")) deptClean = "EEE";
    else if (deptRaw.includes("CIVIL")) deptClean = "CIVIL";

    // Format Year cleanly
    let yearClean = yearRaw;
    if (!yearClean.toLowerCase().includes("year")) {
      const num = parseInt(yearClean, 10);
      if (num === 1) yearClean = "1st Year";
      else if (num === 2) yearClean = "2nd Year";
      else if (num === 3) yearClean = "3rd Year";
      else if (num === 4) yearClean = "4th Year";
      else yearClean = `${yearRaw} Year`;
    }

    // Format Section cleanly
    let sectionClean = secRaw ? `Section ${secRaw}` : "Section A";

    // In-file duplicate check
    if (seenInFileCodes.has(rollNo) || seenInFileEmails.has(generatedEmail.toUpperCase())) {
      duplicateCount++;
      items.push({
        rowNumber: rowNum,
        rollNumber: rollNo,
        name,
        department: deptClean,
        year: yearClean,
        semester: semRaw,
        section: sectionClean,
        generatedEmail,
        isValid: false,
        status: "DUPLICATE",
        reason: "Duplicate Roll Number / Email in upload file",
      });
      continue;
    }

    // Database duplicate check
    if (existingCodes.has(rollNo) || existingEmails.has(generatedEmail.toUpperCase())) {
      duplicateCount++;
      items.push({
        rowNumber: rowNum,
        rollNumber: rollNo,
        name,
        department: deptClean,
        year: yearClean,
        semester: semRaw,
        section: sectionClean,
        generatedEmail,
        isValid: false,
        status: "DUPLICATE",
        reason: "Student Roll Number or Email already exists in system records",
      });
      continue;
    }

    seenInFileCodes.add(rollNo);
    seenInFileEmails.add(generatedEmail.toUpperCase());
    validCount++;

    items.push({
      rowNumber: rowNum,
      rollNumber: rollNo,
      name,
      department: deptClean,
      year: yearClean,
      semester: semRaw,
      section: sectionClean,
      generatedEmail,
      isValid: true,
      status: "VALID",
    });
  }

  return {
    totalCount: records.length,
    validCount,
    duplicateCount,
    invalidCount,
    items,
  };
}

export type BulkImportCredential = {
  name: string;
  rollNumber: string;
  email: string;
  role: string;
  tempPassword: string;
};

export async function commitStudentBulkImport(
  validItems: ImportPreviewItem[]
): Promise<{ success: boolean; importedCount: number; credentials?: BulkImportCredential[]; error?: string }> {
  await ensureUserManagementSchema();
  if (validItems.length === 0) {
    return { success: false, importedCount: 0, error: "No valid records to import." };
  }

  const hours = getTemporaryPasswordLifetimeHours();
  const client = await db.getClient();
  const credentials: BulkImportCredential[] = [];

  try {
    await client.query("BEGIN");

    let imported = 0;
    for (const item of validItems) {
      if (!item.isValid) continue;

      const tempPassword = generateTemporaryPassword();
      const tempPasswordHash = hashPassword(tempPassword);

      // 1. Insert/Update students table
      const stCheck = await client.query(
        `SELECT student_code FROM students WHERE UPPER(student_code) = UPPER($1) LIMIT 1;`,
        [item.rollNumber]
      );

      if (stCheck.rows.length === 0) {
        await client.query(
          `
          INSERT INTO students (
            student_code,
            name,
            department,
            year,
            section,
            semester,
            status,
            qr_token
          ) VALUES ($1, $2, $3, $4, $5, $6, 'Active', $7);
        `,
          [
            item.rollNumber,
            item.name,
            item.department,
            item.year,
            item.section,
            item.semester,
            `CMADMS-ID-${item.rollNumber}`,
          ]
        );
      } else {
        await client.query(
          `
          UPDATE students
          SET name = $1, department = $2, year = $3, section = $4, semester = $5, status = 'Active'
          WHERE UPPER(student_code) = UPPER($6);
        `,
          [item.name, item.department, item.year, item.section, item.semester, item.rollNumber]
        );
      }

      // 2. Insert into profiles table with must_change_password = true and expiration
      let profRes = await client.query(
        `SELECT id FROM profiles WHERE UPPER(student_code) = UPPER($1) OR UPPER(email) = UPPER($2) LIMIT 1;`,
        [item.rollNumber, item.generatedEmail]
      );

      let userId = profRes.rows[0]?.id;
      if (!userId) {
        const insRes = await client.query(
          `
          INSERT INTO profiles (
            full_name,
            email,
            department,
            student_code,
            password_hash,
            must_change_password,
            temporary_password_expires_at,
            status
          ) VALUES ($1, $2, $3, $4, $5, TRUE, NOW() + ($6 || ' hours')::INTERVAL, 'Active')
          RETURNING id;
        `,
          [item.name, item.generatedEmail, item.department, item.rollNumber, tempPasswordHash, `${hours}`]
        );
        userId = insRes.rows[0]?.id;
      } else {
        await client.query(
          `
          UPDATE profiles
          SET full_name = $1, email = $2, department = $3, password_hash = $4, must_change_password = TRUE, temporary_password_expires_at = NOW() + ($5 || ' hours')::INTERVAL, status = 'Active'
          WHERE id = $6;
        `,
          [item.name, item.generatedEmail, item.department, tempPasswordHash, `${hours}`, userId]
        );
      }

      if (userId) {
        // 3. Insert into user_roles table
        const urCheck = await client.query(
          `SELECT user_id FROM user_roles WHERE user_id = $1::uuid AND role = 'student' LIMIT 1;`,
          [userId]
        );
        if (urCheck.rows.length === 0) {
          await client.query(
            `INSERT INTO user_roles (user_id, role) VALUES ($1::uuid, 'student');`,
            [userId]
          );
        }

        // Audit Log entry (no sensitive credentials logged)
        await client.query(
          `INSERT INTO audit_logs (actor, actor_role, action, target, target_id, metadata)
           VALUES ('System Admin', 'admin', 'USER_INITIAL_PASSWORD_SET', $1, $2, $3);`,
          [item.name, userId, JSON.stringify({ email: item.generatedEmail, role: "student" })]
        );
      }

      credentials.push({
        name: item.name,
        rollNumber: item.rollNumber,
        email: item.generatedEmail,
        role: "STUDENT",
        tempPassword,
      });

      imported++;
    }

    await client.query("COMMIT");
    return { success: true, importedCount: imported, credentials };
  } catch (err: any) {
    await client.query("ROLLBACK");
    console.error("[Bulk Import Error] Transaction failed:", err);
    return { success: false, importedCount: 0, error: err.message || "Failed to commit bulk import." };
  } finally {
    client.release();
  }
}

export async function createSingleUserAdmin(data: {
  role: "student" | "faculty" | "hod" | "security";
  code: string;
  name: string;
  email?: string;
  department: string;
  assignedGate?: string;
  year?: string;
  semester?: number;
  section?: string;
  phone?: string;
}): Promise<{
  success: boolean;
  userId?: string;
  tempPassword?: string;
  email?: string;
  name?: string;
  role?: string;
  error?: string;
}> {
  await ensureUserManagementSchema();
  const role = data.role.toLowerCase();
  const cleanCode = data.code.trim().toUpperCase();
  const cleanName = data.name.trim();
  const cleanDept = data.department.trim().toUpperCase();
  const cleanPhone = (data.phone || "").trim();

  let email = (data.email || "").trim().toLowerCase();
  if (role === "student") {
    email = generateStudentCollegeEmail(cleanCode);
  } else if (!email) {
    email = `${cleanCode.toLowerCase()}@${getCollegeEmailDomain()}`;
  }

  // Duplicate checks
  const dupCheck = await db.query(
    `
    SELECT id FROM profiles WHERE UPPER(email) = UPPER($1) OR (student_code IS NOT NULL AND UPPER(student_code) = UPPER($2)) OR (staff_code IS NOT NULL AND UPPER(staff_code) = UPPER($2));
  `,
    [email, cleanCode]
  );

  if (dupCheck.rows.length > 0) {
    return { success: false, error: `Account with code '${cleanCode}' or email '${email}' already exists.` };
  }

  const tempPassword = generateTemporaryPassword();
  const tempHash = hashPassword(tempPassword);
  const hours = getTemporaryPasswordLifetimeHours();

  const client = await db.getClient();
  try {
    await client.query("BEGIN");

    if (role === "student") {
      await client.query(
        `
        INSERT INTO students (student_code, name, department, year, section, semester, status, qr_token)
        VALUES ($1, $2, $3, $4, $5, $6, 'Active', $7);
      `,
        [
          cleanCode,
          cleanName,
          cleanDept,
          data.year || "1st Year",
          data.section || "Section A",
          data.semester || 1,
          `CMADMS-ID-${cleanCode}`,
        ]
      );
    }

    const assignedGate = data.assignedGate?.trim() || cleanDept;

    const profRes = await client.query(
      `
      INSERT INTO profiles (
        full_name,
        email,
        department,
        staff_code,
        student_code,
        phone,
        password_hash,
        must_change_password,
        temporary_password_expires_at,
        status,
        assigned_gate_id,
        assigned_post
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE, NOW() + ($8 || ' hours')::INTERVAL, 'Active', $9, $9)
      RETURNING id;
    `,
      [
        cleanName,
        email,
        cleanDept,
        role !== "student" ? cleanCode : null,
        role === "student" ? cleanCode : null,
        cleanPhone,
        tempHash,
        `${hours}`,
        role === "security" ? assignedGate : null,
      ]
    );

    const userId = profRes.rows[0].id;
    await client.query(
      `
      INSERT INTO user_roles (user_id, role)
      VALUES ($1::uuid, $2);
    `,
      [userId, role]
    );

    // Record audit log (no password in metadata)
    await client.query(
      `INSERT INTO audit_logs (actor, actor_role, action, target, target_id, metadata)
       VALUES ('System Admin', 'admin', 'USER_INITIAL_PASSWORD_SET', $1, $2, $3);`,
      [cleanName, userId, JSON.stringify({ email, role })]
    );

    await client.query("COMMIT");
    return {
      success: true,
      userId,
      tempPassword,
      email,
      name: cleanName,
      role: role.toUpperCase(),
    };
  } catch (err: any) {
    await client.query("ROLLBACK");
    console.error("[Create User Error]:", err);
    return { success: false, error: err.message || "Failed to create user account." };
  } finally {
    client.release();
  }
}

export async function resetUserPasswordAdmin(
  userId: string,
  actorName: string = "System Admin",
  actorRole: string = "admin"
): Promise<{
  success: boolean;
  tempPassword?: string;
  email?: string;
  name?: string;
  role?: string;
  error?: string;
}> {
  await ensureUserManagementSchema();
  const cleanId = userId?.trim();
  if (!cleanId) {
    return { success: false, error: "Invalid user ID." };
  }

  try {
    // 1. Fetch user profile
    const userRes = await db.query(
      `
      SELECT p.id, p.full_name, p.email, COALESCE(ur.role::text, 'student') as role
      FROM profiles p
      LEFT JOIN user_roles ur ON ur.user_id = p.id
      WHERE UPPER(p.id::text) = UPPER($1)
      LIMIT 1;
    `,
      [cleanId]
    );

    const user = userRes.rows[0];
    if (!user) {
      return { success: false, error: "User profile not found." };
    }

    // 2. Generate new temporary password & hash
    const tempPassword = generateTemporaryPassword();
    const newHash = hashPassword(tempPassword);
    const hours = getTemporaryPasswordLifetimeHours();

    // 3. Update database
    await db.query(
      `
      UPDATE profiles
      SET password_hash = $1,
          must_change_password = TRUE,
          temporary_password_expires_at = NOW() + ($2 || ' hours')::INTERVAL,
          updated_at = NOW()
      WHERE id = $3;
    `,
      [newHash, `${hours}`, user.id]
    );

    // 4. Invalidate all existing sessions for this user
    await destroyAllUserSessions(user.id);

    // 5. Insert audit log event (no sensitive credentials stored)
    await db.query(
      `INSERT INTO audit_logs (actor, actor_role, action, target, target_id, metadata)
       VALUES ($1, $2, 'ADMIN_PASSWORD_RESET', $3, $4, $5);`,
      [actorName, actorRole, user.full_name, user.id, JSON.stringify({ email: user.email, role: user.role })]
    );

    return {
      success: true,
      tempPassword,
      email: user.email,
      name: user.full_name,
      role: (user.role || "STUDENT").toUpperCase(),
    };
  } catch (err: any) {
    console.error("[Admin Password Reset Error]:", err);
    return { success: false, error: err.message || "Failed to reset user password." };
  }
}

export async function toggleUserStatusAdmin(
  userId: string,
  newStatus: "Active" | "Inactive"
): Promise<{ success: boolean; error?: string }> {
  await ensureUserManagementSchema();
  try {
    await db.query(`UPDATE profiles SET status = $1 WHERE UPPER(id::text) = UPPER($2);`, [newStatus, userId]);

    // Update students table status if user is a student
    await db.query(
      `
      UPDATE students SET status = $1
      WHERE UPPER(student_code) IN (SELECT UPPER(student_code) FROM profiles WHERE UPPER(id::text) = UPPER($2) AND student_code IS NOT NULL);
    `,
      [newStatus, userId]
    );

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to update user status." };
  }
}

export async function updateSecurityOfficerGateAdmin(
  userId: string,
  assignedGate: string
): Promise<{ success: boolean; error?: string }> {
  await ensureUserManagementSchema();
  try {
    const cleanGate = assignedGate.trim();
    if (!cleanGate) {
      return { success: false, error: "Assigned gate cannot be empty." };
    }
    await db.query(
      `UPDATE profiles SET assigned_gate_id = $1, assigned_post = $1 WHERE UPPER(id::text) = UPPER($2);`,
      [cleanGate, userId]
    );
    return { success: true };
  } catch (err: any) {
    console.error("[Update Security Gate Error]:", err);
    return { success: false, error: err.message || "Failed to update security gate assignment." };
  }
}

// ─── FORGOT PASSWORD & OTP MANAGEMENT ──────────────────────────────────────────────

export async function requestPasswordResetOtp(
  email: string
): Promise<{ success: boolean; message: string }> {
  await ensureUserManagementSchema();
  const cleanEmail = email.trim().toLowerCase();
  const GENERIC_RESPONSE = {
    success: true,
    message: "If an active account exists for this email, an OTP has been sent to your registered college inbox.",
  };

  if (!cleanEmail) return GENERIC_RESPONSE;

  try {
    // 1. Query active user by email
    const userRes = await db.query(
      `SELECT id, full_name, status FROM profiles WHERE UPPER(email) = UPPER($1) LIMIT 1;`,
      [cleanEmail]
    );

    const user = userRes.rows[0];
    if (!user || user.status === "Inactive") {
      return GENERIC_RESPONSE;
    }

    // 2. Rate limiting check (max 3 pending OTP requests in last 15 minutes)
    const rateCheck = await db.query(
      `SELECT COUNT(*)::int AS count FROM password_resets WHERE UPPER(email) = UPPER($1) AND created_at > NOW() - INTERVAL '15 minutes';`,
      [cleanEmail]
    );

    if ((rateCheck.rows[0]?.count || 0) >= 5) {
      return {
        success: false,
        message: "Too many OTP requests. Please wait 15 minutes before requesting a new code.",
      };
    }

    // 3. Generate 6-digit numeric OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = hashPassword(otp);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

    // 4. Save in password_resets table
    await db.query(
      `
      INSERT INTO password_resets (user_id, email, otp_hash, expires_at)
      VALUES ($1, $2, $3, $4);
    `,
      [user.id, cleanEmail, otpHash, expiresAt]
    );

    // 5. Send real-time SMTP email dispatch and in-app notification
    const { sendOtpEmail } = await import("../email.server");
    await sendOtpEmail(cleanEmail, otp);

    await createNotificationServer({
      recipientUserId: user.id,
      type: "info",
      title: "Password Reset Security OTP",
      detail: `Your CMADMS account password reset verification code is ${otp}. Valid for 10 minutes.`,
      tone: "info",
    });

    console.log(`[OTP DISPATCH SERVER LOG] OTP for ${cleanEmail}: [ ${otp} ] (Valid for 10 mins)`);

    return GENERIC_RESPONSE;
  } catch (err) {
    console.error("[OTP Request Error]:", err);
    return GENERIC_RESPONSE;
  }
}

export async function verifyPasswordResetOtp(
  email: string,
  otp: string
): Promise<{ success: boolean; resetToken?: string; error?: string }> {
  await ensureUserManagementSchema();
  const cleanEmail = email.trim().toLowerCase();
  const cleanOtp = otp.trim();

  if (!cleanEmail || !cleanOtp || cleanOtp.length !== 6) {
    return { success: false, error: "Invalid OTP code format." };
  }

  try {
    // Fetch latest active non-expired OTP record
    const otpRes = await db.query(
      `
      SELECT id, user_id, otp_hash, attempts, used, expires_at::text
      FROM password_resets
      WHERE UPPER(email) = UPPER($1) AND used = FALSE AND expires_at > NOW()
      ORDER BY created_at DESC
      LIMIT 1;
    `,
      [cleanEmail]
    );

    const record = otpRes.rows[0];
    if (!record) {
      return { success: false, error: "OTP code has expired or is invalid. Please request a new code." };
    }

    if (record.attempts >= 5) {
      await db.query(`UPDATE password_resets SET used = TRUE WHERE id = $1;`, [record.id]);
      return { success: false, error: "Too many incorrect attempts. This OTP code has been invalidated." };
    }

    // Verify OTP hash
    const verifyRes = verifyPasswordDetailed(cleanOtp, record.otp_hash);
    if (!verifyRes.valid) {
      await db.query(`UPDATE password_resets SET attempts = attempts + 1 WHERE id = $1;`, [record.id]);
      return { success: false, error: `Invalid OTP verification code. Attempts remaining: ${4 - record.attempts}` };
    }

    // Return resetToken
    return { success: true, resetToken: record.id };
  } catch (err: any) {
    console.error("[OTP Verification Error]:", err);
    return { success: false, error: "Failed to verify OTP code." };
  }
}

export async function resetPasswordWithOtp(data: {
  email: string;
  otp: string;
  newPassword: string;
}): Promise<{ success: boolean; error?: string }> {
  await ensureUserManagementSchema();
  const { email, otp, newPassword } = data;
  const cleanEmail = email.trim().toLowerCase();
  const cleanOtp = otp.trim();

  if (!newPassword || newPassword.length < 8) {
    return { success: false, error: "New password must be at least 8 characters long." };
  }

  const initialPassword = getInitialDefaultPassword();
  if (newPassword === initialPassword) {
    return { success: false, error: "New password cannot be the initial default password." };
  }

  // 1. Verify OTP
  const vRes = await verifyPasswordResetOtp(cleanEmail, cleanOtp);
  if (!vRes.success || !vRes.resetToken) {
    return { success: false, error: vRes.error || "OTP verification failed." };
  }

  try {
    const newHash = hashPassword(newPassword);

    // 2. Update profiles password
    await db.query(
      `
      UPDATE profiles
      SET password_hash = $1, must_change_password = FALSE, updated_at = NOW()
      WHERE UPPER(email) = UPPER($2);
    `,
      [newHash, cleanEmail]
    );

    // 3. Mark OTP as used
    await db.query(`UPDATE password_resets SET used = TRUE WHERE id = $1;`, [vRes.resetToken]);

    return { success: true };
  } catch (err: any) {
    console.error("[Reset Password Error]:", err);
    return { success: false, error: err.message || "Failed to update password." };
  }
}

export async function changeInitialPassword(
  userId: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  return changePasswordUser(userId, "", newPassword, newPassword, true);
}

export async function changePasswordUser(
  userId: string,
  currentPassword: string,
  newPassword: string,
  confirmPassword: string,
  skipCurrentCheck: boolean = false
): Promise<{ success: boolean; error?: string }> {
  await ensureUserManagementSchema();
  const cleanId = userId?.trim();
  if (!cleanId) {
    return { success: false, error: "Invalid user session." };
  }

  if (!newPassword || !confirmPassword) {
    return { success: false, error: "New password and confirmation are required." };
  }

  if (newPassword !== confirmPassword) {
    return { success: false, error: "New passwords do not match." };
  }

  if (!skipCurrentCheck && !currentPassword) {
    return { success: false, error: "Current password is required." };
  }

  if (!skipCurrentCheck && currentPassword === newPassword) {
    return { success: false, error: "New password must be different from current password." };
  }

  // Password Policy check
  const hasMinLength = newPassword.length >= 8;
  const hasUpper = /[A-Z]/.test(newPassword);
  const hasLower = /[a-z]/.test(newPassword);
  const hasDigit = /[0-9]/.test(newPassword);
  const hasSpecial = /[^A-Za-z0-9]/.test(newPassword);

  if (!hasMinLength || !hasUpper || !hasLower || !hasDigit || !hasSpecial) {
    return {
      success: false,
      error:
        "Password must be at least 8 characters long and contain uppercase, lowercase, numeric, and special characters.",
    };
  }

  try {
    const userRes = await db.query(
      `SELECT p.id, p.full_name, p.email, p.password_hash, COALESCE(ur.role::text, 'student') as role FROM profiles p LEFT JOIN user_roles ur ON ur.user_id = p.id WHERE UPPER(p.id::text) = UPPER($1) LIMIT 1;`,
      [cleanId]
    );

    const user = userRes.rows[0];
    if (!user) {
      return { success: false, error: "User profile not found." };
    }

    if (!skipCurrentCheck && user.password_hash) {
      const verifyRes = verifyPasswordDetailed(currentPassword, user.password_hash);
      if (!verifyRes.valid) {
        return { success: false, error: "Current password is incorrect." };
      }
    }

    const newHash = hashPassword(newPassword);
    await db.query(
      `
      UPDATE profiles
      SET password_hash = $1, must_change_password = FALSE, temporary_password_expires_at = NULL, updated_at = NOW()
      WHERE UPPER(id::text) = UPPER($2);
    `,
      [newHash, cleanId]
    );

    // Audit log entry (no passwords in metadata)
    await db.query(
      `INSERT INTO audit_logs (actor, actor_role, action, target, target_id, metadata)
       VALUES ($1, $2, 'PASSWORD_CHANGED', $1, $3, $4);`,
      [user.full_name, user.role || "student", user.id, JSON.stringify({ email: user.email })]
    );

    return { success: true };
  } catch (err: any) {
    console.error("[User Password Change Error]:", err);
    return { success: false, error: err.message || "Failed to update password." };
  }
}

