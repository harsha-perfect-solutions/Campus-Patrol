import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/security/settings")({
  beforeLoad: () => {
    throw redirect({ to: "/security/profile" });
  },
});
