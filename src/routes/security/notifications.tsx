import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/security/notifications")({
  beforeLoad: () => {
    throw redirect({ to: "/security/check" });
  },
});
