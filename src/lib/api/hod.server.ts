import { createServerFn } from "@tanstack/react-start";
import { requireRole } from "../session.server";
import { db } from "../db.server";
import {
  getHodCases,
  getHodCaseById,
  getHodViolationReports,
  getHodViolationReportById,
  startViolationReview,
  resolveViolationReport,
  dismissViolationReport,
  escalateViolationReport,
  getViolationAuditHistory,
  submitHodDecision,
  submitStudentExplanation,
  getHodDashboardStats,
  getHodStudents,
  getHodMovementPasses,
  approveHodMovementPass,
  type HODDashboardStats,
  type DBHodMovementPass,
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
 * Server function to fetch HOD violation reports with filtering and strict server-derived department isolation.
 */
export const getHodViolationReportsApi = createServerFn({ method: "GET" })
  .validator(
    (data?: {
      status?: string;
      severity?: string;
      violationType?: string;
      search?: string;
    }) => {
      const sanitized: {
        status?: string;
        severity?: string;
        violationType?: string;
        search?: string;
      } = {};
      if (data?.status && data.status !== "ALL") sanitized.status = data.status;
      if (data?.severity && data.severity !== "ALL") sanitized.severity = data.severity;
      if (data?.violationType && data.violationType !== "ALL") sanitized.violationType = data.violationType;
      if (data?.search?.trim()) sanitized.search = data.search.trim();
      return sanitized;
    },
  )
  .handler(async ({ data }): Promise<HodCasesResponse> => {
    try {
      const identity = await requireRole("hod");
      const reports = await getHodViolationReports(identity.department, data);
      return { success: true, reports };
    } catch (err: any) {
      console.error("[HOD Server API Error] getHodViolationReportsApi error:", err);
      return {
        success: false,
        reports: [],
        error: err.message || "Failed to fetch HOD violation reports from database.",
      };
    }
  });

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
      const report = await getHodViolationReportById(data.reportId, identity.department);
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

export const getHodViolationReportByIdApi = getHodCaseByIdApi;

/**
 * Server function for HOD to start investigating / reviewing a case.
 */
export const startViolationReviewApi = createServerFn({ method: "POST" })
  .validator((data: { reportId: string }) => {
    const reportId = typeof data?.reportId === "string" ? data.reportId.trim() : "";
    if (!reportId) throw new Error("Report ID is required.");
    return { reportId };
  })
  .handler(
    async ({ data }): Promise<{ success: boolean; report?: DBViolationReport; error?: string }> => {
      try {
        const identity = await requireRole("hod");
        const report = await startViolationReview(data.reportId, identity.fullName, identity.department);
        return { success: true, report };
      } catch (err: any) {
        console.error("[HOD Server API Error] startViolationReviewApi error:", err);
        return { success: false, error: err.message || "Failed to start violation review." };
      }
    },
  );

/**
 * Server function for HOD to resolve a violation case with mandatory remarks.
 */
export const resolveViolationReportApi = createServerFn({ method: "POST" })
  .validator((data: { reportId: string; remarks: string }) => {
    const reportId = typeof data?.reportId === "string" ? data.reportId.trim() : "";
    const remarks = typeof data?.remarks === "string" ? data.remarks.trim() : "";
    if (!reportId) throw new Error("Report ID is required.");
    if (!remarks) throw new Error("Resolution remarks are mandatory.");
    return { reportId, remarks };
  })
  .handler(
    async ({ data }): Promise<{ success: boolean; report?: DBViolationReport; error?: string }> => {
      try {
        const identity = await requireRole("hod");
        const report = await resolveViolationReport(
          data.reportId,
          data.remarks,
          identity.fullName,
          identity.department,
        );
        return { success: true, report };
      } catch (err: any) {
        console.error("[HOD Server API Error] resolveViolationReportApi error:", err);
        return { success: false, error: err.message || "Failed to resolve violation report." };
      }
    },
  );

/**
 * Server function for HOD to dismiss a violation case with mandatory dismissal reason.
 */
export const dismissViolationReportApi = createServerFn({ method: "POST" })
  .validator((data: { reportId: string; dismissalReason: string }) => {
    const reportId = typeof data?.reportId === "string" ? data.reportId.trim() : "";
    const dismissalReason = typeof data?.dismissalReason === "string" ? data.dismissalReason.trim() : "";
    if (!reportId) throw new Error("Report ID is required.");
    if (!dismissalReason) throw new Error("Dismissal reason is mandatory.");
    return { reportId, dismissalReason };
  })
  .handler(
    async ({ data }): Promise<{ success: boolean; report?: DBViolationReport; error?: string }> => {
      try {
        const identity = await requireRole("hod");
        const report = await dismissViolationReport(
          data.reportId,
          data.dismissalReason,
          identity.fullName,
          identity.department,
        );
        return { success: true, report };
      } catch (err: any) {
        console.error("[HOD Server API Error] dismissViolationReportApi error:", err);
        return { success: false, error: err.message || "Failed to dismiss violation report." };
      }
    },
  );

/**
 * Server function for HOD to escalate a critical violation case to Institutional Admin.
 */
export const escalateViolationReportApi = createServerFn({ method: "POST" })
  .validator((data: { reportId: string; escalationReason: string }) => {
    const reportId = typeof data?.reportId === "string" ? data.reportId.trim() : "";
    const escalationReason = typeof data?.escalationReason === "string" ? data.escalationReason.trim() : "";
    if (!reportId) throw new Error("Report ID is required.");
    if (!escalationReason) throw new Error("Escalation reason is mandatory.");
    return { reportId, escalationReason };
  })
  .handler(
    async ({ data }): Promise<{ success: boolean; report?: DBViolationReport; error?: string }> => {
      try {
        const identity = await requireRole("hod");
        const report = await escalateViolationReport(
          data.reportId,
          data.escalationReason,
          identity.fullName,
          identity.department,
        );
        return { success: true, report };
      } catch (err: any) {
        console.error("[HOD Server API Error] escalateViolationReportApi error:", err);
        return { success: false, error: err.message || "Failed to escalate violation report." };
      }
    },
  );

/**
 * Server function to fetch chronological audit history for a report.
 */
export const getViolationAuditHistoryApi = createServerFn({ method: "GET" })
  .validator((data: { reportId: string }) => {
    const reportId = typeof data?.reportId === "string" ? data.reportId.trim() : "";
    if (!reportId) throw new Error("Report ID is required.");
    return { reportId };
  })
  .handler(
    async ({ data }): Promise<{ success: boolean; history: any[]; error?: string }> => {
      try {
        await requireRole("hod");
        const history = await getViolationAuditHistory(data.reportId);
        return { success: true, history };
      } catch (err: any) {
        console.error("[HOD Server API Error] getViolationAuditHistoryApi error:", err);
        return { success: false, history: [], error: err.message || "Failed to fetch audit history." };
      }
    },
  );

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
/**
 * Server function to fetch per-user notifications for authenticated HOD.
 * Now uses recipient_user_id for strict per-HOD isolation instead of role+department.
 * @deprecated Prefer getMyNotificationsApi from notifications.server.ts
 */
export const getHodNotificationsApi = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ success: boolean; notifications: any[]; error?: string }> => {
    try {
      const identity = await requireRole("hod");
      // Filter strictly by recipient_user_id = this HOD's user ID
      const query = `
        SELECT
          id::text,
          COALESCE(type, 'info') AS type,
          recipient_role AS "recipientRole",
          recipient_id AS "recipientId",
          department,
          title,
          detail,
          tone,
          read,
          related_id AS "relatedId",
          related_report_id AS "relatedReportId",
          created_at::text AS "createdAt"
        FROM notifications
        WHERE recipient_user_id = $1
        ORDER BY created_at DESC
        LIMIT 100;
      `;
      const res = await db.query(query, [identity.userId]);
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

/**
 * Server function to fetch department movement pass requests strictly for the authenticated HOD.
 */
export const getHodMovementPassesApi = createServerFn({ method: "GET" }).handler(
  async (): Promise<{
    success: boolean;
    passes: DBHodMovementPass[];
    error?: string;
  }> => {
    try {
      const identity = await requireRole("hod");
      const passes = await getHodMovementPasses(identity.department);
      return { success: true, passes };
    } catch (err: any) {
      console.error("[HOD Server API Error] getHodMovementPassesApi:", err);
      return {
        success: false,
        passes: [],
        error: err.message || "Failed to fetch department movement passes.",
      };
    }
  },
);

/**
 * Server function for HOD to approve or reject a student movement pass request.
 */
export const approveHodMovementPassApi = createServerFn({ method: "POST" })
  .validator(
    (data: {
      passId: string;
      status: "approved" | "rejected";
      rejectionReason?: string;
    }) => {
      if (!data?.passId || !data?.status) {
        throw new Error("Pass ID and Status are required.");
      }
      if (data.status !== "approved" && data.status !== "rejected") {
        throw new Error("Status must be either 'approved' or 'rejected'.");
      }
      return {
        passId: String(data.passId).trim(),
        status: data.status,
        rejectionReason: data.rejectionReason ? String(data.rejectionReason).trim() : undefined,
      };
    },
  )
  .handler(
    async ({
      data,
    }): Promise<{
      success: boolean;
      pass?: DBHodMovementPass;
      error?: string;
    }> => {
      try {
        const identity = await requireRole("hod");
        const updated = await approveHodMovementPass(
          data.passId,
          data.status,
          identity.fullName,
          identity.email,
          identity.department,
          data.rejectionReason,
        );
        return { success: true, pass: updated };
      } catch (err: any) {
        console.error("[HOD Server API Error] approveHodMovementPassApi:", err);
        return {
          success: false,
          error: err.message || "Failed to process movement pass decision.",
        };
      }
    },
  );

