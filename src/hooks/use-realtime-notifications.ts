import { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import {
  getUnreadNotificationCountApi,
  getMyNotificationsApi,
} from "@/lib/api/notifications.server";
import type { DBNotification } from "@/lib/db/notifications.server";

export function useRealtimeNotifications() {
  const { session, profile } = useAuth();
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [notifications, setNotifications] = useState<DBNotification[]>([]);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const seenNotifIds = useRef<Set<string>>(new Set());

  const userId = profile?.id || session?.user?.id;

  // Refresh from DB (synchronizes missed notifications)
  const refreshFromDb = useCallback(async () => {
    if (!userId) return;
    try {
      const [countRes, listRes] = await Promise.all([
        getUnreadNotificationCountApi(),
        getMyNotificationsApi(),
      ]);

      if (countRes.success) {
        setUnreadCount(countRes.count);
      }
      if (listRes.success && listRes.notifications) {
        setNotifications(listRes.notifications);
        listRes.notifications.forEach((n) => seenNotifIds.current.add(n.id));
      }
    } catch (err) {
      console.error("[Realtime Client Error] Failed to sync notifications:", err);
    }
  }, [userId]);

  // Method to handle a newly arrived notification
  const handleIncomingNotification = useCallback((notif: DBNotification) => {
    if (!notif || !notif.id) return;
    if (seenNotifIds.current.has(notif.id)) return; // Deduplicate

    seenNotifIds.current.add(notif.id);

    setNotifications((prev) => [notif, ...prev.filter((p) => p.id !== notif.id)]);
    if (!notif.read) {
      setUnreadCount((prev) => prev + 1);
    }

    // Display Sonner toast notification
    const isUrgent =
      notif.type.includes("emergency") ||
      notif.type.includes("critical") ||
      notif.tone === "violation";

    if (isUrgent) {
      toast.error(notif.title, {
        description: notif.detail,
        duration: 6000,
      });
    } else if (notif.tone === "resolved") {
      toast.success(notif.title, {
        description: notif.detail,
        duration: 4500,
      });
    } else {
      toast.info(notif.title, {
        description: notif.detail,
        duration: 4500,
      });
    }
  }, []);

  useEffect(() => {
    if (!userId) {
      setUnreadCount(0);
      setNotifications([]);
      setIsConnected(false);
      return;
    }

    refreshFromDb();

    // Polling fallback interval (15s) when offline / synchronizing
    const pollInterval = setInterval(() => {
      refreshFromDb();
    }, 15000);

    return () => {
      clearInterval(pollInterval);
    };
  }, [userId, refreshFromDb]);

  return {
    unreadCount,
    notifications,
    isConnected,
    setUnreadCount,
    setNotifications,
    handleIncomingNotification,
    refreshFromDb,
  };
}
