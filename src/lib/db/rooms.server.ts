import { db } from "../db.server";

export interface CampusRoom {
  id: string;
  roomCode: string;
  buildingBlock: string;
  floor: string;
  roomType: "Classroom" | "Laboratory" | "Canteen / Cafeteria" | "Parking Zone" | "Sports Field / Ground" | "Library" | "Seminar Hall" | "Auditorium" | "Common Area" | string;
  capacity: number;
  facilities: string[];
  status: "Active" | "Maintenance";
  createdAt?: string | undefined;
  updatedAt?: string | undefined;
}

export interface CreateRoomInput {
  roomCode: string;
  buildingBlock: string;
  floor: string;
  roomType: "Classroom" | "Laboratory" | "Canteen / Cafeteria" | "Parking Zone" | "Sports Field / Ground" | "Library" | "Seminar Hall" | "Auditorium" | "Common Area" | string;
  capacity: number;
  facilities?: string[] | undefined;
  status?: "Active" | "Maintenance" | undefined;
}

export interface UpdateRoomInput {
  roomCode?: string | undefined;
  buildingBlock?: string | undefined;
  floor?: string | undefined;
  roomType?: "Classroom" | "Laboratory" | "Canteen / Cafeteria" | "Parking Zone" | "Sports Field / Ground" | "Library" | "Seminar Hall" | "Auditorium" | "Common Area" | string | undefined;
  capacity?: number | undefined;
  facilities?: string[] | undefined;
  status?: "Active" | "Maintenance" | undefined;
}

export interface RoomFilterOptions {
  buildingBlock?: string | undefined;
  roomType?: string | undefined;
  status?: string | undefined;
  search?: string | undefined;
}

let roomsTableEnsured = false;

