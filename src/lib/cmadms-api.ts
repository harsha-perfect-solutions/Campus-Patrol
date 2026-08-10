import { supabase } from "@/integrations/supabase/client";

export type ViolationStatus =
  | "reported"
  | "notified"
  | "awaiting_explanation"
  | "explanation_submitted"
  | "under_review"
  | "exonerated"
  | "warned"
  | "escalated";

export type Student = {
  student_code: string;
  name: string;
  department: string;
  year: string;
  section: string;
  semester: number;
  status: string;
  photo_url: string | null;
};

export type ClassSlot = {
  id: string;
  subject: string;
  code: string;
  department: string;
  year: string;
  section: string;
  room: string;
  faculty_name: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
};

export type MovementPermission = {
  id: string;
  student_code: string;
  reason_type: string;
  details: string | null;
  issued_by: string;
  on_date: string;
  valid_from: string;
  valid_until: string;
  status: "pending" | "approved" | "rejected";
};

export type Violation = {
  id: string;
  reference: string;
  student_code: string;
  student_name: string;
  department: string;
  year: string;
  section: string;
  semester: number;
  class_subject: string | null;
  class_time: string | null;
  room: string | null;
  location_found: string;
  remarks: string;
  evidence_url: string | null;
  reported_by: string;
  reported_by_name: string;
  status: ViolationStatus;
  decision: string | null;
  decided_at: string | null;
  explanation_deadline: string;
  incident_at: string;
  created_at: string;
};

export type Explanation = {
  id: string;
  violation_id: string;
  student_code: string;
  body: string;
  evidence_url: string | null;
  submitted_at: string;
};

export const PERMISSION_REASONS = [
  "Library",
  "Laboratory",
  "Medical",
  "HOD Official Duty",
  "Placement",
  "NSS",
  "NCC",
  "Sports",
  "Other",
];

export const LOCATIONS = [
  "Main Corridor — Block C",
  "Block B — Corridor",
  "Library",
  "Canteen",
  "Sports Ground",
  "Parking Area",
  "Administrative Block",
  "Hostel Gate",
];

export const STATUS_META: Record<
  ViolationStatus,
  { label: string; tone: "warning" | "info" | "danger" | "success" | "neutral" }
> = {
  reported: { label: "Reported", tone: "warning" },
  notified: { label: "Student Notified", tone: "info" },
  awaiting_explanation: { label: "Awaiting Explanation", tone: "warning" },
  explanation_submitted: { label: "Explanation Submitted", tone: "info" },
  under_review: { label: "Under Review", tone: "info" },
  exonerated: { label: "Exonerated", tone: "success" },
  warned: { label: "Warning Issued", tone: "success" },
  escalated: { label: "Escalated", tone: "danger" },
};

export const OPEN_STATUSES: ViolationStatus[] = [
  "reported",
  "notified",
  "awaiting_explanation",
  "explanation_submitted",
  "under_review",
];

export const CONFIRMED_STATUSES: ViolationStatus[] = ["warned", "escalated"];

/* ---------------- time helpers ---------------- */

export function toMinutes(t: string) {
  const [h = "0", m = "0"] = t.split(":");
  return Number(h) * 60 + Number(m);
}

export function fmtTime(t: string) {
  const [h = "0", m = "00"] = t.split(":");
  const hour = Number(h);
  const suffix = hour >= 12 ? "PM" : "AM";
  const display = hour % 12 === 0 ? 12 : hour % 12;
  return `${String(display).padStart(2, "0")}:${m} ${suffix}`;
}

export function nowMinutes(d = new Date()) {
  return d.getHours() * 60 + d.getMinutes();
}

export function currentSlot(slots: ClassSlot[], at = new Date()) {
  const day = at.getDay();
  const mins = nowMinutes(at);
  return (
    slots.find(
      (s) =>
        s.day_of_week === day &&
        mins >= toMinutes(s.start_time) &&
        mins < toMinutes(s.end_time),
    ) ?? null
  );
}

export function permissionIsValid(p: MovementPermission | null | undefined, at = new Date()) {
  if (!p) return false;
  if (p.status !== "approved") return false;
  const today = new Date(at.getTime() - at.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);
  if (p.on_date !== today) return false;
  const mins = nowMinutes(at);
  return mins >= toMinutes(p.valid_from) && mins <= toMinutes(p.valid_until);
}

/* ---------------- queries ---------------- */

export async function fetchStudent(code: string) {
  const { data, error } = await supabase
    .from("students")
    .select("*")
    .eq("student_code", code)
    .maybeSingle();
  if (error) throw error;
  return (data as Student) ?? null;
}

export async function fetchSlotsFor(student: Student) {
  const { data, error } = await supabase
    .from("class_slots")
    .select("*")
    .eq("department", student.department)
    .eq("year", student.year)
    .eq("section", student.section)
    .order("start_time");
  if (error) throw error;
  return (data ?? []) as ClassSlot[];
}

export async function fetchFacultySlots(facultyName: string) {
  const { data, error } = await supabase
    .from("class_slots")
    .select("*")
    .eq("faculty_name", facultyName)
    .order("start_time");
  if (error) throw error;
  return (data ?? []) as ClassSlot[];
}

export async function fetchTodayPermissions(code: string) {
  const today = new Date();
  const iso = new Date(today.getTime() - today.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);
  const { data, error } = await supabase
    .from("movement_permissions")
    .select("*")
    .eq("student_code", code)
    .eq("on_date", iso);
  if (error) throw error;
  return (data ?? []) as MovementPermission[];
}

export async function fetchStudentViolations(code: string) {
  const { data, error } = await supabase
    .from("violations")
    .select("*")
    .eq("student_code", code)
    .order("incident_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Violation[];
}

export async function fetchViolations() {
  const { data, error } = await supabase
    .from("violations")
    .select("*")
    .order("incident_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Violation[];
}

export async function fetchViolation(id: string) {
  const { data, error } = await supabase
    .from("violations")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as Violation) ?? null;
}

export async function fetchExplanations(violationId: string) {
  const { data, error } = await supabase
    .from("explanations")
    .select("*")
    .eq("violation_id", violationId)
    .order("submitted_at");
  if (error) throw error;
  return (data ?? []) as Explanation[];
}

export async function fetchNotifications(userId: string) {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return data ?? [];
}

export async function logAudit(
  actorId: string,
  actorName: string,
  action: string,
  entity: string,
  entityId?: string,
  meta: Record<string, unknown> = {},
) {
  await supabase.from("audit_logs").insert({
    actor_id: actorId,
    actor_name: actorName,
    action,
    entity,
    entity_id: entityId ?? null,
    meta,
  });
}

export async function notifyStudent(
  studentCode: string,
  title: string,
  detail: string,
  tone: string,
) {
  const { data } = await supabase
    .from("profiles")
    .select("id")
    .eq("student_code", studentCode)
    .maybeSingle();
  if (!data?.id) return;
  await supabase.from("notifications").insert({ user_id: data.id, title, detail, tone });
}

export function makeReference(date = new Date()) {
  const stamp = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(
    date.getDate(),
  ).padStart(2, "0")}`;
  const rand = String(Math.floor(Math.random() * 900) + 100);
  return `V-${stamp}-${rand}`;
}

export function deadlineLabel(iso: string) {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return "Deadline passed";
  const hours = Math.floor(diff / 3_600_000);
  if (hours >= 1) return `${hours} hour${hours === 1 ? "" : "s"} remaining`;
  return `${Math.max(1, Math.floor(diff / 60_000))} minutes remaining`;
}
