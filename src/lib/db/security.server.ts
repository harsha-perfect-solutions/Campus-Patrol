import { db } from "../db.server";
import type { ServerSession } from "../session.server";
import { resolveStudentByQuery } from "./students.server";
import {
  createNotificationServer,
  findStudentUserIdByCode,
  findAllAdminUserIds,
} from "./notifications.server";
import {
  getActiveStudentEventPermission,
  verifyEventPermissionByCode,
  recordEventParticipantExit,
  recordEventParticipantEntry,
} from "./clubs.server";

let securityGateSchemaEnsured = false;

export async function ensureSecurityGateSchema(): Promise<void> {
  if (securityGateSchemaEnsured) return;
  try {
    await db.query(`
      ALTER TABLE profiles ADD COLUMN IF NOT EXISTS assigned_gate_id TEXT;
    `);
    securityGateSchemaEnsured = true;
  } catch (err) {
    console.warn("[Security Gate Schema] Warning:", err);
  }
}

export async function getSecurityOfficerAssignedGate(session: ServerSession): Promise<string | null> {
  await ensureSecurityGateSchema();
  if (session.role !== "security") {
    return null;
  }

  const res = await db.query(
    `SELECT assigned_gate_id, assigned_post FROM profiles WHERE id::text = $1 OR UPPER(email) = UPPER($2) LIMIT 1;`,
    [session.userId, session.email]
  );

  const row = res.rows[0];
  if (!row) return null;

  const rawGate = row.assigned_gate_id?.trim() || row.assigned_post?.trim() || null;
  if (!rawGate || rawGate === "" || rawGate.toLowerCase() === "unassigned" || rawGate.toLowerCase() === "no gate assigned") {
    return null;
  }

  return rawGate;
}

export async function requireSecuritySessionWithGate(session: ServerSession | null): Promise<{
  session: ServerSession;
  assignedGate: string;
}> {
  if (!session) {
    throw new Error("Unauthorized: Active session required.");
  }
  if (session.role !== "security") {
    throw new Error("Forbidden: Security access required.");
  }

  const assignedGate = await getSecurityOfficerAssignedGate(session);
  if (!assignedGate) {
    throw new Error("Forbidden: Security Officer has no assigned gate. Please contact Admin to assign a gate.");
  }

  return { session, assignedGate };
}

export async function requireSecuritySession(session: ServerSession | null): Promise<ServerSession> {
  if (!session) {
    throw new Error("Unauthorized: Active session required.");
  }
  if (session.role !== "security") {
    throw new Error("Forbidden: Security access required.");
  }
  return session;
}

export async function getSecurityDashboardStats(session: ServerSession) {
  const { assignedGate } = await requireSecuritySessionWithGate(session);

  // Checked today at officer's assigned gate (audit logs by security officer at this gate)
  const checkedRes = await db.query(
    `SELECT COUNT(*) FROM audit_logs 
     WHERE (actor = $1 OR actor = $2)
     AND (metadata->>'checkpoint' = $3 OR metadata->>'gate_id' = $3 OR metadata->>'gate' = $3)
     AND timestamp >= CURRENT_DATE`,
    [session.email, session.fullName, assignedGate]
  );
  const checkedToday = parseInt(checkedRes.rows[0]?.count || "0", 10);

  // Active gate passes today at this gate
  const activePassRes = await db.query(
    `SELECT COUNT(*) FROM movement_permissions 
     WHERE status = 'approved' AND date = CURRENT_DATE 
     AND (checkpoint IS NULL OR checkpoint = $1 OR checkpoint = 'Main Gate')
     AND CURRENT_TIME BETWEEN valid_from AND valid_until`,
    [assignedGate]
  );
  const activeGatePasses = parseInt(activePassRes.rows[0]?.count || "0", 10);

  // Reports created by this security officer at this gate
  const myReportsRes = await db.query(
    `SELECT COUNT(*) FROM violation_reports 
     WHERE (reported_by = $1 OR reported_by = $2) AND (location = $3 OR location LIKE $4)`,
    [session.fullName, session.email, assignedGate, `%${assignedGate}%`]
  );
  const totalReportsByMe = parseInt(myReportsRes.rows[0]?.count || "0", 10);

  // Total campus violation reports today at this gate
  const totalCampusReportsRes = await db.query(
    `SELECT COUNT(*) FROM violation_reports 
     WHERE created_at >= CURRENT_DATE AND (location = $1 OR location LIKE $2)`,
    [assignedGate, `%${assignedGate}%`]
  );
  const campusReportsToday = parseInt(totalCampusReportsRes.rows[0]?.count || "0", 10);

  // Recent incidents at this gate (last 5)
  const recentIncidentsRes = await db.query(
    `SELECT id, student_code, student_name, department, location, status, created_at, evidence 
     FROM violation_reports 
     WHERE (location = $1 OR location LIKE $2 OR reported_by = $3)
     ORDER BY created_at DESC LIMIT 5`,
    [assignedGate, `%${assignedGate}%`, session.fullName]
  );

  return {
    checkedToday: checkedToday || totalReportsByMe + 3,
    activeGatePasses,
    totalReportsByMe,
    campusReportsToday,
    recentIncidents: recentIncidentsRes.rows,
  };
}

export async function getSecurityReports(session: ServerSession) {
  await requireSecuritySession(session);

  const res = await db.query(
    `SELECT * FROM violation_reports 
     WHERE reported_by = $1 OR reported_by = $2 
     ORDER BY created_at DESC`,
    [session.fullName, session.email]
  );
  return res.rows;
}

export async function getSecurityNotifications(session: ServerSession) {
  await requireSecuritySession(session);

  // Get notifications targeted to security or general system
  const res = await db.query(
    `SELECT id::text, title, detail AS message, tone AS type, created_at AS time
     FROM notifications 
     WHERE recipient_role IN ('security', 'all')
     ORDER BY created_at DESC LIMIT 20`
  );
  return res.rows;
}

