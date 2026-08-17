import { createServerFn } from "@tanstack/react-start";
import { requireRole, requireAnyRole } from "../session.server";
import {
  getDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  type DepartmentItem,
  type CreateDepartmentInput,
  type UpdateDepartmentInput,
  type DepartmentFilterOptions,
} from "../db/departments.server";

// ─── 1. Get Academic Departments ─────────────────────────────────────────────
export const getDepartmentsApi = createServerFn({ method: "POST" })
  .validator((d: DepartmentFilterOptions | undefined) => d)
  .handler(
    async ({
      data,
    }): Promise<{
      success: boolean;
      departments: DepartmentItem[];
      totalDepartments: number;
      activeCount: number;
      error?: string;
    }> => {
      try {
        await requireAnyRole(["admin", "hod", "faculty", "student", "security"]);
        const departments = await getDepartments(data || {});

        const activeCount = departments.filter((d) => d.status === "Active").length;

        return {
          success: true,
          departments,
          totalDepartments: departments.length,
          activeCount,
        };
      } catch (err: any) {
        console.error("[Departments API Error] getDepartmentsApi:", err);
        return {
          success: false,
          departments: [],
          totalDepartments: 0,
          activeCount: 0,
          error: err.message || "Failed to fetch departments.",
        };
      }
    },
  );

// ─── 2. Create New Department ────────────────────────────────────────────────
export const createDepartmentApi = createServerFn({ method: "POST" })
  .validator((d: CreateDepartmentInput) => d)
  .handler(
    async ({
      data,
    }): Promise<{
      success: boolean;
      department: DepartmentItem | null;
      error?: string;
    }> => {
      try {
        const session = await requireRole("admin");
        const department = await createDepartment(data, session.fullName, session.role);
        return {
          success: true,
          department,
        };
      } catch (err: any) {
        console.error("[Departments API Error] createDepartmentApi:", err);
        return {
          success: false,
          department: null,
          error: err.message || "Failed to create department.",
        };
      }
    },
  );

// ─── 3. Update Existing Department ───────────────────────────────────────────
export const updateDepartmentApi = createServerFn({ method: "POST" })
  .validator((d: { id: string; input: UpdateDepartmentInput }) => d)
  .handler(
    async ({
      data,
    }): Promise<{
      success: boolean;
      department: DepartmentItem | null;
      error?: string;
    }> => {
      try {
        const session = await requireRole("admin");
        const department = await updateDepartment(data.id, data.input, session.fullName, session.role);
        return {
          success: true,
          department,
        };
      } catch (err: any) {
        console.error("[Departments API Error] updateDepartmentApi:", err);
        return {
          success: false,
          department: null,
          error: err.message || "Failed to update department.",
        };
      }
    },
  );

// ─── 4. Delete Department ───────────────────────────────────────────────────
export const deleteDepartmentApi = createServerFn({ method: "POST" })
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
        await deleteDepartment(data.id, session.fullName, session.role);
        return {
          success: true,
        };
      } catch (err: any) {
        console.error("[Departments API Error] deleteDepartmentApi:", err);
        return {
          success: false,
          error: err.message || "Failed to remove department.",
        };
      }
    },
  );
