import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  seedNotifications,
  seedReports,
  type Notification,
  type Report,
} from "@/lib/cmadms-data";

type Ctx = {
  reports: Report[];
  addReport: (report: Report) => void;
  notifications: Notification[];
  unreadCount: number;
  markRead: (id: string) => void;
  markAllRead: () => void;
  clearNotifications: () => void;
  theme: "light" | "dark";
  setTheme: (t: "light" | "dark") => void;
};

const CmadmsContext = createContext<Ctx | null>(null);

export function CmadmsProvider({ children }: { children: ReactNode }) {
  const [reports, setReports] = useState<Report[]>(seedReports);
  const [notifications, setNotifications] = useState<Notification[]>(seedNotifications);
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

  const addReport = useCallback((report: Report) => {
    setReports((prev) => [report, ...prev]);
    setNotifications((prev) => [
      {
        id: `N-${report.id}`,
        title: `Violation ${report.id} submitted`,
        detail: `${report.studentName} • ${report.className}`,
        time: "Just now",
        tone: "violation",
        read: false,
      },
      ...prev,
    ]);
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      reports,
      addReport,
      notifications,
      unreadCount: notifications.filter((n) => !n.read).length,
      markRead: (id) =>
        setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n))),
      markAllRead: () => setNotifications((prev) => prev.map((n) => ({ ...n, read: true }))),
      clearNotifications: () => setNotifications([]),
      theme,
      setTheme,
    }),
    [reports, addReport, notifications, theme, setTheme],
  );

  return <CmadmsContext.Provider value={value}>{children}</CmadmsContext.Provider>;
}

export function useCmadms() {
  const ctx = useContext(CmadmsContext);
  if (!ctx) throw new Error("useCmadms must be used inside CmadmsProvider");
  return ctx;
}
