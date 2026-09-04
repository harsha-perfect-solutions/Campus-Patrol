import { createServerFn } from "@tanstack/react-start";
import { requireRole } from "../session.server";
import {
  getSecurityDashboardStats,
  getSecurityReports,
  getSecurityNotifications,
  checkStudentForSecurity,
  createSecurityViolationReport,
  verifyGatePass,
  authorizeEarlyExit,
  getGatePassVerificationHistory,
  type VerificationResultPayload,
} from "../db/security.server";

export type { VerificationResultPayload };

async function requireSecurityAuth() {
  return await requireRole("security");
}

export const getSecurityDashboardApi = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const session = await requireSecurityAuth();
    const stats = await getSecurityDashboardStats(session);
    return { success: true, stats };
  } catch (err: any) {
    console.error("[Security API Error] getSecurityDashboardApi:", err);
    return { success: false, error: err.message || "Failed to fetch security dashboard." };
  }
});

export const getSecurityReportsApi = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const session = await requireSecurityAuth();
    const reports = await getSecurityReports(session);
    return { success: true, reports };
  } catch (err: any) {
    console.error("[Security API Error] getSecurityReportsApi:", err);
    return { success: false, error: err.message || "Failed to fetch security reports." };
  }
});

export const getSecurityNotificationsApi = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const session = await requireSecurityAuth();
    const notifications = await getSecurityNotifications(session);
    return { success: true, notifications };
  } catch (err: any) {
    console.error("[Security API Error] getSecurityNotificationsApi:", err);
    return { success: false, error: err.message || "Failed to fetch security notifications." };
  }
});

export const checkStudentSecurityApi = createServerFn({ method: "POST" })
  .validator((data: { studentCode: string }) => data)
  .handler(async ({ data }) => {
    try {
      const session = await requireSecurityAuth();
      const result = await checkStudentForSecurity(session, data.studentCode);
      return { ...result, success: result.found !== false };
    } catch (err: any) {
      console.error("[Security API Error] checkStudentSecurityApi:", err);
      return { success: false, error: err.message || "Failed to verify student." };
    }
  });

export const createSecurityReportApi = createServerFn({ method: "POST" })
  .validator((data: { studentCode: string; location: string; remarks: string; evidence?: string | null }) => data)
  .handler(async ({ data }) => {
    try {
      const session = await requireSecurityAuth();
      const res = await createSecurityViolationReport(session, data);
      return { ...res };
    } catch (err: any) {
      console.error("[Security API Error] createSecurityReportApi:", err);
      return { success: false, error: err.message || "Failed to report violation." };
    }
  });

export const verifyGatePassApi = createServerFn({ method: "POST" })
  .validator((data: { passIdOrRollNo: string; checkpoint?: string }) => data)
  .handler(async ({ data }) => {
    try {
      const session = await requireSecurityAuth();
      const res = await verifyGatePass(session, data);
      return { ...res };
    } catch (err: any) {
      console.error("[Security API Error] verifyGatePassApi:", err);
      return {
        success: false,
        authorized: false,
        resultStatus: "EXIT NOT AUTHORIZED",
        failureReason: err.message || "Verification failed.",
        message: "Student is NOT authorized to exit the campus.",
        timestamp: new Date().toISOString(),
      };
    }
  });

export const authorizeEarlyExitApi = createServerFn({ method: "POST" })
  .validator((data: { passId: string; checkpoint?: string; remarks?: string }) => data)
  .handler(async ({ data }) => {
    try {
      const session = await requireSecurityAuth();
      const res = await authorizeEarlyExit(session, data);
      return { ...res };
    } catch (err: any) {
      console.error("[Security API Error] authorizeEarlyExitApi:", err);
      return {
        success: false,
        authorized: false,
        resultStatus: "EARLY EXIT DENIED",
        failureReason: err.message || "Failed to authorize early exit.",
        message: err.message || "Early exit request failed.",
        timestamp: new Date().toISOString(),
      };
    }
  });

export const verifyGateQRApi = createServerFn({ method: "POST" })
  .validator((data: { qrToken: string; checkpoint?: string }) => data)
  .handler(async ({ data }) => {
    try {
      const session = await requireSecurityAuth();
      const { verifyQRTokenServer } = await import("../db/qr.server");
      const res = await verifyQRTokenServer(session, data.qrToken, data.checkpoint);
      return { ...res };
    } catch (err: any) {
      console.error("[Security API Error] verifyGateQRApi:", err);
      return {
        success: false,
        authorized: false,
        resultStatus: "ACCESS DENIED",
        failureReason: err.message || "Verification failed.",
        message: "Student is NOT authorized.",
        timestamp: new Date().toISOString(),
      };
    }
  });

export const getGatePassVerificationHistoryApi = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const session = await requireSecurityAuth();
    const history = await getGatePassVerificationHistory(session);
    return { success: true, history };
  } catch (err: any) {
    console.error("[Security API Error] getGatePassVerificationHistoryApi:", err);
    return { success: false, error: err.message || "Failed to fetch verification history.", history: [] };
  }
});

export const getSecurityAssignedGateApi = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const session = await requireSecurityAuth();
    const { getSecurityOfficerAssignedGate } = await import("../db/security.server");
    const assignedGate = await getSecurityOfficerAssignedGate(session);
    return {
      success: true,
      assigned: !!assignedGate,
      gateId: assignedGate,
      gateName: assignedGate,
      officerName: session.fullName,
      staffCode: session.staffCode,
      email: session.email,
    };
  } catch (err: any) {
    console.error("[Security API Error] getSecurityAssignedGateApi:", err);
    return {
      success: false,
      assigned: false,
      gateId: null,
      gateName: null,
      error: err.message || "Failed to fetch security gate assignment.",
    };
  }
});

export default {};