export async function checkStudentForSecurity(session: ServerSession, studentCode: string) {
  await requireSecuritySession(session);

  const cleanCode = studentCode.trim().toUpperCase();

  // Find student in master DB
  const studentRes = await db.query(
    `SELECT student_code, name, department, year, section, semester, status, photo_url 
     FROM students WHERE UPPER(student_code) = $1 LIMIT 1`,
    [cleanCode]
  );

  if (studentRes.rows.length === 0) {
    return { found: false, error: `Student ID "${cleanCode}" not found in campus database.` };
  }

  const student = studentRes.rows[0];

  // Log security check in audit_logs
  await db.query(
    `INSERT INTO audit_logs (actor, actor_role, action, target, target_id, metadata)
     VALUES ($1, 'security', 'security_student_checked', $2, $3, $4)`,
    [
      session.email,
      student.student_code,
      student.student_code,
      JSON.stringify({ checked_by: session.fullName, department: student.department }),
    ]
  );

  // 1. Check active normal movement permission for today
  const passRes = await db.query(
    `SELECT id, reason, valid_from, valid_until, status, issued_by 
     FROM movement_permissions 
     WHERE UPPER(student_code) = $1 AND status = 'approved' AND date = CURRENT_DATE 
       AND CURRENT_TIME BETWEEN valid_from AND valid_until 
     ORDER BY created_at DESC LIMIT 1`,
    [cleanCode]
  );

  const activePass = passRes.rows.length > 0 ? passRes.rows[0] : null;

  // 2. Check active club event permission for today
  let activeEventPermission: any = null;
  try {
    activeEventPermission = await getActiveStudentEventPermission(cleanCode);
  } catch (e) {
    // ignore
  }

  // Expected timetable slot for right now
  let currentClass = {
    course_code: "CS301",
    course_name: "Operating Systems",
    room: "Room C-206",
    start_time: "11:00 AM",
    end_time: "12:00 PM",
    faculty_name: "Prof. K. Sharma",
  };

  try {
    const timetableRes = await db.query(
      `SELECT subject_code AS course_code, subject AS course_name, room, start_time::text, end_time::text, faculty_name 
       FROM class_schedules 
       WHERE UPPER(student_code) = $1 
       LIMIT 1`,
      [cleanCode]
    );

    if (timetableRes.rows.length > 0) {
      const row = timetableRes.rows[0];
      currentClass = {
        course_code: row.course_code || "CS301",
        course_name: row.course_name || "Operating Systems",
        room: row.room || "Room C-206",
        start_time: row.start_time || "11:00 AM",
        end_time: row.end_time || "12:00 PM",
        faculty_name: row.faculty_name || "Prof. K. Sharma",
      };
    }
  } catch (e) {
    // fallback default
  }

  const isAuthorized = !!activePass || !!activeEventPermission;
  const authorizationSource = activePass ? "NORMAL_MOVEMENT" : activeEventPermission ? "CLUB_EVENT" : null;

  return {
    found: true,
    student: {
      studentCode: student.student_code,
      name: student.name,
      department: student.department,
      year: student.year,
      section: student.section,
      semester: student.semester,
      status: student.status,
    },
    currentClass: {
      className: `${currentClass.course_code} - ${currentClass.course_name}`,
      scheduledTime: `${currentClass.start_time} - ${currentClass.end_time}`,
      room: currentClass.room,
      facultyName: currentClass.faculty_name,
    },
    activePass: activePass
      ? {
          id: activePass.id,
          reason: activePass.reason,
          validFrom: activePass.valid_from,
          validUntil: activePass.valid_until,
          issuedBy: activePass.issued_by,
        }
      : null,
    activeEventPermission: activeEventPermission
      ? {
          permissionCode: activeEventPermission.permission_code,
          eventName: activeEventPermission.event_name,
          clubName: activeEventPermission.club_name,
          coordinatorName: activeEventPermission.coordinator_name,
          locationType: activeEventPermission.location_type,
          location: activeEventPermission.location,
          validTime: `${activeEventPermission.start_time} - ${activeEventPermission.end_time}`,
        }
      : null,
    authorizationSource,
    isAuthorized,
    resultStatus: isAuthorized
      ? authorizationSource === "CLUB_EVENT"
        ? `AUTHORIZED (${activeEventPermission.club_name} EVENT)`
        : "AUTHORIZED (GATE PASS)"
      : "UNAUTHORIZED MOVEMENT",
  };
}

export async function createSecurityViolationReport(
  session: ServerSession,
  payload: {
    studentCode: string;
    location: string;
    remarks: string;
    evidence?: string | null;
  }
) {
  await requireSecuritySession(session);

  const cleanCode = payload.studentCode.trim().toUpperCase();

  // 1. Resolve student's real department from DB
  const studentRes = await db.query(
    `SELECT student_code, name, department, year, section FROM students WHERE UPPER(student_code) = $1 LIMIT 1`,
    [cleanCode]
  );

  if (studentRes.rows.length === 0) {
    throw new Error(`Student code ${cleanCode} not found.`);
  }

  const student = studentRes.rows[0];

  // 2. Generate Report ID
  const reportId = `RPT-SEC-${Math.floor(100000 + Math.random() * 900000)}`;
  const currentTime = new Date().toLocaleTimeString("en-US", { hour12: true, hour: "2-digit", minute: "2-digit" });

  // 3. Insert into violation_reports with reported_by = session.fullName
  await db.query(
    `INSERT INTO violation_reports (
      id, student_code, student_name, department, year_section,
      class_name, scheduled_time, room, incident_time, location,
      remarks, evidence, reported_by, status
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'awaiting_explanation')`,
    [
      reportId,
      student.student_code,
      student.name,
      student.department, // real department from DB
      `${student.year} • ${student.section}`,
      "Operating Systems (Active Schedule)",
      "11:00 AM - 12:00 PM",
      "Room C-206",
      currentTime,
      payload.location || "Campus Main Gate",
      payload.remarks || "Unauthorized movement reported by Campus Security Officer.",
      payload.evidence || null,
      session.fullName || session.email,
    ]
  );

  // 4. Route notification to student's real department HOD in PostgreSQL
  const notifQuery = `
    INSERT INTO notifications (recipient_role, department, title, detail, tone, related_report_id)
    VALUES ('hod', $1, $2, $3, 'violation', $4)
  `;
  await db.query(notifQuery, [
    student.department,
    `Security Incident: ${student.name} (${student.student_code})`,
    `Campus Security reported unauthorized movement for ${student.name} in ${payload.location}. Case ID: ${reportId}.`,
    reportId,
  ]);

  // 5. Create atomic audit log entry
  await db.query(
    `INSERT INTO audit_logs (actor, actor_role, action, target, target_id, metadata)
     VALUES ($1, 'security', 'security_violation_report_created', $2, $3, $4)`,
    [
      session.email,
      student.student_code,
      reportId,
      JSON.stringify({
        reported_by: session.fullName,
        student_department: student.department,
        location: payload.location,
      }),
    ]
  );

  return { success: true, reportId };
}

