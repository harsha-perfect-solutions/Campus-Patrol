import { createServerFn } from "@tanstack/react-start";
import { requireRole } from "../session.server";
import {
  detectSafetyHotspots,
  getDetailedEmergencyBenchmarks,
  getLocationSafetyBreakdown,
  createExecutiveSafetyReport,
  getSavedSafetyReports,
  getSavedSafetyReportById,
  generateInstitutionalObservationsAndRecommendations,
  type SafetyHotspot,
  type DetailedEmergencyBenchmark,
  type LocationSafetyStat,
  type SavedSafetyReportSnapshot,
} from "../db/safety-reporting.server";
import {
  getSafetyKPIs,
  getIncidentTrends,
  getViolationCategoryStats,
  getSeverityStats,
  getDepartmentStats,
  getResolutionStats,
  getTimetableIncidentStats,
  type SafetyAnalyticsFilters,
  type SafetyKPIs,
  type TrendPoint,
  type CategoryStat,
  type SeverityStat,
  type DepartmentStat,
  type ResolutionStats,
  type TimetableIncidentStats,
} from "../db/safety-analytics.server";
import { db } from "../db.server";

export interface ExecutiveDashboardData {
  kpis: SafetyKPIs;
  trends: TrendPoint[];
  hotspots: SafetyHotspot[];
  emergencyBenchmarks: DetailedEmergencyBenchmark;
  locationBreakdown: LocationSafetyStat[];
  departmentBreakdown: DepartmentStat[];
  categoryBreakdown: CategoryStat[];
  severityBreakdown: SeverityStat[];
  disciplinaryMetrics: ResolutionStats;
  timetableStats: TimetableIncidentStats;
  observations: string[];
  recommendations: string[];
}

// ─── 1. Live Executive Dashboard Query API ──────────────────────────────────

export const getExecutiveSafetyDashboardApi = createServerFn({ method: "POST" })
  .validator((d: SafetyAnalyticsFilters) => d)
  .handler(
    async ({
      data,
    }): Promise<{
      success: boolean;
      data: ExecutiveDashboardData | null;
      error?: string;
    }> => {
      try {
        const session = await requireRole("admin");
        const filters = data || {};

        const [
          kpis,
          trends,
          hotspots,
          emergencyBenchmarks,
          locationBreakdown,
          departmentBreakdown,
          categoryBreakdown,
          severityBreakdown,
          disciplinaryMetrics,
          timetableStats,
        ] = await Promise.all([
          getSafetyKPIs(filters),
          getIncidentTrends(filters, "day"),
          detectSafetyHotspots(filters, 8),
          getDetailedEmergencyBenchmarks(filters),
          getLocationSafetyBreakdown(filters, 10),
          getDepartmentStats(filters),
          getViolationCategoryStats(filters),
          getSeverityStats(filters),
          getResolutionStats(filters),
          getTimetableIncidentStats(filters),
        ]);

        const { observations, recommendations } =
          generateInstitutionalObservationsAndRecommendations(
            kpis,
            hotspots,
            emergencyBenchmarks,
            disciplinaryMetrics,
            categoryBreakdown,
          );

        return {
          success: true,
          data: {
            kpis,
            trends,
            hotspots,
            emergencyBenchmarks,
            locationBreakdown,
            departmentBreakdown,
            categoryBreakdown,
            severityBreakdown,
            disciplinaryMetrics,
            timetableStats,
            observations,
            recommendations,
          },
        };
      } catch (err: any) {
        console.error("[Safety Reporting API Error] getExecutiveSafetyDashboardApi:", err);
        return {
          success: false,
          data: null,
          error: err.message || "Failed to load executive safety intelligence.",
        };
      }
    },
  );

// ─── 2. Generate & Save Immutable Executive Snapshot API ─────────────────────

export const generateExecutiveSafetyReportApi = createServerFn({ method: "POST" })
  .validator(
    (d: {
      filters?: SafetyAnalyticsFilters | undefined;
      customTitle?: string | undefined;
    }) => d,
  )
  .handler(
    async ({
      data,
    }): Promise<{
      success: boolean;
      report: SavedSafetyReportSnapshot | null;
      error?: string;
    }> => {
      try {
        const session = await requireRole("admin");
        const report = await createExecutiveSafetyReport(
          data.filters || {},
          session.fullName || "Chief Safety Administrator",
          session.role || "admin",
          data.customTitle,
        );

        return { success: true, report };
      } catch (err: any) {
        console.error("[Safety Reporting API Error] generateExecutiveSafetyReportApi:", err);
        return {
          success: false,
          report: null,
          error: err.message || "Failed to generate safety report snapshot.",
        };
      }
    },
  );

// ─── 3. List Saved Safety Reports API ───────────────────────────────────────

export const getSavedSafetyReportsApi = createServerFn({ method: "GET" }).handler(
  async (): Promise<{
    success: boolean;
    reports: SavedSafetyReportSnapshot[];
    error?: string;
  }> => {
    try {
      await requireRole("admin");
      const reports = await getSavedSafetyReports();
      return { success: true, reports };
    } catch (err: any) {
      console.error("[Safety Reporting API Error] getSavedSafetyReportsApi:", err);
      return {
        success: false,
        reports: [],
        error: err.message || "Failed to list saved reports.",
      };
    }
  },
);

// ─── 4. Get Single Saved Safety Report by ID API ────────────────────────────

export const getSavedSafetyReportByIdApi = createServerFn({ method: "POST" })
  .validator((d: { id: string }) => d)
  .handler(
    async ({
      data,
    }): Promise<{
      success: boolean;
      report: SavedSafetyReportSnapshot | null;
      error?: string;
    }> => {
      try {
        const session = await requireRole("admin");
        const report = await getSavedSafetyReportById(data.id);
        if (!report) {
          throw new Error(`Report #${data.id} not found.`);
        }
        return { success: true, report };
      } catch (err: any) {
        console.error("[Safety Reporting API Error] getSavedSafetyReportByIdApi:", err);
        return {
          success: false,
          report: null,
          error: err.message || "Failed to retrieve safety report.",
        };
      }
    },
  );

// ─── 5. Record Export Audit Log API ─────────────────────────────────────────

export const logReportExportApi = createServerFn({ method: "POST" })
  .validator(
    (d: {
      reportId?: string | undefined;
      exportFormat: "CSV" | "EXCEL" | "PRINT";
      scope: string;
    }) => d,
  )
  .handler(
    async ({
      data,
    }): Promise<{
      success: boolean;
      error?: string;
    }> => {
      try {
        const session = await requireRole("admin");
        await db.query(
          `INSERT INTO audit_logs (actor, actor_role, action, target, target_id, metadata)
           VALUES ($1, $2, 'export_safety_report', 'safety_report', $3, $4);`,
          [
            session.fullName || "Admin User",
            session.role || "admin",
            data.reportId || "LIVE_EXPORT",
            JSON.stringify({
              export_format: data.exportFormat,
              scope: data.scope,
              exported_at: new Date().toISOString(),
            }),
          ],
        );
        return { success: true };
      } catch (err: any) {
        console.error("[Safety Reporting API Error] logReportExportApi:", err);
        return { success: false, error: err.message };
      }
    },
  );
