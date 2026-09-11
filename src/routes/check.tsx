// CMADMS Student Verification Route
import { useEffect, useState } from "react";
import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import {
  AlertCircle,
  AlertTriangle,
  Award,
  BookOpen,
  Building2,
  Calendar,
  Camera,
  CheckCircle2,
  Clock,
  DoorOpen,
  FileCheck,
  FileText,
  HelpCircle,
  History,
  Home,
  Info,
  MapPin,
  MessageSquare,
  RotateCcw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Upload,
  User,
  UserCheck,
  UserRound,
  Users,
  X,
  XCircle,
  QrCode,
} from "lucide-react";
import { CameraModal } from "@/components/camera-modal";
import { QRScannerModal } from "@/components/qr-scanner-modal";
import { z } from "zod";
import { toast } from "sonner";
import { ToneBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
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
import {
  currentClassByStudent,
  faculty,
  locations,
  permissionByStudent,
  students,
  type Report,
} from "@/lib/cmadms-data";
import { useCmadms } from "@/lib/cmadms-store";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import {
  getFacultyStudent,
  getStudentMovementStatus,
  submitViolationReportApi,
  getStudentCurrentClassApi,
  getStudentDailyTimetableApi,
  verifyStudentForFacultyApi,
  getStudentViolationHistoryApi,
} from "@/lib/api/faculty.server";
import { getCampusRoomsApi } from "@/lib/api/rooms.server";
import { getStudentCounselorApi } from "@/lib/api/counselor.server";
import { RoleGuard } from "@/components/role-guard";
import type { DBStudent } from "@/lib/db/students.server";

export const Route = createFileRoute("/check")({
  validateSearch: z.object({ student: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Student Verification — CMADMS" },
      {
        name: "description",
        content:
          "Verify a student's current class and movement permission before reporting unauthorized movement.",
      },
      { property: "og:title", content: "Student Verification — CMADMS" },
      {
        property: "og:description",
        content: "Check class schedule and movement permission in one step.",
      },
    ],
  }),
  component: ProtectedCheckStudentPage,
});

function ProtectedCheckStudentPage() {
  return (
    <RoleGuard allowedRoles={["faculty", "hod", "security", "admin"]}>
      <CheckStudentPage />
    </RoleGuard>
  );
}

type Result = {
  student: {
    id: string;
    name: string;
    department: string;
    year: string;
    section: string;
    semester: number;
    status: "Active" | "Inactive";
    photo_url?: string | null;
  } | null;
  slot: (typeof currentClassByStudent)[string];
  permission: ReturnType<() => (typeof permissionByStudent)[string]>;
};

function ClassroomVectorIllustration() {
  return (
    <svg
      className="w-44 h-28 hidden md:block text-indigo-500/80 shrink-0"
      viewBox="0 0 200 130"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Board */}
      <rect
        x="25"
        y="15"
        width="85"
        height="50"
        rx="6"
        fill="#EEF2FF"
        stroke="#C7D2FE"
        strokeWidth="2"
      />
      <line
        x1="35"
        y1="28"
        x2="85"
        y2="28"
        stroke="#818CF8"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <line
        x1="35"
        y1="38"
        x2="70"
        y2="38"
        stroke="#A5B4FC"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <line
        x1="35"
        y1="48"
        x2="95"
        y2="48"
        stroke="#C7D2FE"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* Clock on wall */}
      <circle cx="15" cy="22" r="7" fill="#E0E7FF" stroke="#818CF8" strokeWidth="1.5" />
      <path d="M15 19V22L17.5 24.5" stroke="#4F46E5" strokeWidth="1.5" strokeLinecap="round" />
      {/* Teacher */}
      <circle cx="145" cy="52" r="7" fill="#818CF8" />
      <path
        d="M145 62V84M145 68L128 54M145 68L158 76"
        stroke="#6366F1"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M137 84L145 104M153 84L145 104"
        stroke="#4F46E5"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      {/* Students */}
      <circle cx="45" cy="80" r="5" fill="#A5B4FC" />
      <path d="M35 102V92C35 89 37 87 40 87H50C53 87 55 89 55 92V102" fill="#C7D2FE" />
      <circle cx="75" cy="80" r="5" fill="#818CF8" />
      <path d="M65 102V92C65 89 67 87 70 87H80C83 87 85 89 85 92V102" fill="#A5B4FC" />
      <circle cx="105" cy="80" r="5" fill="#6366F1" />
      <path d="M95 102V92C95 89 97 87 100 87H110C113 87 115 89 115 92V102" fill="#818CF8" />
    </svg>
  );
}

function formatDateSafe(dateVal?: string | null, fallback = "N/A"): string {
  if (!dateVal) return fallback;
  try {
    const parsed = new Date(dateVal);
    if (isNaN(parsed.getTime())) {
      return dateVal;
    }
    return parsed.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateVal || fallback;
  }
}

