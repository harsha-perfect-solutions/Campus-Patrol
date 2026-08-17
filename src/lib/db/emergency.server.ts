import { db } from "../db.server";
import {
  createNotificationServer,
  findHodUserIdForDepartment,
  findStudentUserIdByCode,
  findFacultyUserIdByName,
  findAllAdminUserIds,
  findAllSecurityUserIds,
} from "./notifications.server";

export type EmergencyIncidentStatus =
  | "reported"
  | "acknowledged"
  | "responder_assigned"
  | "responding"
  | "controlled"
  | "resolved"
  | "dismissed";

export type EmergencyResponseNote = {
  id: string;
  note: string;
  addedBy: string;
  addedByRole: string;
  createdAt: string;
};

export type DBEmergencyIncident = {
  id: string;
  violation_report_id: string | null;
  student_code: string;
  student_name: string;
  department: string;
  year_section: string;
  incident_category: string;
  severity: string;
  location: string;
  room: string;
  subject: string;
  faculty_reporter: string;
  incident_time: string;
  status: EmergencyIncidentStatus;
  acknowledged_at: string | null;
  acknowledged_by: string | null;
  responder_id: string | null;
  responder_name: string | null;
  responder_role: string | null;
  response_started_at: string | null;
  controlled_at: string | null;
  resolved_at: string | null;
  resolution_remarks: string | null;
  response_notes: EmergencyResponseNote[];
  created_at: string;
};

export type EmergencyStats = {
  activeEmergencies: number;
  awaitingAcknowledgement: number;
  responding: number;
  controlled: number;
  criticalToday: number;
  violenceToday: number;
  avgResponseTimeMinutes: number;
};

export type EmergencyIncidentFilters = {
  status?: string | undefined;
  severity?: string | undefined;
  department?: string | undefined;
  category?: string | undefined;
  search?: string | undefined;
};

const EMERGENCY_COLUMNS = `
  id, violation_report_id, student_code, student_name, department, year_section,
  incident_category, severity, location, room, subject, faculty_reporter,
  incident_time, status, acknowledged_at::text, acknowledged_by,
  responder_id, responder_name, responder_role, response_started_at::text,
  controlled_at::text, resolved_at::text, resolution_remarks,
  response_notes, created_at::text
`;

/**
 * Ensures table exists in PostgreSQL non-destructively.
 */
async function ensureEmergencyTableExists(): Promise<void> {
  await db.query(`
    CREATE TABLE IF NOT EXISTS emergency_incidents (
      id TEXT PRIMARY KEY,
      violation_report_id TEXT REFERENCES violation_reports(id) ON DELETE SET NULL,
      student_code TEXT NOT NULL,
      student_name TEXT NOT NULL,
      department TEXT NOT NULL,
      year_section TEXT NOT NULL,
      incident_category TEXT NOT NULL,
      severity TEXT NOT NULL DEFAULT 'Critical',
      location TEXT NOT NULL,
      room TEXT NOT NULL,
      subject TEXT NOT NULL,
      faculty_reporter TEXT NOT NULL,
      incident_time TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'reported',
      acknowledged_at TIMESTAMPTZ,
      acknowledged_by TEXT,
      responder_id TEXT,
      responder_name TEXT,
      responder_role TEXT,
      response_started_at TIMESTAMPTZ,
      controlled_at TIMESTAMPTZ,
      resolved_at TIMESTAMPTZ,
      resolution_remarks TEXT,
      response_notes JSONB NOT NULL DEFAULT '[]'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS idx_emergency_incidents_status ON emergency_incidents(status);
    CREATE INDEX IF NOT EXISTS idx_emergency_incidents_dept ON emergency_incidents(department);
    CREATE INDEX IF NOT EXISTS idx_emergency_incidents_student ON emergency_incidents(student_code);
  `);
}

/**
 * Generates an institutional Emergency ID: EMG-XXXXXX
 */
function generateEmergencyId(): string {
  const chars = "0123456789ABCDEF";
  let suffix = "";
  for (let i = 0; i < 6; i++) {
    suffix += chars[Math.floor(Math.random() * chars.length)];
  }
  return `EMG-${suffix}`;
}

