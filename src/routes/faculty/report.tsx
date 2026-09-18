import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/faculty/report")({
  beforeLoad: () => {
    throw redirect({ to: "/faculty/reports" });
  },
  component: () => null,
});