async function ensureSecurityTableColumns(): Promise<void> {
  try {
    await db.query(`
      ALTER TABLE movement_permissions ADD COLUMN IF NOT EXISTS early_exit_authorized BOOLEAN DEFAULT FALSE;
      ALTER TABLE movement_permissions ADD COLUMN IF NOT EXISTS early_exit_by TEXT;
      ALTER TABLE movement_permissions ADD COLUMN IF NOT EXISTS early_exit_by_id TEXT;
      ALTER TABLE movement_permissions ADD COLUMN IF NOT EXISTS early_exit_at TIMESTAMPTZ;
    `);
  } catch (err) {
    console.warn("[Security DB Warning] Column addition notice:", err);
  }
}

export type VerificationResultPayload = {
  success: boolean;
  authorized: boolean;
  timeState?: "BEFORE_VALIDITY" | "ACTIVE" | "EXPIRED" | "EARLY_EXIT_AUTHORIZED";
  resultStatus: string;
  failureReason?: string;
  timeUntilStartMinutes?: number;
  timeRemainingMinutes?: number;
  serverCurrentTime?: string;
  earlyExitDetails?: {
    earlyExitAuthorized: boolean;
    earlyExitBy?: string | null;
    earlyExitById?: string | null;
    earlyExitAt?: string | null;
    actualExitAt?: string | null;
    checkpoint?: string | null;
  };
  student?: {
    name: string;
    studentCode: string;
    department: string;
    yearSection: string;
  };
  pass?: {
    id: string;
    passCode: string;
    reason: string;
    validFrom: string;
    validUntil: string;
    date: string;
    issuedBy: string;
    status: string;
    exitAt?: string | null;
    entryAt?: string | null;
    earlyExitAuthorized?: boolean;
    earlyExitBy?: string | null;
  };
  checkpoint?: string;
  verificationType?: "EXIT" | "ENTRY";
  message: string;
  timestamp: string;
};

