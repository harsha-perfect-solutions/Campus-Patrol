import { createServerFn } from "@tanstack/react-start";
import { requireRole, requireAnyRole } from "../session.server";
import {
  getCampusRooms,
  createRoom,
  updateRoom,
  deleteRoom,
  type CampusRoom,
  type CreateRoomInput,
  type UpdateRoomInput,
  type RoomFilterOptions,
} from "../db/rooms.server";

// ─── 1. Get Campus Rooms Directory ──────────────────────────────────────────
export const getCampusRoomsApi = createServerFn({ method: "POST" })
  .validator((d: RoomFilterOptions | undefined) => d)
  .handler(
    async ({
      data,
    }): Promise<{
      success: boolean;
      rooms: CampusRoom[];
      totalRooms: number;
      totalCapacity: number;
      labsCount: number;
      error?: string;
    }> => {
      try {
        await requireAnyRole(["admin", "hod", "faculty", "security"]);
        const rooms = await getCampusRooms(data || {});

        const totalCapacity = rooms.reduce((sum, r) => sum + r.capacity, 0);
        const labsCount = rooms.filter((r) => r.roomType === "Laboratory").length;

        return {
          success: true,
          rooms,
          totalRooms: rooms.length,
          totalCapacity,
          labsCount,
        };
      } catch (err: any) {
        console.error("[Rooms API Error] getCampusRoomsApi:", err);
        return {
          success: false,
          rooms: [],
          totalRooms: 0,
          totalCapacity: 0,
          labsCount: 0,
          error: err.message || "Failed to fetch campus rooms.",
        };
      }
    },
  );

// ─── 2. Create New Campus Room ──────────────────────────────────────────────
export const createRoomApi = createServerFn({ method: "POST" })
  .validator((d: CreateRoomInput) => d)
  .handler(
    async ({
      data,
    }): Promise<{
      success: boolean;
      room: CampusRoom | null;
      error?: string;
    }> => {
      try {
        const session = await requireRole("admin");
        const room = await createRoom(data, session.fullName, session.role);
        return {
          success: true,
          room,
        };
      } catch (err: any) {
        console.error("[Rooms API Error] createRoomApi:", err);
        return {
          success: false,
          room: null,
          error: err.message || "Failed to register new room.",
        };
      }
    },
  );

// ─── 3. Update Existing Campus Room ─────────────────────────────────────────
export const updateRoomApi = createServerFn({ method: "POST" })
  .validator((d: { id: string; input: UpdateRoomInput }) => d)
  .handler(
    async ({
      data,
    }): Promise<{
      success: boolean;
      room: CampusRoom | null;
      error?: string;
    }> => {
      try {
        const session = await requireRole("admin");
        const room = await updateRoom(data.id, data.input, session.fullName, session.role);
        return {
          success: true,
          room,
        };
      } catch (err: any) {
        console.error("[Rooms API Error] updateRoomApi:", err);
        return {
          success: false,
          room: null,
          error: err.message || "Failed to update room.",
        };
      }
    },
  );

// ─── 4. Delete Campus Room ──────────────────────────────────────────────────
export const deleteRoomApi = createServerFn({ method: "POST" })
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
        await deleteRoom(data.id, session.fullName, session.role);
        return {
          success: true,
        };
      } catch (err: any) {
        console.error("[Rooms API Error] deleteRoomApi:", err);
        return {
          success: false,
          error: err.message || "Failed to remove room.",
        };
      }
    },
  );

export default {};
