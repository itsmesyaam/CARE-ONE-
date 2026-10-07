# CareOne Hospital Platform 🏥

> *"We are not trying to replace your hospital management system. We are building your hospital's digital healthcare companion — a platform that gives your doctors a complete picture of their patients and keeps your patients connected to the hospital between visits."*

CareOne is an enterprise-grade, privacy-first patient engagement and doctor assistant web application engineered for hospitals in Kerala, India. It provides clinical continuity between outpatient visits while upholding strict compliance with India's **Digital Personal Data Protection (DPDP) Act 2023** and modern healthcare privacy standards.

---

## 📑 Table of Contents

- [Core Principles & Architectural Highlights](#-core-principles--architectural-highlights)
- [System Architecture & Stack](#-system-architecture--stack)
- [User Roles & Security Boundary](#-user-roles--security-boundary)
- [Key Features](#-key-features)
- [Security Hardening & Audit Remediations](#-security-hardening--audit-remediations)
- [Bilingual Support (English & Malayalam)](#-bilingual-support-english--malayalam)
- [Demo Accounts & Walkthrough](#-demo-accounts--walkthrough)
- [Local Development & Testing](#-local-development--testing)
- [Connecting & Deploying to Remote Supabase](#-connecting--deploying-to-remote-supabase)
- [Repository Branches & Pushing to GitHub](#-repository-branches--pushing-to-github)

---

## 🔒 Core Principles & Architectural Highlights

1. **Strict Clinical Privacy & Zero Admin Snooping**:
   - Hospital Administrators have access **only** to aggregated operational metrics (counts of appointments, workload distributions, audit event logs).
   - Admins **never** see individual patient names, medical histories, diagnosis notes, or clinical files.
2. **Clinical Care Team Boundary**:
   - A doctor can only access records for patients on their active care team (established via appointment booking, valid for 1 year).
   - Non-care-team doctors attempting access are blocked. In acute situations, emergency **break-glass access** can be invoked for 4 hours with mandatory clinical justification and immutable audit logging.
3. **Signed Encounters are Immutable**:
   - Once a consultation note is signed, it is frozen at the database engine level via triggers.
   - Amendments must be recorded as separate, timestamped `encounter_addenda`. Hard deletes of clinical records are strictly blocked.
4. **Zero Client-Side Trust & Strict RLS**:
   - Every single database table in the `public` schema has Postgres Row-Level Security (RLS) enabled.
   - All roles and permissions are evaluated server-side via helper functions in the `private` schema. Client-supplied IDs in request payloads cannot alter permissions.
5. **Two-Factor Authentication (AAL2 TOTP)**:
   - Mandatory for all hospital staff (Admin, Doctor, Front Desk) to access clinical and administrative tools.

---

## 🛠 System Architecture & Stack

- **Frontend**:
  - React 19 + TypeScript (Strict mode, zero `any`).
  - Vite + `vite-plugin-pwa` (Progressive Web App with offline connectivity detection).
  - Tailwind CSS + accessible focus rings (WCAG 2.1 AA compliant).
  - TanStack Query (React Query) for state management and cache invalidation.
  - React Router 7 SPA.
  - `react-i18next` for 100% symmetric English & Malayalam localization.
  - Recharts for administrative and clinical trend visualizations.
- **Backend (Supabase)**:
  - PostgreSQL 15 with strict Row-Level Security policies.
  - Supabase Auth with TOTP MFA (`aal2` factor enforcement).
  - Supabase Storage with anti-IDOR path validation constraints.
  - Supabase Edge Functions (Deno runtime) for privileged workflows (`invite-staff`, `invite-patient`, `send-reminders`).
  - `pg_cron` & `pg_net` for background task scheduling.
- **Testing & Quality Assurance**:
  - Vitest + Testing Library for frontend component and integration tests.
  - pgTAP via `supabase test db` for database access rules and RLS policy verification.
  - Automated i18n key symmetry checking (`scripts/check-i18n.js`).
  - Playwright & Axe-Core for smoke testing and accessibility validation.

---

## 👥 User Roles & Security Boundary

| Role | Permitted Access | Restricted Access | MFA Required |
| :--- | :--- | :--- | :---: |
| **Patient / Guardian** | Own clinical timeline, prescribed medicines, appointments, documents, self-log vitals (`source = 'patient'`), dependent child profiles. | Other patients' records, staff management, administrative settings. | Optional |
| **Doctor** | Patients on active care team: encounters, history, allergies, medications, lab review queue, "What Changed" panel, break-glass emergency access. | Patients outside care team without break-glass; administrative staff credentials. | **Yes (AAL2)** |
| **Front Desk** | Patient directory search, registration (UHID generation), check-in, appointments booking, patient app invitations. | Clinical consultation notes, doctor medical charts, diagnosis text. | **Yes (AAL2)** |
| **Hospital Admin** | Operational dashboard counts, department & staff directory management, system audit logs, hospital branding. | **Zero individual patient clinical data.** Cannot read encounters, vitals, or medical files. | **Yes (AAL2)** |
| **Platform Team** | Database migrations and deployment infrastructure. | No routine access to patient medical records. | N/A |

---

## ⚡ Key Features

### 1. Patient Registration & Sequence UHID Generator
- Front desk registers patients with deterministic Unique Health Identification numbers (`ABC-0001`, `ABC-0002`, etc.).
- Verifies physical government ID via an affirmative checkmark without scanning or storing sensitive identity documents.

### 2. Doctor Chart & "What Changed" Summary
- **"What Changed Since Last Visit"**: A dedicated SQL aggregation engine (`public.what_changed`) analyzing lab reports uploaded, medication modifications, abnormal vital readings, missed care tasks, and patient symptom reports since the doctor's last consultation.
- **Timeline & Clinical Encounters**: Chronological medical history with signed consultation notes and addenda.
- **Vitals & Observations**: Real-time trend charts tracking metrics (e.g. HbA1c curves, blood pressure readings) distinguishing doctor-verified vs. patient-logged sources.

### 3. Patient Portal & Mobile Companion (PWA)
- Schedule of medications grouped by time of day (Morning, Afternoon, Evening, Night).
- One-tap logging for home blood pressure and blood sugar readings.
- Instant switching between guardian profile and dependent children (e.g., pediatric profiles).
- Offline banner warning when internet connectivity is lost, ensuring stale or uncommitted updates are never silently dropped.

### 4. Lab Reports Review Queue & Anti-IDOR Storage
- Secure document uploads stored in private `patient-files` bucket.
- Storage paths strictly verified at the database level against patient IDs (`<patient_id>/<filename>`).
- Dedicated doctor review queue to accept, annotate, and integrate patient-uploaded reports into charts.

### 5. Automated Care Plans & Reminders
- Dynamic care plans created by doctors with scheduled follow-up actions.
- Reminder engine using `FOR UPDATE SKIP LOCKED` claiming to prevent duplicate notifications across web push and email.

### 6. Hospital Admin Operational Dashboard & Access Log
- Real-time operational metric cards (Today's Appointments, Follow-ups Due, Reports Waiting Review, Monthly Consultations).
- Operational workload distribution charts and patient app engagement ratios.
- Tamper-evident Access Log displaying audit events, staff logins, and emergency access highlights.

---

## 🛡 Security Hardening & Audit Remediations

A comprehensive pre-production application and backend security audit was conducted, resulting in several layers of defense-in-depth hardening:

1. **Anti-IDOR Storage Path Constraint**:
   - Added `CHECK (storage_path LIKE (patient_id::text || '/%'))` to `public.documents`.
   - Updated `storage.objects` SELECT and INSERT policies to prevent users or compromised clients from uploading or viewing documents outside their designated patient folder.
2. **Hard Delete Prohibition on Clinical Data**:
   - Replaced permissive `ALL` policies on `allergies`, `conditions`, `medications`, and `observations` with explicit `SELECT`, `INSERT`, and `UPDATE` policies for care-team doctors, disallowing permanent deletions.
3. **Privilege Revocation on Automated RPCs**:
   - Revoked public/anon/authenticated execution rights on `public.claim_due_reminders` and `public.generate_daily_medicine_reminders`, granting execution strictly to `service_role` (background cron jobs).
4. **Edge Function Caller Rate Limiting**:
   - Built a sliding window rate limiter in `supabase/functions/_shared/rate-limit.ts` restricting invitation dispatch (`invite-staff`, `invite-patient`) to 10 requests per 5 minutes per actor, returning `429 Too Many Requests` with `Retry-After` headers.
5. **Production CORS Origin Enforcement**:
   - Gated `getAllowedOrigin()` in Edge Functions so production environments strictly enforce `ALLOWED_ORIGIN` or the verified hospital domain (`https://careone.pages.dev`), disallowing `localhost` fallbacks.
6. **Session Termination & Header Sign-Out**:
   - Added a prominent, accessible sign-out button in the `AdminDashboard` header that invalidates Supabase sessions, clears the TanStack Query client cache, and redirects safely.
7. **Client Route Guards & Error Sanitization**:
   - Guarded sensitive admin routes (`AdminRouteGuard`) with active session checks.
   - Sanitized UI error displays to prevent leaking raw PostgreSQL constraint names, syntax errors, or schema structures.
8. **HTTP Security Headers**:
   - Enforced strict Content Security Policy (CSP), HTTP Strict Transport Security (HSTS 1 year), `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, and restricted `Permissions-Policy`.
   - Zero clinical data caching in PWA service worker configurations.

---

## 🌐 Bilingual Support (English & Malayalam)

CareOne is built from the ground up with native support for **English** and **Malayalam (മലയാളം)**:
- 100% key symmetry verified by automated CI checks (`npm run i18n:check`).
- Dynamic language switcher preserved across sessions.
- Medical terminology, consent forms, and UI feedback provided with culturally accurate translations.

---

## 🧪 Demo Accounts & Walkthrough

The platform includes evergreen demo seed data (`supabase/seed.sql`) formulated with dynamic dates relative to execution time (`current_date`, `now()`).

### Demo Credentials (All passwords: `DemoPassword123!`)

| Role | Email | Name | Notes |
| :--- | :--- | :--- | :--- |
| **Hospital Admin** | `admin@example.com` | Anand Verma | Access to operational counts, staff management, audit log. |
| **Front Desk** | `desk@example.com` | Anjali Nair | Patient registration, check-ins, appointments. |
| **Doctor (General Medicine)** | `dr.rahul@example.com` | Dr. Rahul Sharma | Primary doctor for Arun Kumar; full chart access. |
| **Doctor (Cardiology)** | `dr.anjali@example.com` | Dr. Anjali Menon | Referral doctor with scheduled visit for Arun Kumar. |
| **Doctor (Orthopedics)** | `dr.thomas@example.com` | Dr. Thomas Varghese | **Zero link to Arun Kumar** (demonstrates clinical boundary & break-glass prompt). |
| **Patient** | `arun.kumar@example.com` | Arun Kumar (48) | Complete history: diabetes, worsening HbA1c, home BP logs. |
| **Guardian** | `sujatha.kumar@example.com` | Sujatha Kumar | Arun's spouse; guardian for Baby Meenakshi (pediatric chart). |

*Note: All demo staff accounts have pre-seeded, persistent TOTP factors in `auth.mfa_factors` for seamless testing.*

---

## 🚀 Local Development & Testing

### Prerequisites
- [Node.js](https://nodejs.org/) (>= 20.0.0)
- [Docker Desktop](https://www.docker.com/) (running)
- [Supabase CLI](https://supabase.com/docs/guides/cli)

### Quick Start
```bash
# 1. Install dependencies
npm install

# 2. Start local Supabase container stack
npx supabase start

# 3. Apply all migrations and seed demo data
npm run demo:reset

# 4. Start local Vite development server
npm run dev
```

The app will be available at `http://localhost:5173`.
Local Supabase Studio is available at `http://localhost:54323`.
Local Inbucket (email inbox) is available at `http://localhost:54324`.

### Verification Suite
Run all automated quality and security checks:
```bash
# Typecheck TypeScript (strict mode)
npm run typecheck

# Run ESLint
npm run lint

# Run Vitest unit & integration tests
npm test

# Verify bilingual i18n symmetry (English & Malayalam)
npm run i18n:check

# Run pgTAP database security & RLS test suites
npx supabase test db

# Verify production Vite build
npm run build
```

---

## ☁ Connecting & Deploying to Remote Supabase

### 1. Frontend Configuration
Set your remote project credentials in `.env.local` (this file is gitignored):
```dotenv
VITE_SUPABASE_URL=https://<YOUR_PROJECT_ID>.supabase.co
VITE_SUPABASE_ANON_KEY=<YOUR_PUBLISHABLE_ANON_KEY>
```

### 2. Pushing Database Schema & Migrations
To push all database tables, security definer functions, triggers, and Row-Level Security policies to your remote Supabase project:
```bash
# Login to Supabase CLI
npx supabase login

# Link your local repository to your remote project
npx supabase link --project-ref <YOUR_PROJECT_ID>

# Push migrations to the remote database
npx supabase db push
```

### 3. Deploying Edge Functions
```bash
# Set production secrets
npx supabase secrets set ALLOWED_ORIGIN="https://careone.pages.dev" ENVIRONMENT="production"

# Deploy Edge Functions
npx supabase functions deploy invite-staff
npx supabase functions deploy invite-patient
npx supabase functions deploy send-reminders
```

---

## 🚀 Repository Branches & Pushing to GitHub

All latest security audit remediations, rate limiting, and navigation enhancements are committed on the feature branch:
```text
security-audit-remediation
```

### Pushing Changes to Remote
To push the committed changes to your GitHub repository:
```bash
# Push the feature branch to GitHub
git push origin security-audit-remediation

# Or merge and push to main
git checkout main
git merge security-audit-remediation
git push origin main
```

---

*CareOne Healthcare Platform — Built with security, clinical integrity, and patient dignity at the core.*
