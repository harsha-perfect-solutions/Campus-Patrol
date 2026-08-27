import { db } from "../db.server";

export interface CleanupResult {
  deletedCount: number;
  success: boolean;
  error?: string;
}

/**
 * Idempotently cleans up expired user sessions from user_sessions table in PostgreSQL.
 * Deletes ONLY sessions whose expires_at timestamp is in the past (expires_at < NOW()).
 * Active sessions (expires_at > NOW()) are completely protected.
 */
export async function cleanupExpiredSessions(): Promise<CleanupResult> {
  try {
    const query = `
      DELETE FROM user_sessions
      WHERE expires_at < NOW()
      RETURNING session_id;
    `;
    const res = await db.query(query);
    const deletedCount = res.rows ? res.rows.length : 0;

    if (deletedCount > 0) {
      console.log(`[Session Maintenance] Successfully purged ${deletedCount} expired session(s).`);
    } else {
      console.log(`[Session Maintenance] Routine check complete: 0 expired sessions found.`);
    }

    return { deletedCount, success: true };
  } catch (error: any) {
    // Log server-side error without crashing or exposing database details to users
    console.error("[Session Maintenance Error] Failed to purge expired sessions:", error?.message || error);
    return {
      deletedCount: 0,
      success: false,
      error: "Internal maintenance error",
    };
  }
}

const SCHEDULER_SYMBOL = Symbol.for("cmadms.sessionMaintenanceScheduler");
const ONE_HOUR_MS = 60 * 60 * 1000; // 1 hour

interface SchedulerState {
  intervalId: NodeJS.Timeout | null;
  intervalMs: number;
  startedAt: string;
}

function getGlobalState(): { [SCHEDULER_SYMBOL]?: SchedulerState } {
  return globalThis as unknown as { [SCHEDULER_SYMBOL]?: SchedulerState };
}

/**
 * Starts the server-side session maintenance scheduler.
 * Executes cleanup once every hour (or specified intervalMs).
 * Guards against execution in browser environments and prevents duplicate
 * interval initializations during development Hot Module Replacement (HMR).
 */
export function startSessionMaintenanceScheduler(intervalMs: number = ONE_HOUR_MS): boolean {
  // Prevent execution in browser environments
  if (typeof window !== "undefined") {
    return false;
  }

  const g = getGlobalState();
  const existing = g[SCHEDULER_SYMBOL];

  // Prevent duplicate scheduler initialization
  if (existing?.intervalId != null) {
    return false;
  }

  console.log(`[Session Maintenance Scheduler] Starting background cleanup job (interval: ${intervalMs}ms)...`);

  const intervalId = setInterval(() => {
    cleanupExpiredSessions().catch((err) => {
      console.error("[Session Maintenance Scheduler Error] Unexpected error in scheduled cleanup:", err);
    });
  }, intervalMs);

  // Prevent Node.js process from being kept alive solely by timer if unref is available
  if (intervalId && typeof intervalId.unref === "function") {
    intervalId.unref();
  }

  g[SCHEDULER_SYMBOL] = {
    intervalId,
    intervalMs,
    startedAt: new Date().toISOString(),
  };

  return true;
}

/**
 * Stops the server-side session maintenance scheduler if running.
 */
export function stopSessionMaintenanceScheduler(): boolean {
  const g = getGlobalState();
  const existing = g[SCHEDULER_SYMBOL];

  if (existing?.intervalId != null) {
    clearInterval(existing.intervalId);
    delete g[SCHEDULER_SYMBOL];
    console.log("[Session Maintenance Scheduler] Stopped background cleanup job.");
    return true;
  }

  return false;
}

/**
 * Checks if the session maintenance scheduler is currently running.
 */
export function isSessionMaintenanceSchedulerRunning(): boolean {
  if (typeof window !== "undefined") return false;
  const g = getGlobalState();
  return g[SCHEDULER_SYMBOL]?.intervalId != null;
}

// Auto-start scheduler when running on server side
if (typeof window === "undefined") {
  startSessionMaintenanceScheduler();
}
