import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "faculty" | "student" | "hod" | "admin";

export type Profile = {
  id: string;
  full_name: string;
  email: string;
  department: string;
  staff_code: string | null;
  student_code: string | null;
  avatar_url: string | null;
};

type AuthCtx = {
  loading: boolean;
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  role: AppRole | null;
  isStaff: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (uid: string | undefined) => {
    if (!uid) {
      setProfile(null);
      setRole(null);
      return;
    }
    const [{ data: p }, { data: r }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", uid).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", uid),
    ]);
    setProfile((p as Profile) ?? null);
    const roles = (r ?? []).map((x) => x.role as AppRole);
    setRole(
      roles.includes("admin")
        ? "admin"
        : roles.includes("hod")
          ? "hod"
          : roles.includes("faculty")
            ? "faculty"
            : (roles[0] ?? null),
    );
  }, []);

  useEffect(() => {
    let active = true;

    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      if (!active) return;
      setSession(s);
      void load(s?.user.id).then(() => setLoading(false));
    });

    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      void load(data.session?.user.id).then(() => setLoading(false));
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [load]);

  const value = useMemo<AuthCtx>(
    () => ({
      loading,
      session,
      user: session?.user ?? null,
      profile,
      role,
      isStaff: role === "faculty" || role === "hod" || role === "admin",
      refresh: () => load(session?.user.id),
      signOut: async () => {
        await supabase.auth.signOut();
      },
    }),
    [loading, session, profile, role, load],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
