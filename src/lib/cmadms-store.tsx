import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { AppRole } from "@/lib/auth";
import {
  hodByDepartment,
  seedAuditLogs,
  seedNotifications,
  seedPermissions,
  seedReports,
  seedSemesters,
  students as seedStudents,
  type AuditLogRecord,
  type MovementPermissionRecord,
  type Notification,
  type PermissionStatus,
  type Report,
  type ReportStatus,
  type SemesterRecord,
  type Student,
} from "@/lib/cmadms-data";

type AddReportResult =
  | { success: true; report: Report }
  | { success: false; error: string; existingReport: Report };

type SubmitExplanationResult =
  | { success: true; report: Report }
  | { success: false; error: string };

type Ctx = {
  reports: Report[];
  permissions: MovementPermissionRecord[];
  notifications: Notification[];
  auditLogs: AuditLogRecord[];
  semesters: SemesterRecord[];
  studentsList: Student[];
  activeSemester: SemesterRecord;

  // Actions
  addReport: (reportData: Omit<Report, "id" | "createdAt" | "explanationDeadline" | "status" | "timeline" | "departmentHod">) => AddReportResult;
  updateReport: (id: string, patch: Partial<Report>, actor?: { name: string; role: AppRole }) => void;
  checkDuplicateReport: (studentId: string, className: string) => Report | undefined;
  submitExplanation: (reportId: string, text: string, evidence?: string) => SubmitExplanationResult;
  executeHodDecision: (reportId: string, decision: "exonerate" | "warning" | "escalate", notes: string, hodName: string) => void;

  // Permissions System
  addPermission: (perm: Omit<MovementPermissionRecord, "id" | "createdAt" | "updatedAt">) => MovementPermissionRecord;
  updatePermissionStatus: (id: string, status: PermissionStatus, approvedBy?: string) => void;
  checkActivePermission: (studentId: string) => MovementPermissionRecord | undefined;

  // Notifications System
  unreadCount: number;
  addNotification: (n: Omit<Notification, "id" | "time" | "read">) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  clearNotifications: () => void;

  // Audit Logs
  addAuditLog: (actor: string, actorRole: AppRole, action: string, target: string, targetId?: string, metadata?: Record<string, any>) => void;

  // Semester Management
  activateSemester: (semId: string) => void;
  getStudentConfirmedViolationsCount: (studentId: string, semesterNum?: number) => number;

  // Theme
  theme: "light" | "dark";
  setTheme: (t: "light" | "dark") => void;
};

const CmadmsContext = createContext<Ctx | null>(null);

