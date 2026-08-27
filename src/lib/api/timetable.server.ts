import { createServerFn } from "@tanstack/react-start";
import { requireRole, requireAnyRole, requireAuthenticatedUser } from "../session.server";
import {
  getAdminTimetable,
  addTimetableSlot,
  updateTimetableSlot,
  deleteTimetableSlot,
  getStudentTimetable,
  getCurrentClassForStudent,
  type DBClassSlot,
  type TimetableSlotInput,
  type CurrentClassResolution,
} from "../db/timetable.server";

import { getAvailableSubjectsForTimetable } from "../db/courses.server";

// ─── Query Master Timetable (Admin / HOD / Faculty) ─────────────────────────

export const getAdminTimetableApi = createServerFn({ method: "GET" })
  .validator(
    (filters?: {
      department?: string;
      year?: string;
      semester?: string | number;
      section?: string;
      dayOfWeek?: string | number;
      periodType?: string;
      facultyName?: string;
      room?: string;
      search?: string;
    }) => filters ?? {},
  )
  .handler(
    async ({
      data,
    }): Promise<{
      success: boolean;
      slots: DBClassSlot[];
      error?: string;
    }> => {
      try {
        await requireAnyRole(["admin", "hod", "faculty", "security"]);
        const slots = await getAdminTimetable(data);
        return { success: true, slots };
      } catch (err: any) {
        console.error("[Timetable Server API Error] getAdminTimetableApi error:", err);
        return {
          success: false,
          slots: [],
          error: err.message || "Failed to query master timetable.",
        };
      }
    },
  );

// ─── Query Dynamic Subjects for Timetable (Admin Only) ──────────────────────

export const getDynamicSubjectsApi = createServerFn({ method: "GET" })
  .validator((data?: { department?: string; year?: string; semester?: string | number; periodType?: string }) => ({
    department: data?.department || "CSE",
    year: data?.year || "3rd Year",
    semester: data?.semester,
    periodType: data?.periodType,
  }))
  .handler(
    async ({ data }): Promise<{
      success: boolean;
      subjects: { courseCode: string; title: string; courseType: string; assignedFaculty: string }[];
      error?: string;
    }> => {
      try {
        await requireAnyRole(["admin", "hod"]);
        const subjects = await getAvailableSubjectsForTimetable(
          data.department,
          data.year,
          data.semester,
          data.periodType,
        );
        return { success: true, subjects };
      } catch (err: any) {
        console.error("[Timetable Server API Error] getDynamicSubjectsApi error:", err);
        return { success: false, subjects: [], error: err.message };
      }
    },
  );

// ─── Add Timetable Slot (Admin Only) ────────────────────────────────────────

export const addTimetableSlotApi = createServerFn({ method: "POST" })
  .validator((data: TimetableSlotInput) => {
    const pType = (data?.periodType || "CLASS").toString().toUpperCase();
    if (!data?.department?.trim()) throw new Error("Department is required.");
    if (!data?.year?.trim()) throw new Error("Year is required.");
    if (!data?.section?.trim()) throw new Error("Section is required.");
    if (!data?.startTime?.trim()) throw new Error("Start Time is required.");
    if (!data?.endTime?.trim()) throw new Error("End Time is required.");

    if (pType === "CLASS" || pType === "LAB") {
      if (!data?.subject?.trim()) throw new Error("Subject is required.");
      if (!data?.subjectCode?.trim()) throw new Error("Subject Code is required.");
      if (!data?.facultyName?.trim()) throw new Error("Faculty Name is required.");
      if (!data?.room?.trim()) throw new Error("Room is required.");
    }
    return data;
  })
  .handler(
    async ({
      data,
    }): Promise<{
      success: boolean;
      slot: DBClassSlot | null;
      error?: string;
    }> => {
      try {
        const session = await requireRole("admin");
        const slot = await addTimetableSlot(data, session.fullName || session.email);
        return { success: true, slot };
      } catch (err: any) {
        console.error("[Timetable Server API Error] addTimetableSlotApi error:", err);
        return {
          success: false,
          slot: null,
          error: err.message || "Failed to add timetable slot.",
        };
      }
    },
  );

// ─── Update Timetable Slot (Admin Only) ─────────────────────────────────────

