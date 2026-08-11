import { createFileRoute } from "@tanstack/react-router";
import { Users, UserPlus } from "lucide-react";
import { RoleGuard } from "@/components/role-guard";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/admin/users")({
  head: () => ({ meta: [{ title: "User Accounts — Admin Console" }] }),
  component: AdminUsersPage,
});

function AdminUsersPage() {
  return (
    <RoleGuard allowedRoles={["admin"]}>
      <div className="space-y-6">
        <PageHeader
          title="User Account Management"
          description="Manage system access for Faculty, HOD, Student and Administrator accounts."
          breadcrumb={[{ label: "Admin", to: "/admin/dashboard" }, { label: "User Accounts" }]}
          actions={
            <Button size="sm" className="rounded-xl font-semibold bg-primary text-primary-foreground">
              <UserPlus className="size-4 mr-1.5" /> Add New User
            </Button>
          }
        />

        <div className="card-surface p-6 rounded-2xl border border-border shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-divider text-muted-foreground uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">User Name</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-divider font-medium">
              {[
                { name: "Prof. Ravi Kumar", email: "faculty@cmadms.edu", role: "FACULTY", dept: "CSE" },
                { name: "Dr. Anjali Rao", email: "hod.cse@cmadms.edu", role: "HOD", dept: "CSE" },
                { name: "Meera Nair", email: "student@cmadms.edu", role: "STUDENT", dept: "CSE" },
                { name: "System Administrator", email: "admin@cmadms.edu", role: "ADMIN", dept: "SYSTEM" },
              ].map((u) => (
                <tr key={u.email}>
                  <td className="py-3.5 px-4 font-bold text-foreground">{u.name}</td>
                  <td className="py-3.5 px-4 text-muted-foreground">{u.email}</td>
                  <td className="py-3.5 px-4">
                    <span className="rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-1 text-[10px] font-extrabold text-foreground">
                      {u.role}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-foreground">{u.dept}</td>
                  <td className="py-3.5 px-4 text-right text-emerald-600 font-bold">Active</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </RoleGuard>
  );
}
