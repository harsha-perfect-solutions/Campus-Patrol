import { createServerFn } from "@tanstack/react-start";
import { requireRole } from "../session.server";
import {
  getMyStudentProfile,
  getMyMovementPermissions,
  requestMovementPermission,
  getMyViolationReports,
  getMyViolationById,
  getMyStudentDashboardStats,
  type StudentDashboardStats,
} from "../db/student.server";
import { submitStudentExplanation } from "../db/hod.server";
import type { DBStudent } from "../db/students.server";
import type { DBPermission } from "../db/permissions.server";
import type { DBViolationReport } from "../db/violations.server";

/**
 * Helper to extract trusted student code from server-derived session identity.
 */
function getTrustedStudentCode(identity: { studentCode: string | null; email: string }): string {
  const code = identity.studentCode || identity.email;
  if (!code) {
    throw new Error("Forbidden: No student enrollment record associated with this account.");
  }
  return code;
}

export const getMyStudentProfileApi = createServerFn({ method: "GET" }).handler(
  async (): Promise<{
    success: boolean;
    student: DBStudent | null;
    email?: string;
    photoUrl?: string;
    error?: string;
  }> => {
    try {
      const identity = await requireRole("student");
      const studentCode = getTrustedStudentCode(identity);
      const res = await getMyStudentProfile(studentCode);
      return { success: true, ...res };
    } catch (err: any) {
      console.error("[Student Server API Error] getMyStudentProfileApi:", err);
      return {
        success: false,
        student: null,
        error: err.message || "Failed to fetch student profile.",
      };
    }
  },
);

export const getMyMovementPermissionsApi = createServerFn({ method: "GET" }).handler(
  async (): Promise<{
    success: boolean;
    permissions: DBPermission[];
    error?: string;
  }> => {
    try {
      const identity = await requireRole("student");
      const studentCode = getTrustedStudentCode(identity);
      const permissions = await getMyMovementPermissions(studentCode);
      return { success: true, permissions };
    } catch (err: any) {
      console.error("[Student Server API Error] getMyMovementPermissionsApi:", err);
      return {
        success: false,
        permissions: [],
        error: err.message || "Failed to fetch movement permissions.",
      };
    }
  },
);

export const requestMovementPermissionApi = createServerFn({ method: "POST" })
  .validator((data: { reason: string; date?: string; validFrom: string; validUntil: string }) => {
    if (!data?.reason || !data?.validFrom || !data?.validUntil) {
      throw new Error("Reason, start time, and end time are required.");
    }
    const today = new Date().toISOString().split("T")[0];
    return {
      reason: String(data.reason),
      date: String(data.date || today),
      validFrom: String(data.validFrom),
      validUntil: String(data.validUntil),
    } as { reason: string; date: string; validFrom: string; validUntil: string };
  })
  .handler(
    async ({
      data,
    }): Promise<{
      success: boolean;
      permission?: DBPermission;
      error?: string;
    }> => {
      const dateStr = String(data.date ?? new Date().toISOString().split("T")[0]);
      try {
        const identity = await requireRole("student");
        const studentCode = getTrustedStudentCode(identity);
        const permission = await requestMovementPermission(
          studentCode,
          String(data.reason),
          dateStr,
          String(data.validFrom),
          String(data.validUntil),
        );
        return { success: true, permission };
      } catch (err: any) {
        console.error("[Student Server API Error] requestMovementPermissionApi:", err);
        return { success: false, error: err.message || "Failed to request movement permission." };
      }
    },
  );

export const getMyViolationReportsApi = createServerFn({ method: "GET" }).handler(
  async (): Promise<{
    success: boolean;
    reports: DBViolationReport[];
    error?: string;
  }> => {
    try {
      const identity = await requireRole("student");
      const studentCode = getTrustedStudentCode(identity);
      const reports = await getMyViolationReports(studentCode);
      return { success: true, reports };
    } catch (err: any) {
      console.error("[Student Server API Error] getMyViolationReportsApi:", err);
      return {
        success: false,
        reports: [],
        error: err.message || "Failed to fetch violation reports.",
      };
    }
  },
);

export const getMyViolationByIdApi = createServerFn({ method: "GET" })
  .validator((data: { reportId: string }) => {
    const reportId = typeof data?.reportId === "string" ? data.reportId.trim() : "";
    if (!reportId) throw new Error("Report ID is required.");
    return { reportId };
  })
  .handler(
    async ({
      data,
    }): Promise<{
      success: boolean;
      report: DBViolationReport | null;
      error?: string;
    }> => {
      try {
        const identity = await requireRole("student");
        const studentCode = getTrustedStudentCode(identity);
        const report = await getMyViolationById(data.reportId, studentCode);
        return { success: true, report };
      } catch (err: any) {
        console.error("[Student Server API Error] getMyViolationByIdApi:", err);
        return {
          success: false,
          report: null,
          error: err.message || "Failed to fetch violation report details.",
        };
      }
    },
  );

export const submitStudentExplanationApi = createServerFn({ method: "POST" })
  .validator((data: { reportId: string; explanation: string; evidence?: string }) => {
    const reportId = typeof data?.reportId === "string" ? data.reportId.trim() : "";
    const explanation = typeof data?.explanation === "string" ? data.explanation.trim() : "";
    const evidence = typeof data?.evidence === "string" ? data.evidence.trim() : undefined;
    if (!reportId || !explanation) throw new Error("Report ID and explanation text are required.");
    return { reportId, explanation, evidence };
  })
  .handler(
    async ({
      data,
    }): Promise<{
      success: boolean;
      report?: DBViolationReport;
      error?: string;
    }> => {
      try {
        const identity = await requireRole("student");
        const studentCode = getTrustedStudentCode(identity);
        const report = await submitStudentExplanation(
          data.reportId,
          studentCode,
          data.explanation,
          data.evidence,
        );
        return { success: true, report };
      } catch (err: any) {
        console.error("[Student Server API Error] submitStudentExplanationApi:", err);
        return { success: false, error: err.message || "Failed to submit explanation." };
      }
    },
  );

export const getMyStudentDashboardStatsApi = createServerFn({ method: "GET" }).handler(
  async (): Promise<{
    success: boolean;
    stats: StudentDashboardStats | null;
    error?: string;
  }> => {
    try {
      const identity = await requireRole("student");
      const studentCode = getTrustedStudentCode(identity);
      const stats = await getMyStudentDashboardStats(studentCode);
      return { success: true, stats };
    } catch (err: any) {
      console.error("[Student Server API Error] getMyStudentDashboardStatsApi:", err);
      return {
        success: false,
        stats: null,
        error: err.message || "Failed to fetch student dashboard statistics.",
      };
    }
  },
);
