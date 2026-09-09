import { createServerFn } from "@tanstack/react-start";
import { requireRole, requireAnyRole } from "../session.server";
import {
  getAllClubs,
  createClub,
  updateClub,
  deactivateClub,
  activateClub,
  getClubById,
  assignClubCoordinator,
  removeClubCoordinator,
  getCoordinatedClubsForFaculty,
  getClubMembers,
  addClubMember,
  removeClubMember,
  createClubEvent,
  getClubEvents,
  cancelClubEvent,
  validateEventParticipantsPreflight,
  grantEventPermissionsAtomic,
  getStudentEventPermissions,
  getEventParticipantsServer,
  type DBClub,
  type DBClubCoordinator,
  type DBClubMember,
  type DBClubEvent,
  type DBEventParticipant,
  type DBEventParticipantReportItem,
  type LocationType,
  type EventType,
} from "../db/clubs.server";

export const getAllClubsApi = createServerFn({ method: "GET" }).handler(async () => {
  await requireRole("admin");
  return await getAllClubs();
});

export const createClubApi = createServerFn({ method: "POST" })
  .validator(
    (data: { name: string; club_type: string; description?: string | null; location?: string | null; status?: "ACTIVE" | "INACTIVE" }) => data
  )
  .handler(async ({ data }) => {
    await requireRole("admin");
    return await createClub(data);
  });

export const updateClubApi = createServerFn({ method: "POST" })
  .validator(
    (data: { clubId: string; name?: string; club_type?: string; description?: string | null; location?: string | null; status?: "ACTIVE" | "INACTIVE" }) => data
  )
  .handler(async ({ data }) => {
    await requireRole("admin");
    const { clubId, ...rest } = data;
    return await updateClub(clubId, rest);
  });

export const deactivateClubApi = createServerFn({ method: "POST" })
  .validator((data: { clubId: string }) => data)
  .handler(async ({ data }) => {
    await requireRole("admin");
    return await deactivateClub(data.clubId);
  });

export const activateClubApi = createServerFn({ method: "POST" })
  .validator((data: { clubId: string }) => data)
  .handler(async ({ data }) => {
    await requireRole("admin");
    return await activateClub(data.clubId);
  });

export const assignClubCoordinatorApi = createServerFn({ method: "POST" })
  .validator((data: { clubId: string; facultyId: string }) => data)
  .handler(async ({ data }) => {
    await requireRole("admin");
    return await assignClubCoordinator(data.clubId, data.facultyId);
  });

export const removeClubCoordinatorApi = createServerFn({ method: "POST" })
  .validator((data: { clubId: string; facultyId: string }) => data)
  .handler(async ({ data }) => {
    await requireRole("admin");
    return await removeClubCoordinator(data.clubId, data.facultyId);
  });

export const getMyCoordinatedClubsApi = createServerFn({ method: "GET" }).handler(async () => {
  const session = await requireAnyRole(["faculty", "hod", "admin"]);
  return await getCoordinatedClubsForFaculty(session.userId);
});

export const getClubMembersApi = createServerFn({ method: "POST" })
  .validator((data: { clubId: string; filters?: { year?: string; section?: string; search?: string } }) => data)
  .handler(async ({ data }) => {
    await requireAnyRole(["admin", "faculty"]);
    return await getClubMembers(data.clubId, data.filters);
  });

export const addClubMemberApi = createServerFn({ method: "POST" })
  .validator((data: { clubId: string; studentCode: string }) => data)
  .handler(async ({ data }) => {
    await requireRole("faculty");
    return await addClubMember(data.clubId, data.studentCode);
  });

export const removeClubMemberApi = createServerFn({ method: "POST" })
  .validator((data: { clubId: string; studentCode: string }) => data)
  .handler(async ({ data }) => {
    await requireRole("faculty");
    return await removeClubMember(data.clubId, data.studentCode);
  });

export const createClubEventApi = createServerFn({ method: "POST" })
  .validator(
    (data: {
      club_id: string;
      event_name: string;
      description: string | null;
      event_date: string;
      start_time: string;
      end_time: string;
      location_type: LocationType;
      location: string;
      event_type: EventType;
    }) => data
  )
  .handler(async ({ data }) => {
    const session = await requireRole("faculty");
    return await createClubEvent(session.userId, data);
  });

export const getClubEventsApi = createServerFn({ method: "POST" })
  .validator((data: { clubId: string }) => data)
  .handler(async ({ data }) => {
    await requireAnyRole(["admin", "faculty"]);
    return await getClubEvents(data.clubId);
  });

export const cancelClubEventApi = createServerFn({ method: "POST" })
  .validator((data: { eventId: string; reason?: string }) => data)
  .handler(async ({ data }) => {
    const session = await requireRole("faculty");
    return await cancelClubEvent(session.userId, data.eventId, data.reason);
  });

export const validateEventParticipantsPreflightApi = createServerFn({ method: "POST" })
  .validator((data: { eventId: string; studentCodes: string[] }) => data)
  .handler(async ({ data }) => {
    await requireRole("faculty");
    return await validateEventParticipantsPreflight(data.eventId, data.studentCodes);
  });

export const grantEventPermissionsAtomicApi = createServerFn({ method: "POST" })
  .validator((data: { eventId: string; studentCodes: string[] }) => data)
  .handler(async ({ data }) => {
    const session = await requireRole("faculty");
    return await grantEventPermissionsAtomic(session.userId, data.eventId, data.studentCodes);
  });

export const getMyEventPermissionsApi = createServerFn({ method: "GET" }).handler(async () => {
  const session = await requireRole("student");
  const studentCode = session.studentCode || "23CSE1012";
  return await getStudentEventPermissions(studentCode);
});

export const getEventParticipantsApi = createServerFn({ method: "POST" })
  .validator((data: { eventId: string }) => data)
  .handler(async ({ data }) => {
    const session = await requireAnyRole(["admin", "faculty"]);
    return await getEventParticipantsServer(session, data.eventId);
  });

export default {};
