import { db } from "../db.server";

export type DBClassSlot = {
  id: string;
  student_code?: string;
  day_of_week: string;
  subject: string;
  subject_code: string;
  department: string;
  year: string;
  section: string;
  start_time: string; // "HH:MM" 24h
  end_time: string; // "HH:MM" 24h
  room: string;
  faculty_name: string;
  batch?: string;
};

export type TimetableSlotInput = {
  subject: string;
  subjectCode: string;
  department: string;
  year: string;
  section: string;
  room: string;
  facultyName: string;
  dayOfWeek: string | number;
  startTime: string;
  endTime: string;
};

/**
 * Returns the class slot that is currently active for a student right now.
 * Uses class_schedules table (student-linked per-student timetable).
 */
export async function getCurrentClassForStudent(studentCode: string): Promise<DBClassSlot | null> {
  const code = studentCode.trim().toUpperCase();
  if (!code) return null;

  try {
    const query = `
      SELECT
        id::text,
        student_code,
        day_of_week::text,
        subject,
        subject_code,
        start_time::text,
        end_time::text,
        room,
        faculty_name,
        batch
      FROM class_schedules
      WHERE UPPER(student_code) = $1
        AND LOWER(day_of_week) = LOWER(TRIM(TO_CHAR(NOW() AT TIME ZONE 'Asia/Kolkata', 'Day')))
        AND start_time <= (NOW() AT TIME ZONE 'Asia/Kolkata')::TIME
        AND end_time   >  (NOW() AT TIME ZONE 'Asia/Kolkata')::TIME
      LIMIT 1;
    `;
    const res = await db.query<DBClassSlot>(query, [code]);
    return res.rows[0] ?? null;
  } catch (err) {
    console.error("[DB] getCurrentClassForStudent error:", err);
    return null;
  }
}

/**
 * Returns the full weekly timetable for a student from class_schedules.
 */
export async function getStudentTimetable(studentCode: string): Promise<DBClassSlot[]> {
  const code = studentCode.trim().toUpperCase();
  if (!code) return [];

  try {
    const query = `
      SELECT
        id::text,
        student_code,
        day_of_week::text,
        subject,
        subject_code,
        start_time::text,
        end_time::text,
        room,
        faculty_name,
        batch
      FROM class_schedules
      WHERE UPPER(student_code) = $1
      ORDER BY
        CASE LOWER(day_of_week)
          WHEN 'monday'    THEN 1
          WHEN 'tuesday'   THEN 2
          WHEN 'wednesday' THEN 3
          WHEN 'thursday'  THEN 4
          WHEN 'friday'    THEN 5
          ELSE 6
        END,
        start_time;
    `;
    const res = await db.query<DBClassSlot>(query, [code]);
    return res.rows;
  } catch (err) {
    console.error("[DB] getStudentTimetable error:", err);
    return [];
  }
}

/**
 * Admin: Queries class_slots table with optional filters.
 */
export async function getAdminTimetable(filters?: {
  department?: string;
  year?: string;
  section?: string;
  dayOfWeek?: string | number;
}): Promise<DBClassSlot[]> {
  try {
    let query = `
      SELECT
        id::text,
        subject,
        code AS subject_code,
        department,
        year,
        section,
        room,
        faculty_name,
        day_of_week::text,
        start_time::text,
        end_time::text
      FROM class_slots
      WHERE 1=1
    `;
    const params: any[] = [];

    if (filters?.department) {
      params.push(filters.department);
      query += ` AND UPPER(department) = UPPER($${params.length})`;
    }
    if (filters?.year) {
      params.push(filters.year);
      query += ` AND UPPER(year) = UPPER($${params.length})`;
    }
    if (filters?.section) {
      params.push(filters.section);
      query += ` AND UPPER(section) = UPPER($${params.length})`;
    }
    if (filters?.dayOfWeek !== undefined) {
      params.push(String(filters.dayOfWeek));
      query += ` AND day_of_week::text = $${params.length}`;
    }

    query += ` ORDER BY department, year, section, start_time;`;

    const res = await db.query<DBClassSlot>(query, params);
    return res.rows;
  } catch (err) {
    console.error("[DB] getAdminTimetable error:", err);
    return [];
  }
}

/**
 * Validates a timetable slot for conflicts:
 * 1. Same class (dept + year + section) + same period
 * 2. Same room + same period
 * 3. Same faculty + same period
 */
