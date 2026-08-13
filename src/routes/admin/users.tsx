import { useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Users, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { RoleGuard } from "@/components/role-guard";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getAdminUsersApi, updateAdminUserRoleApi } from "@/lib/api/admin.server";
import type { AdminUserRecord } from "@/lib/db/admin.server";

export const Route = createFileRoute("/admin/users")({
  head: () => ({ meta: [{ title: "User Accounts — Admin Console" }] }),
  component: AdminUsersPage,
});

function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUserRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function loadUsers() {
      try {
        const res = await getAdminUsersApi();
        if (isMounted && res.success) {
          setUsers(res.users);
        }
      } catch (err) {
        console.error("Failed to load users from DB:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadUsers();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleRoleChange = async (
    userId: string,
    newRole: "admin" | "hod" | "faculty" | "student" | "security",
  ) => {
    try {
      const res = await updateAdminUserRoleApi({
        data: {
          userId,
          newRole,
        },
      });

      if (res.success) {
        toast.success(`Updated role for user to ${newRole.toUpperCase()}`);
        setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u)));
      } else {
        toast.error(res.error || "Failed to update user role.");
      }
    } catch (err) {
      console.error("Failed to update role:", err);
      toast.error("Error updating user role in database.");
    }
  };

  return (
    <RoleGuard allowedRoles={["admin"]}>
      <div className="space-y-6">
        <PageHeader
          title="User Account Management"
          description="Manage system access for Faculty, HOD, Student and Administrator accounts."
          breadcrumb={[{ label: "Admin", to: "/admin/dashboard" }, { label: "User Accounts" }]}
          actions={
            <Button
              size="sm"
              className="rounded-xl font-semibold bg-primary text-primary-foreground"
            >
              <UserPlus className="size-4 mr-1.5" /> Add New User
            </Button>
          }
        />

        {loading ? (
          <div className="card-surface p-8 rounded-2xl border border-border text-center text-xs text-muted-foreground">
            Loading user accounts from database...
          </div>
        ) : (
          <div className="card-surface p-6 rounded-2xl border border-border shadow-xs overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-divider text-muted-foreground uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">User Name</th>
                  <th className="py-3 px-4">Email / Code</th>
                  <th className="py-3 px-4">Current Role</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-divider font-medium">
                {users.map((u) => (
                  <tr key={u.id}>
                    <td className="py-3.5 px-4 font-bold text-foreground">{u.name}</td>
                    <td className="py-3.5 px-4 text-muted-foreground">
                      {u.email || u.studentCode || u.id}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-1 text-[10px] font-extrabold text-foreground uppercase">
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-foreground">{u.department}</td>
                    <td className="py-3.5 px-4 text-right">
                      <Select
                        value={u.role.toLowerCase()}
                        onValueChange={(val) =>
                          handleRoleChange(
                            u.id,
                            val as "admin" | "hod" | "faculty" | "student" | "security",
                          )
                        }
                      >
                        <SelectTrigger className="h-8 text-xs rounded-xl w-32 ml-auto">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">ADMIN</SelectItem>
                          <SelectItem value="hod">HOD</SelectItem>
                          <SelectItem value="faculty">FACULTY</SelectItem>
                          <SelectItem value="student">STUDENT</SelectItem>
                          <SelectItem value="security">SECURITY</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </RoleGuard>
  );
}