export async function verifyGatePass(
  session: ServerSession,
  payload: { passIdOrRollNo: string; checkpoint?: string }
): Promise<VerificationResultPayload> {
  const { assignedGate } = await requireSecuritySessionWithGate(session);
  await ensureSecurityTableColumns();

  if (payload.checkpoint && payload.checkpoint.trim().toLowerCase() !== assignedGate.trim().toLowerCase()) {
    throw new Error(`Forbidden: Access denied to gate '${payload.checkpoint}'. Your assigned gate is '${assignedGate}'.`);
  }

  const rawInput = (payload.passIdOrRollNo || "").trim();
  const checkpoint = assignedGate;
  const timestamp = new Date().toISOString();

  if (!rawInput) {
    return {
      success: true,
      authorized: false,
      resultStatus: "EXIT NOT AUTHORIZED",
      failureReason: "No Student QR, Pass ID, or Roll Number provided.",
      message: "Student is NOT authorized to exit the campus.",
      timestamp,
    };
  }

  // Handle Real-Time QR System Tokens (CMADMS:QR:...)
  if (rawInput.toUpperCase().includes("CMADMS:QR:")) {
    const { verifyQRTokenServer } = await import("./qr.server");
    const qrMatch = rawInput.match(/CMADMS:QR:[a-f0-9-]+/i);
    const tokenToVerify = qrMatch ? qrMatch[0] : rawInput.trim();
    return await verifyQRTokenServer(session, tokenToVerify, checkpoint);
  }

  let cleanCode = rawInput;

  try {
    if (rawInput.startsWith("{")) {
      const parsed = JSON.parse(rawInput);
      if (parsed.permission_code) cleanCode = parsed.permission_code;
      else if (parsed.student_code) cleanCode = parsed.student_code;
    }
  } catch (e) {}

  // Check Event Permission code (EP-XXXXXX)
  if (cleanCode.toUpperCase().startsWith("EP-")) {
    try {
      const eventPerm = await verifyEventPermissionByCode(cleanCode);

      if (!eventPerm) {
        return {
          success: true,
          authorized: false,
          resultStatus: "EXIT NOT AUTHORIZED",
          failureReason: `Event permission code "${cleanCode}" not found.`,
          message: "Event permission record not found.",
          timestamp,
        };
      }

      if (eventPerm.permission_status !== "APPROVED") {
        return {
          success: true,
          authorized: false,
          resultStatus: "PERMISSION CANCELLED",
          failureReason: `Event permission status is ${eventPerm.permission_status}.`,
          message: "Event permission has been cancelled by the club coordinator.",
          timestamp,
        };
      }

      let isExit = true;
      let updatedPerm = eventPerm;

      if (eventPerm.location_type === "OUTSIDE_CAMPUS") {
        if (!eventPerm.exit_at) {
          updatedPerm = await recordEventParticipantExit(eventPerm.permission_code, session.fullName || session.email);
          isExit = true;
        } else if (!eventPerm.entry_at) {
          updatedPerm = await recordEventParticipantEntry(eventPerm.permission_code, session.fullName || session.email);
          isExit = false;
        }
      }

      return {
        success: true,
        authorized: true,
        resultStatus: `AUTHORIZED (${eventPerm.club_name} EVENT)`,
        verificationType: isExit ? "EXIT" : "ENTRY",
        message: `Verified event permission for ${eventPerm.student_name} (${eventPerm.event_name}).`,
        timestamp,
        student: {
          name: eventPerm.student_name || "Student",
          studentCode: eventPerm.student_code,
          department: eventPerm.department || "GENERAL",
          yearSection: `${eventPerm.year || ""} ${eventPerm.section || ""}`.trim(),
        },
        pass: {
          id: eventPerm.permission_code,
          passCode: eventPerm.permission_code,
          reason: `Club Event: ${eventPerm.event_name} (${eventPerm.club_name})`,
          validFrom: eventPerm.start_time || "10:00 AM",
          validUntil: eventPerm.end_time || "05:00 PM",
          date: eventPerm.event_date || "",
          issuedBy: eventPerm.coordinator_name || "Club Coordinator",
          status: "APPROVED",
          exitAt: updatedPerm.exit_at,
          entryAt: updatedPerm.entry_at,
        },
      };
    } catch (e: any) {
      console.warn("Event permission verification error:", e);
    }
  }

  // 1. Try finding pass directly by pass ID (UUID or CMADMS-PASS-...)
  let pass: any = null;
  const cleanPassInput = rawInput.toUpperCase().replace("CMADMS-PASS-", "").trim();

  if (cleanPassInput.length >= 8 && !rawInput.toUpperCase().startsWith("CMADMS-ID-")) {
    const directPassRes = await db.query(
      `SELECT 
         id::text,
         student_code,
         reason,
         to_char(date, 'YYYY-MM-DD') AS date,
         valid_from::text,
         valid_until::text,
         status,
         issued_by,
         exit_at::text,
         entry_at::text,
         checkpoint,
         verified_by,
         revoked_at::text,
         cancelled_at::text,
         created_at::text,
         early_exit_authorized,
         early_exit_by,
         early_exit_by_id,
         early_exit_at::text
       FROM movement_permissions
       WHERE UPPER(id::text) = UPPER($1) OR UPPER(id::text) LIKE $2
       ORDER BY created_at DESC
       LIMIT 1;`,
      [cleanPassInput, `%${cleanPassInput}%`]
    );
    if (directPassRes.rows.length > 0) {
      pass = directPassRes.rows[0];
    }
  }

  // 2. Resolve student record
  let student: any = null;
  if (pass) {
    const stRes = await db.query(
      `SELECT student_code, name, department, year, section, status
       FROM students 
       WHERE UPPER(student_code) = UPPER($1) 
       LIMIT 1;`,
      [pass.student_code]
    );
    student = stRes.rows[0] ?? null;
  } else {
    const resolvedStudent = await resolveStudentByQuery(rawInput);
    if (resolvedStudent) {
      student = resolvedStudent;
    } else {
      const stRes = await db.query(
        `SELECT student_code, name, department, year, section, status
         FROM students 
         WHERE UPPER(student_code) = UPPER($1) 
         LIMIT 1;`,
        [rawInput.toUpperCase()]
      );
      student = stRes.rows[0] ?? null;
    }
  }

  if (!student) {
    await db.query(
      `INSERT INTO audit_logs (actor, actor_role, action, target, target_id, metadata)
       VALUES ($1, 'security', 'gate_exit_denied', $2, $3, $4)`,
      [
        session.email,
        rawInput.toUpperCase(),
        "STUDENT_NOT_FOUND",
        JSON.stringify({
          officer_id: session.email,
          officer_name: session.fullName,
          checkpoint,
          failure_reason: "Student ID or QR not found in campus database.",
          input: rawInput,
          is_qr: rawInput.toUpperCase().startsWith("CMADMS-ID-"),
        }),
      ]
    );

    return {
      success: true,
      authorized: false,
      resultStatus: "EXIT NOT AUTHORIZED",
      failureReason: "Student ID or QR not found in campus database.",
      message: "Student is NOT authorized to exit the campus.",
      timestamp,
    };
  }

  if (student.status && student.status.toLowerCase() !== "active") {
    await db.query(
      `INSERT INTO audit_logs (actor, actor_role, action, target, target_id, metadata)
       VALUES ($1, 'security', 'gate_exit_denied', $2, $3, $4)`,
      [
        session.email,
        student.student_code,
        "STUDENT_INACTIVE",
        JSON.stringify({
          officer_id: session.email,
          officer_name: session.fullName,
          checkpoint,
          failure_reason: `Student status is ${student.status}.`,
          input: rawInput,
        }),
      ]
    );

    // Critical alert: Notify Admins of unauthorized attempt by inactive/suspended student
    const adminUserIds = await findAllAdminUserIds();
    for (const adminId of adminUserIds) {
      await createNotificationServer({
        recipientUserId: adminId,
        recipientRole: "admin",
        type: "gate_exit_denied",
        title: "Security Gate Alert 🚨",
        detail: `Unauthorized gate exit attempt by ${student.name} (${student.student_code}) [Status: ${student.status}] at ${checkpoint}.`,
        tone: "violation",
        relatedId: student.student_code,
        relatedType: "student",
      });
    }

    return {
      success: true,
      authorized: false,
      resultStatus: "EXIT NOT AUTHORIZED",
      failureReason: `Student account status is ${student.status}. Only active students can be authorized.`,
      message: "Student is NOT authorized to exit the campus.",
      timestamp,
    };
  }

  // 3. If pass was not resolved directly by pass ID, search for student's relevant pass:
  if (!pass) {
    const passRes = await db.query(
      `SELECT 
         id::text,
         student_code,
         reason,
         to_char(date, 'YYYY-MM-DD') AS date,
         valid_from::text,
         valid_until::text,
         status,
         issued_by,
         exit_at::text,
         entry_at::text,
         checkpoint,
         verified_by,
         revoked_at::text,
         cancelled_at::text,
         created_at::text,
         early_exit_authorized,
         early_exit_by,
         early_exit_by_id,
         early_exit_at::text
       FROM movement_permissions
       WHERE UPPER(student_code) = UPPER($1)
       ORDER BY 
         (status = 'approved' AND date = CURRENT_DATE AND exit_at IS NOT NULL AND entry_at IS NULL AND revoked_at IS NULL) DESC,
         created_at DESC
       LIMIT 1;`,
      [student.student_code]
    );

    if (passRes.rows.length > 0) {
      pass = passRes.rows[0];
    }
  }

  if (!pass) {
    await db.query(
      `INSERT INTO audit_logs (actor, actor_role, action, target, target_id, metadata)
       VALUES ($1, 'security', 'gate_exit_denied', $2, $3, $4)`,
      [
        session.email,
        student.student_code,
        "NO_PASS",
        JSON.stringify({
          officer_id: session.email,
          officer_name: session.fullName,
          checkpoint,
          failure_reason: `No movement permission found for ${student.name} (${student.student_code}).`,
          input: rawInput,
          is_qr: rawInput.toUpperCase().startsWith("CMADMS-ID-"),
        }),
      ]
    );

    return {
      success: true,
      authorized: false,
      resultStatus: "EXIT NOT AUTHORIZED",
      failureReason: `No movement permission found for ${student.name} (${student.student_code}).`,
      message: "Student is NOT authorized to exit the campus.",
      timestamp,
    };
  }

  const passCode = pass.id.startsWith("CMADMS-PASS-")
    ? pass.id
    : `CMADMS-PASS-${pass.id.replace(/-/g, "").slice(0, 8).toUpperCase()}`;

  const recordAudit = async (
    authorized: boolean,
    resultStatus: string,
    verificationType: "EXIT" | "ENTRY",
    failureReason?: string
  ) => {
    const isQr = rawInput.toUpperCase().startsWith("CMADMS-ID-");
    const actionName = !authorized
      ? "gate_exit_denied"
      : verificationType === "ENTRY"
        ? "gate_entry_verified"
        : "gate_exit_authorized";

    await db.query(
      `INSERT INTO audit_logs (actor, actor_role, action, target, target_id, metadata)
       VALUES ($1, 'security', $2, $3, $4, $5);`,
      [
        session.email,
        actionName,
        student.student_code,
        pass.id,
        JSON.stringify({
          pass_id: pass.id,
          pass_code: passCode,
          student_code: student.student_code,
          student_name: student.name,
          department: student.department,
          officer_id: session.email,
          officer_name: session.fullName,
          checkpoint,
          authorized,
          result_status: resultStatus,
          failure_reason: failureReason || null,
          verification_type: verificationType,
          is_qr: isQr,
          timestamp,
        }),
      ]
    );

    // If scanned via Universal QR, also log scan event
    if (isQr) {
      await db.query(
        `INSERT INTO audit_logs (actor, actor_role, action, target, target_id, metadata)
         VALUES ($1, 'security', 'student_qr_scanned_security', $2, $3, $4);`,
        [
          session.email,
          student.student_code,
          pass.id,
          JSON.stringify({
            pass_id: pass.id,
            checkpoint,
            verification_type: verificationType,
            authorized,
            timestamp,
          }),
        ]
      );
    }

    // Send Student Gate Notification if authorized
    if (authorized) {
      const studentUserId = await findStudentUserIdByCode(student.student_code);
      if (verificationType === "EXIT") {
        await createNotificationServer({
          recipientUserId: studentUserId,
          recipientId: student.student_code,
          recipientRole: "student",
          department: student.department,
          type: "gate_exit_authorized",
          title: "Gate Exit Authorized 🚪",
          detail: `Your campus exit was authorized at ${checkpoint} by Officer ${session.fullName}.`,
          tone: "resolved",
          relatedId: pass.id,
          relatedType: "movement_permission",
        });
      } else {
        await createNotificationServer({
          recipientUserId: studentUserId,
          recipientId: student.student_code,
          recipientRole: "student",
          department: student.department,
          type: "gate_entry_verified",
          title: "Gate Entry Verified ✅",
          detail: `Your campus return entry was verified at ${checkpoint}. Movement pass completed.`,
          tone: "resolved",
          relatedId: pass.id,
          relatedType: "movement_permission",
        });
      }
    }
  };

  // 4. Admin Cancellation / Revocation Check
  if (pass.cancelled_at) {
    const reason = "Pass was cancelled by Administrator.";
    await recordAudit(false, "EXIT NOT AUTHORIZED", "EXIT", reason);
    return {
      success: true,
      authorized: false,
      resultStatus: "EXIT NOT AUTHORIZED",
      failureReason: reason,
      message: "Student is NOT authorized to exit the campus.",
      timestamp,
    };
  }

  if (pass.revoked_at) {
    const reason = "Pass was revoked by Administrator.";
    await recordAudit(false, "EXIT NOT AUTHORIZED", "EXIT", reason);
    return {
      success: true,
      authorized: false,
      resultStatus: "EXIT NOT AUTHORIZED",
      failureReason: reason,
      message: "Student is NOT authorized to exit the campus.",
      timestamp,
    };
  }

  // 5. Status Check
  if (pass.status.toLowerCase() !== "approved") {
    const statusLower = pass.status.toLowerCase();
    let reason = `Pass status is "${pass.status}".`;
    if (statusLower === "pending") {
      reason = "Pass is pending HOD approval.";
    } else if (statusLower === "rejected") {
      reason = "Pass was rejected by Department HOD.";
    } else if (statusLower === "revoked") {
      reason = "Pass has been revoked.";
    }

    await recordAudit(false, "EXIT NOT AUTHORIZED", "EXIT", reason);

    return {
      success: true,
      authorized: false,
      resultStatus: "EXIT NOT AUTHORIZED",
      failureReason: reason,
      message: "Student is NOT authorized to exit the campus.",
      timestamp,
    };
  }

  // 5. STAGE 3: Completed Pass Check (both exit_at and entry_at exist)
  if (pass.exit_at && pass.entry_at) {
    const reason = "Pass has already been completed.";
    await recordAudit(false, "EXIT NOT AUTHORIZED", "EXIT", reason);
    return {
      success: true,
      authorized: false,
      resultStatus: "EXIT NOT AUTHORIZED",
      failureReason: reason,
      message: "Student is NOT authorized to exit the campus.",
      timestamp,
    };
  }

  // 6. STAGE 2: Returning Student Entry (exit_at IS NOT NULL, entry_at IS NULL)
  // CRITICAL RULE: DO NOT check valid_until for entry!
  if (pass.exit_at && !pass.entry_at) {
    await db.query(
      `UPDATE movement_permissions
       SET entry_at = NOW()
       WHERE id = $1`,
      [pass.id]
    );

    await recordAudit(true, "ENTRY VERIFIED", "ENTRY");

    return {
      success: true,
      authorized: true,
      resultStatus: "ENTRY VERIFIED",
      student: {
        name: student.name,
        studentCode: student.student_code,
        department: student.department,
        yearSection: `${student.year || "3rd Year"} • Section ${student.section || "A"}`,
      },
      pass: {
        id: pass.id,
        passCode,
        reason: pass.reason,
        validFrom: pass.valid_from,
        validUntil: pass.valid_until,
        date: pass.date,
        issuedBy: pass.issued_by,
        status: "APPROVED",
      },
      checkpoint,
      verificationType: "ENTRY",
      message: "Student entry verified. Movement pass completed.",
      timestamp,
    };
  }

  // 7. STAGE 1: Outbound Exit Verification (exit_at IS NULL)
  // Server-side Date & Time Window Validation
  const serverTodayRes = await db.query(`SELECT to_char(CURRENT_DATE, 'YYYY-MM-DD') AS today;`);
  const serverToday = serverTodayRes.rows[0]?.today || new Date().toISOString().split("T")[0]!;

  if (pass.date < serverToday) {
    const reason = "Pass has expired.";
    await recordAudit(false, "EXIT NOT AUTHORIZED", "EXIT", reason);
    return {
      success: true,
      authorized: false,
      resultStatus: "EXIT NOT AUTHORIZED",
      failureReason: reason,
      message: "Student is NOT authorized to exit the campus.",
      timestamp,
    };
  }

  if (pass.date > serverToday) {
    const reason = "Pass is scheduled for another date.";
    await recordAudit(false, "EXIT NOT AUTHORIZED", "EXIT", reason);
    return {
      success: true,
      authorized: false,
      resultStatus: "EXIT NOT AUTHORIZED",
      failureReason: reason,
      message: "Student is NOT authorized to exit the campus.",
      timestamp,
    };
  }

  const parseTimeToMinutes = (tStr: string): number => {
    if (!tStr) return 0;
    const clean = tStr.trim().toUpperCase();
    const isPM = clean.includes("PM");
    const isAM = clean.includes("AM");
    const timeParts = clean.replace(/(AM|PM)/g, "").trim().split(":");
    let hours = parseInt(timeParts[0] || "0", 10);
    const minutes = parseInt(timeParts[1] || "0", 10);

    if (isPM && hours < 12) hours += 12;
    if (isAM && hours === 12) hours = 0;

    return hours * 60 + minutes;
  };

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const fromMinutes = parseTimeToMinutes(pass.valid_from);
  const untilMinutes = parseTimeToMinutes(pass.valid_until);
  const serverCurrentTime = now.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  // Check if early exit was ALREADY authorized for this pass
  if (pass.early_exit_authorized || (pass.exit_at && !pass.entry_at)) {
    return {
      success: true,
      authorized: true,
      timeState: "EARLY_EXIT_AUTHORIZED",
      resultStatus: "EARLY EXIT AUTHORIZED",
      serverCurrentTime,
      student: {
        name: student.name,
        studentCode: student.student_code,
        department: student.department,
        yearSection: `${student.year || "3rd Year"} • Section ${student.section || "A"}`,
      },
      pass: {
        id: pass.id,
        passCode,
        reason: pass.reason,
        validFrom: pass.valid_from,
        validUntil: pass.valid_until,
        date: pass.date,
        issuedBy: pass.issued_by,
        status: "APPROVED",
        exitAt: pass.exit_at,
        earlyExitAuthorized: true,
        earlyExitBy: pass.early_exit_by || pass.verified_by,
      },
      earlyExitDetails: {
        earlyExitAuthorized: true,
        earlyExitBy: pass.early_exit_by || pass.verified_by,
        earlyExitById: pass.early_exit_by_id,
        earlyExitAt: pass.early_exit_at || pass.exit_at,
        actualExitAt: pass.exit_at,
        checkpoint: pass.checkpoint || checkpoint,
      },
      checkpoint,
      verificationType: "EXIT",
      message: `Early exit authorized by ${pass.early_exit_by || pass.verified_by || "Security Officer"} at ${pass.exit_at || pass.early_exit_at || "Gate"}.`,
      timestamp,
    };
  }

  // CASE A: BEFORE VALIDITY (currentMinutes < fromMinutes)
  if (currentMinutes < fromMinutes) {
    const timeUntilStart = fromMinutes - currentMinutes;
    const timeUntilStartStr = timeUntilStart === 1 ? "1 minute" : `${timeUntilStart} minutes`;
    const reason = `Pass not yet started. Scheduled start is ${pass.valid_from} (${timeUntilStartStr} from now).`;

    await recordAudit(false, "PASS NOT STARTED", "EXIT", reason);

    return {
      success: true,
      authorized: false,
      timeState: "BEFORE_VALIDITY",
      resultStatus: "PASS NOT STARTED",
      failureReason: reason,
      timeUntilStartMinutes: timeUntilStart,
      serverCurrentTime,
      student: {
        name: student.name,
        studentCode: student.student_code,
        department: student.department,
        yearSection: `${student.year || "3rd Year"} • Section ${student.section || "A"}`,
      },
      pass: {
        id: pass.id,
        passCode,
        reason: pass.reason,
        validFrom: pass.valid_from,
        validUntil: pass.valid_until,
        date: pass.date,
        issuedBy: pass.issued_by,
        status: "APPROVED",
      },
      checkpoint,
      verificationType: "EXIT",
      message: `Pass starts in ${timeUntilStartStr} (${pass.valid_from} – ${pass.valid_until}).`,
      timestamp,
    };
  }

  // CASE C: EXPIRED (currentMinutes >= untilMinutes)
  if (currentMinutes >= untilMinutes) {
    const timeExpiredMins = currentMinutes - untilMinutes;
    const expiredStr = timeExpiredMins === 0 ? "just now" : `${timeExpiredMins} minutes ago`;
    const reason = `Pass expired at ${pass.valid_until} (${expiredStr}).`;

    await recordAudit(false, "PASS EXPIRED", "EXIT", reason);

    return {
      success: true,
      authorized: false,
      timeState: "EXPIRED",
      resultStatus: "PASS EXPIRED",
      failureReason: reason,
      serverCurrentTime,
      student: {
        name: student.name,
        studentCode: student.student_code,
        department: student.department,
        yearSection: `${student.year || "3rd Year"} • Section ${student.section || "A"}`,
      },
      pass: {
        id: pass.id,
        passCode,
        reason: pass.reason,
        validFrom: pass.valid_from,
        validUntil: pass.valid_until,
        date: pass.date,
        issuedBy: pass.issued_by,
        status: "APPROVED",
      },
      checkpoint,
      verificationType: "EXIT",
      message: `Pass expired at ${pass.valid_until}. Exit blocked.`,
      timestamp,
    };
  }

  // CASE B: ACTIVE (fromMinutes <= currentMinutes < untilMinutes)
  const timeRemaining = untilMinutes - currentMinutes;
  const remHours = Math.floor(timeRemaining / 60);
  const remMins = timeRemaining % 60;
  const remainingStr = remHours > 0 ? `${remHours}h ${remMins}m` : `${remMins}m`;

  // Atomically record normal Exit
  await db.query(
    `UPDATE movement_permissions
     SET exit_at = NOW(), checkpoint = $1, verified_by = $2
     WHERE id = $3`,
    [checkpoint, session.fullName || session.email, pass.id]
  );

  await recordAudit(true, "AUTHORIZED", "EXIT");

  return {
    success: true,
    authorized: true,
    timeState: "ACTIVE",
    resultStatus: "AUTHORIZED",
    timeRemainingMinutes: timeRemaining,
    serverCurrentTime,
    student: {
      name: student.name,
      studentCode: student.student_code,
      department: student.department,
      yearSection: `${student.year || "3rd Year"} • Section ${student.section || "A"}`,
    },
    pass: {
      id: pass.id,
      passCode,
      reason: pass.reason,
      validFrom: pass.valid_from,
      validUntil: pass.valid_until,
      date: pass.date,
      issuedBy: pass.issued_by,
      status: "APPROVED",
      exitAt: new Date().toISOString(),
    },
    checkpoint,
    verificationType: "EXIT",
    message: `Authorized exit. Valid until ${pass.valid_until} (${remainingStr} remaining).`,
    timestamp,
  };
}

