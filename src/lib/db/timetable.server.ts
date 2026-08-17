import { db } from "../db.server";
import { getStudentByRollNo, type DBStudent } from "./students.server";

// ─── Types ──────────────────────────────────────────────────────────────────

export type DBClassSlot = {
  id: string;
  subject: string;
  code: string;
  department: string;
  year: string;
  section: string;
  room: string;
  faculty_name: string;
  day_of_week: number;
  day_name?: string;
  start_time: string; // "HH:MM" or "HH:MM:SS"
  end_time: string; // "HH:MM" or "HH:MM:SS"
  created_at?: string;
  // Legacy alias fields
  subject_code?: string;
  student_code?: string;
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
  startTime: string; // e.g. "09:00" or "09:00:00" or "09:00 AM"
  endTime: string; // e.g. "10:00" or "10:00:00" or "10:00 AM"
};

export type CurrentClassResolution = {
  student: DBStudent | null;
  isCurrentlyInScheduledClass: boolean;
  currentClass: {
    id: string;
    subject: string;
    subjectCode: string;
    department: string;
    year: string;
    section: string;
    facultyName: string;
    room: string;
    dayOfWeek: number;
    dayName: string;
    startTime: string;
    endTime: string;
  } | null;
  status:
    | "IN_CLASS"
    | "FREE_PERIOD"
    | "NO_TIMETABLE"
    | "INACTIVE_STUDENT"
    | "STUDENT_NOT_FOUND";
  // Backward compatibility alias properties
  id?: string;
  subject?: string;
  subject_code?: string;
  faculty_name?: string;
  room?: string;
  start_time?: string;
  end_time?: string;
  day_of_week?: string;
  department?: string;
  year?: string;
  section?: string;
};

// ─── Normalization Helpers ──────────────────────────────────────────────────

const DAY_NAME_TO_INT: Record<string, number> = {
  mon: 1,
  monday: 1,
  tue: 2,
  tuesday: 2,
  wed: 3,
  wednesday: 3,
  thu: 4,
  thursday: 4,
  fri: 5,
  friday: 5,
  sat: 6,
  saturday: 6,
  sun: 7,
  sunday: 7,
};

const INT_TO_DAY_NAME: Record<number, string> = {
  1: "Monday",
  2: "Tuesday",
  3: "Wednesday",
  4: "Thursday",
  5: "Friday",
  6: "Saturday",
  7: "Sunday",
};

export function normalizeDayOfWeek(day: string | number): number {
  if (typeof day === "number") {
    if (day >= 1 && day <= 7) return day;
    if (day === 0) return 7;
    return 1;
  }
  const clean = day.trim().toLowerCase();
  const parsed = parseInt(clean, 10);
  if (!isNaN(parsed) && parsed >= 1 && parsed <= 7) return parsed;
  return DAY_NAME_TO_INT[clean] ?? 1;
}

export function dayOfWeekToString(day: string | number): string {
  const intVal = normalizeDayOfWeek(day);
  return INT_TO_DAY_NAME[intVal] ?? "Monday";
}

/**
 * Standardizes 12h/24h time strings to standard 24h "HH:MM:SS".
 */
