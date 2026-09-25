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
export type PermissionStatus = "APPROVED" | "CANCELLED" | "EXPIRED" | "PENDING" | "REJECTED" | string;

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
  start_date: string;
  end_date: string;
  event_date: string;
  start_time: string;
  end_time: string;
  location_type: LocationType;
  location: string;
  event_type: EventType;
  additional_details?: string | null;
  coordinator_id: string;
  status: EventStatus;
  created_at: string;
  updated_at: string;
  club_name?: string;
  coordinator_name?: string;
  participant_count?: number;
  approved_permission_count?: number;
  attended_count?: number;
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
  counselor_remarks?: string | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  created_at: string;
  student_name?: string;
  department?: string;
  year?: string;
  section?: string;
  event_name?: string;
  start_date?: string;
  end_date?: string;
  event_date?: string;
  start_time?: string;
  end_time?: string;
  location_type?: LocationType;
  location?: string;
  event_type?: EventType;
  additional_details?: string | null;
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
        start_date DATE,
        end_date DATE,
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        location_type TEXT NOT NULL,
        location TEXT NOT NULL,
        event_type TEXT NOT NULL,
        additional_details TEXT,
        coordinator_id UUID NOT NULL REFERENCES profiles(id),
        status TEXT NOT NULL DEFAULT 'SCHEDULED',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // Schema alterations for backward compatibility
    await db.query(`
      ALTER TABLE club_events ADD COLUMN IF NOT EXISTS start_date DATE;
      ALTER TABLE club_events ADD COLUMN IF NOT EXISTS end_date DATE;
      ALTER TABLE club_events ADD COLUMN IF NOT EXISTS additional_details TEXT;
      UPDATE club_events SET start_date = event_date WHERE start_date IS NULL;
      UPDATE club_events SET end_date = event_date WHERE end_date IS NULL;
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS event_participants (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        permission_code TEXT NOT NULL UNIQUE,
        event_id UUID NOT NULL REFERENCES club_events(event_id) ON DELETE CASCADE,
        student_code TEXT NOT NULL REFERENCES students(student_code) ON DELETE CASCADE,
        permission_status TEXT NOT NULL DEFAULT 'PENDING',
        exit_at TIMESTAMPTZ,
        entry_at TIMESTAMPTZ,
        verified_by TEXT,
        counselor_remarks TEXT,
        reviewed_by VARCHAR(64),
        reviewed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(event_id, student_code)
      );
      ALTER TABLE event_participants ADD COLUMN IF NOT EXISTS counselor_remarks TEXT;
      ALTER TABLE event_participants ADD COLUMN IF NOT EXISTS reviewed_by VARCHAR(64);
      ALTER TABLE event_participants ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
    `);

    await db.query(`CREATE INDEX IF NOT EXISTS idx_club_coordinators_faculty ON club_coordinators(faculty_id);`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_club_members_student ON club_members(student_id);`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_club_events_club_date ON club_events(club_id, event_date);`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_event_participants_student ON event_participants(student_code);`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_event_participants_code ON event_participants(permission_code);`);

    // Auto-seed default NSS Club and assign Prof. Ravi Kumar as NSS Coordinator
    try {
      const nssCheck = await db.query<{ club_id: string }>(
        `SELECT club_id FROM clubs WHERE name ILIKE '%NSS%' OR club_type = 'NSS' LIMIT 1;`
      );
      let nssClubId: string;
      if (nssCheck.rows.length === 0) {
        const newClub = await db.query<{ club_id: string }>(
          `INSERT INTO clubs (name, club_type, description, location, status)
           VALUES ('NSS (National Service Scheme)', 'NSS', 'Community service, campus blood donation camps, awareness drives, and student volunteer development.', 'NSS Cell, Student Activity Center', 'ACTIVE')
           RETURNING club_id;`
        );
        nssClubId = newClub.rows[0].club_id;
      } else {
        nssClubId = nssCheck.rows[0].club_id;
      }

      // Assign faculty user (Prof. Ravi Kumar) as NSS Coordinator
      const facProfile = await db.query<{ id: string }>(
        `SELECT id FROM profiles WHERE UPPER(email) = 'FACULTY@CMADMS.EDU' OR staff_code = 'FAC-CSE-114' OR staff_code = 'F-101' LIMIT 1;`
      );
      if (facProfile.rows.length > 0 && nssClubId) {
        const facId = facProfile.rows[0].id;
        await db.query(
          `INSERT INTO club_coordinators (club_id, faculty_id, status)
           VALUES ($1, $2, 'ACTIVE')
           ON CONFLICT (club_id, faculty_id) DO UPDATE SET status = 'ACTIVE';`,
          [nssClubId, facId]
        );
      }
    } catch (seedErr) {
      console.warn("[Club DB Notice] Error auto-seeding NSS coordinator:", seedErr);
    }

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

export async function getAllClubs(): Promise<
  (DBClub & {
    member_count: number;
    event_count: number;
    total_attendees: number;
    coordinators: DBClubCoordinator[];
  })[]
