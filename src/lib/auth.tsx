import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { signInApi, getSelfProfileApi, signOutApi } from "@/lib/api/auth.server";
import type { ServerSession, AppRole } from "@/lib/session.server";

export type { AppRole };

export type UserProfile = {
  id: string;
  email: string;
  full_name: string;
  role: AppRole;
  department: string;
  staff_code: string | null;
  student_code: string | null;
  avatar_url: string | null;
};

type AuthCtx = {
  loading: boolean;
  session: { user: UserProfile } | null;
  user: UserProfile | null;
  profile: UserProfile | null;
  role: AppRole | null;
  isStaff: boolean;
  signIn: (
    email: string,
    pass?: string,
  ) => Promise<{ success: boolean; role?: AppRole; error?: string }>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [sessionData, setSessionData] = useState<ServerSession | null>(null);
  const [loading, setLoading] = useState(true);

  // Initialize session by querying server (browser sends HttpOnly cookie automatically)
  useEffect(() => {
    let active = true;
    async function initAuth() {
      try {
        const res = await getSelfProfileApi();
        if (active && res.success && res.session) {
          setSessionData(res.session);
        } else if (active) {
          setSessionData(null);
        }
      } catch (err) {
        console.error("Auth init error:", err);
      } finally {
        if (active) setLoading(false);
      }
    }
    initAuth();
    return () => {
      active = false;
    };
  }, []);

  const signIn = useCallback(async (email: string, password?: string) => {
    setLoading(true);
    try {
      const res = await signInApi({
        data: {
          email,
          ...(password ? { password } : {}),
        },
      });
      if (res.success && res.user) {
        setSessionData({
          sessionId: "HTTPONLY",
          userId: res.user.id,
          role: res.user.role,
          email: res.user.email,
          department: res.user.department,
          staffCode: res.user.staffCode,
          studentCode: res.user.studentCode,
          fullName: res.user.fullName,
          expiresAt: new Date(Date.now() + 86400000).toISOString(),
        });
        setLoading(false);
        return { success: true, role: res.user.role };
      }
      setLoading(false);
      return { success: false, error: res.error || "Invalid credentials." };
    } catch (err: any) {
      setLoading(false);
      console.error("SignIn failed:", err);
      return { success: false, error: "Authentication failed." };
    }
  }, []);

  const signOut = useCallback(async () => {
    setLoading(true);
    try {
      await signOutApi();
    } catch (err) {
      console.error("SignOut error:", err);
    } finally {
      setSessionData(null);
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    try {
      const res = await getSelfProfileApi();
      if (res.success && res.session) {
        setSessionData(res.session);
      }
    } catch (err) {
      console.error("Refresh auth error:", err);
    }
  }, []);

  const profile: UserProfile | null = useMemo(() => {
    if (!sessionData) return null;
    return {
      id: sessionData.userId,
      email: sessionData.email,
      full_name: sessionData.fullName,
      role: sessionData.role,
      department: sessionData.department,
      staff_code: sessionData.staffCode,
      student_code: sessionData.studentCode,
      avatar_url: null,
    };
  }, [sessionData]);

  const role: AppRole | null = sessionData?.role ?? null;
  const isStaff = role === "faculty" || role === "hod" || role === "admin";

  const value = useMemo<AuthCtx>(
    () => ({
      loading,
      session: profile ? { user: profile } : null,
      user: profile,
      profile,
      role,
      isStaff,
      signIn,
      signOut,
      refresh,
    }),
    [loading, profile, role, isStaff, signIn, signOut, refresh],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
