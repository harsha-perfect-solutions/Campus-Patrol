import { useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { UserCog } from "lucide-react";
import { RoleGuard } from "@/components/role-guard";
import { PageHeader } from "@/components/page-header";
import { getAdminFacultyApi } from "@/lib/api/admin.server";

export const Route = createFileRoute("/admin/faculty")({
  head: () => ({ meta: [{ title: "Faculty Master — Admin Console" }] }),
  component: AdminFacultyPage,
});

function AdminFacultyPage() {
  const [facultyList, setFacultyList] = useState<
    { id: string; name: string; staffCode: string; department: string; email: string }[]
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function loadFaculty() {
      try {
        const res = await getAdminFacultyApi();
        if (isMounted && res.success) {
          setFacultyList(res.faculty);
        }
      } catch (err) {
        console.error("Failed to load faculty list from DB:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadFaculty();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <RoleGuard allowedRoles={["admin"]}>
      <div className="space-y-6">
        <PageHeader
          title="Faculty & Teaching Staff Master"
          description="Manage faculty profiles, staff codes and teaching assignments."
          breadcrumb={[{ label: "Admin", to: "/admin/dashboard" }, { label: "Faculty Master" }]}
        />

        {loading ? (
          <div className="card-surface p-8 rounded-2xl border border-border text-center text-xs text-muted-foreground">
            Loading faculty list from database...
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-3">
            {facultyList.map((f) => (
              <div
                key={f.id}
                className="card-surface p-5 rounded-2xl border border-border text-xs space-y-2"
              >
                <span className="font-bold text-foreground text-sm block">{f.name}</span>
                <p className="text-muted-foreground">
                  Staff Code: <strong className="text-foreground">{f.staffCode}</strong>
                </p>
                <p className="text-muted-foreground">
                  Department: <strong className="text-foreground">{f.department}</strong>
                </p>
                <p className="text-muted-foreground">
                  Email: <strong className="text-foreground">{f.email}</strong>
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </RoleGuard>
  );
}
