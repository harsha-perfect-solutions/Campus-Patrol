import { db } from "../db.server";

export interface DBFacultyMember {
  id: string;
  name: string;
  staffCode: string;
  department: string;
  email: string;
  phone: string;
  status: "Active" | "Inactive";
  createdAt?: string | undefined;
  updatedAt?: string | undefined;
}

export interface CreateFacultyInput {
  name: string;
  staffCode: string;
  department: string;
  email: string;
  phone?: string | undefined;
  status?: "Active" | "Inactive" | undefined;
}

export interface UpdateFacultyInput {
  name?: string | undefined;
  staffCode?: string | undefined;
  department?: string | undefined;
  email?: string | undefined;
  phone?: string | undefined;
  status?: "Active" | "Inactive" | undefined;
}

export interface FacultyFilterOptions {
  department?: string | undefined;
  status?: string | undefined;
  search?: string | undefined;
}

let facultySchemaEnsured = false;

export async function ensureFacultySchema(): Promise<void> {
  if (facultySchemaEnsured) return;

  try {
    await db.query(`
      ALTER TABLE profiles ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'Active';
      ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone TEXT DEFAULT '';
      ALTER TABLE profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
      CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_staff_code ON profiles(staff_code) WHERE staff_code IS NOT NULL AND staff_code != '';
    `);

    // Seed baseline initial faculty members if profiles table has no staff_code records
    const checkCount = await db.query<{ count: number }>(
      "SELECT COUNT(*)::int AS count FROM profiles WHERE staff_code IS NOT NULL AND staff_code != '';",
    );

    if (checkCount.rows[0]?.count === 0) {
      const initialFaculty = [
        {
          name: "Prof. Vikram Mehta",
          staffCode: "FAC-101",
          department: "CSE",
          email: "vikram@cmadms.edu",
          phone: "+91 9876543210",
        },
        {
          name: "Prof. Anita Sen",
          staffCode: "FAC-102",
          department: "CSE",
          email: "anita@cmadms.edu",
          phone: "+91 9876543211",
        },
        {
          name: "Dr. K. Swaminathan",
          staffCode: "FAC-103",
          department: "ECE",
          email: "swaminathan@cmadms.edu",
          phone: "+91 9876543212",
        },
        {
          name: "Prof. S. Nambiar",
          staffCode: "FAC-104",
          department: "ECE",
          email: "nambiar@cmadms.edu",
          phone: "+91 9876543213",
        },
        {
          name: "Dr. H. Varma",
          staffCode: "FAC-105",
          department: "EEE",
          email: "varma@cmadms.edu",
          phone: "+91 9876543214",
        },
        {
          name: "Prof. B. Mukherjee",
          staffCode: "FAC-106",
          department: "MECH",
          email: "mukherjee@cmadms.edu",
          phone: "+91 9876543215",
        },
        {
          name: "Dr. P. Deshmukh",
          staffCode: "FAC-107",
          department: "CIVIL",
          email: "deshmukh@cmadms.edu",
          phone: "+91 9876543216",
        },
        {
          name: "Dr. M. Venkat",
          staffCode: "FAC-108",
          department: "AIML",
          email: "venkat@cmadms.edu",
          phone: "+91 9876543217",
        },
      ];

      for (const f of initialFaculty) {
        const profRes = await db.query<{ id: string }>(
          `INSERT INTO profiles (full_name, email, department, staff_code, phone, status, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, 'Active', NOW(), NOW())
           ON CONFLICT (email) DO UPDATE SET staff_code = EXCLUDED.staff_code, department = EXCLUDED.department
           RETURNING id::text;`,
          [f.name, f.email, f.department, f.staffCode, f.phone],
        );

        if (profRes.rows[0]?.id) {
          await db.query(
            `INSERT INTO user_roles (user_id, role)
             VALUES ($1::uuid, 'faculty')
             ON CONFLICT (user_id, role) DO NOTHING;`,
            [profRes.rows[0].id],
          );
        }
      }
    }

    facultySchemaEnsured = true;
  } catch (err) {
    console.warn("[Faculty DB Warning] Schema initialization notice:", err);
  }
}

function mapRowToFacultyMember(row: any): DBFacultyMember {
  return {
    id: String(row.id),
    name: row.full_name || row.name || "",
    staffCode: row.staff_code || row.staffCode || "",
    department: row.department || "CSE",
    email: row.email || "",
    phone: row.phone || "",
    status: (row.status as "Active" | "Inactive") || "Active",
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : undefined,
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : undefined,
  };
}