export function CheckStudentPage() {
  const search = useSearch({ strict: false }) as { student?: string };
  const navigate = useNavigate();
  const { addReport, checkActivePermission, reports: storeReports } = useCmadms();
  const { profile } = useAuth();

  const [query, setQuery] = useState(search?.student ?? "23CSE1012");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [notFound, setNotFound] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [location, setLocation] = useState("");
  const [remarks, setRemarks] = useState("the student is at outside");
  const [evidence, setEvidence] = useState("");
  const [cameraOpen, setCameraOpen] = useState(false);
  const [qrScannerOpen, setQrScannerOpen] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  // Student Daily Timetable Timeline State
  const [dailySlots, setDailySlots] = useState<any[]>([]);
  const [verifiedTimeStr, setVerifiedTimeStr] = useState<string>("");
  const [sessionTab, setSessionTab] = useState<"MORNING" | "AFTERNOON">(() => {
    const currentHour = new Date().getHours();
    const currentMinute = new Date().getMinutes();
    const currentMins = currentHour * 60 + currentMinute;
    // Morning session: 09:00 AM (540 mins) to 01:10 PM (790 mins)
    return currentMins >= 790 ? "AFTERNOON" : "MORNING";
  });

  // Student Violation History State
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [historyFilter, setHistoryFilter] = useState<"ALL" | "EXCUSED" | "WARNED" | "PENDING">("ALL");
  const [counselorName, setCounselorName] = useState<string>("Prof. Ravi Kumar");

  const activeFacultyName = profile?.full_name || faculty.name;

  // Admin-Configured Master Locations State
  const defaultRoaming = [
    "Canteen & Cafeteria",
    "Campus Parking Area",
    "Sports & Athletics Ground",
    "Library Corridor & Reading Foyer",
    "Main Entrance Gate",
    "Hostel Quadrangle & Gate",
    "Administrative Block Corridor",
  ];
  const [roamingLocations, setRoamingLocations] = useState<string[]>(defaultRoaming);
  const [buildingRooms, setBuildingRooms] = useState<string[]>([]);

  useEffect(() => {
    const loadMasterLocations = async () => {
      try {
        const res = await getCampusRoomsApi({ data: {} });
        if (res.success && res.rooms && res.rooms.length > 0) {
          const dbRoaming = res.rooms
            .filter((r) => r.roomType === "Common Area" || r.buildingBlock === "Common Roaming Area")
            .map((r) => r.roomCode);

          const dbRooms = res.rooms
            .filter((r) => r.roomType !== "Common Area" && r.buildingBlock !== "Common Roaming Area")
            .map((r) => `${r.roomCode} (${r.buildingBlock})`);

          setRoamingLocations(Array.from(new Set([...defaultRoaming, ...dbRoaming])));
          setBuildingRooms(dbRooms);
        }
      } catch {
        // fallback
      }
    };
    loadMasterLocations();
  }, []);

  const fetchViolationHistory = async (studentCode: string) => {
    if (!studentCode) return;
    setHistoryLoading(true);
    try {
      const apiRes = await getStudentViolationHistoryApi({ data: { studentCode } });
      let dbReports: any[] = apiRes.success && apiRes.reports ? apiRes.reports : [];

      const matchedStore = (storeReports || []).filter(
        (r) =>
          r.studentId?.toUpperCase() === studentCode.toUpperCase() ||
          (r as any).studentCode?.toUpperCase() === studentCode.toUpperCase(),
      );

      const combined = [...dbReports];
      matchedStore.forEach((sr) => {
        if (!combined.some((c) => c.id === sr.id)) {
          combined.push({
            id: sr.id,
            student_code: sr.studentId,
            student_name: sr.studentName,
            department: sr.department,
            year_section: sr.yearSection,
            class_name: sr.className,
            scheduled_time: sr.scheduledTime,
            room: sr.room,
            incident_time: sr.incidentTime,
            location: sr.location,
            violation_type: (sr as any).violationType || "Unauthorized Class Movement",
            severity: (sr as any).severity || "Medium",
            remarks: sr.remarks,
            evidence: sr.evidence || null,
            reported_by: sr.reportedBy,
            status: sr.status,
            explanation: sr.explanation || null,
            explanation_submitted_at: sr.explanationSubmittedAt || null,
            decision: sr.decision || null,
            decision_by: sr.decisionBy || (sr as any).departmentHod || null,
            decision_at: (sr as any).decisionAt || null,
            created_at: sr.createdAt,
          });
        }
      });

      setHistoryList(combined);
    } catch (err) {
      console.error("Failed to load violation history:", err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const runCheck = async (raw: string) => {
    const id = raw.trim();
    if (!id) return;
    setLoading(true);
    setResult(null);
    setNotFound(null);
    setFormOpen(false);

    try {
      const res = await verifyStudentForFacultyApi({ data: { studentQrOrRollNo: id } });

      if (!res.success || !res.student) {
        setNotFound(id);
        setLoading(false);
        return;
      }

      const dbStudent = res.student;
      const studentObj = {
        id: dbStudent.id,
        name: dbStudent.name,
        department: dbStudent.department,
        year: dbStudent.year,
        section: dbStudent.section,
        semester: dbStudent.semester,
        status: (dbStudent.status || "Active") as "Active" | "Inactive",
        photo_url: dbStudent.photo_url,
      };

      const permissionObj = res.activePass
        ? {
            reason: res.activePass.reason,
            validUntil: `${res.activePass.validUntil}`,
            issuedBy: res.activePass.issuedBy,
          }
        : null;

      const slotObj = res.slot
        ? {
            subject: res.slot.course_name,
            code: res.slot.course_code,
            start: res.slot.start_time,
            end: res.slot.end_time,
            room: res.slot.room,
            faculty: res.slot.faculty_name,
            batch: "",
          }
        : null;

      setResult({
        student: studentObj,
        slot: slotObj as any,
        permission: permissionObj as any,
      });

      // Fetch Assigned Counselor details for student
      try {
        const cRes = await getStudentCounselorApi({
          data: {
            studentCode: dbStudent.id,
            department: dbStudent.department,
            year: dbStudent.year,
            section: dbStudent.section,
          },
        });
        if (cRes?.counselorName) {
          setCounselorName(cRes.counselorName);
        } else {
          setCounselorName("Prof. Ravi Kumar");
        }
      } catch {
        setCounselorName("Prof. Ravi Kumar");
      }

      // Real-Time Clock Resolution for Verification
      const now = new Date();
      const currentMins = now.getHours() * 60 + now.getMinutes();
      setSessionTab(currentMins >= 790 ? "AFTERNOON" : "MORNING");
      setVerifiedTimeStr(
        now.toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        })
      );

      // Query complete daily timetable slots for student
      try {
        const ttRes = await getStudentDailyTimetableApi({ data: { rollNo: dbStudent.id } });
        if (ttRes.success && ttRes.slots) {
          setDailySlots(ttRes.slots);
        } else {
          setDailySlots([]);
        }
      } catch {
        setDailySlots([]);
      }

      fetchViolationHistory(dbStudent.id);
    } catch (err: any) {
      console.error("Failed to verify student:", err);
      toast.error("Error querying student status.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initialQuery = search?.student || "23CSE1012";
    setQuery(initialQuery);
    runCheck(initialQuery);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search?.student]);

  const handleClear = () => {
    setQuery("");
    setResult(null);
    setNotFound(null);
    setFormOpen(false);
    navigate({ to: "." as any, search: { student: undefined } as any });
  };

  const slot = result?.slot ?? null;
  const permission = result?.permission;
  const state: "authorized" | "no-class" | "unauthorized" | null = !result
    ? null
    : !slot
      ? "no-class"
      : permission
        ? "authorized"
        : "unauthorized";

  const [violationType, setViolationType] = useState("Suspected Violence / Physical Altercation");
  const [severity, setSeverity] = useState<"Low" | "Medium" | "High" | "Critical">("Medium");
  const [witnessNotes, setWitnessNotes] = useState("");
  const [incidentTime, setIncidentTime] = useState("");

  useEffect(() => {
    if (!formOpen) return;
    const updateRealTime = () => {
      const nowStr = new Date().toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
      setIncidentTime(nowStr);
    };
    updateRealTime();
    const interval = setInterval(updateRealTime, 1000);
    return () => clearInterval(interval);
  }, [formOpen]);

  const handleOpenReportForm = () => {
    const nowStr = new Date().toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
    setIncidentTime(nowStr);
    if (!remarks) setRemarks("the student is at outside");
    if (!location) setLocation("Corridor");
    if (!violationType) {
      setViolationType(slot ? "Unauthorized Class Movement" : "Suspected Violence / Physical Altercation");
    }
    setFormOpen(true);
  };

  const submitReport = async () => {
    if (!result?.student) return;
    setSubmitting(true);
    const now = new Date();
    const time = incidentTime || now.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });

    try {
      // 1. Submit violation report + audit log to Docker PostgreSQL
      const dbRes = await submitViolationReportApi({
        data: {
          studentCode: result.student.id,
          studentName: result.student.name,
          department: result.student.department,
          yearSection: `${result.student.year} • ${result.student.section}`,
          className: slot ? slot.subject : "No Class Scheduled",
          subjectCode: slot ? slot.code || undefined : undefined,
          scheduledTime: slot ? `${slot.start} — ${slot.end}` : "No Class Scheduled",
          room: slot ? slot.room : "N/A",
          scheduledFaculty: slot ? slot.faculty || undefined : undefined,
          incidentTime: time,
          location: location || "Corridor",
          violationType,
          severity,
          remarks: remarks.trim() || "the student is at outside",
          witnessNotes: witnessNotes || undefined,
          evidence: photoPreview || evidence || null,
          semester: result.student.semester || 6,
        },
      });

      setSubmitting(false);

      if (!dbRes.success) {
        toast.error(dbRes.error || "Failed to submit violation report.");
        return;
      }

      setConfirmOpen(false);
      setFormOpen(false);

      toast.success("Incident Reported Successfully", {
        description: `Case #${dbRes.report?.id} has been submitted to assigned Counselor (${counselorName}).`,
        duration: 4000,
      });
      navigate({ to: "/faculty/reports" as any });
    } catch (err: any) {
      console.error("Violation submission failed:", err);
      toast.error(err.message || "Failed to record violation report in database.");
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Breadcrumb Header */}
      <nav className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <span
          className="flex items-center gap-1 hover:text-foreground cursor-pointer transition-colors"
          onClick={() => navigate({ to: "/" })}
        >
          <Home className="size-3.5" /> Home
        </span>
        <span>&gt;</span>
        <span className="hover:text-foreground cursor-pointer">Verification</span>
        <span>&gt;</span>
        <span className="font-semibold text-foreground">Check Student</span>
      </nav>

      {/* Main Page Title & Subtitle Section */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Student Verification
          </h1>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm max-w-2xl">
            Check academic status and movement permission before reporting unauthorized movement.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate({ to: "/violations" })}
          className="h-9 gap-2 self-start rounded-xl border-border text-xs font-semibold text-foreground hover:bg-accent shrink-0 shadow-2xs"
        >
          <Clock className="size-3.5 text-muted-foreground" /> Verification History
        </Button>
      </div>

      {/* Student ID / Roll Number Search Card */}
      <section className="card-surface p-5 sm:p-6 rounded-2xl border border-border/80 shadow-xs">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            navigate({ to: "/check", search: { student: query.trim().toUpperCase() } });
            runCheck(query);
          }}
        >
          <Label
            htmlFor="student-id"
            className="text-xs font-bold uppercase tracking-wider text-foreground"
          >
            Student ID / Roll Number
          </Label>
          <div className="mt-2.5 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search
                className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                id="student-id"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="23CSE1012"
                className="h-11 pl-10 pr-9 text-sm font-semibold tracking-wide text-foreground focus-visible:ring-primary rounded-xl"
                autoComplete="off"
              />
              {query && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted transition-colors"
                  aria-label="Clear input"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setQrScannerOpen(true)}
                className="h-11 border-border/80 text-foreground hover:bg-accent hover:border-primary/40 px-4 font-semibold rounded-xl shadow-2xs gap-2 w-full sm:w-auto justify-center transition-all"
              >
                <QrCode className="size-4 text-primary" />
                <span>Scan Student ID</span>
              </Button>
              <Button
                type="submit"
                size="lg"
                loading={loading}
                disabled={loading || !query.trim()}
                className="h-11 bg-primary text-primary-foreground hover:bg-primary/90 px-5 font-bold rounded-xl shadow-xs gap-2 w-full sm:w-auto justify-center"
              >
                {!loading && <Search className="size-4" />}
                <span>{loading ? "Checking..." : "Check Student"}</span>
              </Button>
              {(query || result) && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleClear}
                  className="h-11 text-muted-foreground hover:text-foreground hover:bg-accent/60 px-3.5 font-medium rounded-xl gap-1.5 w-full sm:w-auto justify-center"
                  title="Clear input and reset status"
                >
                  <RotateCcw className="size-3.5" />
                  <span>Clear</span>
                </Button>
              )}
            </div>
          </div>
          <p className="mt-2.5 text-xs text-muted-foreground">
            Enter roll number and press{" "}
            <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-foreground">
              Enter
            </kbd>{" "}
            or click Check Student
          </p>
        </form>
      </section>

      {loading && <VerificationSkeleton />}

      {notFound && !loading && (
        <section className="card-surface p-8 rounded-2xl">
          <EmptyState
            icon={UserRound}
            title="No student found"
            description={`We couldn't find a student record for "${notFound}". Check the ID and try again.`}
            action={
              <Button variant="outline" onClick={handleClear}>
                Clear search
              </Button>
            }
          />
        </section>
      )}

      {result?.student && !loading && (
        <>
          {/* Top Status Alert Banner */}
          <section
            className={cn(
              "flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between shadow-xs",
              state === "unauthorized" &&
                "border-l-4 border-l-destructive border-destructive/30 bg-destructive/5 dark:bg-destructive/10",
              state === "authorized" &&
                "border-l-4 border-l-emerald-600 border-emerald-200/80 bg-emerald-50/50 dark:bg-emerald-950/20 dark:border-emerald-900/50",
              state === "no-class" &&
                "border-l-4 border-l-blue-600 border-blue-200/80 bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-900/50",
            )}
          >
            <div className="flex items-center gap-3.5">
              <span
                className={cn(
                  "grid size-10 shrink-0 place-items-center rounded-full text-white shadow-xs",
                  state === "unauthorized" && "bg-destructive",
                  state === "authorized" && "bg-emerald-600",
                  state === "no-class" && "bg-blue-600",
                )}
              >
                {state === "unauthorized" ? (
                  <ShieldAlert className="size-5" />
                ) : (
                  <CheckCircle2 className="size-5" />
                )}
              </span>
              <div>
                <h2
                  className={cn(
                    "text-sm font-bold uppercase tracking-wider",
                    state === "unauthorized" && "text-destructive",
                    state === "authorized" && "text-emerald-700 dark:text-emerald-400",
                    state === "no-class" && "text-blue-700 dark:text-blue-400",
                  )}
                >
                  {state === "unauthorized" && "UNAUTHORIZED MOVEMENT"}
                  {state === "authorized" && "AUTHORIZED MOVEMENT"}
                  {state === "no-class" && "NO CLASS SCHEDULED"}
                </h2>
                <p className="text-xs font-medium text-muted-foreground mt-0.5">
                  {state === "unauthorized" &&
                    "Student is currently expected in class and has no active movement permission."}
                  {state === "authorized" &&
                    "Student is authorized with an active movement permission pass."}
                  {state === "no-class" &&
                    "Student is not currently expected in any class session."}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-5 text-xs font-medium text-muted-foreground self-end sm:self-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-red-200/40">
              <div className="flex items-center gap-1.5">
                <Clock className="size-3.5 text-muted-foreground" />
                <div>
                  <span className="block text-[10px] text-muted-foreground">Verified at</span>
                  <span className="font-semibold text-foreground">
                    {verifiedTimeStr || new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })}
                  </span>
                </div>
              </div>
              <span className="text-border">|</span>
              <div className="flex items-center gap-1.5">
                <User className="size-3.5 text-muted-foreground" />
                <div>
                  <span className="block text-[10px] text-muted-foreground">Verified by</span>
                  <span className="font-semibold text-foreground">{activeFacultyName}</span>
                </div>
              </div>
            </div>
          </section>

          {/* Two-Column Middle Grid */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Left Card: STUDENT INFORMATION */}
            <section className="card-surface p-6 rounded-2xl border border-border shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 border-b border-divider pb-3.5">
                  <UserRound className="size-4 text-primary" />
                  <span className="text-xs font-bold uppercase tracking-wider text-primary">
                    STUDENT INFORMATION
                  </span>
                </div>

                <div className="mt-5 flex items-center gap-4">
                  <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-primary/10 text-xl font-bold text-primary border border-primary/20">
                    {result.student.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </span>
                  <div>
                    <div className="flex items-center gap-2.5">
                      <h3 className="text-xl font-bold text-foreground">{result.student.name}</h3>
                      <span className="rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300 px-2.5 py-0.5 text-[11px] font-bold">
                        Active
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-muted-foreground mt-0.5">
                      {result.student.id}
                    </p>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3 border-t border-b border-divider py-5 text-xs">
                  <div>
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Building2 className="size-3.5" /> Department
                    </span>
                    <p className="mt-1 font-bold text-foreground text-sm">
                      {result.student.department}
                    </p>
                  </div>
                  <div>
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Users className="size-3.5" /> Year / Section
                    </span>
                    <p className="mt-1 font-bold text-foreground text-sm">
                      {result.student.year} • {result.student.section}
                    </p>
                  </div>
                  <div>
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Calendar className="size-3.5" /> Semester
                    </span>
                    <p className="mt-1 font-bold text-foreground text-sm">
                      Semester {result.student.semester}
                    </p>
                  </div>
                  <div>
                    <span className="flex items-center gap-1 text-muted-foreground font-medium">
                      <UserCheck className="size-3.5 text-primary shrink-0" /> Counselor
                    </span>
                    <p className="mt-1 font-bold text-primary text-sm truncate" title={counselorName}>
                      {counselorName}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between pt-3 border-t border-divider flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Status:</span>
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                    Active
                  </span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (result?.student) {
                      fetchViolationHistory(result.student.id);
                      setHistoryOpen(true);
                    }
                  }}
                  className="h-7 text-xs font-bold text-amber-700 hover:text-amber-800 hover:bg-amber-100/60 dark:text-amber-400 dark:hover:bg-amber-950/50 gap-1.5 px-2.5 rounded-lg"
                >
                  <FileText className="size-3.5" />
                  <span>View {historyList.length} Violation Record{historyList.length === 1 ? "" : "s"}</span>
                </Button>
              </div>
            </section>

            {/* Right Card: STRICT HALF-DAY TIMETABLE SCHEDULE */}
            <section className="card-surface p-5 sm:p-6 rounded-2xl border border-border shadow-xs flex flex-col justify-between space-y-4">
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-divider pb-3.5 gap-2">
                  <div className="flex items-center gap-2">
                    <BookOpen className="size-4 text-primary" />
                    <span className="text-xs font-bold uppercase tracking-wider text-primary">
                      STUDENT TIMETABLE SCHEDULE
                    </span>
                  </div>

                  {/* Active Half-Day Session Badge */}
                  <div className="flex items-center gap-1.5 bg-primary/10 border border-primary/30 px-3 py-1 rounded-xl text-primary font-black text-xs">
                    {sessionTab === "AFTERNOON" ? (
                      <>
                        <span>Afternoon Session (01:10 PM — 04:10 PM)</span>
                      </>
                    ) : (
                      <>
                        <span>Morning Session (09:00 AM — 01:10 PM)</span>
                      </>
                    )}
                  </div>
                </div>

                {/* TIMETABLE SLOTS TIMELINE */}
                <div className="mt-4 space-y-2.5">
                  {getFilteredSlots(dailySlots, sessionTab, slot).map((s: any, idx: number) => (
                    <TimetableSlotRow key={s.id || idx} slot={s} />
                  ))}
                </div>
              </div>

              {slot ? (
                <div className="mt-4 rounded-xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200/60 dark:border-blue-900/40 px-3.5 py-2.5 text-xs text-blue-700 dark:text-blue-300 flex items-center gap-2">
                  <Info className="size-4 shrink-0 text-blue-600 dark:text-blue-400" />
                  <span className="font-medium">
                    Student is scheduled for <strong>{slot.subject}</strong> in {slot.room}.
                  </span>
                </div>
              ) : (
                <div className="mt-4 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-900/40 px-3.5 py-2.5 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <span className="font-medium">No active class scheduled at this exact minute.</span>
                </div>
              )}
            </section>
          </div>

          {/* Movement Permission Card */}
          {slot && !permission && (
            <section className="rounded-2xl border border-l-4 border-l-destructive border-destructive/30 bg-destructive/5 dark:bg-destructive/10 p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-xs">
              <div className="flex items-start gap-3.5">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-destructive/15 text-destructive mt-0.5">
                  <XCircle className="size-6" />
                </span>
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    MOVEMENT PERMISSION
                  </span>
                  <h3 className="text-base font-bold text-destructive mt-0.5">
                    No active movement permission
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1 max-w-xl">
                    The student is scheduled to attend {slot.subject} from {slot.start} – {slot.end}{" "}
                    in {slot.room}.
                  </p>
                </div>
              </div>
            </section>
          )}

          {slot && permission && (
            <section className="rounded-2xl border border-l-4 border-l-emerald-600 border-emerald-200/80 bg-emerald-50/40 dark:bg-emerald-950/20 p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-xs">
              <div className="flex items-start gap-3.5">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-emerald-600 text-white shadow-xs mt-0.5">
                  <ShieldCheck className="size-6" />
                </span>
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    MOVEMENT PERMISSION
                  </span>
                  <h3 className="text-base font-bold text-emerald-700 dark:text-emerald-400 mt-0.5">
                    Authorized Movement Pass Found
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Reason: <strong className="text-foreground">{permission.reason}</strong> •
                    Issued by {permission.issuedBy} (Valid until {permission.validUntil})
                  </p>
                </div>
              </div>
              <ToneBadge tone="success" className="px-4 py-1.5 text-xs font-bold rounded-lg">
                <CheckCircle2 className="size-4 mr-1.5" /> Authorized
              </ToneBadge>
            </section>
          )}

          {/* Dedicated Faculty Incident Action Bar */}
          {!formOpen && (
            <section className="card-surface p-4 sm:p-6 rounded-2xl border border-border shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-destructive/15 text-destructive">
                  <AlertTriangle className="size-5" />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-foreground">Faculty Incident Reporting</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Observed violence, disruptive behavior, or campus violation by this student? Report directly to HOD.
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="destructive"
                onClick={handleOpenReportForm}
                className="font-bold h-11 px-6 rounded-xl shadow-xs gap-2 shrink-0 w-full sm:w-auto"
              >
                <AlertTriangle className="size-4" />
                <span>Report Incident</span>
              </Button>
            </section>
          )}

          {/* Report Incident Form */}
          {formOpen && (
            <section className="card-surface rounded-2xl overflow-hidden border border-border shadow-md">
              <div className="border-b border-divider px-4 sm:px-6 py-3.5 sm:py-4 bg-muted/30">
                <h2 className="text-base font-bold text-foreground">
                  Report Student Incident
                </h2>
                <p className="text-xs text-muted-foreground">
                  Record an observed incident and submit it to the Department HOD for review.
                </p>
              </div>
              <div className="grid gap-6 p-4 sm:p-6 lg:grid-cols-2">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Student Information</h3>
                  <dl className="mt-4 divide-y divide-divider text-xs sm:text-sm">
                    {[
                      ["Student Name", result.student.name],
                      ["Student ID / Roll Number", result.student.id],
                      ["Department", result.student.department],
                      ["Year / Section", `${result.student.year} • ${result.student.section}`],
                      ["Assigned Counselor", counselorName],
                      ["Current Class Status", slot ? `${slot.subject} (${slot.start} — ${slot.end})` : "No Class Scheduled"],
                      ["Incident Time", incidentTime || "10:42 AM"],
                      ["Reported By", activeFacultyName],
                    ].map(([k, v]) => (
                      <div key={k} className="flex items-center justify-between gap-4 py-2.5">
                        <dt className="text-muted-foreground">{k}</dt>
                        <dd className="text-right font-medium text-foreground">{v}</dd>
                      </div>
                    ))}
                  </dl>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-foreground">Incident Details</h3>
                  <div className="mt-4 space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="sev" className="text-xs font-medium">
                          Severity Level (optional)
                        </Label>
                        <Select
                          value={severity}
                          onValueChange={(val: any) => setSeverity(val)}
                        >
                          <SelectTrigger id="sev" className="mt-1.5 h-11 rounded-xl">
                            <SelectValue placeholder="Severity" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Low">Low</SelectItem>
                            <SelectItem value="Medium">Medium</SelectItem>
                            <SelectItem value="High">High</SelectItem>
                            <SelectItem value="Critical">Critical</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="loc" className="text-xs font-medium">
                          Observed Location (optional)
                        </Label>
                        <Select value={location} onValueChange={setLocation}>
                          <SelectTrigger id="loc" className="mt-1.5 h-11 rounded-xl">
                            <SelectValue placeholder="Select location" />
                          </SelectTrigger>
                          <SelectContent className="max-h-80">
                            <div className="px-2 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-primary bg-primary/5 rounded-md my-1">
                              Campus Roaming & Common Locations (Students Roaming)
                            </div>
                            {roamingLocations.map((l) => (
                              <SelectItem key={l} value={l}>
                                <span className="flex items-center gap-2 font-semibold">
                                  <MapPin className="size-4 text-primary shrink-0" aria-hidden /> {l}
                                </span>
                              </SelectItem>
                            ))}

                            {buildingRooms.length > 0 && (
                              <>
                                <div className="px-2 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground bg-muted/60 rounded-md my-1.5 mt-3">
                                  Building Classrooms & Laboratories
                                </div>
                                {buildingRooms.map((r) => (
                                  <SelectItem key={r} value={r}>
                                    <span className="flex items-center gap-2 text-xs font-medium">
                                      <DoorOpen className="size-4 text-muted-foreground shrink-0" aria-hidden /> {r}
                                    </span>
                                  </SelectItem>
                                ))}
                              </>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="incident-time" className="text-xs font-medium">
                          Incident Time *
                        </Label>
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                          <Clock className="size-3 animate-pulse" /> Auto-detected (Real-time)
                        </span>
                      </div>
                      <Input
                        id="incident-time"
                        value={incidentTime}
                        readOnly
                        className="mt-1.5 h-10 text-xs font-semibold rounded-xl bg-muted/40 cursor-not-allowed select-none border-muted"
                      />
                    </div>

                    <div>
                      <Label htmlFor="remarks" className="text-xs font-medium">
                        Observation Description (optional)
                      </Label>
                      <Textarea
                        id="remarks"
                        rows={3}
                        value={remarks}
                        onChange={(e) => setRemarks(e.target.value)}
                        placeholder="the student is at outside"
                        className="mt-1.5 text-xs rounded-xl"
                      />
                    </div>

                    <div>
                      <Label className="text-xs font-medium">
                        Evidence Photo / File (optional)
                      </Label>

                      <div className="mt-1.5 space-y-2">
                        {evidence ? (
                          <div className="flex items-center justify-between gap-3 p-3 rounded-xl border border-primary/30 bg-primary/5">
                            <div className="flex items-center gap-2.5 min-w-0">
                              {photoPreview ? (
                                <img
                                  src={photoPreview}
                                  alt="Captured preview"
                                  className="size-9 rounded-lg object-cover border border-primary/30 shrink-0"
                                />
                              ) : (
                                <Camera className="size-4 text-primary shrink-0" />
                              )}
                              <span className="truncate text-xs font-semibold text-foreground">
                                {evidence}
                              </span>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="text-xs h-8 text-destructive hover:bg-destructive/10 rounded-lg shrink-0"
                              onClick={() => {
                                setEvidence("");
                                setPhotoPreview(null);
                              }}
                            >
                              <X className="size-3.5 mr-1" /> Remove
                            </Button>
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 gap-2">
                            {/* Live In-App Camera Capture Button */}
                            <Button
                              type="button"
                              variant="outline"
                              className="h-11 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 border border-primary/40 bg-primary/5 text-primary hover:bg-primary/10 shadow-2xs"
                              onClick={() => setCameraOpen(true)}
                            >
                              <Camera className="size-4" />
                              <span>Take Photo</span>
                            </Button>

                            {/* File Upload Button */}
                            <label
                              htmlFor="evidence-file-upload"
                              className="flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-input bg-background px-3 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary shadow-2xs"
                            >
                              <Upload className="size-4" />
                              <span>Upload File</span>
                            </label>
                            <input
                              id="evidence-file-upload"
                              type="file"
                              accept=".png,.jpg,.jpeg,image/png,image/jpeg"
                              className="sr-only"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const ext = file.name.split(".").pop()?.toLowerCase();
                                  if (!ext || !["png", "jpg", "jpeg"].includes(ext)) {
                                    toast.error("Invalid file format. Only PNG, JPG, and JPEG image files are allowed.");
                                    return;
                                  }
                                  const reader = new FileReader();
                                  reader.onload = (ev) => {
                                    const dataUrl = ev.target?.result as string;
                                    const img = new Image();
                                    img.onload = () => {
                                      const canvas = document.createElement("canvas");
                                      const maxDim = 800;
                                      let width = img.width;
                                      let height = img.height;
                                      if (width > maxDim || height > maxDim) {
                                        if (width > height) {
                                          height = Math.round((height * maxDim) / width);
                                          width = maxDim;
                                        } else {
                                          width = Math.round((width * maxDim) / height);
                                          height = maxDim;
                                        }
                                      }
                                      canvas.width = width;
                                      canvas.height = height;
                                      const ctx = canvas.getContext("2d");
                                      ctx?.drawImage(img, 0, 0, width, height);
                                      const compressed = canvas.toDataURL("image/jpeg", 0.7);
                                      setPhotoPreview(compressed);
                                      setEvidence(compressed);
                                    };
                                    img.src = dataUrl;
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }}
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    <CameraModal
                      open={cameraOpen}
                      onClose={() => setCameraOpen(false)}
                      onCapture={(dataUrl, filename) => {
                        setPhotoPreview(dataUrl);
                        setEvidence(dataUrl);
                        toast.success(`Photo captured: ${filename}`);
                      }}
                    />
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-2.5 sm:gap-3 border-t border-divider px-4 sm:px-6 py-3.5 sm:py-4 sm:flex-row sm:justify-end bg-muted/20">
                <Button variant="outline" onClick={() => setFormOpen(false)} className="rounded-xl w-full sm:w-auto">
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  className="rounded-xl font-bold px-6 w-full sm:w-auto text-xs sm:text-sm"
                  onClick={() => {
                    setConfirmOpen(true);
                  }}
                >
                  <AlertTriangle className="size-4 mr-2" /> Submit Incident to Counselor
                </Button>
              </div>
            </section>
          )}
        </>
      )}

      {/* Confirmation Modal */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive font-black">
              <AlertTriangle className="size-5" />
              Submit Incident Report?
            </DialogTitle>
            <DialogDescription>
              Submit this incident report to assigned Counselor ({counselorName})?
            </DialogDescription>
          </DialogHeader>

          <dl className="divide-y divide-divider text-xs sm:text-sm">
            {[
              ["Student", `${result?.student?.name} (${result?.student?.id})`],
              ["Department", result?.student?.department ?? "—"],
              ["Assigned Counselor", counselorName],
              ["Class Status", slot ? `${slot.subject} (${slot.start} – ${slot.end})` : "No Class Scheduled"],
              ["Severity Level", severity],
              ["Observed Location", location || "Corridor"],
              ["Incident Time", incidentTime || "10:42 AM"],
            ].map(([k, v]) => (
              <div key={k} className="flex items-center justify-between gap-4 py-2">
                <dt className="text-muted-foreground">{k}</dt>
                <dd className="text-right font-medium text-foreground">{v}</dd>
              </div>
            ))}
          </dl>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              loading={submitting}
              disabled={submitting}
              onClick={submitReport}
              className="font-bold"
            >
              {submitting ? "Submitting Report..." : "Submit Report"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <QRScannerModal
        open={qrScannerOpen}
        onClose={() => setQrScannerOpen(false)}
        onScan={(token) => {
          setQuery(token);
          runCheck(token);
        }}
        title="Scan Student ID QR (Faculty Verification)"
        loading={loading}
      />

      {/* Student Violation History Dialog */}
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-w-4xl max-h-[92vh] overflow-hidden flex flex-col p-0 rounded-3xl gap-0 border-border shadow-2xl">
          <DialogHeader className="p-6 pb-4 border-b border-divider bg-muted/30">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="grid size-12 place-items-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold border border-amber-500/20 shrink-0 shadow-2xs">
                  <History className="size-6" />
                </span>
                <div>
                  <DialogTitle className="text-xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
                    Student Violation & Discipline History
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                    Infractions, faculty reports, student explanations & HOD decisions for{" "}
                    <strong className="text-foreground">{result?.student?.name}</strong> ({result?.student?.id})
                  </DialogDescription>
                </div>
              </div>
              <span className="rounded-full bg-primary/10 text-primary border border-primary/20 text-xs font-extrabold px-3.5 py-1.5 shadow-2xs">
                {historyList.length} Total Incident{historyList.length === 1 ? "" : "s"}
              </span>
            </div>

            {/* Filter Tabs Bar */}
            <div className="mt-5 flex items-center gap-2 border-b border-divider pb-1 overflow-x-auto">
              <button
                type="button"
                onClick={() => setHistoryFilter("ALL")}
                className={cn(
                  "px-3.5 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5",
                  historyFilter === "ALL"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                )}
              >
                <span>All Violations</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-background/20 font-extrabold">
                  {historyList.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setHistoryFilter("EXCUSED")}
                className={cn(
                  "px-3.5 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5",
                  historyFilter === "EXCUSED"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                )}
              >
                <ShieldCheck className="size-3.5" />
                <span>Excused by HOD</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-background/20 font-extrabold">
                  {historyList.filter((r) => r.status === "exonerated" || r.status === "dismissed" || r.decision === "exonerate").length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setHistoryFilter("WARNED")}
                className={cn(
                  "px-3.5 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5",
                  historyFilter === "WARNED"
                    ? "bg-amber-600 text-white shadow-xs"
                    : "text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40"
                )}
              >
                <AlertCircle className="size-3.5" />
                <span>Warned / Action Taken</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-background/20 font-extrabold">
                  {historyList.filter((r) => r.status === "warned" || r.decision === "warning" || r.status === "escalated").length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setHistoryFilter("PENDING")}
                className={cn(
                  "px-3.5 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5",
                  historyFilter === "PENDING"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40"
                )}
              >
                <Clock className="size-3.5" />
                <span>Pending Review</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-background/20 font-extrabold">
                  {historyList.filter((r) => r.status !== "exonerated" && r.status !== "dismissed" && r.decision !== "exonerate" && r.status !== "warned" && r.decision !== "warning" && r.status !== "escalated").length}
                </span>
              </button>
            </div>
          </DialogHeader>

          <div className="p-6 overflow-y-auto max-h-[62vh] space-y-6 bg-slate-50/60 dark:bg-slate-950/40">
            {historyLoading ? (
              <div className="space-y-4 py-6">
                <Skeleton className="h-32 w-full rounded-2xl" />
                <Skeleton className="h-32 w-full rounded-2xl" />
              </div>
            ) : historyList.length === 0 ? (
              <div className="py-14 text-center rounded-3xl border border-dashed border-border bg-card p-8 shadow-xs">
                <ShieldCheck className="size-14 text-emerald-500 mx-auto" />
                <h3 className="mt-3 text-lg font-bold text-foreground">Clean Disciplinary Record</h3>
                <p className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto">
                  No violation reports or disciplinary incidents found for {result?.student?.name} ({result?.student?.id}).
                </p>
              </div>
            ) : (
              historyList
                .filter((item) => {
                  const isExcused = item.status === "exonerated" || item.status === "dismissed" || item.decision === "exonerate";
                  const isWarned = item.status === "warned" || item.decision === "warning" || item.status === "escalated";
                  const isPending = !isExcused && !isWarned;
                  if (historyFilter === "EXCUSED") return isExcused;
                  if (historyFilter === "WARNED") return isWarned;
                  if (historyFilter === "PENDING") return isPending;
                  return true;
                })
                .map((item, idx) => {
                  const isExcused = item.status === "exonerated" || item.status === "dismissed" || item.decision === "exonerate";
                  const isWarned = item.status === "warned" || item.decision === "warning";
                  const isEscalated = item.status === "escalated" || item.decision === "escalate";
                  const hasExplanation = Boolean(item.explanation && item.explanation.trim().length > 0);
                  const incidentNum = historyList.length - idx;

                  return (
                    <div
                      key={item.id || idx}
                      className={cn(
                        "rounded-2xl border bg-card p-5 sm:p-6 shadow-md space-y-5 transition-all relative overflow-hidden",
                        isExcused && "border-l-8 border-l-emerald-500 border-emerald-200/80 dark:border-emerald-900/60",
                        isWarned && "border-l-8 border-l-amber-500 border-amber-200/80 dark:border-amber-900/60",
                        isEscalated && "border-l-8 border-l-red-600 border-red-200/80 dark:border-red-900/60",
                        !isExcused && !isWarned && !isEscalated && "border-l-8 border-l-blue-500 border-blue-200/80 dark:border-blue-900/60"
                      )}
                    >
                      {/* Top Bar: Incident Sequence Badge, Case ID & Severity */}
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-divider pb-3.5">
                        <div className="flex flex-wrap items-center gap-2.5">
                          <span className="rounded-lg bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 text-xs font-black px-3 py-1 uppercase tracking-wider shadow-2xs">
                            VIOLATION #{incidentNum} {idx === 0 ? "(LATEST)" : ""}
                          </span>
                          <span className="font-mono text-xs font-bold text-primary bg-primary/10 border border-primary/20 px-2.5 py-1 rounded-lg">
                            CASE #{item.id}
                          </span>
                          <span className="text-xs text-muted-foreground font-semibold flex items-center gap-1">
                            <Clock className="size-3.5 text-muted-foreground" />
                            {formatDateSafe(item.created_at || item.incident_time, "Time Unspecified")}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "px-3 py-1 text-[11px] font-extrabold rounded-full border shadow-2xs uppercase tracking-wider",
                              item.severity === "Critical" && "bg-red-100 text-red-700 border-red-300 dark:bg-red-950 dark:text-red-300 dark:border-red-800",
                              item.severity === "High" && "bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-800",
                              item.severity === "Medium" && "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800",
                              (!item.severity || item.severity === "Low") && "bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800"
                            )}
                          >
                            {item.severity || "Medium"} Severity
                          </span>
                        </div>
                      </div>

                      {/* SECTION 1: Faculty Incident Report (Who & Why) */}
                      <div className="space-y-3">
                        <span className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground block">
                          1. Faculty Incident Report (What & Why Reported)
                        </span>

                        <div className="grid gap-3 sm:grid-cols-2 text-xs">
                          {/* Faculty Reporter Box */}
                          <div className="rounded-xl bg-slate-100/70 dark:bg-slate-900/60 p-3.5 border border-slate-200/80 dark:border-slate-800">
                            <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                              <User className="size-3.5 text-primary" /> Faculty Reporter (Who Reported)
                            </span>
                            <p className="mt-1.5 font-bold text-foreground text-sm">
                              {item.reported_by || "Faculty Member"}
                            </p>
                            <p className="text-[11px] text-muted-foreground mt-1">
                              Class: <strong className="text-foreground">{item.class_name || "N/A"}</strong> ({item.room || "Room N/A"})
                            </p>
                          </div>

                          {/* Reported Violation Box */}
                          <div className="rounded-xl bg-destructive/10 p-3.5 border border-destructive/20">
                            <span className="text-[10px] font-extrabold uppercase tracking-wider text-destructive flex items-center gap-1.5">
                              <AlertTriangle className="size-3.5" /> Reported Infraction (Why Reported)
                            </span>
                            <p className="mt-1.5 font-extrabold text-destructive text-sm">
                              {item.violation_type || "Unauthorized Class Movement"}
                            </p>
                            <p className="text-[11px] text-muted-foreground mt-1">
                              Location: <strong className="text-foreground">{item.location || "Campus Corridor"}</strong>
                            </p>
                          </div>
                        </div>

                        {/* Faculty Observation Statement */}
                        {item.remarks && (
                          <div className="text-xs bg-muted/40 p-3.5 rounded-xl border border-border/60">
                            <span className="font-bold text-foreground text-[11px] block mb-1">
                              Faculty Observation Details:
                            </span>
                            <p className="text-foreground/90 font-mono text-[11px] italic bg-background/60 p-2.5 rounded-lg border border-border/40">
                              "{item.remarks}"
                            </p>
                            {item.witness_notes && (
                              <p className="text-muted-foreground text-[11px] mt-2">
                                <strong>Witness Notes:</strong> {item.witness_notes}
                              </p>
                            )}
                          </div>
                        )}
                      </div>

                      {/* SECTION 2: Student Explanation Statement */}
                      <div className="space-y-2 border-t border-divider pt-4 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground block">
                            2. Student Explanation Statement
                          </span>
                          {hasExplanation ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 px-2.5 py-0.5 text-[10px] font-bold">
                              <CheckCircle2 className="size-3" /> Explanation Submitted
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 px-2.5 py-0.5 text-[10px] font-bold">
                              <XCircle className="size-3" /> Explanation Not Submitted
                            </span>
                          )}
                        </div>

                        {hasExplanation ? (
                          <div className="bg-muted/40 p-3.5 rounded-xl border border-border/60">
                            <p className="text-[10px] text-muted-foreground font-semibold mb-1">
                              Student Submitted Explanation:
                            </p>
                            <p className="text-foreground font-mono text-[11px] leading-relaxed bg-background/60 p-2.5 rounded-lg border border-border/40">
                              "{item.explanation}"
                            </p>
                          </div>
                        ) : (
                          <div className="p-3 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/50 text-[11px] text-amber-800 dark:text-amber-300 italic">
                            Student has not submitted an official explanation statement for this incident.
                          </div>
                        )}
                      </div>

                      {/* SECTION 3: HOD Decision & Excuse Status (Is Student Excused?) */}
                      <div className="space-y-2 border-t border-divider pt-4 text-xs">
                        <span className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground block">
                          3. HOD Decision & Excuse Status (Did HOD Excuse Student?)
                        </span>

                        <div
                          className={cn(
                            "rounded-xl p-4 border text-xs space-y-2",
                            isExcused && "bg-emerald-50/80 border-emerald-200 text-emerald-950 dark:bg-emerald-950/40 dark:border-emerald-900/60 dark:text-emerald-200",
                            isWarned && "bg-amber-50/80 border-amber-200 text-amber-950 dark:bg-amber-950/40 dark:border-amber-900/60 dark:text-amber-200",
                            isEscalated && "bg-destructive/10 border-destructive/20 text-destructive",
                            !isExcused && !isWarned && !isEscalated && "bg-blue-50/80 border-blue-200 text-blue-950 dark:bg-blue-950/40 dark:border-blue-900/60 dark:text-blue-200"
                          )}
                        >
                          <div className="flex flex-wrap items-center justify-between font-bold gap-2">
                            <span className="flex items-center gap-2 text-sm font-extrabold">
                              {isExcused && <ShieldCheck className="size-4 text-emerald-600 dark:text-emerald-400" />}
                              {isWarned && <AlertCircle className="size-4 text-amber-600 dark:text-amber-400" />}
                              {isEscalated && <ShieldAlert className="size-4 text-destructive" />}
                              {!isExcused && !isWarned && !isEscalated && <Clock className="size-4 text-blue-600 dark:text-blue-400" />}
                              
                              {isExcused && "HOD EXCUSED: YES — Student Exonerated"}
                              {isWarned && "HOD EXCUSED: NO — Official Warning Issued"}
                              {isEscalated && "HOD EXCUSED: NO — Escalated to Admin"}
                              {!isExcused && !isWarned && !isEscalated && "HOD EXCUSED: PENDING DECISION"}
                            </span>

                            {item.decision_by && (
                              <span className="text-[11px] font-extrabold opacity-90 bg-background/40 px-2.5 py-0.5 rounded-md border border-border/40">
                                Decision By: HOD {item.decision_by}
                              </span>
                            )}
                          </div>

                          <p className="text-xs leading-relaxed font-medium">
                            {isExcused && (item.decision ? `HOD Ruling: "${item.decision}"` : "The Department HOD reviewed the case and granted an official excuse, exonerating the student.")}
                            {isWarned && (item.decision ? `HOD Ruling: "${item.decision}"` : "The Department HOD did not excuse the student and issued an official disciplinary warning.")}
                            {isEscalated && (item.decision ? `HOD Ruling: "${item.decision}"` : "The Department HOD did not excuse the student and escalated the case to Institutional Administration.")}
                            {!isExcused && !isWarned && !isEscalated && "Department HOD has received the report. Case review and excuse determination are currently pending."}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })
            )}
          </div>

          <DialogFooter className="p-4 border-t border-divider bg-muted/30">
            <Button
              type="button"
              variant="outline"
              onClick={() => setHistoryOpen(false)}
              className="h-10 font-bold text-xs rounded-xl px-6"
            >
              Close History Record
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function VerificationSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-16 w-full rounded-2xl" />
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card-surface space-y-3 p-6 rounded-2xl">
          <Skeleton className="size-14 rounded-2xl" />
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-56" />
        </div>
        <div className="card-surface space-y-3 p-6 rounded-2xl">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-6 w-52" />
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    </div>
  );
}

