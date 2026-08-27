import { createServerFn } from "@tanstack/react-start";
import { requireRole, requireAnyRole } from "../session.server";
import {
  getAcademicCourses,
  createCourse,
  updateCourse,
  deleteCourse,
  type AcademicCourse,
  type CreateCourseInput,
  type UpdateCourseInput,
  type CourseFilterOptions,
} from "../db/courses.server";

// ─── 1. Get Academic Courses Catalog ─────────────────────────────────────────
export const getAcademicCoursesApi = createServerFn({ method: "POST" })
  .validator((d: CourseFilterOptions | undefined) => d)
  .handler(
    async ({
      data,
    }): Promise<{
      success: boolean;
      courses: AcademicCourse[];
      totalCourses: number;
      theoryCount: number;
      labCount: number;
      electiveCount: number;
      error?: string;
    }> => {
      try {
        await requireAnyRole(["admin", "hod", "faculty", "student", "security"]);
        const courses = await getAcademicCourses(data || {});

        const theoryCount = courses.filter((c) => c.courseType === "Theory").length;
        const labCount = courses.filter((c) => c.courseType === "Practical / Lab").length;
        const electiveCount = courses.filter((c) => c.courseType === "Elective" || c.courseType === "Project").length;

        return {
          success: true,
          courses,
          totalCourses: courses.length,
          theoryCount,
          labCount,
          electiveCount,
        };
      } catch (err: any) {
        console.error("[Courses API Error] getAcademicCoursesApi:", err);
        return {
          success: false,
          courses: [],
          totalCourses: 0,
          theoryCount: 0,
          labCount: 0,
          electiveCount: 0,
          error: err.message || "Failed to fetch courses catalog.",
        };
      }
    },
  );

// ─── 2. Create New Academic Course ──────────────────────────────────────────
export const createCourseApi = createServerFn({ method: "POST" })
  .validator((d: CreateCourseInput) => d)
  .handler(
    async ({
      data,
    }): Promise<{
      success: boolean;
      course: AcademicCourse | null;
      error?: string;
    }> => {
      try {
        const session = await requireRole("admin");
        const course = await createCourse(data, session.fullName, session.role);
        return {
          success: true,
          course,
        };
      } catch (err: any) {
        console.error("[Courses API Error] createCourseApi:", err);
        return {
          success: false,
          course: null,
          error: err.message || "Failed to add course to catalog.",
        };
      }
    },
  );

// ─── 3. Update Existing Course ──────────────────────────────────────────────
export const updateCourseApi = createServerFn({ method: "POST" })
  .validator((d: { id: string; input: UpdateCourseInput }) => d)
  .handler(
    async ({
      data,
    }): Promise<{
      success: boolean;
      course: AcademicCourse | null;
      error?: string;
    }> => {
      try {
        const session = await requireRole("admin");
        const course = await updateCourse(data.id, data.input, session.fullName, session.role);
        return {
          success: true,
          course,
        };
      } catch (err: any) {
        console.error("[Courses API Error] updateCourseApi:", err);
        return {
          success: false,
          course: null,
          error: err.message || "Failed to update course.",
        };
      }
    },
  );

// ─── 4. Delete Course ───────────────────────────────────────────────────────
export const deleteCourseApi = createServerFn({ method: "POST" })
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
        await deleteCourse(data.id, session.fullName, session.role);
        return {
          success: true,
        };
      } catch (err: any) {
        console.error("[Courses API Error] deleteCourseApi:", err);
        return {
          success: false,
          error: err.message || "Failed to remove course.",
        };
      }
    },
  );

export default {};
