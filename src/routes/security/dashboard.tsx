import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/security/dashboard")({
  beforeLoad: () => {
    throw redirect({ to: "/security/check" });
  },
});
