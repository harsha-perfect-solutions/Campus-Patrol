import { createServerFn } from "@tanstack/react-start";
import { requireAnyRole, requireAuthenticatedUser } from "../session.server";
import { getStudentByRollNo, type DBStudent } from "../db/students.server";
import { getActiveMovementPermission, type DBMovementPermission } from "../db/passes.server";
import {
  createViolationReport,
  getFacultyReports,
  getViolationReportById,
  type DBViolationReport,
  type NewViolationReportInput,
} from "../db/violations.server";
import { getCurrentClassForStudent, type DBClassSlot } from "../db/timetable.server";

export type StudentQueryResult = {
  success: boolean;
  student: DBStudent | null;
  error?: string;
};

export type StatusCheckResult = {
  success: boolean;
  activePass: DBMovementPermission | null;
  error?: string;
};

/**
 * Server function to query student details by Roll Number / Student Code from PostgreSQL.
 */
export const getFacultyStudent = createServerFn({ method: "GET" })
  .validator((data: { rollNo: string }) => {
    const rollNo = typeof data?.rollNo === "string" ? data.rollNo.trim().toUpperCase() : "";
    if (!rollNo) {
      throw new Error("Student Roll Number / Code is required.");
    }
    return { rollNo };
  })
  .handler(async ({ data }): Promise<StudentQueryResult> => {
    try {
      await requireAnyRole(["faculty", "hod", "admin", "security"]);
      const student = await getStudentByRollNo(data.rollNo);
      if (!student) {
        return {
          success: false,
          student: null,
          error: `Student with code '${data.rollNo}' not found in master records.`,
        };
      }
      return { success: true, student };
    } catch (err: any) {
      console.error("[Faculty Server API Error] getFacultyStudent error:", err);
      return {
        success: false,
        student: null,
        error: err.message || "Failed to search student record.",
      };
    }
  });

/**
 * Server function to check active movement permission pass for a student from PostgreSQL.
 */
export const getStudentMovementStatus = createServerFn({ method: "GET" })
  .validator((data: { rollNo: string }) => {
    const rollNo = typeof data?.rollNo === "string" ? data.rollNo.trim().toUpperCase() : "";
    if (!rollNo) {
      throw new Error("Student Roll Number / Code is required.");
    }
    return { rollNo };
  })
  .handler(async ({ data }): Promise<StatusCheckResult> => {
    try {
      await requireAnyRole(["faculty", "hod", "admin", "security"]);
      const activePass = await getActiveMovementPermission(data.rollNo);
      return { success: true, activePass };
    } catch (err: any) {
      console.error("[Faculty Server API Error] getStudentMovementStatus error:", err);
      return {
        success: false,
        activePass: null,
        error: err.message || "Failed to query student movement status.",
      };
    }
  });

/**
 * Server function to submit a violation report to PostgreSQL with trusted faculty identity.
 */
export const submitViolationReportApi = createServerFn({ method: "POST" })
  .validator((data: Omit<NewViolationReportInput, "reportedBy">) => {
    if (
      !data?.studentCode ||
      !data?.studentName ||
      !data?.department ||
      !data?.className ||
      !data?.incidentTime ||
      !data?.location ||
      !data?.remarks
    ) {
      throw new Error("Missing required violation report fields.");
    }
    return data;
  })
  .handler(
    async ({
      data,
    }): Promise<{ success: boolean; report: DBViolationReport | null; error?: string }> => {
      try {
        const identity = await requireAnyRole(["faculty", "hod", "admin"]);
        const report = await createViolationReport({
          ...data,
          reportedBy: identity.fullName,
        });
        return { success: true, report };
      } catch (err: any) {
        console.error("[Faculty Server API Error] submitViolationReportApi error:", err);
        return {
          success: false,
          report: null,
          error: err.message || "Failed to create violation report in database.",
        };
      }
    },
  );

/**
 * Server function to fetch violation reports submitted by the logged-in Faculty.
 */
export const fetchMyFacultyReportsApi = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ success: boolean; reports: DBViolationReport[]; error?: string }> => {
    try {
      const identity = await requireAnyRole(["faculty", "hod", "admin"]);
      const reports = await getFacultyReports(identity.fullName);
      return { success: true, reports };
    } catch (err: any) {
      console.error("[Faculty Server API Error] fetchMyFacultyReportsApi error:", err);
      return {
        success: false,
        reports: [],
        error: err.message || "Failed to fetch faculty reports.",
      };
    }
  },
);

/**
 * Server function to get the current active class slot for a student from the DB timetable.
 */
export const getStudentCurrentClassApi = createServerFn({ method: "GET" })
  .validator((data: { rollNo: string }) => {
    const rollNo = typeof data?.rollNo === "string" ? data.rollNo.trim().toUpperCase() : "";
    if (!rollNo) throw new Error("Student Roll Number is required.");
    return { rollNo };
  })
  .handler(
    async ({ data }): Promise<{ success: boolean; slot: DBClassSlot | null; error?: string }> => {
      try {
        await requireAnyRole(["faculty", "hod", "admin", "security"]);
        const slot = await getCurrentClassForStudent(data.rollNo);
        return { success: true, slot };
      } catch (err: any) {
        console.error("[Faculty Server API Error] getStudentCurrentClassApi error:", err);
        return { success: false, slot: null, error: err.message || "Failed to fetch class slot." };
      }
    },
  );

/**
 * Server function to fetch complete violation report detail (including student explanation and HOD decision)
 * for authorized roles (Faculty, HOD, Student, Admin) with security checks.
 */
export const getViolationReportDetailApi = createServerFn({ method: "GET" })
  .validator((data: { reportId: string }) => {
    const reportId = typeof data?.reportId === "string" ? data.reportId.trim() : "";
    if (!reportId) throw new Error("Report ID is required.");
    return { reportId };
  })
  .handler(
    async ({
      data,
    }): Promise<{ success: boolean; report: DBViolationReport | null; error?: string }> => {
      try {
        const identity = await requireAuthenticatedUser();
        const report = await getViolationReportById(data.reportId);
        if (!report) {
          return { success: false, report: null, error: "Report not found." };
        }

        // Role-based authorization
        if (identity.role === "hod") {
          if (report.department.toUpperCase() !== identity.department.toUpperCase()) {
            return { success: false, report: null, error: "Forbidden: Department access denied." };
          }
        } else if (identity.role === "student") {
          if (report.student_code.toUpperCase() !== (identity.studentCode || "").toUpperCase()) {
            return {
              success: false,
              report: null,
              error: "Forbidden: Access restricted to your own reports.",
            };
          }
        } else if (identity.role === "faculty") {
          if (
            report.reported_by !== identity.fullName &&
            report.department.toUpperCase() !== identity.department.toUpperCase()
          ) {
            return { success: false, report: null, error: "Forbidden: Access denied." };
          }
        }

        return { success: true, report };
      } catch (err: any) {
        console.error("[Server API Error] getViolationReportDetailApi error:", err);
        return {
          success: false,
          report: null,
          error: err.message || "Failed to fetch report detail.",
        };
      }
    },
  );