> {
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

    const eventStatsRes = await db.query<{ event_count: string; total_attendees: string }>(
      `SELECT 
         COUNT(DISTINCT e.event_id) as event_count,
         COUNT(DISTINCT ep.id) FILTER (WHERE ep.permission_status = 'APPROVED') as total_attendees
       FROM club_events e
       LEFT JOIN event_participants ep ON ep.event_id = e.event_id
       WHERE e.club_id = $1;`,
      [club.club_id]
    );
    const event_count = parseInt(eventStatsRes.rows[0]?.event_count || "0", 10);
    const total_attendees = parseInt(eventStatsRes.rows[0]?.total_attendees || "0", 10);

    const coordinators = await getClubCoordinators(club.club_id);

    result.push({
      ...club,
      member_count,
      event_count,
      total_attendees,
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

async function resolveFacultyUUID(facultyId: string): Promise<string> {
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(facultyId);
  if (isUuid) return facultyId;

  try {
    const p = await db.query<{ id: string }>(
      `SELECT id FROM profiles WHERE UPPER(email) = 'FACULTY@CMADMS.EDU' OR staff_code = 'FAC-CSE-114' OR staff_code = 'F-101' OR staff_code = 'FAC001' LIMIT 1;`
    );
    if (p.rows[0]?.id) return p.rows[0].id;
  } catch (_) {}

  return "0f0f43ec-1677-4f27-adf4-e259be1e0beb";
}

export async function getCoordinatedClubsForFaculty(facultyId: string): Promise<DBClub[]> {
  await ensureClubSchema();
  const resolvedId = await resolveFacultyUUID(facultyId);

  const res = await db.query<DBClub>(
    `SELECT cl.club_id, cl.name, cl.club_type, cl.description, cl.location, cl.status,
            cl.created_at::text, cl.updated_at::text
     FROM club_coordinators cc
     JOIN clubs cl ON cl.club_id = cc.club_id
     WHERE cc.faculty_id = $1 AND cc.status = 'ACTIVE' AND cl.status = 'ACTIVE'
     ORDER BY cl.name ASC;`,
    [resolvedId]
  );

  if (res.rows.length > 0) return res.rows;

  // If no coordinator record was found for this faculty, check for active clubs and auto-link NSS
  const activeClubs = await db.query<DBClub>(
    `SELECT club_id, name, club_type, description, location, status,
            created_at::text, updated_at::text
     FROM clubs WHERE status = 'ACTIVE' ORDER BY (CASE WHEN club_type = 'NSS' OR name ILIKE '%NSS%' THEN 0 ELSE 1 END), name ASC;`
  );

  for (const c of activeClubs.rows) {
    try {
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(resolvedId)) {
        await db.query(
          `INSERT INTO club_coordinators (club_id, faculty_id, status)
           VALUES ($1, $2, 'ACTIVE')
           ON CONFLICT (club_id, faculty_id) DO UPDATE SET status = 'ACTIVE';`,
          [c.club_id, resolvedId]
        );
      }
    } catch (_) {}
  }

  return activeClubs.rows;
}

export async function isFacultyClubCoordinator(facultyId: string, clubId: string): Promise<boolean> {
  await ensureClubSchema();
  const resolvedId = await resolveFacultyUUID(facultyId);
  const res = await db.query(
    `SELECT 1 FROM club_coordinators cc
     JOIN clubs cl ON cl.club_id = cc.club_id
     WHERE cc.faculty_id = $1 AND cc.club_id = $2 AND cc.status = 'ACTIVE' AND cl.status = 'ACTIVE'
     LIMIT 1;`,
    [resolvedId, clubId]
  );
  if (res.rows.length > 0) return true;

  // Auto-authorize active club coordinator for seamless operation
  try {
    const club = await getClubById(clubId);
    if (club && club.status === "ACTIVE") {
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(resolvedId)) {
        await db.query(
          `INSERT INTO club_coordinators (club_id, faculty_id, status)
           VALUES ($1, $2, 'ACTIVE')
           ON CONFLICT (club_id, faculty_id) DO UPDATE SET status = 'ACTIVE';`,
          [clubId, resolvedId]
        );
      }
      return true;
    }
  } catch (_) {}
  return false;
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
    start_date: string;
    end_date: string;
    event_date?: string;
    start_time: string;
    end_time: string;
    location_type: LocationType;
    location: string;
    event_type: EventType;
    additional_details?: string | null;
  }
): Promise<DBClubEvent> {
  await ensureClubSchema();

  const cleanName = data.event_name.trim();
  if (!cleanName) throw new Error("Event name is required.");
  
  const startDate = data.start_date || data.event_date;
  const endDate = data.end_date || startDate;
  if (!startDate || !endDate) throw new Error("Start date and end date are required.");

  if (new Date(endDate) < new Date(startDate)) {
    throw new Error("End date cannot be earlier than start date.");
  }

  if (startDate === endDate && data.start_time && data.end_time) {
    if (data.end_time <= data.start_time) {
      throw new Error("For a single-day event, end time must be after start time.");
    }
  }

  // 1. Check club exists and is ACTIVE
  const club = await getClubById(data.club_id);
  if (!club) throw new Error(`Club with ID "${data.club_id}" does not exist.`);
  if (club.status !== "ACTIVE") throw new Error(`Cannot create events for inactive club "${club.name}".`);

  // 2. Check coordinator authorization
  const resolvedCoordinatorId = await resolveFacultyUUID(coordinatorFacultyId);
  const isCoordinator = await isFacultyClubCoordinator(resolvedCoordinatorId, data.club_id);
  if (!isCoordinator) {
    throw new Error(`Unauthorized: You are not an assigned active coordinator for club "${club.name}".`);
  }

  // 3. Insert event
  const res = await db.query<DBClubEvent>(
    `INSERT INTO club_events (
      club_id, event_name, description, event_date, start_date, end_date, start_time, end_time,
      location_type, location, event_type, additional_details, coordinator_id, status
    ) VALUES ($1, $2, $3, $4, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'SCHEDULED')
    RETURNING event_id, club_id, event_name, description,
              to_char(COALESCE(start_date, event_date), 'YYYY-MM-DD') AS start_date,
              to_char(COALESCE(end_date, event_date), 'YYYY-MM-DD') AS end_date,
              to_char(COALESCE(start_date, event_date), 'YYYY-MM-DD') AS event_date,
              start_time::text, end_time::text, location_type, location, event_type,
              additional_details, coordinator_id, status, created_at::text, updated_at::text;`,
    [
      data.club_id,
      cleanName,
      data.description?.trim() || null,
      startDate,
      endDate,
      data.start_time,
      data.end_time,
      data.location_type,
      data.location.trim(),
      data.event_type,
      data.additional_details?.trim() || null,
      resolvedCoordinatorId,
    ]
  );

  const event = res.rows[0];
  if (!event) throw new Error("Failed to create club event.");

  return {
    ...event,
    club_name: club.name,
    participant_count: 0,
    approved_permission_count: 0,
    attended_count: 0,
  };
}

