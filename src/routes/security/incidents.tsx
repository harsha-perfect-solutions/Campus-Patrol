import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/security/incidents")({
  beforeLoad: () => {
    throw redirect({ to: "/security/passes" });
  },
  component: () => null,
});
