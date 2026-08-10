import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

type Ctx = {
  theme: "light" | "dark";
  setTheme: (t: "light" | "dark") => void;
};

const CmadmsContext = createContext<Ctx | null>(null);

export function CmadmsProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<"light" | "dark">("light");

  useEffect(() => {
    const stored = window.localStorage.getItem("cmadms-theme");
    if (stored === "dark" || stored === "light") setThemeState(stored);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  const setTheme = useCallback((t: "light" | "dark") => {
    setThemeState(t);
    window.localStorage.setItem("cmadms-theme", t);
  }, []);

  const value = useMemo<Ctx>(() => ({ theme, setTheme }), [theme, setTheme]);

  return <CmadmsContext.Provider value={value}>{children}</CmadmsContext.Provider>;
}

export function useCmadms() {
  const ctx = useContext(CmadmsContext);
  if (!ctx) throw new Error("useCmadms must be used inside CmadmsProvider");
  return ctx;
}