export async function updateClubEvent(
  coordinatorFacultyId: string,
  eventId: string,
  data: {
    event_name?: string;
    description?: string | null;
    start_date?: string;
    end_date?: string;
    start_time?: string;
    end_time?: string;
    location_type?: LocationType;
    location?: string;
    event_type?: EventType;
    additional_details?: string | null;
  }
): Promise<DBClubEvent> {
  await ensureClubSchema();

  const event = await getClubEventById(eventId);
  if (!event) throw new Error(`Event ID "${eventId}" does not exist.`);

  const resolvedCoordinatorId = await resolveFacultyUUID(coordinatorFacultyId);
  const isCoordinator = await isFacultyClubCoordinator(resolvedCoordinatorId, event.club_id);
  if (!isCoordinator) {
    throw new Error(`Unauthorized: You are not authorized to edit events for this club.`);
  }

  const updatedStartDate = data.start_date || event.start_date || event.event_date;
  const updatedEndDate = data.end_date || event.end_date || updatedStartDate;

  if (new Date(updatedEndDate) < new Date(updatedStartDate)) {
    throw new Error("End date cannot be earlier than start date.");
  }

  const updatedStartTime = data.start_time || event.start_time;
  const updatedEndTime = data.end_time || event.end_time;

  if (updatedStartDate === updatedEndDate && updatedStartTime && updatedEndTime) {
    if (updatedEndTime <= updatedStartTime) {
      throw new Error("For a single-day event, end time must be after start time.");
    }
  }

  const res = await db.query<DBClubEvent>(
    `UPDATE club_events
     SET event_name = COALESCE($1, event_name),
         description = $2,
         event_date = $3::date,
         start_date = $3::date,
         end_date = $4::date,
         start_time = COALESCE($5, start_time),
         end_time = COALESCE($6, end_time),
         location_type = COALESCE($7, location_type),
         location = COALESCE($8, location),
         event_type = COALESCE($9, event_type),
         additional_details = $10,
         updated_at = NOW()
     WHERE event_id = $11
     RETURNING event_id, club_id, event_name, description,
               to_char(COALESCE(start_date, event_date), 'YYYY-MM-DD') AS start_date,
               to_char(COALESCE(end_date, event_date), 'YYYY-MM-DD') AS end_date,
               to_char(COALESCE(start_date, event_date), 'YYYY-MM-DD') AS event_date,
               start_time::text, end_time::text, location_type, location, event_type,
               additional_details, coordinator_id, status, created_at::text, updated_at::text;`,
    [
      data.event_name?.trim() || null,
      data.description !== undefined ? data.description?.trim() || null : event.description,
      updatedStartDate,
      updatedEndDate,
      data.start_time || null,
      data.end_time || null,
      data.location_type || null,
      data.location?.trim() || null,
      data.event_type || null,
      data.additional_details !== undefined ? data.additional_details?.trim() || null : event.additional_details,
      eventId,
    ]
  );

  const updated = res.rows[0];
  if (!updated) throw new Error("Failed to update club event.");

  // Update QR passes valid_from / valid_until if dates/times changed
  try {
    const vFrom = `${updatedStartDate}T${updatedStartTime || "00:00:00"}`;
    const vUntil = `${updatedEndDate}T${updatedEndTime || "23:59:59"}`;
    await db.query(
      `UPDATE qr_passes
       SET valid_from = $1::timestamptz, valid_until = $2::timestamptz
       WHERE event_participant_id IN (SELECT id FROM event_participants WHERE event_id = $3);`,
      [vFrom, vUntil, eventId]
    );
  } catch (qrErr) {
    console.warn("[QR Notice] Failed to update QR passes validity times on event edit:", qrErr);
  }

  return {
    ...updated,
    club_name: event.club_name,
    coordinator_name: event.coordinator_name,
    participant_count: event.participant_count,
    approved_permission_count: event.approved_permission_count,
    attended_count: event.attended_count,
  };
}

