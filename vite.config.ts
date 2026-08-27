import { defineConfig } from "vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { nitro } from "nitro/vite";
import path from "node:path";

process.env["NITRO_PRESET"] = process.env["NITRO_PRESET"] || "node-server";

export default defineConfig({
  css: {
    transformer: "lightningcss",
  },
  plugins: [
    tailwindcss(),
    tanstackStart({
      server: { entry: "server" },
      router: {
        routesDirectory: "./routes",
        generatedRouteTree: "./routeTree.gen.ts",
      },
      importProtection: {
        client: {
          // Allow createServerFn RPC stubs from api/*.server.ts (safe — bundler strips handler)
          // Allow import type {...} from db/*.server.ts (type-only, erased at compile time)
          // Also allow transitive server utilities (session.server.ts, db.server.ts pool)
          excludeFiles: [
            "src/lib/**/*.server.*",
          ],
        },
      },
    }),
    nitro({
      preset: "node-server",
    }),
    viteReact(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },

  server: {
    host: true,
    port: 3000,
    strictPort: true,
  },
});