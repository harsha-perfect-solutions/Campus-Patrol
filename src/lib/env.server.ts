import { z } from "zod";
import path from "path";
import fs from "fs";

// Helper to load .env if process.env values are missing in dev/test
function loadDotenvIfNeeded() {
  if (!process.env["DATABASE_URL"] || !process.env["SESSION_SECRET"]) {
    try {
      const envPath = path.resolve(process.cwd(), ".env");
      if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, "utf-8");
        const dbMatch = content.match(/DATABASE_URL=["']?([^"'\r\n]+)["']?/);
        if (dbMatch && !process.env["DATABASE_URL"]) {
          process.env["DATABASE_URL"] = dbMatch[1];
        }
        const secretMatch = content.match(/SESSION_SECRET=["']?([^"'\r\n]+)["']?/);
        if (secretMatch && !process.env["SESSION_SECRET"]) {
          process.env["SESSION_SECRET"] = secretMatch[1];
        }
      }
    } catch {
      // ignore
    }
  }
}

loadDotenvIfNeeded();

const isProduction = process.env["NODE_ENV"] === "production";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required."),
  SESSION_SECRET: z
    .string()
    .min(1, "SESSION_SECRET is required.")
    .refine(
      (secret) => {
        if (isProduction) {
          const INSECURE_SECRETS = new Set([
            "",
            "cmadms_super_secret_session_key_2026",
            "cmadms_secure_salt_2026",
            "default",
            "secret",
            "password",
            "123456",
            "change_me",
            "cmadms_secret",
            "development_secret_key_only_2026",
          ]);
          return secret.length >= 32 && !INSECURE_SECRETS.has(secret.toLowerCase());
        }
        return true;
      },
      {
        message: "SESSION_SECRET must be at least 32 characters and secure in production mode.",
      },
    ),
});

function parseEnv() {
  const defaultSecret = isProduction ? "" : "development_secret_key_only_2026";
  const rawEnv = {
    NODE_ENV: process.env["NODE_ENV"] || "development",
    DATABASE_URL: process.env["DATABASE_URL"] || "",
    SESSION_SECRET: process.env["SESSION_SECRET"] || defaultSecret,
  };

  const result = envSchema.safeParse(rawEnv);
  if (!result.success) {
    console.error("[FATAL SECURITY ERROR] Environment configuration validation failed.");
    if (isProduction) {
      throw new Error(
        "Invalid environment configuration in production. Check DATABASE_URL and SESSION_SECRET.",
      );
    }
  }
  return {
    NODE_ENV: rawEnv.NODE_ENV,
    DATABASE_URL: rawEnv.DATABASE_URL,
    SESSION_SECRET: rawEnv.SESSION_SECRET,
  };
}

export const env = {
  ...parseEnv(),
  COLLEGE_EMAIL_DOMAIN: (process.env["COLLEGE_EMAIL_DOMAIN"] || "college.edu.in").trim().toLowerCase(),
  INITIAL_PASSWORD: (process.env["INITIAL_PASSWORD"] || "CmadmsInitial@2026").trim(),
};

export function getCollegeEmailDomain(): string {
  return env.COLLEGE_EMAIL_DOMAIN;
}

export function getInitialDefaultPassword(): string {
  return env.INITIAL_PASSWORD;
}
