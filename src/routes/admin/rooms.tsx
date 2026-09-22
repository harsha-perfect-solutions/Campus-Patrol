import { createFileRoute } from "@tanstack/react-router";
import { AdminDepartmentsAndRoomsPage } from "./departments";

export const Route = createFileRoute("/admin/rooms")({
  head: () => ({ meta: [{ title: "Departments & Rooms — Admin Console" }] }),
  component: () => <AdminDepartmentsAndRoomsPage />,
});
