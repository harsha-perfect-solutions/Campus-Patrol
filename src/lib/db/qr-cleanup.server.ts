import { db } from "../db.server";
import { ensureQRPassSchema } from "./qr.server";

let cleanupIntervalId: ReturnType<typeof setInterval> | null = null;

/**
 * Marks all ACTIVE qr_passes whose valid_until has passed as EXPIRED.
 * Returns the count of passes expired.
 */
export async function expireStaleQRPasses(): Promise<number> {
  try {
    await ensureQRPassSchema();
    const res = await db.query(`
      UPDATE qr_passes
      SET status = 'EXPIRED'
      WHERE status = 'ACTIVE'
        AND valid_until < NOW()
      RETURNING id;
    `);
    const count = res.rowCount ?? 0;
    if (count > 0) {
      console.log(`[QR Cleanup] Expired ${count} stale QR pass(es).`);
    }
    return count;
  } catch (err) {
    console.warn("[QR Cleanup] Error during expiry sweep:", err);
    return 0;
  }
}

/**
 * Starts a background interval that sweeps expired QR passes every 10 minutes.
 * Safe to call multiple times — only one interval will be active.
 */
export function startQRCleanupJob(): void {
  if (cleanupIntervalId) return;

  // Run immediately on startup
  expireStaleQRPasses().catch(() => {});

  // Then every 10 minutes
  cleanupIntervalId = setInterval(
    () => expireStaleQRPasses().catch(() => {}),
    10 * 60 * 1000,
  );

  console.log("[QR Cleanup] Background expiry job started (interval: 10 min).");
}

/**
 * Stops the background cleanup job (useful for graceful shutdown).
 */
export function stopQRCleanupJob(): void {
  if (cleanupIntervalId) {
    clearInterval(cleanupIntervalId);
    cleanupIntervalId = null;
    console.log("[QR Cleanup] Background expiry job stopped.");
  }
}
