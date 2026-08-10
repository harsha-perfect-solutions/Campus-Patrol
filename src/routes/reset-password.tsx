import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Reset password — CMADMS" },
      { name: "description", content: "Choose a new password for your CMADMS account." },
      { property: "og:title", content: "Reset password — CMADMS" },
      { property: "og:description", content: "Set a new CMADMS account password." },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Password updated");
    void navigate({ to: "/dashboard" });
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-5">
      <form onSubmit={submit} className="card-surface w-full max-w-md space-y-4 p-8">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Set a new password</h1>
        <p className="text-sm text-muted-foreground">
          Enter a new password for your CMADMS account.
        </p>
        <div className="space-y-1.5">
          <Label htmlFor="pw">New password</Label>
          <Input
            id="pw"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <Button type="submit" className="w-full" disabled={busy}>
          Update password
        </Button>
      </form>
    </main>
  );
}
