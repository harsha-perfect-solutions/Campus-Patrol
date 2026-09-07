import { useState, useEffect, useCallback, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  UserCog,
  Plus,
  Pencil,
  RotateCcw,
  Search,
  Trash2,
  RefreshCw,
  Power,
  Users,
  CheckCircle2,
  Phone,
  Mail,
} from "lucide-react";
import { toast } from "sonner";
import { RoleGuard } from "@/components/role-guard";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  getAdminFacultyListApi,
  createAdminFacultyApi,
  updateAdminFacultyApi,
  toggleAdminFacultyStatusApi,
  deleteAdminFacultyApi,
} from "@/lib/api/faculty.server";
import type { DBFacultyMember } from "@/lib/db/faculty.server";

export const Route = createFileRoute("/admin/faculty")({
  head: () => ({ meta: [{ title: "Faculty Master — Admin Console" }] }),
  component: AdminFacultyPage,
});

const DEPARTMENTS = ["ALL", "CSE", "ECE", "EEE", "MECH", "CIVIL", "AIML", "IT"] as const;

function AdminFacultyPage() {
  const [facultyList, setFacultyList] = useState<DBFacultyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Filters State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDept, setSelectedDept] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState("ALL");

  // Modal State
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingFaculty, setEditingFaculty] = useState<DBFacultyMember | null>(null);

  // Form Fields
  const [formName, setFormName] = useState("");
  const [formStaffCode, setFormStaffCode] = useState("");
  const [formDepartment, setFormDepartment] = useState("CSE");
  const [formEmail, setFormEmail] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formStatus, setFormStatus] = useState<"Active" | "Inactive">("Active");

  // Delete Modal State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingFaculty, setDeletingFaculty] = useState<DBFacultyMember | null>(null);

  const fetchFacultyList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAdminFacultyListApi({
        data: {
          department: selectedDept,
          status: selectedStatus,
          search: searchQuery,
        },
      });

      if (res.success) {
        setFacultyList(res.facultyList);
      } else {
        toast.error(res.error || "Failed to load faculty members.");
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to connect to faculty server.");
    } finally {
      setLoading(false);
    }
  }, [selectedDept, selectedStatus, searchQuery]);

  useEffect(() => {
    fetchFacultyList();
  }, [fetchFacultyList]);

  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedDept("ALL");
    setSelectedStatus("ALL");
  };

  const metrics = useMemo(() => {
    const total = facultyList.length;
    const active = facultyList.filter((f) => f.status === "Active").length;
    const inactive = facultyList.filter((f) => f.status === "Inactive").length;
    return { total, active, inactive };
  }, [facultyList]);

  const handleOpenAddModal = () => {
    setEditingFaculty(null);
    setFormName("");
    setFormStaffCode("");
    setFormDepartment("CSE");
    setFormEmail("");
    setFormPhone("+91 ");
    setFormStatus("Active");
    setFormModalOpen(true);
  };

  const handleOpenEditModal = (faculty: DBFacultyMember) => {
    setEditingFaculty(faculty);
    setFormName(faculty.name);
    setFormStaffCode(faculty.staffCode);
    setFormDepartment(faculty.department);
    setFormEmail(faculty.email);
    setFormPhone(faculty.phone || "+91 ");
    setFormStatus(faculty.status);
    setFormModalOpen(true);
  };

  const handleSaveFaculty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formStaffCode.trim() || !formEmail.trim() || !formDepartment.trim()) {
      toast.error("Please enter Name, Staff Code, Email, and Department.");
      return;
    }

    setSubmitting(true);
    try {
      if (editingFaculty) {
        const res = await updateAdminFacultyApi({
          data: {
            id: editingFaculty.id,
            input: {
              name: formName.trim(),
              staffCode: formStaffCode.trim().toUpperCase(),
              department: formDepartment,
              email: formEmail.trim().toLowerCase(),
              phone: formPhone.trim(),
              status: formStatus,
            },
          },
        });

        if (res.success && res.faculty) {
          toast.success(`Faculty Updated!`, {
            description: `${res.faculty.name} (${res.faculty.staffCode}) updated successfully.`,
          });
          setFormModalOpen(false);
          fetchFacultyList();
        } else {
          toast.error(res.error || "Failed to update faculty member.");
        }
      } else {
        const res = await createAdminFacultyApi({
          data: {
            name: formName.trim(),
            staffCode: formStaffCode.trim().toUpperCase(),
            department: formDepartment,
            email: formEmail.trim().toLowerCase(),
            phone: formPhone.trim(),
            status: formStatus,
          },
        });

        if (res.success && res.faculty) {
          toast.success(`Faculty Registered!`, {
            description: `${res.faculty.name} registered under ${res.faculty.department}.`,
          });
          setFormModalOpen(false);
          fetchFacultyList();
        } else {
          toast.error(res.error || "Failed to register faculty member.");
        }
      }
    } catch (err: any) {
      toast.error(err.message || "An error occurred while saving faculty.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (faculty: DBFacultyMember) => {
    const nextStatus = faculty.status === "Active" ? "Inactive" : "Active";
    setSubmitting(true);
    try {
      const res = await toggleAdminFacultyStatusApi({
        data: {
          id: faculty.id,
          status: nextStatus,
        },
      });

      if (res.success && res.faculty) {
        toast.success(`Faculty Status Changed`, {
          description: `${res.faculty.name} is now ${res.faculty.status}.`,
        });
        fetchFacultyList();
      } else {
        toast.error(res.error || "Failed to change faculty status.");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to update status.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingFaculty) return;
    setSubmitting(true);
    try {
      const res = await deleteAdminFacultyApi({
        data: { id: deletingFaculty.id },
      });

      if (res.success) {
        toast.success("Faculty Removed!", {
          description: `${deletingFaculty.name} removed from faculty registry.`,
        });
        setDeleteModalOpen(false);
        setDeletingFaculty(null);
        fetchFacultyList();
      } else {
        toast.error(res.error || "Failed to remove faculty member.");
      }
    } catch (err: any) {
      toast.error(err.message || "An error occurred while removing faculty.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <RoleGuard allowedRoles={["admin"]}>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <PageHeader
            title="Faculty & Teaching Staff Master"
            description="Manage institutional faculty profiles, staff codes, department assignments, and status."
            breadcrumb={[{ label: "Admin", to: "/admin/dashboard" }, { label: "Faculty Master" }]}
            actions={
              <Button
                variant="outline"
                size="sm"
                onClick={fetchFacultyList}
                disabled={loading}
                className="rounded-xl text-xs h-9 gap-1.5 font-semibold"
              >
                <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
                Refresh
              </Button>
            }
          />
          <Button
            onClick={handleOpenAddModal}
            className="h-10 px-4 rounded-xl font-semibold bg-primary text-primary-foreground shadow-xs shrink-0 w-full sm:w-auto gap-2"
          >
            <Plus className="size-4" />
            <span>Add New Faculty Member</span>
          </Button>
        </div>

        {/* KPI Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <div className="card-surface p-4 rounded-2xl border border-border shadow-2xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                Total Teaching Staff
              </p>
              <p className="mt-1 text-2xl font-extrabold text-foreground">{metrics.total}</p>
            </div>
            <span className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary">
              <UserCog className="size-4.5" />
            </span>
          </div>

          <div className="card-surface p-4 rounded-2xl border border-border shadow-2xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                Active Faculty
              </p>
              <p className="mt-1 text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
                {metrics.active}
              </p>
            </div>
            <span className="grid size-9 place-items-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300">
              <CheckCircle2 className="size-4.5" />
            </span>
          </div>

          <div className="card-surface p-4 rounded-2xl border border-border shadow-2xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                Inactive / On Leave
              </p>
              <p className="mt-1 text-2xl font-extrabold text-amber-600 dark:text-amber-400">
                {metrics.inactive}
              </p>
            </div>
            <span className="grid size-9 place-items-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300">
              <Power className="size-4.5" />
            </span>
          </div>
        </div>

        {/* Filter Controls Toolbar */}
        <div className="card-surface p-4 rounded-2xl border border-border shadow-xs space-y-3">
          <div className="grid gap-3 sm:grid-cols-4">
            <div className="relative sm:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search staff code, name, department or email..."
                className="pl-9 text-xs h-9 rounded-xl border-border"
              />
            </div>

            <div>
              <Select value={selectedDept} onValueChange={setSelectedDept}>
                <SelectTrigger className="text-xs h-9 rounded-xl border-border">
                  <SelectValue placeholder="Select Department" />
                </SelectTrigger>
                <SelectContent>
                  {DEPARTMENTS.map((d) => (
                    <SelectItem key={d} value={d} className="text-xs">
                      {d === "ALL" ? "All Departments" : `Dept: ${d}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="text-xs h-9 rounded-xl border-border flex-1">
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

              {(searchQuery || selectedDept !== "ALL" || selectedStatus !== "ALL") && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={handleResetFilters}
                  title="Reset Filters"
                  className="h-9 w-9 shrink-0 rounded-lg"
                >
                  <RotateCcw className="size-4" />
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Faculty Directory Grid */}
        {loading ? (
          <div className="card-surface p-12 rounded-2xl border border-border text-center text-xs text-muted-foreground space-y-2">
            <RefreshCw className="size-5 animate-spin mx-auto text-primary" />
            <p>Loading faculty roster from PostgreSQL database...</p>
          </div>
        ) : facultyList.length === 0 ? (
          <div className="card-surface p-12 rounded-2xl border border-border text-center text-xs text-muted-foreground space-y-2">
            <p className="font-semibold text-foreground">
              No faculty members found matching search and filter criteria.
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
                onClick={handleOpenAddModal}
                className="rounded-xl text-xs bg-primary text-primary-foreground"
              >
                <Plus className="size-3.5 mr-1" /> Add Faculty
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-3">
            {facultyList.map((f) => (
              <div
                key={f.id}
                className="card-surface p-5 rounded-2xl border border-border text-xs space-y-3 flex flex-col justify-between hover:border-primary/40 transition-colors"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-foreground text-sm block">{f.name}</span>
                    <ToneBadge tone={f.status === "Active" ? "success" : "neutral"}>
                      {f.status}
                    </ToneBadge>
                  </div>

                  <p className="text-muted-foreground font-mono text-[11px]">
                    Staff Code: <strong className="text-primary font-bold">{f.staffCode}</strong>{" "}
                    &bull; Dept: <strong className="text-foreground">{f.department}</strong>
                  </p>

                  <div className="space-y-1 text-muted-foreground pt-1 text-[11px]">
                    <div className="flex items-center gap-1.5">
                      <Mail className="size-3 text-muted-foreground shrink-0" />
                      <span className="truncate">{f.email}</span>
                    </div>
                    {f.phone && (
                      <div className="flex items-center gap-1.5">
                        <Phone className="size-3 text-muted-foreground shrink-0" />
                        <span>{f.phone}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-divider flex items-center justify-between gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleToggleStatus(f)}
                    title={f.status === "Active" ? "Deactivate Faculty" : "Activate Faculty"}
                    className={cn(
                      "rounded-xl text-[11px] h-7 px-2 font-medium gap-1",
                      f.status === "Active"
                        ? "text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40"
                        : "text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40",
                    )}
                  >
                    <Power className="size-3" />
                    <span>{f.status === "Active" ? "Deactivate" : "Activate"}</span>
                  </Button>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleOpenEditModal(f)}
                      title="Edit Profile"
                      className="h-7 w-7 rounded-lg"
                    >
                      <Pencil className="size-3.5 text-primary" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => {
                        setDeletingFaculty(f);
                        setDeleteModalOpen(true);
                      }}
                      title="Remove Faculty"
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

        {/* Add / Edit Faculty Modal */}
        <Dialog open={formModalOpen} onOpenChange={setFormModalOpen}>
          <DialogContent className="w-[95vw] sm:w-full sm:max-w-md rounded-2xl p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base font-bold">
                {editingFaculty ? (
                  <Pencil className="size-4 text-primary" />
                ) : (
                  <Plus className="size-4 text-primary" />
                )}
                <span>{editingFaculty ? "Edit Faculty Profile" : "Add New Faculty Member"}</span>
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSaveFaculty} className="space-y-4 pt-2">
              <div className="space-y-1">
                <Label className="text-xs font-bold">Full Name *</Label>
                <Input
                  type="text"
                  required
                  placeholder="e.g. Prof. Vikram Mehta"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="h-9 text-xs rounded-xl"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-bold">Staff Code *</Label>
                  <Input
                    type="text"
                    required
                    placeholder="e.g. FAC-101"
                    value={formStaffCode}
                    onChange={(e) => setFormStaffCode(e.target.value)}
                    className="h-9 text-xs rounded-xl font-mono uppercase"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-bold">Department *</Label>
                  <Select value={formDepartment} onValueChange={setFormDepartment}>
                    <SelectTrigger className="h-9 text-xs rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DEPARTMENTS.filter((d) => d !== "ALL").map((d) => (
                        <SelectItem key={d} value={d} className="text-xs">
                          {d}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-bold">Institutional Email *</Label>
                  <Input
                    type="email"
                    required
                    placeholder="e.g. faculty@cmadms.edu"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    className="h-9 text-xs rounded-xl"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-bold">Phone Number</Label>
                  <Input
                    type="text"
                    placeholder="e.g. +91 9876543210"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    className="h-9 text-xs rounded-xl"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold">Account Status</Label>
                <Select
                  value={formStatus}
                  onValueChange={(val) => setFormStatus(val as "Active" | "Inactive")}
                >
                  <SelectTrigger className="h-9 text-xs rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active" className="text-xs">
                      Active (Eligible for timetable assignments)
                    </SelectItem>
                    <SelectItem value="Inactive" className="text-xs">
                      Inactive (On Leave / Suspended)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <DialogFooter className="pt-3 border-t border-divider">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setFormModalOpen(false)}
                  disabled={submitting}
                  className="rounded-xl text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl text-xs font-semibold bg-primary text-primary-foreground"
                >
                  {submitting
                    ? "Saving..."
                    : editingFaculty
                      ? "Save Profile Changes"
                      : "Register Faculty Member"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Modal */}
        <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
          <DialogContent className="w-[95vw] sm:w-full sm:max-w-md rounded-2xl p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base font-bold text-destructive">
                <Trash2 className="size-5" /> Remove Faculty Member?
              </DialogTitle>
            </DialogHeader>

            {deletingFaculty && (
              <div className="space-y-3 pt-2 text-xs text-muted-foreground">
                <p>
                  Are you sure you want to remove <strong>{deletingFaculty.name} ({deletingFaculty.staffCode})</strong> from the faculty master registry?
                </p>
                <p className="text-[11px] text-amber-600 font-semibold">
                  Note: Soft deactivation (setting status to Inactive) is preferred to maintain historical timetable integrity.
                </p>
              </div>
            )}

            <DialogFooter className="pt-3 border-t border-divider">
              <Button
                variant="outline"
                onClick={() => setDeleteModalOpen(false)}
                disabled={submitting}
                className="rounded-xl text-xs"
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmDelete}
                disabled={submitting}
                variant="destructive"
                className="rounded-xl text-xs font-semibold"
              >
                {submitting ? "Removing..." : "Remove Faculty"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </RoleGuard>
  );
}