function parseTimeToMins(tStr?: string): number {
  if (!tStr) return 0;
  const clean = tStr.trim();
  const isPM = clean.toUpperCase().includes("PM");
  const isAM = clean.toUpperCase().includes("AM");
  const parts = clean.replace(/(AM|PM)/gi, "").trim().split(":");
  let hours = parseInt(parts[0] || "0", 10);
  const minutes = parseInt(parts[1] || "0", 10);
  if (isPM && hours < 12) hours += 12;
  if (isAM && hours === 12) hours = 0;
  return hours * 60 + minutes;
}

function getFilteredSlots(allSlots: any[], session: "MORNING" | "AFTERNOON", currentSlot: any) {
  const now = new Date();
  const nowMins = now.getHours() * 60 + now.getMinutes();

  if (session === "MORNING") {
    const mSlots = allSlots.filter((s) => {
      const startH = parseInt((s.start_time || s.start || "09:00").split(":")[0], 10);
      return startH >= 9 && startH < 13;
    });

    if (mSlots.length === 0) {
      return [
        { id: "m1", time: "09:00 — 10:00", name: "Period 1: Programming in C (CS101)", room: "Room C-204", faculty: "Prof. S. Sharma", type: "CLASS", isCurrent: nowMins >= 540 && nowMins < 600 },
        { id: "m2", time: "10:00 — 11:00", name: "Period 2: Data Structures (CS301)", room: "Room C-205", faculty: "Dr. K. Rao", type: "CLASS", isCurrent: nowMins >= 600 && nowMins < 660 },
        { id: "mb", time: "11:00 — 11:10", name: "Morning Tea Break", room: "Campus Foyer", faculty: "N/A", type: "BREAK", isCurrent: nowMins >= 660 && nowMins < 670 },
        { id: "m3", time: "11:10 — 12:10", name: "Period 3: C Programming & Physics Lab", room: "Computer Lab 3", faculty: "Prof. R. Varma", type: "LAB", isCurrent: nowMins >= 670 && nowMins < 730 },
        { id: "m4", time: "12:10 — 13:10", name: "Period 4: Engineering Physics (PH101)", room: "Room E-102", faculty: "Dr. A. Verma", type: "CLASS", isCurrent: nowMins >= 730 && nowMins < 790 },
      ];
    }

    const result: any[] = [];
    mSlots.forEach((s) => {
      const stM = parseTimeToMins(s.start_time || s.start || "09:00");
      const etM = parseTimeToMins(s.end_time || s.end || "10:00");
      const isCur = (nowMins >= stM && nowMins < etM) || (currentSlot && (s.id === currentSlot.id || s.start_time === currentSlot.start));
      result.push({
        id: s.id,
        time: `${s.start_time} — ${s.end_time}`,
        name: `${s.subject}${s.subject_code ? ` (${s.subject_code})` : ""}`,
        room: s.room || "Room C-204",
        faculty: s.faculty_name || "Faculty",
        type: s.period_type || "CLASS",
        isCurrent: isCur,
      });

      if (s.end_time === "11:00") {
        result.push({
          id: "mb",
          time: "11:00 — 11:10",
          name: "Morning Tea Break",
          room: "Campus Foyer",
          faculty: "N/A",
          type: "BREAK",
          isCurrent: nowMins >= 660 && nowMins < 670,
        });
      }
    });

    return result;
  } else {
    const aSlots = allSlots.filter((s) => {
      const startH = parseInt((s.start_time || s.start || "14:00").split(":")[0], 10);
      return startH >= 13;
    });

    if (aSlots.length === 0) {
      return [
        { id: "lb", time: "13:10 — 14:10", name: "Lunch Break", room: "Canteen & Cafeteria", faculty: "N/A", type: "BREAK", isCurrent: nowMins >= 790 && nowMins < 850 },
        { id: "a5", time: "14:10 — 15:10", name: "Period 5: Operating Systems (CS403)", room: "Room C-204", faculty: "Prof. N. Patel", type: "CLASS", isCurrent: nowMins >= 850 && nowMins < 910 },
        { id: "a6", time: "15:10 — 16:10", name: "Period 6: Database Management Systems (CS401)", room: "Room C-205", faculty: "Dr. P. Roy", type: "CLASS", isCurrent: nowMins >= 910 && nowMins < 970 },
      ];
    }

    const result: any[] = [
      { id: "lb", time: "13:10 — 14:10", name: "Lunch Break", room: "Canteen & Cafeteria", faculty: "N/A", type: "BREAK", isCurrent: nowMins >= 790 && nowMins < 850 }
    ];

    aSlots.forEach((s) => {
      const stM = parseTimeToMins(s.start_time || s.start || "14:10");
      const etM = parseTimeToMins(s.end_time || s.end || "15:10");
      const isCur = (nowMins >= stM && nowMins < etM) || (currentSlot && (s.id === currentSlot.id || s.start_time === currentSlot.start));
      result.push({
        id: s.id,
        time: `${s.start_time} — ${s.end_time}`,
        name: `${s.subject}${s.subject_code ? ` (${s.subject_code})` : ""}`,
        room: s.room || "Room C-204",
        faculty: s.faculty_name || "Faculty",
        type: s.period_type || "CLASS",
        isCurrent: isCur,
      });
    });

    return result;
  }
}

