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

export type DemoUser = {
  id: string;
  email: string;
  full_name: string;
  role: AppRole;
  department: string;
  staff_code?: string | null;
  student_code?: string | null;
};

type AuthCtx = {
  loading: boolean;
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  role: AppRole | null;
  isStaff: boolean;
  setDemoUser: (u: DemoUser | null) => void;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

const DEMO_STORAGE_KEY = "cmadms-demo-user";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [demoUser, setDemoUserState] = useState<DemoUser | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(DEMO_STORAGE_KEY);
      if (stored) {
        setDemoUserState(JSON.parse(stored));
      }
    } catch {
      // Ignore JSON parse errors
    }
  }, []);

  const setDemoUser = useCallback((u: DemoUser | null) => {
    setDemoUserState(u);
    if (u) {
      localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(u));
    } else {
      localStorage.removeItem(DEMO_STORAGE_KEY);
    }
  }, []);

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

  const effectiveUser: User | null = useMemo(() => {
    if (session?.user) return session.user;
    if (demoUser) {
      return {
        id: demoUser.id,
        email: demoUser.email,
        app_metadata: {},
        user_metadata: {},
        aud: "authenticated",
        created_at: new Date().toISOString(),
      } as unknown as User;
    }
    return null;
  }, [session, demoUser]);

  const effectiveSession: Session | null = useMemo(() => {
    if (session) return session;
    if (demoUser && effectiveUser) {
      return {
        access_token: "demo-access-token",
        token_type: "bearer",
        expires_in: 3600,
        refresh_token: "demo-refresh-token",
        user: effectiveUser,
      } as unknown as Session;
    }
    return null;
  }, [session, demoUser, effectiveUser]);

  const effectiveProfile: Profile | null = useMemo(() => {
    if (profile) return profile;
    if (demoUser) {
      return {
        id: demoUser.id,
        full_name: demoUser.full_name,
        email: demoUser.email,
        department: demoUser.department,
        staff_code: demoUser.staff_code ?? null,
        student_code: demoUser.student_code ?? null,
        avatar_url: null,
      };
    }
    return null;
  }, [profile, demoUser]);

  const effectiveRole: AppRole | null = useMemo(() => {
    if (role) return role;
    if (demoUser) return demoUser.role;
    return null;
  }, [role, demoUser]);

  const value = useMemo<AuthCtx>(
    () => ({
      loading,
      session: effectiveSession,
      user: effectiveUser,
      profile: effectiveProfile,
      role: effectiveRole,
      isStaff: effectiveRole === "faculty" || effectiveRole === "hod" || effectiveRole === "admin",
      setDemoUser,
      refresh: () => load(session?.user.id),
      signOut: async () => {
        setDemoUser(null);
        await supabase.auth.signOut();
      },
    }),
    [loading, effectiveSession, effectiveUser, effectiveProfile, effectiveRole, setDemoUser, load, session],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
