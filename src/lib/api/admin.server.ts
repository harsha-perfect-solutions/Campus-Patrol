import { createServerFn } from "@tanstack/react-start";
import { requireRole, type AppRole } from "../session.server";
import {
  getAdminDashboardStats,
  getAdminUsers,
  updateAdminUserRole,
  getAdminStudents,
  createAdminStudent,
  getAdminFaculty,
  getAdminDepartments,
  getAdminReports,
  getAdminPermissions,
  createAdminPermission,
  getAdminAuditLogs,
  getAdminMovementPasses,
  getAdminMovementPassStats,
  getAdminCurrentlyOutsideStudents,
  revokeMovementPass,
  cancelMovementPass,
  getMovementPassAuditHistory,
  getAdminViolationReports,
  getAdminViolationReportById,
  getAdminViolationStats,
  getAdminStudentViolationHistory,
  acknowledgeViolationReport,
  addAdminViolationRemark,
  closeInstitutionalViolationCase,
  returnViolationToHod,
  requireDisciplinaryCommittee,
  getAdminViolationAuditHistory,
  type AdminDashboardStats,
  type AdminUserRecord,
  type DBAuditLogRecord,
  type AdminMovementPass,
  type AdminMovementPassStats,
  type AdminViolationStats,
  type AdminViolationFilters,
  type AdminStudentViolationHistory,
} from "../db/admin.server";
import type { DBStudent } from "../db/students.server";
import type { DBPermission } from "../db/permissions.server";
import type { DBViolationReport } from "../db/violations.server";

export const getAdminDashboardStatsApi = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ success: boolean; stats: AdminDashboardStats | null; error?: string }> => {
    try {
      await requireRole("admin");
      const stats = await getAdminDashboardStats();
      return { success: true, stats };
    } catch (err: any) {
      console.error("[Admin API Error] getAdminDashboardStatsApi:", err);
      return {
        success: false,
        stats: null,
        error: err.message || "Failed to load dashboard statistics.",
      };
    }
  },
);

export const getAdminUsersApi = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ success: boolean; users: AdminUserRecord[]; error?: string }> => {
    try {
      await requireRole("admin");
      const users = await getAdminUsers();
      return { success: true, users };
    } catch (err: any) {
      console.error("[Admin API Error] getAdminUsersApi:", err);
      return { success: false, users: [], error: err.message || "Failed to load user accounts." };
    }
  },
);

export const updateAdminUserRoleApi = createServerFn({ method: "POST" })
  .validator((data: { userId: string; newRole: string }) => {
    const userId = typeof data?.userId === "string" ? data.userId.trim() : "";
    const newRole = typeof data?.newRole === "string" ? data.newRole.trim().toLowerCase() : "";
    if (!userId || !newRole) {
      throw new Error("User ID and New Role are required.");
    }
    return { userId, newRole };
  })
  .handler(
    async ({ data }): Promise<{ success: boolean; error?: string }> => {
      try {
        const session = await requireRole("admin");
        await updateAdminUserRole(data.userId, data.newRole as AppRole, session.fullName);
        return { success: true };
      } catch (err: any) {
        console.error("[Admin API Error] updateAdminUserRoleApi:", err);
        return { success: false, error: err.message || "Failed to update user role." };
      }
    },
  );

export const getAdminStudentsApi = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ success: boolean; students: DBStudent[]; error?: string }> => {
    try {
      await requireRole("admin");
      const students = await getAdminStudents();
      return { success: true, students };
    } catch (err: any) {
      console.error("[Admin API Error] getAdminStudentsApi:", err);
      return { success: false, students: [], error: err.message || "Failed to load students." };
    }
  },
);

export const createAdminStudentApi = createServerFn({ method: "POST" })
  .validator(
    (data: {
      studentCode: string;
      name: string;
      department: string;
      year: string;
      section: string;
      semester?: number;
    }) => {
      if (!data?.studentCode || !data?.name || !data?.department) {
        throw new Error("Student Code, Name, and Department are required.");
      }
      return data;
    },
  )
  .handler(async ({ data }): Promise<{ success: boolean; student?: DBStudent; error?: string }> => {
    try {
      const identity = await requireRole("admin");
      const student = await createAdminStudent(
        {
          ...data,
          semester: data.semester ?? 6,
        },
        identity.fullName,
      );
      return { success: true, student };
    } catch (err: any) {
      console.error("[Admin API Error] createAdminStudentApi:", err);
      return { success: false, error: err.message || "Failed to enroll student record." };
    }
  });

