import { createServerFn } from "@tanstack/react-start";
import { requireAuthenticatedUser, requireRole, requireAnyRole } from "../session.server";
import {
  getEmergencyIncidents,
  getEmergencyIncidentById,
  getEmergencyStats,
  acknowledgeEmergencyIncident,
  assignEmergencyResponder,
  startEmergencyResponse,
  markEmergencyControlled,
  resolveEmergencyIncident,
  dismissEmergencyIncident,
  addEmergencyResponseNote,
  getEmergencyIncidentTimeline,
  type DBEmergencyIncident,
  type EmergencyStats,
} from "../db/emergency.server";

/**
 * Server API: Retrieves emergency incidents list with role-aware scoping.
 */
export const getEmergencyIncidentsApi = createServerFn({ method: "POST" })
  .validator(
    (d: {
      status?: string | undefined;
      severity?: string | undefined;
      department?: string | undefined;
      category?: string | undefined;
      search?: string | undefined;
    } | undefined) => d,
  )
  .handler(async ({ data }) => {
    const user = await requireAuthenticatedUser();
    const role = user.role;

    if (role !== "admin" && role !== "hod" && role !== "security" && role !== "faculty") {
      throw new Error("Unauthorized to access emergency incidents.");
    }

    const filters = { ...data };
    if (role === "hod") {
      filters.department = user.department;
    }

    const incidents = await getEmergencyIncidents(filters);
    return { success: true, incidents };
  });

/**
 * Server API: Retrieves a single emergency incident record.
 */
export const getEmergencyIncidentByIdApi = createServerFn({ method: "POST" })
  .validator((d: { incidentId: string }) => d)
  .handler(async ({ data }) => {
    const user = await requireAuthenticatedUser();
    const incident = await getEmergencyIncidentById(data.incidentId);

    if (!incident) {
      return { success: false, error: "Incident not found", incident: null };
    }

    if (user.role === "hod" && incident.department !== user.department) {
      return { success: false, error: "Access denied: Department mismatch.", incident: null };
    }

    return { success: true, incident };
  });

/**
 * Server API: Retrieves emergency response KPI metrics.
 */
export const getEmergencyStatsApi = createServerFn({ method: "POST" }).handler(async () => {
  const user = await requireAuthenticatedUser();
  if (user.role !== "admin" && user.role !== "hod" && user.role !== "security") {
    throw new Error("Unauthorized.");
  }

  const stats = await getEmergencyStats();
  return { success: true, stats };
});

/**
 * Server API: Acknowledges an emergency incident.
 */
export const acknowledgeEmergencyIncidentApi = createServerFn({ method: "POST" })
  .validator((d: { incidentId: string }) => d)
  .handler(async ({ data }) => {
    const user = await requireAuthenticatedUser();
    if (user.role !== "admin" && user.role !== "hod" && user.role !== "security") {
      throw new Error("Unauthorized to acknowledge emergency incident.");
    }

    const actorName = user.fullName || user.email;
    const updated = await acknowledgeEmergencyIncident(data.incidentId, actorName, user.role);
    return { success: true, incident: updated };
  });

/**
 * Server API: Assigns an authorized responder to an emergency incident.
 */
export const assignEmergencyResponderApi = createServerFn({ method: "POST" })
  .validator(
    (d: {
      incidentId: string;
      responderId: string;
      responderName: string;
      responderRole: string;
    }) => d,
  )
  .handler(async ({ data }) => {
    const user = await requireAuthenticatedUser();
    if (user.role !== "admin" && user.role !== "hod") {
      throw new Error("Unauthorized: Only Admin and HOD can assign emergency responders.");
    }

    const assignedByName = user.fullName || user.email;
    const updated = await assignEmergencyResponder(
      data.incidentId,
      data.responderId,
      data.responderName,
      data.responderRole,
      assignedByName,
      user.role,
    );
    return { success: true, incident: updated };
  });

/**
 * Server API: Marks active emergency response started at location.
 */
export const startEmergencyResponseApi = createServerFn({ method: "POST" })
  .validator((d: { incidentId: string }) => d)
  .handler(async ({ data }) => {
    const user = await requireAuthenticatedUser();
    if (user.role !== "admin" && user.role !== "hod" && user.role !== "security") {
      throw new Error("Unauthorized.");
    }

    const actorName = user.fullName || user.email;
    const updated = await startEmergencyResponse(data.incidentId, actorName, user.role);
    return { success: true, incident: updated };
  });

/**
 * Server API: Marks situation at location brought under control.
 */
export const markEmergencyControlledApi = createServerFn({ method: "POST" })
  .validator((d: { incidentId: string; controlNotes?: string | undefined }) => d)
  .handler(async ({ data }) => {
    const user = await requireAuthenticatedUser();
    if (user.role !== "admin" && user.role !== "hod" && user.role !== "security") {
      throw new Error("Unauthorized.");
    }

    const actorName = user.fullName || user.email;
    const updated = await markEmergencyControlled(
      data.incidentId,
      actorName,
      user.role,
      data.controlNotes,
    );
    return { success: true, incident: updated };
  });

/**
 * Server API: Resolves an emergency incident with mandatory remarks.
 */
export const resolveEmergencyIncidentApi = createServerFn({ method: "POST" })
  .validator((d: { incidentId: string; resolutionRemarks: string }) => d)
  .handler(async ({ data }) => {
    const user = await requireAuthenticatedUser();
    if (user.role !== "admin" && user.role !== "hod") {
      throw new Error("Unauthorized: Only Admin and HOD can resolve emergency incidents.");
    }

    const actorName = user.fullName || user.email;
    const updated = await resolveEmergencyIncident(
      data.incidentId,
      actorName,
      user.role,
      data.resolutionRemarks,
    );
    return { success: true, incident: updated };
  });

/**
 * Server API: Adds an immutable response note to an emergency incident.
 */
export const addEmergencyResponseNoteApi = createServerFn({ method: "POST" })
  .validator((d: { incidentId: string; note: string }) => d)
  .handler(async ({ data }) => {
    const user = await requireAuthenticatedUser();
    if (user.role !== "admin" && user.role !== "hod" && user.role !== "security") {
      throw new Error("Unauthorized.");
    }

    const actorName = user.fullName || user.email;
    const updated = await addEmergencyResponseNote(
      data.incidentId,
      data.note,
      actorName,
      user.role,
    );
    return { success: true, incident: updated };
  });

/**
 * Server API: Retrieves chronological timeline for an emergency incident.
 */
export const getEmergencyIncidentTimelineApi = createServerFn({ method: "POST" })
  .validator((d: { incidentId: string }) => d)
  .handler(async ({ data }) => {
    const user = await requireAuthenticatedUser();
    if (user.role !== "admin" && user.role !== "hod" && user.role !== "security" && user.role !== "faculty") {
      throw new Error("Unauthorized.");
    }

    const timeline = await getEmergencyIncidentTimeline(data.incidentId);
    return { success: true, timeline };
  });

export default {};