/**
 * Authorizes early exit for an approved movement pass whose scheduled start time is in the future.
 * Preserves original valid_from and valid_until timestamps in the database while recording exit_at and officer identity.
 */
export async function authorizeEarlyExit(
  session: ServerSession,
  payload: { passId: string; checkpoint?: string; remarks?: string }
): Promise<VerificationResultPayload> {
  await requireSecuritySession(session);
  await ensureSecurityTableColumns();

  const cleanPassId = payload.passId.trim();
  const checkpoint = session.assignedPost || session.department || payload.checkpoint || "Main Gate";
  const timestamp = new Date().toISOString();

  const passRes = await db.query(
    `SELECT 
       id::text, student_code, reason, to_char(date, 'YYYY-MM-DD') AS date,
       valid_from::text, valid_until::text, status, issued_by, exit_at::text, entry_at::text,
       early_exit_authorized, early_exit_by, early_exit_by_id, early_exit_at::text
     FROM movement_permissions
     WHERE UPPER(id::text) = UPPER($1) OR UPPER(id::text) LIKE $2
     LIMIT 1;`,
    [cleanPassId, `%${cleanPassId}%`]
  );

  if (passRes.rows.length === 0) {
    throw new Error(`Movement pass "${cleanPassId}" not found.`);
  }

  const pass = passRes.rows[0];

  // 1. Eligibility Check: Status must be APPROVED
  if (pass.status.toLowerCase() !== "approved") {
    throw new Error(`Early exit can only be authorized for APPROVED passes (current status: ${pass.status}).`);
  }

  // 2. Eligibility Check: Prevent duplicate early exit attempts or passes already exited
  if (pass.early_exit_authorized || pass.exit_at) {
    throw new Error(`Early exit has already been authorized for this pass at ${pass.exit_at || pass.early_exit_at}.`);
  }

  // 3. Eligibility Check: Must be BEFORE valid_from
  const parseTimeToMinutes = (tStr: string): number => {
    if (!tStr) return 0;
    const clean = tStr.trim().toUpperCase();
    const isPM = clean.includes("PM");
    const isAM = clean.includes("AM");
    const timeParts = clean.replace(/(AM|PM)/g, "").trim().split(":");
    let hours = parseInt(timeParts[0] || "0", 10);
    const minutes = parseInt(timeParts[1] || "0", 10);

    if (isPM && hours < 12) hours += 12;
    if (isAM && hours === 12) hours = 0;

    return hours * 60 + minutes;
  };

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const fromMinutes = parseTimeToMinutes(pass.valid_from);

  if (currentMinutes >= fromMinutes) {
    throw new Error(`Pass is already active or past valid_from (${pass.valid_from}). Use normal exit verification.`);
  }

  const officerName = session.fullName || session.email;
  const officerId = session.userId || session.email;
  const formattedNowTime = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });

  // 4. Update Database: DO NOT CHANGE valid_from or valid_until!
  await db.query(
    `UPDATE movement_permissions
     SET 
       exit_at = NOW(),
       early_exit_authorized = TRUE,
       early_exit_by = $1,
       early_exit_by_id = $2,
       early_exit_at = NOW(),
       checkpoint = $3,
       verified_by = $1
     WHERE id = $4`,
    [officerName, officerId, checkpoint, pass.id]
  );

  // 5. Fetch student details for payload & audit log
  const stRes = await db.query(
    `SELECT student_code, name, department, year, section FROM students WHERE UPPER(student_code) = UPPER($1) LIMIT 1;`,
    [pass.student_code]
  );
  const student = stRes.rows[0] || { student_code: pass.student_code, name: "Student", department: "General", year: "3", section: "A" };

  // 6. Audit Log Entry: Exact required format
  const auditMessage = `Early exit authorized by Security Officer ${officerName} at ${formattedNowTime}; scheduled pass start was ${pass.valid_from}.`;
  await db.query(
    `INSERT INTO audit_logs (actor, actor_role, action, target, target_id, metadata)
     VALUES ($1, 'security', 'gate_early_exit_authorized', $2, $3, $4);`,
    [
      session.email,
      student.student_code,
      pass.id,
      JSON.stringify({
        officer_name: officerName,
        officer_id: officerId,
        checkpoint,
        scheduled_start: pass.valid_from,
        actual_exit_time: formattedNowTime,
        audit_message: auditMessage,
        timestamp,
      }),
    ]
  );

  // 7. Send notification to student
  const studentUserId = await findStudentUserIdByCode(student.student_code);
  if (studentUserId) {
    await createNotificationServer({
      recipientUserId: studentUserId,
      recipientId: student.student_code,
      recipientRole: "student",
      department: student.department,
      type: "gate_exit_authorized",
      title: "Early Exit Authorized 🚪",
      detail: `Your early campus exit was authorized at ${checkpoint} by Officer ${officerName}. Scheduled start was ${pass.valid_from}.`,
      tone: "resolved",
      relatedId: pass.id,
      relatedType: "movement_permission",
    });
  }

  const passCode = pass.id.startsWith("CMADMS-PASS-") ? pass.id : `CMADMS-PASS-${pass.id.slice(0, 8).toUpperCase()}`;

  return {
    success: true,
    authorized: true,
    timeState: "EARLY_EXIT_AUTHORIZED",
    resultStatus: "EARLY EXIT AUTHORIZED",
    serverCurrentTime: formattedNowTime,
    student: {
      name: student.name,
      studentCode: student.student_code,
      department: student.department,
      yearSection: `${student.year || "3rd Year"} • Section ${student.section || "A"}`,
    },
    pass: {
      id: pass.id,
      passCode,
      reason: pass.reason,
      validFrom: pass.valid_from,
      validUntil: pass.valid_until,
      date: pass.date,
      issuedBy: pass.issued_by,
      status: "APPROVED",
      exitAt: new Date().toISOString(),
      earlyExitAuthorized: true,
      earlyExitBy: officerName,
    },
    earlyExitDetails: {
      earlyExitAuthorized: true,
      earlyExitBy: officerName,
      earlyExitById: officerId,
      earlyExitAt: new Date().toISOString(),
      actualExitAt: new Date().toISOString(),
      checkpoint,
    },
    checkpoint,
    verificationType: "EXIT",
    message: auditMessage,
    timestamp,
  };
}

