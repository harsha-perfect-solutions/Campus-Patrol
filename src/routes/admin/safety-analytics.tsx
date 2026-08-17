import { useState, useEffect, useCallback } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { RoleGuard } from "@/components/role-guard";
import { SafetyAnalyticsDashboard } from "@/components/analytics/safety-analytics-dashboard";
import {
  getAdminSafetyAnalyticsApi,
  getAdminSafetyDrilldownApi,
} from "@/lib/api/safety-analytics.server";
import type {
  CompleteSafetyAnalyticsResponse,
  SafetyAnalyticsFilters,
} from "@/lib/db/safety-analytics.server";

export const Route = createFileRoute("/admin/safety-analytics")({
  head: () => ({
    meta: [
      { title: "Campus Safety Analytics — Admin Console" },
      {
        name: "description",
        content: "Institutional-level campus safety analytics, emergency response benchmarks and student movement metrics.",
      },
    ],
  }),
  component: AdminSafetyAnalyticsPage,
});

function AdminSafetyAnalyticsPage() {
  return (
    <RoleGuard allowedRoles={["admin"]}>
      <AdminSafetyAnalyticsContent />
    </RoleGuard>
  );
}

function AdminSafetyAnalyticsContent() {
  const [analytics, setAnalytics] = useState<CompleteSafetyAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<SafetyAnalyticsFilters>({});

  const fetchAnalytics = useCallback(async (currentFilters: SafetyAnalyticsFilters) => {
    setLoading(true);
    try {
      const res = await getAdminSafetyAnalyticsApi({ data: currentFilters });
      if (res.success && res.analytics) {
        setAnalytics(res.analytics);
      } else {
        toast.error(res.error || "Failed to load safety analytics.");
      }
    } catch (err: any) {
      console.error("Error fetching admin safety analytics:", err);
      toast.error("Failed to connect to analytics server.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics(filters);
    // Poll analytics every 45 seconds
    const interval = setInterval(() => {
      fetchAnalytics(filters);
    }, 45000);
    return () => clearInterval(interval);
  }, [fetchAnalytics, filters]);

  const handleFilterChange = (newFilters: SafetyAnalyticsFilters) => {
    setFilters(newFilters);
    fetchAnalytics(newFilters);
  };

  const handleDrilldown = async (drillType: string, drillKey: string) => {
    const res = await getAdminSafetyDrilldownApi({
      data: {
        filters,
        drillType: drillType as any,
        drillKey,
        limit: 50,
        offset: 0,
      },
    });

    if (!res.success) {
      throw new Error(res.error || "Failed to retrieve drilldown cases.");
    }
    return { reports: res.reports, total: res.total };
  };

  return (
    <SafetyAnalyticsDashboard
      role="admin"
      analytics={analytics}
      loading={loading}
      onRefresh={() => fetchAnalytics(filters)}
      onFilterChange={handleFilterChange}
      onDrilldown={handleDrilldown}
    />
  );
}
