import { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import {
  getUnreadNotificationCountApi,
  getMyNotificationsApi,
  markNotificationReadApi,
  markAllNotificationsReadApi,
  sendTestNotificationApi,
} from "@/lib/api/notifications.server";
import type { DBNotification } from "@/lib/db/notifications.server";

// ─── Module-level Shared Reactive State ─────────────────────────────────────
// Ensures Bell, Sidebar Badge, Topbar, and Page stay 100% in sync without lag

let globalUnreadCount = 0;
let globalNotifications: DBNotification[] = [];
let globalIsConnected = false;
let globalHasLoadedOnce = false;
const globalSeenNotifIds = new Set<string>();
const globalListeners = new Set<() => void>();

function notifyListeners() {
  globalListeners.forEach((listener) => {
    try {
      listener();
    } catch {
      // ignore
    }
  });
}

export function useRealtimeNotifications() {
  const { session, profile, role } = useAuth();
  const [, setTick] = useState(0);
  const [loading, setLoading] = useState(!globalHasLoadedOnce);

  const userId = profile?.id || session?.user?.id;

  // Re-render this component whenever global state changes
  useEffect(() => {
    const update = () => setTick((t) => t + 1);
    globalListeners.add(update);
    return () => {
      globalListeners.delete(update);
    };
  }, []);

  // Method to handle a newly arrived notification with Sonner alert
  const handleIncomingNotification = useCallback((notif: DBNotification) => {
    if (!notif || !notif.id) return;
    if (globalSeenNotifIds.has(notif.id)) return; // Deduplicate

    globalSeenNotifIds.add(notif.id);

    // Display Sonner toast notification with sound/prominence
    const isUrgent =
      notif.type.includes("emergency") ||
      notif.type.includes("critical") ||
      notif.tone === "violation";

    if (isUrgent) {
      toast.error(notif.title, {
        description: notif.detail,
        duration: 7000,
      });
    } else if (notif.tone === "resolved") {
      toast.success(notif.title, {
        description: notif.detail,
        duration: 5000,
      });
    } else if (notif.tone === "pending") {
      toast.warning(notif.title, {
        description: notif.detail,
        duration: 5000,
      });
    } else {
      toast.info(notif.title, {
        description: notif.detail,
        duration: 5000,
      });
    }
  }, []);

  // Refresh from DB (synchronizes missed notifications)
  const refreshFromDb = useCallback(async () => {
    if (!userId) return;
    try {
      const [countRes, listRes] = await Promise.all([
        getUnreadNotificationCountApi(),
        getMyNotificationsApi(),
      ]);

      if (countRes.success) {
        globalUnreadCount = countRes.count;
      }

      if (listRes.success && Array.isArray(listRes.notifications)) {
        const incoming = listRes.notifications as DBNotification[];

        // If not initial load, dispatch toast for any newly discovered unread notifications
        if (globalHasLoadedOnce) {
          incoming.forEach((n) => {
            if (!globalSeenNotifIds.has(n.id) && !n.read) {
              handleIncomingNotification(n);
            }
          });
        }

        // Record all discovered notification IDs
        incoming.forEach((n) => globalSeenNotifIds.add(n.id));
        globalNotifications = incoming;
        globalHasLoadedOnce = true;
      }

      globalIsConnected = true;
      setLoading(false);
      notifyListeners();
    } catch (err) {
      console.warn("[Realtime Client] Sync notice:", err);
      globalIsConnected = false;
      setLoading(false);
      notifyListeners();
    }
  }, [userId, handleIncomingNotification]);

  // Mark single read
  const markRead = useCallback(async (notifId: string) => {
    if (!notifId) return;
    // Optimistic local update
    globalNotifications = globalNotifications.map((n) =>
      n.id === notifId ? { ...n, read: true } : n,
    );
    globalUnreadCount = Math.max(0, globalUnreadCount - 1);
    notifyListeners();

    try {
      await markNotificationReadApi({ data: { notifId } });
    } catch (err) {
      console.error("[Realtime Client] Failed to mark read:", err);
    }
  }, []);

  // Mark all read
  const markAllRead = useCallback(async () => {
    // Optimistic local update
    globalNotifications = globalNotifications.map((n) => ({ ...n, read: true }));
    globalUnreadCount = 0;
    notifyListeners();

    try {
      await markAllNotificationsReadApi();
      toast.success("All notifications marked as read.");
    } catch (err) {
      console.error("[Realtime Client] Failed to mark all read:", err);
    }
  }, []);

  // Send a live test notification
  const sendTestNotification = useCallback(
    async (title?: string, detail?: string, tone?: string) => {
      try {
        const res = await sendTestNotificationApi({ data: { title, detail, tone } });
        if (res.success) {
          await refreshFromDb();
          return true;
        }
        return false;
      } catch {
        return false;
      }
    },
    [refreshFromDb],
  );

  useEffect(() => {
    if (!userId) {
      globalUnreadCount = 0;
      globalNotifications = [];
      globalIsConnected = false;
      globalHasLoadedOnce = false;
      globalSeenNotifIds.clear();
      notifyListeners();
      return;
    }

    refreshFromDb();

    // Fast polling interval (7s) keeps all tabs and devices synchronized in near real-time
    const pollInterval = setInterval(() => {
      refreshFromDb();
    }, 7000);

    return () => {
      clearInterval(pollInterval);
    };
  }, [userId, refreshFromDb]);

  return {
    unreadCount: globalUnreadCount,
    notifications: globalNotifications,
    loading,
    isConnected: globalIsConnected,
    role,
    markRead,
    markAllRead,
    sendTestNotification,
    refreshFromDb,
    handleIncomingNotification,
  };
}

