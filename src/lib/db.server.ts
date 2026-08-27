import type { QueryResultRow } from "pg";
import { createRequire } from "module";

const isBrowser = typeof window !== "undefined";
const nodeRequire = !isBrowser ? createRequire(import.meta.url) : null;

let connectionString = process.env["DATABASE_URL"] || "";

if (!isBrowser && nodeRequire && !connectionString) {
  try {
    const fs = nodeRequire("fs");
    const path = nodeRequire("path");
    const envPath = path.resolve(process.cwd(), ".env");
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, "utf-8");
      const match = content.match(/DATABASE_URL=["']?([^"'\r\n]+)["']?/);
      if (match) {
        connectionString = match[1];
      }
    }
  } catch {
    // ignore
  }
}

if (!connectionString) {
  connectionString = "postgresql://postgres:postgrespassword@localhost:5434/cmadms_db";
}

let primaryPool: import("pg").Pool | null = null;
let fallbackPool: import("pg").Pool | null = null;

if (!isBrowser && nodeRequire) {
  try {
    const pg = nodeRequire("pg");
    const Pool = pg.Pool;

    primaryPool = new Pool({
      connectionString,
      max: 10,
      connectionTimeoutMillis: 3000,
    });

    primaryPool?.on("error", (err: Error) => {
      console.warn("[PostgreSQL Notice]", err?.message || err);
    });

    const fallbackConnectionString = connectionString.includes(":5433")
      ? connectionString.replace(":5433", ":5434")
      : "postgresql://postgres:postgrespassword@localhost:5434/cmadms_db";

    fallbackPool = new Pool({
      connectionString: fallbackConnectionString,
      max: 10,
      connectionTimeoutMillis: 3000,
    });

    fallbackPool?.on("error", (err: Error) => {
      console.warn("[PostgreSQL Notice]", err?.message || err);
    });
  } catch (e) {
    console.error("[DB Init Error]", e);
  }
}

export const db = {
  query: async <R extends QueryResultRow = any>(text: string, params?: any[]) => {
    if (isBrowser || !primaryPool) {
      return { rows: [], rowCount: 0 } as any;
    }
    try {
      return await primaryPool.query<R>(text, params);
    } catch (err: any) {
      if (
        (err.message?.includes("authentication failed") ||
          err.message?.includes("ECONNREFUSED") ||
          err.code === "28P01") &&
        fallbackPool
      ) {
        return await fallbackPool.query<R>(text, params);
      }
      throw err;
    }
  },
  getClient: async () => {
    if (isBrowser || !primaryPool) {
      return { release: () => {} } as any;
    }
    try {
      return await primaryPool.connect();
    } catch {
      return await fallbackPool!.connect();
    }
  },
};