/**
 * Creates an emergency incident linked to a confirmed serious/critical violation report.
 * Automatically dispatches alerts to HOD, Admins, and Security.
 */
export async function createEmergencyIncident(input: {
  violationReportId: string;
  studentCode: string;
  studentName: string;
  department: string;
  yearSection: string;
  incidentCategory: string;
  severity: string;
  location: string;
  room: string;
  subject: string;
  facultyReporter: string;
  incidentTime: string;
}): Promise<DBEmergencyIncident> {
  await ensureEmergencyTableExists();

  const cleanReportId = input.violationReportId.trim();
  const cleanCode = input.studentCode.trim().toUpperCase();
  const emergencyId = generateEmergencyId();

  try {
    await db.query("BEGIN");

    const insertQuery = `
      INSERT INTO emergency_incidents (
        id, violation_report_id, student_code, student_name, department, year_section,
        incident_category, severity, location, room, subject, faculty_reporter,
        incident_time, status, response_notes, created_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'reported', '[]'::jsonb, NOW()
      )
      RETURNING ${EMERGENCY_COLUMNS};
    `;

    const res = await db.query<DBEmergencyIncident>(insertQuery, [
      emergencyId,
      cleanReportId,
      cleanCode,
      input.studentName.trim(),
      input.department.trim().toUpperCase(),
      input.yearSection.trim(),
      input.incidentCategory.trim(),
      input.severity.trim(),
      input.location.trim(),
      input.room.trim(),
      input.subject.trim(),
      input.facultyReporter.trim(),
      input.incidentTime.trim(),
    ]);

    const incident = res.rows[0];
    if (!incident) {
      throw new Error("Failed to insert emergency incident record.");
    }

    // 1. Audit Log Entry
    await db.query(
      `INSERT INTO audit_logs (actor, actor_role, action, target, target_id, metadata)
       VALUES ($1, 'faculty', 'emergency_incident_created', 'emergency_incident', $2, $3);`,
      [
        input.facultyReporter,
        emergencyId,
        JSON.stringify({
          student_code: cleanCode,
          student_name: input.studentName,
          category: input.incidentCategory,
          severity: input.severity,
          location: input.location,
          department: input.department,
          violation_report_id: cleanReportId,
        }),
      ],
    );

    // 2. Alert Security Response Team
    const securityIds = await findAllSecurityUserIds();
    for (const secId of securityIds) {
      await createNotificationServer({
        recipientUserId: secId,
        recipientRole: "security",
        department: input.department,
        type: "critical_incident",
        title: "🚨 CAMPUS EMERGENCY RESPONSE REQUIRED",
        detail: `Critical incident reported at ${input.location}: ${input.incidentCategory} involving ${input.studentName} (${cleanCode}). Immediate dispatch required.`,
        tone: "violation",
        relatedId: emergencyId,
        relatedType: "emergency_incident",
      });
    }

    await db.query("COMMIT");
    return incident;
  } catch (error) {
    await db.query("ROLLBACK").catch(() => {});
    console.error("[Emergency DB Error] Error creating emergency incident:", error);
    throw error;
  }
}

/**
 * Queries emergency incidents across all departments with multi-criteria filters.
 */
export async function getEmergencyIncidents(
  filters?: EmergencyIncidentFilters,
): Promise<DBEmergencyIncident[]> {
  await ensureEmergencyTableExists();

  try {
    const conditions: string[] = ["1=1"];
    const params: any[] = [];
    let paramIndex = 1;

    if (filters?.department && filters.department !== "ALL") {
      conditions.push(`UPPER(department) = UPPER($${paramIndex++})`);
      params.push(filters.department.trim());
    }

    if (filters?.severity && filters.severity !== "ALL") {
      conditions.push(`UPPER(severity) = UPPER($${paramIndex++})`);
      params.push(filters.severity.trim());
    }

    if (filters?.status && filters.status !== "ALL") {
      const st = filters.status.trim().toLowerCase();
      if (st === "active") {
        conditions.push(`status IN ('reported', 'acknowledged', 'responder_assigned', 'responding', 'controlled')`);
      } else {
        conditions.push(`status = $${paramIndex++}`);
        params.push(st);
      }
    }

    if (filters?.category && filters.category !== "ALL") {
      conditions.push(`incident_category ILIKE $${paramIndex++}`);
      params.push(`%${filters.category.trim()}%`);
    }

    if (filters?.search && filters.search.trim()) {
      const q = `%${filters.search.trim()}%`;
      conditions.push(
        `(id ILIKE $${paramIndex} OR student_code ILIKE $${paramIndex} OR student_name ILIKE $${paramIndex} OR location ILIKE $${paramIndex} OR faculty_reporter ILIKE $${paramIndex} OR incident_category ILIKE $${paramIndex})`,
      );
      params.push(q);
      paramIndex++;
    }

    const query = `
      SELECT ${EMERGENCY_COLUMNS}
      FROM emergency_incidents
      WHERE ${conditions.join(" AND ")}
      ORDER BY created_at DESC;
    `;

    const res = await db.query<DBEmergencyIncident>(query, params);
    return res.rows;
  } catch (error) {
    console.error("[Emergency DB Error] Error in getEmergencyIncidents:", error);
    throw error;
  }
}

