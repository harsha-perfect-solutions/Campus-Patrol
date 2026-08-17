import { db } from "../db.server";

export interface DepartmentItem {
  id: string;
  departmentCode: string;
  departmentName: string;
  description: string;
  status: "Active" | "Inactive";
  createdAt?: string | undefined;
  updatedAt?: string | undefined;
}

export interface CreateDepartmentInput {
  departmentCode: string;
  departmentName: string;
  description?: string | undefined;
  status?: "Active" | "Inactive" | undefined;
}

export interface UpdateDepartmentInput {
  departmentCode?: string | undefined;
  departmentName?: string | undefined;
  description?: string | undefined;
  status?: "Active" | "Inactive" | undefined;
}

export interface DepartmentFilterOptions {
  status?: string | undefined;
  search?: string | undefined;
}

let departmentsTableEnsured = false;

export async function ensureDepartmentsTable(): Promise<void> {
  if (departmentsTableEnsured) return;

  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS departments (
        id TEXT PRIMARY KEY,
        department_code TEXT NOT NULL UNIQUE,
        department_name TEXT NOT NULL UNIQUE,
        description TEXT DEFAULT '',
        status TEXT NOT NULL DEFAULT 'Active',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_departments_code ON departments(department_code);
      CREATE INDEX IF NOT EXISTS idx_departments_status ON departments(status);
    `);

    // Seed baseline initial academic departments if empty
    const checkCount = await db.query<{ count: number }>("SELECT COUNT(*)::int AS count FROM departments;");
    if (checkCount.rows[0]?.count === 0) {
      const initialDepts = [
        {
          id: "DEPT-CSE",
          department_code: "CSE",
          department_name: "Computer Science & Engineering",
          description: "Department of Computer Science & Engineering",
          status: "Active",
        },
        {
          id: "DEPT-ECE",
          department_code: "ECE",
          department_name: "Electronics & Communication Engineering",
          description: "Department of Electronics & Communication Engineering",
          status: "Active",
        },
        {
          id: "DEPT-EEE",
          department_code: "EEE",
          department_name: "Electrical & Electronics Engineering",
          description: "Department of Electrical & Electronics Engineering",
          status: "Active",
        },
        {
          id: "DEPT-MECH",
          department_code: "MECH",
          department_name: "Mechanical Engineering",
          description: "Department of Mechanical Engineering",
          status: "Active",
        },
        {
          id: "DEPT-CIVIL",
          department_code: "CIVIL",
          department_name: "Civil Engineering",
          description: "Department of Civil Engineering",
          status: "Active",
        },
        {
          id: "DEPT-AIML",
          department_code: "AIML",
          department_name: "Artificial Intelligence & Machine Learning",
          description: "Department of Artificial Intelligence & Machine Learning",
          status: "Active",
        },
        {
          id: "DEPT-IT",
          department_code: "IT",
          department_name: "Information Technology",
          description: "Department of Information Technology",
          status: "Active",
        },
      ];

      for (const d of initialDepts) {
        await db.query(
          `INSERT INTO departments (id, department_code, department_name, description, status, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
           ON CONFLICT (id) DO NOTHING;`,
          [d.id, d.department_code, d.department_name, d.description, d.status],
        );
      }
    }

    departmentsTableEnsured = true;
  } catch (err) {
    console.warn("[Departments DB Warning] Schema initialization notice:", err);
  }
}

function mapRowToDepartmentItem(row: any): DepartmentItem {
  return {
    id: row.id,
    departmentCode: row.department_code,
    departmentName: row.department_name,
    description: row.description || "",
    status: row.status as "Active" | "Inactive",
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : undefined,
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : undefined,
  };
}

export async function getDepartments(filters: DepartmentFilterOptions = {}): Promise<DepartmentItem[]> {
  await ensureDepartmentsTable();

  const conditions: string[] = ["1=1"];
  const values: any[] = [];
  let idx = 1;

  if (filters.status && filters.status !== "ALL") {
    conditions.push(`UPPER(status) = UPPER($${idx++})`);
    values.push(filters.status.trim());
  }

  if (filters.search && filters.search.trim()) {
    const term = `%${filters.search.trim()}%`;
    conditions.push(
      `(department_code ILIKE $${idx} OR department_name ILIKE $${idx} OR description ILIKE $${idx})`,
    );
    idx++;
    values.push(term);
  }

  const query = `
    SELECT id, department_code, department_name, description, status, created_at, updated_at
    FROM departments
    WHERE ${conditions.join(" AND ")}
    ORDER BY department_code ASC;
  `;

  const res = await db.query(query, values);
  return res.rows.map(mapRowToDepartmentItem);
}

export async function getDepartmentById(id: string): Promise<DepartmentItem | null> {
  await ensureDepartmentsTable();
  const cleanId = id.trim();
  const res = await db.query("SELECT * FROM departments WHERE UPPER(id) = UPPER($1) LIMIT 1;", [cleanId]);
  if (res.rows.length === 0) return null;
  return mapRowToDepartmentItem(res.rows[0]);
}

export async function getDepartmentByCode(code: string): Promise<DepartmentItem | null> {
  await ensureDepartmentsTable();
  const cleanCode = code.trim();
  const res = await db.query("SELECT * FROM departments WHERE UPPER(department_code) = UPPER($1) LIMIT 1;", [cleanCode]);
  if (res.rows.length === 0) return null;
  return mapRowToDepartmentItem(res.rows[0]);
}

export async function createDepartment(
  input: CreateDepartmentInput,
  actorName: string,
  actorRole: string,
): Promise<DepartmentItem> {
  await ensureDepartmentsTable();

  const departmentCode = input.departmentCode.trim().toUpperCase();
  const departmentName = input.departmentName.trim();
  const description = input.description?.trim() || "";
  const status = input.status || "Active";

  if (!departmentCode) throw new Error("Department Code is required.");
  if (!departmentName) throw new Error("Department Name is required.");

  // Check duplicate department_code
  const dupCode = await db.query("SELECT id FROM departments WHERE UPPER(department_code) = UPPER($1);", [departmentCode]);
  if (dupCode.rows.length > 0) {
    throw new Error(`A department with Code '${departmentCode}' already exists.`);
  }

  // Check duplicate department_name
  const dupName = await db.query("SELECT id FROM departments WHERE UPPER(department_name) = UPPER($1);", [departmentName]);
  if (dupName.rows.length > 0) {
    throw new Error(`A department with Name '${departmentName}' already exists.`);
  }

  const deptId = `DEPT-${departmentCode}`;

  const res = await db.query(
    `INSERT INTO departments (id, department_code, department_name, description, status, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
     RETURNING *;`,
    [deptId, departmentCode, departmentName, description, status],
  );

  const dept = mapRowToDepartmentItem(res.rows[0]);

  // Audit Log
  await db.query(
    `INSERT INTO audit_logs (actor, actor_role, action, target, target_id, metadata)
     VALUES ($1, $2, 'department_created', 'department', $3, $4);`,
    [
      actorName,
      actorRole,
      dept.id,
      JSON.stringify({
        departmentCode: dept.departmentCode,
        departmentName: dept.departmentName,
      }),
    ],
  );

  return dept;
}

export async function updateDepartment(
  id: string,
  input: UpdateDepartmentInput,
  actorName: string,
  actorRole: string,
): Promise<DepartmentItem> {
  await ensureDepartmentsTable();
  const cleanId = id.trim();

  const existing = await getDepartmentById(cleanId);
  if (!existing) {
    throw new Error(`Department with ID '${cleanId}' not found.`);
  }

  const departmentCode = input.departmentCode !== undefined ? input.departmentCode.trim().toUpperCase() : existing.departmentCode;
  const departmentName = input.departmentName !== undefined ? input.departmentName.trim() : existing.departmentName;
  const description = input.description !== undefined ? input.description.trim() : existing.description;
  const status = input.status !== undefined ? input.status : existing.status;

  if (!departmentCode) throw new Error("Department Code cannot be empty.");
  if (!departmentName) throw new Error("Department Name cannot be empty.");

  // Code duplicate check if changed
  if (departmentCode.toUpperCase() !== existing.departmentCode.toUpperCase()) {
    const dupCode = await db.query(
      "SELECT id FROM departments WHERE UPPER(department_code) = UPPER($1) AND UPPER(id) != UPPER($2);",
      [departmentCode, cleanId],
    );
    if (dupCode.rows.length > 0) {
      throw new Error(`Another department with Code '${departmentCode}' already exists.`);
    }
  }

  // Name duplicate check if changed
  if (departmentName.toUpperCase() !== existing.departmentName.toUpperCase()) {
    const dupName = await db.query(
      "SELECT id FROM departments WHERE UPPER(department_name) = UPPER($1) AND UPPER(id) != UPPER($2);",
      [departmentName, cleanId],
    );
    if (dupName.rows.length > 0) {
      throw new Error(`Another department with Name '${departmentName}' already exists.`);
    }
  }

  const res = await db.query(
    `UPDATE departments
     SET department_code = $1, department_name = $2, description = $3, status = $4, updated_at = NOW()
     WHERE UPPER(id) = UPPER($5)
     RETURNING *;`,
    [departmentCode, departmentName, description, status, cleanId],
  );

  const updatedDept = mapRowToDepartmentItem(res.rows[0]);

  const auditAction =
    status !== existing.status
      ? status === "Active"
        ? "department_activated"
        : "department_deactivated"
      : "department_updated";

  // Audit Log
  await db.query(
    `INSERT INTO audit_logs (actor, actor_role, action, target, target_id, metadata)
     VALUES ($1, $2, $3, 'department', $4, $5);`,
    [
      actorName,
      actorRole,
      auditAction,
      cleanId,
      JSON.stringify({
        departmentCode: updatedDept.departmentCode,
        departmentName: updatedDept.departmentName,
        status: updatedDept.status,
      }),
    ],
  );

  return updatedDept;
}

export async function deleteDepartment(
  id: string,
  actorName: string,
  actorRole: string,
): Promise<boolean> {
  await ensureDepartmentsTable();
  const cleanId = id.trim();

  const existing = await getDepartmentById(cleanId);
  if (!existing) {
    throw new Error(`Department with ID '${cleanId}' not found.`);
  }

  await db.query("DELETE FROM departments WHERE UPPER(id) = UPPER($1);", [cleanId]);

  // Audit Log
  await db.query(
    `INSERT INTO audit_logs (actor, actor_role, action, target, target_id, metadata)
     VALUES ($1, $2, 'department_deleted', 'department', $3, $4);`,
    [
      actorName,
      actorRole,
      cleanId,
      JSON.stringify({
        departmentCode: existing.departmentCode,
        departmentName: existing.departmentName,
      }),
    ],
  );

  return true;
}