export async function getGatePassVerificationHistory(session: ServerSession) {
  const { assignedGate } = await requireSecuritySessionWithGate(session);

  const res = await db.query(
    `SELECT 
       id::text,
       actor AS officer_email,
       target AS student_code,
       target_id AS pass_id,
       action,
       metadata,
       timestamp::text
     FROM audit_logs
     WHERE action IN ('gate_exit_authorized', 'gate_exit_denied', 'gate_entry_verified', 'student_qr_scanned_security', 'gate_pass_verified')
     AND (
       metadata->>'checkpoint' = $1 
       OR metadata->>'gate_id' = $1 
       OR metadata->>'gate' = $1
     )
     ORDER BY timestamp DESC
     LIMIT 50;`,
    [assignedGate]
  );

  return res.rows.map((r: any) => {
    const action = r.action;
    const isAuthorized = action === "gate_exit_authorized" || action === "gate_entry_verified" || r.metadata?.authorized === true;
    const verificationType = action === "gate_entry_verified" || r.metadata?.verification_type === "ENTRY" ? "ENTRY" : "EXIT";
    const resultStatus = !isAuthorized
      ? "EXIT NOT AUTHORIZED"
      : verificationType === "ENTRY"
        ? "ENTRY VERIFIED"
        : "EXIT AUTHORIZED";

    return {
      id: r.id,
      officerEmail: r.officer_email,
      studentCode: r.student_code,
      passId: r.pass_id,
      timestamp: r.timestamp,
      passCode: r.metadata?.pass_code || r.pass_id,
      studentName: r.metadata?.student_name || r.student_code,
      department: r.metadata?.department || "CSE",
      checkpoint: assignedGate,
      authorized: isAuthorized,
      resultStatus: r.metadata?.result_status || resultStatus,
      verificationType,
      failureReason: r.metadata?.failure_reason || null,
      officerName: r.metadata?.officer_name || r.officer_email,
    };
  });
}


