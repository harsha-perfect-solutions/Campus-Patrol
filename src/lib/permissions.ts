import type { AppRole } from "@/lib/auth";

export function getDefaultDashboardForRole(role: AppRole | null): string {
  switch (role) {
    case "faculty":
      return "/faculty/dashboard";
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
  return role === "faculty" || role === "hod";
}

export function canReportViolation(role: AppRole | null): boolean {
  return role === "faculty";
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
