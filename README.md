# CareOne Hospital Platform

> *"We are not trying to replace your hospital management system. We are building your hospital's digital healthcare companion — a platform that gives your doctors a complete picture of their patients and keeps your patients connected to the hospital between visits."*

CareOne is an enterprise-grade, privacy-first patient-engagement and doctor-assistant web application engineered for a hospital in Kerala, India. It provides clinical continuity between outpatient visits while upholding strict compliance with India's **Digital Personal Data Protection (DPDP) Act 2023** and modern healthcare privacy standards.

The application runs entirely on Cloudflare's serverless edge infrastructure: Cloudflare Workers (Hono API + SPA static asset hosting), Cloudflare D1 (serverless relational SQLite with triggers and strict access control), Cloudflare R2 (authenticated medical document storage), and Cloudflare Cron Triggers (automated follow-up reminders).

---

## Table of Contents

- [Core Principles & Architectural Highlights](#core-principles--architectural-highlights)
- [System Architecture & Stack](#system-architecture--stack)
- [User Roles & Security Boundary](#user-roles--security-boundary)
- [Key Features](#key-features)
- [Bilingual Support (English & Malayalam)](#bilingual-support-english--malayalam)
- [Rules and Documentation Reference](#rules-and-documentation-reference)
- [Directory Structure](#directory-structure)
- [Demo Accounts (Fictional Data)](#demo-accounts-fictional-data)
- [Installation & Local Setup](#installation--local-setup)
- [Available npm Scripts](#available-npm-scripts)
- [Security & Quality Verification](#security--quality-verification)
- [Connecting & Deploying to Cloudflare](#connecting--deploying-to-cloudflare)

---

## Core Principles & Architectural Highlights

1. **Strict Clinical Privacy & Zero Admin Snooping**:
   - Hospital Administrators have access **only** to aggregated operational metrics (counts of appointments, workload distributions, audit event logs).
   - Admins **never** see individual patient names, medical histories, diagnosis notes, or clinical files.
2. **Clinical Care Team Boundary**:
   - A doctor can only access records for patients on their active care team (established via appointment booking, valid for 1 year).
   - Non-care-team doctors attempting access are blocked. In acute situations, emergency **break-glass access** can be invoked for 4 hours with mandatory clinical justification and immutable audit logging.
3. **Signed Encounters are Immutable**:
   - Once a consultation note is signed, it is frozen at the database engine level via SQLite triggers.
   - Amendments must be recorded as separate, timestamped `encounter_addenda`. Hard deletes of clinical records are strictly blocked (`deleted_at` soft deletes only).
4. **Zero Client-Side Trust & Centralized Access Layer**:
   - Every API route goes through a centralized access layer (`worker/middleware/access.ts`) with default-deny semantics.
   - Roles and permissions come strictly from database records (`staff` and `patient_access`), never from client tokens.
   - Patient scoping is strictly enforced in the SQL `WHERE` clause; data is never fetched globally and filtered in memory.
5. **Two-Factor Authentication (AAL2 TOTP)**:
   - Mandatory for all hospital staff (Admin, Doctor, Front Desk) to access clinical and administrative tools.
   - Patient authentication uses one-time passwords (OTP) via email without third-party authentication trackers.

---

## System Architecture & Stack

- **Frontend**:
  - React 19 + TypeScript (Strict mode, zero `any`).
  - Vite + `vite-plugin-pwa` (Progressive Web App with offline connectivity detection).
  - Tailwind CSS + accessible focus rings (WCAG 2.1 AA compliant).
  - TanStack Query (React Query) for API data caching and optimistic updates.
  - React Router 7 SPA.
  - `react-i18next` for 100% symmetric English & Malayalam localization.
  - Recharts for operational trends and vital tracking curves.
- **Backend (Cloudflare Native)**:
  - Single Cloudflare Worker serving the React SPA and `/api` REST endpoints via Hono.
  - Cloudflare D1 (serverless relational SQLite at the edge) accessed via Drizzle ORM.
  - D1 SQLite triggers enforcing audit log append-only immutability, signed note freezing, and automated care-team linkage.
  - Cloudflare R2 private bucket for authenticated patient document storage.
  - Native D1-backed sessions (random SHA-256 tokens in `HttpOnly`, `Secure`, `SameSite=Strict` cookies).
  - Cloudflare Cron Triggers every 5 minutes for automated scheduled care reminders.
- **Testing & Quality Assurance**:
  - Vitest + Testing Library for frontend component and integration tests.
  - Vitest with `@cloudflare/vitest-pool-workers` for edge API and access-matrix verification.
  - Automated i18n key symmetry checking (`scripts/check-i18n.js`).
  - Playwright & Axe-Core for smoke testing and accessibility validation.

---

## User Roles & Security Boundary

| Role | Permitted Access | Restricted Access | MFA Required |
| :--- | :--- | :--- | :---: |
| **Patient / Guardian** | Own clinical timeline, prescribed medicines, appointments, documents, self-log vitals (`source = 'patient'`), dependent child profiles. | Other patients' records, staff management, administrative settings. | Optional |
| **Doctor** | Patients on active care team: encounters, history, allergies, medications, lab review queue, "What Changed" panel, break-glass emergency access. | Patients outside care team without break-glass; administrative staff credentials. | **Yes (AAL2)** |
| **Front Desk** | Patient directory search, registration (deterministic UHID generation), check-in, appointments booking, patient app invitations. | Clinical consultation notes, doctor medical charts, diagnosis text. | **Yes (AAL2)** |
| **Hospital Admin** | Operational dashboard counts, department & staff directory management, system audit logs, hospital branding. | **Zero individual patient clinical data.** Cannot read encounters, vitals, or medical files. | **Yes (AAL2)** |
| **Platform Team** | Database migrations and deployment infrastructure. | No routine access to patient medical records. | N/A |

---

## Key Features

### 1. Patient Registration & UHID Generator
- Front desk registers patients with sequential Unique Health Identification numbers (`ABC-0001`, `ABC-0002`, etc.).
- Verifies physical government ID via an affirmative checkmark without scanning or storing sensitive identity documents.

### 2. Doctor Chart & "What Changed" Summary
- **"What Changed Since Last Visit"**: A dedicated SQL aggregation engine analyzing new lab reports, medication modifications, abnormal vital readings, missed care tasks, and patient symptom reports since the doctor's last consultation.
- **Timeline & Clinical Encounters**: Chronological medical history with signed consultation notes and addenda.
- **Vitals & Observations**: Real-time trend charts tracking metrics (e.g. HbA1c curves, blood pressure readings) distinguishing doctor-verified vs. patient-logged sources.

### 3. Patient Portal & Mobile Companion (PWA)
- Schedule of medications grouped by time of day (Morning, Afternoon, Evening, Night).
- One-tap logging for home blood pressure and blood sugar readings.
- Instant switching between guardian profile and dependent children (e.g., pediatric profiles).
- Offline banner warning when internet connectivity is lost, ensuring stale or uncommitted updates are never silently dropped.

### 4. Lab Reports Review Queue & Anti-IDOR Storage
- Secure document uploads stored in private `patient-files` R2 bucket.
- Storage paths strictly verified at the database level against patient IDs (`<patient_id>/<filename>`).
- Dedicated doctor review queue to accept, annotate, and integrate patient-uploaded reports into charts.

### 5. Automated Care Plans & Reminders
- Dynamic care plans created by doctors with scheduled follow-up actions.
- Reminder engine using state locks to prevent duplicate notifications across web push and email.

### 6. Hospital Admin Operational Dashboard & Access Log
- Real-time operational metric cards (Today's Appointments, Follow-ups Due, Reports Waiting Review, Monthly Consultations).
- Operational workload distribution charts and patient app engagement ratios.
- Tamper-evident Access Log displaying audit events, staff logins, and emergency access highlights.

---

## Bilingual Support (English & Malayalam)

CareOne is built with first-class support for **English** and **Malayalam (മലയാളം)**:
- 100% key symmetry verified by automated CI checks (`npm run i18n:check`).
- Dynamic language switcher preserved across sessions.
- Medical terminology, consent forms, and UI feedback provided with culturally accurate translations.

---

## Rules and Documentation Reference

All project architecture, compliance rules, and operational guidelines are strictly documented:

| Document | Path | Purpose |
| :--- | :--- | :--- |
| **Platform Rules** | [`AGENTS.md`](./AGENTS.md) | Absolute rules for development, DPDP compliance, zero-trust access boundaries, stack constraints, and safety guidelines. |
| **System Architecture** | [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) | Comprehensive technical specification, domain model, access-matrix, data lifecycle, DPDP Act compliance, API contract. |
| **Deployment Guide** | [`docs/DEPLOY.md`](./docs/DEPLOY.md) | Production Cloudflare D1/R2/Workers deployment, migration steps, DNS routing, and environment setup. |
| **Implementation Progress** | [`docs/PROGRESS.md`](./docs/PROGRESS.md) | Task completion tracking, verification milestones, architectural decisions, and current phase status. |
| **Architectural Decisions** | [`docs/adr/`](./docs/adr/) | Formal ADR records documenting key design and technology choices. |
| **Cleanup Audit** | [`docs/review/cleanup.md`](./docs/review/cleanup.md) | Full audit report of removed dead code, unused exports, and pruned i18n keys with evidence. |

---

## Directory Structure

```text
CareOne/
├── AGENTS.md                   # AI agent & developer safety guidelines and invariants
├── README.md                   # Project overview, installation, scripts, and documentation
├── package.json                # Project dependencies, engines, and npm scripts
├── tsconfig.json               # TypeScript strict configuration
├── vite.config.ts              # Vite bundler, PWA, and test configurations
├── wrangler.jsonc              # Cloudflare Workers, D1 database, R2 bucket bindings
├── .dev.vars                   # Local development secrets (gitignored; local mock values only)
├── docs/                       # Project documentation
│   ├── ARCHITECTURE.md         # Full system specification and access matrix
│   ├── DEPLOY.md               # Cloudflare deployment and migration guide
│   ├── PROGRESS.md             # Implementation milestones and decision log
│   ├── adr/                    # Architectural Decision Records (ADRs)
│   └── review/                 # Cleanup audits and UI verification screenshots
│       ├── cleanup.md          # Codebase cleanup audit table and evidence
│       └── screenshots/        # Visual regression before/after screenshots
├── migrations/                 # D1 SQL migrations (managed via Drizzle Kit / SQL files)
│   └── 0001_initial_schema.sql # Core tables, indexes, and immutability triggers
├── public/                     # Static assets served by the Worker / SPA
│   ├── favicon.svg             # Application favicon
│   ├── manifest.json           # Progressive Web App manifest
│   └── version.json            # Automated build stamp (commit and timestamp)
├── scripts/                    # Automation and database maintenance scripts
│   ├── check-i18n.js           # Validates 100% key symmetry between en.json and ml.json
│   ├── reset-demo-d1.js        # Resets local Cloudflare D1 database and applies migrations
│   └── seed-demo-d1.sql        # Evergreen SQL seed data relative to current timestamp
├── src/                        # Frontend React SPA (strict TypeScript)
│   ├── index.html              # Single page entrypoint
│   ├── main.tsx                # Application mounting and error boundary
│   ├── app/                    # Routing, layout, and global providers
│   │   ├── App.tsx             # Root router with role-based route guards
│   │   └── Layout.tsx          # Responsive navigation shell and language switcher
│   ├── components/             # Reusable UI components (shadcn/ui-style)
│   │   ├── OfflineBanner.tsx   # Offline status indicator
│   │   └── ui/                 # Accessible button, card, modal, and input primitives
│   ├── features/               # Domain feature modules
│   │   ├── admin/              # Hospital admin operational dashboard and audit log
│   │   ├── auth/               # Staff TOTP MFA & Patient email sign-in forms
│   │   ├── desk/               # Front desk patient registration and appointments
│   │   ├── doctor/             # Clinical chart, encounters, timeline, "What Changed"
│   │   └── patient/            # Patient portal, vitals logger, meds, dependent switcher
│   ├── lib/                    # Shared frontend utilities, TanStack Query client, i18n
│   │   ├── api.ts              # Centralized API fetcher with CSRF headers
│   │   └── i18n.ts             # Internationalization setup (English and Malayalam)
│   └── locales/                # Translation dictionary files
│       ├── en.json             # English UI strings
│       └── ml.json             # Malayalam (മലയാളം) UI strings
├── tests/                      # Automated test suite
│   ├── access/                 # Access-matrix security verification tests
│   ├── api/                    # Workers API route tests
│   ├── components/             # Frontend component unit tests
│   └── e2e/                    # Playwright smoke and baseline tests
└── worker/                     # Cloudflare Worker backend (Hono)
    ├── index.ts                # Main worker entrypoint (API routes + SPA static assets)
    ├── auth/                   # Password hashing, TOTP verification, session tokens
    ├── db/                     # Drizzle ORM schema definitions and D1 client
    │   └── schema.ts           # Unified SQLite schema matching D1 migrations
    ├── jobs/                   # Scheduled Cron Triggers (automated reminders)
    ├── middleware/             # Centralized access control, rate limiting, and CORS
    │   └── access.ts           # Default-deny role and care-team access matrix
    └── routes/                 # REST endpoints (/api/auth, /api/patients, /api/encounters, etc.)
```

---

## Demo Accounts (Fictional Data)

The platform includes evergreen demo seed data (`scripts/seed-demo-d1.sql` / `npm run demo:reset`) formulated with dynamic dates relative to execution time (`date('now')`, `datetime('now')`).

> **Safety Notice**: All names, email addresses, phone numbers, and clinical histories are completely fictional. Real patient data is strictly forbidden in local and non-production environments.

**Default Password for all demo accounts:** `DemoPassword123!`

| Role | Email | Name | Notes & Capabilities |
| :--- | :--- | :--- | :--- |
| **Hospital Admin** | `admin@example.com` | Anand Verma | Access to operational counts, staff management, audit log. Zero access to patient medical data. |
| **Front Desk** | `desk@example.com` | Anjali Nair | Patient registration, check-ins, appointment booking, app invites. |
| **Doctor (General Medicine)** | `dr.rahul@example.com` | Dr. Rahul Sharma | Primary doctor for Arun Kumar; full chart, encounters, and lab review access. |
| **Doctor (Cardiology)** | `dr.anjali@example.com` | Dr. Anjali Menon | Referral doctor with scheduled visit for Arun Kumar; care-team member. |
| **Doctor (Orthopedics)** | `dr.thomas@example.com` | Dr. Thomas Varghese | **Zero link to Arun Kumar** (demonstrates clinical boundary & break-glass prompt). |
| **Patient** | `arun.kumar@example.com` | Arun Kumar (48) | Complete history: diabetes, worsening HbA1c, home BP logs. |
| **Guardian** | `sujatha.kumar@example.com` | Sujatha Kumar | Arun's spouse; guardian for Baby Meenakshi (pediatric chart switching). |

*Note: All demo staff accounts have pre-seeded, persistent TOTP factors for seamless testing.*

---

## Installation & Local Setup

### Prerequisites
- [Node.js](https://nodejs.org/) (>= 20.0.0)
- npm (>= 10.0.0)
- Cloudflare Wrangler CLI (included in `devDependencies`)

### Quick Start

```bash
# 1. Clone repository and install dependencies
git clone <repository-url>
cd CareOne
npm install

# 2. Reset and seed local Cloudflare D1 database with evergreen demo data
npm run demo:reset

# 3. Start local development environment
# Start the full Cloudflare Worker edge environment (API + SPA + D1 + R2):
npm run dev:worker
```

The application will be accessible at:
- **Cloudflare Worker local environment**: `http://localhost:8787`
- **Vite standalone frontend server**: `http://localhost:5173` (run via `npm run dev`)

---

## Available npm Scripts

| Script | Command | Purpose |
| :--- | :--- | :--- |
| `npm run dev` | `vite` | Starts the Vite local development server with Fast Refresh at `http://localhost:5173`. |
| `npm run dev:worker` | `wrangler dev` | Starts the Cloudflare Worker locally at `http://localhost:8787`, serving both the Hono `/api` endpoints and the frontend SPA against local D1 and R2. |
| `npm run build` | `tsc --noEmit && vite build` | Typechecks the entire codebase in strict mode and bundles the frontend for production in `dist/`. |
| `npm run preview` | `vite preview` | Previews the production bundle locally at `http://localhost:4173`. |
| `npm run typecheck` | `tsc --noEmit` | Performs TypeScript typechecking in strict mode with zero code emission. |
| `npm run lint` | `eslint .` | Runs ESLint 9 across all TypeScript, TSX, and JavaScript files. |
| `npm run format` | `prettier --check .` | Checks code formatting against Prettier standards across the repository. |
| `npm run format:fix` | `prettier --write .` | Automatically formats all project files with Prettier. |
| `npm test` | `vitest run` | Runs all unit, integration, and Workers Pool test suites. |
| `npm run types:worker` | `wrangler types worker/worker-configuration.d.ts` | Generates TypeScript bindings for Cloudflare Workers environment variables, D1 database, and R2 buckets. |
| `npm run i18n:check` | `node scripts/check-i18n.js` | Audits translation files (`en.json` and `ml.json`) to guarantee 100% key symmetry and identical interpolation parameters. |
| `npm run demo:reset` | `node scripts/reset-demo-d1.js` | Resets the local Cloudflare D1 database schema and applies evergreen demo seed data. |
| `npm run demo:reset:d1`| `node scripts/reset-demo-d1.js` | Direct alias for `demo:reset`. |

---

## Security & Quality Verification

Before committing or pushing any change, execute the complete quality assurance pipeline:

```bash
# 1. Typecheck TypeScript
npm run typecheck

# 2. Lint codebase
npm run lint

# 3. Verify Prettier formatting
npm run format

# 4. Run automated test suites (147+ tests across 35 test files)
npm test

# 5. Check translation key symmetry
npm run i18n:check

# 6. Verify local database reset & seeding
npm run demo:reset

# 7. Verify production build
npm run build
```

---

## Connecting & Deploying to Cloudflare

CareOne is designed to deploy to Cloudflare Workers with native D1 relational database, private R2 object storage, and automated Cron Triggers.

For complete step-by-step instructions on remote setup, secrets management, and deployment pipelines, see [`docs/DEPLOY.md`](./docs/DEPLOY.md).

---

*CareOne Healthcare Platform — Built with security, clinical integrity, and patient dignity at the core.*
