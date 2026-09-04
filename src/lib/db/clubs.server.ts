import { db } from "../db.server";
import type { ServerSession } from "../session.server";
import { createNotificationServer } from "./notifications.server";

export type ClubStatus = "ACTIVE" | "INACTIVE";
export type LocationType = "INSIDE_CAMPUS" | "OUTSIDE_CAMPUS";
export type EventType =
  | "WORKSHOP"
  | "COMPETITION"
  | "CAMP"
  | "MEETING"
  | "SPORTS_EVENT"
  | "CULTURAL_EVENT"
  | "OTHER";
export type EventStatus = "SCHEDULED" | "CANCELLED" | "COMPLETED";
export type PermissionStatus = "APPROVED" | "CANCELLED" | "EXPIRED";

export type DBClub = {
  club_id: string;
  name: string;
  club_type: string;
  description: string | null;
  location: string | null;
  status: ClubStatus;
  created_at: string;
  updated_at: string;
};

export type DBClubCoordinator = {
  id: string;
  club_id: string;
  faculty_id: string;
  assigned_at: string;
  status: string;
  faculty_name?: string;
  faculty_email?: string;
  staff_code?: string;
  department?: string;
};

export type DBClubMember = {
  id: string;
  club_id: string;
  student_id: string;
  joined_at: string;
  status: string;
  student_name?: string;
  department?: string;
  year?: string;
  section?: string;
};

export type DBClubEvent = {
  event_id: string;
  club_id: string;
  event_name: string;
  description: string | null;
  event_date: string;
  start_time: string;
  end_time: string;
  location_type: LocationType;
  location: string;
  event_type: EventType;
  coordinator_id: string;
  status: EventStatus;
  created_at: string;
  updated_at: string;
  club_name?: string;
  coordinator_name?: string;
};

export type DBEventParticipant = {
  id: string;
  permission_code: string;
  event_id: string;
  student_code: string;
  permission_status: PermissionStatus;
  exit_at: string | null;
  entry_at: string | null;
  verified_by: string | null;
  created_at: string;
  student_name?: string;
  department?: string;
  year?: string;
  section?: string;
  event_name?: string;
  event_date?: string;
  start_time?: string;
  end_time?: string;
  location_type?: LocationType;
  location?: string;
  club_name?: string;
  coordinator_name?: string;
};

let clubSchemaEnsured = false;

/**
 * Ensures all club and event management tables, columns, indexes, and constraints exist.
 */
