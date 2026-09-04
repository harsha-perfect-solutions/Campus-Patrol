import { db } from "../db.server";

export type CollegeGateRecord = {
  id: string;
  gate_name: string;
  gate_code: string;
  description: string | null;
  status: "Active" | "Inactive";
  created_at: string;
};

let gatesSchemaEnsured = false;

export async function ensureCollegeGatesSchema(): Promise<void> {
  if (gatesSchemaEnsured) return;
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS college_gates (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        gate_name TEXT NOT NULL UNIQUE,
        gate_code TEXT NOT NULL UNIQUE,
        description TEXT,
        status TEXT NOT NULL DEFAULT 'Active',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // Seed default campus gates if empty
    const countRes = await db.query(`SELECT COUNT(*) FROM college_gates;`);
    const count = parseInt(countRes.rows[0]?.count || "0", 10);
    if (count === 0) {
      await db.query(`
        INSERT INTO college_gates (gate_name, gate_code, description, status) VALUES
        ('Main Gate', 'GT-MAIN', 'Primary Main Campus Gate', 'Active'),
        ('Gate 1', 'GT-01', 'North Academic Block Gate 1', 'Active'),
        ('Gate 2', 'GT-02', 'South Engineering Block Gate 2', 'Active'),
        ('Gate 3', 'GT-03', 'East Sports Complex Gate 3', 'Active'),
        ('Gate 4', 'GT-04', 'West Admin Block Gate 4', 'Active'),
        ('Boys Hostel Gate', 'GT-BH', 'Boys Hostel Perimeter Gate', 'Active'),
        ('Girls Hostel Gate', 'GT-GH', 'Girls Hostel Perimeter Gate', 'Active'),
        ('Back Gate', 'GT-BACK', 'Campus Rear Access Gate', 'Active')
        ON CONFLICT DO NOTHING;
      `);
    }

    gatesSchemaEnsured = true;
  } catch (err) {
    console.warn("[College Gates Schema] Warning:", err);
  }
}

export async function getAllCollegeGates(): Promise<CollegeGateRecord[]> {
  await ensureCollegeGatesSchema();
  const res = await db.query(
    `SELECT id::text, gate_name, gate_code, description, status, created_at::text 
     FROM college_gates 
     ORDER BY created_at ASC;`
  );
  return res.rows;
}

export async function getActiveCollegeGates(): Promise<string[]> {
  await ensureCollegeGatesSchema();
  const res = await db.query(
    `SELECT gate_name FROM college_gates WHERE status = 'Active' ORDER BY gate_name ASC;`
  );
  return res.rows.map((r: any) => r.gate_name);
}

export async function createCollegeGate(data: {
  gateName: string;
  gateCode: string;
  description?: string;
}): Promise<{ success: boolean; gateId?: string; error?: string }> {
  await ensureCollegeGatesSchema();
  const cleanName = data.gateName.trim();
  const cleanCode = data.gateCode.trim().toUpperCase();
  const cleanDesc = (data.description || "").trim();

  if (!cleanName || !cleanCode) {
    return { success: false, error: "Gate Name and Gate Code are required." };
  }

  try {
    const res = await db.query(
      `INSERT INTO college_gates (gate_name, gate_code, description, status)
       VALUES ($1, $2, $3, 'Active')
       RETURNING id::text;`,
      [cleanName, cleanCode, cleanDesc || null]
    );
    return { success: true, gateId: res.rows[0].id };
  } catch (err: any) {
    console.error("[Create College Gate Error]:", err);
    if (err.message?.includes("unique constraint")) {
      return { success: false, error: "A gate with this Name or Code already exists." };
    }
    return { success: false, error: err.message || "Failed to create campus gate." };
  }
}

export async function updateCollegeGate(data: {
  id: string;
  gateName: string;
  gateCode: string;
  description?: string;
  status: "Active" | "Inactive";
}): Promise<{ success: boolean; error?: string }> {
  await ensureCollegeGatesSchema();
  const cleanName = data.gateName.trim();
  const cleanCode = data.gateCode.trim().toUpperCase();
  const cleanDesc = (data.description || "").trim();

  if (!cleanName || !cleanCode) {
    return { success: false, error: "Gate Name and Gate Code are required." };
  }

  try {
    await db.query(
      `UPDATE college_gates 
       SET gate_name = $1, gate_code = $2, description = $3, status = $4
       WHERE id::text = $5;`,
      [cleanName, cleanCode, cleanDesc || null, data.status, data.id]
    );
    return { success: true };
  } catch (err: any) {
    console.error("[Update College Gate Error]:", err);
    if (err.message?.includes("unique constraint")) {
      return { success: false, error: "Another gate with this Name or Code already exists." };
    }
    return { success: false, error: err.message || "Failed to update campus gate." };
  }
}

export async function deleteCollegeGate(id: string): Promise<{ success: boolean; error?: string }> {
  await ensureCollegeGatesSchema();
  try {
    // Check if security officers are currently assigned to this gate
    const gateRes = await db.query(`SELECT gate_name FROM college_gates WHERE id::text = $1;`, [id]);
    if (gateRes.rows[0]) {
      const gateName = gateRes.rows[0].gate_name;
      const assignedRes = await db.query(
        `SELECT COUNT(*) FROM profiles WHERE assigned_gate_id = $1 OR assigned_post = $1;`,
        [gateName]
      );
      const count = parseInt(assignedRes.rows[0]?.count || "0", 10);
      if (count > 0) {
        return {
          success: false,
          error: `Cannot delete gate '${gateName}' because ${count} security officer(s) are assigned to it. Reassign them first.`,
        };
      }
    }

    await db.query(`DELETE FROM college_gates WHERE id::text = $1;`, [id]);
    return { success: true };
  } catch (err: any) {
    console.error("[Delete College Gate Error]:", err);
    return { success: false, error: err.message || "Failed to delete campus gate." };
  }
}
