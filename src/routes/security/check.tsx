import { useState, useEffect, useRef } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ShieldCheck,
  QrCode,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  Building2,
  MapPin,
  Loader2,
  Camera,
  RotateCcw,
  Sparkles,
  ShieldAlert,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { RoleGuard } from "@/components/role-guard";
import { useAuth } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { QRScannerModal } from "@/components/qr-scanner-modal";
import {
  verifyGatePassApi,
  authorizeEarlyExitApi,
  getSecurityAssignedGateApi,
  type VerificationResultPayload,
} from "@/lib/api/security.server";

export const Route = createFileRoute("/security/check")({
  head: () => ({ meta: [{ title: "Gate Pass Verification — Security Portal" }] }),
  component: SecurityCheckPage,
});

export function SecurityCheckPage() {
  const { profile } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [passInput, setPassInput] = useState("");
  const [checkpoint, setCheckpoint] = useState(profile?.department || "Main Gate");
  const [loading, setLoading] = useState(false);
  const [earlyExitLoading, setEarlyExitLoading] = useState(false);
  const [result, setResult] = useState<VerificationResultPayload | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [gateInfo, setGateInfo] = useState<{
    loading: boolean;
    assigned: boolean;
    gateName: string | null;
    officerName: string;
    staffCode: string | null;
  }>({
    loading: true,
    assigned: false,
    gateName: null,
    officerName: (profile as any)?.full_name || (profile as any)?.fullName || "Security Officer",
    staffCode: (profile as any)?.staff_code || (profile as any)?.staffCode || null,
  });

  // PWA Offline & Install Prompt states
  const [isOnline, setIsOnline] = useState(
    typeof window !== "undefined" ? navigator.onLine : true,
  );
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [earlyExitConfirmOpen, setEarlyExitConfirmOpen] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBanner(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
    };
  }, []);

  const triggerPwaInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setShowInstallBanner(false);
    }
    setDeferredPrompt(null);
  };

  // Fetch server-authoritative assigned gate for Security Officer
  useEffect(() => {
    async function fetchGate() {
      const prof = profile as any;
      try {
        const res = await getSecurityAssignedGateApi();
        if (res.success && res.assigned && res.gateName) {
          setGateInfo({
            loading: false,
            assigned: true,
            gateName: res.gateName,
            officerName: res.officerName || prof?.full_name || prof?.fullName || "Security Officer",
            staffCode: res.staffCode || prof?.staff_code || prof?.staffCode || null,
          });
          setCheckpoint(res.gateName);
        } else {
          setGateInfo({
            loading: false,
            assigned: false,
            gateName: null,
            officerName: prof?.full_name || prof?.fullName || "Security Officer",
            staffCode: prof?.staff_code || prof?.staffCode || null,
          });
        }
      } catch (err) {
        setGateInfo({
          loading: false,
          assigned: false,
          gateName: null,
          officerName: prof?.full_name || prof?.fullName || "Security Officer",
          staffCode: prof?.staff_code || prof?.staffCode || null,
        });
      }
    }
    fetchGate();
  }, [profile]);

  const handleAllowEarlyExit = async () => {
    if (!result?.pass?.id) return;
    if (!isOnline) {
      toast.error("Offline Error: Live server connection required to authorize early exit.");
      return;
    }
    setEarlyExitLoading(true);
    try {
      const res = await authorizeEarlyExitApi({
        data: {
          passId: result.pass.id,
          checkpoint,
        },
      });
      if (res.success) {
        setResult(res as VerificationResultPayload);
        setEarlyExitConfirmOpen(false);
        toast.success("✅ EARLY EXIT AUTHORIZED", {
          description: `Early exit authorized by Security at ${checkpoint}.`,
        });
      } else {
        toast.error("Early Exit Error", {
          description: res.failureReason || (res as any).error || "Failed to authorize early exit.",
        });
      }
    } catch (err: any) {
      console.error("Early exit error:", err);
      toast.error("Failed to authorize early exit.");
    } finally {
      setEarlyExitLoading(false);
    }
  };

  const handleVerify = async (e?: React.FormEvent, overrideInput?: string) => {
    if (e) e.preventDefault();
    if (!isOnline) {
      toast.error("Offline Error: Live server connection required for gate verification.");
      return;
    }
    const query = (overrideInput ?? passInput).trim();

    if (!query) {
      toast.error("Please enter a Pass ID, QR token, or Student Roll Number.");
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      console.log(`[Gate Verification] API called with input: "${query}", checkpoint: "${checkpoint}"`);
      const res = await verifyGatePassApi({
        data: {
          passIdOrRollNo: query,
          checkpoint,
        },
      });

      console.log(`[Gate Verification] API response received:`, {
        success: res.success,
        authorized: res.authorized,
        resultStatus: res.resultStatus,
        verificationType: (res as any).verificationType,
        failureReason: res.failureReason,
      });


      if (res.success) {

        setResult(res as VerificationResultPayload);
        if (res.authorized) {
          toast.success("✅ EXIT AUTHORIZED", {
            description: `${res.student?.name || "Student"} is authorized to exit.`,
          });
        } else {
          toast.error("🚫 EXIT NOT AUTHORIZED", {
            description: res.failureReason || "Student is not authorized.",
          });
        }
      } else {
        toast.error("Verification error occurred.");
      }
    } catch (err: any) {
      console.error("Verification error:", err);
      toast.error("Failed to verify gate pass. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCameraCapture = (scannedToken: string) => {
    setCameraOpen(false);
    const token = (scannedToken || "").trim();
    if (token) {
      setPassInput(token);
      toast.info("QR Code captured from scanner.");
      handleVerify(undefined, token);
    } else {
      toast.error("No valid QR token detected.");
    }
  };


  const handleReset = () => {
    setPassInput("");
    setResult(null);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
  };

  const handleRefresh = () => {
    const query = result?.pass?.passCode || result?.student?.studentCode || passInput;
    if (query) {
      toast.info("Refreshing gate pass verification status...");
      handleVerify(undefined, query);
    } else {
      handleReset();
    }
  };

  return (
    <RoleGuard allowedRoles={["security"]}>
      <div className="space-y-6 max-w-4xl mx-auto pb-8">
        {/* Offline Warning Banner */}
        {!isOnline && (
          <div className="p-4 rounded-2xl bg-red-600 text-white font-bold flex items-center justify-between shadow-lg animate-bounce">
            <div className="flex items-center gap-3">
              <ShieldAlert className="size-6 shrink-0" />
              <div>
                <p className="text-sm uppercase tracking-wider">⚠️ CONNECTION LOST</p>
                <p className="text-xs font-normal opacity-90">
                  Live server verification is unavailable. Gate check actions are temporarily disabled until internet connection is restored.
                </p>
              </div>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-lg bg-black/30 shrink-0">OFFLINE</span>
          </div>
        )}

        {/* PWA Install Banner */}
        {showInstallBanner && isOnline && (
          <div className="p-4 rounded-2xl bg-primary/10 border border-primary/30 text-foreground flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <Sparkles className="size-5 text-primary shrink-0" />
              <p className="text-xs font-semibold">
                Install <strong>CMADMS Security Gate</strong> app for faster mobile security verification.
              </p>
            </div>
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <Button
                type="button"
                size="sm"
                onClick={triggerPwaInstall}
                className="h-8 bg-primary text-primary-foreground font-bold text-xs rounded-lg px-3"
              >
                [ INSTALL APP ]
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowInstallBanner(false)}
                className="h-8 text-xs rounded-lg px-2 text-muted-foreground hover:text-foreground"
              >
                Dismiss
              </Button>
            </div>
          </div>
        )}

        <PageHeader
          title={
            gateInfo.assigned && gateInfo.gateName
              ? `Security Dashboard — ${gateInfo.gateName}`
              : "Security Dashboard — No Gate Assigned"
          }
          description={
            gateInfo.assigned && gateInfo.gateName
              ? `Assigned Gate: ${gateInfo.gateName} | Security Officer: ${gateInfo.officerName}${gateInfo.staffCode ? ` (${gateInfo.staffCode})` : ""}`
              : "⚠️ No Gate Assigned — Please contact system Admin."
          }
          breadcrumb={[
            { label: "Security Portal", to: "/security/check" },
            { label: gateInfo.assigned && gateInfo.gateName ? `Gate Pass Verification (${gateInfo.gateName})` : "No Gate Assigned" },
          ]}
        />

        {/* Checkpoint Banner */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-2xl bg-card border border-border shadow-xs gap-3">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold">
              <MapPin className="size-5" />
            </span>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Assigned Gate Location
              </p>
              <p className="text-sm font-bold text-foreground">
                {gateInfo.assigned ? gateInfo.gateName : "No Gate Assigned"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-xs font-bold border border-emerald-500/20">
              <ShieldCheck className="size-4 text-emerald-600 dark:text-emerald-400" />
              {gateInfo.assigned ? `📍 Assigned Gate: ${gateInfo.gateName} (Server Enforced)` : "⚠️ Unassigned Security Account"}
            </span>
          </div>
        </div>

        {!gateInfo.assigned && !gateInfo.loading && (
          <div className="p-6 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 space-y-2 text-center">
            <ShieldAlert className="size-10 text-amber-600 dark:text-amber-400 mx-auto" />
            <h3 className="text-base font-bold">⚠️ No Gate Assigned</h3>
            <p className="text-xs max-w-md mx-auto">
              Your Security Officer account currently has no assigned college gate. All gate transactions, QR scans, and verifications are disabled until system Admin assigns a gate to your profile.
            </p>
          </div>
        )}

        {/* Verification Options Card */}
        <div className="card-surface p-6 rounded-2xl border border-border shadow-xs space-y-4">
          <div className="p-6 rounded-2xl border-2 border-dashed border-primary/30 bg-primary/5 text-center space-y-4">
              <div className="mx-auto size-16 rounded-2xl bg-primary/10 text-primary grid place-items-center">
                <QrCode className="size-8 animate-pulse" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">
                  Scan Student Digital QR Gate Pass
                </h3>
                <p className="text-xs text-muted-foreground max-w-md mx-auto mt-1">
                  Scan the student's mobile QR pass or enter the scanned pass token code (e.g. CMADMS-PASS-XXXXXXXX).
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-md mx-auto pt-2">
                <Button
                  type="button"
                  onClick={() => setCameraOpen(true)}
                  className="w-full sm:w-auto h-12 px-6 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md gap-2"
                >
                  <Camera className="size-5" />
                  <span>[ SCAN QR PASS ]</span>
                </Button>
              </div>
            </div>

            {/* Direct QR / Token / Roll No input */}
            <form onSubmit={handleVerify} className="space-y-3 pt-2">
              <label className="text-xs font-semibold text-muted-foreground block">
                Or Paste/Type Scanned Pass Code / Student Roll No:
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  ref={inputRef}
                  placeholder="e.g. CMADMS-PASS-101 or 23CSE1012"
                  value={passInput}
                  onChange={(e) => setPassInput(e.target.value)}
                  className="h-11 rounded-xl text-xs font-mono w-full"
                />
                <Button
                  type="submit"
                  loading={loading}
                  disabled={loading}
                  className="h-11 px-6 rounded-xl font-bold bg-primary text-primary-foreground w-full sm:w-auto shrink-0"
                >
                  {loading ? "Verifying..." : "Verify"}
                </Button>
              </div>

              {/* Quick Preset Buttons for Testing */}
              <div className="pt-2 flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-semibold text-muted-foreground">Quick Test Roll Nos:</span>
                {["23CSE1012", "23CSE1044", "23ECE2031"].map((code) => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => {
                      setPassInput(code);
                      handleVerify(undefined, code);
                    }}
                    className="text-[11px] font-mono font-bold px-2.5 py-1 rounded-lg bg-accent text-accent-foreground hover:bg-primary/10 hover:text-primary transition-colors"
                  >
                    {code}
                  </button>
                ))}
              </div>
            </form>
          </div>

        {/* VERIFICATION RESULT DISPLAY */}
        {loading && (
          <div className="card-surface p-12 rounded-2xl border border-border text-center space-y-3">
            <Loader2 className="size-8 text-primary animate-spin mx-auto" />
            <p className="text-sm font-bold text-foreground">Querying Server & Database...</p>
            <p className="text-xs text-muted-foreground">Validating pass authenticity, status, date, and valid window.</p>
          </div>
        )}

        {result && !loading && (
          <div className="space-y-4">
            {/* CASE A: BEFORE VALIDITY (AMBER/GOLD CARD) */}
            {result.timeState === "BEFORE_VALIDITY" ? (
              <div className="card-surface p-6 sm:p-8 rounded-2xl border-2 border-amber-500 bg-amber-500/10 dark:bg-amber-950/40 shadow-lg space-y-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-amber-500/30 pb-4">
                  <div className="flex items-center gap-3">
                    <span className="grid size-12 place-items-center rounded-2xl bg-amber-500 text-white font-bold shadow-md">
                      <Clock className="size-7 animate-pulse" />
                    </span>
                    <div>
                      <span className="inline-block px-3 py-1 rounded-full bg-amber-500 text-white font-black text-xs tracking-wider uppercase shadow-xs">
                        ⏳ PASS NOT STARTED
                      </span>
                      <p className="text-sm font-bold text-amber-900 dark:text-amber-200 mt-1">
                        Starts in {result.timeUntilStartMinutes || 10} minutes ({result.pass?.validFrom} – {result.pass?.validUntil})
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                    <Button
                      type="button"
                      onClick={handleAllowEarlyExit}
                      loading={earlyExitLoading}
                      disabled={earlyExitLoading}
                      className="w-full sm:w-auto h-11 px-6 rounded-xl font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-md gap-2"
                    >
                      {!earlyExitLoading && <Sparkles className="size-4" />}
                      <span>{earlyExitLoading ? "Authorizing Early Exit..." : "[ ALLOW EARLY EXIT ]"}</span>
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleRefresh}
                      disabled={loading}
                      className="rounded-xl text-xs font-semibold border-amber-500/40 text-amber-800 dark:text-amber-200 hover:bg-amber-500/20"
                      title="Re-query live server status"
                    >
                      <RotateCcw className={`size-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} /> Refresh Status
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleReset}
                      className="rounded-xl text-xs font-semibold border-amber-500/40 text-amber-800 dark:text-amber-200 hover:bg-amber-500/20"
                      title="Clear and scan next student"
                    >
                      <span>Next Student</span> <ArrowRight className="size-3.5 ml-1.5" />
                    </Button>
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                  <div className="p-3.5 rounded-xl bg-card/80 border border-amber-500/20 space-y-1">
                    <span className="text-[11px] font-semibold text-muted-foreground block uppercase">Student Name</span>
                    <p className="text-sm font-bold text-foreground">{result.student?.name}</p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-card/80 border border-amber-500/20 space-y-1">
                    <span className="text-[11px] font-semibold text-muted-foreground block uppercase">Roll Number</span>
                    <p className="text-sm font-bold font-mono text-primary">{result.student?.studentCode}</p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-card/80 border border-amber-500/20 space-y-1">
                    <span className="text-[11px] font-semibold text-muted-foreground block uppercase">Department / Section</span>
                    <p className="text-sm font-bold text-foreground">{result.student?.department} • {result.student?.yearSection}</p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-card/80 border border-amber-500/20 space-y-1">
                    <span className="text-[11px] font-semibold text-muted-foreground block uppercase">Reason for Leaving</span>
                    <p className="text-sm font-bold text-foreground">{result.pass?.reason}</p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-card/80 border border-amber-500/20 space-y-1">
                    <span className="text-[11px] font-semibold text-muted-foreground block uppercase">Pass Validity Window</span>
                    <p className="text-sm font-bold text-amber-700 dark:text-amber-300">
                      {result.pass?.validFrom} – {result.pass?.validUntil}
                    </p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-card/80 border border-amber-500/20 space-y-1">
                    <span className="text-[11px] font-semibold text-muted-foreground block uppercase">Server Current Time</span>
                    <p className="text-sm font-bold text-foreground">{result.serverCurrentTime || new Date().toLocaleTimeString()}</p>
                  </div>
                </div>
              </div>
            ) : result.timeState === "EARLY_EXIT_AUTHORIZED" ? (
              /* CASE D: EARLY EXIT ALREADY AUTHORIZED */
              <div className="card-surface p-6 sm:p-8 rounded-2xl border-2 border-emerald-500 bg-emerald-500/10 dark:bg-emerald-950/40 shadow-lg space-y-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-emerald-500/30 pb-4">
                  <div className="flex items-center gap-3">
                    <span className="grid size-12 place-items-center rounded-2xl bg-emerald-500 text-white font-bold shadow-md">
                      <CheckCircle2 className="size-7" />
                    </span>
                    <div>
                      <span className="inline-block px-3 py-1 rounded-full bg-emerald-600 text-white font-black text-xs tracking-wider uppercase shadow-xs">
                        ✅ EARLY EXIT AUTHORIZED
                      </span>
                      <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 mt-1">
                        {result.message}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleRefresh}
                      disabled={loading}
                      className="rounded-xl text-xs font-semibold border-emerald-500/40 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-500/20"
                      title="Re-query live server status"
                    >
                      <RotateCcw className={`size-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} /> Refresh Status
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleReset}
                      className="rounded-xl text-xs font-semibold border-emerald-500/40 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-500/20"
                      title="Clear and scan next student"
                    >
                      <span>Next Student</span> <ArrowRight className="size-3.5 ml-1.5" />
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                  <div className="p-3.5 rounded-xl bg-card/80 border border-emerald-500/20 space-y-1">
                    <span className="text-[11px] font-semibold text-muted-foreground block uppercase">Student Name</span>
                    <p className="text-sm font-bold text-foreground">{result.student?.name}</p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-card/80 border border-emerald-500/20 space-y-1">
                    <span className="text-[11px] font-semibold text-muted-foreground block uppercase">Roll Number</span>
                    <p className="text-sm font-bold font-mono text-primary">{result.student?.studentCode}</p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-card/80 border border-emerald-500/20 space-y-1">
                    <span className="text-[11px] font-semibold text-muted-foreground block uppercase">Authorized By Officer</span>
                    <p className="text-sm font-bold text-foreground">{result.earlyExitDetails?.earlyExitBy || result.pass?.earlyExitBy || "Security Officer"}</p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-card/80 border border-emerald-500/20 space-y-1">
                    <span className="text-[11px] font-semibold text-muted-foreground block uppercase">Scheduled Start</span>
                    <p className="text-sm font-bold text-foreground">{result.pass?.validFrom}</p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-card/80 border border-emerald-500/20 space-y-1">
                    <span className="text-[11px] font-semibold text-muted-foreground block uppercase">Scheduled End</span>
                    <p className="text-sm font-bold text-foreground">{result.pass?.validUntil}</p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-card/80 border border-emerald-500/20 space-y-1">
                    <span className="text-[11px] font-semibold text-muted-foreground block uppercase">Gate Checkpoint</span>
                    <p className="text-sm font-bold text-foreground">{result.checkpoint || checkpoint}</p>
                  </div>
                </div>
              </div>
            ) : result.authorized ? (
              /* CASE B: ACTIVE / AUTHORIZED (GREEN CARD) */
              <div
                className={`card-surface p-6 sm:p-8 rounded-2xl border-2 shadow-lg space-y-6 ${
                  result.verificationType === "ENTRY"
                    ? "border-cyan-500 bg-cyan-500/10 dark:bg-cyan-950/40"
                    : "border-emerald-500 bg-emerald-500/10 dark:bg-emerald-950/40"
                }`}
              >
                <div
                  className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-4 ${
                    result.verificationType === "ENTRY"
                      ? "border-cyan-500/30"
                      : "border-emerald-500/30"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`grid size-12 place-items-center rounded-2xl text-white font-bold shadow-md ${
                        result.verificationType === "ENTRY" ? "bg-cyan-600" : "bg-emerald-500"
                      }`}
                    >
                      <CheckCircle2 className="size-7" />
                    </span>
                    <div>
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-white font-black text-xs tracking-wider uppercase shadow-xs ${
                          result.verificationType === "ENTRY" ? "bg-cyan-600" : "bg-emerald-500"
                        }`}
                      >
                        🟢 {result.resultStatus || (result.verificationType === "ENTRY" ? "ENTRY VERIFIED" : "AUTHORIZED")}
                      </span>
                      <p
                        className={`text-xs font-semibold mt-1 ${
                          result.verificationType === "ENTRY"
                            ? "text-cyan-800 dark:text-cyan-300"
                            : "text-emerald-800 dark:text-emerald-300"
                        }`}
                      >
                        {result.message}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleRefresh}
                      disabled={loading}
                      className={`rounded-xl text-xs font-semibold ${
                        result.verificationType === "ENTRY"
                          ? "border-cyan-500/40 text-cyan-800 dark:text-cyan-200 hover:bg-cyan-500/20"
                          : "border-emerald-500/40 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-500/20"
                      }`}
                      title="Re-query live server status"
                    >
                      <RotateCcw className={`size-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} /> Refresh Status
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleReset}
                      className={`rounded-xl text-xs font-semibold ${
                        result.verificationType === "ENTRY"
                          ? "border-cyan-500/40 text-cyan-800 dark:text-cyan-200 hover:bg-cyan-500/20"
                          : "border-emerald-500/40 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-500/20"
                      }`}
                      title="Clear and scan next student"
                    >
                      <span>Next Student</span> <ArrowRight className="size-3.5 ml-1.5" />
                    </Button>
                  </div>
                </div>

                {/* Details Table Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                  <div className="p-3.5 rounded-xl bg-card/80 border border-emerald-500/20 space-y-1">
                    <span className="text-[11px] font-semibold text-muted-foreground block uppercase">
                      Student Name
                    </span>
                    <p className="text-sm font-bold text-foreground">{result.student?.name}</p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-card/80 border border-emerald-500/20 space-y-1">
                    <span className="text-[11px] font-semibold text-muted-foreground block uppercase">
                      Roll Number
                    </span>
                    <p className="text-sm font-bold font-mono text-primary">{result.student?.studentCode}</p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-card/80 border border-emerald-500/20 space-y-1">
                    <span className="text-[11px] font-semibold text-muted-foreground block uppercase">
                      Department
                    </span>
                    <p className="text-sm font-bold text-foreground">{result.student?.department}</p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-card/80 border border-emerald-500/20 space-y-1">
                    <span className="text-[11px] font-semibold text-muted-foreground block uppercase">
                      Reason for Leaving
                    </span>
                    <p className="text-sm font-bold text-foreground">{result.pass?.reason}</p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-card/80 border border-emerald-500/20 space-y-1">
                    <span className="text-[11px] font-semibold text-muted-foreground block uppercase">
                      Valid Window
                    </span>
                    <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
                      {result.pass?.validFrom} – {result.pass?.validUntil}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-card/80 border border-emerald-500/20 space-y-1">
                    <span className="text-[11px] font-semibold text-muted-foreground block uppercase">
                      Approved By
                    </span>
                    <p className="text-sm font-bold text-foreground">{result.pass?.issuedBy}</p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-card/80 border border-emerald-500/20 space-y-1 sm:col-span-2 lg:col-span-3 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-semibold text-muted-foreground block uppercase">
                        Verified Checkpoint & Pass ID
                      </span>
                      <p className="text-xs font-mono font-bold text-foreground">
                        {result.checkpoint} &bull; {result.pass?.passCode}
                      </p>
                    </div>
                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-md bg-emerald-600 text-white uppercase">
                      {result.verificationType || "EXIT"} RECORDED
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              /* CASE C: EXPIRED / DENIED (RED CARD) */
              <div className="card-surface p-6 sm:p-8 rounded-2xl border-2 border-rose-500 bg-rose-500/10 dark:bg-rose-950/40 shadow-lg space-y-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-rose-500/30 pb-4">
                  <div className="flex items-center gap-3">
                    <span className="grid size-12 place-items-center rounded-2xl bg-rose-500 text-white font-bold shadow-md">
                      <XCircle className="size-7" />
                    </span>
                    <div>
                      <span className="inline-block px-3 py-1 rounded-full bg-rose-500 text-white font-black text-xs tracking-wider uppercase shadow-xs">
                        🔴 {result.resultStatus || "EXIT NOT AUTHORIZED"}
                      </span>
                      <p className="text-xs font-semibold text-rose-800 dark:text-rose-300 mt-1">
                        {result.message}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleRefresh}
                      disabled={loading}
                      className="rounded-xl text-xs font-semibold border-rose-500/40 text-rose-800 dark:text-rose-200 hover:bg-rose-500/20"
                      title="Re-query live server status"
                    >
                      <RotateCcw className={`size-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} /> Re-Check
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleReset}
                      className="rounded-xl text-xs font-semibold border-rose-500/40 text-rose-800 dark:text-rose-200 hover:bg-rose-500/20"
                      title="Clear and scan next student"
                    >
                      <span>Next Student</span> <ArrowRight className="size-3.5 ml-1.5" />
                    </Button>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-card/90 border border-rose-500/30 space-y-2 text-xs">
                  <div className="flex items-center gap-2 text-rose-700 dark:text-rose-300 font-bold text-sm">
                    <XCircle className="size-4 shrink-0" />
                    <span>Reason for Denial:</span>
                  </div>
                  <p className="text-sm font-semibold text-foreground pl-6">
                    {result.failureReason || "Pass not found or invalid."}
                  </p>
                  {result.pass && (
                    <p className="text-[11px] text-muted-foreground pl-6 pt-1">
                      Scheduled Window: <strong className="text-foreground">{result.pass.validFrom} – {result.pass.validUntil}</strong>
                    </p>
                  )}
                  <p className="text-[11px] text-muted-foreground pl-6 pt-1">
                    Checkpoint: <strong className="text-foreground">{checkpoint}</strong> &bull; Verification Logged Server-Side.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* QR Scanner Modal */}
        <QRScannerModal
          open={cameraOpen}
          onClose={() => setCameraOpen(false)}
          onScan={(scannedToken) => {
            setPassInput(scannedToken);
            handleVerify(undefined, scannedToken);
          }}
          title="Scan Student ID QR (Security Gate Check)"
          loading={loading}
        />
      </div>
    </RoleGuard>
  );
}
