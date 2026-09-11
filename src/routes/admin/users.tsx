import { useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Users,
  UserPlus,
  FileSpreadsheet,
  Download,
  Upload,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Shield,
  GraduationCap,
  Landmark,
  UserRound,
  Eye,
  EyeOff,
  Copy,
  KeyRound,
  ShieldAlert,
  RefreshCcw,
  Check,
  X,
  FileText,
  MapPin,
  Plus,
  Trash2,
  Edit3,
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getAdminUsersApi, updateAdminUserRoleApi } from "@/lib/api/admin.server";
import {
  createSingleUserAdminApi,
  toggleUserStatusAdminApi,
  updateSecurityGateAdminApi,
  validateStudentBulkImportApi,
  commitStudentBulkImportApi,
  resetUserPasswordAdminApi,
} from "@/lib/api/auth.server";
import {
  getCollegeGatesApi,
  createCollegeGateApi,
  updateCollegeGateApi,
  deleteCollegeGateApi,
} from "@/lib/api/gates.server";
import type { AdminUserRecord } from "@/lib/db/admin.server";
import type { BulkImportValidationResult, ImportPreviewItem, BulkImportCredential } from "@/lib/db/user-management.server";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/users")({
  head: () => ({ meta: [{ title: "User Onboarding & Management — Admin Console" }] }),
  component: AdminUsersPage,
});

