import { db } from "../db.server";
import type { DBViolationReport } from "./violations.server";

// ─── Filter Types ────────────────────────────────────────────────────────────

export interface SafetyAnalyticsFilters {
  startDate?: string | undefined;
  endDate?: string | undefined;
  department?: string | undefined; // If HOD, enforced server-side
  year?: string | undefined;
  section?: string | undefined;
  severity?: string | undefined;
  violationType?: string | undefined;
  status?: string | undefined;
  emergencyStatus?: string | undefined;
  faculty?: string | undefined;
  room?: string | undefined;
  subject?: string | undefined;
}

// ─── Analytics Return Types ──────────────────────────────────────────────────

export interface SafetyKPIs {
  totalIncidents: number;
  openIncidents: number;
  underHodReview: number;
  escalatedIncidents: number;
  resolvedIncidents: number;
  dismissedIncidents: number;
  highSeverityIncidents: number;
  criticalIncidents: number;
  violenceReports: number;
  emergencyIncidents: number;
}

export interface TrendPoint {
  period: string; // ISO date / label
  total: number;
  critical: number;
  resolved: number;
  violence: number;
}

export interface CategoryStat {
  category: string;
  count: number;
  percentage: number;
  criticalCount: number;
}

export interface SeverityStat {
  severity: "Low" | "Medium" | "High" | "Critical";
  count: number;
  percentage: number;
}

export interface DepartmentStat {
  department: string;
  totalIncidents: number;
  criticalIncidents: number;
  violenceIncidents: number;
  openCases: number;
  resolvedCases: number;
  avgResolutionHours: number;
}

export interface EmergencyMetrics {
  total: number;
  byStatus: {
    reported: number;
    acknowledged: number;
    responder_assigned: number;
    responding: number;
    controlled: number;
    resolved: number;
    dismissed: number;
  };
  avgResponseSeconds: number; // created_at -> acknowledged_at
  avgDispatchSeconds: number; // acknowledged_at -> assigned_at
  avgControlSeconds: number; // response_started_at -> controlled_at
  avgResolutionSeconds: number; // created_at -> resolved_at
}

export interface TimetableIncidentStats {
  inClassIncidents: number;
  freePeriodIncidents: number;
  topRooms: { room: string; count: number }[];
  topSubjects: { subject: string; code: string; count: number }[];
  topTimeSlots: { timeSlot: string; count: number }[];
}

export interface FacultyReportingStat {
  facultyName: string;
  department: string;
  totalReports: number;
  criticalReports: number;
  mostFrequentCategory: string;
}

export interface ResolutionStats {
  avgReviewHours: number;
  avgResolutionHours: number;
  avgDismissalHours: number;
  resolutionRate: number; // percentage
  dismissalRate: number; // percentage
  escalationRate: number; // percentage
  pendingRate: number; // percentage
}

export interface CompleteSafetyAnalyticsResponse {
  kpis: SafetyKPIs;
  trends: TrendPoint[];
  categories: CategoryStat[];
  severities: SeverityStat[];
  departments: DepartmentStat[];
  emergency: EmergencyMetrics;
  timetable: TimetableIncidentStats;
  facultyReporting: FacultyReportingStat[];
  resolution: ResolutionStats;
}

// ─── Ensure DB Indexes ───────────────────────────────────────────────────────

