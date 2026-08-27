import { createServerFn } from "@tanstack/react-start";
import { requireRole } from "../session.server";
import {
  runPreventiveSafetyEngine,
  getSafetyPreventionKPIs,
  getSafetyAlerts,
  getPreventiveActions,
  getSafetyAlertRules,
  acknowledgeSafetyAlert,
  escalateSafetyAlert,
  createPreventiveAction,
  assignPreventiveAction,
  startPreventiveAction,
  completePreventiveAction,
  toggleSafetyAlertRule,
  type SafetyPreventionKPIs,
  type DBSafetyAlert,
  type DBPreventiveAction,
  type DBSafetyAlertRule,
  type PreventionFilterOptions,
  type CreatePreventiveActionInput,
} from "../db/safety-prevention.server";
import { detectSafetyHotspots, type SafetyHotspot } from "../db/safety-reporting.server";

// ─── 1. Admin Prevention Dashboard API ──────────────────────────────────────

export const getAdminPreventionDashboardApi = createServerFn({ method: "POST" })
  .validator((d: PreventionFilterOptions | undefined) => d)
  .handler(
    async ({
      data,
    }): Promise<{
      success: boolean;
      kpis: SafetyPreventionKPIs | null;
      alerts: DBSafetyAlert[];
      alertsTotal: number;
      actions: DBPreventiveAction[];
      actionsTotal: number;
      rules: DBSafetyAlertRule[];
      hotspots: SafetyHotspot[];
      error?: string;
    }> => {
      try {
        await requireRole("admin");
        const filters = data || {};

        // Run engine pass to capture any new pattern triggers
        await runPreventiveSafetyEngine();

        const [kpis, alertRes, actionRes, rules, hotspots] = await Promise.all([
          getSafetyPreventionKPIs(filters.department),
          getSafetyAlerts(filters, 50, 0),
          getPreventiveActions(filters, 50, 0),
          getSafetyAlertRules(),
          detectSafetyHotspots({ department: filters.department }, 6),
        ]);

        return {
          success: true,
          kpis,
          alerts: alertRes.alerts,
          alertsTotal: alertRes.total,
          actions: actionRes.actions,
          actionsTotal: actionRes.total,
          rules,
          hotspots,
        };
      } catch (err: any) {
        console.error("[Safety Prevention API Error] getAdminPreventionDashboardApi:", err);
        return {
          success: false,
          kpis: null,
          alerts: [],
          alertsTotal: 0,
          actions: [],
          actionsTotal: 0,
          rules: [],
          hotspots: [],
          error: err.message || "Failed to load admin preventive dashboard.",
        };
      }
    },
  );

// ─── 2. HOD Prevention Dashboard API (Zero-Trust Department Isolated) ───────

export const getHodPreventionDashboardApi = createServerFn({ method: "POST" })
  .validator((d: PreventionFilterOptions | undefined) => d)
  .handler(
    async ({
      data,
    }): Promise<{
      success: boolean;
      department: string;
      kpis: SafetyPreventionKPIs | null;
      alerts: DBSafetyAlert[];
      alertsTotal: number;
      actions: DBPreventiveAction[];
      actionsTotal: number;
      hotspots: SafetyHotspot[];
      error?: string;
    }> => {
      try {
        const session = await requireRole("hod");
        const hodDept = session.department;
        if (!hodDept) throw new Error("No department assigned to authenticated HOD.");

        const departmentFilters: PreventionFilterOptions = {
          ...(data || {}),
          department: hodDept,
        };

        const [kpis, alertRes, actionRes, hotspots] = await Promise.all([
          getSafetyPreventionKPIs(hodDept),
          getSafetyAlerts(departmentFilters, 50, 0),
          getPreventiveActions(departmentFilters, 50, 0),
          detectSafetyHotspots({ department: hodDept }, 6),
        ]);

        return {
          success: true,
          department: hodDept,
          kpis,
          alerts: alertRes.alerts,
          alertsTotal: alertRes.total,
          actions: actionRes.actions,
          actionsTotal: actionRes.total,
          hotspots,
        };
      } catch (err: any) {
        console.error("[Safety Prevention API Error] getHodPreventionDashboardApi:", err);
        return {
          success: false,
          department: "",
          kpis: null,
          alerts: [],
          alertsTotal: 0,
          actions: [],
          actionsTotal: 0,
          hotspots: [],
          error: err.message || "Failed to load department preventive dashboard.",
        };
      }
    },
  );


// ─── 4. Preventive Action Lifecycle APIs ────────────────────────────────────

export const createPreventiveActionApi = createServerFn({ method: "POST" })
  .validator((d: CreatePreventiveActionInput) => d)
  .handler(
    async ({
      data,
    }): Promise<{
      success: boolean;
      action: DBPreventiveAction | null;
      error?: string;
    }> => {
      try {
        const session = await requireRole("admin");
        const action = await createPreventiveAction(
          data,
          session.fullName || "Admin User",
          session.role || "admin",
        );
        return { success: true, action };
      } catch (err: any) {
        console.error("[Safety Prevention API Error] createPreventiveActionApi:", err);
        return {
          success: false,
          action: null,
          error: err.message || "Failed to create preventive action.",
        };
      }
    },
  );

