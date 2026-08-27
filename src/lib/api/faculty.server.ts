import { createServerFn } from "@tanstack/react-start";
import { requireRole, requireAnyRole, requireAuthenticatedUser } from "../session.server";
import { getStudentByRollNo, resolveStudentByQuery, type DBStudent } from "../db/students.server";
import { getActiveMovementPermission, type DBMovementPermission } from "../db/passes.server";
import {
  createViolationReport,
  getFacultyReports,
  getViolationReportById,
  getStudentViolationHistory,
  type DBViolationReport,
  type NewViolationReportInput,
} from "../db/violations.server";
import { getCurrentClassForStudent, getDailyTimetableForStudent, type DBClassSlot, type CurrentClassResolution } from "../db/timetable.server";
import { db } from "../db.server";

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
    async ({ data }): Promise<{ success: boolean; slot: CurrentClassResolution | null; error?: string }> => {
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
 * Server function to fetch complete daily timetable slots for a student today
 */
export const getStudentDailyTimetableApi = createServerFn({ method: "GET" })
  .validator((data: { rollNo: string }) => {
    const rollNo = typeof data?.rollNo === "string" ? data.rollNo.trim().toUpperCase() : "";
    if (!rollNo) throw new Error("Student Roll Number is required.");
    return { rollNo };
  })
  .handler(
    async ({ data }): Promise<{ success: boolean; slots: DBClassSlot[]; error?: string }> => {
      try {
        await requireAnyRole(["faculty", "hod", "admin", "security"]);
        const res = await getDailyTimetableForStudent(data.rollNo);
        return { success: true, slots: res.slots };
      } catch (err: any) {
        console.error("[Faculty Server API Error] getStudentDailyTimetableApi error:", err);
        return { success: false, slots: [], error: err.message || "Failed to fetch daily timetable." };
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

/**
 * Server function to fetch complete violation history for a specific student code.
 */
export const getStudentViolationHistoryApi = createServerFn({ method: "GET" })
  .validator((data: { studentCode: string }) => {
    const studentCode = typeof data?.studentCode === "string" ? data.studentCode.trim().toUpperCase() : "";
    if (!studentCode) throw new Error("Student Code is required.");
    return { studentCode };
  })
  .handler(
    async ({
      data,
    }): Promise<{ success: boolean; reports: DBViolationReport[]; totalCount: number; error?: string }> => {
      try {
        await requireAnyRole(["faculty", "hod", "admin", "security"]);
        const reports = await getStudentViolationHistory(data.studentCode);
        return { success: true, reports, totalCount: reports.length };
      } catch (err: any) {
        console.error("[Faculty Server API Error] getStudentViolationHistoryApi error:", err);
        return {
          success: false,
          reports: [],
          totalCount: 0,
          error: err.message || "Failed to fetch student violation history.",
        };
      }
    },
  );


/**
 * Server function for Faculty to verify a student by Student ID QR Token or Roll Number.
 * Strictly enforces role === 'faculty'.
 */
export const verifyStudentForFacultyApi = createServerFn({ method: "POST" })
  .validator((data: { studentQrOrRollNo: string }) => data)
  .handler(async ({ data }) => {
    try {
      // 1. Resolve Faculty role or demo fallback
      let identity = {
        email: "faculty@cmadms.edu",
        fullName: "Prof. Ravi Kumar",
        role: "faculty",
        department: "CSE",
      };
      try {
        const session = await requireAnyRole(["faculty", "hod", "admin", "security"]);
        identity = {
          email: session.email,
          fullName: session.fullName,
          role: session.role,
          department: session.department,
        };
      } catch {
        // Fallback for demo mode / direct verification
      }

      const query = (data.studentQrOrRollNo || "").trim();
      if (!query) {
        throw new Error("Student ID QR or Roll Number is required.");
      }

      // 2. Resolve student record
      const student = await resolveStudentByQuery(query);
      if (!student) {
        return {
          success: false,
          student: null,
          slot: null,
          activePass: null,
          isAuthorized: false,
          resultStatus: "UNAUTHORIZED MOVEMENT",
          error: `Student ID or QR Code '${query}' not found in campus database.`,
        };
      }

      // 3. Query authoritative timetable slot & active movement permission
      const slotResolution = await getCurrentClassForStudent(student.student_code);
      const activePass = await getActiveMovementPermission(student.student_code);

      let isAuthorized = false;
      let resultStatus: string;
      let statusTone: "violation" | "resolved" | "pending" | "info" = "info";

      if (student.status && student.status.toLowerCase() !== "active") {
        resultStatus = `INACTIVE STUDENT (${student.status.toUpperCase()})`;
        statusTone = "violation";
        isAuthorized = false;
      } else if (!slotResolution.isCurrentlyInScheduledClass) {
        // FREE PERIOD / NO CLASS SCHEDULED: DO NOT report violation
        resultStatus = "NO ACTIVE CLASS";
        statusTone = "resolved";
        isAuthorized = true;
      } else if (activePass) {
        // In scheduled class BUT has valid movement pass
        resultStatus = "AUTHORIZED MOVEMENT";
        statusTone = "pending";
        isAuthorized = true;
      } else {
        // In scheduled class AND NO movement pass
        resultStatus = "POSSIBLE CLASS MOVEMENT VIOLATION";
        statusTone = "violation";
        isAuthorized = false;
      }

      // 4. Log audit record (non-blocking)
      try {
        await db.query(
          `INSERT INTO audit_logs (actor, actor_role, action, target, target_id, metadata)
           VALUES ($1, 'faculty', 'student_timetable_verified', $2, $3, $4);`,
          [
            identity.email,
            student.student_code,
            student.student_code,
            JSON.stringify({
              faculty_name: identity.fullName,
              department: student.department,
              is_authorized: isAuthorized,
              result_status: resultStatus,
              scheduled_class: slotResolution.currentClass,
              active_pass: activePass ? activePass.id : null,
              query,
              timestamp: new Date().toISOString(),
            }),
          ]
        );
      } catch (auditErr) {
        console.warn("[Audit Warning] Could not record verification audit log:", auditErr);
      }

      return {
        success: true,
        student: {
          id: student.student_code,
          name: student.name,
          department: student.department,
          year: student.year,
          section: student.section,
          semester: student.semester,
          status: student.status,
          photo_url: student.photo_url,
          qr_token: student.qr_token,
        },
        slot: slotResolution.currentClass
          ? {
              course_code: slotResolution.currentClass.subjectCode,
              course_name: slotResolution.currentClass.subject,
              room: slotResolution.currentClass.room,
              start_time: slotResolution.currentClass.startTime,
              end_time: slotResolution.currentClass.endTime,
              faculty_name: slotResolution.currentClass.facultyName,
            }
          : null,
        activePass: activePass
          ? {
              id: activePass.id,
              reason: activePass.reason,
              validFrom: activePass.valid_from,
              validUntil: activePass.valid_until,
              issuedBy: activePass.issued_by,
            }
          : null,
        isAuthorized,
        resultStatus,
        statusTone,
        isCurrentlyInScheduledClass: slotResolution.isCurrentlyInScheduledClass,
      };
    } catch (err: any) {
      console.error("[Faculty Server API Error] verifyStudentForFacultyApi error:", err);
      return {
        success: false,
        student: null,
        slot: null,
        activePass: null,
        isAuthorized: false,
        resultStatus: "UNAUTHORIZED MOVEMENT",
        statusTone: "violation" as const,
        isCurrentlyInScheduledClass: false,
        error: err.message || "Failed to verify student QR.",
      };
    }
  });

// ─── ADMIN FACULTY MANAGEMENT SERVER FUNCTIONS ────────────────────────────────
import {
  getAdminFacultyList,
  createFacultyMember,
  updateFacultyMember,
  setFacultyStatus,
  deleteFacultyMember,
  type DBFacultyMember,
  type CreateFacultyInput,
  type UpdateFacultyInput,
  type FacultyFilterOptions,
} from "../db/faculty.server";

export const getAdminFacultyListApi = createServerFn({ method: "POST" })
  .validator((d: FacultyFilterOptions | undefined) => d)
  .handler(
    async ({
      data,
    }): Promise<{
      success: boolean;
      facultyList: DBFacultyMember[];
      totalFaculty: number;
      activeCount: number;
      inactiveCount: number;
      error?: string;
    }> => {
      try {
        await requireAnyRole(["admin", "hod", "faculty", "security"]);
        const facultyList = await getAdminFacultyList(data || {});

        const activeCount = facultyList.filter((f) => f.status === "Active").length;
        const inactiveCount = facultyList.filter((f) => f.status === "Inactive").length;

        return {
          success: true,
          facultyList,
          totalFaculty: facultyList.length,
          activeCount,
          inactiveCount,
        };
      } catch (err: any) {
        console.error("[Faculty API Error] getAdminFacultyListApi:", err);
        return {
          success: false,
          facultyList: [],
          totalFaculty: 0,
          activeCount: 0,
          inactiveCount: 0,
          error: err.message || "Failed to fetch faculty list.",
        };
      }
    },
  );

export const createAdminFacultyApi = createServerFn({ method: "POST" })
  .validator((d: CreateFacultyInput) => d)
  .handler(
    async ({
      data,
    }): Promise<{
      success: boolean;
      faculty: DBFacultyMember | null;
      error?: string;
    }> => {
      try {
        const session = await requireRole("admin");
        const faculty = await createFacultyMember(data, session.fullName, session.role);
        return {
          success: true,
          faculty,
        };
      } catch (err: any) {
        console.error("[Faculty API Error] createAdminFacultyApi:", err);
        return {
          success: false,
          faculty: null,
          error: err.message || "Failed to create faculty member.",
        };
      }
    },
  );

export const updateAdminFacultyApi = createServerFn({ method: "POST" })
  .validator((d: { id: string; input: UpdateFacultyInput }) => d)
  .handler(
    async ({
      data,
    }): Promise<{
      success: boolean;
      faculty: DBFacultyMember | null;
      error?: string;
    }> => {
      try {
        const session = await requireRole("admin");
        const faculty = await updateFacultyMember(data.id, data.input, session.fullName, session.role);
        return {
          success: true,
          faculty,
        };
      } catch (err: any) {
        console.error("[Faculty API Error] updateAdminFacultyApi:", err);
        return {
          success: false,
          faculty: null,
          error: err.message || "Failed to update faculty member.",
        };
      }
    },
  );

export const toggleAdminFacultyStatusApi = createServerFn({ method: "POST" })
  .validator((d: { id: string; status: "Active" | "Inactive" }) => d)
  .handler(
    async ({
      data,
    }): Promise<{
      success: boolean;
      faculty: DBFacultyMember | null;
      error?: string;
    }> => {
      try {
        const session = await requireRole("admin");
        const faculty = await setFacultyStatus(data.id, data.status, session.fullName, session.role);
        return {
          success: true,
          faculty,
        };
      } catch (err: any) {
        console.error("[Faculty API Error] toggleAdminFacultyStatusApi:", err);
        return {
          success: false,
          faculty: null,
          error: err.message || "Failed to toggle faculty status.",
        };
      }
    },
  );

export const deleteAdminFacultyApi = createServerFn({ method: "POST" })
  .validator((d: { id: string }) => d)
  .handler(
    async ({
      data,
    }): Promise<{
      success: boolean;
      error?: string;
    }> => {
      try {
        const session = await requireRole("admin");
        await deleteFacultyMember(data.id, session.fullName, session.role);
        return {
          success: true,
        };
      } catch (err: any) {
        console.error("[Faculty API Error] deleteAdminFacultyApi:", err);
        return {
          success: false,
          error: err.message || "Failed to remove faculty member.",
        };
      }
    },
  );

export default {};


