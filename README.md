# CareOne Hospital Platform 🏥

[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61dafb.svg)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8-646cff.svg)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38bdf8.svg)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-Proprietary-red.svg)]()

**CareOne** is a patient‑engagement and doctor‑assistant web application built for a hospital in Kerala, India. It stores health records under India’s DPDP Act, enforcing strict confidentiality, purpose limitation, and immutable audit logging.

---

## 📑 Table of Contents
1. [What CareOne is + Live URL](#what-careone-is--live-url)
2. [Current status](#current-status)
3. [Architecture diagram](#architecture-diagram)
4. [Security model](#security-model)
5. [Sign‑in flows](#sign‑in-flows)
6. [Tech stack](#tech-stack)
7. [Repository structure](#repository-structure)
8. [Local setup (Windows)](#local-setup-windows)
9. [Demo accounts](#demo-accounts)
10. [npm scripts](#npm-scripts)
11. [Testing](#testing)
12. [Deployment](#deployment)
13. [Backups & restore](#backups--restore)
14. [Free‑plan limits](#free‑plan-limits)
15. [Compliance notes](#compliance-notes)
16. [Roadmap / next steps]

---

## 🌟 What CareOne is + Live URL
CareOne is a modern, bilingual (English / Malayalam) web app that lets patients, guardians, doctors, front‑desk staff and hospital admins safely view and manage health information. Live demo: <https://care-one.pages.dev>

---

## ✅ Current status
- **Implemented**: Passkey‑only patient sign‑in, staff passkey + TOTP, demo‑signin (local only), full UI for registration, appointments, doctor chart, care plans, reminders, report uploads, "What changed" view, PWA install.
- **Removed**: All one‑time‑code (OTP) flows – SMS/email codes, "From Messages / Tap to fill" box, code‑entry screens, and the `auth_otps` table.
- **In‑progress**: Minor UI polish, removal of demo‑signin button from production build.
- **All tests**: 216 unit + pgTAP tests pass.

---

## 🏗️ Architecture diagram
```
Cloudflare Pages   <-- static files -->   React SPA
        |                                   |
        v                                   v
Cloudflare Workers (Edge Functions) <-- API --> Supabase D1 (DB) + Storage (FILES_DB)
        |
        v
Resend (email) & Turnstile (bot protection)
```
The Worker hosts the `/api/*` routes, performs passkey registration/login, audit logging and demo‑signin.

---

## 🔐 Security model
1. **Request flow** → Session cookie → Principal (user ID, role, AAL) → Policy (Row‑Level Security) → Data layer.
2. **Access matrix**: policies in `private` schema (`my_profile_patient_ids`, `my_care_patient_ids`, etc.) enforce per‑role visibility.
3. **Immutable audit log** records every view, sign‑in, passkey registration/revocation, and failed attempts.
4. **No patient data** appears in URLs, logs, console, push payloads, or Service‑Worker cache.
5. **Headers**: CSP, HSTS, X‑Frame‑Options, Referrer‑Policy, etc. (see `public/_headers`).

---

## 🔑 Sign‑in flows
- **Patient**: Desk creates a setup link → QR code → patient scans, creates a WebAuthn passkey → session cookie (30 d). No OTP.
- **Staff**: Admin creates staff → one‑time setup link → passkey registration **and** enrols an authenticator app (TOTP). After passkey, routes require `aal2` (TOTP) → 401 `mfa_required` until verified.
- **Demo sign‑in**: Local‑only `/api/auth/demo-signin` returns a short‑lived JWT for any demo role. Disabled in production.
- **Recovery**: Desk or admin revokes a passkey, issues a new setup link after ID check.

---

## 🛠️ Tech stack
| Layer | Technology |
|------|------------|
| Frontend | React 19, TypeScript 5.8.3, Vite 8.3.3, Tailwind 4, shadcn/ui, TanStack Query 5, React Router 7, React Hook Form 7, Zod 4 |
| Auth & Backend | Cloudflare Workers (Deno), @simplewebauthn/server ^14.0.3, @simplewebauthn/browser ^14.0.0 |
| Database | Supabase D1 (PostgreSQL 15) with Row‑Level Security, Edge Functions (Deno) |
| Email | Resend |
| Bot protection | Cloudflare Turnstile |
| Testing | Vitest, pgTAP, Playwright |
| CI/CD | GitHub Actions, Wrangler (v4.149.0) |

---

## 📂 Repository structure
```text
CareOne/
├─ .github/               # GitHub workflows (CI, deploy, backup)
├─ docs/                  # ARCHITECTURE.md, PROGRESS.md, etc.
├─ public/                # _headers, version.json, assets
├─ scripts/               # helper scripts (i18n check, viewport tests)
├─ src/
│   ├─ app/               # App.tsx, routes.tsx (guards, layout)
│   ├─ components/       # UI primitives, modals, guards
│   ├─ features/          # admin, auth, desk, doctor, patient
│   ├─ lib/               # auth helpers, query client
│   ├─ locales/           # en.json, ml.json
│   └─ types/             # generated DB types
├─ worker/                # Cloudflare Worker entry, routes (passkey.ts, auth.ts)
├─ .gitignore
├─ AGENTS.md               # immutable security & workflow rules
├─ package.json
├─ vite.config.ts
├─ wrangler.jsonc
└─ README.md               # **this file**
```

---

## 🖥️ Local setup (Windows)
1. Install **Node >=20** and **Docker Desktop**.
2. Install Supabase CLI: `npm i -g supabase`.
3. Clone the repo:
   ```bash
   git clone https://github.com/itsmesyaam/CARE-ONE-.git
   cd CARE-ONE-
   ```
4. Install dependencies: `npm install`.
5. Start Supabase stack: `npx supabase start`.
6. Apply migrations & seed fake data: `npm run demo:reset` (runs `supabase db reset && supabase db push && supabase db seed`).
7. Run the dev server: `npm run dev` (Vite at <http://localhost:5173>). The Worker runs automatically via `wrangler dev` when you start the dev server.
8. Environment variables: copy `.dev.vars.example` to `.dev.vars` and fill placeholder values (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `JWT_SECRET`, `RP_ID`).

---

## 👥 Demo accounts (local only)
| Role | Email | Password | TOTP secret |
|------|-------|----------|-------------|
| admin | `admin@example.com` | `DemoPassword123!` | `JBSWY3DPEHPK3PXR` |
| front‑desk | `desk@example.com` | `DemoPassword123!` | `JBSWY3DPEHPK3PXR` |
| doctor | `dr.rahul@example.com` | `DemoPassword123!` | `JBSWY3DPEHPK3PXR` |
| patient | `arun.kumar@example.com` | `DemoPassword123!` | `JBSWY3DPEHPK3PXR` |
| guardian | `sujatha.kumar@example.com` | `DemoPassword123!` | `JBSWY3DPEHPK3PXR` |
> These accounts exist only in the local seed data and must not be used in production.

---

## 📜 npm scripts
| Script | Command | Purpose |
|--------|---------|---------|
| `dev` | `vite` | Start Vite dev server with HMR |
| `build` | `tsc --noEmit && vite build` | Type‑check and build production bundle |
| `preview` | `vite preview` | Serve the built bundle locally |
| `typecheck` | `tsc --noEmit` | Run TypeScript compiler in strict mode |
| `lint` | `eslint .` | Lint all source files |
| `format` | `prettier --check .` | Verify Prettier formatting |
| `format:fix` | `prettier --write .` | Auto‑format code |
| `test` | `vitest run` | Run unit & integration tests |
| `i18n:check` | `node scripts/check-i18n.js` | Ensure 100 % key parity between English & Malayalam |
| `demo:reset` | `supabase db reset && supabase db push && supabase db seed` | Reset local DB with demo data |
| `worker:dev` | `wrangler dev` | Run Cloudflare Worker locally |
| `worker:deploy` | `npm run build && wrangler deploy` | Deploy Worker to Cloudflare |
| `deploy` | `npm run build && wrangler deploy` | Build and deploy full app |

---

## 🧪 Testing
- **Unit tests**: Vitest (`npm test`).
- **Access‑matrix tests**: pgTAP (`supabase test db`).
- **End‑to‑end**: Playwright (`npm run test:e2e` if defined).
Run any individual suite with the appropriate npm script.

---

## 🚀 Deployment
1. Set Cloudflare Pages env vars (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`).
2. Set Worker secrets (`JWT_SECRET`, `RP_ID`, `ORIGIN`, `RESEND_API_KEY`).
3. Apply remote migrations: `wrangler d1 migrations apply DB --remote` and `... FILES_DB`.
4. Deploy: `npm run deploy` (wrangler publishes Worker and Cloudflare Pages).
5. Verify:
   - Health endpoint: `https://<your-domain>/api/health`
   - Version: `https://<your-domain>/version.json`

---

## 📦 Backups & restore
- **GitHub Action** `backup.yml` runs every 6 h: encrypted pg_dump → Cloudflare R2.
- **Restore check** runs monthly: restores latest dump into a temporary DB and validates row counts.
- Encryption uses `age`; the private key is held by two designated staff members (outside the repo).

---

## 📈 Free‑plan limits (Cloudflare & Supabase)
- **CPU**: 10 ms per request (Cloudflare Workers).
- **DB storage**: 500 MB per D1 database.
- **R2 storage**: 5 GB free.
- **Emails**: 100 / day via Resend (free tier).
- **Requests**: 100 k / day (Cloudflare Pages). 
*If limits are reached you can upgrade the Supabase plan, enable Point‑in‑Time Recovery, or request higher Cloudflare quotas.

---

## 📜 Compliance notes
- DPDP Act 2023 & related rules are honoured: consent before first use, audit‑log retention ≥ 1 year, encrypted backups, data never leaves India (Supabase Mumbai, R2). 
- This documentation is **not legal advice**; have the hospital’s counsel review the implementation.

---

## 🗺️ Roadmap / next steps
- **V2**: AI‑generated "What changed" narration (read‑only). 
- **Video consultations** & **staff‑patient messaging** (post‑V2). 
- **Multi‑hospital tenancy** (separate Supabase projects). 
- **UI polish**: finalize responsive design, eliminate demo‑signin button from production build. 
- **Performance**: monitor Worker latency, add caching where safe.

---

*CareOne Hospital Platform – engineered for safety, privacy and a smooth patient experience.*