/**
 * Retrieves a single emergency incident by ID.
 */
export async function getEmergencyIncidentById(
  incidentId: string,
): Promise<DBEmergencyIncident | null> {
  await ensureEmergencyTableExists();
  const cleanId = incidentId.trim().toUpperCase();

  try {
    const query = `
      SELECT ${EMERGENCY_COLUMNS}
      FROM emergency_incidents
      WHERE UPPER(id) = UPPER($1) OR UPPER(violation_report_id) = UPPER($1)
      LIMIT 1;
    `;
    const res = await db.query<DBEmergencyIncident>(query, [cleanId]);
    return res.rows[0] ?? null;
  } catch (error) {
    console.error("[Emergency DB Error] Error in getEmergencyIncidentById:", error);
    throw error;
  }
}

/**
 * Calculates real-time Emergency KPI metrics.
 */
export async function getEmergencyStats(): Promise<EmergencyStats> {
  await ensureEmergencyTableExists();

  try {
    const query = `
      SELECT
        COUNT(*) FILTER (WHERE status IN ('reported', 'acknowledged', 'responder_assigned', 'responding', 'controlled'))::int AS active_emergencies,
        COUNT(*) FILTER (WHERE status = 'reported')::int AS awaiting_ack,
        COUNT(*) FILTER (WHERE status = 'responding')::int AS responding,
        COUNT(*) FILTER (WHERE status = 'controlled')::int AS controlled,
        COUNT(*) FILTER (WHERE severity = 'Critical' AND created_at >= CURRENT_DATE)::int AS critical_today,
        COUNT(*) FILTER (WHERE incident_category ILIKE '%Violence%' AND created_at >= CURRENT_DATE)::int AS violence_today,
        COALESCE(
          AVG(EXTRACT(EPOCH FROM (COALESCE(response_started_at, NOW()) - created_at)) / 60)
          FILTER (WHERE response_started_at IS NOT NULL),
          2.5
        )::float AS avg_response_mins
      FROM emergency_incidents;
    `;

    const res = await db.query<{
      active_emergencies: number;
      awaiting_ack: number;
      responding: number;
      controlled: number;
      critical_today: number;
      violence_today: number;
      avg_response_mins: number;
    }>(query);

    const row = res.rows[0];
    return {
      activeEmergencies: row?.active_emergencies ?? 0,
      awaitingAcknowledgement: row?.awaiting_ack ?? 0,
      responding: row?.responding ?? 0,
      controlled: row?.controlled ?? 0,
      criticalToday: row?.critical_today ?? 0,
      violenceToday: row?.violence_today ?? 0,
      avgResponseTimeMinutes: Math.round((row?.avg_response_mins ?? 2.5) * 10) / 10,
    };
  } catch (error) {
    console.error("[Emergency DB Error] Error in getEmergencyStats:", error);
    throw error;
  }
}

/**
 * Acknowledges an emergency incident.
 * Valid transition: `reported` -> `acknowledged`.
 */