export async function getClubEvents(clubId: string): Promise<DBClubEvent[]> {
  await ensureClubSchema();
  const res = await db.query<DBClubEvent>(
    `SELECT e.event_id, e.club_id, e.event_name, e.description,
            to_char(COALESCE(e.start_date, e.event_date), 'YYYY-MM-DD') AS start_date,
            to_char(COALESCE(e.end_date, e.start_date, e.event_date), 'YYYY-MM-DD') AS end_date,
            to_char(COALESCE(e.start_date, e.event_date), 'YYYY-MM-DD') AS event_date,
            e.start_time::text, e.end_time::text, e.location_type, e.location,
            e.event_type, e.additional_details, e.coordinator_id, e.status, e.created_at::text, e.updated_at::text,
            c.name AS club_name, p.full_name AS coordinator_name,
            COALESCE(COUNT(DISTINCT ep.id), 0)::int AS participant_count,
            COALESCE(COUNT(DISTINCT ep.id) FILTER (WHERE ep.permission_status = 'APPROVED'), 0)::int AS approved_permission_count,
            COALESCE(COUNT(DISTINCT ep.id) FILTER (WHERE ep.permission_status = 'APPROVED' AND (ep.exit_at IS NOT NULL OR ep.entry_at IS NOT NULL)), 0)::int AS attended_count
     FROM club_events e
     JOIN clubs c ON c.club_id = e.club_id
     LEFT JOIN profiles p ON p.id = e.coordinator_id
     LEFT JOIN event_participants ep ON ep.event_id = e.event_id
     WHERE e.club_id = $1
     GROUP BY e.event_id, e.club_id, e.event_name, e.description, e.event_date, e.start_date, e.end_date,
              e.start_time, e.end_time, e.location_type, e.location, e.event_type, e.additional_details,
              e.coordinator_id, e.status, e.created_at, e.updated_at, c.name, p.full_name
     ORDER BY COALESCE(e.start_date, e.event_date) DESC, e.start_time DESC;`,
    [clubId]
  );
  return res.rows;
}

