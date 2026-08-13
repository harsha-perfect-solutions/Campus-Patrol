import { useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Building2 } from "lucide-react";
import { RoleGuard } from "@/components/role-guard";
import { PageHeader } from "@/components/page-header";
import { getAdminDepartmentsApi } from "@/lib/api/admin.server";

export const Route = createFileRoute("/admin/departments")({
  head: () => ({ meta: [{ title: "Departments — Admin Console" }] }),
  component: AdminDepartmentsPage,
});

function AdminDepartmentsPage() {
  const [departments, setDepartments] = useState<{ code: string; name: string; status: string }[]>(
    [],
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function loadDepts() {
      try {
        const res = await getAdminDepartmentsApi();
        if (isMounted && res.success) {
          setDepartments(res.departments);
        }
      } catch (err) {
        console.error("Failed to load departments from DB:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadDepts();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <RoleGuard allowedRoles={["admin"]}>
      <div className="space-y-6">
        <PageHeader
          title="Academic Departments"
          description="Manage institutional departments and section structures."
          breadcrumb={[{ label: "Admin", to: "/admin/dashboard" }, { label: "Departments" }]}
        />

        {loading ? (
          <div className="card-surface p-8 rounded-2xl border border-border text-center text-xs text-muted-foreground">
            Loading departments from database...
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-3">
            {departments.map((dept) => (
              <div
                key={dept.code}
                className="card-surface p-5 rounded-2xl border border-border text-xs"
              >
                <span className="font-bold text-foreground text-sm block">{dept.name}</span>
                <p className="text-muted-foreground mt-1">
                  Code: <strong className="text-foreground">{dept.code}</strong> &bull; Status:{" "}
                  <strong className="text-emerald-600 font-bold">{dept.status}</strong>
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </RoleGuard>
  );
}
