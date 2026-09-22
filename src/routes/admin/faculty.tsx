import { createFileRoute } from "@tanstack/react-router";
import { AdminStudentsAndFacultyPage } from "./students";

export const Route = createFileRoute("/admin/faculty")({
  head: () => ({ meta: [{ title: "Faculty & Students — Admin Console" }] }),
  component: () => <AdminStudentsAndFacultyPage initialTab="faculty" />,
});