function TimetableSlotRow({ slot }: { slot: any }) {
  if (slot.type === "BREAK") {
    return (
      <div className="bg-amber-500/10 border border-amber-300/40 dark:border-amber-900/40 rounded-xl p-2.5 flex items-center justify-between text-xs text-amber-900 dark:text-amber-200">
        <span className="font-bold flex items-center gap-1.5">{slot.name}</span>
        <span className="font-extrabold text-[11px] bg-amber-500/20 px-2 py-0.5 rounded-md">
          {slot.time}
        </span>
      </div>
    );
  }

  return (
    <div
      className={`rounded-xl p-3 border transition-all ${
        slot.isCurrent
          ? "bg-primary/10 border-primary ring-2 ring-primary/30 shadow-xs"
          : "bg-card border-border/70 hover:border-border"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-black text-foreground truncate">{slot.name}</span>
            {slot.isCurrent && (
              <span className="bg-primary text-primary-foreground text-[10px] font-black uppercase px-2 py-0.5 rounded-full animate-pulse shrink-0">
                NOW IN SESSION
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 font-medium">
            <span className="flex items-center gap-1">
              <MapPin className="size-3 text-primary shrink-0" /> {slot.room}
            </span>
            <span className="flex items-center gap-1">
              <User className="size-3 text-muted-foreground shrink-0" /> {slot.faculty}
            </span>
          </div>
        </div>

        <div className="text-right shrink-0">
          <span className="text-xs font-extrabold text-foreground block">{slot.time}</span>
          <span
            className={`inline-block text-[10px] font-extrabold px-2 py-0.5 rounded-md mt-1 ${
              slot.type === "LAB"
                ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200"
                : slot.type === "SPORTS"
                ? "bg-amber-500/15 text-amber-800 dark:text-amber-200"
                : slot.type === "LIBRARY"
                ? "bg-blue-500/15 text-blue-800 dark:text-blue-200"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {slot.type}
          </span>
        </div>
      </div>
    </div>
  );
}