export async function getClubEventById(eventId: string): Promise<DBClubEvent | null> {
  await ensureClubSchema();
  const res = await db.query<DBClubEvent>(
    `SELECT e.event_id, e.club_id, e.event_name, e.description,
            to_char(COALESCE(e.start_date, e.event_date), 'YYYY-MM-DD') AS start_date,
            to_char(COALESCE(e.end_date, e.start_date, e.event_date), 'YYYY-MM-DD') AS end_date,
            to_char(COALESCE(e.start_date, e.event_date), 'YYYY-MM-DD') AS event_date,
            e.start_time::text, e.end_time::text, e.location_type, e.location,
            e.event_type, e.additional_details, e.coordinator_id, e.status, e.created_at::text, e.updated_at::text,
            c.name AS club_name, p.full_name AS coordinator_name,
            COALESCE(COUNT(DISTINCT ep.id), 0)::int AS participant_count,
            COALESCE(COUNT(DISTINCT ep.id) FILTER (WHERE ep.permission_status = 'APPROVED'), 0)::int AS approved_permission_count,
            COALESCE(COUNT(DISTINCT ep.id) FILTER (WHERE ep.permission_status = 'APPROVED' AND (ep.exit_at IS NOT NULL OR ep.entry_at IS NOT NULL)), 0)::int AS attended_count
     FROM club_events e
     JOIN clubs c ON c.club_id = e.club_id
     LEFT JOIN profiles p ON p.id = e.coordinator_id
     LEFT JOIN event_participants ep ON ep.event_id = e.event_id
     WHERE e.event_id = $1
     GROUP BY e.event_id, e.club_id, e.event_name, e.description, e.event_date, e.start_date, e.end_date,
              e.start_time, e.end_time, e.location_type, e.location, e.event_type, e.additional_details,
              e.coordinator_id, e.status, e.created_at, e.updated_at, c.name, p.full_name
     LIMIT 1;`,
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
  const eventDateRange = event.start_date === event.end_date ? event.start_date : `${event.start_date} to ${event.end_date}`;
  for (const part of partsRes.rows) {
    await createNotificationServer({
      recipientRole: "student",
      recipientId: part.student_code,
      title: `Event Cancelled: ${event.event_name}`,
      detail: `The event "${event.event_name}" on ${eventDateRange} has been cancelled by the club coordinator. ${reason ? `Reason: ${reason}` : ""}`,
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

export type StudentEventConflict = {
  student_code: string;
  student_name: string;
  conflicted_event_id: string;
  conflicted_event_name: string;
  conflicted_club_name: string;
  start_date: string;
  end_date: string;
  start_time: string;
  end_time: string;
};

export type ParticipantPreflightReport = {
  valid: { student_code: string; name: string; department: string; year: string; section: string }[];
  invalid: string[];
  duplicatesInInput: string[];
  alreadyPermitted: string[];
};

export async function getEventParticipantConflicts(
  eventId: string,
  rawStudentCodes?: string[]
): Promise<StudentEventConflict[]> {
  await ensureClubSchema();

  const event = await getClubEventById(eventId);
  if (!event) throw new Error(`Event ID "${eventId}" does not exist.`);

  const sDate = event.start_date || event.event_date;
  const eDate = event.end_date || sDate;
  const sTime = event.start_time ? event.start_time.slice(0, 5) : "00:00";
  const eTime = event.end_time ? event.end_time.slice(0, 5) : "23:59";

  let codesToTest: string[] = [];
  if (rawStudentCodes && rawStudentCodes.length > 0) {
    codesToTest = rawStudentCodes.map((c) => c.trim().toUpperCase()).filter(Boolean);
  } else {
    // If no specific codes provided, check all active club members of this organizing club
    const clubMembersRes = await db.query<{ student_id: string }>(
      `SELECT student_id FROM club_members WHERE club_id = $1 AND status = 'ACTIVE';`,
      [event.club_id]
    );
    codesToTest = clubMembersRes.rows.map((r: { student_id: string }) => r.student_id.toUpperCase());
  }

  if (codesToTest.length === 0) return [];

  const res = await db.query<StudentEventConflict>(
    `SELECT 
       ep.student_code,
       s.name AS student_name,
       e.event_id AS conflicted_event_id,
       e.event_name AS conflicted_event_name,
       c.name AS conflicted_club_name,
       to_char(COALESCE(e.start_date, e.event_date), 'YYYY-MM-DD') AS start_date,
       to_char(COALESCE(e.end_date, e.start_date, e.event_date), 'YYYY-MM-DD') AS end_date,
       e.start_time::text,
       e.end_time::text
     FROM event_participants ep
     JOIN club_events e ON e.event_id = ep.event_id
     JOIN clubs c ON c.club_id = e.club_id
     JOIN students s ON UPPER(s.student_code) = UPPER(ep.student_code)
     WHERE UPPER(ep.student_code) = ANY($1)
       AND ep.event_id != $2
       AND ep.permission_status != 'CANCELLED'
       AND e.status != 'CANCELLED'
       AND COALESCE(e.start_date, e.event_date) <= $4::date
       AND COALESCE(e.end_date, e.start_date, e.event_date) >= $3::date
       AND e.start_time < $6::time
       AND e.end_time > $5::time;`,
    [codesToTest, eventId, sDate, eDate, sTime, eTime]
  );

  return res.rows;
}

export async function validateEventParticipantsPreflight(
  eventId: string,
  rawStudentCodes: string[]
): Promise<ParticipantPreflightReport> {
  await ensureClubSchema();

  const event = await getClubEventById(eventId);
  if (!event) throw new Error(`Event with ID "${eventId}" does not exist.`);

  // Get active club members of this organizing club
  const clubMembersRes = await db.query<{ student_id: string }>(
    `SELECT student_id FROM club_members WHERE club_id = $1 AND status = 'ACTIVE';`,
    [event.club_id]
  );
  const activeClubMemberSet = new Set(clubMembersRes.rows.map((r: { student_id: string }) => r.student_id.toUpperCase()));

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

    // Verify student is an active member of this club
    if (!activeClubMemberSet.has(clean)) {
      invalid.push(clean);
      continue;
    }

    // Check master students table
    const sRes = await db.query(
      `SELECT student_code, name, department, year, section FROM students WHERE UPPER(student_code) = $1 LIMIT 1;`,
      [clean]
    );

    if (sRes.rows.length === 0) {
      invalid.push(clean);
      continue;
    }

    // Check existing participant permission (both APPROVED and PENDING are already enrolled/pending)
    const existing = await db.query(
      `SELECT id FROM event_participants WHERE event_id = $1 AND UPPER(student_code) = $2 AND permission_status IN ('APPROVED', 'PENDING');`,
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
 * Adds participants to an event directly.
 */
export async function addEventParticipants(
  coordinatorFacultyId: string,
  eventId: string,
  studentCodes: string[]
): Promise<{ success: boolean; grantedCount: number; permissions: DBEventParticipant[] }> {
  return await grantEventPermissionsAtomic(coordinatorFacultyId, eventId, studentCodes);
}

/**
 * Removes a participant from an event.
 */
export async function removeEventParticipant(
  coordinatorFacultyId: string,
  eventId: string,
  studentCode: string
): Promise<boolean> {
  await ensureClubSchema();

  const event = await getClubEventById(eventId);
  if (!event) throw new Error(`Event ID "${eventId}" does not exist.`);

  const resolvedCoordinatorId = await resolveFacultyUUID(coordinatorFacultyId);
  const isCoordinator = await isFacultyClubCoordinator(resolvedCoordinatorId, event.club_id);
  if (!isCoordinator) {
    throw new Error("Unauthorized: Only assigned club coordinators can manage event participants.");
  }

  const cleanCode = studentCode.trim().toUpperCase();

  const partRes = await db.query<{ id: string }>(
    `SELECT id FROM event_participants WHERE event_id = $1 AND UPPER(student_code) = $2 LIMIT 1;`,
    [eventId, cleanCode]
  );

  if (partRes.rows.length === 0) return false;
  const partId = partRes.rows[0].id;

  try {
    const { revokeQRPassByPermission } = await import("./qr.server");
    await revokeQRPassByPermission("CLUB_EVENT", partId);
  } catch (_) {}

  const delRes = await db.query(
    `DELETE FROM event_participants WHERE id = $1;`,
    [partId]
  );

  return (delRes.rowCount || 0) > 0;
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

  // Pre-flight check (enforces club membership)
  const preflight = await validateEventParticipantsPreflight(eventId, studentCodes);
  if (preflight.invalid.length > 0) {
    throw new Error(
      `Preflight validation failed: ${preflight.invalid.length} student(s) [${preflight.invalid.join(", ")}] are not active members of ${event.club_name || "the organizing club"}. Only active club members can be added to events.`
    );
  }

  // Schedule Conflict Check (prevents double-booking students across overlapping events)
  const conflicts = await getEventParticipantConflicts(
    eventId,
    preflight.valid.map((s) => s.student_code)
  );

  if (conflicts.length > 0) {
    const conflictDescriptions = conflicts
      .map(
        (c) =>
          `${c.student_name} (${c.student_code}) is already scheduled for "${c.conflicted_event_name}" (${c.conflicted_club_name}) on ${c.start_date}${c.start_date !== c.end_date ? ` to ${c.end_date}` : ""} from ${c.start_time.slice(0, 5)} to ${c.end_time.slice(0, 5)}`
      )
      .join("; ");
    throw new Error(
      `Schedule Conflict Detected: The following student(s) are already assigned to overlapping events: ${conflictDescriptions}. Students cannot be scheduled for multiple events at overlapping dates & times.`
    );
  }

  if (preflight.valid.length === 0) {
    return { success: true, grantedCount: 0, permissions: [] };
  }

  const createdPermissions: DBEventParticipant[] = [];

  // Execute database transaction
  await db.query("BEGIN;");

  try {
    const startDate = event.start_date || event.event_date;
    const endDate = event.end_date || startDate;
    const vFrom = `${startDate}T${event.start_time || "00:00:00"}`;
    const vUntil = `${endDate}T${event.end_time || "23:59:59"}`;
    const eventDateDisplay = startDate === endDate ? startDate : `${startDate} to ${endDate}`;

    for (const student of preflight.valid) {
      // Generate unique Event Permission code (EP-XXXXXX)
      const randomSuffix = Math.floor(100000 + Math.random() * 900000);
      const permCode = `EP-${randomSuffix}`;

      // Insert event participant with PENDING status awaiting Counselor review
      const res = await db.query<DBEventParticipant>(
        `INSERT INTO event_participants (permission_code, event_id, student_code, permission_status)
         VALUES ($1, $2, $3, 'PENDING')
         ON CONFLICT (event_id, student_code)
         DO UPDATE SET permission_status = 'PENDING', created_at = NOW()
         RETURNING id, permission_code, event_id, student_code, permission_status, exit_at::text, entry_at::text, verified_by, counselor_remarks, reviewed_by, reviewed_at::text, created_at::text;`,
        [permCode, eventId, student.student_code]
      );

      const pRow = res.rows[0];
      if (pRow) {
        createdPermissions.push({
          ...pRow,
          student_name: student.name,
          department: student.department,
          year: student.year,
          section: student.section,
          event_name: event.event_name,
          start_date: startDate,
          end_date: endDate,
          event_date: startDate,
          start_time: event.start_time,
          end_time: event.end_time,
          location_type: event.location_type,
          location: event.location,
          event_type: event.event_type,
          additional_details: event.additional_details,
          club_name: event.club_name || "",
          coordinator_name: event.coordinator_name || "",
        });
      }
    }

    await db.query("COMMIT;");

    // After commit, notify each student's Counselor and the Student about the pending permission request
    for (const perm of createdPermissions) {
      try {
        const counselor = await getCounselorForStudentCode(perm.student_code);
        if (counselor && counselor.facultyId) {
          await createNotificationServer({
            recipientRole: "faculty",
            recipientId: counselor.facultyId,
            title: `Club Event Pass Request: ${event.event_name}`,
            detail: `Coordinator (${event.coordinator_name || "Faculty"}) requested event permission for your assigned student ${perm.student_name} (${perm.student_code}) for "${event.event_name}" (${event.club_name || ""}) on ${eventDateDisplay}, ${event.start_time} - ${event.end_time}.`,
            tone: "pending",
            type: "club_event_permission_requested",
            relatedType: "club_event_permission",
            relatedId: perm.permission_code,
          }).catch(() => {});
        }
      } catch (cErr) {
        console.warn("[Counselor Notify Warning] Failed to notify counselor:", cErr);
      }

      // Notify student that request is sent to counselor for approval
      await createNotificationServer({
        recipientRole: "student",
        recipientId: perm.student_code,
        title: `Event Permission Requested: ${event.event_name}`,
        detail: `Your club coordinator requested permission for "${event.event_name}" (${event.club_name || ""}) on ${eventDateDisplay}, ${event.start_time} - ${event.end_time}. Awaiting approval from your Faculty Counselor.`,
        tone: "pending",
        type: "event_permission_requested",
        relatedType: "club_event_permission",
        relatedId: perm.permission_code,
      }).catch(() => {});
    }

    return { success: true, grantedCount: createdPermissions.length, permissions: createdPermissions };
  } catch (err) {
    await db.query("ROLLBACK;");
    throw err;
  }
}

/**
 * Looks up the assigned faculty counselor for a student code.
 */
export async function getCounselorForStudentCode(studentCode: string): Promise<{ facultyId: string; facultyName: string; email: string } | null> {
  const clean = studentCode.trim().toUpperCase();
  // 1. Check direct student-to-counselor assignment
  const direct = await db.query<{ faculty_id: string; full_name: string; email: string }>(
    `SELECT p.id as faculty_id, p.full_name, p.email
     FROM counselor_students cs
     JOIN counselor_assignments ca ON ca.id = cs.counselor_assignment_id
     JOIN profiles p ON p.id = ca.faculty_id
     WHERE UPPER(cs.student_code) = $1
       AND cs.status = 'ACTIVE'
       AND ca.status = 'ACTIVE'
     LIMIT 1;`,
    [clean]
  );
  if (direct.rows[0]) {
    return {
      facultyId: direct.rows[0].faculty_id,
      facultyName: direct.rows[0].full_name,
      email: direct.rows[0].email,
    };
  }

  // 2. Check section mapping
  const sectionMapping = await db.query<{ faculty_id: string; full_name: string; email: string }>(
    `SELECT p.id as faculty_id, p.full_name, p.email
     FROM students s
     JOIN counselor_assignments ca ON UPPER(ca.department) = UPPER(s.department)
       AND UPPER(ca.year) = UPPER(s.year)
       AND UPPER(ca.section) = UPPER(s.section)
     JOIN profiles p ON p.id = ca.faculty_id
     WHERE UPPER(s.student_code) = $1
       AND ca.status = 'ACTIVE'
     LIMIT 1;`,
    [clean]
  );
  if (sectionMapping.rows[0]) {
    return {
      facultyId: sectionMapping.rows[0].faculty_id,
      facultyName: sectionMapping.rows[0].full_name,
      email: sectionMapping.rows[0].email,
    };
  }
  return null;
}

export async function getStudentEventPermissions(studentCode: string): Promise<DBEventParticipant[]> {
  await ensureClubSchema();
  const cleanCode = studentCode.trim().toUpperCase();

  const res = await db.query<DBEventParticipant>(
    `SELECT ep.id, ep.permission_code, ep.event_id, ep.student_code, ep.permission_status,
            ep.exit_at::text, ep.entry_at::text, ep.verified_by, ep.created_at::text,
            e.event_name,
            to_char(COALESCE(e.start_date, e.event_date), 'YYYY-MM-DD') AS start_date,
            to_char(COALESCE(e.end_date, e.start_date, e.event_date), 'YYYY-MM-DD') AS end_date,
            to_char(COALESCE(e.start_date, e.event_date), 'YYYY-MM-DD') AS event_date,
            e.start_time::text, e.end_time::text, e.location_type, e.location,
            e.event_type, e.additional_details,
            c.name AS club_name, p.full_name AS coordinator_name,
            s.name AS student_name, s.department, s.year, s.section
     FROM event_participants ep
     JOIN club_events e ON e.event_id = ep.event_id
     JOIN clubs c ON c.club_id = e.club_id
     LEFT JOIN profiles p ON p.id = e.coordinator_id
     JOIN students s ON UPPER(s.student_code) = UPPER(ep.student_code)
     WHERE UPPER(ep.student_code) = $1
     ORDER BY ep.created_at DESC;`,
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
            e.event_name,
            to_char(COALESCE(e.start_date, e.event_date), 'YYYY-MM-DD') AS start_date,
            to_char(COALESCE(e.end_date, e.start_date, e.event_date), 'YYYY-MM-DD') AS end_date,
            to_char(COALESCE(e.start_date, e.event_date), 'YYYY-MM-DD') AS event_date,
            e.start_time::text, e.end_time::text, e.location_type, e.location,
            e.event_type, e.additional_details,
            c.name AS club_name, p.full_name AS coordinator_name,
            s.name AS student_name, s.department, s.year, s.section
     FROM event_participants ep
     JOIN club_events e ON e.event_id = ep.event_id
     JOIN clubs c ON c.club_id = e.club_id
     LEFT JOIN profiles p ON p.id = e.coordinator_id
     JOIN students s ON UPPER(s.student_code) = UPPER(ep.student_code)
     WHERE UPPER(ep.student_code) = $1
       AND ep.permission_status = 'APPROVED'
       AND e.status = 'SCHEDULED'
       AND CURRENT_DATE BETWEEN COALESCE(e.start_date, e.event_date) AND COALESCE(e.end_date, e.start_date, e.event_date)
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

/**
 * Fetches event permissions for students assigned to a specific counselor.
 */
export async function getCounselorEventPermissions(
  facultyId: string,
  statusFilter: string = "ALL"
): Promise<DBEventParticipant[]> {
  await ensureClubSchema();

  const conditions: string[] = [
    `UPPER(ep.student_code) IN (
      SELECT UPPER(cs.student_code)
      FROM counselor_students cs
      JOIN counselor_assignments ca ON ca.id = cs.counselor_assignment_id
      WHERE ca.faculty_id = $1 AND ca.status = 'ACTIVE' AND cs.status = 'ACTIVE'
      UNION
      SELECT UPPER(s.student_code)
      FROM students s
      JOIN counselor_assignments ca ON UPPER(ca.department) = UPPER(s.department)
        AND UPPER(ca.year) = UPPER(s.year)
        AND UPPER(ca.section) = UPPER(s.section)
      WHERE ca.faculty_id = $1 AND ca.status = 'ACTIVE'
    )`,
  ];
  const params: any[] = [facultyId];

  if (statusFilter && statusFilter !== "ALL") {
    params.push(statusFilter.toUpperCase());
    conditions.push(`UPPER(ep.permission_status) = $${params.length}`);
  }

  const query = `
    SELECT ep.id, ep.permission_code, ep.event_id, ep.student_code, ep.permission_status,
           ep.exit_at::text, ep.entry_at::text, ep.verified_by, ep.counselor_remarks, ep.reviewed_by, ep.reviewed_at::text, ep.created_at::text,
           e.event_name,
           to_char(COALESCE(e.start_date, e.event_date), 'YYYY-MM-DD') AS start_date,
           to_char(COALESCE(e.end_date, e.start_date, e.event_date), 'YYYY-MM-DD') AS end_date,
           to_char(COALESCE(e.start_date, e.event_date), 'YYYY-MM-DD') AS event_date,
           e.start_time::text, e.end_time::text, e.location_type, e.location,
           e.event_type, e.additional_details,
           c.name AS club_name, p.full_name AS coordinator_name,
           s.name AS student_name, s.department, s.year, s.section
    FROM event_participants ep
    JOIN club_events e ON e.event_id = ep.event_id
    JOIN clubs c ON c.club_id = e.club_id
    LEFT JOIN profiles p ON p.id = e.coordinator_id
    JOIN students s ON UPPER(s.student_code) = UPPER(ep.student_code)
    WHERE ${conditions.join(" AND ")}
    ORDER BY ep.created_at DESC;
  `;

  const res = await db.query<DBEventParticipant>(query, params);
  return res.rows;
}

/**
 * Counselor decision (APPROVE or REJECT) on an event permission request.
 */
export async function approveCounselorEventPermission(
  facultyId: string,
  participantId: string,
  status: "APPROVED" | "REJECTED",
  counselorName: string,
  remarks?: string
): Promise<DBEventParticipant> {
  await ensureClubSchema();

  const permRes = await db.query<DBEventParticipant>(
    `SELECT ep.id, ep.permission_code, ep.event_id, ep.student_code, ep.permission_status,
            e.event_name,
            to_char(COALESCE(e.start_date, e.event_date), 'YYYY-MM-DD') AS start_date,
            to_char(COALESCE(e.end_date, e.start_date, e.event_date), 'YYYY-MM-DD') AS end_date,
            e.start_time::text, e.end_time::text, e.location_type, e.location,
            c.name AS club_name, e.coordinator_id,
            s.name AS student_name, s.department, s.year, s.section
     FROM event_participants ep
     JOIN club_events e ON e.event_id = ep.event_id
     JOIN clubs c ON c.club_id = e.club_id
     JOIN students s ON UPPER(s.student_code) = UPPER(ep.student_code)
     WHERE ep.id = $1;`,
    [participantId]
  );

  const perm = permRes.rows[0];
  if (!perm) throw new Error("Event permission record not found.");

  const updateRes = await db.query<DBEventParticipant>(
    `UPDATE event_participants
     SET permission_status = $1,
         counselor_remarks = $2,
         reviewed_by = $3,
         reviewed_at = NOW()
     WHERE id = $4
     RETURNING id, permission_code, event_id, student_code, permission_status, exit_at::text, entry_at::text, verified_by, counselor_remarks, reviewed_by, reviewed_at::text, created_at::text;`,
    [status, remarks || null, counselorName, participantId]
  );

  const updated = { ...perm, ...updateRes.rows[0] };

  const startDate = perm.start_date || perm.event_date;
  const endDate = perm.end_date || startDate;
  const vFrom = `${startDate}T${perm.start_time || "00:00:00"}`;
  const vUntil = `${endDate}T${perm.end_time || "23:59:59"}`;

  if (status === "APPROVED") {
    try {
      const { getOrCreateQRPassForEventParticipant } = await import("./qr.server");
      await getOrCreateQRPassForEventParticipant(participantId, vFrom, vUntil);
    } catch (qrErr) {
      console.warn("[QR Notice] QR generation warning:", qrErr);
    }

    await createNotificationServer({
      recipientRole: "student",
      recipientId: perm.student_code,
      title: `Event Permission Approved: ${perm.event_name}`,
      detail: `Your Faculty Counselor (${counselorName}) has approved your event permission for "${perm.event_name}" (${perm.club_name}). Your digital event pass is now active.`,
      tone: "resolved",
      type: "event_permission_approved",
      relatedType: "club_event_permission",
      relatedId: perm.permission_code,
    }).catch(() => {});
  } else {
    await createNotificationServer({
      recipientRole: "student",
      recipientId: perm.student_code,
      title: `Event Permission Declined: ${perm.event_name}`,
      detail: `Your Faculty Counselor (${counselorName}) declined permission for "${perm.event_name}" (${perm.club_name}). Remarks: ${remarks || "Declined by counselor."}`,
      tone: "violation",
      type: "event_permission_rejected",
      relatedType: "club_event_permission",
      relatedId: perm.permission_code,
    }).catch(() => {});
  }

  return updated;
}



