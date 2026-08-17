import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/security/timetable")({
  beforeLoad: () => {
    throw redirect({ to: "/security/check" });
  },
});
