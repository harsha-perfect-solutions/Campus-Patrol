import { createServerFn } from "@tanstack/react-start";
import { requireRole } from "../session.server";
import {
  getSafetyKPIs,
  getIncidentTrends,
  getViolationCategoryStats,
  getSeverityStats,
  getDepartmentStats,
  getEmergencyResponseStats,
  getTimetableIncidentStats,
  getFacultyReportingStats,
  getResolutionStats,
  getCompleteSafetyAnalytics,
  getSafetyAnalyticsDrilldown,
  type SafetyAnalyticsFilters,
  type CompleteSafetyAnalyticsResponse,
  type SafetyKPIs,
  type TrendPoint,
  type CategoryStat,
  type SeverityStat,
  type DepartmentStat,
  type EmergencyMetrics,
  type TimetableIncidentStats,
  type FacultyReportingStat,
  type ResolutionStats,
} from "../db/safety-analytics.server";
import type { DBViolationReport } from "../db/violations.server";

// ─── Admin Analytics APIs (Institution-Wide) ─────────────────────────────────

export const getAdminSafetyAnalyticsApi = createServerFn({ method: "POST" })
  .validator((d: SafetyAnalyticsFilters) => d)
  .handler(
    async ({
      data,
    }): Promise<{
      success: boolean;
      analytics: CompleteSafetyAnalyticsResponse | null;
      error?: string;
    }> => {
      try {
        await requireRole("admin");
        const analytics = await getCompleteSafetyAnalytics(data || {});
        return { success: true, analytics };
      } catch (err: any) {
        console.error("[Safety Analytics API Error] getAdminSafetyAnalyticsApi:", err);
        return {
          success: false,
          analytics: null,
          error: err.message || "Failed to calculate institutional safety analytics.",
        };
      }
    },
  );

export const getAdminSafetyDrilldownApi = createServerFn({ method: "POST" })
  .validator(
    (d: {
      filters?: SafetyAnalyticsFilters;
      drillType?: "department" | "severity" | "category" | "room" | "subject" | "emergency";
      drillKey?: string;
      limit?: number;
      offset?: number;
    }) => d,
  )
  .handler(
    async ({
      data,
    }): Promise<{
      success: boolean;
      reports: DBViolationReport[];
      total: number;
      error?: string;
    }> => {
      try {
        await requireRole("admin");
        const res = await getSafetyAnalyticsDrilldown(
          data.filters || {},
          data.drillType,
          data.drillKey,
          data.limit || 50,
          data.offset || 0,
        );
        return { success: true, reports: res.reports, total: res.total };
      } catch (err: any) {
        console.error("[Safety Analytics API Error] getAdminSafetyDrilldownApi:", err);
        return {
          success: false,
          reports: [],
          total: 0,
          error: err.message || "Failed to load drill-down incidents.",
        };
      }
    },
  );

// ─── HOD Analytics APIs (Department-Isolated Zero-Trust) ─────────────────────

export const getHodSafetyAnalyticsApi = createServerFn({ method: "POST" })
  .validator((d: SafetyAnalyticsFilters) => d)
  .handler(
    async ({
      data,
    }): Promise<{
      success: boolean;
      analytics: CompleteSafetyAnalyticsResponse | null;
      department: string;
      error?: string;
    }> => {
      try {
        const session = await requireRole("hod");
        const hodDept = session.department;
        if (!hodDept) {
          throw new Error("No department assigned to authenticated HOD account.");
        }

        // Zero-Trust: Force department filter to authenticated HOD's department
        const departmentFilters: SafetyAnalyticsFilters = {
          ...(data || {}),
          department: hodDept,
        };

        const analytics = await getCompleteSafetyAnalytics(departmentFilters);

        // Security check: Remove cross-department comparison and faculty ratings
        analytics.departments = analytics.departments.filter(
          (d) => d.department.toUpperCase() === hodDept.toUpperCase(),
        );

        return { success: true, analytics, department: hodDept };
      } catch (err: any) {
        console.error("[Safety Analytics API Error] getHodSafetyAnalyticsApi:", err);
        return {
          success: false,
          analytics: null,
          department: "",
          error: err.message || "Failed to calculate department safety analytics.",
        };
      }
    },
  );

export const getHodSafetyDrilldownApi = createServerFn({ method: "POST" })
  .validator(
    (d: {
      filters?: SafetyAnalyticsFilters;
      drillType?: "department" | "severity" | "category" | "room" | "subject" | "emergency";
      drillKey?: string;
      limit?: number;
      offset?: number;
    }) => d,
  )
  .handler(
    async ({
      data,
    }): Promise<{
      success: boolean;
      reports: DBViolationReport[];
      total: number;
      error?: string;
    }> => {
      try {
        const session = await requireRole("hod");
        const hodDept = session.department;
        if (!hodDept) {
          throw new Error("No department assigned to authenticated HOD account.");
        }

        // Zero-Trust: Enforce HOD's department strictly
        const departmentFilters: SafetyAnalyticsFilters = {
          ...(data.filters || {}),
          department: hodDept,
        };

        const res = await getSafetyAnalyticsDrilldown(
          departmentFilters,
          data.drillType,
          data.drillKey,
          data.limit || 50,
          data.offset || 0,
        );

        return { success: true, reports: res.reports, total: res.total };
      } catch (err: any) {
        console.error("[Safety Analytics API Error] getHodSafetyDrilldownApi:", err);
        return {
          success: false,
          reports: [],
          total: 0,
          error: err.message || "Failed to load department incidents.",
        };
      }
    },
  );

export default {};
