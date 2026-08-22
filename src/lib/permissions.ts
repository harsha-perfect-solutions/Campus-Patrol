import type { AppRole } from "@/lib/auth";

export function normalizeRole(rawRole: string | null | undefined): AppRole {
  if (!rawRole) return "student";
  const clean = String(rawRole).trim().toLowerCase();
  if (
    clean === "security" ||
    clean === "security_guard" ||
    clean === "security_officer" ||
    clean === "gate_security" ||
    clean === "guard"
  ) {
    return "security";
  }
  if (clean === "admin" || clean === "superadmin" || clean === "administrator") {
    return "admin";
  }
  if (clean === "hod" || clean === "head_of_department" || clean === "head") {
    return "hod";
  }
  if (
    clean === "faculty" ||
    clean === "professor" ||
    clean === "teacher" ||
    clean === "instructor"
  ) {
    return "faculty";
  }
  return "student";
}

export function getDefaultDashboardForRole(role: AppRole | string | null | undefined): string {
  const norm = role ? normalizeRole(role) : null;
  switch (norm) {
    case "faculty":
      return "/faculty/dashboard";
    case "security":
      return "/security/dashboard";
    case "hod":
      return "/hod/dashboard";
    case "student":
      return "/student/dashboard";
    case "admin":
      return "/admin/dashboard";
    default:
      return "/auth";
  }
}

export function canVerifyStudent(role: AppRole | null): boolean {
  return role === "faculty" || role === "hod" || role === "security";
}

export function canReportViolation(role: AppRole | null): boolean {
  return role === "faculty" || role === "security";
}

export function canMakeHodDecision(role: AppRole | null): boolean {
  return role === "hod";
}

export function canSubmitStudentExplanation(role: AppRole | null): boolean {
  return role === "student";
}

export function canManageMasterData(role: AppRole | null): boolean {
  return role === "admin";
}