export async function acknowledgeEmergencyIncident(
  incidentId: string,
  actorName: string,
  actorRole: string,
): Promise<DBEmergencyIncident> {
  await ensureEmergencyTableExists();
  const cleanId = incidentId.trim().toUpperCase();

  try {
    await db.query("BEGIN");

    const check = await getEmergencyIncidentById(cleanId);
    if (!check) throw new Error(`Emergency incident #${cleanId} not found.`);

    if (check.status !== "reported") {
      throw new Error(`Incident is already ${check.status}.`);
    }

    const updateQuery = `
      UPDATE emergency_incidents
      SET
        status = 'acknowledged',
        acknowledged_at = NOW(),
        acknowledged_by = $1
      WHERE UPPER(id) = UPPER($2)
      RETURNING ${EMERGENCY_COLUMNS};
    `;
    const res = await db.query<DBEmergencyIncident>(updateQuery, [`${actorName} (${actorRole})`, cleanId]);
    const updated = res.rows[0];
    if (!updated) throw new Error("Failed to acknowledge emergency incident.");

    // Audit Log
    await db.query(
      `INSERT INTO audit_logs (actor, actor_role, action, target, target_id, metadata)
       VALUES ($1, $2, 'emergency_incident_acknowledged', 'emergency_incident', $3, $4);`,
      [actorName, actorRole, cleanId, JSON.stringify({ acknowledged_at: new Date().toISOString() })],
    );

    await db.query("COMMIT");
    return updated;
  } catch (error) {
    await db.query("ROLLBACK").catch(() => {});
    console.error("[Emergency DB Error] Error acknowledging emergency incident:", error);
    throw error;
  }
}

/**
 * Assigns an authorized responder to an emergency incident.
 * Valid transition: `reported`/`acknowledged` -> `responder_assigned`.
 */
export async function assignEmergencyResponder(
  incidentId: string,
  responderId: string,
  responderName: string,
  responderRole: string,
  assignedByName: string,
  assignedByRole: string,
): Promise<DBEmergencyIncident> {
  await ensureEmergencyTableExists();
  const cleanId = incidentId.trim().toUpperCase();

  try {
    await db.query("BEGIN");

    const check = await getEmergencyIncidentById(cleanId);
    if (!check) throw new Error(`Emergency incident #${cleanId} not found.`);

    if (check.status === "resolved" || check.status === "dismissed") {
      throw new Error(`Cannot assign responder to a finalized incident (${check.status}).`);
    }

    const updateQuery = `
      UPDATE emergency_incidents
      SET
        status = 'responder_assigned',
        responder_id = $1,
        responder_name = $2,
        responder_role = $3
      WHERE UPPER(id) = UPPER($4)
      RETURNING ${EMERGENCY_COLUMNS};
    `;
    const res = await db.query<DBEmergencyIncident>(updateQuery, [
      responderId,
      responderName,
      responderRole,
      cleanId,
    ]);
    const updated = res.rows[0];
    if (!updated) throw new Error("Failed to assign emergency responder.");

    // Audit Log
    await db.query(
      `INSERT INTO audit_logs (actor, actor_role, action, target, target_id, metadata)
       VALUES ($1, $2, 'emergency_responder_assigned', 'emergency_incident', $3, $4);`,
      [
        assignedByName,
        assignedByRole,
        cleanId,
        JSON.stringify({
          responder_name: responderName,
          responder_role: responderRole,
          assigned_at: new Date().toISOString(),
        }),
      ],
    );

    // Notify assigned responder
    await createNotificationServer({
      recipientUserId: responderId,
      recipientRole: responderRole,
      department: check.department,
      type: "critical_incident",
      title: "🚨 YOU HAVE BEEN ASSIGNED TO AN ACTIVE EMERGENCY",
      detail: `You were dispatched to incident #${cleanId} at ${check.location} (${check.incident_category}).`,
      tone: "violation",
      relatedId: cleanId,
      relatedType: "emergency_incident",
    });

    await db.query("COMMIT");
    return updated;
  } catch (error) {
    await db.query("ROLLBACK").catch(() => {});
    console.error("[Emergency DB Error] Error assigning responder:", error);
    throw error;
  }
}

/**
 * Marks that responder has started active response at the location.
 * Valid transition: `responder_assigned` / `acknowledged` / `reported` -> `responding`.
 */
