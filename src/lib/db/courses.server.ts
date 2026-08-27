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
        { id: "CRS-01", course_code: "CS501", title: "Operating Systems", department: "CSE", semester: 5, credits: 4, course_type: "Theory", assigned_faculty: "Prof. Ravi Kumar", status: "Active" },
        { id: "CRS-02", course_code: "CS502", title: "Database Management Systems", department: "CSE", semester: 5, credits: 4, course_type: "Theory", assigned_faculty: "Prof. Anita Sen", status: "Active" },
        { id: "CRS-03", course_code: "CS503L", title: "Operating Systems & Networking Lab", department: "CSE", semester: 5, credits: 2, course_type: "Practical / Lab", assigned_faculty: "Prof. Ravi Kumar", status: "Active" },
        { id: "CRS-04", course_code: "EC401", title: "Digital Signal Processing", department: "ECE", semester: 4, credits: 4, course_type: "Theory", assigned_faculty: "Dr. K. Swaminathan", status: "Active" },
        { id: "CRS-05", course_code: "EC402L", title: "Microprocessors & Microcontrollers Lab", department: "ECE", semester: 4, credits: 2, course_type: "Practical / Lab", assigned_faculty: "Prof. S. Nambiar", status: "Active" },
        { id: "CRS-06", course_code: "EE601", title: "Control Systems Engineering", department: "EEE", semester: 6, credits: 4, course_type: "Theory", assigned_faculty: "Dr. H. Varma", status: "Active" },
        { id: "CRS-07", course_code: "ME501", title: "Thermodynamics & Heat Transfer", department: "MECH", semester: 5, credits: 4, course_type: "Theory", assigned_faculty: "Prof. B. Mukherjee", status: "Active" },
        { id: "CRS-08", course_code: "CE501", title: "Structural Analysis & Design", department: "CIVIL", semester: 5, credits: 4, course_type: "Theory", assigned_faculty: "Dr. P. Deshmukh", status: "Active" },
        { id: "CRS-09", course_code: "CS701E", title: "Artificial Intelligence & Deep Learning", department: "CSE", semester: 7, credits: 3, course_type: "Elective", assigned_faculty: "Dr. M. Venkat", status: "Active" },
        // 1st Year (Semester 1 & 2)
        { id: "CRS-10", course_code: "MA101", title: "Mathematics-I", department: "CSE", semester: 1, credits: 4, course_type: "Theory", assigned_faculty: "Dr. S. Sharma", status: "Active" },
        { id: "CRS-11", course_code: "PH101", title: "Engineering Physics", department: "CSE", semester: 1, credits: 4, course_type: "Theory", assigned_faculty: "Mr. Arjun V", status: "Active" },
        { id: "CRS-12", course_code: "CS101", title: "Programming in C", department: "CSE", semester: 1, credits: 4, course_type: "Theory", assigned_faculty: "Dr. Ramesh B", status: "Active" },
        { id: "CRS-13", course_code: "ME101", title: "Engineering Graphics", department: "CSE", semester: 1, credits: 3, course_type: "Theory", assigned_faculty: "Mrs. Priya N", status: "Active" },
        { id: "CRS-14", course_code: "CS101L", title: "C Programming & Physics Lab", department: "CSE", semester: 1, credits: 2, course_type: "Practical / Lab", assigned_faculty: "Dr. Meena K", status: "Active" },
        { id: "CRS-15", course_code: "MA102", title: "Mathematics-II", department: "CSE", semester: 2, credits: 4, course_type: "Theory", assigned_faculty: "Dr. S. Sharma", status: "Active" },
        { id: "CRS-16", course_code: "CH102", title: "Engineering Chemistry", department: "CSE", semester: 2, credits: 4, course_type: "Theory", assigned_faculty: "Dr. A. Gupta", status: "Active" },
        { id: "CRS-17", course_code: "EE102", title: "Basic Electrical Engineering", department: "CSE", semester: 2, credits: 4, course_type: "Theory", assigned_faculty: "Prof. K. Rao", status: "Active" },
        { id: "CRS-18", course_code: "EE102L", title: "Chemistry & Electrical Lab", department: "CSE", semester: 2, credits: 2, course_type: "Practical / Lab", assigned_faculty: "Dr. A. Gupta", status: "Active" },
        // 2nd Year (Semester 3 & 4)
        { id: "CRS-19", course_code: "CS301", title: "Data Structures", department: "CSE", semester: 3, credits: 4, course_type: "Theory", assigned_faculty: "Dr. Ramesh B", status: "Active" },
        { id: "CRS-20", course_code: "CS302", title: "Digital Logic Design", department: "CSE", semester: 3, credits: 4, course_type: "Theory", assigned_faculty: "Prof. V. Chary", status: "Active" },
        { id: "CRS-21", course_code: "MA303", title: "Discrete Mathematics", department: "CSE", semester: 3, credits: 4, course_type: "Theory", assigned_faculty: "Dr. S. Sharma", status: "Active" },
        { id: "CRS-22", course_code: "CS304", title: "Object Oriented Programming", department: "CSE", semester: 3, credits: 4, course_type: "Theory", assigned_faculty: "Mrs. Priya N", status: "Active" },
        { id: "CRS-23", course_code: "CS301L", title: "Data Structures & OOP Lab", department: "CSE", semester: 3, credits: 2, course_type: "Practical / Lab", assigned_faculty: "Dr. Ramesh B", status: "Active" },
        { id: "CRS-24", course_code: "CS401", title: "Database Management Systems", department: "CSE", semester: 4, credits: 4, course_type: "Theory", assigned_faculty: "Prof. Anita Sen", status: "Active" },
        { id: "CRS-25", course_code: "CS402", title: "Computer Organization & Arch", department: "CSE", semester: 4, credits: 4, course_type: "Theory", assigned_faculty: "Prof. V. Chary", status: "Active" },
        { id: "CRS-26", course_code: "CS403", title: "Theory of Computation", department: "CSE", semester: 4, credits: 4, course_type: "Theory", assigned_faculty: "Dr. M. Venkat", status: "Active" },
        { id: "CRS-27", course_code: "CS401L", title: "DBMS & Systems Lab", department: "CSE", semester: 4, credits: 2, course_type: "Practical / Lab", assigned_faculty: "Prof. Anita Sen", status: "Active" },
        // 3rd Year (Semester 6)
        { id: "CRS-28", course_code: "CS601", title: "Compiler Design", department: "CSE", semester: 6, credits: 4, course_type: "Theory", assigned_faculty: "Dr. M. Venkat", status: "Active" },
        { id: "CRS-29", course_code: "CS602", title: "Web Technologies", department: "CSE", semester: 6, credits: 4, course_type: "Theory", assigned_faculty: "Mrs. Priya N", status: "Active" },
        { id: "CRS-30", course_code: "CS603", title: "Artificial Intelligence", department: "CSE", semester: 6, credits: 4, course_type: "Theory", assigned_faculty: "Dr. M. Venkat", status: "Active" },
        { id: "CRS-31", course_code: "CS602L", title: "Web Technologies & AI Lab", department: "CSE", semester: 6, credits: 2, course_type: "Practical / Lab", assigned_faculty: "Mrs. Priya N", status: "Active" },
        // 4th Year (Semester 7 & 8)
        { id: "CRS-32", course_code: "CS701P", title: "Capstone Project & Seminar", department: "CSE", semester: 7, credits: 6, course_type: "Project", assigned_faculty: "Prof. Ravi Kumar", status: "Active" },
        { id: "CRS-33", course_code: "CS703", title: "Cloud Computing & DevOps", department: "CSE", semester: 7, credits: 4, course_type: "Theory", assigned_faculty: "Prof. Anita Sen", status: "Active" },
        { id: "CRS-34", course_code: "CS704E", title: "Department Elective-I", department: "CSE", semester: 7, credits: 3, course_type: "Elective", assigned_faculty: "Dr. M. Venkat", status: "Active" },
        { id: "CRS-35", course_code: "CS701L", title: "Project & Cloud Lab", department: "CSE", semester: 7, credits: 2, course_type: "Practical / Lab", assigned_faculty: "Prof. Ravi Kumar", status: "Active" },
        { id: "CRS-36", course_code: "CS801P", title: "Major Project & Viva Voce", department: "CSE", semester: 8, credits: 10, course_type: "Project", assigned_faculty: "Dr. Ramesh B", status: "Active" },
        { id: "CRS-37", course_code: "CS802I", title: "Industry Internship", department: "CSE", semester: 8, credits: 6, course_type: "Project", assigned_faculty: "Prof. Ravi Kumar", status: "Active" },
        { id: "CRS-38", course_code: "CS803", title: "Cyber Security & Blockchain", department: "CSE", semester: 8, credits: 4, course_type: "Theory", assigned_faculty: "Prof. V. Chary", status: "Active" },
        { id: "CRS-39", course_code: "CS804E", title: "Department Elective-II", department: "CSE", semester: 8, credits: 3, course_type: "Elective", assigned_faculty: "Dr. M. Venkat", status: "Active" },
      ];

      for (const c of initialCourses) {
        await db.query(
          `INSERT INTO courses (id, course_code, title, department, semester, credits, course_type, assigned_faculty, status, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
           ON CONFLICT (course_code) DO NOTHING;`,
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

/**
 * Dynamically resolves available active subjects for timetable creation/editing
 * based on Department + Academic Year + Semester (+ optional Period Type filtering).
 */
export async function getAvailableSubjectsForTimetable(
  department: string,
  year: string,
  semester?: number | string,
  periodType?: string,
): Promise<{ courseCode: string; title: string; courseType: string; assignedFaculty: string }[]> {
  await ensureCoursesTable();
  const cleanDept = (department || "CSE").trim().toUpperCase();
  const cleanYear = (year || "3rd Year").trim().toUpperCase();

  let targetSemesters: number[] = [];
  if (semester && Number(semester) > 0) {
    targetSemesters = [Number(semester)];
  } else if (cleanYear.includes("1")) {
    targetSemesters = [1, 2];
  } else if (cleanYear.includes("2")) {
    targetSemesters = [3, 4];
  } else if (cleanYear.includes("3")) {
    targetSemesters = [5, 6];
  } else if (cleanYear.includes("4")) {
    targetSemesters = [7, 8];
  } else {
    targetSemesters = [1, 2, 3, 4, 5, 6, 7, 8];
  }

  const query = `
    SELECT course_code, title, course_type, assigned_faculty
    FROM courses
    WHERE UPPER(status) = 'ACTIVE'
      AND (UPPER(department) = UPPER($1) OR $1 = 'ALL')
      AND semester = ANY($2::int[])
    ORDER BY course_code;
  `;

  try {
    const res = await db.query(query, [cleanDept, targetSemesters]);
    let courses = res.rows.map((r: any) => ({
      courseCode: r.course_code,
      title: r.title,
      courseType: r.course_type,
      assignedFaculty: r.assigned_faculty,
    }));

    if (periodType?.toUpperCase() === "LAB") {
      courses = courses.filter(
        (c: any) =>
          c.courseType.toLowerCase().includes("lab") ||
          c.courseType.toLowerCase().includes("practical") ||
          c.title.toLowerCase().includes("lab") ||
          c.title.toLowerCase().includes("practical"),
      );
    } else if (periodType?.toUpperCase() === "CLASS") {
      const theoryOnly = courses.filter(
        (c: any) =>
          !c.courseType.toLowerCase().includes("lab") &&
          !c.courseType.toLowerCase().includes("practical"),
      );
      if (theoryOnly.length > 0) courses = theoryOnly;
    }

    if (courses.length > 0) {
      return courses;
    }
  } catch (err) {
    console.warn("[DB] Error fetching subjects for timetable:", err);
  }

  // Fallback: Query distinct subjects directly from class_slots
  try {
    const slotQuery = `
      SELECT DISTINCT subject AS title, code AS course_code, faculty_name AS assigned_faculty
      FROM class_slots
      WHERE UPPER(department) = UPPER($1) OR $1 = 'ALL'
      ORDER BY code;
    `;
    const slotRes = await db.query(slotQuery, [cleanDept]);
    let slotCourses = slotRes.rows.map((r: any) => ({
      courseCode: r.course_code,
      title: r.title,
      courseType: r.title.toLowerCase().includes("lab") ? "Practical / Lab" : "Theory",
      assignedFaculty: r.assigned_faculty,
    }));

    if (periodType?.toUpperCase() === "LAB") {
      slotCourses = slotCourses.filter(
        (c: any) =>
          c.courseType.toLowerCase().includes("lab") ||
          c.title.toLowerCase().includes("lab"),
      );
    }

    if (slotCourses.length > 0) {
      return slotCourses;
    }
  } catch {
    // ignore
  }

  return [
    {
      courseCode: `${cleanDept}-301`,
      title: `${cleanDept} Core Subject`,
      courseType: "Theory",
      assignedFaculty: "Prof. Faculty A",
    },
    {
      courseCode: `${cleanDept}-302L`,
      title: `${cleanDept} Practical Lab`,
      courseType: "Practical / Lab",
      assignedFaculty: "Prof. Faculty B",
    },
  ];
}
