# CareOne Hospital Platform — Progress Tracking

## Phase 1: Foundation (Completed)
- **App Scaffolding & Strict Tooling**: Vite + React + strict TypeScript, Tailwind CSS, TanStack Query, React Router SPA, react-i18next (en/ml), Vitest, ESLint flat config, Prettier.
- **Local Supabase & Auth**: Local Supabase stack configured via `supabase/config.toml` (`enable_signup = false`, `jwt_expiry = 900`, TOTP MFA enabled). Client templates in `.env.example` and local `.env.local` kept gitignored.
- **Foundation Schema & Access Controls**:
  - `private` schema with security definer helpers (`search_path = ''`).
  - Tables: `hospital_settings`, `departments`, `staff` (with role check), `patients`, `patient_access`, `care_team`, `emergency_access`, append-only `audit_log`.
  - Restrictive 2FA policies enforcing `aal2` for all staff data access.
  - Break-glass 4-hour `request_emergency_access` RPC with audit logging.
  - Audit triggers capturing inserts, updates, and deletes across sensitive tables.
  - Database types generated in `src/types/database.ts`.
- **Testing & Reset**:
  - pgTAP test suite in `supabase/tests/database/foundation.test.sql` passing.
  - `npm run demo:reset` command resets schema and reapplies migrations.

## Phase 2: App Shell, Design and Branding (Current Phase)
- **Goal**: Establish consistent, polished, hospital-branded UI shell across mobile and desktop.
- **Target deliverables**:
  - `hospital_settings` table update (short code, logo path, primary and accent colours, casualty phone, time zone) + security-definer RPC `public.get_public_hospital_settings()`.
  - CSS variables loaded from branding settings. Self-hosted Inter and Noto Sans Malayalam fonts via Fontsource.
  - Mobile-first layout with bottom navigation for patients (Home, Records, Plan, Profile).
  - Desktop sidebar for staff adapting dynamically by role (Doctor, Front Desk, Admin).
  - Language switcher between English and Malayalam persisted locally.
  - Shared UI components: page header, loading skeletons, empty states, error state with retry, confirm dialog, toasts.
  - Role-based route guards in the SPA.
  - Staff idle lock after 10 minutes.
  - PWA configuration (installable on Android, app shell cached only).
  - Script `npm run i18n:check` validating translation parity between `en.json` and `ml.json`.