export const assignPreventiveActionApi = createServerFn({ method: "POST" })
  .validator(
    (d: {
      actionId: string;
      assignedTo: string;
      assignedRole: string;
    }) => d,
  )
  .handler(
    async ({
      data,
    }): Promise<{
      success: boolean;
      action: DBPreventiveAction | null;
      error?: string;
    }> => {
      try {
        const session = await requireRole("admin");
        const action = await assignPreventiveAction(
          data.actionId,
          data.assignedTo,
          data.assignedRole,
          session.fullName || "Admin User",
          session.role || "admin",
        );
        return { success: true, action };
      } catch (err: any) {
        console.error("[Safety Prevention API Error] assignPreventiveActionApi:", err);
        return {
          success: false,
          action: null,
          error: err.message || "Failed to assign preventive action.",
        };
      }
    },
  );

export const startPreventiveActionApi = createServerFn({ method: "POST" })
  .validator((d: { actionId: string }) => d)
  .handler(
    async ({
      data,
    }): Promise<{
      success: boolean;
      action: DBPreventiveAction | null;
      error?: string;
    }> => {
      try {
        // Can be started by Admin, HOD, or Security
        const session = await requireRole("admin");
        const action = await startPreventiveAction(
          data.actionId,
          session.fullName || "Officer",
          session.role || "admin",
        );
        return { success: true, action };
      } catch (err: any) {
        console.error("[Safety Prevention API Error] startPreventiveActionApi:", err);
        return {
          success: false,
          action: null,
          error: err.message || "Failed to start preventive action.",
        };
      }
    },
  );

export const completePreventiveActionApi = createServerFn({ method: "POST" })
  .validator(
    (d: {
      actionId: string;
      completionRemarks: string;
    }) => d,
  )
  .handler(
    async ({
      data,
    }): Promise<{
      success: boolean;
      action: DBPreventiveAction | null;
      error?: string;
    }> => {
      try {
        const session = await requireRole("admin");
        const action = await completePreventiveAction(
          data.actionId,
          data.completionRemarks,
          session.fullName || "User",
          session.role || "admin",
        );
        return { success: true, action };
      } catch (err: any) {
        console.error("[Safety Prevention API Error] completePreventiveActionApi:", err);
        return {
          success: false,
          action: null,
          error: err.message || "Failed to complete preventive action.",
        };
      }
    },
  );

// ─── 5. Alert Management APIs ───────────────────────────────────────────────

export const acknowledgeSafetyAlertApi = createServerFn({ method: "POST" })
  .validator((d: { alertId: string }) => d)
  .handler(
    async ({
      data,
    }): Promise<{
      success: boolean;
      alert: DBSafetyAlert | null;
      error?: string;
    }> => {
      try {
        const session = await requireRole("admin");
        const alert = await acknowledgeSafetyAlert(
          data.alertId,
          session.fullName || "Admin User",
          session.role || "admin",
        );
        return { success: true, alert };
      } catch (err: any) {
        console.error("[Safety Prevention API Error] acknowledgeSafetyAlertApi:", err);
        return {
          success: false,
          alert: null,
          error: err.message || "Failed to acknowledge safety alert.",
        };
      }
    },
  );

export const escalateSafetyAlertApi = createServerFn({ method: "POST" })
  .validator((d: { alertId: string; reason: string }) => d)
  .handler(
    async ({
      data,
    }): Promise<{
      success: boolean;
      alert: DBSafetyAlert | null;
      error?: string;
    }> => {
      try {
        const session = await requireRole("admin");
        const alert = await escalateSafetyAlert(
          data.alertId,
          session.fullName || "Admin User",
          session.role || "admin",
          data.reason,
        );
        return { success: true, alert };
      } catch (err: any) {
        console.error("[Safety Prevention API Error] escalateSafetyAlertApi:", err);
        return {
          success: false,
          alert: null,
          error: err.message || "Failed to escalate safety alert.",
        };
      }
    },
  );

export const toggleSafetyAlertRuleApi = createServerFn({ method: "POST" })
  .validator((d: { ruleId: string; enabled: boolean }) => d)
  .handler(
    async ({
      data,
    }): Promise<{
      success: boolean;
      rule: DBSafetyAlertRule | null;
      error?: string;
    }> => {
      try {
        const session = await requireRole("admin");
        const rule = await toggleSafetyAlertRule(
          data.ruleId,
          data.enabled,
          session.fullName || "Admin User",
          session.role || "admin",
        );
        return { success: true, rule };
      } catch (err: any) {
        console.error("[Safety Prevention API Error] toggleSafetyAlertRuleApi:", err);
        return {
          success: false,
          rule: null,
          error: err.message || "Failed to toggle safety rule.",
        };
      }
    },
  );

export default {};
