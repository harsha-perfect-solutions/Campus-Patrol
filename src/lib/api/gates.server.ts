import { createServerFn } from "@tanstack/react-start";
import { requireRole } from "../session.server";

export const getCollegeGatesApi = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const { getAllCollegeGates } = await import("../db/gates.server");
    const gates = await getAllCollegeGates();
    return { success: true, gates };
  } catch (err: any) {
    console.error("[Gates API Error] getCollegeGatesApi:", err);
    return { success: false, error: err.message || "Failed to fetch college gates.", gates: [] };
  }
});

export const createCollegeGateApi = createServerFn({ method: "POST" })
  .validator((data: { gateName: string; gateCode: string; description?: string }) => data)
  .handler(async ({ data }: { data: { gateName: string; gateCode: string; description?: string } }) => {
    try {
      await requireRole("admin");
      const { createCollegeGate } = await import("../db/gates.server");
      return await createCollegeGate(data);
    } catch (err: any) {
      console.error("[Gates API Error] createCollegeGateApi:", err);
      return { success: false, error: err.message || "Failed to create campus gate." };
    }
  });

export const updateCollegeGateApi = createServerFn({ method: "POST" })
  .validator(
    (data: {
      id: string;
      gateName: string;
      gateCode: string;
      description?: string;
      status: "Active" | "Inactive";
    }) => data
  )
  .handler(async ({ data }: { data: { id: string; gateName: string; gateCode: string; description?: string; status: "Active" | "Inactive" } }) => {
    try {
      await requireRole("admin");
      const { updateCollegeGate } = await import("../db/gates.server");
      return await updateCollegeGate(data);
    } catch (err: any) {
      console.error("[Gates API Error] updateCollegeGateApi:", err);
      return { success: false, error: err.message || "Failed to update campus gate." };
    }
  });

export const deleteCollegeGateApi = createServerFn({ method: "POST" })
  .validator((data: { id: string }) => data)
  .handler(async ({ data }: { data: { id: string } }) => {
    try {
      await requireRole("admin");
      const { deleteCollegeGate } = await import("../db/gates.server");
      return await deleteCollegeGate(data.id);
    } catch (err: any) {
      console.error("[Gates API Error] deleteCollegeGateApi:", err);
      return { success: false, error: err.message || "Failed to delete campus gate." };
    }
  });

export default {};
