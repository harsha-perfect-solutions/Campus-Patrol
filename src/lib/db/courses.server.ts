import { db } from "../db.server";

export interface AcademicCourse {
  id: string;
  courseCode: string;
  title: string;
  department: string;
  semester: number;
  credits: number;
  courseType: "Theory" | "Practical / Lab" | "Elective" | "Project";
  assignedFaculty: string;
  status: "Active" | "Archived";
  createdAt?: string | undefined;
  updatedAt?: string | undefined;
}

export interface CreateCourseInput {
  courseCode: string;
  title: string;
  department: string;
  semester: number;
  credits: number;
  courseType: "Theory" | "Practical / Lab" | "Elective" | "Project";
  assignedFaculty?: string | undefined;
  status?: "Active" | "Archived" | undefined;
}

export interface UpdateCourseInput {
  courseCode?: string | undefined;
  title?: string | undefined;
  department?: string | undefined;
  semester?: number | undefined;
  credits?: number | undefined;
  courseType?: "Theory" | "Practical / Lab" | "Elective" | "Project" | undefined;
  assignedFaculty?: string | undefined;
  status?: "Active" | "Archived" | undefined;
}

export interface CourseFilterOptions {
  department?: string | undefined;
  semester?: string | number | undefined;
  courseType?: string | undefined;
  search?: string | undefined;
}

let coursesTableEnsured = false;