export const getAdminFacultyApi = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ success: boolean; faculty: any[]; error?: string }> => {
    try {
      await requireRole("admin");
      const faculty = await getAdminFaculty();
      return { success: true, faculty };
    } catch (err: any) {
      console.error("[Admin API Error] getAdminFacultyApi:", err);
      return {
        success: false,
        faculty: [],
        error: err.message || "Failed to load faculty members.",
      };
    }
  },
);

export const getAdminDepartmentsApi = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ success: boolean; departments: any[]; error?: string }> => {
    try {
      await requireRole("admin");
      const departments = await getAdminDepartments();
      return { success: true, departments };
    } catch (err: any) {
      console.error("[Admin API Error] getAdminDepartmentsApi:", err);
      return {
        success: false,
        departments: [],
        error: err.message || "Failed to load departments.",
      };
    }
  },
);

export const getAdminReportsApi = createServerFn({ method: "GET" }).handler(
  async (): Promise<{
    success: boolean;
    reports: DBViolationReport[];
    error?: string;
  }> => {
    try {
      await requireRole("admin");
      const reports = await getAdminReports();
      return { success: true, reports };
    } catch (err: any) {
      console.error("[Admin API Error] getAdminReportsApi:", err);
      return {
        success: false,
        reports: [],
        error: err.message || "Failed to load violation reports.",
      };
    }
  },
);

export const getAdminPermissionsApi = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ success: boolean; permissions: DBPermission[]; error?: string }> => {
    try {
      await requireRole("admin");
      const permissions = await getAdminPermissions();
      return { success: true, permissions };
    } catch (err: any) {
      console.error("[Admin API Error] getAdminPermissionsApi:", err);
      return {
        success: false,
        permissions: [],
        error: err.message || "Failed to load permissions.",
      };
    }
  },
);

export const createAdminPermissionApi = createServerFn({ method: "POST" })
  .validator((data: { studentCode: string; reason: string; validUntil: string }) => {
    if (!data?.studentCode || !data?.reason) {
      throw new Error("Student Code and Reason are required.");
    }
    return data;
  })
  .handler(
    async ({ data }): Promise<{ success: boolean; permission?: DBPermission; error?: string }> => {
      try {
        const identity = await requireRole("admin");
        const permission = await createAdminPermission(
          data.studentCode,
          data.reason,
          data.validUntil,
          identity.fullName,
        );
        return { success: true, permission };
      } catch (err: any) {
        console.error("[Admin API Error] createAdminPermissionApi:", err);
        return {
          success: false,
          error: err.message || "Failed to issue movement permission clearance.",
        };
      }
    },
  );

export const getAdminAuditLogsApi = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ success: boolean; auditLogs: DBAuditLogRecord[]; error?: string }> => {
    try {
      await requireRole("admin");
      const auditLogs = await getAdminAuditLogs();
      return { success: true, auditLogs };
    } catch (err: any) {
      console.error("[Admin API Error] getAdminAuditLogsApi:", err);
      return {
        success: false,
        auditLogs: [],
        error: err.message || "Failed to load system audit logs.",
      };
    }
  },
);

/* ==========================================================================
   ADMIN MOVEMENT PASSES SERVER FUNCTIONS
   ========================================================================== */

export const getAdminMovementPassesApi = createServerFn({ method: "GET" })
  .validator(
    (params?: {
      department?: string;
      status?: string;
      date?: string;
      currentlyOutside?: boolean;
      search?: string;
    }) => {
      return params || {};
    },
  )
  .handler(
    async ({ data }): Promise<{
      success: boolean;
      passes: AdminMovementPass[];
      error?: string;
    }> => {
      try {
        await requireRole("admin");
        const passes = await getAdminMovementPasses(data);
        return { success: true, passes };
      } catch (err: any) {
        console.error("[Admin API Error] getAdminMovementPassesApi:", err);
        return {
          success: false,
          passes: [],
          error: err.message || "Failed to load movement passes.",
        };
      }
    },
  );

export const getAdminMovementPassStatsApi = createServerFn({ method: "GET" }).handler(
  async (): Promise<{
    success: boolean;
    stats: AdminMovementPassStats | null;
    error?: string;
  }> => {
    try {
      await requireRole("admin");
      const stats = await getAdminMovementPassStats();
      return { success: true, stats };
    } catch (err: any) {
      console.error("[Admin API Error] getAdminMovementPassStatsApi:", err);
      return {
        success: false,
        stats: null,
        error: err.message || "Failed to load movement pass statistics.",
      };
    }
  },
);

