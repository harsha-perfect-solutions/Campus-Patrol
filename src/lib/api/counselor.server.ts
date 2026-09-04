import { createServerFn } from "@tanstack/react-start";
import { requireRole } from "../session.server";
import {
  getCounselorAssignmentsForAdmin,
  addCounselorAssignment,
  removeCounselorAssignment,
  distributeStudentsToCounselors,
  getCounselorDashboardStats,
  getCounselorStudents,
  getCounselorViolations,
  resolveViolationByCounselor,
  escalateViolationToHod,
  hasActiveCounselorAssignment,
} from "../db/counselor.server";

/**
 * Server API: Check if current faculty user is an active Counselor.
 */
export const isFacultyCounselorApi = createServerFn({ method: "GET" }).handler(async () => {
  const session = await requireRole("faculty");
  return { isCounselor: true, userId: session.userId };
});

/**
 * Server API: Get Counselor Assignments for Admin Console.
 */
export const getCounselorAssignmentsAdminApi = createServerFn({ method: "POST" })
  .validator((data: { department?: string; year?: string; semester?: number; section?: string }) => data)
  .handler(async ({ data }) => {
    await requireRole("admin");
    return await getCounselorAssignmentsForAdmin(data);
  });

/**
 * Server API: Add Counselor Assignment for a class/section (Admin).
 */
export const addCounselorAssignmentAdminApi = createServerFn({ method: "POST" })
  .validator(
    (data: { facultyId: string; department: string; year: string; semester: number; section: string }) => data
  )
  .handler(async ({ data }) => {
    await requireRole("admin");
    return await addCounselorAssignment(data);
  });

/**
 * Server API: Remove Counselor Assignment (Admin).
 */
export const removeCounselorAssignmentAdminApi = createServerFn({ method: "POST" })
  .validator((data: { assignmentId: string }) => data)
  .handler(async ({ data }) => {
    await requireRole("admin");
    const success = await removeCounselorAssignment(data.assignmentId);
    return { success };
  });

/**
 * Server API: Distribute / Reassign Students to Counselors (Admin).
 * Enforces stability: Only triggered explicitly by Admin.
 */
export const distributeStudentsAdminApi = createServerFn({ method: "POST" })
  .validator(
    (data: {
      department: string;
      year: string;
      section: string;
      mode: "auto" | "manual";
      manualMapping?: Record<string, string[]>;
    }) => data
  )
  .handler(async ({ data }) => {
    await requireRole("admin");
    return await distributeStudentsToCounselors(data);
  });

/**
 * Server API: Get Counselor Dashboard Stats (Faculty role).
 * Server-authoritative: Uses authenticated session.userId.
 */
export const getCounselorDashboardStatsApi = createServerFn({ method: "GET" }).handler(async () => {
  const session = await requireRole("faculty");
  return await getCounselorDashboardStats(session.userId);
});

/**
 * Server API: Get Counseling Students (Faculty role).
 * Server-authoritative: Returns ONLY students assigned to this counselor.
 */
export const getCounselorStudentsApi = createServerFn({ method: "GET" }).handler(async () => {
  const session = await requireRole("faculty");
  return await getCounselorStudents(session.userId);
});

/**
 * Server API: Get Counselor Violations (Faculty role).
 * Server-authoritative: Returns ONLY violations assigned to this counselor.
 */
export const getCounselorViolationsApi = createServerFn({ method: "POST" })
  .validator((data: { status?: string; search?: string }) => data)
  .handler(async ({ data }) => {
    const session = await requireRole("faculty");
    return await getCounselorViolations(session.userId, data);
  });

/**
 * Server API: Counselor action - Resolve Violation Report.
 */
export const resolveCounselorViolationApi = createServerFn({ method: "POST" })
  .validator((data: { violationId: string; resolutionNote?: string }) => data)
  .handler(async ({ data }) => {
    const session = await requireRole("faculty");
    return await resolveViolationByCounselor(session.userId, data.violationId, data.resolutionNote);
  });

/**
 * Server API: Counselor action - Escalate Violation Report to HOD.
 */
export const escalateCounselorViolationApi = createServerFn({ method: "POST" })
  .validator((data: { violationId: string; escalationReason?: string; counselorRemarks?: string }) => data)
  .handler(async ({ data }) => {
    const session = await requireRole("faculty");
    return await escalateViolationToHod(
      session.userId,
      data.violationId,
      data.escalationReason,
      data.counselorRemarks
    );
  });

/**
 * Server API: Get Assigned Counselor Details for a Student.
 */
export const getStudentCounselorApi = createServerFn({ method: "POST" })
  .validator((data: { studentCode: string; department?: string; year?: string; section?: string }) => data)
  .handler(async ({ data }) => {
    const { getStudentCounselorDetails } = await import("../db/counselor.server");
    return await getStudentCounselorDetails(data.studentCode, data.department, data.year, data.section);
  });

/**
 * Server API: Get Counseling Student Movement Passes.
 */
export const getCounselorPassesApi = createServerFn({ method: "POST" })
  .validator((data: { status?: string }) => data)
  .handler(async ({ data }) => {
    const session = await requireRole("faculty");
    const { getCounselorPasses } = await import("../db/counselor.server");
    return await getCounselorPasses(session.userId, data.status);
  });

/**
 * Server API: Counselor action - Approve or Reject Student Movement Pass.
 */
export const approveCounselorPassApi = createServerFn({ method: "POST" })
  .validator((data: { passId: string; status: "approved" | "rejected" }) => data)
  .handler(async ({ data }) => {
    const session = await requireRole("faculty");
    const { approveMovementPermission } = await import("../db/permissions.server");
    const updated = await approveMovementPermission(
      data.passId,
      data.status,
      session.fullName || session.email || "Counselor"
    );
    return { success: true, pass: updated };
  });

/**
 * Server API: Get assigned counselor information for the logged-in student.
 * Server-authoritative: Enforces student authorization using session.userId.
 */
export const getMyCounselorApi = createServerFn({ method: "GET" }).handler(async () => {
  const session = await requireRole("student");
  const { getStudentCounselorDetailsForUser } = await import("../db/counselor.server");
  return await getStudentCounselorDetailsForUser(
    session.userId,
    session.studentCode || undefined,
    session.department || undefined
  );
});

export default {};


