import { useEffect, useState } from "react";
import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import {
  AlertTriangle,
  BookOpen,
  Building2,
  Calendar,
  Camera,
  CheckCircle2,
  Clock,
  HelpCircle,
  Home,
  Info,
  MapPin,
  RotateCcw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Upload,
  User,
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
  verifyStudentForFacultyApi,
} from "@/lib/api/faculty.server";
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
  component: CheckStudentPage,
});

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

export function CheckStudentPage() {
  const search = useSearch({ strict: false }) as { student?: string };
  const navigate = useNavigate();
  const { addReport, checkActivePermission } = useCmadms();
  const { profile } = useAuth();

  const [query, setQuery] = useState(search?.student ?? "23CSE1012");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [notFound, setNotFound] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [location, setLocation] = useState("");
  const [remarks, setRemarks] = useState("");
  const [evidence, setEvidence] = useState("");
  const [cameraOpen, setCameraOpen] = useState(false);
  const [qrScannerOpen, setQrScannerOpen] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const activeFacultyName = profile?.full_name || faculty.name;

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

  const handleOpenReportForm = () => {
    const nowStr = new Date().toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
    setIncidentTime(nowStr);
    if (!location) setLocation("Corridor");
    if (!violationType) {
      setViolationType(slot ? "Unauthorized Class Movement" : "Suspected Violence / Physical Altercation");
    }
    setFormOpen(true);
  };

  const submitReport = async () => {
    if (!result?.student) return;
    if (remarks.trim().length < 10) {
      toast.error("Observation description must be at least 10 characters.");
      return;
    }
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
          remarks: remarks.trim(),
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
        description: `Case #${dbRes.report?.id} has been submitted to the Department HOD.`,
        duration: 6000,
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
                  onClick={() => setQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded-full"
                  aria-label="Clear input"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <Button
                type="button"
                onClick={() => setQrScannerOpen(true)}
                className="h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 rounded-xl shadow-xs gap-2"
              >
                <QrCode className="size-4" />
                <span>[ 📷 Scan Student ID ]</span>
              </Button>
              <Button
                type="submit"
                size="lg"
                loading={loading}
                disabled={loading}
                className="h-11 bg-primary text-primary-foreground hover:bg-primary/90 px-6 font-semibold rounded-xl shadow-xs"
              >
                {!loading && <Search className="size-4 mr-1.5" />}
                {loading ? "Checking Student..." : "Check Student"}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={handleClear}
                className="h-11 border-border text-foreground hover:bg-accent px-5 font-semibold rounded-xl"
              >
                <RotateCcw className="size-4 mr-1.5" /> Clear
              </Button>
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
                "border-l-4 border-l-red-600 border-red-200/80 bg-red-50/50 dark:bg-red-950/20 dark:border-red-900/50",
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
                  state === "unauthorized" && "bg-red-600",
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
                    state === "unauthorized" && "text-red-700 dark:text-red-400",
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
                  <span className="font-semibold text-foreground">10:42 AM</span>
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

                <div className="mt-6 grid grid-cols-3 gap-3 border-t border-b border-divider py-5 text-xs">
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
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Status:</span>
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                  Active
                </span>
              </div>
            </section>

            {/* Right Card: CURRENT CLASS */}
            <section className="card-surface p-6 rounded-2xl border border-border shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-divider pb-3.5">
                  <div className="flex items-center gap-2">
                    <BookOpen className="size-4 text-primary" />
                    <span className="text-xs font-bold uppercase tracking-wider text-primary">
                      CURRENT CLASS
                    </span>
                  </div>
                </div>

                {slot ? (
                  <div className="flex items-start justify-between mt-4">
                    <div>
                      <span className="inline-block rounded-full bg-red-100 text-red-700 dark:bg-red-950/80 dark:text-red-300 px-2.5 py-0.5 text-[11px] font-bold">
                        Currently in session
                      </span>
                      <h3 className="mt-2 text-xl font-bold text-foreground">{slot.subject}</h3>

                      <div className="mt-4 space-y-2 text-xs sm:text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Clock className="size-4 text-muted-foreground shrink-0" />
                          <span className="font-semibold text-foreground">
                            {slot.start} — {slot.end}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="size-4 text-muted-foreground shrink-0" />
                          <span className="font-semibold text-foreground">{slot.room}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <User className="size-4 text-muted-foreground shrink-0" />
                          <span className="font-semibold text-foreground">{slot.faculty}</span>
                        </div>
                      </div>
                    </div>

                    {/* Vector Classroom Graphic */}
                    <ClassroomVectorIllustration />
                  </div>
                ) : (
                  <div className="mt-6 py-4 text-center">
                    <CheckCircle2 className="size-8 text-emerald-500 mx-auto" />
                    <p className="mt-2 font-bold text-foreground">No Class Scheduled</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Student has no ongoing class right now.
                    </p>
                  </div>
                )}
              </div>

              {slot && (
                <div className="mt-5 rounded-xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200/60 dark:border-blue-900/40 px-3.5 py-2.5 text-xs text-blue-700 dark:text-blue-300 flex items-center gap-2">
                  <Info className="size-4 shrink-0 text-blue-600 dark:text-blue-400" />
                  <span className="font-medium">Student should be attending this class.</span>
                </div>
              )}
            </section>
          </div>

          {/* Movement Permission Card */}
          {slot && !permission && (
            <section className="rounded-2xl border border-l-4 border-l-red-600 border-red-200/80 bg-red-50/40 dark:bg-red-950/20 dark:border-red-900/50 p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-xs">
              <div className="flex items-start gap-3.5">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-red-100 text-red-600 dark:bg-red-900/60 dark:text-red-300 mt-0.5">
                  <XCircle className="size-6" />
                </span>
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    MOVEMENT PERMISSION
                  </span>
                  <h3 className="text-base font-bold text-red-700 dark:text-red-400 mt-0.5">
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
            <section className="card-surface p-5 sm:p-6 rounded-2xl border border-border shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400">
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
                onClick={handleOpenReportForm}
                className="bg-red-600 hover:bg-red-700 text-white font-bold h-11 px-6 rounded-xl shadow-xs gap-2 shrink-0"
              >
                <AlertTriangle className="size-4" />
                <span>[ REPORT INCIDENT ]</span>
              </Button>
            </section>
          )}

          {/* Report Incident Form */}
          {formOpen && (
            <section className="card-surface rounded-2xl overflow-hidden border border-border shadow-md">
              <div className="border-b border-divider px-6 py-4 bg-muted/30">
                <h2 className="text-base font-bold text-foreground">
                  Report Student Incident
                </h2>
                <p className="text-xs text-muted-foreground">
                  Record an observed incident and submit it to the Department HOD for review.
                </p>
              </div>
              <div className="grid gap-6 p-6 lg:grid-cols-2">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Student Information</h3>
                  <dl className="mt-4 divide-y divide-divider text-xs sm:text-sm">
                    {[
                      ["Student Name", result.student.name],
                      ["Student ID / Roll Number", result.student.id],
                      ["Department", result.student.department],
                      ["Year / Section", `${result.student.year} • ${result.student.section}`],
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
                    <div>
                      <Label htmlFor="vtype" className="text-xs font-medium">
                        Violation Category *
                      </Label>
                      <Select value={violationType} onValueChange={setViolationType}>
                        <SelectTrigger id="vtype" className="mt-1.5 h-11 rounded-xl">
                          <SelectValue placeholder="Select violation category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Suspected Violence / Physical Altercation">
                            ⚠️ Suspected Violence / Physical Altercation
                          </SelectItem>
                          <SelectItem value="Disruptive Behavior">
                            Disruptive Behavior
                          </SelectItem>
                          <SelectItem value="Unauthorized Campus Activity">
                            Unauthorized Campus Activity
                          </SelectItem>
                          <SelectItem value="Unauthorized Class Movement">
                            Unauthorized Class Movement
                          </SelectItem>
                          <SelectItem value="Misconduct">
                            Misconduct
                          </SelectItem>
                          <SelectItem value="Property Damage">
                            Property Damage
                          </SelectItem>
                          <SelectItem value="Harassment / Intimidation">
                            Harassment / Intimidation
                          </SelectItem>
                          <SelectItem value="Other">
                            Other Institutional Violation
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="sev" className="text-xs font-medium">
                          Severity Level *
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
                          Observed Location *
                        </Label>
                        <Select value={location} onValueChange={setLocation}>
                          <SelectTrigger id="loc" className="mt-1.5 h-11 rounded-xl">
                            <SelectValue placeholder="Select location" />
                          </SelectTrigger>
                          <SelectContent>
                            {["Classroom", "Laboratory", "Corridor", "Library", "Canteen", "Playground", "Parking Area", "Campus Entrance", "Other"].map((l) => (
                              <SelectItem key={l} value={l}>
                                <span className="flex items-center gap-2">
                                  <MapPin className="size-4" aria-hidden /> {l}
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="incident-time" className="text-xs font-medium">
                        Incident Time *
                      </Label>
                      <Input
                        id="incident-time"
                        value={incidentTime}
                        onChange={(e) => setIncidentTime(e.target.value)}
                        placeholder="10:42 AM"
                        className="mt-1.5 h-10 text-xs rounded-xl"
                      />
                    </div>

                    <div>
                      <Label htmlFor="remarks" className="text-xs font-medium">
                        Observation Description * (min 10 characters)
                      </Label>
                      <Textarea
                        id="remarks"
                        rows={3}
                        value={remarks}
                        onChange={(e) => setRemarks(e.target.value)}
                        placeholder="Describe exactly what you observed, including what the student was doing, where it occurred, and any relevant circumstances."
                        className="mt-1.5 text-xs rounded-xl"
                      />
                    </div>

                    <div>
                      <Label htmlFor="witness" className="text-xs font-medium">
                        Witness / Additional Notes (optional)
                      </Label>
                      <Input
                        id="witness"
                        value={witnessNotes}
                        onChange={(e) => setWitnessNotes(e.target.value)}
                        placeholder="e.g. Observed alongside Lab Assistant Sharma"
                        className="mt-1.5 text-xs h-10 rounded-xl"
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
                                    setPhotoPreview(dataUrl);
                                    setEvidence(dataUrl);
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
              <div className="flex flex-col gap-3 border-t border-divider px-6 py-4 sm:flex-row sm:justify-end bg-muted/20">
                <Button variant="outline" onClick={() => setFormOpen(false)} className="rounded-xl">
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  className="bg-red-600 hover:bg-red-700 rounded-xl font-bold px-6"
                  onClick={() => {
                    if (remarks.trim().length < 10) {
                      toast.error("Observation description must be at least 10 characters.");
                      return;
                    }
                    if (!location) {
                      toast.error("Please select or specify observed location.");
                      return;
                    }
                    setConfirmOpen(true);
                  }}
                  disabled={remarks.trim().length < 10 || !location}
                >
                  <AlertTriangle className="size-4 mr-2" /> [ SUBMIT INCIDENT TO HOD ]
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
            <DialogTitle className="flex items-center gap-2 text-red-600 font-black">
              <AlertTriangle className="size-5" />
              Submit Incident Report?
            </DialogTitle>
            <DialogDescription>
              Submit this incident report to the Department HOD?
            </DialogDescription>
          </DialogHeader>

          <dl className="divide-y divide-divider text-xs sm:text-sm">
            {[
              ["Student", `${result?.student?.name} (${result?.student?.id})`],
              ["Department", result?.student?.department ?? "—"],
              ["Class Status", slot ? `${slot.subject} (${slot.start} – ${slot.end})` : "No Class Scheduled"],
              ["Violation Category", violationType],
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
              className="bg-red-600 hover:bg-red-700 font-bold"
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
