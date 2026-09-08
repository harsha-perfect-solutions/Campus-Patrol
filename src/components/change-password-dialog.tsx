import React, { useState, useEffect } from "react";
import { Eye, EyeOff, KeyRound, ArrowLeft, Mail, ShieldCheck, CheckCircle2, Loader2, RefreshCcw } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";
import {
  changePasswordUserApi,
  requestPasswordResetOtpApi,
  verifyPasswordResetOtpApi,
  resetPasswordWithOtpApi,
} from "@/lib/api/auth.server";
import { PasswordStrengthMeter } from "./password-strength";

interface ChangePasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type DialogMode = "change" | "forgot_email" | "forgot_otp" | "forgot_new_password" | "forgot_success";

export function ChangePasswordDialog({ open, onOpenChange }: ChangePasswordDialogProps) {
  const { user } = useAuth();

  const [mode, setMode] = useState<DialogMode>("change");

  // Normal change password fields
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Forgot password OTP fields
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");

  // Visibility toggles
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [resendingOtp, setResendingOtp] = useState(false);

  // Initialize email from logged-in user session if available
  useEffect(() => {
    if (user?.email) {
      setEmail(user.email);
    }
  }, [user]);

  const resetForm = () => {
    setMode("change");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setOtp("");
    setShowCurrent(false);
    setShowNew(false);
    setShowConfirm(false);
    setErrorMsg(null);
    setBusy(false);
    setResendingOtp(false);
  };

  const handleClose = (newOpenState: boolean) => {
    if (!newOpenState) {
      resetForm();
    }
    onOpenChange(newOpenState);
  };

  // 1. Normal Change Password Submit
  const handleNormalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!currentPassword) {
      setErrorMsg("Please enter your current password.");
      return;
    }
    if (!newPassword || newPassword.length < 8) {
      setErrorMsg("New password must be at least 8 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg("New password and confirmation do not match.");
      return;
    }
    if (currentPassword === newPassword) {
      setErrorMsg("New password must be different from current password.");
      return;
    }

    setBusy(true);
    try {
      const res = await changePasswordUserApi({
        data: {
          currentPassword,
          newPassword,
          confirmPassword,
        },
      });

      if (res.success) {
        toast.success("Password changed successfully!");
        handleClose(false);
      } else {
        const err = res.error || "Failed to update password. Please check your credentials.";
        setErrorMsg(err);
        toast.error(err);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Password update failed.");
      toast.error("Password update failed.");
    } finally {
      setBusy(false);
    }
  };

  // 2. Request OTP Submit
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setErrorMsg("Please enter your registered college email.");
      return;
    }

    setBusy(true);
    try {
      const res = await requestPasswordResetOtpApi({ data: { email: cleanEmail } });
      if (res.success) {
        toast.success("Verification OTP code sent to your email!");
        setMode("forgot_otp");
      } else {
        setErrorMsg(res.message || "Failed to send OTP code.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Error requesting OTP.");
    } finally {
      setBusy(false);
    }
  };

  // Resend OTP handler
  const handleResendOtp = async () => {
    setErrorMsg(null);
    setResendingOtp(true);
    try {
      const res = await requestPasswordResetOtpApi({ data: { email: email.trim().toLowerCase() } });
      if (res.success) {
        toast.success("New OTP code sent to your email!");
      } else {
        toast.error(res.message || "Failed to resend OTP.");
      }
    } catch {
      toast.error("Failed to resend OTP.");
    } finally {
      setResendingOtp(false);
    }
  };

  // 3. Verify OTP Submit
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanOtp = otp.trim();
    if (!cleanOtp || cleanOtp.length !== 6) {
      setErrorMsg("Please enter the complete 6-digit OTP code.");
      return;
    }

    setBusy(true);
    try {
      const res = await verifyPasswordResetOtpApi({
        data: { email: email.trim().toLowerCase(), otp: cleanOtp },
      });

      if (res.success) {
        toast.success("OTP verified successfully!");
        setMode("forgot_new_password");
      } else {
        setErrorMsg(res.error || "Invalid OTP code. Please try again.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to verify OTP.");
    } finally {
      setBusy(false);
    }
  };

  // 4. Reset Password with OTP Submit
  const handleResetPasswordWithOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!newPassword || newPassword.length < 8) {
      setErrorMsg("New password must be at least 8 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg("New password and confirmation do not match.");
      return;
    }

    setBusy(true);
    try {
      const res = await resetPasswordWithOtpApi({
        data: {
          email: email.trim().toLowerCase(),
          otp: otp.trim(),
          newPassword,
        },
      });

      if (res.success) {
        toast.success("Password reset successfully!");
        setMode("forgot_success");
      } else {
        setErrorMsg(res.error || "Failed to reset password.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Error resetting password.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 shadow-2xl p-6 sm:rounded-2xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 shrink-0">
              {mode === "forgot_success" ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              ) : mode === "change" ? (
                <KeyRound className="h-5 w-5" />
              ) : (
                <Mail className="h-5 w-5" />
              )}
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {mode === "change" && "Change Password"}
                {mode === "forgot_email" && "Forgot Password"}
                {mode === "forgot_otp" && "Verify Email OTP"}
                {mode === "forgot_new_password" && "Create New Password"}
                {mode === "forgot_success" && "Password Reset Complete"}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
                {mode === "change" && "Update your account password securely."}
                {mode === "forgot_email" && "Enter your registered college email to receive a 6-digit OTP."}
                {mode === "forgot_otp" && "Enter the 6-digit verification code sent to your email."}
                {mode === "forgot_new_password" && "Set a new secure password for your CMADMS account."}
                {mode === "forgot_success" && "Your password has been successfully updated."}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Global Error Banner */}
        {errorMsg && (
          <div className="mt-3 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-medium">
            {errorMsg}
          </div>
        )}

        {/* MODE 1: NORMAL CHANGE PASSWORD */}
        {mode === "change" && (
          <form onSubmit={handleNormalSubmit} className="space-y-4 mt-2">
            {/* Current Password */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Current Password</Label>
              <div className="relative">
                <Input
                  type={showCurrent ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  className="bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100 pr-10 focus:border-cyan-500"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {/* FORGOT PASSWORD LINK DIRECTLY BELOW CURRENT PASSWORD */}
              <div className="flex justify-end pt-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setErrorMsg(null);
                    setMode("forgot_email");
                  }}
                  className="text-xs font-semibold text-cyan-600 dark:text-cyan-400 hover:underline"
                >
                  Forgot Password?
                </button>
              </div>
            </div>

            {/* New Password */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">New Password</Label>
              <div className="relative">
                <Input
                  type={showNew ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100 pr-10 focus:border-cyan-500"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <PasswordStrengthMeter password={newPassword} />
            </div>

            {/* Confirm New Password */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Confirm New Password</Label>
              <div className="relative">
                <Input
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className="bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100 pr-10 focus:border-cyan-500"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleClose(false)}
                className="border-slate-300 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={busy}
                className="bg-cyan-600 hover:bg-cyan-500 text-white font-semibold shadow-lg shadow-cyan-600/20"
              >
                {busy ? "Updating Password..." : "Change Password"}
              </Button>
            </div>
          </form>
        )}

        {/* MODE 2: FORGOT PASSWORD - ENTER EMAIL */}
        {mode === "forgot_email" && (
          <form onSubmit={handleRequestOtp} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Registered College Email</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. faculty@cmadms.edu"
                className="bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:border-cyan-500"
                required
              />
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setErrorMsg(null);
                  setMode("change");
                }}
                className="text-xs font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 flex items-center gap-1"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Back to Change Password
              </button>

              <Button
                type="submit"
                disabled={busy}
                className="bg-cyan-600 hover:bg-cyan-500 text-white font-semibold shadow-lg shadow-cyan-600/20"
              >
                {busy ? "Sending OTP..." : "Send OTP"}
              </Button>
            </div>
          </form>
        )}

        {/* MODE 3: FORGOT PASSWORD - VERIFY OTP */}
        {mode === "forgot_otp" && (
          <form onSubmit={handleVerifyOtp} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">6-Digit Verification Code (OTP)</Label>
              <Input
                type="text"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ""))}
                placeholder="123456"
                className="font-mono text-center tracking-[0.5em] text-lg font-bold bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:border-cyan-500"
                required
              />
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Code sent to <span className="font-semibold text-slate-700 dark:text-slate-200">{email}</span>. Valid for 10 minutes.
              </p>
            </div>

            <div className="flex justify-between items-center pt-2">
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={resendingOtp}
                className="text-xs font-semibold text-cyan-600 dark:text-cyan-400 hover:underline flex items-center gap-1"
              >
                <RefreshCcw className={`h-3 w-3 ${resendingOtp ? "animate-spin" : ""}`} />
                {resendingOtp ? "Sending..." : "Resend OTP"}
              </button>
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setErrorMsg(null);
                  setMode("forgot_email");
                }}
                className="text-xs font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 flex items-center gap-1"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Back
              </button>

              <Button
                type="submit"
                disabled={busy}
                className="bg-cyan-600 hover:bg-cyan-500 text-white font-semibold shadow-lg shadow-cyan-600/20"
              >
                {busy ? "Verifying..." : "Verify OTP"}
              </Button>
            </div>
          </form>
        )}

        {/* MODE 4: FORGOT PASSWORD - CREATE NEW PASSWORD */}
        {mode === "forgot_new_password" && (
          <form onSubmit={handleResetPasswordWithOtp} className="space-y-4 mt-2">
            {/* New Password */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">New Password</Label>
              <div className="relative">
                <Input
                  type={showNew ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100 pr-10 focus:border-cyan-500"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <PasswordStrengthMeter password={newPassword} />
            </div>

            {/* Confirm New Password */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Confirm New Password</Label>
              <div className="relative">
                <Input
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className="bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100 pr-10 focus:border-cyan-500"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
              <Button
                type="submit"
                disabled={busy}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-lg shadow-emerald-600/20"
              >
                {busy ? "Resetting Password..." : "Reset Password"}
              </Button>
            </div>
          </form>
        )}

        {/* MODE 5: FORGOT PASSWORD SUCCESS */}
        {mode === "forgot_success" && (
          <div className="space-y-4 text-center py-3">
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-medium leading-relaxed">
              Your CMADMS password has been updated successfully. You can now use your new password.
            </div>

            <Button
              type="button"
              onClick={() => handleClose(false)}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
            >
              Done / Close
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
