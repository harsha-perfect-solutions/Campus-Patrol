import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { RoleGuard } from "@/components/role-guard";
import { CheckStudentPage } from "../check";

export const Route = createFileRoute("/faculty/check")({
  validateSearch: z.object({ student: z.string().optional() }),
  head: () => ({ meta: [{ title: "Student Verification — Faculty Portal" }] }),
  component: FacultyCheckPage,
});

function FacultyCheckPage() {
  return (
    <RoleGuard allowedRoles={["faculty", "hod"]}>
      <CheckStudentPage />
    </RoleGuard>
  );
}
