import { defineConfig } from "@lovable.dev/vite-tanstack-config";

process.env["NITRO_PRESET"] = process.env["NITRO_PRESET"] || "node-server";

export default (defineConfig as any)({
  server: {
    host: true,
    port: 8080,
    strictPort: true,
  },

  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts
    server: { entry: "server" },
  },
});