export async function validateTimetableSlotConflicts(
  input: TimetableSlotInput,
  excludeId?: string,
): Promise<void> {
  const dayOfWeek = String(input.dayOfWeek);
  const idFilter = excludeId ? `AND id::text <> '${excludeId.replace(/'/g, "''")}'` : "";

  // Conflict 1: Same class + same period
  const conflict1 = await db.query(
    `SELECT subject FROM class_slots
     WHERE UPPER(department) = UPPER($1)
       AND UPPER(year) = UPPER($2)
       AND UPPER(section) = UPPER($3)
       AND day_of_week::text = $4
       AND start_time::time < $6::time AND end_time::time > $5::time
       ${idFilter}
     LIMIT 1;`,
    [input.department, input.year, input.section, dayOfWeek, input.startTime, input.endTime],
  );
  if (conflict1.rows.length > 0) {
    throw new Error(
      `Conflict: Class ${input.department} ${input.year} ${input.section} already has '${conflict1.rows[0].subject}' during this time slot.`,
    );
  }

  // Conflict 2: Same room + same period
  const conflict2 = await db.query(
    `SELECT subject, department, section FROM class_slots
     WHERE UPPER(room) = UPPER($1)
       AND day_of_week::text = $2
       AND start_time::time < $4::time AND end_time::time > $3::time
       ${idFilter}
     LIMIT 1;`,
    [input.room, dayOfWeek, input.startTime, input.endTime],
  );
  if (conflict2.rows.length > 0) {
    throw new Error(
      `Conflict: Room ${input.room} is already booked for ${conflict2.rows[0].department} ${conflict2.rows[0].section} during this time.`,
    );
  }

  // Conflict 3: Same faculty + same period
  const conflict3 = await db.query(
    `SELECT subject, room FROM class_slots
     WHERE UPPER(faculty_name) = UPPER($1)
       AND day_of_week::text = $2
       AND start_time::time < $4::time AND end_time::time > $3::time
       ${idFilter}
     LIMIT 1;`,
    [input.facultyName, dayOfWeek, input.startTime, input.endTime],
  );
  if (conflict3.rows.length > 0) {
    throw new Error(
      `Conflict: Faculty '${input.facultyName}' is already assigned to '${conflict3.rows[0].subject}' in ${conflict3.rows[0].room} during this time.`,
    );
  }
}

/**
 * Admin: Adds a new timetable slot with conflict validation.
 */
export async function addTimetableSlot(
  input: TimetableSlotInput,
  _actorName: string,
): Promise<DBClassSlot> {
  await validateTimetableSlotConflicts(input);

  const res = await db.query<DBClassSlot>(
    `INSERT INTO class_slots (subject, code, department, year, section, room, faculty_name, day_of_week, start_time, end_time)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::time, $10::time)
     RETURNING
       id::text,
       subject,
       code AS subject_code,
       department,
       year,
       section,
       room,
       faculty_name,
       day_of_week::text,
       start_time::text,
       end_time::text;`,
    [
      input.subject,
      input.subjectCode,
      input.department,
      input.year,
      input.section,
      input.room,
      input.facultyName,
      String(input.dayOfWeek),
      input.startTime,
      input.endTime,
    ],
  );
  if (!res.rows[0]) throw new Error("Failed to insert timetable slot.");
  return res.rows[0];
}

/**
 * Admin: Edits an existing timetable slot with conflict validation.
 */
export async function updateTimetableSlot(
  id: string,
  input: TimetableSlotInput,
  _actorName: string,
): Promise<DBClassSlot> {
  await validateTimetableSlotConflicts(input, id);

  const res = await db.query<DBClassSlot>(
    `UPDATE class_slots
     SET subject=$1, code=$2, department=$3, year=$4, section=$5,
         room=$6, faculty_name=$7, day_of_week=$8, start_time=$9::time, end_time=$10::time
     WHERE id::text = $11
     RETURNING
       id::text,
       subject,
       code AS subject_code,
       department,
       year,
       section,
       room,
       faculty_name,
       day_of_week::text,
       start_time::text,
       end_time::text;`,
    [
      input.subject,
      input.subjectCode,
      input.department,
      input.year,
      input.section,
      input.room,
      input.facultyName,
      String(input.dayOfWeek),
      input.startTime,
      input.endTime,
      id,
    ],
  );
  if (!res.rows[0]) throw new Error(`Timetable slot ${id} not found.`);
  return res.rows[0];
}

/**
 * Admin: Deletes a timetable slot by ID.
 */
export async function deleteTimetableSlot(id: string): Promise<boolean> {
  const res = await db.query(`DELETE FROM class_slots WHERE id::text = $1;`, [id]);
  return (res.rowCount ?? 0) > 0;
}