function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"students" | "faculty" | "hod" | "security" | "all">("students");

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [deptFilter, setDeptFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Modals state
  const [addUserOpen, setAddUserOpen] = useState(false);
  const [bulkImportOpen, setBulkImportOpen] = useState(false);

  // New Single User form
  const [newRole, setNewRole] = useState<"student" | "faculty" | "hod" | "security">("student");
  const [newCode, setNewCode] = useState("");
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newDept, setNewDept] = useState("CSE");
  const [newPhone, setNewPhone] = useState("");
  const [newYear, setNewYear] = useState("1st Year");
  const [newSem, setNewSem] = useState(1);
  const [newSec, setNewSec] = useState("A");
  const [submittingUser, setSubmittingUser] = useState(false);

  const [newAssignedGate, setNewAssignedGate] = useState("Gate 1");
  const [reassignGateOpen, setReassignGateOpen] = useState(false);
  const [selectedSecurityUser, setSelectedSecurityUser] = useState<AdminUserRecord | null>(null);
  const [reassignGateValue, setReassignGateValue] = useState("Gate 1");
  const [reassigningGate, setReassigningGate] = useState(false);

  // Bulk Import state
  const [csvContent, setCsvContent] = useState("");
  const [validatingImport, setValidatingImport] = useState(false);
  const [committingImport, setCommittingImport] = useState(false);
  const [importResult, setImportResult] = useState<BulkImportValidationResult | null>(null);

  // One-Time Credentials Modal State
  const [oneTimeCredentials, setOneTimeCredentials] = useState<{
    title: string;
    type: "single" | "bulk" | "reset";
    singleUser?: { name: string; email: string; role: string; tempPassword: string };
    bulkItems?: BulkImportCredential[];
  } | null>(null);
  const [showOneTimePass, setShowOneTimePass] = useState(false);
  const [credentialsCopied, setCredentialsCopied] = useState(false);
  const [credentialsDownloaded, setCredentialsDownloaded] = useState(false);
  const [unsavedWarningOpen, setUnsavedWarningOpen] = useState(false);
  const [resettingUserPasswordId, setResettingUserPasswordId] = useState<string | null>(null);

  const handleCopySinglePassword = (password: string) => {
    try {
      navigator.clipboard.writeText(password);
      setCredentialsCopied(true);
      toast.success("Temporary password copied to clipboard!");
    } catch {
      toast.error("Failed to copy password to clipboard.");
    }
  };

  const handleCopyBulkCredentials = (items: BulkImportCredential[]) => {
    try {
      const text = items
        .map((i) => `Roll No: ${i.rollNumber} | Name: ${i.name} | Email: ${i.email} | Temp Password: ${i.tempPassword}`)
        .join("\n");
      navigator.clipboard.writeText(text);
      setCredentialsCopied(true);
      toast.success("All temporary credentials copied to clipboard!");
    } catch {
      toast.error("Failed to copy credentials.");
    }
  };

  const handleDownloadBulkCredentials = (items: BulkImportCredential[]) => {
    try {
      const rows = ["Name,Roll Number,Email,Role,Temporary Password"];
      items.forEach((item) => {
        rows.push(`"${item.name}","${item.rollNumber}","${item.email}","${item.role}","${item.tempPassword}"`);
      });
      const csvData = rows.join("\n");
      const blob = new Blob([csvData], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "CMADMS_Temporary_Credentials.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setCredentialsDownloaded(true);
      toast.success("Temporary credentials CSV downloaded!");
    } catch {
      toast.error("Failed to download credentials CSV.");
    }
  };

  const attemptCloseOneTimeCredentials = () => {
    if (!credentialsCopied && !credentialsDownloaded) {
      setUnsavedWarningOpen(true);
    } else {
      forceCloseOneTimeCredentials();
    }
  };

  const forceCloseOneTimeCredentials = () => {
    setUnsavedWarningOpen(false);
    setOneTimeCredentials(null);
    setShowOneTimePass(false);
    setCredentialsCopied(false);
    setCredentialsDownloaded(false);
  };

  const handleResetUserPassword = async (user: AdminUserRecord) => {
    if (!confirm(`Generate a new temporary password for user '${user.name}' (${user.email})?`)) return;
    setResettingUserPasswordId(user.id);
    try {
      const res = await resetUserPasswordAdminApi({ data: { userId: user.id } });
      if (res.success && res.tempPassword) {
        setOneTimeCredentials({
          title: "Temporary Password Reset Successful",
          type: "reset",
          singleUser: {
            name: res.name || user.name,
            email: res.email || user.email,
            role: res.role || user.role.toUpperCase(),
            tempPassword: res.tempPassword,
          },
        });
        setCredentialsCopied(false);
        setCredentialsDownloaded(false);
        toast.success(`Temporary password reset for ${user.name}`);
      } else {
        toast.error(res.error || "Failed to reset temporary password.");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to reset temporary password.");
    } finally {
      setResettingUserPasswordId(null);
    }
  };

  const handleReassignGate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSecurityUser) return;
    setReassigningGate(true);
    try {
      const res = await updateSecurityGateAdminApi({
        data: {
          userId: selectedSecurityUser.id,
          assignedGate: reassignGateValue,
        },
      });
      if (res.success) {
        toast.success(`Updated gate assignment to ${reassignGateValue} for ${selectedSecurityUser.name}`);
        setReassignGateOpen(false);
        setSelectedSecurityUser(null);
        await loadUsers();
      } else {
        toast.error(res.error || "Failed to reassign gate.");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to reassign gate.");
    } finally {
      setReassigningGate(false);
    }
  };

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await getAdminUsersApi();
      if (res.success && res.users) {
        setUsers(res.users);
      }
    } catch (err) {
      console.error("Failed to load users from DB:", err);
    } finally {
      setLoading(false);
    }
  };

  // College Gate Management State
  const [manageGatesOpen, setManageGatesOpen] = useState(false);
  const [collegeGates, setCollegeGates] = useState<any[]>([]);
  const [loadingGates, setLoadingGates] = useState(false);

  // New Gate form state
  const [newGateName, setNewGateName] = useState("");
  const [newGateCode, setNewGateCode] = useState("");
  const [newGateDesc, setNewGateDesc] = useState("");
  const [submittingGate, setSubmittingGate] = useState(false);

  // Edit Gate state
  const [editingGate, setEditingGate] = useState<any | null>(null);
  const [editGateName, setEditGateName] = useState("");
  const [editGateCode, setEditGateCode] = useState("");
  const [editGateDesc, setEditGateDesc] = useState("");
  const [editGateStatus, setEditGateStatus] = useState<"Active" | "Inactive">("Active");
  const [updatingGate, setUpdatingGate] = useState(false);

  const loadGates = async () => {
    setLoadingGates(true);
    try {
      const res = await getCollegeGatesApi();
      if (res.success && res.gates) {
        setCollegeGates(res.gates);
        if (res.gates.length > 0 && res.gates[0]?.gate_name && !newAssignedGate) {
          setNewAssignedGate(res.gates[0].gate_name);
        }
      }
    } catch (err) {
      console.error("Failed to load college gates:", err);
    } finally {
      setLoadingGates(false);
    }
  };

  useEffect(() => {
    loadUsers();
    loadGates();
  }, []);

  const handleCreateGate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGateName.trim() || !newGateCode.trim()) {
      toast.error("Please enter Gate Name and Gate Code.");
      return;
    }
    setSubmittingGate(true);
    try {
      const res = await createCollegeGateApi({
        data: {
          gateName: newGateName,
          gateCode: newGateCode,
          description: newGateDesc,
        },
      });
      if (res.success) {
        toast.success(`Campus Gate '${newGateName.trim()}' created successfully!`);
        setNewGateName("");
        setNewGateCode("");
        setNewGateDesc("");
        await loadGates();
      } else {
        toast.error(res.error || "Failed to create gate.");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to create gate.");
    } finally {
      setSubmittingGate(false);
    }
  };

  const handleUpdateGate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGate) return;
    setUpdatingGate(true);
    try {
      const res = await updateCollegeGateApi({
        data: {
          id: editingGate.id,
          gateName: editGateName,
          gateCode: editGateCode,
          description: editGateDesc,
          status: editGateStatus,
        },
      });
      if (res.success) {
        toast.success(`Updated gate '${editGateName}' details.`);
        setEditingGate(null);
        await loadGates();
      } else {
        toast.error(res.error || "Failed to update gate.");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to update gate.");
    } finally {
      setUpdatingGate(false);
    }
  };

  const handleDeleteGate = async (gate: any) => {
    if (!confirm(`Are you sure you want to delete gate '${gate.gate_name}'?`)) return;
    try {
      const res = await deleteCollegeGateApi({ data: { id: gate.id } });
      if (res.success) {
        toast.success(`Deleted gate '${gate.gate_name}'.`);
        await loadGates();
      } else {
        toast.error(res.error || "Failed to delete gate.");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to delete gate.");
    }
  };

  const handleRoleChange = async (
    userId: string,
    targetRole: "admin" | "hod" | "faculty" | "student" | "security"
  ) => {
    try {
      const res = await updateAdminUserRoleApi({
        data: { userId, newRole: targetRole },
      });
      if (res.success) {
        toast.success(`Role updated to ${targetRole.toUpperCase()}`);
        setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: targetRole } : u)));
      } else {
        toast.error(res.error || "Failed to update user role.");
      }
    } catch {
      toast.error("Error updating user role.");
    }
  };

  const handleToggleStatus = async (user: AdminUserRecord) => {
    const currentStatus = user.status || "Active";
    const nextStatus = currentStatus === "Active" ? "Inactive" : "Active";
    try {
      const res = await toggleUserStatusAdminApi({
        data: { userId: user.id, status: nextStatus },
      });
      if (res.success) {
        toast.success(`User status updated to ${nextStatus.toUpperCase()}`);
        setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, status: nextStatus } : u)));
      } else {
        toast.error(res.error || "Failed to update status.");
      }
    } catch {
      toast.error("Error toggling user status.");
    }
  };

  const handleCreateSingleUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode.trim() || !newName.trim()) {
      toast.error("Please fill in required fields (Code / Roll No and Name).");
      return;
    }

    setSubmittingUser(true);
    try {
      const res = await createSingleUserAdminApi({
        data: {
          role: newRole,
          code: newCode,
          name: newName,
          email: newEmail,
          department: newDept,
          assignedGate: newRole === "security" ? newAssignedGate : newDept,
          year: newYear,
          semester: newSem,
          section: newSec,
          phone: newPhone,
        },
      });

      if (res.success) {
        toast.success(`${newRole.toUpperCase()} account created successfully!`);
        setAddUserOpen(false);
        setNewCode("");
        setNewName("");
        setNewEmail("");
        setNewPhone("");

        if (res.tempPassword) {
          setOneTimeCredentials({
            title: "User Account Created Successfully",
            type: "single",
            singleUser: {
              name: res.name || newName,
              email: res.email || newEmail,
              role: res.role || newRole.toUpperCase(),
              tempPassword: res.tempPassword,
            },
          });
          setCredentialsCopied(false);
          setCredentialsDownloaded(false);
        }

        await loadUsers();
      } else {
        toast.error(res.error || "Failed to create user account.");
      }
    } catch (err: any) {
      toast.error(err.message || "Error creating user account.");
    } finally {
      setSubmittingUser(false);
    }
  };

  const parseCsvText = (text: string): any[] => {
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length <= 1) return [];

    const headers = lines[0]!
      .split(",")
      .map((h) => h.trim().toLowerCase().replace(/[^a-z0-9]/g, ""));

    const records: any[] = [];
    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i]!.split(",").map((p) => p.trim());
      if (parts.length < 2) continue;

      const record: any = {};
      record.rollNumber = parts[0] || "";
      record.name = parts[1] || "";
      record.department = parts[2] || "CSE";
      record.year = parts[3] || "2nd Year";
      record.semester = parts[4] || 4;
      record.section = parts[5] || "Section A";
      records.push(record);
    }
    return records;
  };

  const handleValidateCsv = async () => {
    if (!csvContent.trim()) {
      toast.error("Please paste CSV data or select a valid CSV file.");
      return;
    }

    const records = parseCsvText(csvContent);
    if (records.length === 0) {
      toast.error("No valid CSV rows detected. Ensure header row is present.");
      return;
    }

    setValidatingImport(true);
    try {
      const res = await validateStudentBulkImportApi({ data: { records } });
      setImportResult(res);
      toast.success(`Parsed ${res.totalCount} records: ${res.validCount} Valid, ${res.duplicateCount} Duplicates, ${res.invalidCount} Invalid`);
    } catch {
      toast.error("Failed to validate CSV records.");
    } finally {
      setValidatingImport(false);
    }
  };

  const handleCommitBulkImport = async () => {
    if (!importResult || importResult.validCount === 0) {
      toast.error("No valid records available to commit.");
      return;
    }

    const validItems = importResult.items.filter((item) => item.isValid);
    setCommittingImport(true);
    try {
      const res = await commitStudentBulkImportApi({ data: { validItems } });
      if (res.success) {
        toast.success(`Successfully imported ${res.importedCount} student accounts!`);
        setBulkImportOpen(false);
        setCsvContent("");
        setImportResult(null);

        if (res.credentials && res.credentials.length > 0) {
          setOneTimeCredentials({
            title: "Bulk Student Import Completed",
            type: "bulk",
            bulkItems: res.credentials,
          });
          setCredentialsCopied(false);
          setCredentialsDownloaded(false);
        }

        await loadUsers();
      } else {
        toast.error(res.error || "Bulk import transaction failed.");
      }
    } catch (err: any) {
      toast.error(err.message || "Bulk import error.");
    } finally {
      setCommittingImport(false);
    }
  };

  const downloadSampleTemplate = () => {
    const csvData = `Roll Number,Name,Department,Year,Semester,Section
23CSE1012,Ashok Dora,CSE,3,6,A
23CSE1013,Ravi Teja,CSE,3,6,A
23CSE1014,Priya Sharma,CSE,3,6,A
23ECE2031,Karthik Reddy,ECE,2,4,B
22MEC3007,Sneha Patil,MECH,4,8,C`;

    const blob = new Blob([csvData], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "CMADMS_Student_Bulk_Import_Template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered User Records
  const filteredUsers = users.filter((u) => {
    const roleMatch =
      activeTab === "all"
        ? true
        : activeTab === "students"
        ? u.role === "student"
        : activeTab === "faculty"
        ? u.role === "faculty"
        : activeTab === "hod"
        ? u.role === "hod"
        : u.role === "security";

    const q = searchQuery.toLowerCase().trim();
    const searchMatch =
      !q ||
      u.name.toLowerCase().includes(q) ||
      (u.email && u.email.toLowerCase().includes(q)) ||
      (u.studentCode && u.studentCode.toLowerCase().includes(q)) ||
      (u.id && u.id.toLowerCase().includes(q));

    const deptMatch = deptFilter === "ALL" || u.department.toUpperCase() === deptFilter.toUpperCase();
    const statusMatch = statusFilter === "ALL" || (u.status || "Active").toUpperCase() === statusFilter.toUpperCase();

    return roleMatch && searchMatch && deptMatch && statusMatch;
  });

  return (
    <RoleGuard allowedRoles={["admin"]}>
      <div className="space-y-6">
        <PageHeader
          title="User Onboarding & Password Management"
          description="Manage institutional users, execute student bulk CSV imports, toggle account statuses, and oversee authentication credentials."
          breadcrumb={[{ label: "Admin", to: "/admin/dashboard" }, { label: "User Onboarding" }]}
          actions={
            <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2 w-full sm:w-auto">
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl border-amber-500/30 text-amber-700 dark:text-amber-300 hover:bg-amber-500/10 font-bold w-full sm:w-auto"
                onClick={() => setManageGatesOpen(true)}
              >
                <MapPin className="size-4 mr-1.5" /> Manage Campus Gates
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl border-primary/30 text-primary hover:bg-primary/10 font-bold w-full sm:w-auto"
                onClick={() => {
                  setImportResult(null);
                  setBulkImportOpen(true);
                }}
              >
                <FileSpreadsheet className="size-4 mr-1.5" /> Bulk Import Students
              </Button>
              <Button
                size="sm"
                className="rounded-xl font-bold bg-primary text-primary-foreground shadow-sm w-full sm:w-auto"
                onClick={() => setAddUserOpen(true)}
              >
                <UserPlus className="size-4 mr-1.5" /> Add Individual User
              </Button>
            </div>
          }
        />

        {/* ROLE TABS */}
        <div className="flex items-center gap-1 border-b border-border pb-1 overflow-x-auto no-scrollbar scroll-smooth">
          {[
            { id: "students", label: "Students", icon: UserRound, count: users.filter((u) => u.role === "student").length },
            { id: "faculty", label: "Faculty", icon: GraduationCap, count: users.filter((u) => u.role === "faculty").length },
            { id: "hod", label: "HODs", icon: Landmark, count: users.filter((u) => u.role === "hod").length },
            { id: "security", label: "Security", icon: Shield, count: users.filter((u) => u.role === "security").length },
            { id: "all", label: "All Users", icon: Users, count: users.length },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  "shrink-0 flex items-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs font-bold transition-all",
                  active
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                <Icon className="size-4" />
                <span>{tab.label}</span>
                <span className={cn("px-1.5 py-0.5 rounded-full text-[10px]", active ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground")}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* SEARCH & FILTERS BAR */}
        <div className="card-surface p-3.5 sm:p-4 rounded-2xl border border-border flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, roll no, or email..."
              className="h-10 pl-9 text-xs rounded-xl"
            />
          </div>

          <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
            <Select value={deptFilter} onValueChange={setDeptFilter}>
              <SelectTrigger className="h-10 text-xs rounded-xl flex-1 sm:w-36">
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Departments</SelectItem>
                <SelectItem value="CSE">CSE</SelectItem>
                <SelectItem value="ECE">ECE</SelectItem>
                <SelectItem value="MECH">MECH</SelectItem>
                <SelectItem value="EEE">EEE</SelectItem>
                <SelectItem value="CIVIL">CIVIL</SelectItem>
                <SelectItem value="IT">IT</SelectItem>
                <SelectItem value="AIML">AIML</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-10 text-xs rounded-xl flex-1 sm:w-32">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Status</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="INACTIVE">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* USER LIST TABLE */}
        {loading ? (
          <div className="card-surface p-12 rounded-2xl border border-border text-center text-xs text-muted-foreground">
            Loading user profiles from PostgreSQL database...
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="card-surface p-12 rounded-2xl border border-border text-center">
            <Users className="size-10 text-muted-foreground mx-auto mb-2 opacity-50" />
            <h3 className="font-bold text-foreground">No Users Found</h3>
            <p className="text-xs text-muted-foreground mt-1">No user accounts match the current role or filter criteria.</p>
          </div>
        ) : (
          <div className="card-surface rounded-2xl border border-border shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/40 border-b border-border text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4">User Name / Code</th>
                    <th className="py-3.5 px-4">Registered Email</th>
                    <th className="py-3.5 px-4">Role</th>
                    <th className="py-3.5 px-4">Department / Gate</th>
                    {activeTab === "security" && <th className="py-3.5 px-4">Assigned Gate</th>}
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-divider font-medium">
                  {filteredUsers.map((u) => {
                    const isActive = (u.status || "Active").toLowerCase() === "active";
                    const isSecurity = u.role.toLowerCase() === "security";
                    const assignedGate = u.assignedPost || u.department || "Unassigned";

                    return (
                      <tr key={u.id} className="hover:bg-accent/40 transition-colors">
                        <td className="py-3.5 px-4">
                          <span className="font-bold text-foreground block text-sm">{u.name}</span>
                          <span className="text-[11px] font-semibold text-muted-foreground">
                            {u.studentCode || u.staffCode || u.id}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-muted-foreground">
                          {u.email || "—"}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="rounded-md bg-accent px-2 py-0.5 text-[10px] font-extrabold text-foreground uppercase">
                            {u.role}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-bold text-foreground">{u.department}</td>
                        {activeTab === "security" && (
                          <td className="py-3.5 px-4 font-bold text-emerald-600 dark:text-emerald-400">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-xs font-bold border border-emerald-500/20">
                              {assignedGate}
                            </span>
                          </td>
                        )}
                        <td className="py-3.5 px-4">
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(u)}
                            className={cn(
                              "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold transition-all cursor-pointer",
                              isActive
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 hover:bg-emerald-200"
                                : "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 hover:bg-red-200"
                            )}
                          >
                            <span className={cn("size-1.5 rounded-full", isActive ? "bg-emerald-500 animate-pulse" : "bg-red-500")} />
                            {isActive ? "Active" : "Inactive"}
                          </button>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {isSecurity && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedSecurityUser(u);
                                  setReassignGateValue(assignedGate !== "Unassigned" ? assignedGate : "Gate 1");
                                  setReassignGateOpen(true);
                                }}
                                className="h-8 text-xs font-bold px-2.5 rounded-xl border-emerald-500/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10"
                              >
                                Reassign Gate
                              </Button>
                            )}
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={resettingUserPasswordId === u.id}
                              onClick={() => handleResetUserPassword(u)}
                              className="h-8 text-xs font-bold px-2.5 rounded-xl border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
                            >
                              <RefreshCcw className={cn("size-3 mr-1", resettingUserPasswordId === u.id && "animate-spin")} />
                              {resettingUserPasswordId === u.id ? "Resetting..." : "Reset Password"}
                            </Button>
                            <Select
                              value={u.role.toLowerCase()}
                              onValueChange={(val) => handleRoleChange(u.id, val as any)}
                            >
                              <SelectTrigger className="h-8 text-xs rounded-xl w-28">
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
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* MODAL: REASSIGN GATE */}
        <Dialog open={reassignGateOpen} onOpenChange={setReassignGateOpen}>
          <DialogContent className="w-[95vw] sm:max-w-md rounded-2xl p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 font-bold text-foreground">
                <Landmark className="size-5 text-primary" /> Reassign College Gate
              </DialogTitle>
              <DialogDescription>
                Reassign security officer <strong>{selectedSecurityUser?.name}</strong> to a different college gate.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleReassignGate} className="space-y-4 text-xs">
              <div>
                <Label className="text-xs font-semibold">Select Assigned College Gate *</Label>
                <Select value={reassignGateValue} onValueChange={setReassignGateValue}>
                  <SelectTrigger className="mt-1 h-10 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {collegeGates.length === 0 ? (
                      <SelectItem value={reassignGateValue}>{reassignGateValue}</SelectItem>
                    ) : (
                      collegeGates.map((g) => (
                        <SelectItem key={g.id} value={g.gate_name}>
                          {g.gate_name} ({g.gate_code})
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setReassignGateOpen(false)}
                  className="h-9 text-xs rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={reassigningGate}
                  className="h-9 text-xs font-bold rounded-xl bg-primary text-primary-foreground"
                >
                  {reassigningGate ? "Saving Gate Assignment..." : "Confirm Gate Reassignment"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* MODAL: ADD INDIVIDUAL USER */}
        <Dialog open={addUserOpen} onOpenChange={setAddUserOpen}>
          <DialogContent className="w-[95vw] sm:max-w-md max-h-[90vh] overflow-y-auto rounded-2xl p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 font-bold text-foreground">
                <UserPlus className="size-5 text-primary" /> Add Individual Account
              </DialogTitle>
              <DialogDescription>
                Create a new user profile. Account will receive a default password with mandatory first-login password change.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleCreateSingleUser} className="space-y-4 text-xs">
              <div>
                <Label className="text-xs font-semibold">Account Role *</Label>
                <Select value={newRole} onValueChange={(val: any) => setNewRole(val)}>
                  <SelectTrigger className="mt-1 h-10 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="student">Student</SelectItem>
                    <SelectItem value="faculty">Faculty</SelectItem>
                    <SelectItem value="hod">Head of Department (HOD)</SelectItem>
                    <SelectItem value="security">Security Officer</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-semibold">{newRole === "student" ? "Roll Number *" : "Staff Code / ID *"}</Label>
                  <Input
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value)}
                    placeholder={newRole === "student" ? "e.g. 23CSE1012" : "e.g. FAC001"}
                    className="mt-1 h-10 rounded-xl"
                    required
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold">Full Name *</Label>
                  <Input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Full Name"
                    className="mt-1 h-10 rounded-xl"
                    required
                  />
                </div>
              </div>

              {newRole === "student" ? (
                <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 text-[11px] text-muted-foreground">
                  <span className="font-bold text-foreground block">Auto-Generated College Email:</span>
                  <code>{newCode ? `${newCode.trim().toUpperCase()}@college.edu.in` : "ROLL_NO@college.edu.in"}</code>
                </div>
              ) : (
                <div>
                  <Label className="text-xs font-semibold">Email Address</Label>
                  <Input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="email@college.edu.in"
                    className="mt-1 h-10 rounded-xl"
                  />
                </div>
              )}

              {newRole === "security" ? (
                <div>
                  <Label className="text-xs font-semibold">Assigned College Gate *</Label>
                  <Select value={newAssignedGate} onValueChange={setNewAssignedGate}>
                    <SelectTrigger className="mt-1 h-10 rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {collegeGates.length === 0 ? (
                        <SelectItem value={newAssignedGate}>{newAssignedGate}</SelectItem>
                      ) : (
                        collegeGates.map((g) => (
                          <SelectItem key={g.id} value={g.gate_name}>
                            {g.gate_name} ({g.gate_code})
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs font-semibold">Department *</Label>
                    <Select value={newDept} onValueChange={setNewDept}>
                      <SelectTrigger className="mt-1 h-10 rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CSE">CSE</SelectItem>
                        <SelectItem value="ECE">ECE</SelectItem>
                        <SelectItem value="MECH">MECH</SelectItem>
                        <SelectItem value="EEE">EEE</SelectItem>
                        <SelectItem value="CIVIL">CIVIL</SelectItem>
                        <SelectItem value="IT">IT</SelectItem>
                        <SelectItem value="AIML">AIML</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs font-semibold">Phone Number</Label>
                    <Input
                      value={newPhone}
                      onChange={(e) => setNewPhone(e.target.value)}
                      placeholder="+91 9876543210"
                      className="mt-1 h-10 rounded-xl"
                    />
                  </div>
                </div>
              )}

              {newRole === "student" && (
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label className="text-[11px]">Year</Label>
                    <Select value={newYear} onValueChange={setNewYear}>
                      <SelectTrigger className="mt-1 h-9 text-xs rounded-xl"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1st Year">1st Year</SelectItem>
                        <SelectItem value="2nd Year">2nd Year</SelectItem>
                        <SelectItem value="3rd Year">3rd Year</SelectItem>
                        <SelectItem value="4th Year">4th Year</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-[11px]">Semester</Label>
                    <Select value={String(newSem)} onValueChange={(v) => setNewSem(parseInt(v, 10))}>
                      <SelectTrigger className="mt-1 h-9 text-xs rounded-xl"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                          <SelectItem key={s} value={String(s)}>Sem {s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-[11px]">Section</Label>
                    <Select value={newSec} onValueChange={setNewSec}>
                      <SelectTrigger className="mt-1 h-9 text-xs rounded-xl"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Section A">Section A</SelectItem>
                        <SelectItem value="Section B">Section B</SelectItem>
                        <SelectItem value="Section C">Section C</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              <DialogFooter className="gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setAddUserOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={submittingUser} className="font-bold bg-primary text-primary-foreground">
                  {submittingUser ? "Creating Account..." : "Create Account"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* MODAL: BULK STUDENT IMPORT */}
        <Dialog open={bulkImportOpen} onOpenChange={setBulkImportOpen}>
          <DialogContent className="w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 font-bold text-foreground">
                <FileSpreadsheet className="size-5 text-primary" /> Bulk Student Import Engine
              </DialogTitle>
              <DialogDescription>
                Upload CSV or paste student data. Emails are auto-generated as <code className="text-primary font-bold">ROLL_NO@college.edu.in</code> with mandatory initial password change.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50 border border-border">
                <div>
                  <span className="font-bold text-foreground block">Download Standard CSV Template</span>
                  <span className="text-[11px] text-muted-foreground">Columns: Roll Number, Name, Department, Year, Semester, Section</span>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={downloadSampleTemplate} className="rounded-xl text-xs font-semibold">
                  <Download className="size-3.5 mr-1" /> Template CSV
                </Button>
              </div>

              <div>
                <Label className="text-xs font-semibold text-foreground">Paste CSV Text or Select File</Label>
                <div className="mt-1.5 space-y-2">
                  <textarea
                    rows={5}
                    value={csvContent}
                    onChange={(e) => {
                      setCsvContent(e.target.value);
                      setImportResult(null);
                    }}
                    placeholder={`Roll Number,Name,Department,Year,Semester,Section\n23CSE1012,Ashok Dora,CSE,3,6,A\n23CSE1013,Ravi Teja,CSE,3,6,A`}
                    className="w-full font-mono text-xs rounded-xl border border-input bg-background p-3 focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <div className="flex items-center gap-2">
                    <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-input bg-background text-xs font-semibold text-muted-foreground hover:bg-accent">
                      <Upload className="size-3.5" /> Upload CSV File
                      <input
                        type="file"
                        accept=".csv,.txt"
                        className="sr-only"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (ev) => {
                              setCsvContent(ev.target?.result as string);
                              setImportResult(null);
                            };
                            reader.readAsText(file);
                          }
                        }}
                      />
                    </label>
                    <Button
                      type="button"
                      onClick={handleValidateCsv}
                      disabled={validatingImport || !csvContent.trim()}
                      className="rounded-xl font-bold bg-indigo-600 text-white hover:bg-indigo-500"
                    >
                      {validatingImport ? "Validating CSV..." : "Validate Import File"}
                    </Button>
                  </div>
                </div>
              </div>

              {/* IMPORT VALIDATION PREVIEW */}
              {importResult && (
                <div className="space-y-3 pt-2 border-t border-divider">
                  <div className="grid grid-cols-4 gap-2 text-center text-xs font-bold">
                    <div className="p-2.5 rounded-xl bg-accent border border-border">
                      <span className="text-muted-foreground block text-[10px] uppercase">Total Records</span>
                      <span className="text-lg text-foreground">{importResult.totalCount}</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600">
                      <span className="block text-[10px] uppercase">Valid</span>
                      <span className="text-lg">{importResult.validCount}</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600">
                      <span className="block text-[10px] uppercase">Duplicates</span>
                      <span className="text-lg">{importResult.duplicateCount}</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600">
                      <span className="block text-[10px] uppercase">Invalid</span>
                      <span className="text-lg">{importResult.invalidCount}</span>
                    </div>
                  </div>

                  <div className="max-h-48 overflow-y-auto overflow-x-auto border border-border rounded-xl">
                    <table className="w-full text-left text-[11px] min-w-[500px]">
                      <thead className="bg-muted/60 border-b border-border font-bold">
                        <tr>
                          <th className="p-2">Row</th>
                          <th className="p-2">Roll No</th>
                          <th className="p-2">Name</th>
                          <th className="p-2">Auto Email</th>
                          <th className="p-2">Status</th>
                          <th className="p-2">Reason</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-divider font-medium">
                        {importResult.items.map((item) => (
                          <tr key={item.rowNumber} className={cn(item.isValid ? "bg-emerald-50/20 dark:bg-emerald-950/10" : "bg-red-50/20 dark:bg-red-950/10")}>
                            <td className="p-2 font-bold">{item.rowNumber}</td>
                            <td className="p-2 font-mono font-bold">{item.rollNumber || "—"}</td>
                            <td className="p-2">{item.name}</td>
                            <td className="p-2 font-mono text-muted-foreground">{item.generatedEmail}</td>
                            <td className="p-2">
                              <span className={cn("px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase", item.isValid ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" : "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300")}>
                                {item.status}
                              </span>
                            </td>
                            <td className="p-2 text-muted-foreground">{item.reason || "Ready for import"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <DialogFooter className="gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setBulkImportOpen(false)}>Cancel</Button>
                <Button
                  type="button"
                  onClick={handleCommitBulkImport}
                  disabled={committingImport || !importResult || importResult.validCount === 0}
                  className="font-bold bg-emerald-600 text-white hover:bg-emerald-500"
                >
                  {committingImport ? "Committing Bulk Import..." : `Commit Import (${importResult?.validCount || 0} Students)`}
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>

        {/* MODAL: MANAGE CAMPUS GATES */}
        <Dialog open={manageGatesOpen} onOpenChange={setManageGatesOpen}>
          <DialogContent className="w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 font-bold text-foreground">
                <MapPin className="size-5 text-amber-600 dark:text-amber-400" /> College Campus Gates Management
              </DialogTitle>
              <DialogDescription>
                Add, edit, or remove college gate locations dynamically based on your institution's infrastructure.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 text-xs">
              {/* Form to Add New Gate */}
              <form onSubmit={handleCreateGate} className="p-4 rounded-2xl bg-accent/40 border border-border space-y-3">
                <h4 className="font-bold text-foreground flex items-center gap-1.5 text-xs">
                  <Plus className="size-4 text-primary" /> Add New Campus Gate
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <Label className="text-[11px]">Gate Name *</Label>
                    <Input
                      value={newGateName}
                      onChange={(e) => setNewGateName(e.target.value)}
                      placeholder="e.g. North Tech Gate"
                      className="mt-1 h-9 text-xs rounded-xl"
                      required
                    />
                  </div>
                  <div>
                    <Label className="text-[11px]">Gate Code *</Label>
                    <Input
                      value={newGateCode}
                      onChange={(e) => setNewGateCode(e.target.value)}
                      placeholder="e.g. GT-NORTH"
                      className="mt-1 h-9 text-xs rounded-xl uppercase font-mono"
                      required
                    />
                  </div>
                  <div>
                    <Label className="text-[11px]">Description (Optional)</Label>
                    <Input
                      value={newGateDesc}
                      onChange={(e) => setNewGateDesc(e.target.value)}
                      placeholder="e.g. Near CS Block"
                      className="mt-1 h-9 text-xs rounded-xl"
                    />
                  </div>
                </div>
                <div className="flex justify-end pt-1">
                  <Button
                    type="submit"
                    disabled={submittingGate}
                    size="sm"
                    className="h-8 text-xs font-bold rounded-xl bg-amber-600 hover:bg-amber-500 text-white"
                  >
                    {submittingGate ? "Creating..." : "Add Gate"}
                  </Button>
                </div>
              </form>

              {/* Dynamic Gates Table */}
              <div className="space-y-2">
                <h4 className="font-bold text-foreground text-xs uppercase tracking-wider text-muted-foreground">
                  Configured Campus Gates ({collegeGates.length})
                </h4>

                {loadingGates ? (
                  <div className="p-6 text-center text-muted-foreground">Loading gates from PostgreSQL...</div>
                ) : collegeGates.length === 0 ? (
                  <div className="p-6 text-center text-muted-foreground border border-dashed rounded-xl">No gates configured yet.</div>
                ) : (
                  <div className="border border-border rounded-xl overflow-hidden overflow-x-auto">
                    <table className="w-full text-left text-xs min-w-[480px]">
                      <thead className="bg-muted/60 border-b border-border font-bold text-[11px] uppercase">
                        <tr>
                          <th className="p-3">Gate Name</th>
                          <th className="p-3">Gate Code</th>
                          <th className="p-3">Description</th>
                          <th className="p-3">Status</th>
                          <th className="p-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-divider font-medium">
                        {collegeGates.map((gate) => (
                          <tr key={gate.id} className="hover:bg-accent/30">
                            <td className="p-3 font-bold text-foreground">
                              {gate.gate_name}
                            </td>
                            <td className="p-3 font-mono font-semibold text-muted-foreground">
                              {gate.gate_code}
                            </td>
                            <td className="p-3 text-muted-foreground">
                              {gate.description || "—"}
                            </td>
                            <td className="p-3">
                              <span className={cn(
                                "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                                gate.status === "Active" ? "bg-emerald-500/10 text-emerald-600" : "bg-red-500/10 text-red-600"
                              )}>
                                {gate.status}
                              </span>
                            </td>
                            <td className="p-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setEditingGate(gate);
                                    setEditGateName(gate.gate_name);
                                    setEditGateCode(gate.gate_code);
                                    setEditGateDesc(gate.description || "");
                                    setEditGateStatus(gate.status);
                                  }}
                                  className="h-7 w-7 p-0 rounded-lg text-muted-foreground hover:text-foreground"
                                >
                                  <Edit3 className="size-3.5" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteGate(gate)}
                                  className="h-7 w-7 p-0 rounded-lg text-red-500 hover:text-red-600 hover:bg-red-500/10"
                                >
                                  <Trash2 className="size-3.5" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setManageGatesOpen(false)} className="h-9 text-xs rounded-xl">
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* MODAL: EDIT GATE */}
        <Dialog open={!!editingGate} onOpenChange={(open) => !open && setEditingGate(null)}>
          <DialogContent className="w-[95vw] sm:max-w-md rounded-2xl p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 font-bold text-foreground">
                <Edit3 className="size-5 text-primary" /> Edit Gate Details
              </DialogTitle>
              <DialogDescription>
                Update details or toggle status for campus gate <strong>{editingGate?.gate_name}</strong>.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleUpdateGate} className="space-y-4 text-xs">
              <div>
                <Label className="text-xs font-semibold">Gate Name *</Label>
                <Input
                  value={editGateName}
                  onChange={(e) => setEditGateName(e.target.value)}
                  className="mt-1 h-10 rounded-xl"
                  required
                />
              </div>

              <div>
                <Label className="text-xs font-semibold">Gate Code *</Label>
                <Input
                  value={editGateCode}
                  onChange={(e) => setEditGateCode(e.target.value)}
                  className="mt-1 h-10 rounded-xl font-mono uppercase"
                  required
                />
              </div>

              <div>
                <Label className="text-xs font-semibold">Description</Label>
                <Input
                  value={editGateDesc}
                  onChange={(e) => setEditGateDesc(e.target.value)}
                  className="mt-1 h-10 rounded-xl"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold">Status *</Label>
                <Select value={editGateStatus} onValueChange={(val: any) => setEditGateStatus(val)}>
                  <SelectTrigger className="mt-1 h-10 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <DialogFooter className="gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setEditingGate(null)} className="h-9 text-xs rounded-xl">
                  Cancel
                </Button>
                <Button type="submit" disabled={updatingGate} className="h-9 text-xs font-bold rounded-xl bg-primary text-primary-foreground">
                  {updatingGate ? "Saving..." : "Save Gate Changes"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        {/* MODAL: ONE-TIME CREDENTIALS RESULT */}
        <Dialog open={!!oneTimeCredentials} onOpenChange={(open) => { if (!open) attemptCloseOneTimeCredentials(); }}>
          <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto bg-slate-950 text-slate-100 border-slate-800 p-6 rounded-2xl shadow-2xl">
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
                  <KeyRound className="h-6 w-6" />
                </div>
                <div>
                  <DialogTitle className="text-base font-bold text-slate-100">
                    {oneTimeCredentials?.title}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-slate-400">
                    One-time initial credentials generated securely. Passwords will <strong className="text-destructive font-black">NEVER</strong> be shown again.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            {/* SINGLE USER OR RESET CREDENTIALS */}
            {oneTimeCredentials?.singleUser && (
              <div className="space-y-4 my-2">
                <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[11px]">Full Name</span>
                      <span className="font-bold text-slate-200">{oneTimeCredentials.singleUser.name}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Assigned Role</span>
                      <span className="font-extrabold text-cyan-400 uppercase">{oneTimeCredentials.singleUser.role}</span>
                    </div>
                  </div>

                  <div className="text-xs">
                    <span className="text-slate-400 block text-[11px]">Login Email / Roll Number</span>
                    <span className="font-mono font-semibold text-slate-200">{oneTimeCredentials.singleUser.email}</span>
                  </div>

                  <div className="pt-2 border-t border-slate-800">
                    <span className="text-slate-400 block text-[11px] font-semibold mb-1">Temporary Password</span>
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <Input
                          readOnly
                          type={showOneTimePass ? "text" : "password"}
                          value={oneTimeCredentials.singleUser.tempPassword}
                          className="font-mono text-sm font-bold bg-slate-950 border-slate-800 text-amber-400 pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowOneTimePass(!showOneTimePass)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                        >
                          {showOneTimePass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      <Button
                        type="button"
                        onClick={() => handleCopySinglePassword(oneTimeCredentials.singleUser!.tempPassword)}
                        className={cn(
                          "h-10 px-4 text-xs font-bold gap-1.5 transition-all",
                          credentialsCopied
                            ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                            : "bg-amber-600 hover:bg-amber-500 text-white"
                        )}
                      >
                        {credentialsCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        {credentialsCopied ? "Copied" : "Copy Password"}
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-amber-300 text-xs flex items-start gap-2.5">
                  <ShieldAlert className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <p className="font-bold">Security Notice:</p>
                    <p className="text-[11px] leading-relaxed opacity-90">
                      Save or share this temporary password with the user immediately. Plaintext passwords are not stored in the system and cannot be retrieved later.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* BULK IMPORT CREDENTIALS */}
            {oneTimeCredentials?.bulkItems && (
              <div className="space-y-3 my-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300">
                    Created Accounts ({oneTimeCredentials.bulkItems.length}):
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleCopyBulkCredentials(oneTimeCredentials.bulkItems!)}
                      className={cn(
                        "h-8 text-xs font-bold gap-1.5",
                        credentialsCopied
                          ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                          : "bg-slate-800 hover:bg-slate-700 text-slate-200"
                      )}
                    >
                      {credentialsCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      {credentialsCopied ? "Copied All" : "Copy Credentials"}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleDownloadBulkCredentials(oneTimeCredentials.bulkItems!)}
                      className={cn(
                        "h-8 text-xs font-bold gap-1.5",
                        credentialsDownloaded
                          ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                          : "bg-cyan-600 hover:bg-cyan-500 text-white"
                      )}
                    >
                      <Download className="h-3.5 w-3.5" />
                      {credentialsDownloaded ? "Downloaded CSV" : "Download Credentials CSV"}
                    </Button>
                  </div>
                </div>

                <div className="max-h-60 overflow-y-auto rounded-xl border border-slate-800 bg-slate-900/60 p-2">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="border-b border-slate-800 text-[10px] text-slate-400 uppercase">
                      <tr>
                        <th className="p-2">Roll No / Name</th>
                        <th className="p-2">Email</th>
                        <th className="p-2">Temp Password</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-slate-300">
                      {oneTimeCredentials.bulkItems.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-800/40">
                          <td className="p-2">
                            <span className="font-bold text-slate-100 block">{item.rollNumber}</span>
                            <span className="text-[10px] font-sans text-slate-400">{item.name}</span>
                          </td>
                          <td className="p-2 text-slate-300">{item.email}</td>
                          <td className="p-2 font-bold text-amber-400">{item.tempPassword}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-amber-300 text-xs flex items-start gap-2.5">
                  <ShieldAlert className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-[11px] leading-relaxed opacity-90">
                    Temporary passwords are shown only once. Save or download credentials before closing this screen. Plaintext temporary passwords cannot be retrieved from the database.
                  </p>
                </div>
              </div>
            )}

            <DialogFooter className="pt-3 border-t border-slate-800">
              <Button
                type="button"
                onClick={attemptCloseOneTimeCredentials}
                className="w-full sm:w-auto bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold text-xs h-10 px-6 rounded-xl"
              >
                Done / Close Credentials
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* MODAL: UNSAVED CREDENTIAL WARNING */}
        <Dialog open={unsavedWarningOpen} onOpenChange={setUnsavedWarningOpen}>
          <DialogContent className="sm:max-w-md bg-card border-destructive/30 text-foreground p-6 rounded-2xl shadow-2xl">
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/10 text-destructive border border-destructive/20">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <DialogTitle className="text-base font-bold text-foreground">
                    Are you sure?
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground">
                    Unsaved temporary credentials warning.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="my-3 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-foreground text-xs leading-relaxed">
              These temporary passwords will <strong className="text-destructive font-bold">NOT be shown again</strong> after closing this screen. Please copy or download them before proceeding.
            </div>

            <DialogFooter className="gap-2 pt-2 border-t border-border">
              <Button
                type="button"
                variant="outline"
                onClick={() => setUnsavedWarningOpen(false)}
                className="text-xs rounded-xl"
              >
                Go Back & Copy
              </Button>
              <Button
                type="button"
                onClick={forceCloseOneTimeCredentials}
                className="bg-destructive hover:bg-destructive/90 text-destructive-foreground font-bold text-xs rounded-xl"
              >
                Close Anyway
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </RoleGuard>
  );
}
