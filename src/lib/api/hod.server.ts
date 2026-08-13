import { createServerFn } from "@tanstack/react-start";
import { requireRole } from "../session.server";
import { db } from "../db.server";
import {
  getHodCases,
  getHodCaseById,
  submitHodDecision,
  submitStudentExplanation,
  getHodDashboardStats,
  getHodStudents,
  type HODDashboardStats,
} from "../db/hod.server";
import type { DBViolationReport } from "../db/violations.server";

export type HodCasesResponse = {
  success: boolean;
  reports: DBViolationReport[];
  error?: string;
};

export type CaseDetailResponse = {
  success: boolean;
  report: DBViolationReport | null;
  error?: string;
};

/**
 * Server function to fetch HOD active cases queue with strict server-derived department isolation.
 */
export const getHodCasesApi = createServerFn({ method: "GET" }).handler(
  async (): Promise<HodCasesResponse> => {
    try {
      const identity = await requireRole("hod");
      const reports = await getHodCases(identity.department);
      return { success: true, reports };
    } catch (err: any) {
      console.error("[HOD Server API Error] getHodCasesApi error:", err);
      return {
        success: false,
        reports: [],
        error: err.message || "Failed to fetch HOD cases from database.",
      };
    }
  },
);

export const getHodReportsApi = getHodCasesApi;

/**
 * Server function to fetch a single case detail with strict HOD department authorization check.
 */
export const getHodCaseByIdApi = createServerFn({ method: "GET" })
  .validator((data: { reportId: string }) => {
    const reportId = typeof data?.reportId === "string" ? data.reportId.trim() : "";
    if (!reportId) {
      throw new Error("Report ID is required.");
    }
    return { reportId };
  })
  .handler(async ({ data }): Promise<CaseDetailResponse> => {
    try {
      const identity = await requireRole("hod");
      const report = await getHodCaseById(data.reportId, identity.department);
      if (!report) {
        return {
          success: false,
          report: null,
          error: "Case not found or access denied for your department.",
        };
      }
      return { success: true, report };
    } catch (err: any) {
      console.error("[HOD Server API Error] getHodCaseByIdApi error:", err);
      return { success: false, report: null, error: err.message || "Failed to fetch case detail." };
    }
  });

/**
 * Server function to record official HOD disciplinary decision with trusted server identity.
 */
export const submitHodDecisionApi = createServerFn({ method: "POST" })
  .validator(
    (data: {
      reportId: string;
      decision: "exonerated" | "warned" | "escalated";
      decisionText: string;
    }) => {
      if (!data?.reportId || !data?.decision) {
        throw new Error("Report ID and decision action are required.");
      }
      return data;
    },
  )
  .handler(
    async ({ data }): Promise<{ success: boolean; report?: DBViolationReport; error?: string }> => {
      try {
        const identity = await requireRole("hod");
        const report = await submitHodDecision(
          data.reportId,
          data.decision,
          data.decisionText,
          identity.fullName,
          identity.department,
        );
        return { success: true, report };
      } catch (err: any) {
        console.error("[HOD Server API Error] submitHodDecisionApi error:", err);
        return { success: false, error: err.message || "Failed to submit disciplinary decision." };
      }
    },
  );

/**
 * Server function to fetch HOD discipline metrics with strict server-derived department isolation.
 */
export const getHodDashboardStatsApi = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ success: boolean; stats: HODDashboardStats | null; error?: string }> => {
    try {
      const identity = await requireRole("hod");
      const stats = await getHodDashboardStats(identity.department);
      return { success: true, stats };
    } catch (err: any) {
      console.error("[HOD Server API Error] getHodDashboardStatsApi error:", err);
      return {
        success: false,
        stats: null,
        error: err.message || "Failed to load HOD dashboard statistics.",
      };
    }
  },
);

/**
 * Server function to fetch department-isolated notifications for authenticated HOD (Requirements 8 & 9).
 */
export const getHodNotificationsApi = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ success: boolean; notifications: any[]; error?: string }> => {
    try {
      const identity = await requireRole("hod");
      const query = `
        SELECT
          id::text,
          recipient_role AS "recipientRole",
          recipient_id AS "recipientId",
          department,
          title,
          detail,
          tone,
          read,
          related_report_id AS "relatedReportId",
          created_at::text AS "createdAt"
        FROM notifications
        WHERE recipient_role IN ('hod', 'all')
          AND (department IS NULL OR UPPER(department) = UPPER($1))
        ORDER BY created_at DESC;
      `;
      const res = await db.query(query, [identity.department]);
      return { success: true, notifications: res.rows };
    } catch (err: any) {
      console.error("[HOD Server API Error] getHodNotificationsApi error:", err);
      return {
        success: false,
        notifications: [],
        error: err.message || "Failed to fetch HOD notifications.",
      };
    }
  },
);

/**
 * Server function to fetch department students with strict server-derived department isolation.
 */
export const getHodStudentsApi = createServerFn({ method: "GET" }).handler(
  async (): Promise<{
    success: boolean;
    students: {
      id: string;
      name: string;
      studentCode: string;
      department: string;
      year: string;
      section: string;
      semester: number;
    }[];
    error?: string;
  }> => {
    try {
      const identity = await requireRole("hod");
      const students = await getHodStudents(identity.department);
      return { success: true, students };
    } catch (err: any) {
      console.error("[HOD Server API Error] getHodStudentsApi error:", err);
      return {
        success: false,
        students: [],
        error: err.message || "Failed to fetch department students.",
      };
    }
  },
);