export async function ensureCoursesTable(): Promise<void> {
  if (coursesTableEnsured) return;

  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS courses (
        id TEXT PRIMARY KEY,
        course_code TEXT NOT NULL UNIQUE,
        title TEXT NOT NULL,
        department TEXT NOT NULL,
        semester INTEGER NOT NULL DEFAULT 1,
        credits INTEGER NOT NULL DEFAULT 4,
        course_type TEXT NOT NULL DEFAULT 'Theory',
        assigned_faculty TEXT NOT NULL DEFAULT 'Unassigned',
        status TEXT NOT NULL DEFAULT 'Active',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_courses_dept ON courses(department);
      CREATE INDEX IF NOT EXISTS idx_courses_sem ON courses(semester);
      CREATE INDEX IF NOT EXISTS idx_courses_type ON courses(course_type);
      CREATE INDEX IF NOT EXISTS idx_courses_status ON courses(status);
      CREATE INDEX IF NOT EXISTS idx_courses_code ON courses(course_code);
    `);

    // Seed baseline initial academic courses if empty
    const checkCount = await db.query<{ count: number }>("SELECT COUNT(*)::int AS count FROM courses;");
    if (checkCount.rows[0]?.count === 0) {
      const initialCourses = [
        {
          id: "CRS-01",
          course_code: "CS501",
          title: "Operating Systems",
          department: "CSE",
          semester: 5,
          credits: 4,
          course_type: "Theory",
          assigned_faculty: "Prof. Ravi Kumar",
          status: "Active",
        },
        {
          id: "CRS-02",
          course_code: "CS502",
          title: "Database Management Systems",
          department: "CSE",
          semester: 5,
          credits: 4,
          course_type: "Theory",
          assigned_faculty: "Prof. Anita Sen",
          status: "Active",
        },
        {
          id: "CRS-03",
          course_code: "CS503L",
          title: "Operating Systems & Networking Lab",
          department: "CSE",
          semester: 5,
          credits: 2,
          course_type: "Practical / Lab",
          assigned_faculty: "Prof. Ravi Kumar",
          status: "Active",
        },
        {
          id: "CRS-04",
          course_code: "EC401",
          title: "Digital Signal Processing",
          department: "ECE",
          semester: 4,
          credits: 4,
          course_type: "Theory",
          assigned_faculty: "Dr. K. Swaminathan",
          status: "Active",
        },
        {
          id: "CRS-05",
          course_code: "EC402L",
          title: "Microprocessors & Microcontrollers Lab",
          department: "ECE",
          semester: 4,
          credits: 2,
          course_type: "Practical / Lab",
          assigned_faculty: "Prof. S. Nambiar",
          status: "Active",
        },
        {
          id: "CRS-06",
          course_code: "EE601",
          title: "Control Systems Engineering",
          department: "EEE",
          semester: 6,
          credits: 4,
          course_type: "Theory",
          assigned_faculty: "Dr. H. Varma",
          status: "Active",
        },
        {
          id: "CRS-07",
          course_code: "ME501",
          title: "Thermodynamics & Heat Transfer",
          department: "MECH",
          semester: 5,
          credits: 4,
          course_type: "Theory",
          assigned_faculty: "Prof. B. Mukherjee",
          status: "Active",
        },
        {
          id: "CRS-08",
          course_code: "CE501",
          title: "Structural Analysis & Design",
          department: "CIVIL",
          semester: 5,
          credits: 4,
          course_type: "Theory",
          assigned_faculty: "Dr. P. Deshmukh",
          status: "Active",
        },
        {
          id: "CRS-09",
          course_code: "CS701E",
          title: "Artificial Intelligence & Deep Learning",
          department: "CSE",
          semester: 7,
          credits: 3,
          course_type: "Elective",
          assigned_faculty: "Dr. M. Venkat",
          status: "Active",
        },
      ];

      for (const c of initialCourses) {
        await db.query(
          `INSERT INTO courses (id, course_code, title, department, semester, credits, course_type, assigned_faculty, status, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
           ON CONFLICT (id) DO NOTHING;`,
          [
            c.id,
            c.course_code,
            c.title,
            c.department,
            c.semester,
            c.credits,
            c.course_type,
            c.assigned_faculty,
            c.status,
          ],
        );
      }
    }

    coursesTableEnsured = true;
  } catch (err) {
    console.warn("[Courses DB Warning] Schema initialization notice:", err);
  }
}

function mapRowToAcademicCourse(row: any): AcademicCourse {
  return {
    id: row.id,
    courseCode: row.course_code,
    title: row.title,
    department: row.department,
    semester: Number(row.semester),
    credits: Number(row.credits),
    courseType: row.course_type as "Theory" | "Practical / Lab" | "Elective" | "Project",
    assignedFaculty: row.assigned_faculty,
    status: row.status as "Active" | "Archived",
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : undefined,
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : undefined,
  };
}

export async function getAcademicCourses(filters: CourseFilterOptions = {}): Promise<AcademicCourse[]> {
  await ensureCoursesTable();

  const conditions: string[] = ["1=1"];
  const values: any[] = [];
  let idx = 1;

  if (filters.department && filters.department !== "ALL") {
    conditions.push(`UPPER(department) = UPPER($${idx++})`);
    values.push(filters.department.trim());
  }

  if (filters.semester && String(filters.semester) !== "ALL") {
    conditions.push(`semester = $${idx++}`);
    values.push(Number(filters.semester));
  }

  if (filters.courseType && filters.courseType !== "ALL") {
    conditions.push(`UPPER(course_type) = UPPER($${idx++})`);
    values.push(filters.courseType.trim());
  }

  if (filters.search && filters.search.trim()) {
    const term = `%${filters.search.trim()}%`;
    conditions.push(
      `(course_code ILIKE $${idx} OR title ILIKE $${idx} OR assigned_faculty ILIKE $${idx})`,
    );
    idx++;
    values.push(term);
  }

  const query = `
    SELECT id, course_code, title, department, semester, credits, course_type, assigned_faculty, status, created_at, updated_at
    FROM courses
    WHERE ${conditions.join(" AND ")}
    ORDER BY department ASC, semester ASC, course_code ASC;
  `;

  const res = await db.query(query, values);
  return res.rows.map(mapRowToAcademicCourse);
}

export async function getCourseById(id: string): Promise<AcademicCourse | null> {
  await ensureCoursesTable();
  const cleanId = id.trim();
  const res = await db.query("SELECT * FROM courses WHERE UPPER(id) = UPPER($1) LIMIT 1;", [cleanId]);
  if (res.rows.length === 0) return null;
  return mapRowToAcademicCourse(res.rows[0]);
}

export async function getCourseByCode(courseCode: string): Promise<AcademicCourse | null> {
  await ensureCoursesTable();
  const cleanCode = courseCode.trim();
  const res = await db.query("SELECT * FROM courses WHERE UPPER(course_code) = UPPER($1) LIMIT 1;", [cleanCode]);
  if (res.rows.length === 0) return null;
  return mapRowToAcademicCourse(res.rows[0]);
}

export async function createCourse(
  input: CreateCourseInput,
  actorName: string,
  actorRole: string,
): Promise<AcademicCourse> {
  await ensureCoursesTable();

  const courseCode = input.courseCode.trim().toUpperCase();
  const title = input.title.trim();
  const department = input.department.trim();
  const semester = Number(input.semester);
  const credits = Number(input.credits);
  const courseType = input.courseType || "Theory";
  const assignedFaculty = input.assignedFaculty?.trim() || "Unassigned";
  const status = input.status || "Active";

  if (!courseCode) throw new Error("Course Code is required.");
  if (!title) throw new Error("Course Title is required.");
  if (!department) throw new Error("Department selection is required.");
  if (isNaN(semester) || semester < 1 || semester > 8) {
    throw new Error("Semester must be a valid number between 1 and 8.");
  }
  if (isNaN(credits) || credits < 1 || credits > 10) {
    throw new Error("Credits must be a valid number between 1 and 10.");
  }

  // Duplicate check
  const dupCheck = await db.query("SELECT id FROM courses WHERE UPPER(course_code) = UPPER($1);", [courseCode]);
  if (dupCheck.rows.length > 0) {
    throw new Error(`A course with Code '${courseCode}' already exists in catalog.`);
  }

  const courseId = `CRS-${Date.now().toString().slice(-4)}`;

  const res = await db.query(
    `INSERT INTO courses (id, course_code, title, department, semester, credits, course_type, assigned_faculty, status, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
     RETURNING *;`,
    [courseId, courseCode, title, department, semester, credits, courseType, assignedFaculty, status],
  );

  const course = mapRowToAcademicCourse(res.rows[0]);

  // Audit Log
  await db.query(
    `INSERT INTO audit_logs (actor, actor_role, action, target, target_id, metadata)
     VALUES ($1, $2, 'course_created', 'academic_course', $3, $4);`,
    [
      actorName,
      actorRole,
      course.id,
      JSON.stringify({
        courseCode: course.courseCode,
        title: course.title,
        department: course.department,
        semester: course.semester,
        credits: course.credits,
        courseType: course.courseType,
      }),
    ],
  );

  return course;
}

export async function updateCourse(
  id: string,
  input: UpdateCourseInput,
  actorName: string,
  actorRole: string,
): Promise<AcademicCourse> {
  await ensureCoursesTable();
  const cleanId = id.trim();

  const existing = await getCourseById(cleanId);
  if (!existing) {
    throw new Error(`Course with ID '${cleanId}' not found.`);
  }

  const courseCode = input.courseCode !== undefined ? input.courseCode.trim().toUpperCase() : existing.courseCode;
  const title = input.title !== undefined ? input.title.trim() : existing.title;
  const department = input.department !== undefined ? input.department.trim() : existing.department;
  const semester = input.semester !== undefined ? Number(input.semester) : existing.semester;
  const credits = input.credits !== undefined ? Number(input.credits) : existing.credits;
  const courseType = input.courseType !== undefined ? input.courseType : existing.courseType;
  const assignedFaculty = input.assignedFaculty !== undefined ? input.assignedFaculty.trim() || "Unassigned" : existing.assignedFaculty;
  const status = input.status !== undefined ? input.status : existing.status;

  if (!courseCode) throw new Error("Course Code cannot be empty.");
  if (!title) throw new Error("Course Title cannot be empty.");
  if (isNaN(semester) || semester < 1 || semester > 8) {
    throw new Error("Semester must be a number between 1 and 8.");
  }
  if (isNaN(credits) || credits < 1 || credits > 10) {
    throw new Error("Credits must be a number between 1 and 10.");
  }

  // Duplicate course_code check if code changed
  if (courseCode.toUpperCase() !== existing.courseCode.toUpperCase()) {
    const dupCheck = await db.query(
      "SELECT id FROM courses WHERE UPPER(course_code) = UPPER($1) AND UPPER(id) != UPPER($2);",
      [courseCode, cleanId],
    );
    if (dupCheck.rows.length > 0) {
      throw new Error(`Another course with Code '${courseCode}' already exists.`);
    }
  }

  const res = await db.query(
    `UPDATE courses
     SET course_code = $1, title = $2, department = $3, semester = $4, credits = $5, course_type = $6, assigned_faculty = $7, status = $8, updated_at = NOW()
     WHERE UPPER(id) = UPPER($9)
     RETURNING *;`,
    [courseCode, title, department, semester, credits, courseType, assignedFaculty, status, cleanId],
  );

  const updatedCourse = mapRowToAcademicCourse(res.rows[0]);

  // Audit Log
  await db.query(
    `INSERT INTO audit_logs (actor, actor_role, action, target, target_id, metadata)
     VALUES ($1, $2, 'course_updated', 'academic_course', $3, $4);`,
    [
      actorName,
      actorRole,
      cleanId,
      JSON.stringify({
        courseCode: updatedCourse.courseCode,
        title: updatedCourse.title,
        department: updatedCourse.department,
        semester: updatedCourse.semester,
        status: updatedCourse.status,
      }),
    ],
  );

  return updatedCourse;
}

export async function deleteCourse(
  id: string,
  actorName: string,
  actorRole: string,
): Promise<boolean> {
  await ensureCoursesTable();
  const cleanId = id.trim();

  const existing = await getCourseById(cleanId);
  if (!existing) {
    throw new Error(`Course with ID '${cleanId}' not found.`);
  }

  // Delete course
  await db.query("DELETE FROM courses WHERE UPPER(id) = UPPER($1);", [cleanId]);

  // Audit Log
  await db.query(
    `INSERT INTO audit_logs (actor, actor_role, action, target, target_id, metadata)
     VALUES ($1, $2, 'course_deleted', 'academic_course', $3, $4);`,
    [
      actorName,
      actorRole,
      cleanId,
      JSON.stringify({
        courseCode: existing.courseCode,
        title: existing.title,
      }),
    ],
  );

  return true;
}
