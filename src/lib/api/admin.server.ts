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
  type AdminDashboardStats,
  type AdminUserRecord,
  type DBAuditLogRecord,
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
  .handler(async ({ data }): Promise<{ success: boolean; updated?: boolean; error?: string }> => {
    try {
      const identity = await requireRole("admin");
      const updated = await updateAdminUserRole(
        data.userId,
        data.newRole as AppRole,
        identity.fullName,
      );
      return { success: true, updated };
    } catch (err: any) {
      console.error("[Admin API Error] updateAdminUserRoleApi:", err);
      return {
        success: false,
        updated: false,
        error: err.message || "Failed to update user role.",
      };
    }
  });

export const getAdminStudentsApi = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ success: boolean; students: DBStudent[]; error?: string }> => {
    try {
      await requireRole("admin");
      const students = await getAdminStudents();
      return { success: true, students };
    } catch (err: any) {
      console.error("[Admin API Error] getAdminStudentsApi:", err);
      return {
        success: false,
        students: [],
        error: err.message || "Failed to load student master records.",
      };
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
        error: err.message || "Failed to load faculty master list.",
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
  async (): Promise<{ success: boolean; reports: DBViolationReport[]; error?: string }> => {
    try {
      await requireRole("admin");
      const reports = await getAdminReports();
      return { success: true, reports };
    } catch (err: any) {
      console.error("[Admin API Error] getAdminReportsApi:", err);
      return {
        success: false,
        reports: [],
        error: err.message || "Failed to load institutional reports.",
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
        error: err.message || "Failed to load master permissions.",
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