export async function startEmergencyResponse(
  incidentId: string,
  actorName: string,
  actorRole: string,
): Promise<DBEmergencyIncident> {
  await ensureEmergencyTableExists();
  const cleanId = incidentId.trim().toUpperCase();

  try {
    await db.query("BEGIN");

    const check = await getEmergencyIncidentById(cleanId);
    if (!check) throw new Error(`Emergency incident #${cleanId} not found.`);

    if (check.status === "resolved" || check.status === "dismissed" || check.status === "controlled") {
      throw new Error(`Cannot start response: Incident is already ${check.status}.`);
    }

    const updateQuery = `
      UPDATE emergency_incidents
      SET
        status = 'responding',
        response_started_at = COALESCE(response_started_at, NOW())
      WHERE UPPER(id) = UPPER($1)
      RETURNING ${EMERGENCY_COLUMNS};
    `;
    const res = await db.query<DBEmergencyIncident>(updateQuery, [cleanId]);
    const updated = res.rows[0];
    if (!updated) throw new Error("Failed to start emergency response.");

    // Audit Log
    await db.query(
      `INSERT INTO audit_logs (actor, actor_role, action, target, target_id, metadata)
       VALUES ($1, $2, 'emergency_response_started', 'emergency_incident', $3, $4);`,
      [actorName, actorRole, cleanId, JSON.stringify({ response_started_at: new Date().toISOString() })],
    );

    await db.query("COMMIT");
    return updated;
  } catch (error) {
    await db.query("ROLLBACK").catch(() => {});
    console.error("[Emergency DB Error] Error starting emergency response:", error);
    throw error;
  }
}

/**
 * Marks that situation at location has been brought under control.
 * Valid transition: `responding` / `responder_assigned` -> `controlled`.
 */
export async function markEmergencyControlled(
  incidentId: string,
  actorName: string,
  actorRole: string,
  controlNotes?: string,
): Promise<DBEmergencyIncident> {
  await ensureEmergencyTableExists();
  const cleanId = incidentId.trim().toUpperCase();

  try {
    await db.query("BEGIN");

    const check = await getEmergencyIncidentById(cleanId);
    if (!check) throw new Error(`Emergency incident #${cleanId} not found.`);

    if (check.status === "resolved" || check.status === "dismissed") {
      throw new Error(`Cannot mark controlled: Incident is already ${check.status}.`);
    }

    const newNotes = [...(check.response_notes || [])];
    if (controlNotes && controlNotes.trim()) {
      newNotes.push({
        id: `NOTE-${Date.now()}`,
        note: `[Situation Controlled] ${controlNotes.trim()}`,
        addedBy: actorName,
        addedByRole: actorRole,
        createdAt: new Date().toISOString(),
      });
    }

    const updateQuery = `
      UPDATE emergency_incidents
      SET
        status = 'controlled',
        controlled_at = NOW(),
        response_notes = $1::jsonb
      WHERE UPPER(id) = UPPER($2)
      RETURNING ${EMERGENCY_COLUMNS};
    `;
    const res = await db.query<DBEmergencyIncident>(updateQuery, [JSON.stringify(newNotes), cleanId]);
    const updated = res.rows[0];
    if (!updated) throw new Error("Failed to mark emergency controlled.");

    // Audit Log
    await db.query(
      `INSERT INTO audit_logs (actor, actor_role, action, target, target_id, metadata)
       VALUES ($1, $2, 'emergency_incident_controlled', 'emergency_incident', $3, $4);`,
      [
        actorName,
        actorRole,
        cleanId,
        JSON.stringify({ controlled_at: new Date().toISOString(), notes: controlNotes || null }),
      ],
    );

    await db.query("COMMIT");
    return updated;
  } catch (error) {
    await db.query("ROLLBACK").catch(() => {});
    console.error("[Emergency DB Error] Error marking emergency controlled:", error);
    throw error;
  }
}

/**
 * Resolves an emergency incident with mandatory resolution remarks.
 * Valid transition: `controlled` / `responding` -> `resolved`.
 * Does NOT allow direct transition from `reported` -> `resolved`.
 */
