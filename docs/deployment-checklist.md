# CMADMS — Production Deployment Checklist

This guide documents the step-by-step production deployment workflow for **CampusGuard Pro (CMADMS)**.

---

## 1. Prerequisites & Infrastructure Setup
- [ ] Node.js v18.x or higher installed.
- [ ] PostgreSQL v14.x or higher database server running.
- [ ] Domain name configured with HTTPS SSL/TLS certificate.

---

## 2. Environment Variables Configuration
- [ ] Copy `.env.example` to `.env`:
  ```bash
  cp .env.example .env
  ```
- [ ] Configure production `DATABASE_URL` pointing to your PostgreSQL instance.
- [ ] Generate a secure 64-character random string for `SESSION_SECRET`:
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```
- [ ] Set `NODE_ENV="production"`.

---

## 3. Database Initialization & Schema Seeding
- [ ] Verify PostgreSQL database connection:
  ```bash
  npx tsx ./scratch/check-db-schema.ts
  ```
- [ ] Verify deterministic timetable schedule initialization (642 slots):
  ```bash
  npx tsx ./scratch/test-faculty-timetable-integrity.ts
  ```

---

## 4. Production Build & Bundling
- [ ] Install production dependencies:
  ```bash
  npm install
  ```
- [ ] Run static type checking:
  ```bash
  npx tsc --noEmit
  ```
- [ ] Build production Nitro/Vite bundle:
  ```bash
  npm run build
  ```

---

## 5. Starting Production Server
- [ ] Launch the production server output:
  ```bash
  npm start
  ```
  *(or execute directly: `node .output/server/index.mjs`)*
- [ ] Verify server starts on configured port (`PORT=8080` or default) and responds to HTTP health checks.

---

## 6. Post-Deployment Verification
- [ ] Verify HTTPS secure session cookie setting (`cmadms_session_token`).
- [ ] Verify production login rate limiting activation after failed attempts.
- [ ] Verify server error handling does not expose internal stack traces or database connection strings.
