import { Pool, type QueryResultRow } from "pg";
import fs from "fs";
import path from "path";
import { env } from "./env.server";

let connectionString = env.DATABASE_URL || process.env["DATABASE_URL"];

if (!connectionString) {
  try {
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

const primaryPool = new Pool({
  connectionString,
  max: 10,
  connectionTimeoutMillis: 3000,
});

primaryPool.on("error", (err: Error) => {
  console.warn("[PostgreSQL Notice]", err?.message || err);
});

const fallbackConnectionString = connectionString.includes(":5433")
  ? connectionString.replace(":5433", ":5434")
  : "postgresql://postgres:postgrespassword@localhost:5434/cmadms_db";

const fallbackPool = new Pool({
  connectionString: fallbackConnectionString,
  max: 10,
  connectionTimeoutMillis: 3000,
});

fallbackPool.on("error", (err: Error) => {
  console.warn("[PostgreSQL Notice]", err?.message || err);
});

export const db = {
  query: async <R extends QueryResultRow = any>(text: string, params?: any[]) => {
    try {
      return await primaryPool.query<R>(text, params);
    } catch (err: any) {
      if (
        err.message?.includes("authentication failed") ||
        err.message?.includes("ECONNREFUSED") ||
        err.code === "28P01"
      ) {
        return await fallbackPool.query<R>(text, params);
      }
      throw err;
    }
  },
};