export function CmadmsProvider({ children }: { children: ReactNode }) {
  const [reports, setReports] = useState<Report[]>(seedReports);
  const [permissions, setPermissions] = useState<MovementPermissionRecord[]>(seedPermissions);
  const [notifications, setNotifications] = useState<Notification[]>(seedNotifications);
  const [auditLogs, setAuditLogs] = useState<AuditLogRecord[]>(seedAuditLogs);
  const [semesters, setSemesters] = useState<SemesterRecord[]>(seedSemesters);
  const [studentsList, setStudentsList] = useState<Student[]>(seedStudents);
  const [theme, setThemeState] = useState<"light" | "dark">("light");

  const activeSemester: SemesterRecord = useMemo(
    () => (semesters.find((s) => s.isActive) ?? semesters[0] ?? seedSemesters[0])!,
    [semesters],
  );

  useEffect(() => {
    const stored = window.localStorage.getItem("cmadms-theme");
    if (stored === "dark" || stored === "light") setThemeState(stored);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  const setTheme = useCallback((t: "light" | "dark") => {
    setThemeState(t);
    window.localStorage.setItem("cmadms-theme", t);
  }, []);

  const addAuditLog = useCallback(
    (actor: string, actorRole: AppRole, action: string, target: string, targetId?: string, metadata?: Record<string, any>) => {
      const entry: AuditLogRecord = {
        id: `AUD-${Date.now()}`,
        actor,
        actorRole,
        action,
        target,
        timestamp: new Date().toISOString(),
      };
      if (targetId) entry.targetId = targetId;
      if (metadata) entry.metadata = metadata;
      setAuditLogs((prev) => [entry, ...prev]);
    },
    [],
  );

  const addNotification = useCallback((n: Omit<Notification, "id" | "time" | "read">) => {
    const entry: Notification = {
      ...n,
      id: `N-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      time: "Just now",
      read: false,
    };
    setNotifications((prev) => [entry, ...prev]);
  }, []);

  const checkDuplicateReport = useCallback(
    (studentId: string, className: string): Report | undefined => {
      const todayStr = (new Date().toISOString().split("T")[0]) || "";
      return reports.find(
        (r) =>
          r.studentId === studentId &&
          (r.className || "").toLowerCase() === (className || "").toLowerCase() &&
          (r.createdAt || "").startsWith(todayStr) &&
          r.status !== "Exonerated" &&
          r.status !== "resolved",
      );
    },
    [reports],
  );

  const addReport = useCallback(
    (reportData: Omit<Report, "id" | "createdAt" | "explanationDeadline" | "status" | "timeline" | "departmentHod">): AddReportResult => {
      const duplicate = checkDuplicateReport(reportData.studentId, reportData.className);
      if (duplicate) {
        return {
          success: false,
          error: "Recent report already exists for this student in this session.",
          existingReport: duplicate,
        };
      }

      const now = new Date();
      const deadline = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const reportId = `V-${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, "0")}${now.getDate().toString().padStart(2, "0")}-${Math.floor(100 + Math.random() * 900)}`;

      const currentSemNumber = activeSemester ? activeSemester.semesterNumber : 6;
      const assignedHod = hodByDepartment[reportData.department]?.name || "Dr. Anjali Rao (HOD)";

      const newReport: Report = {
        ...reportData,
        id: reportId,
        departmentHod: assignedHod,
        createdAt: now.toISOString(),
        explanationDeadline: deadline.toISOString(),
        status: "Awaiting Explanation",
        semester: currentSemNumber,
        timeline: [
          {
            time: now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true }),
            title: "Violation reported",
            detail: `By ${reportData.reportedBy}`,
            tone: "violation",
          },
          {
            time: now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true }),
            title: "Student notified",
            detail: "24-hour explanation window opened",
            tone: "info",
          },
        ],
      };

      setReports((prev) => [newReport, ...prev]);

      // Notifications
      addNotification({
        recipientRole: "student",
        recipientId: reportData.studentId,
        title: "Violation Reported",
        detail: `Report logged for ${reportData.className}. Submit explanation within 24 hours.`,
        tone: "violation",
        relatedReportId: reportId,
      });

      addNotification({
        recipientRole: "hod",
        title: "New Violation Case",
        detail: `${reportData.studentName} (${reportData.studentId}) reported by ${reportData.reportedBy}.`,
        tone: "pending",
        relatedReportId: reportId,
      });

      addNotification({
        recipientRole: "faculty",
        title: "Report Submitted",
        detail: `Case ${reportId} recorded successfully.`,
        tone: "info",
        relatedReportId: reportId,
      });

      // Audit Log
      addAuditLog(reportData.reportedBy, "faculty", "REPORT_VIOLATION", `Student ${reportData.studentId}`, reportId);

      return { success: true, report: newReport };
    },
    [checkDuplicateReport, activeSemester, addNotification, addAuditLog],
  );

  const updateReport = useCallback(
    (id: string, patch: Partial<Report>, actor?: { name: string; role: AppRole }) => {
      setReports((prev) =>
        prev.map((r) => {
          if (r.id !== id) return r;
          const updated = { ...r, ...patch };
          if (actor) {
            addAuditLog(actor.name, actor.role, "UPDATE_REPORT", `Case ${id}`, id, patch);
          }
          return updated;
        }),
      );
    },
    [addAuditLog],
  );

  const submitExplanation = useCallback(
    (reportId: string, text: string, evidence?: string): SubmitExplanationResult => {
      const report = reports.find((r) => r.id === reportId);
      if (!report) return { success: false, error: "Report not found." };

      const now = new Date();
      const deadline = new Date(report.explanationDeadline);

      if (now > deadline) {
        addAuditLog(report.studentName, "student", "SUBMIT_EXPLANATION_EXPIRED_REJECTED", `Case ${reportId}`, reportId);
        return { success: false, error: "Explanation deadline has passed. Submission rejected." };
      }

      const time = now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });

      const updatedPatch: Partial<Report> = {
        explanation: text,
        explanationSubmittedAt: now.toISOString(),
        status: "Explanation Submitted",
        timeline: [
          ...report.timeline,
          {
            time,
            title: "Student explanation submitted",
            detail: text,
            tone: "info",
          },
        ],
      };
      if (evidence) {
        updatedPatch.evidence = evidence;
      }

      updateReport(reportId, updatedPatch);

      addNotification({
        recipientRole: "hod",
        title: "Explanation Submitted",
        detail: `${report.studentName} submitted explanation for Case ${reportId}.`,
        tone: "info",
        relatedReportId: reportId,
      });

      addNotification({
        recipientRole: "faculty",
        title: "Student Explanation Submitted",
        detail: `${report.studentName} responded to Case ${reportId}.`,
        tone: "info",
        relatedReportId: reportId,
      });

      addAuditLog(report.studentName, "student", "SUBMIT_EXPLANATION", `Case ${reportId}`, reportId);

      return { success: true, report: { ...report, ...updatedPatch } };
    },
    [reports, updateReport, addNotification, addAuditLog],
  );

  const executeHodDecision = useCallback(
    (reportId: string, decision: "exonerate" | "warning" | "escalate", notes: string, hodName: string) => {
      const report = reports.find((r) => r.id === reportId);
      if (!report) return;

      const now = new Date();
      const time = now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });

      const statusMap: Record<typeof decision, ReportStatus> = {
        exonerate: "Exonerated",
        warning: "Warning",
        escalate: "Escalated",
      };

      const decisionTitleMap: Record<typeof decision, string> = {
        exonerate: "Case Exonerated — Pass Valid",
        warning: "Written Warning Issued",
        escalate: "Case Escalated to Disciplinary Committee",
      };

      const patch: Partial<Report> = {
        status: statusMap[decision],
        decision: decisionTitleMap[decision],
        decisionBy: hodName,
        decisionAt: now.toISOString(),
        timeline: [
          ...report.timeline,
          {
            time,
            title: decisionTitleMap[decision],
            detail: notes ? `Notes: ${notes}` : `Decision recorded by ${hodName}`,
            tone: decision === "exonerate" ? "resolved" : "violation",
          },
        ],
      };

      updateReport(reportId, patch);

      // Notifications
      addNotification({
        recipientRole: "student",
        recipientId: report.studentId,
        title: `HOD Decision: ${decisionTitleMap[decision]}`,
        detail: `HOD recorded decision for Case ${reportId}.`,
        tone: decision === "exonerate" ? "resolved" : "violation",
        relatedReportId: reportId,
      });

      addNotification({
        recipientRole: "faculty",
        title: `HOD Decision Updated`,
        detail: `Case ${reportId} decision: ${decisionTitleMap[decision]}.`,
        tone: "info",
        relatedReportId: reportId,
      });

      addAuditLog(hodName, "hod", `HOD_DECISION_${decision.toUpperCase()}`, `Case ${reportId}`, reportId, { notes });
    },
    [reports, updateReport, addNotification, addAuditLog],
  );

  const checkActivePermission = useCallback(
    (studentId: string): MovementPermissionRecord | undefined => {
      return permissions.find((p) => p.studentId === studentId && p.status === "Approved");
    },
    [permissions],
  );

  const addPermission = useCallback(
    (perm: Omit<MovementPermissionRecord, "id" | "createdAt" | "updatedAt">): MovementPermissionRecord => {
      const now = new Date().toISOString();
      const newPerm: MovementPermissionRecord = {
        ...perm,
        id: `PERM-${Math.floor(100 + Math.random() * 900)}`,
        createdAt: now,
        updatedAt: now,
      };
      setPermissions((prev) => [newPerm, ...prev]);
      addAuditLog(perm.approvedBy, "hod", "CREATE_MOVEMENT_PERMISSION", `Student ${perm.studentId}`, newPerm.id);
      return newPerm;
    },
    [addAuditLog],
  );

  const updatePermissionStatus = useCallback(
    (id: string, status: PermissionStatus, approvedBy?: string) => {
      setPermissions((prev) =>
        prev.map((p) =>
          p.id === id
            ? {
                ...p,
                status,
                approvedBy: approvedBy || p.approvedBy,
                updatedAt: new Date().toISOString(),
              }
            : p,
        ),
      );
    },
    [],
  );

  const activateSemester = useCallback((semId: string) => {
    setSemesters((prev) =>
      prev.map((s) => ({
        ...s,
        isActive: s.id === semId,
      })),
    );
  }, []);

  const getStudentConfirmedViolationsCount = useCallback(
    (studentId: string, semesterNum?: number): number => {
      const targetSem = semesterNum ?? (activeSemester ? activeSemester.semesterNumber : 6);
      return reports.filter(
        (r) =>
          r.studentId === studentId &&
          r.semester === targetSem &&
          r.status !== "Exonerated" &&
          r.status !== "resolved",
      ).length;
    },
    [reports, activeSemester],
  );

  const value = useMemo<Ctx>(
    () => ({
      reports,
      permissions,
      notifications,
      auditLogs,
      semesters,
      studentsList,
      activeSemester,
      addReport,
      updateReport,
      checkDuplicateReport,
      submitExplanation,
      executeHodDecision,
      addPermission,
      updatePermissionStatus,
      checkActivePermission,
      unreadCount: notifications.filter((n) => !n.read).length,
      addNotification,
      markRead: (id) =>
        setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n))),
      markAllRead: () => setNotifications((prev) => prev.map((n) => ({ ...n, read: true }))),
      clearNotifications: () => setNotifications([]),
      addAuditLog,
      activateSemester,
      getStudentConfirmedViolationsCount,
      theme,
      setTheme,
    }),
    [
      reports,
      permissions,
      notifications,
      auditLogs,
      semesters,
      studentsList,
      activeSemester,
      addReport,
      updateReport,
      checkDuplicateReport,
      submitExplanation,
      executeHodDecision,
      addPermission,
      updatePermissionStatus,
      checkActivePermission,
      addNotification,
      addAuditLog,
      activateSemester,
      getStudentConfirmedViolationsCount,
      theme,
      setTheme,
    ],
  );

  return <CmadmsContext.Provider value={value}>{children}</CmadmsContext.Provider>;
}

export function useCmadms() {
  const ctx = useContext(CmadmsContext);
  if (!ctx) throw new Error("useCmadms me react must be used inside CmadmsProvider");
  return ctx;
}