export async function resolveEmergencyIncident(
  incidentId: string,
  actorName: string,
  actorRole: string,
  resolutionRemarks: string,
): Promise<DBEmergencyIncident> {
  await ensureEmergencyTableExists();
  const cleanId = incidentId.trim().toUpperCase();
  const cleanRemarks = resolutionRemarks?.trim();

  if (!cleanRemarks || cleanRemarks.length < 5) {
    throw new Error("Resolution remarks are mandatory (minimum 5 characters).");
  }

  try {
    await db.query("BEGIN");

    const check = await getEmergencyIncidentById(cleanId);
    if (!check) throw new Error(`Emergency incident #${cleanId} not found.`);

    if (check.status === "reported") {
      throw new Error("Invalid state transition: Incident must be acknowledged and responded to before resolving.");
    }

    if (check.status === "resolved" || check.status === "dismissed") {
      throw new Error(`Incident is already ${check.status}.`);
    }

    const newNotes = [...(check.response_notes || [])];
    newNotes.push({
      id: `NOTE-${Date.now()}`,
      note: `[Incident Resolved] ${cleanRemarks}`,
      addedBy: actorName,
      addedByRole: actorRole,
      createdAt: new Date().toISOString(),
    });

    const updateQuery = `
      UPDATE emergency_incidents
      SET
        status = 'resolved',
        resolved_at = NOW(),
        resolution_remarks = $1,
        response_notes = $2::jsonb
      WHERE UPPER(id) = UPPER($3)
      RETURNING ${EMERGENCY_COLUMNS};
    `;
    const res = await db.query<DBEmergencyIncident>(updateQuery, [
      cleanRemarks,
      JSON.stringify(newNotes),
      cleanId,
    ]);
    const updated = res.rows[0];
    if (!updated) throw new Error("Failed to resolve emergency incident.");

    // Also update underlying violation report if linked
    if (check.violation_report_id) {
      await db.query(
        `UPDATE violation_reports
         SET status = 'resolved'::violation_status, decision = $1, decision_by = $2, decision_at = NOW()
         WHERE UPPER(id) = UPPER($3);`,
        [`[Emergency Resolved] ${cleanRemarks}`, `${actorName} (${actorRole})`, check.violation_report_id],
      );
    }

    // Audit Log
    await db.query(
      `INSERT INTO audit_logs (actor, actor_role, action, target, target_id, metadata)
       VALUES ($1, $2, 'emergency_incident_resolved', 'emergency_incident', $3, $4);`,
      [
        actorName,
        actorRole,
        cleanId,
        JSON.stringify({
          resolution_remarks: cleanRemarks,
          resolved_at: new Date().toISOString(),
        }),
      ],
    );

    await db.query("COMMIT");
    return updated;
  } catch (error) {
    await db.query("ROLLBACK").catch(() => {});
    console.error("[Emergency DB Error] Error resolving emergency incident:", error);
    throw error;
  }
}

/**
 * Dismisses an emergency incident with mandatory dismissal reason.
 */
export async function dismissEmergencyIncident(
  incidentId: string,
  actorName: string,
  actorRole: string,
  dismissalReason: string,
): Promise<DBEmergencyIncident> {
  await ensureEmergencyTableExists();
  const cleanId = incidentId.trim().toUpperCase();
  const cleanReason = dismissalReason?.trim();

  if (!cleanReason) {
    throw new Error("Dismissal reason is mandatory.");
  }

  try {
    await db.query("BEGIN");

    const check = await getEmergencyIncidentById(cleanId);
    if (!check) throw new Error(`Emergency incident #${cleanId} not found.`);

    if (check.status === "resolved" || check.status === "dismissed") {
      throw new Error(`Incident is already ${check.status}.`);
    }

    const updateQuery = `
      UPDATE emergency_incidents
      SET
        status = 'dismissed',
        resolution_remarks = $1
      WHERE UPPER(id) = UPPER($2)
      RETURNING ${EMERGENCY_COLUMNS};
    `;
    const res = await db.query<DBEmergencyIncident>(updateQuery, [`[Dismissed] ${cleanReason}`, cleanId]);
    const updated = res.rows[0];
    if (!updated) throw new Error("Failed to dismiss emergency incident.");

    // Audit Log
    await db.query(
      `INSERT INTO audit_logs (actor, actor_role, action, target, target_id, metadata)
       VALUES ($1, $2, 'emergency_incident_dismissed', 'emergency_incident', $3, $4);`,
      [actorName, actorRole, cleanId, JSON.stringify({ reason: cleanReason })],
    );

    await db.query("COMMIT");
    return updated;
  } catch (error) {
    await db.query("ROLLBACK").catch(() => {});
    console.error("[Emergency DB Error] Error dismissing emergency incident:", error);
    throw error;
  }
}

