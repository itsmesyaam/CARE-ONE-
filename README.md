# CareOne Hospital Platform 

[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19.3-61dafb.svg)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8.3-646cff.svg)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4.3-38bdf8.svg)](https://tailwindcss.com/)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare_Workers-Hono-orange.svg)](https://workers.cloudflare.com/)
[![Cloudflare D1](https://img.shields.io/badge/Cloudflare_D1-SQLite-f38020.svg)](https://developers.cloudflare.com/d1/)
[![Auth: Username & Password](https://img.shields.io/badge/Auth-Username_%2B_Password-green.svg)]()
[![License](https://img.shields.io/badge/License-Proprietary-red.svg)]()

**CareOne** is a patient-engagement and doctor-assistant web application engineered for a hospital in Kerala, India. It stores and manages sensitive health records under India's Digital Personal Data Protection (DPDP) Act 2023, enforcing strict role-based access control, purpose limitation, native WebCrypto password authentication, and immutable audit logging.

The entire backend and data layer run **100% on Cloudflare's serverless edge stack on the free tier ($0/month)**. Supabase has been completely removed and replaced with native Cloudflare Workers, Cloudflare D1 relational databases, D1 chunked document storage, Cloudflare Queues, and Cron Triggers.

---

##  Table of Contents
1. [Overview & Live URL](#-overview--live-url)
2. [Current Status & What Works](#-current-status--what-works)
3. [Cloudflare Architecture & System Design](#-cloudflare-architecture--system-design)
4. [Security Model & Access Control Matrix](#-security-model--access-control-matrix)
5. [Authentication & Password System](#-authentication--password-system)
6. [Tech Stack & Versions](#-tech-stack--versions)
7. [Repository Structure](#-repository-structure)
8. [Local Setup Guide (Windows)](#-local-setup-guide-windows)
9. [Demo Accounts (Local Testing)](#-demo-accounts-local-testing)
10. [NPM Scripts Reference](#-npm-scripts-reference)
11. [Testing & Quality Assurance](#-testing--quality-assurance)
12. [Cloudflare Deployment Guide](#-cloudflare-deployment-guide)
13. [Backups & Disaster Recovery](#-backups--disaster-recovery)
14. [Free-Tier Resource Limits](#-free-tier-resource-limits)
15. [DPDP Act Compliance Notes](#-dpdp-act-compliance-notes)
16. [Roadmap & Next Steps](#-roadmap--next-steps)

---

##  Overview & Live URL

- **Production Worker & API**: [`https://care-one.syam18official.workers.dev`](https://care-one.syam18official.workers.dev)
- **Health Endpoint**: [`https://care-one.syam18official.workers.dev/api/health`](https://care-one.syam18official.workers.dev/api/health)
- **Version Manifest**: [`https://care-one.syam18official.workers.dev/version.json`](https://care-one.syam18official.workers.dev/version.json)
- **Repository**: [`https://github.com/itsmesyaam/CARE-ONE-`](https://github.com/itsmesyaam/CARE-ONE-)

CareOne is built with a dual-interface architecture:
- **Patient & Guardian Portal**: Clean, high-contrast, bilingual interface in **English and Malayalam (മലയാളം)**. Patients can review past visits, view prescriptions, track diagnostic reports, log daily vitals, report symptoms, and receive care-plan reminders. Guardians can switch between dependent family member profiles seamlessly.
- **Hospital Clinical Portal**: Purpose-built for front-desk coordinators, attending physicians, departmental specialists, and hospital administrators. Includes an outpatient clinic queue (OPD), interactive clinical chart, allergy alerts, immutable consultation note wizard, review queue for patient uploads, and an operational dashboard.

---

##  Current Status & What Works

### What Works Today
- **Complete Supabase Removal**: Supabase configs, dependencies (`@supabase/supabase-js`), Edge Functions, and database connections have been completely removed. All storage and compute run on Cloudflare Workers and D1.
- **Front Desk Operations**:
  - Patient registration with automatic sequence UHID generation (`ABC-NNNN`).
  - Physical identity verification checkbox (never stores identity card numbers).
  - Appointment scheduling with automatic 1-year care team binding.
  - Department management and staff roster coordination.
  - Instant patient account creation and password resets with secure temporary passwords.
- **Doctor Clinical Chart**:
  - Live OPD queue and patient directory with penicillin allergy banners.
  - **"What Changed Since Last Visit"**: Plain SQL aggregation of newly uploaded lab reports, vital trends, medication changes, and reported symptoms since the previous signed encounter.
  - **4-Step Note Composer**: Draft -> Meds -> Plan -> Sign. Signed encounters are permanently frozen by database triggers.
  - **Immutable Addenda**: Signed notes cannot be modified; amendments are appended as cryptographically tracked addenda.
  - **Break-Glass Emergency Access**: Unlinked doctors can request 4-hour temporary access by providing a written medical justification (minimum 15 characters), instantly logged to the audit trail.
  - **Review Queue**: Two-tab queue for doctor review and sign-off on patient-submitted reports and symptoms.
- **Chunked D1 Document Storage (`careone-files`)**:
  - Upload and download of medical PDFs and images up to 10 MB.
  - Automatically partitioned into 256 KB binary chunks stored in Cloudflare D1. Zero external object storage costs.
  - MIME-type whitelisting (`application/pdf`, `image/jpeg`, `image/png`, `image/webp`).
- **Reminders & Cron Worker**:
  - 5-minute Cloudflare Cron Trigger queries due reminders with concurrency-safe atomic claims (`SKIP LOCKED` emulation in SQLite).
  - Resend email adapter with strict rate limits (95 emails/day cap, with the last 20 emails strictly reserved for hospital staff authentication).
- **Hospital Admin Dashboard**:
  - Real-time operational metrics: Today's Appointments, Follow-ups Due, Pending Report Reviews, Overdue Follow-ups, and App Engagement.
  - Visual workload charts powered by `recharts`.
  - Filterable audit access log detailing every chart view, login, and emergency access event.
  - Zero clinical data leakage (admin API endpoints recursively strip patient identifiers and clinical content).

### What Has Been Removed
- All SMS and email OTP sign-in flows and codes.
- All OTP verification tables (`auth_otps`).
- The "From Messages / Tap to fill" mock code box and code-entry screens.
- All WebAuthn passkey and biometric registration/login endpoints and tables.
- Staff TOTP 2FA requirements and setup QR codes.
- All Supabase migrations, seed files, CLI configurations, and client modules.

---

##  Cloudflare Architecture & System Design

CareOne operates entirely within Cloudflare's serverless infrastructure:

```text
                        ┌──────────────────────────────────────────────────┐
                        │            Patient / Staff Browser (PWA)         │
                        └─────────────────────────┬────────────────────────┘
                                                  │ HTTPS / WebAuthn
                                                  ▼
                        ┌──────────────────────────────────────────────────┐
                        │             Cloudflare Edge Network              │
                        │  (WAF, DDoS Shield, Turnstile, Security Headers) │
                        └─────────────────────────┬────────────────────────┘
                                                  │
                                                  ▼
                        ┌──────────────────────────────────────────────────┐
                        │             Cloudflare Worker (Hono)             │
                        │             worker/index.ts                      │
                        ├──────────────────────────────────────────────────┤
                        │ • Static SPA Hosting (ASSETS binding from dist/) │
                        │ • Strict Security Headers & CSP Middleware       │
                        │ • WebAuthn Passkey Engine (@simplewebauthn)      │
                        │ • RBAC Policy Guard (withPolicy Middleware)      │
                        │ • Cron Scheduler (processReminders every 5 min)  │
                        └─────────────┬──────────────────────┬─────────────┘
                                      │                      │
                  ┌───────────────────┴──┐                ┌──┴──────────────────┐
                  ▼                      ▼                ▼                     ▼
          ┌──────────────┐       ┌──────────────┐  ┌──────────────┐     ┌──────────────┐
          │  Primary D1  │       │   Files D1   │  │ Cloudflare   │     │  Resend API  │
          │ "careone-db" │       │"careone-files│  │ Queue        │     │              │
          │ (23 Tables,  │       │ (Chunked     │  │ "careone-    │     │ (95/day Cap, │
          │  Triggers)   │       │  256 KB Blobs│  │  reminders") │     │  Staff Quota)│
          └──────────────┘       └──────────────┘  └──────────────┘     └──────────────┘
```

### Transition from Supabase to Cloudflare Native

| Component | Previous Architecture (Supabase) | Current Architecture (Cloudflare Native) |
|---|---|---|
| **API Server** | Supabase Edge Functions (Deno) | Cloudflare Worker with Hono TypeScript router |
| **Relational DB** | Supabase Postgres 15 (AWS Mumbai) | Cloudflare D1 (`careone-db`) with SQLite triggers |
| **Document Store** | Supabase Storage Bucket (`patient-files`) | Cloudflare D1 (`careone-files`) chunked blob store |
| **Authentication** | Supabase GoTrue Auth (Email/Phone OTP) | Native WebCrypto PBKDF2-SHA-256 + HMAC-SHA256 JWT |
| **Scheduled Tasks**| PostgreSQL `pg_cron` | Cloudflare Worker Cron Triggers (`*/5 * * * *`) |
| **Job Queues** | Custom database polling | Cloudflare Queues (`careone-reminders`) |
| **Hosting** | Cloudflare Pages + Supabase API | Unified Cloudflare Worker serving `/api/*` + SPA bundle |

---

##  Security Model & Access Control Matrix

CareOne implements an onion-layered defense model. Every incoming API request passes through:
1. **Security Headers Middleware**: Enforces strict CSP, HSTS, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, and `Referrer-Policy: no-referrer`.
2. **Session Verification**: Validates the `careone_session` cookie or `Bearer` token using HMAC-SHA256. Re-checks user active status (`is_active = 1`) and matches `session_version` in D1 to permit instant global revocation.
3. **Principal Resolution**: Constructs a verified `Principal` object containing `userId`, `role`, `isActive`, `mustChangePassword`, and `sessionVersion`.
4. **Policy Enforcement (`withPolicy`)**: Verifies required roles. Enforces the forced password change barrier (`must_change_password = 1` blocks all routes with `403 password_change_required` until password is changed via `/api/me/password`).
5. **Database Context (`_request_ctx`)**: Populates the request context table in SQLite before query execution to feed immutable triggers.

### Access Control Matrix

| User Role | Allowed Endpoints | Clinical Record Access | Session Expiry | Emergency Access Permitted |
|---|---|---|---|---|
| **Patient** | `/api/patient/*`, `/api/files/*`, `/api/me/*` | Own records only; foreign patient IDs return `404 Not Found` | 30 days (HttpOnly cookie) | No |
| **Guardian** | `/api/patient/*`, `/api/files/*`, `/api/me/*` | Linked dependent children records only; unlinked IDs return `404` | 30 days (HttpOnly cookie) | No |
| **Doctor** | `/api/doctor/*`, `/api/files/*`, `/api/me/*` | Active care-team patients only; unlinked patients return `404` | 12 hours (HttpOnly cookie) | **Yes (4h break-glass, audited)** |
| **Specialist** | `/api/doctor/*`, `/api/files/*`, `/api/me/*` | Same as Doctor; restricted psychiatric notes limited to authoring dept | 12 hours (HttpOnly cookie) | **Yes (4h break-glass, audited)** |
| **Front Desk** | `/api/desk/*`, `/api/departments`, `/api/me/*` | Patient demographics and appointments only; zero clinical access | 12 hours (HttpOnly cookie) | No |
| **Admin** | `/api/admin/*`, `/api/staff`, `/api/departments`, `/api/me/*` | High-level operational counts only; exactly 0 clinical fields leaked | 12 hours (HttpOnly cookie) | No |

### SQLite Database Triggers & Invariants
- **Frozen Encounter Trigger**: Rejects any `UPDATE` or `DELETE` on encounters where `status = 'signed'`.
- **Clinical Delete Guard**: Enforces soft deletes (`deleted_at`); hard `DELETE` queries on clinical tables abort with an error.
- **Append-Only Audit Log**: Prevents `UPDATE` or `DELETE` actions on the `audit_log` table under all circumstances.

---

##  Authentication & Password System

CareOne uses a fast, secure, and resource-efficient **Username + Password** authentication system engineered specifically for Cloudflare Workers Free Tier:

### 1. WebCrypto PBKDF2 Password Engine (< 10 ms CPU Budget)
- **Native WebCrypto API**: Uses native `crypto.subtle` PBKDF2 with SHA-256 (no heavy npm packages like bcrypt, argon2, or scrypt).
- **Iteration Count**: Tuned to **50,000 iterations**, taking ~5.08 ms CPU time under Cloudflare Workers, comfortably inside the 10 ms CPU free-tier execution limit.
- **Salts**: Cryptographically random 16-byte salt per user generated via `crypto.getRandomValues`.
- **Constant-Time Verification**: Uses constant-time Uint8Array byte comparison to eliminate timing side-channel attacks.
- **Password Rules**: Minimum 8 characters, cannot equal username, blocks the top 100 most common passwords.

### 2. User Identifiers
- **Hospital Staff**: Username is their hospital email address (e.g., `admin@example.com`, `dr.rahul@example.com`).
- **Patients**: Username is their Hospital Medical Record Number / UHID (e.g., `ABC-1001`) or registered phone number. Case-insensitive collation (`COLLATE NOCASE`).

### 3. Account Protection & Lockout
- **Rate Limiting & Lockout**: 5 consecutive incorrect password attempts automatically locks the account for 15 minutes (`locked_until`).
- **Timing Uniformity**: Unknown usernames and incorrect passwords return the exact same generic error message: `"Invalid username or password"`.
- **Session Cookies**: Issued as `HttpOnly`, `Secure`, `SameSite=Strict` cookies (12 hours for hospital staff, 30 days for patients).

### 4. Temporary Passwords & Forced First-Login Change
- **Front Desk Patient Setup**: Front desk staff clicks **"Create login / Reset password"** on the patient chart (`POST /api/desk/patients/:id/account`). A 12-character single-use temporary password (`Temp#...`) is generated and shown once on screen with a Copy button.
- **Admin Staff Password Reset**: Hospital admin can generate a temporary password for any staff member (`POST /api/admin/staff/:id/password-reset`).
- **Forced Password Change Barrier**: While `must_change_password = 1`, all clinical and administrative routes return `403 {"error": "password_change_required"}` until the user submits a new compliant password to `POST /api/me/password`.
- **Global Invalidation**: Updating password increments `session_version`, instantly invalidating sessions on all other devices.

### 5. Emergency CLI Password Tool
For initial bootstrapping and emergency administrative recovery, an out-of-band CLI tool is provided that executes directly via Wrangler without exposing any HTTP route:
```powershell
npm run set-password -- --username admin@example.com --remote
```

---

##  Tech Stack & Versions

All dependencies and versions are verified from [`package.json`](file:///d:/CareOne/package.json):

| Category | Technology | Version | Purpose |
|---|---|---|---|
| **Runtime & Edge** | Cloudflare Workers | compatibility date `2026-10-11` | Serverless edge execution with `nodejs_compat` |
| **Web Framework** | Hono | `^4.13.13` | Lightweight, zero-dependency edge HTTP router |
| **Primary Database** | Cloudflare D1 (`careone-db`) | SQLite 3 | Relational clinical data store with triggers |
| **File Storage** | Cloudflare D1 (`careone-files`)| SQLite 3 | 256 KB chunked binary document store |
| **Password Engine** | WebCrypto PBKDF2-SHA-256 | Native | 50,000 iterations, constant-time verification |
| **Frontend Core** | React | `^19.3.0` | UI component tree with strict Concurrent Mode |
| **Type System** | TypeScript | `^5.8.3` | Strict type validation across frontend and worker |
| **Build Tool** | Vite | `^8.3.3` | Lightning-fast bundle generation |
| **CSS & Design** | Tailwind CSS | `^4.3.3` | Modern utility-first responsive styling |
| **State & Data** | TanStack React Query | `^5.104.1` | Client-side cache management and background refetching |
| **Routing** | React Router | `^7.18.4` | Client-side SPA navigation |
| **Schema Validation** | Zod | `^4.6.5` | Strict runtime payload verification |
| **Data Analytics** | Recharts | `^3.10.1` | Operational charts for admin dashboard |
| **Internationalization** | react-i18next / i18next | `^17.0.16` / `^26.4.2` | Bilingual translation engine (English & Malayalam) |
| **Icons** | Lucide React | `^1.52.0` | Accessible clinical iconography |
| **Testing** | Vitest | `^5.0.3` | Fast unit, integration, and security suite runner |
| **Deployment CLI** | Cloudflare Wrangler | `^4.149.0` | Cloudflare D1 and Worker deployment tool |

---

##  Repository Structure

```text
CareOne/
├── .github/
│   └── workflows/              # CI/CD and automated backup workflows
├── docs/
│   ├── ARCHITECTURE.md         # Comprehensive architectural specification
│   ├── PROGRESS.md             # Implementation changelog across phases
│   └── DEPLOY.md               # Production deployment manual
├── migrations/                 # D1 Primary Database migrations (0001 - 0011)
│   ├── 0001_schema.sql         # 23 relational tables, indexes, and constraints
│   ├── 0002_guards.sql         # Context setup and encounter freeze triggers
│   ├── 0003_audit_triggers.sql # AFTER INSERT/UPDATE triggers for audit trail
│   ├── 0005_email_limits.sql   # Atomic daily email quota tracking
│   ├── 0006_reminders.sql      # Reminder scheduler and abandonment logic
│   ├── 0008_sessions.sql       # Session invalidation & token versioning
│   ├── 0009_passkeys.sql       # WebAuthn passkeys and setup tokens schema
│   ├── 0010_passkeys_and_tokens_hardening.sql # Passkey indexes and audit triggers
│   └── 0011_drop_auth_otps.sql # Drop legacy OTP table
├── migrations-files/           # D1 Files Database migrations
│   └── 0001_files_schema.sql   # Chunked file storage tables (files & file_chunks)
├── public/                     # Static assets, version.json, and _headers
├── scripts/                    # Maintenance utilities (i18n checker, restore tester)
├── seed/
│   └── seed.sql                # Fictional demo seed data for local testing
├── src/                        # React 19 Frontend Application
│   ├── app/                    # Application shell, router configuration, and layout
│   ├── components/             # Reusable UI primitives, headers, and navigation
│   ├── features/               # Domain modules (admin, auth, desk, doctor, patient)
│   ├── lib/                    # HTTP client, session helpers, and formatters
│   ├── locales/                # Bilingual translations (en.json and ml.json)
│   └── types/                  # TypeScript interface definitions
├── tests/                      # Automated Vitest test suites (42 suites, 199 tests)
│   ├── features/               # UI and clinical component tests
│   ├── worker/                 # Access matrix, security, and D1 guard tests
│   ├── unit/                   # Compression and utility tests
│   └── scripts/                # Database restore verification tests
├── worker/                     # Cloudflare Worker Backend
│   ├── auth/                   # Policy middleware and JWT signing routines
│   ├── data/                   # D1 file chunking and retrieval adapters
│   ├── routes/                 # Hono API endpoints (admin, desk, doctor, patient, passkey)
│   ├── services/               # Resend email and reminder queue processors
│   ├── env.ts                  # Worker environment and D1 database bindings
│   └── index.ts                # Main worker entrypoint, headers, and cron handler
├── AGENTS.md                   # Immutable rules and safety constraints for AI agents
├── package.json                # Project dependencies and script definitions
├── vite.config.ts              # Vite bundling and PWA configuration
└── wrangler.jsonc              # Cloudflare Worker, D1 bindings, and Cron config
```

---

##  Local Setup Guide (Windows)

Follow these steps to run CareOne locally on Windows:

### 1. Prerequisites
- **Node.js**: Version `>= 20.0.0`
- **Git for Windows**
- **PowerShell**: Execute with script bypass if required (`Set-ExecutionPolicy -Scope Process Bypass`)

### 2. Clone and Install
```powershell
git clone https://github.com/itsmesyaam/CARE-ONE-.git
cd CARE-ONE-
npm install
```

### 3. Configure Local Environment Variables
Create a `.dev.vars` file in the root directory:
```ini
ENVIRONMENT=local
APP_ENV=local
JWT_SECRET=demo-jwt-secret-at-least-32-chars-long-for-testing
RP_ID=localhost
ORIGIN=http://localhost:5173
RESEND_API_KEY=re_mock_test_key
```

### 4. Apply Local D1 Database Migrations
Initialize local SQLite databases using Wrangler:
```powershell
npm run db:migrate:local
npx wrangler d1 migrations apply FILES_DB --local
```

### 5. Seed Demo Data
Seed the local database with fictional Kerala hospital demo records:
```powershell
npx wrangler d1 execute DB --local --file=seed/seed.sql
```

### 6. Start the Development Servers
In terminal 1, start the Vite frontend:
```powershell
npm run dev
```
*(Runs at `http://localhost:5173` with full Hot Module Replacement)*

In terminal 2, start the Cloudflare Worker API:
```powershell
npm run worker:dev
```
*(Runs the Hono API at `http://localhost:8787`)*

---

##  Demo Accounts (Demo Only)

All demo accounts are fictional and seeded into both local and live demo databases with password `DemoPassword123!` and `must_change_password = 0`:

| Role | Name | Username (Staff Email / Patient MRN) | Password | Notes |
|---|---|---|---|---|
| **Hospital Admin** | Anand Verma | `admin@example.com` | `DemoPassword123!` | Operational dashboard & staff management |
| **Front Desk** | Anjali Nair | `desk@example.com` | `DemoPassword123!` | Patient registration & appointment booking |
| **Doctor (General Medicine)** | Dr. Rahul Menon | `dr.rahul@example.com` | `DemoPassword123!` | Care team for Arun Kumar; consultation notes |
| **Specialist (Cardiology)** | Dr. Anjali Sharma | `dr.anjali@example.com` | `DemoPassword123!` | Cardiology department specialist |
| **Doctor (Ortho)** | Dr. Thomas Varghese | `dr.thomas@example.com` | `DemoPassword123!` | Ortho department; emergency break-glass |
| **Patient (Self)** | Arun Kumar | `ABC-1001` | `DemoPassword123!` | Patient portal; vitals, records & care plan |
| **Guardian** | Sujatha Nair | `ABC-1002` | `DemoPassword123!` | Guardian of Baby Meenakshi (`ABC-1003`) |

> [!NOTE]
> **Demo only**: In production with real patients, all accounts receive temporary passwords upon registration and are strictly required to change their password on first sign-in.

### Demo Mode Configuration
Both login pages (`/patient/login` and `/staff/signin` / `/doctor/login`) feature a one-tap demo account selector that fills username and password or fills and signs in instantly. This is controlled by the `DEMO_MODE` worker variable:

- **Enable**: In `wrangler.jsonc`, ensure `"DEMO_MODE": "true"` is set under `"vars"`, then deploy (`npm run deploy`).
- **Disable for Production**: In `wrangler.jsonc`, change `"DEMO_MODE": "false"` under `"vars"`, then deploy (`npm run deploy`).
- **Endpoint**: The login pages query `GET /api/config` which returns `{ demoMode: boolean }`. When `demoMode` is `false`, the demo card is completely unmounted with zero trace of demo usernames or buttons in the page DOM.
- **Canonical Source**: Demo account metadata is centralized in `src/lib/demoAccounts.ts` to ensure UI, documentation, and tests never drift.

---

##  NPM Scripts Reference

| Script | Command | Purpose |
|---|---|---|
| `npm run dev` | `vite` | Start local Vite dev server with Hot Module Replacement |
| `npm run build` | `tsc --noEmit && vite build` | Strict TypeScript check and production client bundle build |
| `npm run preview` | `vite preview` | Locally preview the built production SPA bundle |
| `npm run typecheck`| `tsc --noEmit` | Strict type verification without emitting JavaScript |
| `npm run lint` | `eslint .` | Lint all TypeScript and React files with ESLint |
| `npm run format` | `prettier --check .` | Check formatting compliance across codebase |
| `npm run format:fix`| `prettier --write .` | Automatically reformat code to project standards |
| `npm run test` | `vitest run` | Execute complete unit, integration, and security test suites |
| `npm run i18n:check`| `node scripts/check-i18n.js`| Verify 100% key symmetry between English and Malayalam |
| `npm run db:migrate:local` | `wrangler d1 migrations apply DB --local` | Apply schema updates to local D1 SQLite database |
| `npm run set-password` | `npx tsx scripts/set-password.ts` | Out-of-band CLI tool to update/reset passwords on local or remote D1 |
| `npm run test:live-auth` | `npx tsx scripts/live-auth-proof.ts` | Automated end-to-end verification suite against live Cloudflare Workers API |
| `npm run worker:dev`| `wrangler dev` | Run Cloudflare Worker backend locally with D1 bindings |
| `npm run worker:deploy` | `npm run build && wrangler deploy` | Build production assets and deploy full Worker to Cloudflare |
| `npm run deploy` | `npm run build && wrangler deploy` | Alias for worker:deploy |

---

##  Testing & Quality Assurance

CareOne enforces rigorous test gates before any commit or deployment:

```powershell
# 1. Strict TypeScript check (0 errors)
npm run typecheck

# 2. ESLint verification (0 errors, 0 warnings)
npm run lint

# 3. Bilingual translation parity check (454 symmetric keys)
npm run i18n:check

# 4. Comprehensive test suite (42 suites, 199 tests)
npm run test

# 5. Production bundle build
npm run build
```

### Critical Security Suites Tested
- **`tests/worker/access-matrix-full.test.ts`**: Exhaustive 8-role security matrix test proving unlinked access attempts, privilege escalations, and ID spoofing return `404 Not Found`.
- **`tests/worker/no-raw-queries.test.ts`**: Verifies that no API endpoint accepts arbitrary SQL fragments or raw table parameters.
- **`tests/worker/d1-guards-verification.test.ts`**: Verifies SQLite triggers prevent editing signed notes and protect the audit log from modification.
- **`tests/worker/files-roundtrip.test.ts`**: Validates chunking, storage, and byte-for-byte SHA-256 download identity of 10 MB uploaded files.
- **`tests/worker/passkeys-api.test.ts`**: Validates WebAuthn registration options, token hashing, and authentication verification.

---

##  Cloudflare Deployment Guide

CareOne deploys to Cloudflare as a unified Worker serving both the Hono API routes and the client SPA:

### 1. Create Remote D1 Databases
```bash
npx wrangler d1 create careone-db
npx wrangler d1 create careone-files
```
Update the generated database IDs in [`wrangler.jsonc`](file:///d:/CareOne/wrangler.jsonc).

### 2. Apply Remote Migrations
```bash
npx wrangler d1 migrations apply DB --remote
npx wrangler d1 migrations apply FILES_DB --remote
```

### 3. Configure Production Secrets
Set production secrets directly in Cloudflare (never commit them to Git):
```bash
npx wrangler secret put JWT_SECRET
npx wrangler secret put RESEND_API_KEY
npx wrangler secret put RP_ID       # e.g. care-one.syam18official.workers.dev
npx wrangler secret put ORIGIN      # e.g. https://care-one.syam18official.workers.dev
```

### 4. Build and Deploy
```bash
npm run deploy
```

### 5. Verify Live Deployment
- Check system health: `curl -I https://<your-worker>.workers.dev/api/health` (should return HTTP 200 with `ok: true`, `db: "ok"`).
- Check build commit stamp: `curl https://<your-worker>.workers.dev/version.json`.

---

##  Backups & Disaster Recovery

- **D1 Snapshot Exports**: Backups are performed via `wrangler d1 export` on a scheduled GitHub Actions cron job.
- **Age Encryption**: Exported SQL dumps are encrypted using `age` public-key cryptography before leaving the runner.
- **Zero-Knowledge Key Storage**: The private decryption key is maintained offline by two designated hospital officers. No backup key is ever stored in the repository.
- **Automated Restore Verification**: Verified by [`tests/scripts/verify-d1-restore.test.ts`](file:///d:/CareOne/tests/scripts/verify-d1-restore.test.ts), which restores snapshots into a temporary SQLite instance and confirms schema integrity and row parity.

---

##  Free-Tier Resource Limits

CareOne is architected to operate comfortably within Cloudflare's free quotas:

| Resource | Cloudflare Free Limit | CareOne Average Consumption | Mitigation / Capacity Plan |
|---|---|---|---|
| **Worker CPU Time** | 10 ms / request | **< 2.1 ms** (Hono + prepared SQL) | Sub-queries optimized with covering indexes |
| **Requests / Day** | 100,000 requests | ~5,000 / day (single hospital OPD) | Cloudflare edge caching for static assets |
| **D1 Storage** | 500 MB per database | ~25 MB metadata, ~120 MB files | Automatic file compression and archival |
| **Resend Emails** | 100 emails / day | < 30 notifications / day | Enforced 95/day soft cap; 20 reserved for staff |
| **Cron Invocations**| 3 Cron Triggers | 1 active (`*/5 * * * *`) | Batch processing of up to 50 reminders per tick |

---

##  DPDP Act Compliance Notes

CareOne is built from the ground up to comply with India's **Digital Personal Data Protection (DPDP) Act 2023**:
1. **Purpose Limitation**: Patient health records are accessible only to healthcare professionals actively providing care.
2. **Explicit Consent**: Consent records are immutably logged with timestamp, language, and version before patient portal access is granted.
3. **No Existence Probing**: If an unauthorized user queries a patient ID they do not have access to, the server returns `404 Not Found` rather than `403 Forbidden`, preventing attackers from verifying patient presence.
4. **Data Hygiene in Logs & URLs**: Patient names, phone numbers, UHIDs, and clinical symptoms **never** appear in URLs, query strings, console logs, or push notification payloads.
5. **No Third-Party Trackers**: Google Analytics, Sentry, Facebook Pixel, and all commercial session-replay scripts are strictly prohibited.

---

##  Roadmap & Next Steps

- [x] Complete migration from Supabase to Cloudflare Workers and D1 ($0/mo cost).
- [x] WebAuthn passkey engine and setup QR flow implementation.
- [x] Atomic reminder engine with Cloudflare Cron Triggers.
- [ ] UI integration of biometric unlock directly on the patient mobile login page.
- [ ] Ayushman Bharat Digital Mission (ABDM) M1/M2/M3 milestone compliance for national health record exchange.
- [ ] Offline-first consultation note drafting for rural outreach clinics.

---

*CareOne Hospital Platform — Engineered for safety, privacy, and clinical efficiency.*