export const updateTimetableSlotApi = createServerFn({ method: "POST" })
  .validator(
    (data: { id: string; input: TimetableSlotInput }) => {
      if (!data?.id?.trim()) throw new Error("Timetable Slot ID is required.");
      const pType = (data?.input?.periodType || "CLASS").toString().toUpperCase();
      if (!data?.input?.department?.trim()) throw new Error("Department is required.");
      if (!data?.input?.year?.trim()) throw new Error("Year is required.");
      if (!data?.input?.section?.trim()) throw new Error("Section is required.");
      if (!data?.input?.startTime?.trim()) throw new Error("Start Time is required.");
      if (!data?.input?.endTime?.trim()) throw new Error("End Time is required.");

      if (pType === "CLASS" || pType === "LAB") {
        if (!data?.input?.subject?.trim()) throw new Error("Subject is required.");
        if (!data?.input?.subjectCode?.trim()) throw new Error("Subject Code is required.");
        if (!data?.input?.facultyName?.trim()) throw new Error("Faculty Name is required.");
        if (!data?.input?.room?.trim()) throw new Error("Room is required.");
      }
      return data;
    },
  )
  .handler(
    async ({
      data,
    }): Promise<{
      success: boolean;
      slot: DBClassSlot | null;
      error?: string;
    }> => {
      try {
        const session = await requireRole("admin");
        const slot = await updateTimetableSlot(
          data.id,
          data.input,
          session.fullName || session.email,
        );
        return { success: true, slot };
      } catch (err: any) {
        console.error("[Timetable Server API Error] updateTimetableSlotApi error:", err);
        return {
          success: false,
          slot: null,
          error: err.message || "Failed to update timetable slot.",
        };
      }
    },
  );

// ─── Delete Timetable Slot (Admin Only) ─────────────────────────────────────

export const deleteTimetableSlotApi = createServerFn({ method: "POST" })
  .validator((data: { id: string }) => {
    if (!data?.id?.trim()) throw new Error("Timetable Slot ID is required.");
    return { id: data.id.trim() };
  })
  .handler(
    async ({ data }): Promise<{ success: boolean; error?: string }> => {
      try {
        const session = await requireRole("admin");
        const deleted = await deleteTimetableSlot(
          data.id,
          session.fullName || session.email,
        );
        if (!deleted) {
          return { success: false, error: "Timetable slot not found." };
        }
        return { success: true };
      } catch (err: any) {
        console.error("[Timetable Server API Error] deleteTimetableSlotApi error:", err);
        return {
          success: false,
          error: err.message || "Failed to delete timetable slot.",
        };
      }
    },
  );

// ─── Student Dynamic Timetable API ──────────────────────────────────────────

export const getMyStudentTimetableApi = createServerFn({ method: "GET" }).handler(
  async (): Promise<{
    success: boolean;
    slots: DBClassSlot[];
    error?: string;
  }> => {
    try {
      const session = await requireRole("student");
      const code = session.studentCode || session.email;
      if (!code) {
        throw new Error("No student account record associated with this session.");
      }
      const slots = await getStudentTimetable(code);
      return { success: true, slots };
    } catch (err: any) {
      console.error("[Timetable Server API Error] getMyStudentTimetableApi error:", err);
      return {
        success: false,
        slots: [],
        error: err.message || "Failed to load student timetable.",
      };
    }
  },
);

// ─── Current Class Resolution API ───────────────────────────────────────────

export const getStudentCurrentClassDetailsApi = createServerFn({ method: "GET" })
  .validator((data: { rollNo: string }) => {
    const rollNo = typeof data?.rollNo === "string" ? data.rollNo.trim().toUpperCase() : "";
    if (!rollNo) throw new Error("Student Roll Number is required.");
    return { rollNo };
  })
  .handler(
    async ({ data }): Promise<{ success: boolean; resolution: CurrentClassResolution; error?: string }> => {
      try {
        await requireAnyRole(["faculty", "hod", "admin", "security"]);
        const resolution = await getCurrentClassForStudent(data.rollNo);
        return { success: true, resolution };
      } catch (err: any) {
        console.error("[Timetable Server API Error] getStudentCurrentClassDetailsApi error:", err);
        return {
          success: false,
          resolution: {
            student: null,
            isCurrentlyInScheduledClass: false,
            currentClass: null,
            status: "STUDENT_NOT_FOUND",
          },
          error: err.message || "Failed to resolve student current class.",
        };
      }
    },
  );

export default {};