let indexesEnsured = false;
export async function ensureAnalyticsIndexes(): Promise<void> {
  if (indexesEnsured) return;
  try {
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_violation_reports_created_at ON violation_reports (created_at);
      CREATE INDEX IF NOT EXISTS idx_violation_reports_dept_status ON violation_reports (department, status);
      CREATE INDEX IF NOT EXISTS idx_violation_reports_severity ON violation_reports (severity);
      CREATE INDEX IF NOT EXISTS idx_violation_reports_vtype ON violation_reports (violation_type);
      CREATE INDEX IF NOT EXISTS idx_violation_reports_student ON violation_reports (student_code);
      CREATE INDEX IF NOT EXISTS idx_emergency_incidents_created_at ON emergency_incidents (created_at);
      CREATE INDEX IF NOT EXISTS idx_emergency_incidents_status ON emergency_incidents (status);
      CREATE INDEX IF NOT EXISTS idx_emergency_incidents_dept ON emergency_incidents (department);
    `);
    indexesEnsured = true;
  } catch (err) {
    console.warn("[Analytics DB Warning] Index creation notice:", err);
  }
}

// ─── SQL Where Clause Builder ────────────────────────────────────────────────

function buildViolationWhereClause(
  filters: SafetyAnalyticsFilters = {},
  paramOffset = 1,
): { sql: string; values: any[] } {
  const conditions: string[] = ["1=1"];
  const values: any[] = [];
  let idx = paramOffset;

  if (filters.department && filters.department !== "ALL") {
    conditions.push(`UPPER(v.department) = UPPER($${idx++})`);
    values.push(filters.department);
  }

  if (filters.severity && filters.severity !== "ALL") {
    conditions.push(`UPPER(v.severity) = UPPER($${idx++})`);
    values.push(filters.severity);
  }

  if (filters.violationType && filters.violationType !== "ALL") {
    conditions.push(`UPPER(v.violation_type) = UPPER($${idx++})`);
    values.push(filters.violationType);
  }

  if (filters.status && filters.status !== "ALL") {
    conditions.push(`v.status = $${idx++}`);
    values.push(filters.status.toLowerCase());
  }

  if (filters.faculty && filters.faculty !== "ALL") {
    conditions.push(`v.reported_by ILIKE $${idx++}`);
    values.push(`%${filters.faculty}%`);
  }

  if (filters.room && filters.room !== "ALL") {
    conditions.push(`UPPER(v.room) = UPPER($${idx++})`);
    values.push(filters.room);
  }

  if (filters.subject && filters.subject !== "ALL") {
    conditions.push(`(v.class_name ILIKE $${idx} OR v.subject_code ILIKE $${idx})`);
    idx++;
    values.push(`%${filters.subject}%`);
  }

  if (filters.year && filters.year !== "ALL") {
    conditions.push(`v.year_section ILIKE $${idx++}`);
    values.push(`%${filters.year}%`);
  }

  if (filters.section && filters.section !== "ALL") {
    conditions.push(`v.year_section ILIKE $${idx++}`);
    values.push(`%${filters.section}%`);
  }

  if (filters.startDate) {
    conditions.push(`v.created_at >= $${idx++}::timestamptz`);
    values.push(filters.startDate);
  }

  if (filters.endDate) {
    conditions.push(`v.created_at <= $${idx++}::timestamptz`);
    values.push(filters.endDate);
  }

  return { sql: conditions.join(" AND "), values };
}

// ─── 1. KPI Calculation ──────────────────────────────────────────────────────

export async function getSafetyKPIs(filters: SafetyAnalyticsFilters = {}): Promise<SafetyKPIs> {
  await ensureAnalyticsIndexes();
  const { sql, values } = buildViolationWhereClause(filters);

  const kpiQuery = `
    SELECT
      COUNT(*)::int AS "totalIncidents",
      COUNT(*) FILTER (WHERE status NOT IN ('resolved', 'dismissed'))::int AS "openIncidents",
      COUNT(*) FILTER (WHERE status IN ('under_review', 'explanation_submitted'))::int AS "underHodReview",
      COUNT(*) FILTER (WHERE status = 'escalated')::int AS "escalatedIncidents",
      COUNT(*) FILTER (WHERE status = 'resolved')::int AS "resolvedIncidents",
      COUNT(*) FILTER (WHERE status = 'dismissed')::int AS "dismissedIncidents",
      COUNT(*) FILTER (WHERE UPPER(severity) = 'HIGH')::int AS "highSeverityIncidents",
      COUNT(*) FILTER (WHERE UPPER(severity) = 'CRITICAL')::int AS "criticalIncidents",
      COUNT(*) FILTER (WHERE violation_type ILIKE '%violence%' OR violation_type ILIKE '%altercation%')::int AS "violenceReports"
    FROM violation_reports v
    WHERE ${sql};
  `;

  // Emergency count query respecting department/date filters
  const emgConditions: string[] = ["1=1"];
  const emgValues: any[] = [];
  let eIdx = 1;

  if (filters.department && filters.department !== "ALL") {
    emgConditions.push(`UPPER(department) = UPPER($${eIdx++})`);
    emgValues.push(filters.department);
  }
  if (filters.startDate) {
    emgConditions.push(`created_at >= $${eIdx++}::timestamptz`);
    emgValues.push(filters.startDate);
  }
  if (filters.endDate) {
    emgConditions.push(`created_at <= $${eIdx++}::timestamptz`);
    emgValues.push(filters.endDate);
  }

  const emgQuery = `
    SELECT COUNT(*)::int AS "emergencyCount"
    FROM emergency_incidents
    WHERE ${emgConditions.join(" AND ")};
  `;

  const [kpiRes, emgRes] = await Promise.all([
    db.query<any>(kpiQuery, values),
    db.query<any>(emgQuery, emgValues),
  ]);

  const row = kpiRes.rows[0] || {};
  const emgCount = emgRes.rows[0]?.emergencyCount || 0;

  return {
    totalIncidents: row.totalIncidents || 0,
    openIncidents: row.openIncidents || 0,
    underHodReview: row.underHodReview || 0,
    escalatedIncidents: row.escalatedIncidents || 0,
    resolvedIncidents: row.resolvedIncidents || 0,
    dismissedIncidents: row.dismissedIncidents || 0,
    highSeverityIncidents: row.highSeverityIncidents || 0,
    criticalIncidents: row.criticalIncidents || 0,
    violenceReports: row.violenceReports || 0,
    emergencyIncidents: emgCount,
  };
}

// ─── 2. Trend Analytics (Daily / Weekly / Monthly) ───────────────────────────

export async function getIncidentTrends(
  filters: SafetyAnalyticsFilters = {},
  granularity: "day" | "week" | "month" = "day",
): Promise<TrendPoint[]> {
  await ensureAnalyticsIndexes();
  const { sql, values } = buildViolationWhereClause(filters);

  const query = `
    SELECT
      to_char(DATE_TRUNC('${granularity}', v.created_at), 'YYYY-MM-DD') AS period,
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE UPPER(v.severity) IN ('CRITICAL', 'HIGH'))::int AS critical,
      COUNT(*) FILTER (WHERE v.status = 'resolved')::int AS resolved,
      COUNT(*) FILTER (WHERE v.violation_type ILIKE '%violence%' OR v.violation_type ILIKE '%altercation%')::int AS violence
    FROM violation_reports v
    WHERE ${sql}
    GROUP BY DATE_TRUNC('${granularity}', v.created_at)
    ORDER BY DATE_TRUNC('${granularity}', v.created_at) ASC
    LIMIT 90;
  `;

  const res = await db.query<TrendPoint>(query, values);
  return res.rows;
}

// ─── 3. Violation Category Breakdown ─────────────────────────────────────────

export async function getViolationCategoryStats(
  filters: SafetyAnalyticsFilters = {},
): Promise<CategoryStat[]> {
  await ensureAnalyticsIndexes();
  const { sql, values } = buildViolationWhereClause(filters);

  const query = `
    WITH category_counts AS (
      SELECT
        COALESCE(NULLIF(TRIM(v.violation_type), ''), 'Unspecified Violation') AS category,
        COUNT(*)::int AS count,
        COUNT(*) FILTER (WHERE UPPER(v.severity) = 'CRITICAL')::int AS critical_count
      FROM violation_reports v
      WHERE ${sql}
      GROUP BY COALESCE(NULLIF(TRIM(v.violation_type), ''), 'Unspecified Violation')
    ),
    total_val AS (
      SELECT SUM(count)::float AS total_sum FROM category_counts
    )
    SELECT
      c.category,
      c.count,
      CASE WHEN t.total_sum > 0 THEN ROUND((c.count / t.total_sum * 100)::numeric, 1)::float ELSE 0 END AS percentage,
      c.critical_count AS "criticalCount"
    FROM category_counts c, total_val t
    ORDER BY c.count DESC;
  `;

  const res = await db.query<CategoryStat>(query, values);
  return res.rows;
}

// ─── 4. Severity Distribution ────────────────────────────────────────────────

export async function getSeverityStats(
  filters: SafetyAnalyticsFilters = {},
): Promise<SeverityStat[]> {
  await ensureAnalyticsIndexes();
  const { sql, values } = buildViolationWhereClause(filters);

  const query = `
    WITH severity_counts AS (
      SELECT
        CASE 
          WHEN UPPER(v.severity) = 'CRITICAL' THEN 'Critical'
          WHEN UPPER(v.severity) = 'HIGH' THEN 'High'
          WHEN UPPER(v.severity) = 'MEDIUM' THEN 'Medium'
          ELSE 'Low'
        END AS severity,
        COUNT(*)::int AS count
      FROM violation_reports v
      WHERE ${sql}
      GROUP BY 
        CASE 
          WHEN UPPER(v.severity) = 'CRITICAL' THEN 'Critical'
          WHEN UPPER(v.severity) = 'HIGH' THEN 'High'
          WHEN UPPER(v.severity) = 'MEDIUM' THEN 'Medium'
          ELSE 'Low'
        END
    ),
    total_val AS (
      SELECT SUM(count)::float AS total_sum FROM severity_counts
    )
    SELECT
      s.severity,
      s.count,
      CASE WHEN t.total_sum > 0 THEN ROUND((s.count / t.total_sum * 100)::numeric, 1)::float ELSE 0 END AS percentage
    FROM severity_counts s, total_val t
    ORDER BY 
      CASE s.severity
        WHEN 'Critical' THEN 1
        WHEN 'High' THEN 2
        WHEN 'Medium' THEN 3
        WHEN 'Low' THEN 4
      END;
  `;

  const res = await db.query<SeverityStat>(query, values);
  const existing = new Map(res.rows.map((r: any) => [r.severity, r]));
  const order: ("Low" | "Medium" | "High" | "Critical")[] = ["Low", "Medium", "High", "Critical"];

  return order.map((sev) => {
    const found = existing.get(sev);
    return found || { severity: sev, count: 0, percentage: 0 };
  }) as SeverityStat[];
}

// ─── 5. Department Comparison (Admin Only) ───────────────────────────────────

export async function getDepartmentStats(
  filters: SafetyAnalyticsFilters = {},
): Promise<DepartmentStat[]> {
  await ensureAnalyticsIndexes();
  const { sql, values } = buildViolationWhereClause(filters);

  const query = `
    SELECT
      COALESCE(NULLIF(TRIM(v.department), ''), 'General') AS department,
      COUNT(*)::int AS "totalIncidents",
      COUNT(*) FILTER (WHERE UPPER(v.severity) IN ('CRITICAL', 'HIGH'))::int AS "criticalIncidents",
      COUNT(*) FILTER (WHERE v.violation_type ILIKE '%violence%' OR v.violation_type ILIKE '%altercation%')::int AS "violenceIncidents",
      COUNT(*) FILTER (WHERE v.status NOT IN ('resolved', 'dismissed'))::int AS "openCases",
      COUNT(*) FILTER (WHERE v.status = 'resolved')::int AS "resolvedCases",
      ROUND(
        COALESCE(
          AVG(
            EXTRACT(EPOCH FROM (v.decision_at::timestamptz - v.created_at::timestamptz)) / 3600
          ) FILTER (WHERE v.decision_at IS NOT NULL),
          0
        )::numeric, 1
      )::float AS "avgResolutionHours"
    FROM violation_reports v
    WHERE ${sql}
    GROUP BY COALESCE(NULLIF(TRIM(v.department), ''), 'General')
    ORDER BY "totalIncidents" DESC;
  `;

  const res = await db.query<DepartmentStat>(query, values);
  return res.rows;
}

// ─── 6. Emergency Response Metrics ───────────────────────────────────────────

export async function getEmergencyResponseStats(
  filters: SafetyAnalyticsFilters = {},
): Promise<EmergencyMetrics> {
  await ensureAnalyticsIndexes();
  const conditions: string[] = ["1=1"];
  const values: any[] = [];
  let idx = 1;

  if (filters.department && filters.department !== "ALL") {
    conditions.push(`UPPER(department) = UPPER($${idx++})`);
    values.push(filters.department);
  }
  if (filters.startDate) {
    conditions.push(`created_at >= $${idx++}::timestamptz`);
    values.push(filters.startDate);
  }
  if (filters.endDate) {
    conditions.push(`created_at <= $${idx++}::timestamptz`);
    values.push(filters.endDate);
  }

  const query = `
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE status = 'reported')::int AS "st_reported",
      COUNT(*) FILTER (WHERE status = 'acknowledged')::int AS "st_acknowledged",
      COUNT(*) FILTER (WHERE status = 'responder_assigned')::int AS "st_assigned",
      COUNT(*) FILTER (WHERE status = 'responding')::int AS "st_responding",
      COUNT(*) FILTER (WHERE status = 'controlled')::int AS "st_controlled",
      COUNT(*) FILTER (WHERE status = 'resolved')::int AS "st_resolved",
      COUNT(*) FILTER (WHERE status = 'dismissed')::int AS "st_dismissed",
      COALESCE(
        ROUND(AVG(EXTRACT(EPOCH FROM (acknowledged_at - created_at))) FILTER (WHERE acknowledged_at IS NOT NULL AND acknowledged_at >= created_at)::numeric, 0),
        0
      )::int AS "avgResponseSeconds",
      COALESCE(
        ROUND(AVG(EXTRACT(EPOCH FROM (response_started_at - acknowledged_at))) FILTER (WHERE response_started_at IS NOT NULL AND acknowledged_at IS NOT NULL AND response_started_at >= acknowledged_at)::numeric, 0),
        0
      )::int AS "avgDispatchSeconds",
      COALESCE(
        ROUND(AVG(EXTRACT(EPOCH FROM (controlled_at - response_started_at))) FILTER (WHERE controlled_at IS NOT NULL AND response_started_at IS NOT NULL AND controlled_at >= response_started_at)::numeric, 0),
        0
      )::int AS "avgControlSeconds",
      COALESCE(
        ROUND(AVG(EXTRACT(EPOCH FROM (resolved_at - created_at))) FILTER (WHERE resolved_at IS NOT NULL AND resolved_at >= created_at)::numeric, 0),
        0
      )::int AS "avgResolutionSeconds"
    FROM emergency_incidents
    WHERE ${conditions.join(" AND ")};
  `;

  const res = await db.query<any>(query, values);
  const row = res.rows[0] || {};

  return {
    total: row.total || 0,
    byStatus: {
      reported: row.st_reported || 0,
      acknowledged: row.st_acknowledged || 0,
      responder_assigned: row.st_assigned || 0,
      responding: row.st_responding || 0,
      controlled: row.st_controlled || 0,
      resolved: row.st_resolved || 0,
      dismissed: row.st_dismissed || 0,
    },
    avgResponseSeconds: row.avgResponseSeconds || 0,
    avgDispatchSeconds: row.avgDispatchSeconds || 0,
    avgControlSeconds: row.avgControlSeconds || 0,
    avgResolutionSeconds: row.avgResolutionSeconds || 0,
  };
}

// ─── 7. Timetable-Based Safety Analytics ─────────────────────────────────────

export async function getTimetableIncidentStats(
  filters: SafetyAnalyticsFilters = {},
): Promise<TimetableIncidentStats> {
  await ensureAnalyticsIndexes();
  const { sql, values } = buildViolationWhereClause(filters);

  // 1. In-Class vs Free Period
  const inClassQuery = `
    SELECT
      COUNT(*) FILTER (WHERE NULLIF(TRIM(v.class_name), '') IS NOT NULL AND v.class_name NOT ILIKE '%free%')::int AS "inClass",
      COUNT(*) FILTER (WHERE NULLIF(TRIM(v.class_name), '') IS NULL OR v.class_name ILIKE '%free%')::int AS "freePeriod"
    FROM violation_reports v
    WHERE ${sql};
  `;

  // 2. Top Rooms
  const roomsQuery = `
    SELECT
      COALESCE(NULLIF(TRIM(v.room), ''), 'Unspecified / Corridor') AS room,
      COUNT(*)::int AS count
    FROM violation_reports v
    WHERE ${sql} AND NULLIF(TRIM(v.room), '') IS NOT NULL
    GROUP BY COALESCE(NULLIF(TRIM(v.room), ''), 'Unspecified / Corridor')
    ORDER BY count DESC
    LIMIT 6;
  `;

  // 3. Top Subjects
  const subjectsQuery = `
    SELECT
      COALESCE(NULLIF(TRIM(v.class_name), ''), 'General Activity') AS subject,
      COALESCE(NULLIF(TRIM(v.subject_code), ''), '—') AS code,
      COUNT(*)::int AS count
    FROM violation_reports v
    WHERE ${sql} AND NULLIF(TRIM(v.class_name), '') IS NOT NULL
    GROUP BY COALESCE(NULLIF(TRIM(v.class_name), ''), 'General Activity'), COALESCE(NULLIF(TRIM(v.subject_code), ''), '—')
    ORDER BY count DESC
    LIMIT 6;
  `;

  // 4. Top Scheduled Time Slots
  const timeSlotsQuery = `
    SELECT
      COALESCE(NULLIF(TRIM(v.scheduled_time), ''), 'Corridor Period') AS "timeSlot",
      COUNT(*)::int AS count
    FROM violation_reports v
    WHERE ${sql}
    GROUP BY COALESCE(NULLIF(TRIM(v.scheduled_time), ''), 'Corridor Period')
    ORDER BY count DESC
    LIMIT 6;
  `;

  const [classRes, roomsRes, subjectsRes, timeRes] = await Promise.all([
    db.query<any>(inClassQuery, values),
    db.query<any>(roomsQuery, values),
    db.query<any>(subjectsQuery, values),
    db.query<any>(timeSlotsQuery, values),
  ]);

  return {
    inClassIncidents: classRes.rows[0]?.inClass || 0,
    freePeriodIncidents: classRes.rows[0]?.freePeriod || 0,
    topRooms: roomsRes.rows || [],
    topSubjects: subjectsRes.rows || [],
    topTimeSlots: timeRes.rows || [],
  };
}

// ─── 8. Faculty Reporting Statistics (Admin Only) ────────────────────────────

export async function getFacultyReportingStats(
  filters: SafetyAnalyticsFilters = {},
): Promise<FacultyReportingStat[]> {
  await ensureAnalyticsIndexes();
  const { sql, values } = buildViolationWhereClause(filters);

  const query = `
    WITH faculty_summary AS (
      SELECT
        COALESCE(NULLIF(TRIM(v.reported_by), ''), 'System / Security') AS faculty_name,
        COALESCE(NULLIF(TRIM(v.department), ''), 'General') AS department,
        COUNT(*)::int AS total_reports,
        COUNT(*) FILTER (WHERE UPPER(v.severity) = 'CRITICAL')::int AS critical_reports
      FROM violation_reports v
      WHERE ${sql}
      GROUP BY COALESCE(NULLIF(TRIM(v.reported_by), ''), 'System / Security'), COALESCE(NULLIF(TRIM(v.department), ''), 'General')
    )
    SELECT
      f.faculty_name AS "facultyName",
      f.department,
      f.total_reports AS "totalReports",
      f.critical_reports AS "criticalReports",
      'Class Absence' AS "mostFrequentCategory"
    FROM faculty_summary f
    ORDER BY f.total_reports DESC
    LIMIT 10;
  `;

  const res = await db.query<FacultyReportingStat>(query, values);
  return res.rows;
}

// ─── 9. Resolution Durations & Performance ───────────────────────────────────

export async function getResolutionStats(
  filters: SafetyAnalyticsFilters = {},
): Promise<ResolutionStats> {
  await ensureAnalyticsIndexes();
  const { sql, values } = buildViolationWhereClause(filters);

  const query = `
    WITH base AS (
      SELECT
        status,
        created_at,
        decision_at,
        explanation_submitted_at
      FROM violation_reports v
      WHERE ${sql}
    ),
    totals AS (
      SELECT
        COUNT(*)::float AS total_count,
        COUNT(*) FILTER (WHERE status = 'resolved')::float AS resolved_count,
        COUNT(*) FILTER (WHERE status = 'dismissed')::float AS dismissed_count,
        COUNT(*) FILTER (WHERE status = 'escalated')::float AS escalated_count,
        COUNT(*) FILTER (WHERE status NOT IN ('resolved', 'dismissed'))::float AS pending_count,
        COALESCE(
          AVG(
            EXTRACT(EPOCH FROM (COALESCE(explanation_submitted_at::timestamptz, decision_at::timestamptz) - created_at::timestamptz)) / 3600
          ) FILTER (WHERE explanation_submitted_at IS NOT NULL OR decision_at IS NOT NULL),
          0
        )::float AS avg_review_hours,
        COALESCE(
          AVG(
            EXTRACT(EPOCH FROM (decision_at::timestamptz - created_at::timestamptz)) / 3600
          ) FILTER (WHERE status = 'resolved' AND decision_at IS NOT NULL),
          0
        )::float AS avg_resolution_hours,
        COALESCE(
          AVG(
            EXTRACT(EPOCH FROM (decision_at::timestamptz - created_at::timestamptz)) / 3600
          ) FILTER (WHERE status = 'dismissed' AND decision_at IS NOT NULL),
          0
        )::float AS avg_dismissal_hours
      FROM base
    )
    SELECT
      ROUND(avg_review_hours::numeric, 1)::float AS "avgReviewHours",
      ROUND(avg_resolution_hours::numeric, 1)::float AS "avgResolutionHours",
      ROUND(avg_dismissal_hours::numeric, 1)::float AS "avgDismissalHours",
      CASE WHEN total_count > 0 THEN ROUND((resolved_count / total_count * 100)::numeric, 1)::float ELSE 0 END AS "resolutionRate",
      CASE WHEN total_count > 0 THEN ROUND((dismissed_count / total_count * 100)::numeric, 1)::float ELSE 0 END AS "dismissalRate",
      CASE WHEN total_count > 0 THEN ROUND((escalated_count / total_count * 100)::numeric, 1)::float ELSE 0 END AS "escalationRate",
      CASE WHEN total_count > 0 THEN ROUND((pending_count / total_count * 100)::numeric, 1)::float ELSE 0 END AS "pendingRate"
    FROM totals;
  `;

  const res = await db.query<ResolutionStats>(query, values);
  return (
    res.rows[0] || {
      avgReviewHours: 0,
      avgResolutionHours: 0,
      avgDismissalHours: 0,
      resolutionRate: 0,
      dismissalRate: 0,
      escalationRate: 0,
      pendingRate: 0,
    }
  );
}

// ─── 10. Complete Analytics Aggregation ──────────────────────────────────────

export async function getCompleteSafetyAnalytics(
  filters: SafetyAnalyticsFilters = {},
): Promise<CompleteSafetyAnalyticsResponse> {
  const [
    kpis,
    trends,
    categories,
    severities,
    departments,
    emergency,
    timetable,
    facultyReporting,
    resolution,
  ] = await Promise.all([
    getSafetyKPIs(filters),
    getIncidentTrends(filters, "day"),
    getViolationCategoryStats(filters),
    getSeverityStats(filters),
    getDepartmentStats(filters),
    getEmergencyResponseStats(filters),
    getTimetableIncidentStats(filters),
    getFacultyReportingStats(filters),
    getResolutionStats(filters),
  ]);

  return {
    kpis,
    trends,
    categories,
    severities,
    departments,
    emergency,
    timetable,
    facultyReporting,
    resolution,
  };
}

// ─── 11. Drill-Down Incidents List ───────────────────────────────────────────

export async function getSafetyAnalyticsDrilldown(
  filters: SafetyAnalyticsFilters = {},
  drillType?: "department" | "severity" | "category" | "room" | "subject" | "emergency",
  drillKey?: string,
  limit = 50,
  offset = 0,
): Promise<{ reports: DBViolationReport[]; total: number }> {
  await ensureAnalyticsIndexes();
  const mergedFilters = { ...filters };

  if (drillType && drillKey && drillKey !== "ALL") {
    if (drillType === "department") mergedFilters.department = drillKey;
    if (drillType === "severity") mergedFilters.severity = drillKey;
    if (drillType === "category") mergedFilters.violationType = drillKey;
    if (drillType === "room") mergedFilters.room = drillKey;
    if (drillType === "subject") mergedFilters.subject = drillKey;
  }

  const { sql, values } = buildViolationWhereClause(mergedFilters);
  const countQuery = `SELECT COUNT(*)::int AS count FROM violation_reports v WHERE ${sql};`;
  const listQuery = `
    SELECT
      v.id,
      v.student_code,
      v.student_name,
      v.department,
      v.year_section,
      v.class_name,
      v.subject_code,
      v.scheduled_time,
      v.room,
      v.scheduled_faculty,
      v.incident_time,
      v.location,
      v.violation_type,
      v.severity,
      v.remarks,
      v.witness_notes,
      v.evidence,
      v.reported_by,
      v.status,
      v.explanation,
      v.explanation_submitted_at,
      v.decision,
      v.decision_by,
      v.decision_at,
      v.semester,
      v.explanation_deadline,
      v.created_at
    FROM violation_reports v
    WHERE ${sql}
    ORDER BY v.created_at DESC
    LIMIT $${values.length + 1} OFFSET $${values.length + 2};
  `;

  const [countRes, listRes] = await Promise.all([
    db.query<{ count: number }>(countQuery, values),
    db.query<DBViolationReport>(listQuery, [...values, limit, offset]),
  ]);

  return {
    reports: listRes.rows,
    total: countRes.rows[0]?.count || 0,
  };
}