export function normalizeTimeTo24h(tStr: string): string {
  if (!tStr) return "00:00:00";
  const clean = tStr.trim().toUpperCase();
  const isPM = clean.includes("PM");
  const isAM = clean.includes("AM");

  const rawParts = clean.replace(/(AM|PM)/g, "").trim().split(":");
  let hours = parseInt(rawParts[0] || "0", 10);
  const minutes = parseInt(rawParts[1] || "0", 10);
  const seconds = parseInt(rawParts[2] || "0", 10);

  if (isPM && hours < 12) hours += 12;
  if (isAM && hours === 12) hours = 0;

  const hh = String(hours).padStart(2, "0");
  const mm = String(minutes).padStart(2, "0");
  const ss = String(seconds).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

export function normalizeYear(y: string): string {
  const clean = (y || "").trim().toUpperCase();
  if (clean.startsWith("1")) return "1st Year";
  if (clean.startsWith("2")) return "2nd Year";
  if (clean.startsWith("3")) return "3rd Year";
  if (clean.startsWith("4")) return "4th Year";
  return clean || "3rd Year";
}

export function normalizeSection(s: string): string {
  const clean = (s || "").trim().toUpperCase();
  if (clean.includes("A") || clean === "A") return "Section A";
  if (clean.includes("B") || clean === "B") return "Section B";
  if (clean.includes("C") || clean === "C") return "Section C";
  if (clean.includes("D") || clean === "D") return "Section D";
  return clean || "Section A";
}

// ─── Conflict Detection Engine ──────────────────────────────────────────────

/**
 * 3-Way Atomic Conflict Validation Engine:
 * A. CLASS COLLISION: Same Department + Year + Section on same day with overlapping time.
 * B. ROOM COLLISION: Same Room on same day with overlapping time.
 * C. FACULTY COLLISION: Same Faculty on same day with overlapping time.
 *
 * Interval Intersection Condition:
 * existing_start < new_end AND existing_end > new_start
 */
export async function validateTimetableSlotConflicts(
  input: TimetableSlotInput,
  excludeId?: string | number,
): Promise<void> {
  const subject = input.subject?.trim();
  const subjectCode = input.subjectCode?.trim();
  const department = input.department?.trim().toUpperCase();
  const year = normalizeYear(input.year);
  const section = normalizeSection(input.section);
  const room = input.room?.trim();
  const facultyName = input.facultyName?.trim();
  const dayOfWeek = normalizeDayOfWeek(input.dayOfWeek);
  const startTime = normalizeTimeTo24h(input.startTime);
  const endTime = normalizeTimeTo24h(input.endTime);

  // Field validations
  if (!subject) throw new Error("Subject name is required.");
  if (!subjectCode) throw new Error("Subject code is required.");
  if (!department) throw new Error("Department is required.");
  if (!room) throw new Error("Classroom/Lab room is required.");
  if (!facultyName) throw new Error("Faculty name is required.");
  if (dayOfWeek < 1 || dayOfWeek > 6) {
    throw new Error("Day of week must be between Monday and Saturday.");
  }
  if (startTime >= endTime) {
    throw new Error(
      `Invalid time range: Start time (${startTime.slice(0, 5)}) must be strictly earlier than End time (${endTime.slice(0, 5)}).`,
    );
  }

  // Check if faculty member is inactive
  const facultyStatusCheck = await db.query(
    "SELECT full_name, status FROM profiles WHERE (UPPER(full_name) = UPPER($1) OR UPPER(staff_code) = UPPER($1)) AND UPPER(status) = 'INACTIVE' LIMIT 1;",
    [facultyName],
  );
  if (facultyStatusCheck.rows.length > 0) {
    throw new Error(
      `Faculty member '${facultyName}' is currently Inactive and cannot be assigned to timetable slots.`,
    );
  }

  const idCondition = excludeId ? `AND id <> $7` : "";
  const baseParams = [
    department,
    year,
    section,
    dayOfWeek,
    startTime,
    endTime,
  ];
  if (excludeId) baseParams.push(String(excludeId));

  // Conflict 1: Class Collision (Same dept + year + section + day + overlapping time)
  const classConflictQuery = `
    SELECT subject, code, to_char(start_time, 'HH24:MI') as st, to_char(end_time, 'HH24:MI') as et
    FROM class_slots
    WHERE UPPER(department) = UPPER($1)
      AND (UPPER(year) = UPPER($2) OR year = $2 OR UPPER(year) = UPPER(REPLACE($2, ' Year', '')))
      AND (UPPER(section) = UPPER($3) OR section = $3 OR UPPER(section) = UPPER(REPLACE($3, 'Section ', '')))
      AND day_of_week = $4
      AND start_time < $6::time AND end_time > $5::time
      ${idCondition}
    LIMIT 1;
  `;
  const classConflictRes = await db.query(classConflictQuery, baseParams);
  if (classConflictRes.rows.length > 0) {
    const c = classConflictRes.rows[0];
    throw new Error(
      `Conflict (Class Collision): Class ${department} ${year} ${section} already has '${c.subject} (${c.code})' scheduled from ${c.st} to ${c.et} on ${dayOfWeekToString(dayOfWeek)}.`,
    );
  }

  // Conflict 2: Room Collision (Same room + day + overlapping time)
  const roomParams = [room, dayOfWeek, startTime, endTime];
  if (excludeId) roomParams.push(String(excludeId));
  const roomConflictQuery = `
    SELECT subject, department, year, section, to_char(start_time, 'HH24:MI') as st, to_char(end_time, 'HH24:MI') as et
    FROM class_slots
    WHERE UPPER(room) = UPPER($1)
      AND day_of_week = $2
      AND start_time < $4::time AND end_time > $3::time
      ${excludeId ? "AND id <> $5" : ""}
    LIMIT 1;
  `;
  const roomConflictRes = await db.query(roomConflictQuery, roomParams);
  if (roomConflictRes.rows.length > 0) {
    const r = roomConflictRes.rows[0];
    throw new Error(
      `Conflict (Room Collision): Room '${room}' is already occupied by ${r.department} ${r.year} (${r.section}) for '${r.subject}' from ${r.st} to ${r.et} on ${dayOfWeekToString(dayOfWeek)}.`,
    );
  }

  // Conflict 3: Faculty Collision (Same faculty + day + overlapping time)
  const facParams = [facultyName, dayOfWeek, startTime, endTime];
  if (excludeId) facParams.push(String(excludeId));
  const facConflictQuery = `
    SELECT subject, room, department, to_char(start_time, 'HH24:MI') as st, to_char(end_time, 'HH24:MI') as et
    FROM class_slots
    WHERE UPPER(faculty_name) = UPPER($1)
      AND day_of_week = $2
      AND start_time < $4::time AND end_time > $3::time
      ${excludeId ? "AND id <> $5" : ""}
    LIMIT 1;
  `;
  const facConflictRes = await db.query(facConflictQuery, facParams);
  if (facConflictRes.rows.length > 0) {
    const f = facConflictRes.rows[0];
    throw new Error(
      `Conflict (Faculty Double-Booking): Faculty '${facultyName}' is already teaching '${f.subject}' in ${f.room} from ${f.st} to ${f.et} on ${dayOfWeekToString(dayOfWeek)}.`,
    );
  }
}

// ─── Current Class Resolution Engine ────────────────────────────────────────

/**
 * Institutional Source of Truth: Determines the active class for a student
 * in India (Asia/Kolkata) timezone.
 *
 * Boundary condition:
 * start_time <= current_time AND end_time > current_time
 */
export async function getCurrentClassForStudent(
  studentCode: string,
  testOverride?: { dayOfWeek?: number; time?: string },
): Promise<CurrentClassResolution> {
  const cleanCode = studentCode.trim().toUpperCase();
  if (!cleanCode) {
    return {
      student: null,
      isCurrentlyInScheduledClass: false,
      currentClass: null,
      status: "STUDENT_NOT_FOUND",
    };
  }

  try {
    // 1. Resolve student record
    const student = await getStudentByRollNo(cleanCode);
    if (!student) {
      return {
        student: null,
        isCurrentlyInScheduledClass: false,
        currentClass: null,
        status: "STUDENT_NOT_FOUND",
      };
    }

    if (student.status && student.status.toLowerCase() !== "active") {
      return {
        student,
        isCurrentlyInScheduledClass: false,
        currentClass: null,
        status: "INACTIVE_STUDENT",
      };
    }

    // 2. Resolve IST day and time
    let currentDow: number;
    let currentTime24h: string;

    if (testOverride?.dayOfWeek !== undefined && testOverride?.time) {
      currentDow = normalizeDayOfWeek(testOverride.dayOfWeek);
      currentTime24h = normalizeTimeTo24h(testOverride.time);
    } else {
      const istTimeRes = await db.query<{
        dow: string;
        current_time: string;
      }>(`
        SELECT
          EXTRACT(ISODOW FROM (NOW() AT TIME ZONE 'Asia/Kolkata'))::text AS dow,
          TO_CHAR((NOW() AT TIME ZONE 'Asia/Kolkata')::TIME, 'HH24:MI:SS') AS current_time;
      `);
      currentDow = parseInt(istTimeRes.rows[0]?.dow || "1", 10);
      currentTime24h = istTimeRes.rows[0]?.current_time || "10:00:00";
    }

    const normYear = normalizeYear(student.year || "3rd Year");
    const normSection = normalizeSection(student.section || "Section A");

    // 3. Query authoritative class_slots for active period
    const activeSlotQuery = `
      SELECT
        id::text,
        subject,
        code AS subject_code,
        department,
        year,
        section,
        room,
        faculty_name,
        day_of_week,
        TO_CHAR(start_time, 'HH24:MI') AS start_time,
        TO_CHAR(end_time, 'HH24:MI') AS end_time
      FROM class_slots
      WHERE UPPER(department) = UPPER($1)
        AND (UPPER(year) = UPPER($2) OR year = $2 OR UPPER(year) = UPPER(REPLACE($2, ' Year', '')))
        AND (UPPER(section) = UPPER($3) OR section = $3 OR UPPER(section) = UPPER(REPLACE($3, 'Section ', '')))
        AND day_of_week = $4
        AND start_time <= $5::time AND end_time > $5::time
      LIMIT 1;
    `;

    const activeRes = await db.query(activeSlotQuery, [
      student.department,
      normYear,
      normSection,
      currentDow,
      currentTime24h,
    ]);

    if (activeRes.rows.length > 0) {
      const slot = activeRes.rows[0];
      const classObj = {
        id: slot.id,
        subject: slot.subject,
        subjectCode: slot.subject_code,
        department: slot.department,
        year: slot.year,
        section: slot.section,
        facultyName: slot.faculty_name,
        room: slot.room,
        dayOfWeek: slot.day_of_week,
        dayName: dayOfWeekToString(slot.day_of_week),
        startTime: slot.start_time,
        endTime: slot.end_time,
      };

      return {
        student,
        isCurrentlyInScheduledClass: true,
        currentClass: classObj,
        status: "IN_CLASS",
        // Backward compatibility
        id: slot.id,
        subject: slot.subject,
        subject_code: slot.subject_code,
        faculty_name: slot.faculty_name,
        room: slot.room,
        start_time: slot.start_time,
        end_time: slot.end_time,
        day_of_week: dayOfWeekToString(slot.day_of_week),
        department: slot.department,
        year: slot.year,
        section: slot.section,
      };
    }

    // 4. Check if student has other classes scheduled today
    const anyClassTodayQuery = `
      SELECT COUNT(*)::int AS count
      FROM class_slots
      WHERE UPPER(department) = UPPER($1)
        AND (UPPER(year) = UPPER($2) OR year = $2 OR UPPER(year) = UPPER(REPLACE($2, ' Year', '')))
        AND (UPPER(section) = UPPER($3) OR section = $3 OR UPPER(section) = UPPER(REPLACE($3, 'Section ', '')))
        AND day_of_week = $4;
    `;
    const todayCountRes = await db.query<{ count: number }>(anyClassTodayQuery, [
      student.department,
      normYear,
      normSection,
      currentDow,
    ]);
    const hasClassesToday = (todayCountRes.rows[0]?.count ?? 0) > 0;

    return {
      student,
      isCurrentlyInScheduledClass: false,
      currentClass: null,
      status: hasClassesToday ? "FREE_PERIOD" : "NO_TIMETABLE",
    };
  } catch (err) {
    console.error("[DB] getCurrentClassForStudent error:", err);
    return {
      student: null,
      isCurrentlyInScheduledClass: false,
      currentClass: null,
      status: "NO_TIMETABLE",
    };
  }
}

// ─── Student Dynamic Timetable ──────────────────────────────────────────────

/**
 * Retrieves the full weekly timetable for a student directly from authoritative class_slots.
 */
export async function getStudentTimetable(studentCode: string): Promise<DBClassSlot[]> {
  const code = studentCode.trim().toUpperCase();
  if (!code) return [];

  try {
    const student = await getStudentByRollNo(code);
    if (!student) return [];

    const normYear = normalizeYear(student.year || "3rd Year");
    const normSection = normalizeSection(student.section || "Section A");

    const query = `
      SELECT
        id::text,
        subject,
        code AS subject_code,
        code,
        department,
        year,
        section,
        room,
        faculty_name,
        day_of_week,
        TO_CHAR(start_time, 'HH24:MI') AS start_time,
        TO_CHAR(end_time, 'HH24:MI') AS end_time,
        created_at::text AS created_at
      FROM class_slots
      WHERE UPPER(department) = UPPER($1)
        AND (UPPER(year) = UPPER($2) OR year = $2 OR UPPER(year) = UPPER(REPLACE($2, ' Year', '')))
        AND (UPPER(section) = UPPER($3) OR section = $3 OR UPPER(section) = UPPER(REPLACE($3, 'Section ', '')))
      ORDER BY day_of_week, start_time;
    `;
    const res = await db.query<DBClassSlot>(query, [
      student.department,
      normYear,
      normSection,
    ]);
    return res.rows.map((r) => ({
      ...r,
      day_name: dayOfWeekToString(r.day_of_week),
    }));
  } catch (err) {
    console.error("[DB] getStudentTimetable error:", err);
    return [];
  }
}

// ─── Admin CRUD Functions ───────────────────────────────────────────────────

export async function getAdminTimetable(filters?: {
  department?: string;
  year?: string;
  section?: string;
  dayOfWeek?: string | number;
  facultyName?: string;
  room?: string;
  search?: string;
}): Promise<DBClassSlot[]> {
  try {
    let query = `
      SELECT
        id::text,
        subject,
        code AS subject_code,
        code,
        department,
        year,
        section,
        room,
        faculty_name,
        day_of_week,
        TO_CHAR(start_time, 'HH24:MI') AS start_time,
        TO_CHAR(end_time, 'HH24:MI') AS end_time,
        created_at::text AS created_at
      FROM class_slots
      WHERE 1=1
    `;
    const params: any[] = [];

    if (filters?.department && filters.department !== "ALL") {
      params.push(filters.department);
      query += ` AND UPPER(department) = UPPER($${params.length})`;
    }
    if (filters?.year && filters.year !== "ALL") {
      params.push(filters.year);
      query += ` AND (UPPER(year) = UPPER($${params.length}) OR year = $${params.length})`;
    }
    if (filters?.section && filters.section !== "ALL") {
      params.push(filters.section);
      query += ` AND (UPPER(section) = UPPER($${params.length}) OR section = $${params.length})`;
    }
    if (filters?.dayOfWeek !== undefined && String(filters.dayOfWeek) !== "ALL") {
      const dow = normalizeDayOfWeek(filters.dayOfWeek);
      params.push(dow);
      query += ` AND day_of_week = $${params.length}`;
    }
    if (filters?.facultyName && filters.facultyName.trim()) {
      params.push(`%${filters.facultyName.trim()}%`);
      query += ` AND faculty_name ILIKE $${params.length}`;
    }
    if (filters?.room && filters.room.trim()) {
      params.push(`%${filters.room.trim()}%`);
      query += ` AND room ILIKE $${params.length}`;
    }
    if (filters?.search && filters.search.trim()) {
      params.push(`%${filters.search.trim()}%`);
      query += ` AND (subject ILIKE $${params.length} OR code ILIKE $${params.length} OR faculty_name ILIKE $${params.length} OR room ILIKE $${params.length})`;
    }

    query += ` ORDER BY day_of_week, start_time, department, section;`;

    const res = await db.query<DBClassSlot>(query, params);
    return res.rows.map((r) => ({
      ...r,
      day_name: dayOfWeekToString(r.day_of_week),
    }));
  } catch (err) {
    console.error("[DB] getAdminTimetable error:", err);
    return [];
  }
}

export async function addTimetableSlot(
  input: TimetableSlotInput,
  actorName: string,
): Promise<DBClassSlot> {
  await validateTimetableSlotConflicts(input);

  const subject = input.subject.trim();
  const subjectCode = input.subjectCode.trim();
  const department = input.department.trim().toUpperCase();
  const year = normalizeYear(input.year);
  const section = normalizeSection(input.section);
  const room = input.room.trim();
  const facultyName = input.facultyName.trim();
  const dayOfWeek = normalizeDayOfWeek(input.dayOfWeek);
  const startTime = normalizeTimeTo24h(input.startTime);
  const endTime = normalizeTimeTo24h(input.endTime);

  const res = await db.query<DBClassSlot>(
    `INSERT INTO class_slots (
      subject, code, department, year, section, room, faculty_name, day_of_week, start_time, end_time
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::time, $10::time)
    RETURNING
      id::text,
      subject,
      code AS subject_code,
      code,
      department,
      year,
      section,
      room,
      faculty_name,
      day_of_week,
      TO_CHAR(start_time, 'HH24:MI') AS start_time,
      TO_CHAR(end_time, 'HH24:MI') AS end_time,
      created_at::text AS created_at;`,
    [
      subject,
      subjectCode,
      department,
      year,
      section,
      room,
      facultyName,
      dayOfWeek,
      startTime,
      endTime,
    ],
  );

  const created = res.rows[0];
  if (!created) throw new Error("Failed to create timetable slot.");

  // Log atomic audit log
  await db.query(
    `INSERT INTO audit_logs (actor, actor_role, action, target, target_id, metadata)
     VALUES ($1, 'admin', 'timetable_slot_created', $2, $3, $4);`,
    [
      actorName,
      `${department} ${year} ${section}`,
      created.id,
      JSON.stringify({
        subject,
        subjectCode,
        room,
        facultyName,
        dayOfWeek,
        startTime,
        endTime,
      }),
    ],
  );

  return {
    ...created,
    day_name: dayOfWeekToString(created.day_of_week),
  };
}

export async function updateTimetableSlot(
  id: string,
  input: TimetableSlotInput,
  actorName: string,
): Promise<DBClassSlot> {
  const cleanId = id.trim();
  await validateTimetableSlotConflicts(input, cleanId);

  const subject = input.subject.trim();
  const subjectCode = input.subjectCode.trim();
  const department = input.department.trim().toUpperCase();
  const year = normalizeYear(input.year);
  const section = normalizeSection(input.section);
  const room = input.room.trim();
  const facultyName = input.facultyName.trim();
  const dayOfWeek = normalizeDayOfWeek(input.dayOfWeek);
  const startTime = normalizeTimeTo24h(input.startTime);
  const endTime = normalizeTimeTo24h(input.endTime);

  const res = await db.query<DBClassSlot>(
    `UPDATE class_slots
     SET subject=$1, code=$2, department=$3, year=$4, section=$5,
         room=$6, faculty_name=$7, day_of_week=$8, start_time=$9::time, end_time=$10::time
     WHERE id::text = $11
     RETURNING
       id::text,
       subject,
       code AS subject_code,
       code,
       department,
       year,
       section,
       room,
       faculty_name,
       day_of_week,
       TO_CHAR(start_time, 'HH24:MI') AS start_time,
       TO_CHAR(end_time, 'HH24:MI') AS end_time,
       created_at::text AS created_at;`,
    [
      subject,
      subjectCode,
      department,
      year,
      section,
      room,
      facultyName,
      dayOfWeek,
      startTime,
      endTime,
      cleanId,
    ],
  );

  const updated = res.rows[0];
  if (!updated) throw new Error(`Timetable slot ${cleanId} not found.`);

  // Log atomic audit log
  await db.query(
    `INSERT INTO audit_logs (actor, actor_role, action, target, target_id, metadata)
     VALUES ($1, 'admin', 'timetable_slot_updated', $2, $3, $4);`,
    [
      actorName,
      `${department} ${year} ${section}`,
      cleanId,
      JSON.stringify({
        subject,
        subjectCode,
        room,
        facultyName,
        dayOfWeek,
        startTime,
        endTime,
      }),
    ],
  );

  return {
    ...updated,
    day_name: dayOfWeekToString(updated.day_of_week),
  };
}

export async function deleteTimetableSlot(
  id: string,
  actorName: string,
): Promise<boolean> {
  const cleanId = id.trim();

  // Lookup before delete for audit logging
  const checkRes = await db.query(
    `SELECT subject, code, department, year, section, room, faculty_name
     FROM class_slots
     WHERE id::text = $1`,
    [cleanId],
  );

  const res = await db.query(`DELETE FROM class_slots WHERE id::text = $1;`, [cleanId]);
  const deleted = (res.rowCount ?? 0) > 0;

  if (deleted && checkRes.rows[0]) {
    const slot = checkRes.rows[0];
    await db.query(
      `INSERT INTO audit_logs (actor, actor_role, action, target, target_id, metadata)
       VALUES ($1, 'admin', 'timetable_slot_deleted', $2, $3, $4);`,
      [
        actorName,
        `${slot.department} ${slot.year} ${slot.section}`,
        cleanId,
        JSON.stringify(slot),
      ],
    );
  }

  return deleted;
}
