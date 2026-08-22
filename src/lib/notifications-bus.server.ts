import type { DBNotification } from "./db/notifications.server";

export type NotificationListener = (notification: DBNotification) => void;

export type NotificationSubscriber = {
  id: string;
  userId: string;
  role: string;
  studentCode: string | null;
  department: string | null;
  listener: NotificationListener;
};

const activeSubscribers = new Set<NotificationSubscriber>();

/**
 * Registers an active real-time subscriber (e.g. SSE connection).
 * Returns an unsubscribe callback to remove the client upon disconnect or unmount.
 */
export function subscribeUserNotification(
  userId: string,
  role: string,
  studentCode: string | null,
  department: string | null,
  listener: NotificationListener,
): () => void {
  const sub: NotificationSubscriber = {
    id: `${userId}-${Math.random().toString(36).slice(2)}`,
    userId,
    role,
    studentCode,
    department,
    listener,
  };

  activeSubscribers.add(sub);

  return () => {
    activeSubscribers.delete(sub);
  };
}

/**
 * Returns total count of active real-time subscribers connected.
 */
export function getActiveSubscriberCount(): number {
  return activeSubscribers.size;
}

/**
 * Real-time event publisher: Broadcasts a newly created DB notification to matching subscribers.
 * Strictly enforces recipient matching:
 * 1. Direct recipient match (userId, recipientId, or studentCode).
 * 2. Department match for HOD.
 * 3. Role match for security/admin broadcasts.
 */
export function publishNotificationRealtime(notification: DBNotification): void {
  const targetUser = (notification.recipientUserId || notification.recipientId || "").trim();
  const targetDept = (notification.department || "").trim().toUpperCase();
  const targetRole = (notification.recipientRole || "").trim().toLowerCase();

  activeSubscribers.forEach((sub) => {
    const subUserId = sub.userId.trim();
    const subStudentCode = (sub.studentCode || "").trim().toUpperCase();
    const subDepartment = (sub.department || "").trim().toUpperCase();

    // 1. Direct recipient match
    const isDirectMatch =
      (targetUser.length > 0 &&
        (subUserId === targetUser ||
          (subStudentCode.length > 0 && subStudentCode === targetUser.toUpperCase()))) ||
      (notification.recipientId &&
        (subUserId === notification.recipientId ||
          (subStudentCode.length > 0 &&
            subStudentCode === notification.recipientId.toUpperCase())));

    // 2. Department match for HOD
    const isHodDepartmentMatch =
      sub.role === "hod" &&
      targetRole === "hod" &&
      targetDept.length > 0 &&
      subDepartment.length > 0 &&
      subDepartment === targetDept;

    // 3. Role broadcast (Security / Admin emergency alerts)
    const isRoleBroadcast =
      targetRole.length > 0 &&
      targetRole !== "user" &&
      targetRole !== "student" &&
      (sub.role === targetRole || sub.role === "admin");

    if (isDirectMatch || isHodDepartmentMatch || isRoleBroadcast) {
      try {
        sub.listener(notification);
      } catch (err) {
        console.error("[Notification Bus Error] Failed to send notification to subscriber:", err);
      }
    }
  });
}
