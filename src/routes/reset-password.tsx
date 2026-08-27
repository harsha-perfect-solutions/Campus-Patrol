import { useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { ShieldCheck, Mail, KeyRound, Lock, ArrowLeft, ArrowRight, CheckCircle2, AlertTriangle, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import {
  requestPasswordResetOtpApi,
  verifyPasswordResetOtpApi,
  resetPasswordWithOtpApi,
} from "@/lib/api/auth.server";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Forgot Password & OTP Recovery — CMADMS" },
      { name: "description", content: "Reset your CMADMS account password using OTP sent to your registered college email." },
    ],
  }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const navigate = useNavigate();

  // Workflow steps: 1 = Email, 2 = OTP, 3 = New Password
  const [step, setStep] = useState<1 | 2 | 3>(1);

  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  // Step 1: Request OTP
  async function handleRequestOtp(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);
    setInfoMessage(null);

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setErrorMessage("Please enter your registered college email address or roll number.");
      return;
    }

    setBusy(true);
    try {
      const res = await requestPasswordResetOtpApi({ data: { email: cleanEmail } });
      if (res.success) {
        setInfoMessage(res.message || "If an account exists, a 6-digit security OTP has been sent to your registered inbox.");
        setStep(2);
        toast.success("Security OTP sent to registered college email!");
      } else {
        setErrorMessage(res.message || "Failed to request OTP. Please try again.");
        toast.error(res.message || "Failed to request OTP");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Server connection error.");
      toast.error("Server connection error.");
    } finally {
      setBusy(false);
    }
  }

  // Step 2: Verify OTP
  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);

    const cleanOtp = otp.trim();
    if (!cleanOtp || cleanOtp.length !== 6) {
      setErrorMessage("Please enter the 6-digit numeric OTP code.");
      return;
    }

    setBusy(true);
    try {
      const res = await verifyPasswordResetOtpApi({ data: { email: email.trim(), otp: cleanOtp } });
      if (res.success) {
        toast.success("OTP verified successfully!");
        setStep(3);
      } else {
        const err = res.error || "Invalid or expired OTP code.";
        setErrorMessage(err);
        toast.error(err);
      }
    } catch (err: any) {
      setErrorMessage(err.message || "OTP verification error.");
      toast.error("OTP verification error.");
    } finally {
      setBusy(false);
    }
  }

  // Step 3: Reset Password
  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);

    if (!newPassword || newPassword.length < 8) {
      setErrorMessage("New password must be at least 8 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage("Password confirmation does not match.");
      return;
    }

    setBusy(true);
    try {
      const res = await resetPasswordWithOtpApi({
        data: {
          email: email.trim(),
          otp: otp.trim(),
          newPassword,
        },
      });

      if (res.success) {
        toast.success("Password reset successfully!", {
          description: "You can now sign in with your new password.",
        });
        navigate({ to: "/auth" as any });
      } else {
        const err = res.error || "Failed to reset password.";
        setErrorMessage(err);
        toast.error(err);
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to update password.");
      toast.error("Failed to update password.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-950 px-4 py-12 text-slate-100">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary border border-primary/20 shadow-lg">
            <KeyRound className="size-7 text-indigo-400" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Account Password Reset
          </h1>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            Secure 3-step password recovery via registered college email OTP verification.
          </p>
        </div>

        {/* Stepper Progress */}
        <div className="flex items-center justify-between px-6 py-2 rounded-xl border border-slate-800 bg-slate-900/60 text-xs">
          <span className={`font-semibold flex items-center gap-1 ${step >= 1 ? "text-indigo-400" : "text-slate-600"}`}>
            1. Email
          </span>
          <span className="text-slate-700">&gt;</span>
          <span className={`font-semibold flex items-center gap-1 ${step >= 2 ? "text-indigo-400" : "text-slate-600"}`}>
            2. OTP Code
          </span>
          <span className="text-slate-700">&gt;</span>
          <span className={`font-semibold flex items-center gap-1 ${step >= 3 ? "text-indigo-400" : "text-slate-600"}`}>
            3. New Password
          </span>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-6 shadow-2xl backdrop-blur-xl">
          {errorMessage && (
            <div className="mb-4 flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3.5 text-xs text-red-300">
              <AlertTriangle className="size-4 shrink-0 text-red-400 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {infoMessage && (
            <div className="mb-4 flex items-start gap-3 rounded-xl border border-indigo-500/30 bg-indigo-500/10 p-3.5 text-xs text-indigo-300">
              <CheckCircle2 className="size-4 shrink-0 text-indigo-400 mt-0.5" />
              <span>{infoMessage}</span>
            </div>
          )}

          {/* STEP 1: Enter Email */}
          {step === 1 && (
            <form onSubmit={handleRequestOtp} className="space-y-4">
              <div>
                <Label htmlFor="req-email" className="text-xs font-semibold text-slate-300">
                  Registered College Email / Roll Number
                </Label>
                <div className="relative mt-1.5">
                  <Input
                    id="req-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. 23CSE1012@college.edu.in"
                    className="h-11 rounded-xl bg-slate-950 border-slate-800 text-xs text-slate-100 placeholder:text-slate-600 focus:border-indigo-500"
                  />
                  <Mail className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-slate-600" />
                </div>
                <p className="mt-1 text-[11px] text-slate-500">
                  For students, enter your official college email (<code className="text-indigo-300">23CSE1012@college.edu.in</code>).
                </p>
              </div>

              <Button
                type="submit"
                disabled={busy}
                className="w-full h-11 rounded-xl bg-indigo-600 font-bold text-white hover:bg-indigo-500 shadow-lg mt-2"
              >
                {busy ? "Sending Security OTP..." : "Send Verification OTP"}
                {!busy && <ArrowRight className="size-4 ml-1.5" />}
              </Button>
            </form>
          )}

          {/* STEP 2: Enter OTP */}
          {step === 2 && (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div>
                <Label htmlFor="otp-input" className="text-xs font-semibold text-slate-300">
                  Enter 6-Digit Verification OTP
                </Label>
                <Input
                  id="otp-input"
                  type="text"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  placeholder="e.g. 849201"
                  className="mt-1.5 h-12 text-center font-mono text-lg tracking-widest rounded-xl bg-slate-950 border-slate-800 text-indigo-400 placeholder:text-slate-700 focus:border-indigo-500"
                />
                <p className="mt-1.5 text-[11px] text-slate-400 text-center">
                  Sent to <strong className="text-slate-200">{email}</strong>. Code valid for 10 minutes.
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(1)}
                  className="flex-1 h-11 rounded-xl border-slate-800 text-xs font-semibold text-slate-300 hover:bg-slate-800"
                >
                  <ArrowLeft className="size-3.5 mr-1" /> Change Email
                </Button>
                <Button
                  type="submit"
                  disabled={busy || otp.length !== 6}
                  className="flex-1 h-11 rounded-xl bg-indigo-600 font-bold text-white hover:bg-indigo-500"
                >
                  {busy ? "Verifying..." : "Verify OTP Code"}
                </Button>
              </div>
            </form>
          )}

          {/* STEP 3: Enter New Password */}
          {step === 3 && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <Label className="text-xs font-semibold text-slate-300">New Password</Label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password (min 8 chars)"
                  className="mt-1.5 h-11 rounded-xl bg-slate-950 border-slate-800 text-xs text-slate-100 placeholder:text-slate-600 focus:border-indigo-500"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-300">Confirm New Password</Label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className="mt-1.5 h-11 rounded-xl bg-slate-950 border-slate-800 text-xs text-slate-100 placeholder:text-slate-600 focus:border-indigo-500"
                />
              </div>

              <Button
                type="submit"
                disabled={busy}
                className="w-full h-11 rounded-xl bg-emerald-600 font-bold text-white hover:bg-emerald-500 shadow-lg mt-2"
              >
                {busy ? "Resetting Password..." : "Update Password & Return to Login"}
              </Button>
            </form>
          )}

          <div className="mt-6 border-t border-slate-800 pt-4 text-center">
            <Link
              to="/auth"
              className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="size-3.5" /> Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
