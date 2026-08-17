import { useState, useEffect, useCallback, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Building2,
  CheckCircle2,
  Filter,
  Plus,
  Pencil,
  RotateCcw,
  Search,
  Trash2,
  RefreshCw,
  Power,
} from "lucide-react";
import { toast } from "sonner";
import { RoleGuard } from "@/components/role-guard";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ToneBadge } from "@/components/status-badge";
import { cn } from "@/lib/utils";
import {
  getDepartmentsApi,
  createDepartmentApi,
  updateDepartmentApi,
  deleteDepartmentApi,
} from "@/lib/api/departments.server";
import type { DepartmentItem } from "@/lib/db/departments.server";

export const Route = createFileRoute("/admin/departments")({
  head: () => ({ meta: [{ title: "Departments — Admin Console" }] }),
  component: AdminDepartmentsPage,
});

function AdminDepartmentsPage() {
  const [departments, setDepartments] = useState<DepartmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("ALL");

  // Modal State
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<DepartmentItem | null>(null);
  const [formCode, setFormCode] = useState("");
  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");

  // Delete Dialog State
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingDept, setDeletingDept] = useState<DepartmentItem | null>(null);

  const fetchDepartments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getDepartmentsApi({
        data: {
          status: selectedStatus,
          search,
        },
      });

      if (res.success) {
        setDepartments(res.departments);
      } else {
        toast.error(res.error || "Failed to load departments.");
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to connect to departments server.");
    } finally {
      setLoading(false);
    }
  }, [selectedStatus, search]);

  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  const stats = useMemo(() => {
    const total = departments.length;
    const active = departments.filter((d) => d.status === "Active").length;
    const inactive = departments.filter((d) => d.status === "Inactive").length;
    return { total, active, inactive };
  }, [departments]);

  function handleOpenCreate() {
    setEditingDept(null);
    setFormCode("");
    setFormName("");
    setFormDesc("");
    setDialogOpen(true);
  }

  function handleOpenEdit(dept: DepartmentItem) {
    setEditingDept(dept);
    setFormCode(dept.departmentCode);
    setFormName(dept.departmentName);
    setFormDesc(dept.description);
    setDialogOpen(true);
  }

  async function handleSaveDepartment(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!formCode.trim() || !formName.trim()) {
      toast.error("Please enter both Department Code and Name.");
      return;
    }

    setSubmitting(true);
    try {
      if (editingDept) {
        const res = await updateDepartmentApi({
          data: {
            id: editingDept.id,
            input: {
              departmentCode: formCode.trim().toUpperCase(),
              departmentName: formName.trim(),
              description: formDesc.trim(),
            },
          },
        });

        if (res.success && res.department) {
          toast.success(`Department ${res.department.departmentCode} updated.`);
          setDialogOpen(false);
          fetchDepartments();
        } else {
          toast.error(res.error || "Failed to update department.");
        }
      } else {
        const res = await createDepartmentApi({
          data: {
            departmentCode: formCode.trim().toUpperCase(),
            departmentName: formName.trim(),
            description: formDesc.trim(),
            status: "Active",
          },
        });

        if (res.success && res.department) {
          toast.success(`Department ${res.department.departmentCode} registered.`);
          setDialogOpen(false);
          fetchDepartments();
        } else {
          toast.error(res.error || "Failed to create department.");
        }
      }
    } catch (err: any) {
      toast.error(err.message || "An error occurred while saving department.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleStatus(dept: DepartmentItem) {
    const newStatus = dept.status === "Active" ? "Inactive" : "Active";
    setSubmitting(true);
    try {
      const res = await updateDepartmentApi({
        data: {
          id: dept.id,
          input: { status: newStatus },
        },
      });

      if (res.success && res.department) {
        toast.success(
          `Department ${res.department.departmentCode} is now ${res.department.status}.`,
        );
        fetchDepartments();
      } else {
        toast.error(res.error || "Failed to update department status.");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to update department status.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleConfirmDelete() {
    if (!deletingDept) return;
    setSubmitting(true);
    try {
      const res = await deleteDepartmentApi({
        data: { id: deletingDept.id },
      });

      if (res.success) {
        toast.success(`Department ${deletingDept.departmentCode} removed.`);
        setDeleteDialogOpen(false);
        setDeletingDept(null);
        fetchDepartments();
      } else {
        toast.error(res.error || "Failed to remove department.");
      }
    } catch (err: any) {
      toast.error(err.message || "An error occurred while removing department.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleResetFilters() {
    setSearch("");
    setSelectedStatus("ALL");
  }

  return (
    <RoleGuard allowedRoles={["admin"]}>
      <div className="space-y-6">
        <PageHeader
          title="Academic Departments"
          description="Manage institutional academic departments, codes, descriptions, and active status."
          breadcrumb={[{ label: "Admin", to: "/admin/dashboard" }, { label: "Departments" }]}
          actions={
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchDepartments}
                disabled={loading}
                className="rounded-xl font-bold text-xs h-9 gap-1.5 shadow-2xs"
              >
                <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
                Refresh
              </Button>
              <Button
                size="sm"
                onClick={handleOpenCreate}
                className="rounded-xl font-bold text-xs h-9 gap-2 shadow-xs bg-primary text-primary-foreground"
              >
                <Plus className="size-4" />
                Add Department
              </Button>
            </div>
          }
        />

        {/* KPI Stats */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="card-surface p-4 rounded-2xl border border-border shadow-2xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                Total Departments
              </p>
              <p className="mt-1 text-2xl font-extrabold text-foreground">{stats.total}</p>
            </div>
            <span className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary">
              <Building2 className="size-4.5" />
            </span>
          </div>

          <div className="card-surface p-4 rounded-2xl border border-border shadow-2xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                Active Departments
              </p>
              <p className="mt-1 text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
                {stats.active}
              </p>
            </div>
            <span className="grid size-9 place-items-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300">
              <CheckCircle2 className="size-4.5" />
            </span>
          </div>

          <div className="card-surface p-4 rounded-2xl border border-border shadow-2xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                Inactive / Deactivated
              </p>
              <p className="mt-1 text-2xl font-extrabold text-amber-600 dark:text-amber-400">
                {stats.inactive}
              </p>
            </div>
            <span className="grid size-9 place-items-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300">
              <Power className="size-4.5" />
            </span>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="card-surface p-4 rounded-2xl border border-border space-y-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="relative sm:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search department code or title..."
                className="pl-9 text-xs h-9 rounded-xl"
              />
            </div>

            <div className="flex items-center gap-2">
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="text-xs h-9 rounded-xl flex-1">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL" className="text-xs">
                    All Statuses
                  </SelectItem>
                  <SelectItem value="Active" className="text-xs">
                    Active Only
                  </SelectItem>
                  <SelectItem value="Inactive" className="text-xs">
                    Inactive Only
                  </SelectItem>
                </SelectContent>
              </Select>

              {(search || selectedStatus !== "ALL") && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={handleResetFilters}
                  title="Reset Filters"
                  className="h-9 w-9 shrink-0"
                >
                  <RotateCcw className="size-4" />
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Departments Directory Grid */}
        {loading ? (
          <div className="card-surface p-12 rounded-2xl border border-border text-center text-xs text-muted-foreground space-y-2">
            <RefreshCw className="size-5 animate-spin mx-auto text-primary" />
            <p>Loading departments directory from PostgreSQL database...</p>
          </div>
        ) : departments.length === 0 ? (
          <div className="card-surface p-12 rounded-2xl border border-border text-center text-xs text-muted-foreground space-y-2">
            <p className="font-semibold text-foreground">
              No departments found matching the filter criteria.
            </p>
            <div className="pt-2 flex justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetFilters}
                className="rounded-xl text-xs"
              >
                Reset Filters
              </Button>
              <Button
                size="sm"
                onClick={handleOpenCreate}
                className="rounded-xl text-xs bg-primary text-primary-foreground"
              >
                <Plus className="size-3.5 mr-1" /> Add Department
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-3">
            {departments.map((dept) => (
              <div
                key={dept.id}
                className="card-surface p-5 rounded-2xl border border-border text-xs space-y-3 flex flex-col justify-between hover:border-primary/40 transition-colors"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-foreground text-sm block">
                      {dept.departmentName}
                    </span>
                    <ToneBadge tone={dept.status === "Active" ? "success" : "neutral"}>
                      {dept.status}
                    </ToneBadge>
                  </div>
                  <p className="text-muted-foreground font-mono text-[11px]">
                    Code: <strong className="text-foreground">{dept.departmentCode}</strong>
                  </p>
                  {dept.description && (
                    <p className="text-muted-foreground text-[11px] line-clamp-2 pt-1">
                      {dept.description}
                    </p>
                  )}
                </div>

                <div className="pt-3 border-t border-divider flex items-center justify-between gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleToggleStatus(dept)}
                    title={dept.status === "Active" ? "Deactivate" : "Activate"}
                    className={cn(
                      "rounded-xl text-[11px] h-7 px-2 font-medium gap-1",
                      dept.status === "Active"
                        ? "text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40"
                        : "text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40",
                    )}
                  >
                    <Power className="size-3" />
                    <span>{dept.status === "Active" ? "Deactivate" : "Activate"}</span>
                  </Button>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleOpenEdit(dept)}
                      title="Edit Department"
                      className="h-7 w-7 rounded-lg"
                    >
                      <Pencil className="size-3.5 text-primary" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => {
                        setDeletingDept(dept);
                        setDeleteDialogOpen(true);
                      }}
                      title="Delete Department"
                      className="h-7 w-7 rounded-lg text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add / Edit Department Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-md rounded-2xl p-6">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-foreground">
                {editingDept ? "Edit Department" : "Add New Department"}
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSaveDepartment} className="space-y-4 py-3">
              <div>
                <Label className="text-xs font-bold">Department Code *</Label>
                <Input
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value)}
                  placeholder="e.g. CSE, ECE, AI"
                  required
                  className="mt-1 text-xs h-9 rounded-xl font-mono uppercase"
                />
              </div>

              <div>
                <Label className="text-xs font-bold">Department Full Name *</Label>
                <Input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Computer Science & Engineering"
                  required
                  className="mt-1 text-xs h-9 rounded-xl"
                />
              </div>

              <div>
                <Label className="text-xs font-bold">Description (Optional)</Label>
                <Textarea
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="Department details, specializations..."
                  className="mt-1 text-xs rounded-xl min-h-[80px]"
                />
              </div>

              <DialogFooter className="gap-2 pt-2 border-t border-divider">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setDialogOpen(false)}
                  disabled={submitting}
                  className="rounded-xl text-xs h-9"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  size="sm"
                  className="rounded-xl text-xs font-bold h-9 bg-primary text-primary-foreground"
                >
                  {submitting
                    ? "Saving..."
                    : editingDept
                      ? "Save Changes"
                      : "Register Department"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent className="max-w-md rounded-2xl p-6">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-destructive flex items-center gap-2">
                <Trash2 className="size-4" /> Delete Academic Department?
              </DialogTitle>
            </DialogHeader>

            {deletingDept && (
              <div className="space-y-3 pt-2 text-xs text-muted-foreground">
                <p>
                  Are you sure you want to remove <strong>{deletingDept.departmentName} ({deletingDept.departmentCode})</strong> from the institutional directory?
                </p>
                <p className="text-[11px] text-amber-600 font-semibold">
                  Note: Prefer setting status to Inactive instead of deleting active departments.
                </p>
              </div>
            )}

            <DialogFooter className="gap-2 pt-2 border-t border-divider">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeleteDialogOpen(false)}
                disabled={submitting}
                className="rounded-xl text-xs h-9"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={handleConfirmDelete}
                disabled={submitting}
                className="rounded-xl text-xs font-bold h-9"
              >
                {submitting ? "Removing..." : "Remove Department"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </RoleGuard>
  );
}