export async function ensureRoomsTable(): Promise<void> {
  if (roomsTableEnsured) return;

  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS rooms (
        id TEXT PRIMARY KEY,
        room_code TEXT NOT NULL UNIQUE,
        building_block TEXT NOT NULL,
        floor TEXT NOT NULL,
        room_type TEXT NOT NULL DEFAULT 'Classroom',
        capacity INTEGER NOT NULL DEFAULT 60,
        facilities JSONB NOT NULL DEFAULT '[]'::jsonb,
        status TEXT NOT NULL DEFAULT 'Active',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_rooms_building ON rooms(building_block);
      CREATE INDEX IF NOT EXISTS idx_rooms_type ON rooms(room_type);
      CREATE INDEX IF NOT EXISTS idx_rooms_status ON rooms(status);
      CREATE INDEX IF NOT EXISTS idx_rooms_code ON rooms(room_code);
    `);

    // Seed baseline initial campus rooms if empty
    const checkCount = await db.query<{ count: number }>("SELECT COUNT(*)::int AS count FROM rooms;");
    if (checkCount.rows[0]?.count === 0) {
      const initialRooms = [
        {
          id: "RM-101",
          room_code: "Room C-204",
          building_block: "C-Block (CSE)",
          floor: "2nd Floor",
          room_type: "Classroom",
          capacity: 60,
          facilities: JSON.stringify(["Smartboard", "Projector", "AC", "High-speed LAN"]),
          status: "Active",
        },
        {
          id: "RM-102",
          room_code: "Room C-205",
          building_block: "C-Block (CSE)",
          floor: "2nd Floor",
          room_type: "Classroom",
          capacity: 60,
          facilities: JSON.stringify(["Projector", "AC"]),
          status: "Active",
        },
        {
          id: "RM-103",
          room_code: "Computer Lab 3",
          building_block: "C-Block (CSE)",
          floor: "3rd Floor",
          room_type: "Laboratory",
          capacity: 45,
          facilities: JSON.stringify(["High-Performance Workstations", "AC", "Smartboard", "Gigabit LAN"]),
          status: "Active",
        },
        {
          id: "RM-104",
          room_code: "Room E-102",
          building_block: "E-Block (ECE)",
          floor: "1st Floor",
          room_type: "Classroom",
          capacity: 60,
          facilities: JSON.stringify(["Projector", "AC"]),
          status: "Active",
        },
        {
          id: "RM-105",
          room_code: "Microcontroller Lab 2",
          building_block: "E-Block (ECE)",
          floor: "1st Floor",
          room_type: "Laboratory",
          capacity: 40,
          facilities: JSON.stringify(["Embedded Kits", "Oscilloscopes", "AC", "Projector"]),
          status: "Active",
        },
        {
          id: "RM-106",
          room_code: "Room B-101",
          building_block: "B-Block (EEE)",
          floor: "1st Floor",
          room_type: "Classroom",
          capacity: 65,
          facilities: JSON.stringify(["Projector", "AC"]),
          status: "Active",
        },
        {
          id: "RM-107",
          room_code: "AI Supercomputing Lab",
          building_block: "A-Block (AIML)",
          floor: "3rd Floor",
          room_type: "Laboratory",
          capacity: 50,
          facilities: JSON.stringify(["NVIDIA GPU Workstations", "Smartboard", "AC", "10Gbps Fiber Network"]),
          status: "Active",
        },
        {
          id: "RM-108",
          room_code: "Room A-301",
          building_block: "A-Block (AIML)",
          floor: "3rd Floor",
          room_type: "Classroom",
          capacity: 60,
          facilities: JSON.stringify(["Projector", "AC"]),
          status: "Active",
        },
        {
          id: "RM-109",
          room_code: "Room V-201",
          building_block: "V-Block (CIVIL)",
          floor: "2nd Floor",
          room_type: "Classroom",
          capacity: 60,
          facilities: JSON.stringify(["Projector", "AC"]),
          status: "Active",
        },
        {
          id: "RM-110",
          room_code: "Room M-104",
          building_block: "M-Block (MECH)",
          floor: "1st Floor",
          room_type: "Classroom",
          capacity: 60,
          facilities: JSON.stringify(["Projector", "AC"]),
          status: "Active",
        },
        {
          id: "RM-111",
          room_code: "Mechanical Workshop Lab",
          building_block: "M-Block (MECH)",
          floor: "Ground Floor",
          room_type: "Laboratory",
          capacity: 50,
          facilities: JSON.stringify(["CNC Lathes", "3D Printers", "Safety Gear"]),
          status: "Active",
        },
        {
          id: "RM-112",
          room_code: "Seminar Hall SH-1",
          building_block: "SH-Block (Seminar)",
          floor: "Ground Floor",
          room_type: "Seminar Hall",
          capacity: 180,
          facilities: JSON.stringify(["Dual Projectors", "Surround Sound Audio", "Podium System", "Central AC"]),
          status: "Active",
        },
        {
          id: "RM-LOC-01",
          room_code: "Canteen & Cafeteria",
          building_block: "Common Roaming Area",
          floor: "Ground Level",
          room_type: "Common Area",
          capacity: 250,
          facilities: JSON.stringify(["Food & Dining", "Active Monitoring Zone"]),
          status: "Active",
        },
        {
          id: "RM-LOC-02",
          room_code: "Campus Parking Area",
          building_block: "Common Roaming Area",
          floor: "Ground Level",
          room_type: "Common Area",
          capacity: 400,
          facilities: JSON.stringify(["Parking Zone", "Vehicle Security"]),
          status: "Active",
        },
        {
          id: "RM-LOC-03",
          room_code: "Sports & Athletics Ground",
          building_block: "Common Roaming Area",
          floor: "Ground Level",
          room_type: "Common Area",
          capacity: 500,
          facilities: JSON.stringify(["Sports Field", "Outdoor Track"]),
          status: "Active",
        },
        {
          id: "RM-LOC-04",
          room_code: "Library Corridor & Reading Foyer",
          building_block: "Common Roaming Area",
          floor: "1st Floor",
          room_type: "Common Area",
          capacity: 150,
          facilities: JSON.stringify(["Reading Foyer", "Study Area"]),
          status: "Active",
        },
        {
          id: "RM-LOC-05",
          room_code: "Main Entrance Gate",
          building_block: "Common Roaming Area",
          floor: "Ground Level",
          room_type: "Common Area",
          capacity: 100,
          facilities: JSON.stringify(["Gate & Exit", "Security Turnstiles"]),
          status: "Active",
        },
        {
          id: "RM-LOC-06",
          room_code: "Hostel Quadrangle & Gate",
          building_block: "Common Roaming Area",
          floor: "Ground Level",
          room_type: "Common Area",
          capacity: 200,
          facilities: JSON.stringify(["Hostel Zone", "Residential Entrance"]),
          status: "Active",
        },
        {
          id: "RM-LOC-07",
          room_code: "Administrative Block Corridor",
          building_block: "Common Roaming Area",
          floor: "1st Floor",
          room_type: "Common Area",
          capacity: 100,
          facilities: JSON.stringify(["Admin Zone", "Office Corridor"]),
          status: "Active",
        },
      ];

      for (const r of initialRooms) {
        await db.query(
          `INSERT INTO rooms (id, room_code, building_block, floor, room_type, capacity, facilities, status, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, NOW(), NOW())
           ON CONFLICT (id) DO NOTHING;`,
          [r.id, r.room_code, r.building_block, r.floor, r.room_type, r.capacity, r.facilities, r.status],
        );
      }
    }

    roomsTableEnsured = true;
  } catch (err) {
    console.warn("[Rooms DB Warning] Schema initialization notice:", err);
  }
}

function mapRowToCampusRoom(row: any): CampusRoom {
  let facilities: string[] = [];
  if (Array.isArray(row.facilities)) {
    facilities = row.facilities;
  } else if (typeof row.facilities === "string") {
    try {
      facilities = JSON.parse(row.facilities);
    } catch {
      facilities = [];
    }
  }

  return {
    id: row.id,
    roomCode: row.room_code,
    buildingBlock: row.building_block,
    floor: row.floor,
    roomType: row.room_type,
    capacity: Number(row.capacity),
    facilities,
    status: row.status as "Active" | "Maintenance",
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : undefined,
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : undefined,
  };
}

export async function getCampusRooms(filters: RoomFilterOptions = {}): Promise<CampusRoom[]> {
  await ensureRoomsTable();

  const conditions: string[] = ["1=1"];
  const values: any[] = [];
  let idx = 1;

  if (filters.buildingBlock && filters.buildingBlock !== "ALL") {
    conditions.push(`UPPER(building_block) = UPPER($${idx++})`);
    values.push(filters.buildingBlock.trim());
  }

  if (filters.roomType && filters.roomType !== "ALL") {
    conditions.push(`UPPER(room_type) = UPPER($${idx++})`);
    values.push(filters.roomType.trim());
  }

  if (filters.status && filters.status !== "ALL") {
    conditions.push(`UPPER(status) = UPPER($${idx++})`);
    values.push(filters.status.trim());
  }

  if (filters.search && filters.search.trim()) {
    const term = `%${filters.search.trim()}%`;
    conditions.push(
      `(room_code ILIKE $${idx} OR building_block ILIKE $${idx} OR facilities::text ILIKE $${idx})`,
    );
    idx++;
    values.push(term);
  }

  const query = `
    SELECT id, room_code, building_block, floor, room_type, capacity, facilities, status, created_at, updated_at
    FROM rooms
    WHERE ${conditions.join(" AND ")}
    ORDER BY building_block ASC, room_code ASC;
  `;

  const res = await db.query(query, values);
  return res.rows.map(mapRowToCampusRoom);
}

export async function getRoomById(id: string): Promise<CampusRoom | null> {
  await ensureRoomsTable();
  const cleanId = id.trim();
  const res = await db.query("SELECT * FROM rooms WHERE UPPER(id) = UPPER($1) LIMIT 1;", [cleanId]);
  if (res.rows.length === 0) return null;
  return mapRowToCampusRoom(res.rows[0]);
}

export async function getRoomByCode(roomCode: string): Promise<CampusRoom | null> {
  await ensureRoomsTable();
  const cleanCode = roomCode.trim();
  const res = await db.query("SELECT * FROM rooms WHERE UPPER(room_code) = UPPER($1) LIMIT 1;", [cleanCode]);
  if (res.rows.length === 0) return null;
  return mapRowToCampusRoom(res.rows[0]);
}

export async function createRoom(
  input: CreateRoomInput,
  actorName: string,
  actorRole: string,
): Promise<CampusRoom> {
  await ensureRoomsTable();

  const roomCode = input.roomCode.trim();
  const buildingBlock = input.buildingBlock.trim();
  const floor = input.floor.trim();
  const roomType = input.roomType || "Classroom";
  const capacity = Number(input.capacity);
  const status = input.status || "Active";
  const facilities = input.facilities || ["Projector", "AC"];

  if (!roomCode) throw new Error("Room Code / Identifier is required.");
  if (!buildingBlock) throw new Error("Building Block selection is required.");
  if (!floor) throw new Error("Floor Number is required.");
  if (isNaN(capacity) || capacity < 5 || capacity > 1000) {
    throw new Error("Room capacity must be a valid number between 5 and 1000.");
  }

  // Check duplicate room_code
  const dupCheck = await db.query("SELECT id FROM rooms WHERE UPPER(room_code) = UPPER($1);", [roomCode]);
  if (dupCheck.rows.length > 0) {
    throw new Error(`A room with Code '${roomCode}' already exists in campus registry.`);
  }

  const roomId = `RM-${Date.now().toString().slice(-6)}`;

  const res = await db.query(
    `INSERT INTO rooms (id, room_code, building_block, floor, room_type, capacity, facilities, status, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, NOW(), NOW())
     RETURNING *;`,
    [roomId, roomCode, buildingBlock, floor, roomType, capacity, JSON.stringify(facilities), status],
  );

  const room = mapRowToCampusRoom(res.rows[0]);

  // Audit Log
  await db.query(
    `INSERT INTO audit_logs (actor, actor_role, action, target, target_id, metadata)
     VALUES ($1, $2, 'room_created', 'campus_room', $3, $4);`,
    [
      actorName,
      actorRole,
      room.id,
      JSON.stringify({
        roomCode: room.roomCode,
        buildingBlock: room.buildingBlock,
        floor: room.floor,
        roomType: room.roomType,
        capacity: room.capacity,
        facilities: room.facilities,
      }),
    ],
  );

  return room;
}

export async function updateRoom(
  id: string,
  input: UpdateRoomInput,
  actorName: string,
  actorRole: string,
): Promise<CampusRoom> {
  await ensureRoomsTable();
  const cleanId = id.trim();

  const existing = await getRoomById(cleanId);
  if (!existing) {
    throw new Error(`Room with ID '${cleanId}' not found.`);
  }

  const roomCode = input.roomCode !== undefined ? input.roomCode.trim() : existing.roomCode;
  const buildingBlock = input.buildingBlock !== undefined ? input.buildingBlock.trim() : existing.buildingBlock;
  const floor = input.floor !== undefined ? input.floor.trim() : existing.floor;
  const roomType = input.roomType !== undefined ? input.roomType : existing.roomType;
  const capacity = input.capacity !== undefined ? Number(input.capacity) : existing.capacity;
  const status = input.status !== undefined ? input.status : existing.status;
  const facilities = input.facilities !== undefined ? input.facilities : existing.facilities;

  if (!roomCode) throw new Error("Room Code / Identifier cannot be empty.");
  if (!buildingBlock) throw new Error("Building Block cannot be empty.");
  if (isNaN(capacity) || capacity < 5 || capacity > 1000) {
    throw new Error("Room capacity must be a valid number between 5 and 1000.");
  }

  // Duplicate room_code check if code changed
  if (roomCode.toUpperCase() !== existing.roomCode.toUpperCase()) {
    const dupCheck = await db.query(
      "SELECT id FROM rooms WHERE UPPER(room_code) = UPPER($1) AND UPPER(id) != UPPER($2);",
      [roomCode, cleanId],
    );
    if (dupCheck.rows.length > 0) {
      throw new Error(`Another room with Code '${roomCode}' already exists.`);
    }
  }

  const res = await db.query(
    `UPDATE rooms
     SET room_code = $1, building_block = $2, floor = $3, room_type = $4, capacity = $5, facilities = $6::jsonb, status = $7, updated_at = NOW()
     WHERE UPPER(id) = UPPER($8)
     RETURNING *;`,
    [roomCode, buildingBlock, floor, roomType, capacity, JSON.stringify(facilities), status, cleanId],
  );

  const updatedRoom = mapRowToCampusRoom(res.rows[0]);

  // Audit Log
  await db.query(
    `INSERT INTO audit_logs (actor, actor_role, action, target, target_id, metadata)
     VALUES ($1, $2, 'room_updated', 'campus_room', $3, $4);`,
    [
      actorName,
      actorRole,
      cleanId,
      JSON.stringify({
        roomCode: updatedRoom.roomCode,
        buildingBlock: updatedRoom.buildingBlock,
        floor: updatedRoom.floor,
        roomType: updatedRoom.roomType,
        capacity: updatedRoom.capacity,
        facilities: updatedRoom.facilities,
      }),
    ],
  );

  return updatedRoom;
}

export async function deleteRoom(
  id: string,
  actorName: string,
  actorRole: string,
): Promise<boolean> {
  await ensureRoomsTable();
  const cleanId = id.trim();

  const existing = await getRoomById(cleanId);
  if (!existing) {
    throw new Error(`Room with ID '${cleanId}' not found.`);
  }

  // Dependency check: prevent deleting rooms that are referenced by class_slots in timetable
  const depCheck = await db.query(
    "SELECT id FROM class_slots WHERE UPPER(room) = UPPER($1) OR UPPER(room) = UPPER($2) LIMIT 1;",
    [existing.roomCode, existing.id],
  );
  if (depCheck.rows.length > 0) {
    throw new Error(
      `Cannot delete Room '${existing.roomCode}' because it is assigned to active timetable class slots. Set status to Maintenance instead.`,
    );
  }

  // Delete room
  await db.query("DELETE FROM rooms WHERE UPPER(id) = UPPER($1);", [cleanId]);

  // Audit Log
  await db.query(
    `INSERT INTO audit_logs (actor, actor_role, action, target, target_id, metadata)
     VALUES ($1, $2, 'room_deleted', 'campus_room', $3, $4);`,
    [
      actorName,
      actorRole,
      cleanId,
      JSON.stringify({
        roomCode: existing.roomCode,
        buildingBlock: existing.buildingBlock,
      }),
    ],
  );

  return true;
}
