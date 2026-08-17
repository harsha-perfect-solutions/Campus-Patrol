import { createServerFn } from "@tanstack/react-start";
import { requireAuthenticatedUser } from "../session.server";
import {
  getNotificationsForUser,
  getUnreadCountForUser,
  markNotificationRead,
  markAllNotificationsRead,
  type DBNotification,
} from "../db/notifications.server";

// ─── Get My Notifications ────────────────────────────────────────────────

/**
 * Returns all notifications for the authenticated user.
 * Derives userId from server session — never from client input.
 * Each user sees ONLY their own notifications (recipient_user_id = session.userId).
 */
export const getMyNotificationsApi = createServerFn({ method: "GET" }).handler(
  async (): Promise<{
    success: boolean;
    notifications: DBNotification[];
    error?: string;
  }> => {
    try {
      const identity = await requireAuthenticatedUser();
      const notifications = await getNotificationsForUser(
        identity.userId,
        identity.role,
        identity.studentCode,
      );
      return { success: true, notifications };
    } catch (err: any) {
      console.error("[Notifications API] getMyNotificationsApi error:", err);
      return {
        success: false,
        notifications: [],
        error: err.message || "Failed to fetch notifications.",
      };
    }
  },
);

// ─── Unread Count ────────────────────────────────────────────────────────

/**
 * Returns the unread notification count for the authenticated user.
 * Efficient COUNT query using partial index.
 */
export const getUnreadNotificationCountApi = createServerFn({ method: "GET" }).handler(
  async (): Promise<{
    success: boolean;
    count: number;
    error?: string;
  }> => {
    try {
      const identity = await requireAuthenticatedUser();
      const count = await getUnreadCountForUser(identity.userId, identity.studentCode);
      return { success: true, count };
    } catch (err: any) {
      console.error("[Notifications API] getUnreadNotificationCountApi error:", err);
      return { success: false, count: 0, error: err.message };
    }
  },
);

// ─── Mark Single Notification Read ─────────────────────────────────────

/**
 * Marks a single notification as read.
 * Server verifies that notification belongs to the authenticated user.
 * A user cannot mark another user's notification as read.
 */
export const markNotificationReadApi = createServerFn({ method: "POST" })
  .validator((data: { notifId: string }) => {
    const notifId = typeof data?.notifId === "string" ? data.notifId.trim() : "";
    if (!notifId) throw new Error("Notification ID is required.");
    return { notifId };
  })
  .handler(
    async ({ data }): Promise<{ success: boolean; error?: string }> => {
      try {
        const identity = await requireAuthenticatedUser();
        const updated = await markNotificationRead(
          data.notifId,
          identity.userId,
          identity.studentCode,
        );
        if (!updated) {
          return {
            success: false,
            error: "Notification not found or access denied.",
          };
        }
        return { success: true };
      } catch (err: any) {
        console.error("[Notifications API] markNotificationReadApi error:", err);
        return { success: false, error: err.message || "Failed to mark notification as read." };
      }
    },
  );

// ─── Mark All Notifications Read ────────────────────────────────────────

/**
 * Marks all notifications for the authenticated user as read.
 * Strictly scoped to the authenticated user.
 */
export const markAllNotificationsReadApi = createServerFn({ method: "POST" }).handler(
  async (): Promise<{ success: boolean; count?: number; error?: string }> => {
    try {
      const identity = await requireAuthenticatedUser();
      const count = await markAllNotificationsRead(identity.userId, identity.studentCode);
      return { success: true, count };
    } catch (err: any) {
      console.error("[Notifications API] markAllNotificationsReadApi error:", err);
      return {
        success: false,
        error: err.message || "Failed to mark all notifications as read.",
      };
    }
  },
);
