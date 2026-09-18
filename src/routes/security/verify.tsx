import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/security/verify")({
  beforeLoad: () => {
    throw redirect({ to: "/security/check" });
  },
  component: () => null,
});