export const getAdminCurrentlyOutsideApi = createServerFn({ method: "GET" }).handler(
  async (): Promise<{
    success: boolean;
    students: any[];
    error?: string;
  }> => {
    try {
      await requireRole("admin");
      const students = await getAdminCurrentlyOutsideStudents();
      return { success: true, students };
    } catch (err: any) {
      console.error("[Admin API Error] getAdminCurrentlyOutsideApi:", err);
      return {
        success: false,
        students: [],
        error: err.message || "Failed to query currently outside students.",
      };
    }
  },
);

export const revokeMovementPassApi = createServerFn({ method: "POST" })
  .validator((data: { passId: string; reason: string }) => {
    const passId = typeof data?.passId === "string" ? data.passId.trim() : "";
    const reason = typeof data?.reason === "string" ? data.reason.trim() : "";
    if (!passId) throw new Error("Pass ID is required.");
    if (!reason) throw new Error("A mandatory reason is required to revoke an approved pass.");
    return { passId, reason };
  })
  .handler(
    async ({ data }): Promise<{
      success: boolean;
      pass?: AdminMovementPass;
      error?: string;
    }> => {
      try {
        const session = await requireRole("admin");
        const pass = await revokeMovementPass(
          data.passId,
          data.reason,
          session.fullName,
          session.email,
        );
        return { success: true, pass };
      } catch (err: any) {
        console.error("[Admin API Error] revokeMovementPassApi:", err);
        return {
          success: false,
          error: err.message || "Failed to revoke movement pass.",
        };
      }
    },
  );

export const cancelMovementPassApi = createServerFn({ method: "POST" })
  .validator((data: { passId: string; reason: string }) => {
    const passId = typeof data?.passId === "string" ? data.passId.trim() : "";
    const reason = typeof data?.reason === "string" ? data.reason.trim() : "";
    if (!passId) throw new Error("Pass ID is required.");
    if (!reason) throw new Error("A mandatory reason is required to cancel a pending pass request.");
    return { passId, reason };
  })
  .handler(
    async ({ data }): Promise<{
      success: boolean;
      pass?: AdminMovementPass;
      error?: string;
    }> => {
      try {
        const session = await requireRole("admin");
        const pass = await cancelMovementPass(
          data.passId,
          data.reason,
          session.fullName,
          session.email,
        );
        return { success: true, pass };
      } catch (err: any) {
        console.error("[Admin API Error] cancelMovementPassApi:", err);
        return {
          success: false,
          error: err.message || "Failed to cancel movement pass request.",
        };
      }
    },
  );

export const getMovementPassAuditHistoryApi = createServerFn({ method: "GET" })
  .validator((params: { passId: string }) => {
    const passId = typeof params?.passId === "string" ? params.passId.trim() : "";
    if (!passId) throw new Error("Pass ID is required.");
    return { passId };
  })
  .handler(
    async ({ data }): Promise<{
      success: boolean;
      auditLogs: DBAuditLogRecord[];
      error?: string;
    }> => {
      try {
        await requireRole("admin");
        const auditLogs = await getMovementPassAuditHistory(data.passId);
        return { success: true, auditLogs };
      } catch (err: any) {
        console.error("[Admin API Error] getMovementPassAuditHistoryApi:", err);
        return {
          success: false,
          auditLogs: [],
          error: err.message || "Failed to load audit history for pass.",
        };
      }
    },
  );

// ─── ADMIN VIOLATIONS MANAGEMENT APIS ──────────────────────────────────────────

export type AdminViolationsResponse = {
  success: boolean;
  reports: DBViolationReport[];
  error?: string;
};

export const getAdminViolationReportsApi = createServerFn({ method: "GET" })
  .validator((filters?: AdminViolationFilters) => {
    const sanitized: AdminViolationFilters = {};
    if (filters?.department && filters.department !== "ALL") sanitized.department = filters.department.trim();
    if (filters?.year && filters.year !== "ALL") sanitized.year = filters.year.trim();
    if (filters?.section && filters.section !== "ALL") sanitized.section = filters.section.trim();
    if (filters?.severity && filters.severity !== "ALL") sanitized.severity = filters.severity.trim();
    if (filters?.violationType && filters.violationType !== "ALL") sanitized.violationType = filters.violationType.trim();
    if (filters?.status && filters.status !== "ALL") sanitized.status = filters.status.trim();
    if (filters?.date?.trim()) sanitized.date = filters.date.trim();
    if (filters?.search?.trim()) sanitized.search = filters.search.trim();
    if (filters?.student?.trim()) sanitized.student = filters.student.trim();
    if (filters?.rollNumber?.trim()) sanitized.rollNumber = filters.rollNumber.trim();
    if (filters?.reporter?.trim()) sanitized.reporter = filters.reporter.trim();
    if (filters?.reportId?.trim()) sanitized.reportId = filters.reportId.trim();
    return sanitized;
  })
  .handler(async ({ data }): Promise<AdminViolationsResponse> => {
    try {
      await requireRole("admin");
      const reports = await getAdminViolationReports(data);
      return { success: true, reports };
    } catch (err: any) {
      console.error("[Admin API Error] getAdminViolationReportsApi:", err);
      return {
        success: false,
        reports: [],
        error: err.message || "Failed to query violation reports.",
      };
    }
  });