export async function ensureClubSchema(): Promise<void> {
  if (clubSchemaEnsured) return;
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS clubs (
        club_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL UNIQUE,
        club_type TEXT NOT NULL,
        description TEXT,
        location TEXT,
        status TEXT NOT NULL DEFAULT 'ACTIVE',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS club_coordinators (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        club_id UUID NOT NULL REFERENCES clubs(club_id) ON DELETE CASCADE,
        faculty_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        status TEXT NOT NULL DEFAULT 'ACTIVE',
        UNIQUE(club_id, faculty_id)
      );
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS club_members (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        club_id UUID NOT NULL REFERENCES clubs(club_id) ON DELETE CASCADE,
        student_id TEXT NOT NULL REFERENCES students(student_code) ON DELETE CASCADE,
        joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        status TEXT NOT NULL DEFAULT 'ACTIVE',
        UNIQUE(club_id, student_id)
      );
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS club_events (
        event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        club_id UUID NOT NULL REFERENCES clubs(club_id) ON DELETE CASCADE,
        event_name TEXT NOT NULL,
        description TEXT,
        event_date DATE NOT NULL,
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        location_type TEXT NOT NULL,
        location TEXT NOT NULL,
        event_type TEXT NOT NULL,
        coordinator_id UUID NOT NULL REFERENCES profiles(id),
        status TEXT NOT NULL DEFAULT 'SCHEDULED',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS event_participants (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        permission_code TEXT NOT NULL UNIQUE,
        event_id UUID NOT NULL REFERENCES club_events(event_id) ON DELETE CASCADE,
        student_code TEXT NOT NULL REFERENCES students(student_code) ON DELETE CASCADE,
        permission_status TEXT NOT NULL DEFAULT 'APPROVED',
        exit_at TIMESTAMPTZ,
        entry_at TIMESTAMPTZ,
        verified_by TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(event_id, student_code)
      );
    `);

    await db.query(`CREATE INDEX IF NOT EXISTS idx_club_coordinators_faculty ON club_coordinators(faculty_id);`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_club_members_student ON club_members(student_id);`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_club_events_club_date ON club_events(club_id, event_date);`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_event_participants_student ON event_participants(student_code);`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_event_participants_code ON event_participants(permission_code);`);

    clubSchemaEnsured = true;
  } catch (err) {
    console.warn("[Club DB Notice] Error ensuring club schema:", err);
  }
}

// Initialize schema on load
ensureClubSchema().catch(() => {});

// ==========================================
// PHASE 1: CLUB CORE MODEL & CRUD
// ==========================================

export async function createClub(data: {
  name: string;
  club_type: string;
  description?: string | null;
  location?: string | null;
  status?: ClubStatus;
}): Promise<DBClub> {
  await ensureClubSchema();
  const cleanName = data.name.trim();
  if (!cleanName) throw new Error("Club name is required.");

  const res = await db.query<DBClub>(
    `INSERT INTO clubs (name, club_type, description, location, status)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING club_id, name, club_type, description, location, status, created_at::text, updated_at::text;`,
    [
      cleanName,
      data.club_type.trim() || "OTHER",
      data.description?.trim() || null,
      data.location?.trim() || null,
      data.status || "ACTIVE",
    ]
  );
  if (!res.rows[0]) throw new Error("Failed to create club.");
  return res.rows[0];
}

export async function updateClub(
  clubId: string,
  data: {
    name?: string;
    club_type?: string;
    description?: string | null;
    location?: string | null;
    status?: ClubStatus;
  }
): Promise<DBClub> {
  await ensureClubSchema();
  const existing = await getClubById(clubId);
  if (!existing) throw new Error(`Club with ID "${clubId}" not found.`);

  const name = data.name !== undefined ? data.name.trim() : existing.name;
  const club_type = data.club_type !== undefined ? data.club_type.trim() : existing.club_type;
  const description = data.description !== undefined ? data.description : existing.description;
  const location = data.location !== undefined ? data.location : existing.location;
  const status = data.status !== undefined ? data.status : existing.status;

  const res = await db.query<DBClub>(
    `UPDATE clubs
     SET name = $1, club_type = $2, description = $3, location = $4, status = $5, updated_at = NOW()
     WHERE club_id = $6
     RETURNING club_id, name, club_type, description, location, status, created_at::text, updated_at::text;`,
    [name, club_type, description, location, status, clubId]
  );
  if (!res.rows[0]) throw new Error("Failed to update club.");
  return res.rows[0];
}

export async function deactivateClub(clubId: string): Promise<DBClub> {
  return updateClub(clubId, { status: "INACTIVE" });
}

export async function activateClub(clubId: string): Promise<DBClub> {
  return updateClub(clubId, { status: "ACTIVE" });
}

export async function getClubById(clubId: string): Promise<DBClub | null> {
  await ensureClubSchema();
  const res = await db.query<DBClub>(
    `SELECT club_id, name, club_type, description, location, status, created_at::text, updated_at::text
     FROM clubs WHERE club_id = $1 LIMIT 1;`,
    [clubId]
  );
  return res.rows[0] || null;
}

export async function getAllClubs(): Promise<(DBClub & { member_count: number; coordinators: DBClubCoordinator[] })[]> {
  await ensureClubSchema();
  const clubsRes = await db.query<DBClub>(
    `SELECT club_id, name, club_type, description, location, status, created_at::text, updated_at::text
     FROM clubs ORDER BY name ASC;`
  );

  const result = [];
  for (const club of clubsRes.rows) {
    const memberCountRes = await db.query<{ count: string }>(
      `SELECT COUNT(*) as count FROM club_members WHERE club_id = $1 AND status = 'ACTIVE';`,
      [club.club_id]
    );
    const member_count = parseInt(memberCountRes.rows[0]?.count || "0", 10);

    const coordinators = await getClubCoordinators(club.club_id);

    result.push({
      ...club,
      member_count,
      coordinators,
    });
  }
  return result;
}

// ==========================================
// PHASE 1: COORDINATOR ASSIGNMENT
// ==========================================

export async function assignClubCoordinator(clubId: string, facultyId: string): Promise<DBClubCoordinator> {
  await ensureClubSchema();

  // Validate club
  const club = await getClubById(clubId);
  if (!club) throw new Error(`Club ID "${clubId}" does not exist.`);
  if (club.status !== "ACTIVE") throw new Error(`Cannot assign coordinator to inactive club "${club.name}".`);

  // Validate faculty profile exists and is faculty
  const facultyRes = await db.query(
    `SELECT p.id, p.full_name, p.email, p.staff_code, p.department, r.role
     FROM profiles p
     LEFT JOIN user_roles r ON r.user_id = p.id
     WHERE p.id = $1 LIMIT 1;`,
    [facultyId]
  );

  if (facultyRes.rows.length === 0) {
    throw new Error(`Faculty member with ID "${facultyId}" does not exist.`);
  }

  const faculty = facultyRes.rows[0];
  if (faculty.role && faculty.role.toLowerCase() !== "faculty" && faculty.role.toLowerCase() !== "admin") {
    throw new Error(`User "${faculty.full_name}" does not have FACULTY role.`);
  }

  // Prevent duplicate coordinator assignment
  const existing = await db.query(
    `SELECT id FROM club_coordinators WHERE club_id = $1 AND faculty_id = $2;`,
    [clubId, facultyId]
  );
  if (existing.rows.length > 0) {
    throw new Error(`Faculty member "${faculty.full_name}" is already assigned as coordinator for club "${club.name}".`);
  }

  const res = await db.query<DBClubCoordinator>(
    `INSERT INTO club_coordinators (club_id, faculty_id, status)
     VALUES ($1, $2, 'ACTIVE')
     RETURNING id, club_id, faculty_id, assigned_at::text, status;`,
    [clubId, facultyId]
  );

  const row = res.rows[0];
  if (!row) throw new Error("Failed to assign coordinator.");

  return {
    ...row,
    faculty_name: faculty.full_name,
    faculty_email: faculty.email,
    staff_code: faculty.staff_code,
    department: faculty.department,
  };
}

export async function removeClubCoordinator(clubId: string, facultyId: string): Promise<boolean> {
  await ensureClubSchema();
  const res = await db.query(
    `DELETE FROM club_coordinators WHERE club_id = $1 AND faculty_id = $2;`,
    [clubId, facultyId]
  );
  return (res.rowCount || 0) > 0;
}

export async function getClubCoordinators(clubId: string): Promise<DBClubCoordinator[]> {
  await ensureClubSchema();
  const res = await db.query<DBClubCoordinator>(
    `SELECT c.id, c.club_id, c.faculty_id, c.assigned_at::text, c.status,
            p.full_name AS faculty_name, p.email AS faculty_email, p.staff_code, p.department
     FROM club_coordinators c
     JOIN profiles p ON p.id = c.faculty_id
     WHERE c.club_id = $1 AND c.status = 'ACTIVE'
     ORDER BY p.full_name ASC;`,
    [clubId]
  );
  return res.rows;
}

export async function getCoordinatedClubsForFaculty(facultyId: string): Promise<DBClub[]> {
  await ensureClubSchema();
  const res = await db.query<DBClub>(
    `SELECT cl.club_id, cl.name, cl.club_type, cl.description, cl.location, cl.status,
            cl.created_at::text, cl.updated_at::text
     FROM club_coordinators cc
     JOIN clubs cl ON cl.club_id = cc.club_id
     WHERE cc.faculty_id = $1 AND cc.status = 'ACTIVE' AND cl.status = 'ACTIVE'
     ORDER BY cl.name ASC;`,
    [facultyId]
  );
  return res.rows;
}

export async function isFacultyClubCoordinator(facultyId: string, clubId: string): Promise<boolean> {
  await ensureClubSchema();
  const res = await db.query(
    `SELECT 1 FROM club_coordinators cc
     JOIN clubs cl ON cl.club_id = cc.club_id
     WHERE cc.faculty_id = $1 AND cc.club_id = $2 AND cc.status = 'ACTIVE' AND cl.status = 'ACTIVE'
     LIMIT 1;`,
    [facultyId, clubId]
  );
  return res.rows.length > 0;
}

// ==========================================
// PHASE 1: CLUB MEMBER MANAGEMENT
// ==========================================

export async function addClubMember(clubId: string, studentCode: string): Promise<DBClubMember> {
  await ensureClubSchema();
  const cleanCode = studentCode.trim().toUpperCase();

  // Validate club
  const club = await getClubById(clubId);
  if (!club) throw new Error(`Club ID "${clubId}" does not exist.`);
  if (club.status !== "ACTIVE") throw new Error(`Cannot add member to inactive club "${club.name}".`);

  // Validate student exists
  const studentRes = await db.query(
    `SELECT student_code, name, department, year, section FROM students WHERE UPPER(student_code) = $1 LIMIT 1;`,
    [cleanCode]
  );
  if (studentRes.rows.length === 0) {
    throw new Error(`Student with roll number "${cleanCode}" does not exist in master student records.`);
  }

  const student = studentRes.rows[0];

  // Check duplicate member
  const existing = await db.query(
    `SELECT id FROM club_members WHERE club_id = $1 AND UPPER(student_id) = $2;`,
    [clubId, cleanCode]
  );
  if (existing.rows.length > 0) {
    throw new Error(`Student "${student.name}" (${cleanCode}) is already a member of club "${club.name}".`);
  }

  const res = await db.query<DBClubMember>(
    `INSERT INTO club_members (club_id, student_id, status)
     VALUES ($1, $2, 'ACTIVE')
     RETURNING id, club_id, student_id, joined_at::text, status;`,
    [clubId, student.student_code]
  );

  const mRow = res.rows[0];
  if (!mRow) throw new Error("Failed to add club member.");

  return {
    ...mRow,
    student_name: student.name,
    department: student.department,
    year: student.year,
    section: student.section,
  };
}

export async function removeClubMember(clubId: string, studentCode: string): Promise<boolean> {
  await ensureClubSchema();
  const cleanCode = studentCode.trim().toUpperCase();
  const res = await db.query(
    `DELETE FROM club_members WHERE club_id = $1 AND UPPER(student_id) = $2;`,
    [clubId, cleanCode]
  );
  return (res.rowCount || 0) > 0;
}

export async function getClubMembers(
  clubId: string,
  filters?: { year?: string; section?: string; search?: string }
): Promise<DBClubMember[]> {
  await ensureClubSchema();

  let query = `
    SELECT cm.id, cm.club_id, cm.student_id, cm.joined_at::text, cm.status,
           s.name AS student_name, s.department, s.year, s.section
    FROM club_members cm
    JOIN students s ON UPPER(s.student_code) = UPPER(cm.student_id)
    WHERE cm.club_id = $1 AND cm.status = 'ACTIVE'
  `;
  const params: any[] = [clubId];

  if (filters?.year) {
    params.push(filters.year.trim());
    query += ` AND s.year = $${params.length}`;
  }
  if (filters?.section) {
    params.push(filters.section.trim());
    query += ` AND s.section = $${params.length}`;
  }
  if (filters?.search) {
    params.push(`%${filters.search.trim().toLowerCase()}%`);
    query += ` AND (LOWER(s.name) LIKE $${params.length} OR LOWER(s.student_code) LIKE $${params.length})`;
  }

  query += ` ORDER BY s.year ASC, s.section ASC, s.name ASC;`;

  const res = await db.query<DBClubMember>(query, params);
  return res.rows;
}

// ==========================================
// PHASE 5 - 8: CLUB EVENT MANAGEMENT & PERMISSIONS
// ==========================================

export async function createClubEvent(
  coordinatorFacultyId: string,
  data: {
    club_id: string;
    event_name: string;
    description?: string | null;
    event_date: string;
    start_time: string;
    end_time: string;
    location_type: LocationType;
    location: string;
    event_type: EventType;
  }
): Promise<DBClubEvent> {
  await ensureClubSchema();

  // 1. Check club exists and is ACTIVE
  const club = await getClubById(data.club_id);
  if (!club) throw new Error(`Club with ID "${data.club_id}" does not exist.`);
  if (club.status !== "ACTIVE") throw new Error(`Cannot create events for inactive club "${club.name}".`);

  // 2. Check coordinator authorization
  const isCoordinator = await isFacultyClubCoordinator(coordinatorFacultyId, data.club_id);
  if (!isCoordinator) {
    throw new Error(`Unauthorized: You are not an assigned active coordinator for club "${club.name}".`);
  }

  // 3. Insert event
  const res = await db.query<DBClubEvent>(
    `INSERT INTO club_events (
      club_id, event_name, description, event_date, start_time, end_time,
      location_type, location, event_type, coordinator_id, status
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'SCHEDULED')
    RETURNING event_id, club_id, event_name, description, to_char(event_date, 'YYYY-MM-DD') AS event_date,
              start_time::text, end_time::text, location_type, location, event_type,
              coordinator_id, status, created_at::text, updated_at::text;`,
    [
      data.club_id,
      data.event_name.trim(),
      data.description?.trim() || null,
      data.event_date,
      data.start_time,
      data.end_time,
      data.location_type,
      data.location.trim(),
      data.event_type,
      coordinatorFacultyId,
    ]
  );

  const event = res.rows[0];
  if (!event) throw new Error("Failed to create club event.");

  return {
    ...event,
    club_name: club.name,
  };
}

export async function getClubEvents(clubId: string): Promise<DBClubEvent[]> {
  await ensureClubSchema();
  const res = await db.query<DBClubEvent>(
    `SELECT e.event_id, e.club_id, e.event_name, e.description,
            to_char(e.event_date, 'YYYY-MM-DD') AS event_date,
            e.start_time::text, e.end_time::text, e.location_type, e.location,
            e.event_type, e.coordinator_id, e.status, e.created_at::text, e.updated_at::text,
            c.name AS club_name, p.full_name AS coordinator_name
     FROM club_events e
     JOIN clubs c ON c.club_id = e.club_id
     JOIN profiles p ON p.id = e.coordinator_id
     WHERE e.club_id = $1
     ORDER BY e.event_date DESC, e.start_time DESC;`,
    [clubId]
  );
  return res.rows;
}

export async function getClubEventById(eventId: string): Promise<DBClubEvent | null> {
  await ensureClubSchema();
  const res = await db.query<DBClubEvent>(
    `SELECT e.event_id, e.club_id, e.event_name, e.description,
            to_char(e.event_date, 'YYYY-MM-DD') AS event_date,
            e.start_time::text, e.end_time::text, e.location_type, e.location,
            e.event_type, e.coordinator_id, e.status, e.created_at::text, e.updated_at::text,
            c.name AS club_name, p.full_name AS coordinator_name
     FROM club_events e
     JOIN clubs c ON c.club_id = e.club_id
     JOIN profiles p ON p.id = e.coordinator_id
     WHERE e.event_id = $1 LIMIT 1;`,
    [eventId]
  );
  return res.rows[0] || null;
}

export async function cancelClubEvent(coordinatorFacultyId: string, eventId: string, reason?: string): Promise<DBClubEvent> {
  await ensureClubSchema();

  const event = await getClubEventById(eventId);
  if (!event) throw new Error(`Event ID "${eventId}" does not exist.`);

  const isCoordinator = await isFacultyClubCoordinator(coordinatorFacultyId, event.club_id);
  if (!isCoordinator) {
    throw new Error(`Unauthorized: You are not authorized to cancel events for this club.`);
  }

  // Update event status
  await db.query(
    `UPDATE club_events SET status = 'CANCELLED', updated_at = NOW() WHERE event_id = $1;`,
    [eventId]
  );

  // Update all participant permissions to CANCELLED
  const partsRes = await db.query<{ id: string; student_code: string }>(
    `UPDATE event_participants SET permission_status = 'CANCELLED' WHERE event_id = $1 RETURNING id::text, student_code;`,
    [eventId]
  );

  try {
    const { revokeQRPassByPermission } = await import("./qr.server");
    for (const pRow of partsRes.rows) {
      await revokeQRPassByPermission("CLUB_EVENT", pRow.id);
    }
  } catch (qrErr) {
    console.warn("[QR Notice] Failed to revoke event QR passes:", qrErr);
  }

  // Notify participants
  const participantsRes = partsRes;


  for (const part of participantsRes.rows) {
    await createNotificationServer({
      recipientRole: "student",
      recipientId: part.student_code,
      title: `Event Cancelled: ${event.event_name}`,
      detail: `The event "${event.event_name}" on ${event.event_date} has been cancelled by the club coordinator. ${reason ? `Reason: ${reason}` : ""}`,
      tone: "critical",
      type: "event_cancelled",
      relatedType: "club_event",
      relatedId: eventId,
    }).catch(() => {});
  }

  return {
    ...event,
    status: "CANCELLED",
  };
}

export type ParticipantPreflightReport = {
  valid: { student_code: string; name: string; department: string; year: string; section: string }[];
  invalid: string[];
  duplicatesInInput: string[];
  alreadyPermitted: string[];
};

export async function validateEventParticipantsPreflight(
  eventId: string,
  rawStudentCodes: string[]
): Promise<ParticipantPreflightReport> {
  await ensureClubSchema();

  const valid: ParticipantPreflightReport["valid"] = [];
  const invalid: string[] = [];
  const duplicatesInInput: string[] = [];
  const alreadyPermitted: string[] = [];

  const seenInInput = new Set<string>();

  for (const rawCode of rawStudentCodes) {
    const clean = rawCode.trim().toUpperCase();
    if (!clean) continue;

    if (seenInInput.has(clean)) {
      duplicatesInInput.push(clean);
      continue;
    }
    seenInInput.add(clean);

    // Check master students table
    const sRes = await db.query(
      `SELECT student_code, name, department, year, section FROM students WHERE UPPER(student_code) = $1 LIMIT 1;`,
      [clean]
    );

    if (sRes.rows.length === 0) {
      invalid.push(clean);
      continue;
    }

    // Check existing participant permission
    const existing = await db.query(
      `SELECT id FROM event_participants WHERE event_id = $1 AND UPPER(student_code) = $2 AND permission_status = 'APPROVED';`,
      [eventId, clean]
    );

    if (existing.rows.length > 0) {
      alreadyPermitted.push(clean);
    } else {
      valid.push({
        student_code: sRes.rows[0].student_code,
        name: sRes.rows[0].name,
        department: sRes.rows[0].department,
        year: sRes.rows[0].year,
        section: sRes.rows[0].section,
      });
    }
  }

  return { valid, invalid, duplicatesInInput, alreadyPermitted };
}

/**
 * Grants event permissions in an atomic database transaction.
 * Fails safely if invalid roll numbers are present.
 */
export async function grantEventPermissionsAtomic(
  coordinatorFacultyId: string,
  eventId: string,
  studentCodes: string[]
): Promise<{ success: boolean; grantedCount: number; permissions: DBEventParticipant[] }> {
  await ensureClubSchema();

  const event = await getClubEventById(eventId);
  if (!event) throw new Error(`Event ID "${eventId}" does not exist.`);
  if (event.status === "CANCELLED") throw new Error("Cannot grant permissions for a cancelled event.");

  const isCoordinator = await isFacultyClubCoordinator(coordinatorFacultyId, event.club_id);
  if (!isCoordinator) {
    throw new Error("Unauthorized: Only assigned club coordinators can grant event permissions.");
  }

  // Pre-flight check
  const preflight = await validateEventParticipantsPreflight(eventId, studentCodes);
  if (preflight.invalid.length > 0) {
    throw new Error(
      `Preflight validation failed: ${preflight.invalid.length} invalid student roll number(s) detected: [${preflight.invalid.join(", ")}]. Please resolve invalid records before granting permission.`
    );
  }

  if (preflight.valid.length === 0) {
    return { success: true, grantedCount: 0, permissions: [] };
  }

  const createdPermissions: DBEventParticipant[] = [];

  // Execute database transaction
  await db.query("BEGIN;");

  try {
    for (const student of preflight.valid) {
      // Generate unique Event Permission code (EP-XXXXXX)
      const randomSuffix = Math.floor(100000 + Math.random() * 900000);
      const permCode = `EP-${randomSuffix}`;

      const res = await db.query<DBEventParticipant>(
        `INSERT INTO event_participants (permission_code, event_id, student_code, permission_status)
         VALUES ($1, $2, $3, 'APPROVED')
         ON CONFLICT (event_id, student_code)
         DO UPDATE SET permission_status = 'APPROVED', created_at = NOW()
         RETURNING id, permission_code, event_id, student_code, permission_status, exit_at::text, entry_at::text, verified_by, created_at::text;`,
        [permCode, eventId, student.student_code]
      );

      const pRow = res.rows[0];
      if (pRow) {
        // Auto-generate active Club/Event QR pass
        try {
          const { getOrCreateQRPassForEventParticipant } = await import("./qr.server");
          const vFrom = `${event.event_date}T${event.start_time || "00:00:00"}`;
          const vUntil = `${event.event_date}T${event.end_time || "23:59:59"}`;
          await getOrCreateQRPassForEventParticipant(pRow.id, vFrom, vUntil);
        } catch (qrErr) {
          console.warn("[QR Notice] Failed to generate Club/Event QR pass:", qrErr);
        }

        createdPermissions.push({
          ...pRow,
          student_name: student.name,
          department: student.department,
          year: student.year,
          section: student.section,
          event_name: event.event_name,
          event_date: event.event_date,
          start_time: event.start_time,
          end_time: event.end_time,
          location_type: event.location_type,
          location: event.location,
          club_name: event.club_name || "",
          coordinator_name: event.coordinator_name || "",
        });


        // Notify student automatically (no student confirmation step)
        await createNotificationServer({
          recipientRole: "student",
          recipientId: student.student_code,
          title: `Event Permission Approved: ${event.event_name}`,
          detail: `Your club coordinator has granted permission for "${event.event_name}" (${event.club_name}) on ${event.event_date} from ${event.start_time} to ${event.end_time} at ${event.location}.`,
          tone: "info",
          type: "event_permission_granted",
          relatedType: "club_event_permission",
          relatedId: pRow.permission_code,
        }).catch(() => {});
      }
    }

    await db.query("COMMIT;");
    return { success: true, grantedCount: createdPermissions.length, permissions: createdPermissions };
  } catch (err) {
    await db.query("ROLLBACK;");
    throw err;
  }
}

export async function getStudentEventPermissions(studentCode: string): Promise<DBEventParticipant[]> {
  await ensureClubSchema();
  const cleanCode = studentCode.trim().toUpperCase();

  const res = await db.query<DBEventParticipant>(
    `SELECT ep.id, ep.permission_code, ep.event_id, ep.student_code, ep.permission_status,
            ep.exit_at::text, ep.entry_at::text, ep.verified_by, ep.created_at::text,
            e.event_name, to_char(e.event_date, 'YYYY-MM-DD') AS event_date,
            e.start_time::text, e.end_time::text, e.location_type, e.location,
            c.name AS club_name, p.full_name AS coordinator_name,
            s.name AS student_name, s.department, s.year, s.section
     FROM event_participants ep
     JOIN club_events e ON e.event_id = ep.event_id
     JOIN clubs c ON c.club_id = e.club_id
     JOIN profiles p ON p.id = e.coordinator_id
     JOIN students s ON UPPER(s.student_code) = UPPER(ep.student_code)
     WHERE UPPER(ep.student_code) = $1 AND ep.permission_status = 'APPROVED' AND e.status = 'SCHEDULED'
     ORDER BY e.event_date DESC, e.start_time DESC;`,
    [cleanCode]
  );
  return res.rows;
}

export async function getActiveStudentEventPermission(studentCode: string): Promise<DBEventParticipant | null> {
  await ensureClubSchema();
  const cleanCode = studentCode.trim().toUpperCase();

  const res = await db.query<DBEventParticipant>(
    `SELECT ep.id, ep.permission_code, ep.event_id, ep.student_code, ep.permission_status,
            ep.exit_at::text, ep.entry_at::text, ep.verified_by, ep.created_at::text,
            e.event_name, to_char(e.event_date, 'YYYY-MM-DD') AS event_date,
            e.start_time::text, e.end_time::text, e.location_type, e.location,
            c.name AS club_name, p.full_name AS coordinator_name,
            s.name AS student_name, s.department, s.year, s.section
     FROM event_participants ep
     JOIN club_events e ON e.event_id = ep.event_id
     JOIN clubs c ON c.club_id = e.club_id
     JOIN profiles p ON p.id = e.coordinator_id
     JOIN students s ON UPPER(s.student_code) = UPPER(ep.student_code)
     WHERE UPPER(ep.student_code) = $1
       AND ep.permission_status = 'APPROVED'
       AND e.status = 'SCHEDULED'
       AND e.event_date = CURRENT_DATE
       AND (
         CURRENT_TIME BETWEEN e.start_time AND e.end_time
         OR ep.exit_at IS NOT NULL
       )
     ORDER BY ep.created_at DESC
     LIMIT 1;`,
    [cleanCode]
  );
  return res.rows[0] || null;
}

export async function verifyEventPermissionByCode(permissionCode: string): Promise<DBEventParticipant | null> {
  await ensureClubSchema();
  const cleanCode = permissionCode.trim().toUpperCase();

  const res = await db.query<DBEventParticipant>(
    `SELECT ep.id, ep.permission_code, ep.event_id, ep.student_code, ep.permission_status,
            ep.exit_at::text, ep.entry_at::text, ep.verified_by, ep.created_at::text,
            e.event_name, to_char(e.event_date, 'YYYY-MM-DD') AS event_date,
            e.start_time::text, e.end_time::text, e.location_type, e.location,
            c.name AS club_name, p.full_name AS coordinator_name,
            s.name AS student_name, s.department, s.year, s.section
     FROM event_participants ep
     JOIN club_events e ON e.event_id = ep.event_id
     JOIN clubs c ON c.club_id = e.club_id
     JOIN profiles p ON p.id = e.coordinator_id
     JOIN students s ON UPPER(s.student_code) = UPPER(ep.student_code)
     WHERE (UPPER(ep.permission_code) = $1 OR UPPER(ep.id::text) = $1)
     LIMIT 1;`,
    [cleanCode]
  );
  return res.rows[0] || null;
}

export async function recordEventParticipantExit(permissionCode: string, verifierName: string): Promise<DBEventParticipant> {
  await ensureClubSchema();
  const cleanCode = permissionCode.trim().toUpperCase();

  const perm = await verifyEventPermissionByCode(cleanCode);
  if (!perm) throw new Error(`Event permission code "${permissionCode}" not found.`);
  if (perm.permission_status !== "APPROVED") throw new Error(`Permission status is "${perm.permission_status}". Cannot record exit.`);

  const res = await db.query<DBEventParticipant>(
    `UPDATE event_participants
     SET exit_at = NOW(), verified_by = $1
     WHERE (UPPER(permission_code) = $2 OR UPPER(id::text) = $2)
     RETURNING id, permission_code, event_id, student_code, permission_status, exit_at::text, entry_at::text, verified_by, created_at::text;`,
    [verifierName, cleanCode]
  );
  const row = res.rows[0];
  if (!row) throw new Error("Failed to record exit.");
  return { ...perm, exit_at: row.exit_at, verified_by: row.verified_by };
}

export async function recordEventParticipantEntry(permissionCode: string, verifierName: string): Promise<DBEventParticipant> {
  await ensureClubSchema();
  const cleanCode = permissionCode.trim().toUpperCase();

  const perm = await verifyEventPermissionByCode(cleanCode);
  if (!perm) throw new Error(`Event permission code "${permissionCode}" not found.`);
  if (!perm.exit_at) throw new Error("Exit timestamp has not been recorded yet.");

  const res = await db.query<DBEventParticipant>(
    `UPDATE event_participants
     SET entry_at = NOW(), verified_by = $1
     WHERE (UPPER(permission_code) = $2 OR UPPER(id::text) = $2)
     RETURNING id, permission_code, event_id, student_code, permission_status, exit_at::text, entry_at::text, verified_by, created_at::text;`,
    [verifierName, cleanCode]
  );
  const row = res.rows[0];
  if (!row) throw new Error("Failed to record entry.");
  return { ...perm, entry_at: row.entry_at, verified_by: row.verified_by };
}

export type DBEventParticipantReportItem = {
  id: string;
  permission_code: string;
  event_id: string;
  event_name: string;
  event_date: string;
  student_code: string;
  student_name: string;
  department: string;
  year: string;
  section: string;
  permission_status: string;
  exit_at: string | null;
  entry_at: string | null;
  verified_by: string | null;
  created_at: string;
};

export async function getEventParticipantsServer(
  session: ServerSession,
  eventId: string
): Promise<DBEventParticipantReportItem[]> {
  await ensureClubSchema();
  const res = await db.query<DBEventParticipantReportItem>(
    `
    SELECT 
      ep.id,
      ep.permission_code,
      ep.event_id,
      ce.event_name,
      ce.event_date::text as event_date,
      ep.student_code,
      COALESCE(s.name, p.full_name, 'Student ' || ep.student_code) as student_name,
      COALESCE(s.department, 'N/A') as department,
      COALESCE(s.year, 'N/A') as year,
      COALESCE(s.section, 'N/A') as section,
      ep.permission_status,
      ep.exit_at::text as exit_at,
      ep.entry_at::text as entry_at,
      ep.verified_by,
      ep.created_at::text as created_at
    FROM event_participants ep
    JOIN club_events ce ON ce.event_id = ep.event_id
    LEFT JOIN students s ON s.student_code = ep.student_code
    LEFT JOIN profiles p ON p.student_code = ep.student_code
    WHERE ep.event_id = $1
    ORDER BY ep.created_at DESC
    `,
    [eventId]
  );

  return res.rows;
}


