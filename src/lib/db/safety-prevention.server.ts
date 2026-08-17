import { db } from "../db.server";
import { createNotificationServer } from "./notifications.server";
import type { DBViolationReport } from "./violations.server";

// ─── Data Types ─────────────────────────────────────────────────────────────

export type SafetyAlertSeverity = "Low" | "Medium" | "High" | "Critical";

export type SafetyAlertStatus =
  | "ACTIVE"
  | "ACKNOWLEDGED"
  | "ACTION_TAKEN"
  | "DISMISSED"
  | "ESCALATED";

export type PreventiveActionStatus =
  | "OPEN"
  | "ASSIGNED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED";

export type PreventiveActionType =
  | "PATROL_FREQUENCY_INCREASE"
  | "SECURITY_STATIONING"
  | "FACULTY_SUPERVISION_REVIEW"
  | "TIMETABLE_ALLOCATION_AUDIT"
  | "HOD_INTERVENTION"
  | "SAFETY_INSPECTION"
  | "MONITORING_FLAG"
  | "PREVENTIVE_INTERVENTION";

export type PreventiveActionPriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface AlertEvidence {
  incidentCount: number;
  criticalCount: number;
  violenceCount: number;
  timeWindowDays: number;
  relatedReportIds: string[];
  relatedEmergencyIds?: string[];
  timetablePeriods?: string[];
  explanation: string;
}