export const getAdminViolationReportByIdApi = createServerFn({ method: "GET" })
  .validator((params: { reportId: string }) => {
    const reportId = typeof params?.reportId === "string" ? params.reportId.trim() : "";
    if (!reportId) throw new Error("Report ID is required.");
    return { reportId };
  })
  .handler(
    async ({
      data,
    }): Promise<{ success: boolean; report: DBViolationReport | null; error?: string }> => {
      try {
        await requireRole("admin");
        const report = await getAdminViolationReportById(data.reportId);
        if (!report) {
          return { success: false, report: null, error: "Report not found." };
        }
        return { success: true, report };
      } catch (err: any) {
        console.error("[Admin API Error] getAdminViolationReportByIdApi:", err);
        return { success: false, report: null, error: err.message || "Failed to query report." };
      }
    },
  );

export const getAdminViolationStatsApi = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ success: boolean; stats: AdminViolationStats | null; error?: string }> => {
    try {
      await requireRole("admin");
      const stats = await getAdminViolationStats();
      return { success: true, stats };
    } catch (err: any) {
      console.error("[Admin API Error] getAdminViolationStatsApi:", err);
      return {
        success: false,
        stats: null,
        error: err.message || "Failed to load violation stats.",
      };
    }
  },
);

export const getAdminStudentViolationHistoryApi = createServerFn({ method: "GET" })
  .validator((params: { studentCode: string }) => {
    const studentCode = typeof params?.studentCode === "string" ? params.studentCode.trim() : "";
    if (!studentCode) throw new Error("Student Code is required.");
    return { studentCode };
  })
  .handler(
    async ({
      data,
    }): Promise<{ success: boolean; history: AdminStudentViolationHistory | null; error?: string }> => {
      try {
        await requireRole("admin");
        const history = await getAdminStudentViolationHistory(data.studentCode);
        return { success: true, history };
      } catch (err: any) {
        console.error("[Admin API Error] getAdminStudentViolationHistoryApi:", err);
        return {
          success: false,
          history: null,
          error: err.message || "Failed to load student violation history.",
        };
      }
    },
  );

export const acknowledgeViolationReportApi = createServerFn({ method: "POST" })
  .validator((data: { reportId: string; remarks?: string }) => {
    const reportId = typeof data?.reportId === "string" ? data.reportId.trim() : "";
    if (!reportId) throw new Error("Report ID is required.");
    return { reportId, remarks: data.remarks ? String(data.remarks).trim() : undefined };
  })
  .handler(
    async ({ data }): Promise<{ success: boolean; report?: DBViolationReport; error?: string }> => {
      try {
        const identity = await requireRole("admin");
        const report = await acknowledgeViolationReport(
          data.reportId,
          identity.fullName,
          data.remarks,
        );
        return { success: true, report };
      } catch (err: any) {
        console.error("[Admin API Error] acknowledgeViolationReportApi:", err);
        return { success: false, error: err.message || "Failed to acknowledge incident." };
      }
    },
  );

export const addAdminViolationRemarkApi = createServerFn({ method: "POST" })
  .validator((data: { reportId: string; remarks: string }) => {
    const reportId = typeof data?.reportId === "string" ? data.reportId.trim() : "";
    const remarks = typeof data?.remarks === "string" ? data.remarks.trim() : "";
    if (!reportId) throw new Error("Report ID is required.");
    if (!remarks) throw new Error("Institutional remarks are mandatory.");
    return { reportId, remarks };
  })
  .handler(
    async ({ data }): Promise<{ success: boolean; report?: DBViolationReport; error?: string }> => {
      try {
        const identity = await requireRole("admin");
        const report = await addAdminViolationRemark(data.reportId, data.remarks, identity.fullName);
        return { success: true, report };
      } catch (err: any) {
        console.error("[Admin API Error] addAdminViolationRemarkApi:", err);
        return { success: false, error: err.message || "Failed to record institutional remark." };
      }
    },
  );

