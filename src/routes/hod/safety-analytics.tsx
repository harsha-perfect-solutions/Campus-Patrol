import { useState, useEffect, useCallback } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { RoleGuard } from "@/components/role-guard";
import { SafetyAnalyticsDashboard } from "@/components/analytics/safety-analytics-dashboard";
import {
  getHodSafetyAnalyticsApi,
  getHodSafetyDrilldownApi,
} from "@/lib/api/safety-analytics.server";
import type {
  CompleteSafetyAnalyticsResponse,
  SafetyAnalyticsFilters,
} from "@/lib/db/safety-analytics.server";

export const Route = createFileRoute("/hod/safety-analytics")({
  head: () => ({
    meta: [
      { title: "Department Safety Analytics — HOD Portal" },
      {
        name: "description",
        content: "Department-isolated disciplinary and student movement safety metrics for HOD.",
      },
    ],
  }),
  component: HodSafetyAnalyticsPage,
});

function HodSafetyAnalyticsPage() {
  return (
    <RoleGuard allowedRoles={["hod"]}>
      <HodSafetyAnalyticsContent />
    </RoleGuard>
  );
}

function HodSafetyAnalyticsContent() {
  const [analytics, setAnalytics] = useState<CompleteSafetyAnalyticsResponse | null>(null);
  const [department, setDepartment] = useState("");
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<SafetyAnalyticsFilters>({});

  const fetchAnalytics = useCallback(async (currentFilters: SafetyAnalyticsFilters) => {
    setLoading(true);
    try {
      const res = await getHodSafetyAnalyticsApi({ data: currentFilters });
      if (res.success && res.analytics) {
        setAnalytics(res.analytics);
        setDepartment(res.department);
      } else {
        toast.error(res.error || "Failed to load department safety analytics.");
      }
    } catch (err: any) {
      console.error("Error fetching HOD safety analytics:", err);
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
    const res = await getHodSafetyDrilldownApi({
      data: {
        filters,
        drillType: drillType as any,
        drillKey,
        limit: 50,
        offset: 0,
      },
    });

    if (!res.success) {
      throw new Error(res.error || "Failed to retrieve department drilldown cases.");
    }
    return { reports: res.reports, total: res.total };
  };

  return (
    <SafetyAnalyticsDashboard
      role="hod"
      departmentName={department}
      analytics={analytics}
      loading={loading}
      onRefresh={() => fetchAnalytics(filters)}
      onFilterChange={handleFilterChange}
      onDrilldown={handleDrilldown}
    />
  );
}