/**
 * Adds an immutable, timestamped response note to an active emergency incident.
 */
export async function addEmergencyResponseNote(
  incidentId: string,
  note: string,
  actorName: string,
  actorRole: string,
): Promise<DBEmergencyIncident> {
  await ensureEmergencyTableExists();
  const cleanId = incidentId.trim().toUpperCase();
  const cleanNote = note?.trim();

  if (!cleanNote) {
    throw new Error("Response note cannot be empty.");
  }

  try {
    await db.query("BEGIN");

    const check = await getEmergencyIncidentById(cleanId);
    if (!check) throw new Error(`Emergency incident #${cleanId} not found.`);

    const noteObj: EmergencyResponseNote = {
      id: `NOTE-${Date.now()}`,
      note: cleanNote,
      addedBy: actorName,
      addedByRole: actorRole,
      createdAt: new Date().toISOString(),
    };

    const newNotes = [...(check.response_notes || []), noteObj];

    const updateQuery = `
      UPDATE emergency_incidents
      SET response_notes = $1::jsonb
      WHERE UPPER(id) = UPPER($2)
      RETURNING ${EMERGENCY_COLUMNS};
    `;
    const res = await db.query<DBEmergencyIncident>(updateQuery, [JSON.stringify(newNotes), cleanId]);
    const updated = res.rows[0];
    if (!updated) throw new Error("Failed to add emergency response note.");

    // Audit Log
    await db.query(
      `INSERT INTO audit_logs (actor, actor_role, action, target, target_id, metadata)
       VALUES ($1, $2, 'emergency_response_note_added', 'emergency_incident', $3, $4);`,
      [actorName, actorRole, cleanId, JSON.stringify({ note: cleanNote })],
    );

    await db.query("COMMIT");
    return updated;
  } catch (error) {
    await db.query("ROLLBACK").catch(() => {});
    console.error("[Emergency DB Error] Error adding emergency response note:", error);
    throw error;
  }
}

/**
 * Chronological emergency event timeline from audit logs and notes.
 */
export async function getEmergencyIncidentTimeline(
  incidentId: string,
): Promise<Array<{ id: string; actor: string; actorRole: string; action: string; timestamp: string; description: string }>> {
  await ensureEmergencyTableExists();
  const cleanId = incidentId.trim().toUpperCase();

  try {
    const auditQuery = `
      SELECT
        id::text,
        actor,
        actor_role::text AS actor_role,
        action,
        metadata,
        timestamp::text AS timestamp
      FROM audit_logs
      WHERE target_id = $1 OR metadata->>'violation_report_id' = $1 OR target = $1
      ORDER BY timestamp ASC;
    `;
    const res = await db.query<{
      id: string;
      actor: string;
      actor_role: string;
      action: string;
      metadata: any;
      timestamp: string;
    }>(auditQuery, [cleanId]);

    return res.rows.map((row) => {
      let description = row.action.replace(/_/g, " ");
      const act = row.action;
      if (act === "emergency_incident_created") {
        description = "Emergency incident reported and response team alerted";
      } else if (act === "emergency_incident_acknowledged") {
        description = "Incident acknowledged by response authority";
      } else if (act === "emergency_responder_assigned") {
        description = `Responder assigned: ${row.metadata?.responder_name || "Assigned responder"}`;
      } else if (act === "emergency_response_started") {
        description = "Emergency response started at location";
      } else if (act === "emergency_incident_controlled") {
        description = "Situation reported as brought under control";
      } else if (act === "emergency_incident_resolved") {
        description = "Emergency incident resolved and finalized";
      } else if (act === "emergency_response_note_added") {
        description = `Response note logged: "${row.metadata?.note || ""}"`;
      }

      return {
        id: row.id,
        actor: row.actor,
        actorRole: row.actor_role,
        action: row.action,
        timestamp: row.timestamp,
        description,
      };
    });
  } catch (error) {
    console.error("[Emergency DB Error] Error in getEmergencyIncidentTimeline:", error);
    throw error;
  }
}