export const closeInstitutionalViolationCaseApi = createServerFn({ method: "POST" })
  .validator((data: { reportId: string; closingRemarks: string }) => {
    const reportId = typeof data?.reportId === "string" ? data.reportId.trim() : "";
    const closingRemarks = typeof data?.closingRemarks === "string" ? data.closingRemarks.trim() : "";
    if (!reportId) throw new Error("Report ID is required.");
    if (!closingRemarks) throw new Error("Closing remarks are mandatory.");
    return { reportId, closingRemarks };
  })
  .handler(
    async ({ data }): Promise<{ success: boolean; report?: DBViolationReport; error?: string }> => {
      try {
        const identity = await requireRole("admin");
        const report = await closeInstitutionalViolationCase(
          data.reportId,
          data.closingRemarks,
          identity.fullName,
        );
        return { success: true, report };
      } catch (err: any) {
        console.error("[Admin API Error] closeInstitutionalViolationCaseApi:", err);
        return { success: false, error: err.message || "Failed to close institutional case." };
      }
    },
  );

export const returnViolationToHodApi = createServerFn({ method: "POST" })
  .validator((data: { reportId: string; returnReason: string }) => {
    const reportId = typeof data?.reportId === "string" ? data.reportId.trim() : "";
    const returnReason = typeof data?.returnReason === "string" ? data.returnReason.trim() : "";
    if (!reportId) throw new Error("Report ID is required.");
    if (!returnReason) throw new Error("Return reason is mandatory.");
    return { reportId, returnReason };
  })
  .handler(
    async ({ data }): Promise<{ success: boolean; report?: DBViolationReport; error?: string }> => {
      try {
        const identity = await requireRole("admin");
        const report = await returnViolationToHod(
          data.reportId,
          data.returnReason,
          identity.fullName,
        );
        return { success: true, report };
      } catch (err: any) {
        console.error("[Admin API Error] returnViolationToHodApi:", err);
        return { success: false, error: err.message || "Failed to return case to HOD." };
      }
    },
  );

export const requireDisciplinaryCommitteeApi = createServerFn({ method: "POST" })
  .validator((data: { reportId: string; committeeReason: string }) => {
    const reportId = typeof data?.reportId === "string" ? data.reportId.trim() : "";
    const committeeReason = typeof data?.committeeReason === "string" ? data.committeeReason.trim() : "";
    if (!reportId) throw new Error("Report ID is required.");
    if (!committeeReason) throw new Error("Disciplinary committee reason is mandatory.");
    return { reportId, committeeReason };
  })
  .handler(
    async ({ data }): Promise<{ success: boolean; report?: DBViolationReport; error?: string }> => {
      try {
        const identity = await requireRole("admin");
        const report = await requireDisciplinaryCommittee(
          data.reportId,
          data.committeeReason,
          identity.fullName,
        );
        return { success: true, report };
      } catch (err: any) {
        console.error("[Admin API Error] requireDisciplinaryCommitteeApi:", err);
        return {
          success: false,
          error: err.message || "Failed to refer case to disciplinary committee.",
        };
      }
    },
  );

export const getAdminViolationAuditHistoryApi = createServerFn({ method: "GET" })
  .validator((params: { reportId: string }) => {
    const reportId = typeof params?.reportId === "string" ? params.reportId.trim() : "";
    if (!reportId) throw new Error("Report ID is required.");
    return { reportId };
  })
  .handler(
    async ({
      data,
    }): Promise<{ success: boolean; auditLogs: DBAuditLogRecord[]; error?: string }> => {
      try {
        await requireRole("admin");
        const auditLogs = await getAdminViolationAuditHistory(data.reportId);
        return { success: true, auditLogs };
      } catch (err: any) {
        console.error("[Admin API Error] getAdminViolationAuditHistoryApi:", err);
        return {
          success: false,
          auditLogs: [],
          error: err.message || "Failed to load audit history for violation report.",
        };
      }
    },
  );

export const cleanupExpiredSessionsApi = createServerFn({ method: "POST" }).handler(
  async (): Promise<{ success: boolean; deletedCount: number; error?: string }> => {
    try {
      const { requireRole, cleanupExpiredSessions } = await import("../session.server");
      await requireRole("admin");
      const { deletedCount } = await cleanupExpiredSessions();
      return { success: true, deletedCount };
    } catch (err: any) {
      console.error("[Admin API Error] cleanupExpiredSessionsApi:", err);
      return {
        success: false,
        deletedCount: 0,
        error: err.message || "Failed to perform session cleanup.",
      };
    }
  },
);

export default {};
