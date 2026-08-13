import { Pool } from "pg";
import fs from "fs";
import path from "path";

let connectionString = process.env["DATABASE_URL"];

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
  throw new Error("DATABASE_URL is not configured");
}

export const db = new Pool({
  connectionString,
  max: 10,
});
