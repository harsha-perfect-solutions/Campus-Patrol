import { createServerFn } from "@tanstack/react-start";

// Re-export DBNotification type for client-side import type usage (type-only, erased at build time)
export type { DBNotification, UserRecipientContext } from "../db/notifications.server";

// ─── Get My Notifications ────────────────────────────────────────────────

/**
 * Returns all notifications for the authenticated user.
 * Derives userId and role from server session — never from client input.
 * Accurately handles direct user matches, roll numbers, staff codes, and role broadcasts.
 */
export const getMyNotificationsApi = createServerFn({ method: "GET" }).handler(
  async (): Promise<{
    success: boolean;
    notifications: any[];
    error?: string;
  }> => {
    try {
      const { requireAuthenticatedUser } = await import("../session.server");
      const { getNotificationsForUser } = await import("../db/notifications.server");
      const identity = await requireAuthenticatedUser();
      const notifications = await getNotificationsForUser({
        userId: identity.userId,
        role: identity.role,
        studentCode: identity.studentCode,
        staffCode: identity.staffCode,
        department: identity.department,
        fullName: identity.fullName,
        email: identity.email,
      });
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
 * Evaluates both direct notifications and role/department broadcasts.
 */
export const getUnreadNotificationCountApi = createServerFn({ method: "GET" }).handler(
  async (): Promise<{
    success: boolean;
    count: number;
    error?: string;
  }> => {
    try {
      const { requireAuthenticatedUser } = await import("../session.server");
      const { getUnreadCountForUser } = await import("../db/notifications.server");
      const identity = await requireAuthenticatedUser();
      const count = await getUnreadCountForUser({
        userId: identity.userId,
        role: identity.role,
        studentCode: identity.studentCode,
        staffCode: identity.staffCode,
        department: identity.department,
        fullName: identity.fullName,
        email: identity.email,
      });
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
 * Server verifies that notification belongs to or is addressed to the authenticated user.
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
        const { requireAuthenticatedUser } = await import("../session.server");
        const { markNotificationRead } = await import("../db/notifications.server");
        const identity = await requireAuthenticatedUser();
        const updated = await markNotificationRead(data.notifId, {
          userId: identity.userId,
          role: identity.role,
          studentCode: identity.studentCode,
          staffCode: identity.staffCode,
          department: identity.department,
          fullName: identity.fullName,
          email: identity.email,
        });
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
 * Strictly scoped to the authenticated user's identity and assigned role.
 */
export const markAllNotificationsReadApi = createServerFn({ method: "POST" }).handler(
  async (): Promise<{ success: boolean; count?: number; error?: string }> => {
    try {
      const { requireAuthenticatedUser } = await import("../session.server");
      const { markAllNotificationsRead } = await import("../db/notifications.server");
      const identity = await requireAuthenticatedUser();
      const count = await markAllNotificationsRead({
        userId: identity.userId,
        role: identity.role,
        studentCode: identity.studentCode,
        staffCode: identity.staffCode,
        department: identity.department,
        fullName: identity.fullName,
        email: identity.email,
      });
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

// ─── Send Test Notification (Diagnostics & Verification) ─────────────────

/**
 * Sends a live test notification targeted to the currently authenticated user.
 * Immediately pushes to the notification feed and triggers sonner toast in real-time.
 */
export const sendTestNotificationApi = createServerFn({ method: "POST" })
  .validator((data?: { title?: string; detail?: string; tone?: string }) => data || {})
  .handler(async ({ data }): Promise<{ success: boolean; error?: string }> => {
    try {
      const { requireAuthenticatedUser } = await import("../session.server");
      const { createNotificationServer } = await import("../db/notifications.server");
      const identity = await requireAuthenticatedUser();

      const timeStr = new Date().toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      });

      await createNotificationServer({
        recipientUserId: identity.userId,
        recipientRole: identity.role,
        recipientId: identity.studentCode || identity.staffCode || identity.userId,
        department: identity.department,
        type: "info",
        title: data?.title || `Live System Alert (${identity.role.toUpperCase()}) 🔔`,
        detail:
          data?.detail ||
          `Real-time notification test dispatched at ${timeStr}. Connected and operating normally.`,
        tone: (data?.tone as any) || "info",
        relatedId: `test-${Date.now()}`,
        relatedType: "system_test",
      });

      return { success: true };
    } catch (err: any) {
      console.error("[Notifications API] sendTestNotificationApi error:", err);
      return { success: false, error: err.message || "Failed to send test notification." };
    }
  });

const notificationsServerApi = {
  getMyNotificationsApi,
  getUnreadNotificationCountApi,
  markNotificationReadApi,
  markAllNotificationsReadApi,
  sendTestNotificationApi,
};
export default notificationsServerApi;


