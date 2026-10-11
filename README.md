# CareOne Hospital Platform 🏥

[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61dafb.svg)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8-646cff.svg)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38bdf8.svg)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-Postgres_RLS-3ecf8e.svg)](https://supabase.com/)
[![License](https://img.shields.io/badge/License-Proprietary-red.svg)]()

CareOne is a modern patient-engagement and doctor-assistant web application built for a hospital in Kerala, India (**ABC Hospital, Kochi**). It is engineered from the ground up under the data fiduciary principles of India's **Digital Personal Data Protection (DPDP) Act 2023**, ensuring clinical data confidentiality, purpose limitation, tamper-evident audit logging, and role-based access boundaries.

---

## 📑 Table of Contents
1. [Overview & DPDP Principles](#-overview--dpdp-principles)
2. [Key Capabilities & Features](#-key-capabilities--features)
3. [Technology Stack](#-technology-stack)
4. [Repository Structure](#-repository-structure)
5. [Documentation & Governance](#-documentation--governance)
6. [Fictional Demo Accounts](#-fictional-demo-accounts)
7. [Getting Started & Local Setup](#-getting-started--local-setup)
8. [Available npm Scripts](#-available-npm-scripts)
9. [Security, Privacy & RLS Policies](#-security-privacy--rls-policies)
10. [Deployment Architecture](#-deployment-architecture)

---

## 🌟 Overview & DPDP Principles

Health records constitute sensitive personal data under India's DPDP Act. CareOne enforces zero-compromise security controls:
- **Zero Routine Platform Access**: System administrators and the platform engineering team have strictly no access to individual patient clinical records.
- **Care-Team Access Scoping**: Doctors may only view patients who are currently assigned to their care team (established via booking, consultation, or active referral). Appointments establish an automated 1-year care team relationship.
- **Departmental Isolation**: Sensitive clinical notes (e.g., Psychiatry, Oncology) can be restricted so only clinicians within the authoring department can view them.
- **Emergency "Break-Glass" Access**: Any licensed doctor can access an unassigned patient's chart in an emergency by submitting a written justification. Emergency access is capped at **4 hours**, logged immutably, and flagged in the hospital audit trail.
- **Audit Logging**: Every patient record view, export, update, and emergency access event is recorded with timestamps, actor IDs, IP addresses, and reasons.
- **No Hard Deletes & Immutable Notes**: Clinical data is never permanently deleted (`deleted_at` soft-deletes only). Signed consultation notes are immutable; amendments are appended as signed addenda.

---

## 🚀 Key Capabilities & Features

### 1. Front Desk & Patient Registration
- Rapid patient registration capturing demographic data and identity numbers.
- Automated generation and dispatch of mobile/email portal invitations.
- Appointment scheduling by department, doctor, and time slot.

### 2. Doctor Clinical Chart & Portal
- **Patient Summary**: Chronological timeline, active diagnoses, allergies, current medications, and vital observation charts.
- **"What Changed Since Last Visit"**: Delta calculation comparing the current consultation against previous visits to highlight new diagnoses, medication alterations, and lab trends.
- **Consultation Notes & Addenda**: Structured SOAP clinical notes with cryptographic integrity. Once signed, notes are locked; revisions are stored as timestamped addenda.
- **Kerala Diet Guidance**: Culturally tailored dietary counseling module indexing local staple items (Appam, Porotta, Kerala red rice, Fish curry) with Glycemic Index (GI) and caloric metrics.

### 3. Patient & Guardian Engagement Portal
- **Bilingual Interface**: Seamless one-click switching between **English** and **Malayalam (മലയാളം)** with 100% translation symmetry.
- **Medical Records**: Patients can view signed consultation summaries, discharge instructions, lab reports, and medication schedules.
- **Guardian Delegation**: Multi-patient switching allowing authorized guardians/parents to manage pediatric or dependent family records.
- **Document Upload Queue**: Direct upload of external lab reports and diagnostic imaging with a dedicated doctor review queue.
- **Self-Reported Symptoms & Vitals**: Home blood pressure, blood glucose, and symptom logging visualized with interactive charts.

### 4. Care Plans & Notification Engine
- Structured care plans with actionable goals, follow-up milestones, and medication schedules.
- Notification processor utilizing PostgreSQL `FOR UPDATE SKIP LOCKED` claiming to prevent race conditions across Web Push and Email channels.

### 5. Hospital Administrator Dashboard
- Aggregate operational metrics: today's outpatient volume, pending report reviews, follow-up adherence, and bed occupancy.
- Departmental workload distribution charts.
- Access audit log monitor displaying staff authentications and emergency break-glass alerts (strictly counts and audit metadata; zero individual clinical charts).

### 6. PWA & Offline Resilience
- Progressive Web App (PWA) installable on desktop and mobile devices.
- Network status detection notifying clinicians and patients when running in offline mode.
- Strict service-worker caching exclusions to ensure no medical data is cached on disk.

---

## 🛠 Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend Framework** | [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/) (Strict Mode) |
| **Build Tool & Bundler** | [Vite 8](https://vitejs.dev/) + [`@tailwindcss/vite`](https://tailwindcss.com/) + [`vite-plugin-pwa`](https://vite-pwa-org.netlify.app/) |
| **Styling & Components** | [Tailwind CSS v4](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/) + [Lucide Icons](https://lucide.dev/) |
| **State & Data Fetching** | [TanStack React Query v5](https://tanstack.com/query/latest) |
| **Routing** | [React Router v7](https://reactrouter.com/) |
| **Forms & Validation** | [React Hook Form](https://react-hook-form.com/) + [Zod](https://zod.dev/) |
| **Internationalization** | [i18next](https://www.i18next.com/) + [react-i18next](https://react.i18next.com/) (English & Malayalam) |
| **Data Visualization** | [Recharts v3](https://recharts.org/) |
| **Backend & Database** | [Supabase](https://supabase.com/) (PostgreSQL 15+, Row-Level Security, GoTrue Auth with MFA/2FA, Storage, Edge Functions) |
| **Automated Testing** | [Vitest](https://vitest.dev/) (Unit/Integration) + [Playwright](https://playwright.dev/) (E2E) + [pgTAP](https://pgtap.org/) (Database RLS) |

---

## 📂 Repository Structure

```text
CareOne/
├── .github/
│   └── workflows/
│       └── keepalive.yml           # Scheduled repository heartbeat workflow
├── docs/
│   ├── ARCHITECTURE.md             # Full system specification and security architecture
│   ├── DEPLOY.md                   # Production deployment guide (Cloudflare & Supabase)
│   ├── PROGRESS.md                 # Implementation roadmap and phase tracking
│   └── review/                     # Audit reports, live verification logs, and screenshots
├── public/
│   ├── _headers                    # Cloudflare Pages security headers (CSP, HSTS, XFO)
│   ├── hospital-logo.svg           # Official hospital branding asset
│   └── version.json                # Automated build timestamp and commit stamp
├── scripts/
│   ├── check-i18n.js               # CI script verifying 100% English-Malayalam key parity
│   ├── inspect-live-now.cjs        # Automated headless browser diagnostic script
│   └── test-viewports.cjs          # Multi-viewport responsive layout verification (390px-1920px)
├── src/
│   ├── app/
│   │   ├── App.tsx                 # Root application component with startup checks
│   │   └── routes.tsx              # Application route definitions and guards
│   ├── components/                 # Shared UI components (Modals, Badges, Header, Guards)
│   ├── features/
│   │   ├── admin/                  # Admin dashboard, department manager, staff directory
│   │   ├── auth/                   # Staff sign-in, MFA TOTP verification, password reset
│   │   ├── desk/                   # Front desk patient registration, appointment booking
│   │   ├── doctor/                 # Clinical chart, notes, addenda, review queue, timeline
│   │   └── patient/                # Patient dashboard, records, symptoms, vitals, care plans
│   ├── lib/
│   │   └── supabase.ts             # Supabase client initialization & remote address validation
│   ├── locales/
│   │   ├── en.json                 # English language strings (446 keys)
│   │   └── ml.json                 # Malayalam language strings (446 keys)
│   └── types/
│       └── database.ts             # Strongly typed database schemas generated from Postgres
├── supabase/
│   ├── config.toml                 # Local Supabase CLI configuration
│   ├── seed.sql                    # Evergreen demo seed data with pre-seeded TOTP factors
│   ├── functions/                  # Deno Edge Functions (invite-staff, invite-patient)
│   ├── migrations/                 # Postgres migrations (RLS, schema, triggers, views)
│   └── tests/database/             # pgTAP test suites for access rules and security policies
├── tests/
│   ├── csp.test.ts                 # Security header & CSP test suite
│   ├── deploy-config.test.ts       # Cloudflare & Vercel deployment configuration tests
│   ├── features/                   # Component and feature integration test suites
│   └── setup.ts                    # Vitest environment setup and mocks
├── AGENTS.md                       # Architectural rules, security invariants, and coding conventions
├── package.json                    # Project dependencies and script declarations
├── vite.config.ts                  # Vite build configuration, PWA setup, and backend url validator
└── vercel.json                     # Vercel deployment rules and security headers
```

---

## 📖 Documentation & Governance

The platform's engineering rules and architectural standards are documented in detail:

| Document | Description |
| :--- | :--- |
| [`AGENTS.md`](./AGENTS.md) | **Inviolable Rules**: Security constraints, DPDP standards, local-first Supabase workflow, credential safety, and zero-compromise conventions. |
| [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) | **System Architecture**: Complete technical blueprint, database schemas, Row-Level Security policies, and access matrices. |
| [`docs/PROGRESS.md`](./docs/PROGRESS.md) | **Progress Tracker**: Verification checklist for all completed build phases, demo accounts, and architectural decisions. |
| [`docs/DEPLOY.md`](./docs/DEPLOY.md) | **Deployment Guide**: Comprehensive guide for configuring and deploying frontend assets to Cloudflare Pages and Supabase. |

---

## 👥 Fictional Demo Accounts

The project includes evergreen demo seed data (`supabase/seed.sql`) formulated with dynamic timestamps relative to execution time (`current_date`, `now()`).

### Demo Credentials
> **Universal Password for all demo accounts**: `DemoPassword123!`  
> **Universal Pre-seeded MFA TOTP Secret**: `JBSWY3DPEHPK3PXR`

| Role | Email Address | Display Name | Permissions & Demo Scenario |
| :--- | :--- | :--- | :--- |
| **Hospital Admin** | `admin@example.com` | Anand Verma | Operational counts, department configurations, staff invites, and access log audits. Zero individual clinical chart access. |
| **Front Desk** | `desk@example.com` | Anjali Nair | Patient registration, scheduling appointments, sending app invites. |
| **Doctor (General Medicine)** | `dr.rahul@example.com` | Dr. Rahul Sharma | Primary care physician for Arun Kumar. Full clinical chart access, notes, addenda, and Kerala diet counseling. |
| **Doctor (Cardiology)** | `dr.anjali@example.com` | Dr. Anjali Menon | Referral specialist with active care team relationship for Arun Kumar. |
| **Doctor (Orthopedics)** | `dr.thomas@example.com` | Dr. Thomas Varghese | **Zero link to Arun Kumar**. Used to demonstrate clinical access boundaries and the 4-hour emergency "Break-Glass" prompt. |
| **Patient** | `arun.kumar@example.com` | Arun Kumar (48) | Complete medical history: Type 2 Diabetes, home BP logs, prescription list, and diet guidance. |
| **Guardian** | `sujatha.kumar@example.com` | Sujatha Kumar | Authorized guardian for Baby Meenakshi (pediatric health records). |

---

## 💻 Getting Started & Local Setup

### Prerequisites
- [Node.js](https://nodejs.org/) (Version `>= 20.0.0`)
- [Docker Desktop](https://www.docker.com/) (Must be running for local Supabase)
- [Supabase CLI](https://supabase.com/docs/guides/cli)

### Installation & Launch
```bash
# 1. Clone the repository
git clone https://github.com/itsmesyaam/CARE-ONE-.git
cd CARE-ONE-

# 2. Install project dependencies
npm install

# 3. Start local Supabase container stack
npx supabase start

# 4. Apply database schema migrations and seed demo data
npm run demo:reset

# 5. Start local Vite development server
npm run dev
```

* The web application will be accessible at: `http://localhost:5173`
* Local Supabase Studio dashboard: `http://localhost:54323`
* Local Inbucket email testing inbox: `http://localhost:54324`

---

## 📜 Available npm Scripts

| Script | Command | Purpose & Description |
| :--- | :--- | :--- |
| `npm run dev` | `vite` | Starts the local Vite development server with Hot Module Replacement (HMR). |
| `npm run build` | `tsc --noEmit && vite build` | Typechecks the entire TypeScript codebase in strict mode, validates backend production URLs, and builds the production SPA bundle into `dist/`. |
| `npm run preview` | `vite preview` | Locally serves the compiled production build from `dist/` to preview the production app. |
| `npm run typecheck` | `tsc --noEmit` | Runs the TypeScript compiler in strict mode without emitting files to verify complete type safety. |
| `npm run lint` | `eslint .` | Runs ESLint across all files to catch code quality, syntax, and React hook rule violations. |
| `npm run format` | `prettier --check .` | Verifies that all repository files adhere to Prettier formatting standards. |
| `npm run format:fix`| `prettier --write .` | Automatically formats all source code, markdown, and configuration files using Prettier. |
| `npm test` | `vitest run` | Runs all Vitest unit and integration test suites and outputs a summary. |
| `npm run i18n:check`| `node scripts/check-i18n.js` | Audits translation keys between `en.json` and `ml.json` to verify 100% key parity (currently 446 keys). |
| `npm run demo:reset`| `supabase db reset` | Resets the local PostgreSQL database, runs all migrations sequentially, and applies `supabase/seed.sql`. |

---

## 🔒 Security, Privacy & RLS Policies

CareOne implements defense-in-depth security at both the database and network layers:

1. **Row-Level Security (RLS)**: Every single table in the `public` schema has Row-Level Security enabled with explicit policies. No public or anonymous access is permitted to patient records.
2. **Helper Functions in `private` Schema**: Roles are evaluated using secure functions in the `private` schema (`private.get_staff_role()`, `private.has_patient_access()`) rather than modifiable client JWT metadata.
3. **Anti-IDOR Storage Path Constraint**: Patient documents in Supabase Storage enforce strict path prefix matching:
   ```sql
   CHECK (storage_path LIKE (patient_id::text || '/%'))
   ```
   Users cannot access or upload files belonging to another patient.
4. **Rate Limiting**: Sliding-window rate limiters prevent abuse on sensitive endpoints (e.g., invitations are capped at 10 requests per 5 minutes per actor).
5. **Security Headers**: Production deployments enforce strict HTTP headers:
   * `Content-Security-Policy`: Restricts scripts, styles, fonts, frames, and connections strictly to trusted endpoints (`self`, Supabase project origin, Google Fonts, Cloudflare Turnstile).
   * `Strict-Transport-Security`: `max-age=31536000; includeSubDomains; preload`
   * `X-Frame-Options`: `DENY`
   * `X-Content-Type-Options`: `nosniff`
   * `Referrer-Policy`: `strict-origin-when-cross-origin`

---

## ☁ Deployment Architecture

CareOne is designed for static hosting on **Cloudflare Pages** or **Vercel**, connecting securely to a **Supabase** backend.

### Cloudflare Pages / Workers Environment Variables
When deploying to Cloudflare, configure the following build environment variables in the Cloudflare Dashboard (**Settings > Environment variables**):

| Variable | Description | Example / Production Value |
| :--- | :--- | :--- |
| `VITE_SUPABASE_URL` | Supabase Project URL | `https://kndkohgpbnbbndvtgqvx.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Public / Anon Supabase API Key | `<your-supabase-publishable-anon-key>` |
| `NODE_VERSION` | Node.js runtime version | `20` |

*Build Command*: `npm run build`  
*Build Output Directory*: `dist`

---

*CareOne Hospital Platform — Engineering clinical integrity, strict patient privacy, and seamless healthcare delivery.*
