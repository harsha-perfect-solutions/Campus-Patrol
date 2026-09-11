import crypto from "crypto";
import { db } from "../db.server";
import type { ServerSession } from "../session.server";
import { requireSecuritySession, type VerificationResultPayload } from "./security.server";
import { publishNotificationRealtime } from "../notifications-bus.server";
import { createNotificationServer, findStudentUserIdByCode } from "./notifications.server";

export type QRPassType = "NORMAL_MOVEMENT" | "CLUB_EVENT";
export type QRPassStatus = "ACTIVE" | "REVOKED" | "EXPIRED";

export type DBQRPass = {
  id: string;
  pass_type: QRPassType;
  movement_permission_id: string | null;
  event_participant_id: string | null;
  qr_token: string;
  token_hash: string;
  status: QRPassStatus;
  valid_from: string;
  valid_until: string;
  created_at: string;
  revoked_at: string | null;
};

let qrSchemaEnsured = false;
const lastScanTracker = new Map<string, number>();

/**
 * Ensures PostgreSQL qr_passes table exists with proper foreign keys and index constraints.
 */
export async function ensureQRPassSchema(): Promise<void> {
  if (qrSchemaEnsured) return;
  try {
    const checkTable = await db.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name = 'qr_passes' LIMIT 1;`
    );

    if (checkTable.rows.length === 0) {
      await db.query(`
        CREATE TABLE qr_passes (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          pass_type TEXT NOT NULL,
          movement_permission_id UUID REFERENCES movement_permissions(id) ON DELETE CASCADE,
          event_participant_id UUID REFERENCES event_participants(id) ON DELETE CASCADE,
          qr_token TEXT NOT NULL,
          token_hash TEXT NOT NULL UNIQUE,
          status TEXT NOT NULL DEFAULT 'ACTIVE',
          valid_from TIMESTAMPTZ NOT NULL,
          valid_until TIMESTAMPTZ NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          revoked_at TIMESTAMPTZ
        );
      `);

      await db.query(`CREATE INDEX IF NOT EXISTS idx_qr_passes_token_hash ON qr_passes(token_hash);`);
      await db.query(`CREATE INDEX IF NOT EXISTS idx_qr_passes_movement_id ON qr_passes(movement_permission_id);`);
      await db.query(`CREATE INDEX IF NOT EXISTS idx_qr_passes_event_id ON qr_passes(event_participant_id);`);
    }

    qrSchemaEnsured = true;
  } catch (err) {
    console.warn("[QR Schema Notice] Table setup notice:", err);
  }
}

// Initialize schema on load
ensureQRPassSchema().catch(() => {});

/**
 * SHA-256 token hashing helper.
 */
export function hashQRToken(token: string): string {
  const clean = (token || "").trim();
  return crypto.createHash("sha256").update(clean).digest("hex");
}

/**
 * Generates an opaque, cryptographically random QR token string.
 */
export function generateOpaqueQRToken(): string {
  const randomHex = crypto.randomBytes(16).toString("hex");
  return `CMADMS:QR:${randomHex}`;
}

/**
 * Gets or creates an active QR Pass for a Normal Movement Permission.
 */
export async function getOrCreateQRPassForMovementPermission(
  movementPermissionId: string,
  validFromIso: string,
  validUntilIso: string
): Promise<{ qrToken: string; qrPassId: string }> {
  await ensureQRPassSchema();
  const cleanId = movementPermissionId.trim();

  // Check existing active pass
  const existingRes = await db.query(
    `SELECT id::text, qr_token FROM qr_passes WHERE movement_permission_id = $1 AND status = 'ACTIVE' LIMIT 1;`,
    [cleanId]
  );

  if (existingRes.rows[0]) {
    return {
      qrToken: existingRes.rows[0].qr_token,
      qrPassId: existingRes.rows[0].id,
    };
  }

  const rawToken = generateOpaqueQRToken();
  const tokenHash = hashQRToken(rawToken);

  const insertRes = await db.query(
    `INSERT INTO qr_passes (
       pass_type, movement_permission_id, qr_token, token_hash, status, valid_from, valid_until
     ) VALUES ('NORMAL_MOVEMENT', $1, $2, $3, 'ACTIVE', $4, $5)
     RETURNING id::text, qr_token;`,
    [cleanId, rawToken, tokenHash, validFromIso, validUntilIso]
  );

  return {
    qrToken: insertRes.rows[0].qr_token,
    qrPassId: insertRes.rows[0].id,
  };
}

/**
 * Gets or creates an active QR Pass for a Club Event Participant Permission.
 */
export async function getOrCreateQRPassForEventParticipant(
  eventParticipantId: string,
  validFromIso: string,
  validUntilIso: string
): Promise<{ qrToken: string; qrPassId: string }> {
  await ensureQRPassSchema();
  const cleanId = eventParticipantId.trim();

  const existingRes = await db.query(
    `SELECT id::text, qr_token FROM qr_passes WHERE event_participant_id = $1 AND status = 'ACTIVE' LIMIT 1;`,
    [cleanId]
  );

  if (existingRes.rows[0]) {
    return {
      qrToken: existingRes.rows[0].qr_token,
      qrPassId: existingRes.rows[0].id,
    };
  }

  const rawToken = generateOpaqueQRToken();
  const tokenHash = hashQRToken(rawToken);

  const insertRes = await db.query(
    `INSERT INTO qr_passes (
       pass_type, event_participant_id, qr_token, token_hash, status, valid_from, valid_until
     ) VALUES ('CLUB_EVENT', $1, $2, $3, 'ACTIVE', $4, $5)
     RETURNING id::text, qr_token;`,
    [cleanId, rawToken, tokenHash, validFromIso, validUntilIso]
  );

  return {
    qrToken: insertRes.rows[0].qr_token,
    qrPassId: insertRes.rows[0].id,
  };
}

/**
 * Revokes a QR pass when its parent permission is cancelled or rejected.
 */
export async function revokeQRPassByPermission(
  type: QRPassType,
  permissionId: string
): Promise<void> {
  await ensureQRPassSchema();
  const cleanId = permissionId.trim();

  if (type === "NORMAL_MOVEMENT") {
    await db.query(
      `UPDATE qr_passes SET status = 'REVOKED', revoked_at = NOW() WHERE movement_permission_id = $1 AND status = 'ACTIVE';`,
      [cleanId]
    );
  } else {
    await db.query(
      `UPDATE qr_passes SET status = 'REVOKED', revoked_at = NOW() WHERE event_participant_id = $1 AND status = 'ACTIVE';`,
      [cleanId]
    );
  }
}

/**
 * Authoritative, server-side Real-Time QR Verification Engine.
 * Supports NORMAL_MOVEMENT and CLUB_EVENT QR types.
 */
export async function verifyQRTokenServer(
  session: ServerSession,
  rawToken: string,
  checkpoint?: string,
  bypassCooldown = false
): Promise<VerificationResultPayload> {
  const { requireSecuritySessionWithGate } = await import("./security.server");
  const { assignedGate } = await requireSecuritySessionWithGate(session);
  await ensureQRPassSchema();

  if (checkpoint && checkpoint.trim().toLowerCase() !== assignedGate.trim().toLowerCase()) {
    throw new Error(`Forbidden: Access denied to gate '${checkpoint}'. Your assigned gate is '${assignedGate}'.`);
  }

  const timestamp = new Date().toISOString();
  const cleanToken = (rawToken || "").trim();
  const activeCheckpoint = assignedGate;

  if (!cleanToken) {
    return {
      success: true,
      authorized: false,
      resultStatus: "ACCESS DENIED",
      failureReason: "Empty QR token provided.",
      message: "Student is NOT authorized.",
      timestamp,
    };
  }

  const tokenHash = hashQRToken(cleanToken);

  // Backend duplicate scan cooldown (prevent identical hits within 4 seconds)
  if (!bypassCooldown) {
    const scanKey = `${session.email}:${tokenHash}`;
    const nowMs = Date.now();
    const lastScan = lastScanTracker.get(scanKey);
    if (lastScan && nowMs - lastScan < 4000) {
      return {
        success: true,
        authorized: false,
        resultStatus: "DUPLICATE SCAN IGNORED",
        failureReason: "Recent duplicate scan detected within 4 seconds.",
        message: "Duplicate scan request suppressed by server.",
        timestamp,
      };
    }
    lastScanTracker.set(scanKey, nowMs);
  }

  // Query database for QR Pass and joined permissions
  const query = `
    SELECT 
      q.id::text AS qr_pass_id,
      q.pass_type,
      q.status AS qr_status,
      q.movement_permission_id::text AS movement_permission_id,
      q.event_participant_id::text AS event_participant_id,
      q.valid_from AS q_valid_from,
      q.valid_until AS q_valid_until,
      
      -- Normal Movement fields
      mp.student_code AS mp_student_code,
      mp.reason AS mp_reason,
      to_char(mp.date, 'YYYY-MM-DD') AS mp_date,
      mp.valid_from::text AS mp_valid_from,
      mp.valid_until::text AS mp_valid_until,
      mp.status AS mp_status,
      mp.issued_by AS mp_issued_by,
      mp.exit_at::text AS mp_exit_at,
      mp.entry_at::text AS mp_entry_at,
      mp.revoked_at::text AS mp_revoked_at,
      mp.cancelled_at::text AS mp_cancelled_at,

      -- Club Event fields
      ep.student_code AS ep_student_code,
      ep.permission_code AS ep_permission_code,
      ep.permission_status AS ep_status,
      ep.exit_at::text AS ep_exit_at,
      ep.entry_at::text AS ep_entry_at,
      ce.event_name,
      ce.event_date::text AS event_date,
      ce.start_time::text AS event_start_time,
      ce.end_time::text AS event_end_time,
      ce.location_type,
      ce.location,
      c.name AS club_name,
      p.full_name AS coordinator_name

    FROM qr_passes q
    LEFT JOIN movement_permissions mp ON q.movement_permission_id = mp.id
    LEFT JOIN event_participants ep ON q.event_participant_id = ep.id
    LEFT JOIN club_events ce ON ep.event_id = ce.event_id
    LEFT JOIN clubs c ON ce.club_id = c.club_id
    LEFT JOIN profiles p ON ce.coordinator_id = p.id
    WHERE q.token_hash = $1
    LIMIT 1;
  `;

  const res = await db.query(query, [tokenHash]);
  const passRow = res.rows[0];

  if (!passRow) {
    return {
      success: true,
      authorized: false,
      resultStatus: "ACCESS DENIED",
      failureReason: "Invalid or unrecognized QR token.",
      message: "QR code not found in security database.",
      timestamp,
    };
  }

  // Check QR status
  if (passRow.qr_status === "REVOKED") {
    return {
      success: true,
      authorized: false,
      resultStatus: "ACCESS DENIED",
      failureReason: "QR pass has been revoked or cancelled.",
      message: "Permission for this QR pass was revoked.",
      timestamp,
    };
  }

  if (passRow.qr_status === "EXPIRED") {
    return {
      success: true,
      authorized: false,
      resultStatus: "ACCESS DENIED",
      failureReason: "QR pass has expired.",
      message: "This QR pass has already expired.",
      timestamp,
    };
  }

  const studentCode = (passRow.mp_student_code || passRow.ep_student_code || "").trim().toUpperCase();

  // Validate student account status
  const stRes = await db.query(
    `SELECT student_code, name, department, year, section, status FROM students WHERE UPPER(student_code) = UPPER($1) LIMIT 1;`,
    [studentCode]
  );
  const student = stRes.rows[0];

  if (!student) {
    return {
      success: true,
      authorized: false,
      resultStatus: "ACCESS DENIED",
      failureReason: `Student code "${studentCode}" not found in database.`,
      message: "Student account record missing.",
      timestamp,
    };
  }

  if (student.status && student.status.toLowerCase() !== "active") {
    return {
      success: true,
      authorized: false,
      resultStatus: "ACCESS DENIED",
      failureReason: `Student account status is "${student.status}". Only ACTIVE students are authorized.`,
      message: "Student account is inactive/suspended.",
      timestamp,
    };
  }

  // ----------------------------------------------------
  // BRANCH 1: NORMAL MOVEMENT QR
  // ----------------------------------------------------
  if (passRow.pass_type === "NORMAL_MOVEMENT") {
    if (!passRow.mp_status || passRow.mp_status.toLowerCase() !== "approved") {
      return {
        success: true,
        authorized: false,
        resultStatus: "ACCESS DENIED",
        failureReason: `Movement pass status is "${passRow.mp_status || "PENDING"}".`,
        message: "Movement pass is not approved.",
        timestamp,
      };
    }

    if (passRow.mp_cancelled_at || passRow.mp_revoked_at) {
      return {
        success: true,
        authorized: false,
        resultStatus: "ACCESS DENIED",
        failureReason: "Movement pass was cancelled or revoked by administrator.",
        message: "Pass has been revoked.",
        timestamp,
      };
    }

    // Determine EXIT vs ENTRY
    let verificationType: "EXIT" | "ENTRY" = "EXIT";

    if (passRow.mp_exit_at && passRow.mp_entry_at) {
      return {
        success: true,
        authorized: false,
        resultStatus: "ACCESS DENIED",
        failureReason: "Movement pass has already been completed (both EXIT and ENTRY recorded).",
        message: "Movement pass already completed.",
        timestamp,
      };
    }

    if (passRow.mp_exit_at && !passRow.mp_entry_at) {
      verificationType = "ENTRY";
    }

    // Server Date & Time Validation for EXIT
    if (verificationType === "EXIT") {
      const todayStr = new Date().toISOString().split("T")[0]!;
      if (passRow.mp_date < todayStr) {
        return {
          success: true,
          authorized: false,
          resultStatus: "PASS EXPIRED",
          failureReason: `Pass was scheduled for date ${passRow.mp_date} (expired).`,
          message: "Pass date has passed.",
          timestamp,
        };
      }
      if (passRow.mp_date > todayStr) {
        return {
          success: true,
          authorized: false,
          resultStatus: "PASS NOT STARTED",
          failureReason: `Pass is scheduled for future date ${passRow.mp_date}.`,
          message: "Pass is not active today.",
          timestamp,
        };
      }
    }

    // Perform atomic database update for movement permission
    if (verificationType === "EXIT") {
      await db.query(
        `UPDATE movement_permissions
         SET exit_at = NOW(), checkpoint = $1, verified_by = $2
         WHERE id::text = $3;`,
        [activeCheckpoint, session.fullName || session.email, passRow.movement_permission_id]
      );
    } else {
      await db.query(
        `UPDATE movement_permissions
         SET entry_at = NOW()
         WHERE id::text = $1;`,
        [passRow.movement_permission_id]
      );

      // Upon return entry, mark QR pass as completed/EXPIRED
      await db.query(
        `UPDATE qr_passes SET status = 'EXPIRED' WHERE id::text = $1;`,
        [passRow.qr_pass_id]
      );
    }


    // Record separate gate transaction in audit_logs
    const auditAction = verificationType === "EXIT" ? "gate_exit_authorized" : "gate_entry_verified";
    const resultStatus = verificationType === "EXIT" ? "EXIT AUTHORIZED" : "ENTRY VERIFIED";

    await db.query(
      `INSERT INTO audit_logs (actor, actor_role, action, target, target_id, metadata)
       VALUES ($1, 'security', $2, $3, $4, $5);`,
      [
        session.email,
        auditAction,
        student.student_code,
        passRow.movement_permission_id,
        JSON.stringify({
          qr_pass_id: passRow.qr_pass_id,
          pass_type: "NORMAL_MOVEMENT",
          student_code: student.student_code,
          student_name: student.name,
          department: student.department,
          officer_name: session.fullName || session.email,
          checkpoint: activeCheckpoint,
          authorized: true,
          result_status: resultStatus,
          verification_type: verificationType,
          timestamp,
        }),
      ]
    );

    // Decoupled real-time notification dispatch
    try {
      const studentUserId = await findStudentUserIdByCode(student.student_code);
      if (studentUserId) {
        await createNotificationServer({
          recipientUserId: studentUserId,
          recipientRole: "student",
          department: student.department,
          type: verificationType === "EXIT" ? "gate_exit_authorized" : "gate_entry_verified",
          title: verificationType === "EXIT" ? "Gate Exit Authorized" : "Gate Entry Verified",
          detail: `Your campus ${verificationType.toLowerCase()} was verified at ${activeCheckpoint} via Real-Time QR Scanner.`,
          tone: "resolved",
          relatedId: passRow.movement_permission_id,
          relatedType: "movement_permission",
        });
      }
    } catch (e) {
      console.warn("[Realtime Bus Warning] Real-time notification dispatch notice:", e);
    }

    return {
      success: true,
      authorized: true,
      resultStatus,
      verificationType,
      message: `Authorized ${verificationType.toLowerCase()} for ${student.name} (${student.student_code}).`,
      timestamp,
      student: {
        name: student.name,
        studentCode: student.student_code,
        department: student.department,
        yearSection: `${student.year || "3rd Year"} • Section ${student.section || "A"}`,
      },
      pass: {
        id: passRow.movement_permission_id,
        passCode: `PERM-${passRow.movement_permission_id.slice(0, 8).toUpperCase()}`,
        reason: passRow.mp_reason || "Normal Movement",
        validFrom: passRow.mp_valid_from || "10:00 AM",
        validUntil: passRow.mp_valid_until || "05:00 PM",
        date: passRow.mp_date || "",
        issuedBy: passRow.mp_issued_by || "Faculty",
        status: "APPROVED",
        exitAt: verificationType === "EXIT" ? new Date().toISOString() : passRow.mp_exit_at,
        entryAt: verificationType === "ENTRY" ? new Date().toISOString() : null,
      },
      checkpoint: activeCheckpoint,
    };
  }

  // ----------------------------------------------------
  // BRANCH 2: CLUB / EVENT QR
  // ----------------------------------------------------
  if (passRow.pass_type === "CLUB_EVENT") {
    if (passRow.ep_status !== "APPROVED") {
      return {
        success: true,
        authorized: false,
        resultStatus: "ACCESS DENIED",
        failureReason: `Event permission status is "${passRow.ep_status}".`,
        message: "Club/Event permission is not active.",
        timestamp,
      };
    }

    let verificationType: "EXIT" | "ENTRY" = "EXIT";
    const isOutside = passRow.location_type === "OUTSIDE_CAMPUS";

    if (isOutside) {
      if (passRow.ep_exit_at && passRow.ep_entry_at) {
        return {
          success: true,
          authorized: false,
          resultStatus: "ACCESS DENIED",
          failureReason: "Event permission has already been completed.",
          message: "Event return entry already recorded.",
          timestamp,
        };
      }
      if (passRow.ep_exit_at && !passRow.ep_entry_at) {
        verificationType = "ENTRY";
      }
    }

    // Update event_participants record
    if (isOutside) {
      if (verificationType === "EXIT") {
        await db.query(
          `UPDATE event_participants SET exit_at = NOW(), verified_by = $1 WHERE permission_code = $2;`,
          [session.fullName || session.email, passRow.ep_permission_code]
        );
      } else {
        await db.query(
          `UPDATE event_participants SET entry_at = NOW() WHERE permission_code = $1;`,
          [passRow.ep_permission_code]
        );
        await db.query(
          `UPDATE qr_passes SET status = 'EXPIRED' WHERE id::text = $1;`,
          [passRow.qr_pass_id]
        );
      }
    } else {
      await db.query(
        `UPDATE event_participants SET verified_by = $1 WHERE permission_code = $2;`,
        [session.fullName || session.email, passRow.ep_permission_code]
      );
    }


    const resultStatus = isOutside
      ? verificationType === "EXIT"
        ? `AUTHORIZED (${passRow.club_name || "CLUB"} EVENT EXIT)`
        : `AUTHORIZED (${passRow.club_name || "CLUB"} EVENT ENTRY)`
      : `AUTHORIZED (${passRow.club_name || "CLUB"} EVENT)`;

    // Record separate gate transaction in audit_logs
    await db.query(
      `INSERT INTO audit_logs (actor, actor_role, action, target, target_id, metadata)
       VALUES ($1, 'security', $2, $3, $4, $5);`,
      [
        session.email,
        verificationType === "ENTRY" ? "gate_entry_verified" : "gate_exit_authorized",
        student.student_code,
        passRow.ep_permission_code,
        JSON.stringify({
          qr_pass_id: passRow.qr_pass_id,
          pass_type: "CLUB_EVENT",
          event_name: passRow.event_name,
          club_name: passRow.club_name,
          student_code: student.student_code,
          student_name: student.name,
          department: student.department,
          officer_name: session.fullName || session.email,
          checkpoint: activeCheckpoint,
          authorized: true,
          result_status: resultStatus,
          verification_type: verificationType,
          timestamp,
        }),
      ]
    );

    return {
      success: true,
      authorized: true,
      resultStatus,
      verificationType,
      message: `Verified event permission for ${student.name} (${passRow.event_name}).`,
      timestamp,
      student: {
        name: student.name,
        studentCode: student.student_code,
        department: student.department,
        yearSection: `${student.year || "3rd Year"} • Section ${student.section || "A"}`,
      },
      pass: {
        id: passRow.ep_permission_code,
        passCode: passRow.ep_permission_code,
        reason: `Club Event: ${passRow.event_name} (${passRow.club_name})`,
        validFrom: passRow.event_start_time || "10:00 AM",
        validUntil: passRow.event_end_time || "05:00 PM",
        date: passRow.event_date || "",
        issuedBy: passRow.coordinator_name || "Club Coordinator",
        status: "APPROVED",
        exitAt: isOutside && verificationType === "EXIT" ? new Date().toISOString() : passRow.ep_exit_at,
        entryAt: isOutside && verificationType === "ENTRY" ? new Date().toISOString() : null,
      },
      checkpoint: activeCheckpoint,
    };
  }

  return {
    success: true,
    authorized: false,
    resultStatus: "ACCESS DENIED",
    failureReason: "Unknown pass type.",
    message: "Invalid pass type.",
    timestamp,
  };
}