export async function getAdminFacultyList(filters: FacultyFilterOptions = {}): Promise<DBFacultyMember[]> {
  await ensureFacultySchema();

  const conditions: string[] = ["p.staff_code IS NOT NULL AND p.staff_code != ''"];
  const values: any[] = [];
  let idx = 1;

  if (filters.department && filters.department !== "ALL") {
    conditions.push(`UPPER(p.department) = UPPER($${idx++})`);
    values.push(filters.department.trim());
  }

  if (filters.status && filters.status !== "ALL") {
    conditions.push(`UPPER(p.status) = UPPER($${idx++})`);
    values.push(filters.status.trim());
  }

  if (filters.search && filters.search.trim()) {
    const term = `%${filters.search.trim()}%`;
    conditions.push(
      `(p.full_name ILIKE $${idx} OR p.staff_code ILIKE $${idx} OR p.email ILIKE $${idx} OR p.phone ILIKE $${idx})`,
    );
    idx++;
    values.push(term);
  }

  const query = `
    SELECT p.id::text, p.full_name, p.staff_code, p.department, p.email, COALESCE(p.phone, '') AS phone, COALESCE(p.status, 'Active') AS status, p.created_at, p.updated_at
    FROM profiles p
    LEFT JOIN user_roles ur ON ur.user_id = p.id
    WHERE ${conditions.join(" AND ")}
    ORDER BY p.department ASC, p.full_name ASC;
  `;

  const res = await db.query(query, values);
  return res.rows.map(mapRowToFacultyMember);
}

export async function getFacultyById(id: string): Promise<DBFacultyMember | null> {
  await ensureFacultySchema();
  const cleanId = id.trim();
  const res = await db.query(
    "SELECT id::text, full_name, staff_code, department, email, COALESCE(phone, '') AS phone, COALESCE(status, 'Active') AS status, created_at, updated_at FROM profiles WHERE UPPER(id::text) = UPPER($1) LIMIT 1;",
    [cleanId],
  );
  if (res.rows.length === 0) return null;
  return mapRowToFacultyMember(res.rows[0]);
}

export async function getFacultyByStaffCode(staffCode: string): Promise<DBFacultyMember | null> {
  await ensureFacultySchema();
  const cleanCode = staffCode.trim();
  const res = await db.query(
    "SELECT id::text, full_name, staff_code, department, email, COALESCE(phone, '') AS phone, COALESCE(status, 'Active') AS status, created_at, updated_at FROM profiles WHERE UPPER(staff_code) = UPPER($1) LIMIT 1;",
    [cleanCode],
  );
  if (res.rows.length === 0) return null;
  return mapRowToFacultyMember(res.rows[0]);
}

export async function createFacultyMember(
  input: CreateFacultyInput,
  actorName: string,
  actorRole: string,
): Promise<DBFacultyMember> {
  await ensureFacultySchema();

  const name = input.name.trim();
  const staffCode = input.staffCode.trim().toUpperCase();
  const department = input.department.trim().toUpperCase();
  const email = input.email.trim().toLowerCase();
  const phone = input.phone?.trim() || "";
  const status = input.status || "Active";

  if (!name) throw new Error("Faculty Full Name is required.");
  if (!staffCode) throw new Error("Staff Code is required.");
  if (!department) throw new Error("Department selection is required.");
  if (!email || !email.includes("@")) throw new Error("Valid email address is required.");

  // Check duplicate staff_code
  const dupCode = await db.query("SELECT id FROM profiles WHERE UPPER(staff_code) = UPPER($1);", [staffCode]);
  if (dupCode.rows.length > 0) {
    throw new Error(`A faculty member with Staff Code '${staffCode}' already exists.`);
  }

  // Check duplicate email
  const dupEmail = await db.query("SELECT id FROM profiles WHERE UPPER(email) = UPPER($1);", [email]);
  if (dupEmail.rows.length > 0) {
    throw new Error(`A user profile with Email '${email}' already exists.`);
  }

  // Verify department exists in catalog
  const deptCheck = await db.query(
    "SELECT id FROM departments WHERE UPPER(department_code) = UPPER($1) LIMIT 1;",
    [department],
  );
  if (deptCheck.rows.length === 0 && !["CSE", "ECE", "EEE", "MECH", "CIVIL", "AIML", "IT"].includes(department)) {
    throw new Error(`Department '${department}' does not exist in academic catalog.`);
  }

  // Insert profile
  const profRes = await db.query<{
    id: string;
    full_name: string;
    staff_code: string;
    department: string;
    email: string;
    phone: string;
    status: string;
    created_at: any;
    updated_at: any;
  }>(
    `INSERT INTO profiles (full_name, email, department, staff_code, phone, status, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
     RETURNING id::text, full_name, staff_code, department, email, phone, status, created_at, updated_at;`,
    [name, email, department, staffCode, phone, status],
  );

  const insertedRow = profRes.rows[0];
  if (!insertedRow) {
    throw new Error("Failed to insert faculty profile into database.");
  }
  const newId = insertedRow.id;

  // Insert user_role
  await db.query(
    `INSERT INTO user_roles (user_id, role)
     VALUES ($1::uuid, 'faculty')
     ON CONFLICT (user_id, role) DO NOTHING;`,
    [newId],
  );

  const member = mapRowToFacultyMember(insertedRow);

  // Audit Log
  await db.query(
    `INSERT INTO audit_logs (actor, actor_role, action, target, target_id, metadata)
     VALUES ($1, $2, 'faculty_created', 'faculty_profile', $3, $4);`,
    [
      actorName,
      actorRole,
      member.id,
      JSON.stringify({
        staffCode: member.staffCode,
        name: member.name,
        department: member.department,
        email: member.email,
      }),
    ],
  );

  return member;
}

