import { Pool } from "pg";
import { env } from "./env.server";

export const db = new Pool({
  connectionString: env.DATABASE_URL,
  max: 10,
});

db.on("error", (err: Error) => {
  console.error("[PostgreSQL Pool Error] Idle client error:", err?.message || err);
});

