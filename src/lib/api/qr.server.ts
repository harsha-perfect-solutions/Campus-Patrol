import { createServerFn } from "@tanstack/react-start";
import { requireRole } from "../session.server";
import {
  getOrCreateQRPassForMovementPermission,
  getOrCreateQRPassForEventParticipant,
} from "../db/qr.server";

/**
 * Server function: Get or create a valid QR token for an approved
 * movement permission. Called by the student passes page to obtain
 * the real CMADMS:QR:<hex> token that the security scanner verifies.
 */
export const getOrCreateMovementQRPassApi = createServerFn({ method: "POST" })
  .validator(
    (data: { permissionId: string; validFrom: string; validUntil: string }) => {
      const permissionId =
        typeof data?.permissionId === "string" ? data.permissionId.trim() : "";
      const validFrom =
        typeof data?.validFrom === "string" ? data.validFrom.trim() : "";
      const validUntil =
        typeof data?.validUntil === "string" ? data.validUntil.trim() : "";
      if (!permissionId)
        throw new Error("permissionId is required to generate a QR pass.");
      return { permissionId, validFrom, validUntil };
    },
  )
  .handler(
    async ({
      data,
    }): Promise<{
      success: boolean;
      qrToken?: string;
      qrPassId?: string;
      error?: string;
    }> => {
      try {
        // Only students may call this
        await requireRole("student");

        // Build ISO datetime strings if bare time strings (HH:MM) are provided
        const today = new Date().toISOString().split("T")[0]!;
        const validFromIso = data.validFrom.includes("T")
          ? data.validFrom
          : `${today}T${data.validFrom}:00+05:30`;
        const validUntilIso = data.validUntil.includes("T")
          ? data.validUntil
          : `${today}T${data.validUntil}:00+05:30`;

        const result = await getOrCreateQRPassForMovementPermission(
          data.permissionId,
          validFromIso,
          validUntilIso,
        );

        return {
          success: true,
          qrToken: result.qrToken,
          qrPassId: result.qrPassId,
        };
      } catch (err: any) {
        console.error("[QR API Error] getOrCreateMovementQRPassApi:", err);
        return {
          success: false,
          error: err.message || "Failed to generate QR pass token.",
        };
      }
    },
  );

/**
 * Server function: Get or create a valid QR token for an approved
 * club event participant entry. Called by the student event-permissions
 * page to show a scannable QR for club/event gate verification.
 */
export const getOrCreateEventQRPassApi = createServerFn({ method: "POST" })
  .validator(
    (data: {
      eventParticipantId: string;
      validFrom: string;
      validUntil: string;
    }) => {
      const eventParticipantId =
        typeof data?.eventParticipantId === "string"
          ? data.eventParticipantId.trim()
          : "";
      const validFrom =
        typeof data?.validFrom === "string" ? data.validFrom.trim() : "";
      const validUntil =
        typeof data?.validUntil === "string" ? data.validUntil.trim() : "";
      if (!eventParticipantId)
        throw new Error(
          "eventParticipantId is required to generate an event QR pass.",
        );
      return { eventParticipantId, validFrom, validUntil };
    },
  )
  .handler(
    async ({
      data,
    }): Promise<{
      success: boolean;
      qrToken?: string;
      qrPassId?: string;
      error?: string;
    }> => {
      try {
        await requireRole("student");

        const today = new Date().toISOString().split("T")[0]!;
        const validFromIso = data.validFrom.includes("T")
          ? data.validFrom
          : `${today}T${data.validFrom}:00+05:30`;
        const validUntilIso = data.validUntil.includes("T")
          ? data.validUntil
          : `${today}T${data.validUntil}:00+05:30`;

        const result = await getOrCreateQRPassForEventParticipant(
          data.eventParticipantId,
          validFromIso,
          validUntilIso,
        );

        return {
          success: true,
          qrToken: result.qrToken,
          qrPassId: result.qrPassId,
        };
      } catch (err: any) {
        console.error("[QR API Error] getOrCreateEventQRPassApi:", err);
        return {
          success: false,
          error: err.message || "Failed to generate event QR pass token.",
        };
      }
    },
  );