export interface DBSafetyAlertRule {
  id: string;
  name: string;
  description: string;
  severity: SafetyAlertSeverity;
  enabled: boolean;
  rule_type: string;
  threshold: number;
  time_window_days: number;
  department_scope: string;
  location_scope: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface DBSafetyAlert {
  id: string;
  rule_id: string | null;
  rule_name: string;
  title: string;
  description: string;
  severity: SafetyAlertSeverity;
  department: string;
  location: string;
  room: string;
  evidence: AlertEvidence;
  status: SafetyAlertStatus;
  acknowledged_by: string | null;
  acknowledged_at: string | null;
  action_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface DBPreventiveAction {
  id: string;
  alert_id: string | null;
  title: string;
  description: string;
  action_type: PreventiveActionType;
  priority: PreventiveActionPriority;
  department: string;
  location: string;
  room: string;
  assigned_to: string | null;
  assigned_role: string | null;
  status: PreventiveActionStatus;
  due_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  completion_remarks: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface SafetyPreventionKPIs {
  totalActiveAlerts: number;
  criticalAlerts: number;
  highPriorityAlerts: number;
  openPreventiveActions: number;
  overdueActions: number;
  completedActions: number;
  activeHotspotsCount: number;
}

export interface PreventionFilterOptions {
  department?: string | undefined;
  severity?: string | undefined;
  status?: string | undefined;
  actionType?: string | undefined;
  priority?: string | undefined;
  location?: string | undefined;
  search?: string | undefined;
  startDate?: string | undefined;
  endDate?: string | undefined;
}

// ─── Ensure Tables & Indexes ────────────────────────────────────────────────

let preventionTablesEnsured = false;
export async function ensurePreventionTables(): Promise<void> {
  if (preventionTablesEnsured) return;
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS safety_alert_rules (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        severity TEXT NOT NULL DEFAULT 'High',
        enabled BOOLEAN NOT NULL DEFAULT true,
        rule_type TEXT NOT NULL,
        threshold NUMERIC NOT NULL DEFAULT 3,
        time_window_days INTEGER NOT NULL DEFAULT 7,
        department_scope TEXT NOT NULL DEFAULT 'ALL',
        location_scope TEXT NOT NULL DEFAULT 'ALL',
        created_by TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS safety_alerts (
        id TEXT PRIMARY KEY,
        rule_id TEXT REFERENCES safety_alert_rules(id) ON DELETE SET NULL,
        rule_name TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        severity TEXT NOT NULL DEFAULT 'High',
        department TEXT NOT NULL DEFAULT 'ALL',
        location TEXT NOT NULL DEFAULT 'Campus Area',
        room TEXT NOT NULL DEFAULT '—',
        evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
        status TEXT NOT NULL DEFAULT 'ACTIVE',
        acknowledged_by TEXT,
        acknowledged_at TIMESTAMPTZ,
        action_id TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS preventive_actions (
        id TEXT PRIMARY KEY,
        alert_id TEXT REFERENCES safety_alerts(id) ON DELETE SET NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        action_type TEXT NOT NULL DEFAULT 'PATROL_FREQUENCY_INCREASE',
        priority TEXT NOT NULL DEFAULT 'MEDIUM',
        department TEXT NOT NULL DEFAULT 'ALL',
        location TEXT NOT NULL DEFAULT 'Campus Area',
        room TEXT NOT NULL DEFAULT '—',
        assigned_to TEXT,
        assigned_role TEXT,
        status TEXT NOT NULL DEFAULT 'OPEN',
        due_at TIMESTAMPTZ,
        started_at TIMESTAMPTZ,
        completed_at TIMESTAMPTZ,
        completion_remarks TEXT,
        created_by TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_safety_alerts_dept ON safety_alerts(department);
      CREATE INDEX IF NOT EXISTS idx_safety_alerts_status ON safety_alerts(status);
      CREATE INDEX IF NOT EXISTS idx_safety_alerts_severity ON safety_alerts(severity);
      CREATE INDEX IF NOT EXISTS idx_safety_alerts_created_at ON safety_alerts(created_at);

      CREATE INDEX IF NOT EXISTS idx_preventive_actions_dept ON preventive_actions(department);
      CREATE INDEX IF NOT EXISTS idx_preventive_actions_status ON preventive_actions(status);
      CREATE INDEX IF NOT EXISTS idx_preventive_actions_role ON preventive_actions(assigned_role);
      CREATE INDEX IF NOT EXISTS idx_preventive_actions_due ON preventive_actions(due_at);
    `);

    // Seed default baseline institutional alert rules if none exist
    const checkRules = await db.query("SELECT COUNT(*)::int AS count FROM safety_alert_rules");
    if (checkRules.rows[0]?.count === 0) {
      await db.query(`
        INSERT INTO safety_alert_rules (id, name, description, severity, enabled, rule_type, threshold, time_window_days, department_scope, location_scope, created_by)
        VALUES
          ('RULE-01', 'Room Recurrence Clustering Alert', 'Triggers when 3 or more incidents occur in the same classroom within 7 days', 'High', true, 'ROOM_REPEAT_THRESHOLD', 3, 7, 'ALL', 'ALL', 'System Setup'),
          ('RULE-02', 'Building Corridor Pattern Alert', 'Triggers when 5 or more incidents occur across a building zone within 30 days', 'Medium', true, 'BUILDING_CLUSTER_THRESHOLD', 5, 30, 'ALL', 'ALL', 'System Setup'),
          ('RULE-03', 'Critical Violence Pattern Trigger', 'Instant institutional alert whenever an explicit violence or critical altercation is reported', 'Critical', true, 'VIOLENCE_INCIDENT_TRIGGER', 1, 1, 'ALL', 'ALL', 'System Setup'),
          ('RULE-04', 'Emergency Response Latency Breach', 'Triggers when emergency acknowledgement duration exceeds 120 seconds', 'High', true, 'EMERGENCY_LATENCY_THRESHOLD', 120, 7, 'ALL', 'ALL', 'System Setup'),
          ('RULE-05', 'Timetable Transition Conflict Watch', 'Flags repeat corridor loitering occurring repeatedly during the same class slot', 'Medium', true, 'TIMETABLE_SLOT_REPEAT', 3, 14, 'ALL', 'ALL', 'System Setup');
      `);
    }

    preventionTablesEnsured = true;
  } catch (err) {
    console.warn("[Prevention DB Warning] Schema notice:", err);
  }
}

// ─── 1. Pattern Detection & Automated Preventive Action Engine ──────────────

export async function runPreventiveSafetyEngine(): Promise<{
  newAlertsCreated: number;
  activeAlertsCount: number;
}> {
  await ensurePreventionTables();

  let newAlerts = 0;

  // 1. Check Room Repeat Incidents (>= 3 in 7 days)
  const roomQuery = `
    SELECT
      v.room,
      COALESCE(NULLIF(TRIM(v.location), ''), v.room) AS location,
      v.department,
      COUNT(*)::int AS incident_count,
      COUNT(*) FILTER (WHERE UPPER(v.severity) IN ('CRITICAL', 'HIGH'))::int AS critical_count,
      COUNT(*) FILTER (WHERE v.violation_type ILIKE '%violence%' OR v.violation_type ILIKE '%altercation%')::int AS violence_count,
      array_agg(v.id) AS related_ids,
      array_agg(DISTINCT v.scheduled_time) AS periods
    FROM violation_reports v
    WHERE v.created_at >= NOW() - INTERVAL '7 days'
      AND NULLIF(TRIM(v.room), '') IS NOT NULL
      AND v.room NOT IN ('—', 'None')
    GROUP BY v.room, COALESCE(NULLIF(TRIM(v.location), ''), v.room), v.department
    HAVING COUNT(*) >= 3;
  `;

  const roomRes = await db.query<any>(roomQuery);
  for (const r of roomRes.rows) {
    const existing = await db.query(
      `SELECT id FROM safety_alerts WHERE room = $1 AND status = 'ACTIVE' AND created_at >= NOW() - INTERVAL '3 days'`,
      [r.room],
    );

    if (existing.rows.length === 0) {
      const alertId = `ALT-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 100)}`;
      const severity: SafetyAlertSeverity = r.violence_count > 0 || r.critical_count >= 2 ? "Critical" : "High";
      const evidence: AlertEvidence = {
        incidentCount: r.incident_count,
        criticalCount: r.critical_count,
        violenceCount: r.violence_count,
        timeWindowDays: 7,
        relatedReportIds: (r.related_ids || []).slice(0, 10),
        timetablePeriods: r.periods || [],
        explanation: `${r.incident_count} incidents recorded in Room ${r.room} (${r.department}) within 7 days. ${r.critical_count} were high/critical severity and ${r.violence_count} involved physical altercation.`,
      };

      await db.query(
        `INSERT INTO safety_alerts (id, rule_id, rule_name, title, description, severity, department, location, room, evidence, status)
         VALUES ($1, 'RULE-01', 'Room Recurrence Clustering Alert', $2, $3, $4, $5, $6, $7, $8, 'ACTIVE')`,
        [
          alertId,
          `High Incident Frequency in Room ${r.room}`,
          evidence.explanation,
          severity,
          r.department,
          r.location,
          r.room,
          JSON.stringify(evidence),
        ],
      );

      newAlerts++;
    }
  }

  // 2. Check Emergency Latency Breach (> 120s response)
  const emgQuery = `
    SELECT
      id,
      department,
      location,
      room,
      ROUND(EXTRACT(EPOCH FROM (acknowledged_at - created_at))::numeric, 0)::int AS latency_sec
    FROM emergency_incidents
    WHERE created_at >= NOW() - INTERVAL '7 days'
      AND acknowledged_at IS NOT NULL
      AND EXTRACT(EPOCH FROM (acknowledged_at - created_at)) > 120;
  `;

  const emgRes = await db.query<any>(emgQuery);
  for (const e of emgRes.rows) {
    const existing = await db.query(
      `SELECT id FROM safety_alerts WHERE evidence->>'relatedEmergencyIds' LIKE $1 AND status = 'ACTIVE'`,
      [`%${e.id}%`],
    );

    if (existing.rows.length === 0) {
      const alertId = `ALT-EMG-${Date.now().toString().slice(-5)}`;
      const evidence: AlertEvidence = {
        incidentCount: 1,
        criticalCount: 1,
        violenceCount: 0,
        timeWindowDays: 7,
        relatedReportIds: [],
        relatedEmergencyIds: [e.id],
        explanation: `Emergency incident #${e.id} at ${e.location} experienced a response triage latency of ${e.latency_sec}s, exceeding the institutional 120s threshold.`,
      };

      await db.query(
        `INSERT INTO safety_alerts (id, rule_id, rule_name, title, description, severity, department, location, room, evidence, status)
         VALUES ($1, 'RULE-04', 'Emergency Response Latency Breach', $2, $3, 'High', $4, $5, $6, $7, 'ACTIVE')`,
        [
          alertId,
          `Emergency Triage Latency Exceeded: ${e.latency_sec}s`,
          evidence.explanation,
          e.department,
          e.location,
          e.room || "—",
          JSON.stringify(evidence),
        ],
      );

      newAlerts++;
    }
  }

  const countRes = await db.query<{ count: number }>(
    `SELECT COUNT(*)::int AS count FROM safety_alerts WHERE status = 'ACTIVE'`,
  );

  return {
    newAlertsCreated: newAlerts,
    activeAlertsCount: countRes.rows[0]?.count || 0,
  };
}

// ─── 2. Preventive Safety KPIs Calculation ──────────────────────────────────

export async function getSafetyPreventionKPIs(
  departmentScope?: string,
): Promise<SafetyPreventionKPIs> {
  await ensurePreventionTables();

  const alertConditions: string[] = ["1=1"];
  const actionConditions: string[] = ["1=1"];
  const values: any[] = [];
  let idx = 1;

  if (departmentScope && departmentScope !== "ALL") {
    alertConditions.push(`(UPPER(department) = UPPER($${idx}) OR department = 'ALL')`);
    actionConditions.push(`(UPPER(department) = UPPER($${idx}) OR department = 'ALL')`);
    values.push(departmentScope);
  }

  const query = `
    SELECT
      (SELECT COUNT(*)::int FROM safety_alerts WHERE status = 'ACTIVE' AND ${alertConditions.join(" AND ")}) AS "totalActiveAlerts",
      (SELECT COUNT(*)::int FROM safety_alerts WHERE status = 'ACTIVE' AND UPPER(severity) = 'CRITICAL' AND ${alertConditions.join(" AND ")}) AS "criticalAlerts",
      (SELECT COUNT(*)::int FROM safety_alerts WHERE status = 'ACTIVE' AND UPPER(severity) = 'HIGH' AND ${alertConditions.join(" AND ")}) AS "highPriorityAlerts",
      (SELECT COUNT(*)::int FROM preventive_actions WHERE status IN ('OPEN', 'ASSIGNED', 'IN_PROGRESS') AND ${actionConditions.join(" AND ")}) AS "openPreventiveActions",
      (SELECT COUNT(*)::int FROM preventive_actions WHERE status IN ('OPEN', 'ASSIGNED', 'IN_PROGRESS') AND due_at < NOW() AND ${actionConditions.join(" AND ")}) AS "overdueActions",
      (SELECT COUNT(*)::int FROM preventive_actions WHERE status = 'COMPLETED' AND ${actionConditions.join(" AND ")}) AS "completedActions";
  `;

  const res = await db.query<any>(query, values);
  const row = res.rows[0] || {};

  // Hotspots count
  const hotspotRes = await db.query(
    `SELECT COUNT(DISTINCT location)::int AS count FROM violation_reports WHERE created_at >= NOW() - INTERVAL '30 days'`,
  );

  return {
    totalActiveAlerts: row.totalActiveAlerts || 0,
    criticalAlerts: row.criticalAlerts || 0,
    highPriorityAlerts: row.highPriorityAlerts || 0,
    openPreventiveActions: row.openPreventiveActions || 0,
    overdueActions: row.overdueActions || 0,
    completedActions: row.completedActions || 0,
    activeHotspotsCount: hotspotRes.rows[0]?.count || 0,
  };
}

// ─── 3. Safety Alerts Query & Management ────────────────────────────────────

export async function getSafetyAlerts(
  filters: PreventionFilterOptions = {},
  limit = 50,
  offset = 0,
): Promise<{ alerts: DBSafetyAlert[]; total: number }> {
  await ensurePreventionTables();

  const conditions: string[] = ["1=1"];
  const values: any[] = [];
  let idx = 1;

  if (filters.department && filters.department !== "ALL") {
    conditions.push(`(UPPER(department) = UPPER($${idx++}) OR department = 'ALL')`);
    values.push(filters.department);
  }
  if (filters.severity && filters.severity !== "ALL") {
    conditions.push(`UPPER(severity) = UPPER($${idx++})`);
    values.push(filters.severity);
  }
  if (filters.status && filters.status !== "ALL") {
    conditions.push(`UPPER(status) = UPPER($${idx++})`);
    values.push(filters.status);
  }
  if (filters.search && filters.search.trim()) {
    conditions.push(`(title ILIKE $${idx} OR description ILIKE $${idx} OR location ILIKE $${idx} OR room ILIKE $${idx})`);
    idx++;
    values.push(`%${filters.search.trim()}%`);
  }

  const countQuery = `SELECT COUNT(*)::int AS count FROM safety_alerts WHERE ${conditions.join(" AND ")};`;
  const listQuery = `
    SELECT
      id, rule_id, rule_name, title, description, severity,
      department, location, room, evidence, status,
      acknowledged_by, acknowledged_at, action_id,
      created_at, updated_at
    FROM safety_alerts
    WHERE ${conditions.join(" AND ")}
    ORDER BY 
      CASE status WHEN 'ACTIVE' THEN 1 WHEN 'ESCALATED' THEN 2 WHEN 'ACKNOWLEDGED' THEN 3 ELSE 4 END,
      CASE severity WHEN 'Critical' THEN 1 WHEN 'High' THEN 2 WHEN 'Medium' THEN 3 ELSE 4 END,
      created_at DESC
    LIMIT $${values.length + 1} OFFSET $${values.length + 2};
  `;

  const [countRes, listRes] = await Promise.all([
    db.query<{ count: number }>(countQuery, values),
    db.query<DBSafetyAlert>(listQuery, [...values, limit, offset]),
  ]);

  return {
    alerts: listRes.rows,
    total: countRes.rows[0]?.count || 0,
  };
}

export async function acknowledgeSafetyAlert(
  alertId: string,
  actorName: string,
  actorRole: string,
): Promise<DBSafetyAlert> {
  await ensurePreventionTables();
  const cleanId = alertId.trim().toUpperCase();

  const check = await db.query<DBSafetyAlert>("SELECT * FROM safety_alerts WHERE UPPER(id) = UPPER($1)", [cleanId]);
  const alert = check.rows[0];
  if (!alert) throw new Error(`Safety alert #${cleanId} not found.`);

  if (alert.status !== "ACTIVE" && alert.status !== "ESCALATED") {
    throw new Error(`Alert is already in status '${alert.status}'.`);
  }

  const res = await db.query<DBSafetyAlert>(
    `UPDATE safety_alerts
     SET status = 'ACKNOWLEDGED', acknowledged_by = $1, acknowledged_at = NOW(), updated_at = NOW()
     WHERE UPPER(id) = UPPER($2)
     RETURNING *;`,
    [`${actorName} (${actorRole})`, cleanId],
  );

  // Audit Log
  await db.query(
    `INSERT INTO audit_logs (actor, actor_role, action, target, target_id, metadata)
     VALUES ($1, $2, 'alert_acknowledged', 'safety_alert', $3, $4);`,
    [actorName, actorRole, cleanId, JSON.stringify({ acknowledged_at: new Date().toISOString() })],
  );

  return res.rows[0]!;
}

export async function escalateSafetyAlert(
  alertId: string,
  actorName: string,
  actorRole: string,
  escalationReason: string,
): Promise<DBSafetyAlert> {
  await ensurePreventionTables();
  const cleanId = alertId.trim().toUpperCase();

  const res = await db.query<DBSafetyAlert>(
    `UPDATE safety_alerts
     SET status = 'ESCALATED', severity = 'Critical', updated_at = NOW()
     WHERE UPPER(id) = UPPER($1)
     RETURNING *;`,
    [cleanId],
  );
  const alert = res.rows[0];
  if (!alert) throw new Error(`Safety alert #${cleanId} not found.`);

  // Audit Log
  await db.query(
    `INSERT INTO audit_logs (actor, actor_role, action, target, target_id, metadata)
     VALUES ($1, $2, 'alert_escalated', 'safety_alert', $3, $4);`,
    [actorName, actorRole, cleanId, JSON.stringify({ reason: escalationReason, escalated_at: new Date().toISOString() })],
  );

  return alert;
}

// ─── 4. Preventive Action Creation & Lifecycle ──────────────────────────────

export interface CreatePreventiveActionInput {
  alertId?: string | undefined;
  title: string;
  description: string;
  actionType: PreventiveActionType;
  priority: PreventiveActionPriority;
  department: string;
  location: string;
  room?: string | undefined;
  assignedTo?: string | undefined;
  assignedRole?: string | undefined;
  dueDays?: number | undefined;
}

export async function createPreventiveAction(
  input: CreatePreventiveActionInput,
  actorName: string,
  actorRole: string,
): Promise<DBPreventiveAction> {
  await ensurePreventionTables();

  const actionId = `ACT-${Date.now().toString().slice(-6)}`;
  const days = input.dueDays || 3;
  const dueAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

  const res = await db.query<DBPreventiveAction>(
    `INSERT INTO preventive_actions (
       id, alert_id, title, description, action_type, priority,
       department, location, room, assigned_to, assigned_role,
       status, due_at, created_by, created_at, updated_at
     ) VALUES (
       $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'OPEN', $12, $13, NOW(), NOW()
     )
     RETURNING *;`,
    [
      actionId,
      input.alertId || null,
      input.title.trim(),
      input.description.trim(),
      input.actionType,
      input.priority,
      input.department.trim().toUpperCase(),
      input.location.trim(),
      input.room?.trim() || "—",
      input.assignedTo?.trim() || null,
      input.assignedRole?.trim() || null,
      dueAt,
      actorName,
    ],
  );

  const action = res.rows[0]!;

  // If created from an alert, update alert status to ACTION_TAKEN
  if (input.alertId) {
    await db.query(
      `UPDATE safety_alerts
       SET status = 'ACTION_TAKEN', action_id = $1, updated_at = NOW()
       WHERE UPPER(id) = UPPER($2);`,
      [actionId, input.alertId.trim()],
    );
  }

  // Multi-tier Notification Routing
  const notifTitle = `🛡️ NEW PREVENTIVE ACTION: ${action.title}`;
  const notifDetail = `Action #${action.id} assigned for ${action.location} (${action.department}). Due within ${days} days.`;

  if (action.priority === "CRITICAL") {
    // Notify Admin, HOD, Security
    await createNotificationServer({
      recipientUserId: "ADMIN",
      recipientRole: "admin",
      department: action.department,
      type: "critical_incident",
      title: notifTitle,
      detail: notifDetail,
      tone: "violation",
      relatedId: action.id,
      relatedType: "preventive_action",
    });
  }

  // Audit Log
  await db.query(
    `INSERT INTO audit_logs (actor, actor_role, action, target, target_id, metadata)
     VALUES ($1, $2, 'preventive_action_created', 'preventive_action', $3, $4);`,
    [
      actorName,
      actorRole,
      actionId,
      JSON.stringify({
        title: action.title,
        priority: action.priority,
        action_type: action.action_type,
        department: action.department,
        due_at: dueAt,
      }),
    ],
  );

  return action;
}

export async function assignPreventiveAction(
  actionId: string,
  assignedTo: string,
  assignedRole: string,
  actorName: string,
  actorRole: string,
): Promise<DBPreventiveAction> {
  await ensurePreventionTables();
  const cleanId = actionId.trim().toUpperCase();

  const check = await db.query<DBPreventiveAction>(
    "SELECT * FROM preventive_actions WHERE UPPER(id) = UPPER($1)",
    [cleanId],
  );
  const action = check.rows[0];
  if (!action) throw new Error(`Preventive action #${cleanId} not found.`);

  if (action.status === "COMPLETED" || action.status === "CANCELLED") {
    throw new Error(`Cannot assign staff to a finalized action (${action.status}).`);
  }

  const res = await db.query<DBPreventiveAction>(
    `UPDATE preventive_actions
     SET assigned_to = $1, assigned_role = $2, status = 'ASSIGNED', updated_at = NOW()
     WHERE UPPER(id) = UPPER($3)
     RETURNING *;`,
    [assignedTo.trim(), assignedRole.trim(), cleanId],
  );

  // Audit Log
  await db.query(
    `INSERT INTO audit_logs (actor, actor_role, action, target, target_id, metadata)
     VALUES ($1, $2, 'preventive_action_assigned', 'preventive_action', $3, $4);`,
    [
      actorName,
      actorRole,
      cleanId,
      JSON.stringify({ assigned_to: assignedTo, assigned_role: assignedRole }),
    ],
  );

  return res.rows[0]!;
}

export async function startPreventiveAction(
  actionId: string,
  actorName: string,
  actorRole: string,
): Promise<DBPreventiveAction> {
  await ensurePreventionTables();
  const cleanId = actionId.trim().toUpperCase();

  const check = await db.query<DBPreventiveAction>(
    "SELECT * FROM preventive_actions WHERE UPPER(id) = UPPER($1)",
    [cleanId],
  );
  const action = check.rows[0];
  if (!action) throw new Error(`Preventive action #${cleanId} not found.`);

  if (action.status === "COMPLETED" || action.status === "CANCELLED") {
    throw new Error(`Cannot start a finalized action (${action.status}).`);
  }

  const res = await db.query<DBPreventiveAction>(
    `UPDATE preventive_actions
     SET status = 'IN_PROGRESS', started_at = COALESCE(started_at, NOW()), updated_at = NOW()
     WHERE UPPER(id) = UPPER($1)
     RETURNING *;`,
    [cleanId],
  );

  // Audit Log
  await db.query(
    `INSERT INTO audit_logs (actor, actor_role, action, target, target_id, metadata)
     VALUES ($1, $2, 'preventive_action_started', 'preventive_action', $3, $4);`,
    [actorName, actorRole, cleanId, JSON.stringify({ started_at: new Date().toISOString() })],
  );

  return res.rows[0]!;
}

export async function completePreventiveAction(
  actionId: string,
  completionRemarks: string,
  actorName: string,
  actorRole: string,
): Promise<DBPreventiveAction> {
  await ensurePreventionTables();
  const cleanId = actionId.trim().toUpperCase();

  if (!completionRemarks || completionRemarks.trim().length < 5) {
    throw new Error("Mandatory completion remarks (minimum 5 characters) required.");
  }

  const check = await db.query<DBPreventiveAction>(
    "SELECT * FROM preventive_actions WHERE UPPER(id) = UPPER($1)",
    [cleanId],
  );
  const action = check.rows[0];
  if (!action) throw new Error(`Preventive action #${cleanId} not found.`);

  if (action.status === "COMPLETED") {
    throw new Error("Action is already marked COMPLETED.");
  }
  if (action.status === "CANCELLED") {
    throw new Error("Cannot complete a CANCELLED action.");
  }

  const res = await db.query<DBPreventiveAction>(
    `UPDATE preventive_actions
     SET
       status = 'COMPLETED',
       completed_at = NOW(),
       completion_remarks = $1,
       updated_at = NOW()
     WHERE UPPER(id) = UPPER($2)
     RETURNING *;`,
    [completionRemarks.trim(), cleanId],
  );

  // Audit Log
  await db.query(
    `INSERT INTO audit_logs (actor, actor_role, action, target, target_id, metadata)
     VALUES ($1, $2, 'preventive_action_completed', 'preventive_action', $3, $4);`,
    [
      actorName,
      actorRole,
      cleanId,
      JSON.stringify({
        completion_remarks: completionRemarks.trim(),
        completed_at: new Date().toISOString(),
      }),
    ],
  );

  return res.rows[0]!;
}

// ─── 5. Query Preventive Actions List ───────────────────────────────────────

export async function getPreventiveActions(
  filters: PreventionFilterOptions = {},
  limit = 50,
  offset = 0,
): Promise<{ actions: DBPreventiveAction[]; total: number }> {
  await ensurePreventionTables();

  const conditions: string[] = ["1=1"];
  const values: any[] = [];
  let idx = 1;

  if (filters.department && filters.department !== "ALL") {
    conditions.push(`(UPPER(department) = UPPER($${idx++}) OR department = 'ALL')`);
    values.push(filters.department);
  }
  if (filters.status && filters.status !== "ALL") {
    conditions.push(`UPPER(status) = UPPER($${idx++})`);
    values.push(filters.status);
  }
  if (filters.priority && filters.priority !== "ALL") {
    conditions.push(`UPPER(priority) = UPPER($${idx++})`);
    values.push(filters.priority);
  }
  if (filters.actionType && filters.actionType !== "ALL") {
    conditions.push(`action_type = $${idx++}`);
    values.push(filters.actionType);
  }
  if (filters.search && filters.search.trim()) {
    conditions.push(`(title ILIKE $${idx} OR description ILIKE $${idx} OR location ILIKE $${idx})`);
    idx++;
    values.push(`%${filters.search.trim()}%`);
  }

  const countQuery = `SELECT COUNT(*)::int AS count FROM preventive_actions WHERE ${conditions.join(" AND ")};`;
  const listQuery = `
    SELECT
      id, alert_id, title, description, action_type, priority,
      department, location, room, assigned_to, assigned_role,
      status, due_at, started_at, completed_at, completion_remarks,
      created_by, created_at, updated_at
    FROM preventive_actions
    WHERE ${conditions.join(" AND ")}
    ORDER BY
      CASE status WHEN 'IN_PROGRESS' THEN 1 WHEN 'ASSIGNED' THEN 2 WHEN 'OPEN' THEN 3 ELSE 4 END,
      CASE priority WHEN 'CRITICAL' THEN 1 WHEN 'HIGH' THEN 2 WHEN 'MEDIUM' THEN 3 ELSE 4 END,
      created_at DESC
    LIMIT $${values.length + 1} OFFSET $${values.length + 2};
  `;

  const [countRes, listRes] = await Promise.all([
    db.query<{ count: number }>(countQuery, values),
    db.query<DBPreventiveAction>(listQuery, [...values, limit, offset]),
  ]);

  return {
    actions: listRes.rows,
    total: countRes.rows[0]?.count || 0,
  };
}

// ─── 6. Alert Rules Management ──────────────────────────────────────────────

export async function getSafetyAlertRules(): Promise<DBSafetyAlertRule[]> {
  await ensurePreventionTables();
  const res = await db.query<DBSafetyAlertRule>(
    `SELECT * FROM safety_alert_rules ORDER BY created_at ASC;`,
  );
  return res.rows;
}

export async function toggleSafetyAlertRule(
  ruleId: string,
  enabled: boolean,
  actorName: string,
  actorRole: string,
): Promise<DBSafetyAlertRule> {
  await ensurePreventionTables();
  const cleanId = ruleId.trim().toUpperCase();

  const res = await db.query<DBSafetyAlertRule>(
    `UPDATE safety_alert_rules
     SET enabled = $1, updated_at = NOW()
     WHERE UPPER(id) = UPPER($2)
     RETURNING *;`,
    [enabled, cleanId],
  );
  const rule = res.rows[0];
  if (!rule) throw new Error(`Alert rule #${cleanId} not found.`);

  return rule;
}
