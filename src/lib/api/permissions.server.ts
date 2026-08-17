import { createServerFn } from "@tanstack/react-start";
import { requireAuthenticatedUser, requireAnyRole } from "../session.server";
import {
  getPermissionsByStudentCode,
  createMovementPermission,
  approveMovementPermission,
  type DBPermission,
} from "../db/permissions.server";

export const fetchStudentPermissions = createServerFn({ method: "GET" })
  .validator((data: { studentCode?: string }) => {
    const studentCode = typeof data?.studentCode === "string" ? data.studentCode.trim() : "";
    return { studentCode };
  })
  .handler(
    async ({
      data,
    }): Promise<{ success: boolean; permissions: DBPermission[]; error?: string }> => {
      try {
        const identity = await requireAuthenticatedUser();
        let targetCode = data.studentCode;

        // Security Task 14.8 & Task 5: If caller is a student, force their own studentCode from session
        if (identity.role === "student") {
          targetCode = identity.studentCode || identity.email;
        }

        if (!targetCode) {
          return { success: false, permissions: [], error: "Student roll number is required." };
        }

        const permissions = await getPermissionsByStudentCode(targetCode);
        return { success: true, permissions };
      } catch (err: any) {
        console.error("[Permissions API Error] fetchStudentPermissions failed:", err);
        return {
          success: false,
          permissions: [],
          error: err.message || "Failed to load movement permissions.",
        };
      }
    },
  );

export const issueMovementPass = createServerFn({ method: "POST" })
  .validator(
    (data: {
      studentCode: string;
      reason: string;
      validFrom: string;
      validUntil: string;
      issuedBy?: string;
    }) => {
      if (!data.studentCode || !data.reason || !data.validFrom || !data.validUntil) {
        throw new Error("Missing required fields for issuing movement pass.");
      }
      return data;
    },
  )
  .handler(
    async ({
      data,
    }): Promise<{ success: boolean; permission: DBPermission | null; error?: string }> => {
      try {
        // Enforce: Only Department HOD can issue/approve passes
        const identity = await requireAnyRole(["hod"]);
        const permission = await createMovementPermission({
          studentCode: data.studentCode,
          reason: data.reason,
          validFrom: data.validFrom,
          validUntil: data.validUntil,
          issuedBy: `HOD (${identity.fullName})`,
        });
        return { success: true, permission };
      } catch (err: any) {
        console.error("[Permissions API Error] issueMovementPass failed:", err);
        return {
          success: false,
          permission: null,
          error: err.message || "Failed to issue movement pass.",
        };
      }
    },
  );

export const approveMovementPassApi = createServerFn({ method: "POST" })
  .validator((data: { passId: string; status: "approved" | "rejected"; rejectionReason?: string }) => {
    if (!data?.passId || !data?.status) {
      throw new Error("Pass ID and Status are required.");
    }
    return data;
  })
  .handler(
    async ({
      data,
    }): Promise<{ success: boolean; permission: DBPermission | null; error?: string }> => {
      try {
        // Enforce: Only Department HOD can approve/reject student movement passes
        const identity = await requireAnyRole(["hod"]);
        const permission = await approveMovementPermission(
          data.passId,
          data.status,
          `HOD (${identity.fullName})`,
        );
        return { success: true, permission };
      } catch (err: any) {
        console.error("[Permissions API Error] approveMovementPassApi failed:", err);
        return {
          success: false,
          permission: null,
          error: err.message || "Failed to approve movement pass.",
        };
      }
    },
  );