export async function updateFacultyMember(
  id: string,
  input: UpdateFacultyInput,
  actorName: string,
  actorRole: string,
): Promise<DBFacultyMember> {
  await ensureFacultySchema();
  const cleanId = id.trim();

  const existing = await getFacultyById(cleanId);
  if (!existing) {
    throw new Error(`Faculty profile with ID '${cleanId}' not found.`);
  }

  const name = input.name !== undefined ? input.name.trim() : existing.name;
  const staffCode = input.staffCode !== undefined ? input.staffCode.trim().toUpperCase() : existing.staffCode;
  const department = input.department !== undefined ? input.department.trim().toUpperCase() : existing.department;
  const email = input.email !== undefined ? input.email.trim().toLowerCase() : existing.email;
  const phone = input.phone !== undefined ? input.phone.trim() : existing.phone;
  const status = input.status !== undefined ? input.status : existing.status;

  if (!name) throw new Error("Faculty Name cannot be empty.");
  if (!staffCode) throw new Error("Staff Code cannot be empty.");
  if (!email || !email.includes("@")) throw new Error("Valid email is required.");

  // Check duplicate staff_code if changed
  if (staffCode.toUpperCase() !== existing.staffCode.toUpperCase()) {
    const dupCode = await db.query(
      "SELECT id FROM profiles WHERE UPPER(staff_code) = UPPER($1) AND UPPER(id::text) != UPPER($2);",
      [staffCode, cleanId],
    );
    if (dupCode.rows.length > 0) {
      throw new Error(`Another faculty member with Staff Code '${staffCode}' already exists.`);
    }
  }

  // Check duplicate email if changed
  if (email.toUpperCase() !== existing.email.toUpperCase()) {
    const dupEmail = await db.query(
      "SELECT id FROM profiles WHERE UPPER(email) = UPPER($1) AND UPPER(id::text) != UPPER($2);",
      [email, cleanId],
    );
    if (dupEmail.rows.length > 0) {
      throw new Error(`Another user profile with Email '${email}' already exists.`);
    }
  }

  const profRes = await db.query(
    `UPDATE profiles
     SET full_name = $1, staff_code = $2, department = $3, email = $4, phone = $5, status = $6, updated_at = NOW()
     WHERE UPPER(id::text) = UPPER($7)
     RETURNING id::text, full_name, staff_code, department, email, phone, status, created_at, updated_at;`,
    [name, staffCode, department, email, phone, status, cleanId],
  );

  const updatedRow = profRes.rows[0];
  if (!updatedRow) {
    throw new Error("Failed to update faculty profile in database.");
  }
  const updated = mapRowToFacultyMember(updatedRow);

  const auditAction =
    status !== existing.status
      ? status === "Active"
        ? "faculty_activated"
        : "faculty_deactivated"
      : "faculty_updated";

  // Audit Log
  await db.query(
    `INSERT INTO audit_logs (actor, actor_role, action, target, target_id, metadata)
     VALUES ($1, $2, $3, 'faculty_profile', $4, $5);`,
    [
      actorName,
      actorRole,
      auditAction,
      cleanId,
      JSON.stringify({
        staffCode: updated.staffCode,
        name: updated.name,
        department: updated.department,
        status: updated.status,
      }),
    ],
  );

  return updated;
}

export async function setFacultyStatus(
  id: string,
  status: "Active" | "Inactive",
  actorName: string,
  actorRole: string,
): Promise<DBFacultyMember> {
  return updateFacultyMember(id, { status }, actorName, actorRole);
}

export async function deleteFacultyMember(
  id: string,
  actorName: string,
  actorRole: string,
): Promise<boolean> {
  await ensureFacultySchema();
  const cleanId = id.trim();

  const existing = await getFacultyById(cleanId);
  if (!existing) {
    throw new Error(`Faculty profile with ID '${cleanId}' not found.`);
  }

  // Check dependencies: prevent deleting faculty if active timetable slots exist
  const depCheck = await db.query(
    "SELECT id FROM class_slots WHERE UPPER(faculty_name) = UPPER($1) OR UPPER(faculty_name) = UPPER($2) LIMIT 1;",
    [existing.name, existing.staffCode],
  );
  if (depCheck.rows.length > 0) {
    throw new Error(
      `Cannot delete Faculty '${existing.name}' because they are assigned to active timetable class slots. Set status to Inactive instead.`,
    );
  }

  await db.query("DELETE FROM user_roles WHERE user_id = $1::uuid;", [cleanId]);
  await db.query("DELETE FROM profiles WHERE UPPER(id::text) = UPPER($1);", [cleanId]);

  // Audit Log
  await db.query(
    `INSERT INTO audit_logs (actor, actor_role, action, target, target_id, metadata)
     VALUES ($1, $2, 'faculty_deleted', 'faculty_profile', $3, $4);`,
    [
      actorName,
      actorRole,
      cleanId,
      JSON.stringify({
        staffCode: existing.staffCode,
        name: existing.name,
      }),
    ],
  );

  return true;
}
