# Codebase Cleanup Audit Report

This document records all unused, redundant, and temporary artifacts identified for removal, along with the evidence supporting their removal and the specific action taken.

---

## Cleanup Inventory

| Item | Type | Why It Is Unused (Evidence) | Action Taken |
|---|---|---|---|
| `src/features/doctor/api.ts` | Source File | Defines `fetchWhatChanged()`. Never imported by any file; `DoctorChart.tsx` calls `apiFetch()` directly via TanStack Query. | Deleted file. |
| `src/components/ConfigBanner.tsx` | Component | Legacy empty component returning `null` (previously used for external config warnings). | Removed references from `RootLayout.tsx` and `SignInPage.tsx`; deleted file. |
| Empty `.gitkeep` files in `src/features/*` (`desk`, `auth`, `admin`, `doctor`, `patient`) | Scaffold files | Directories already contain active `.ts` / `.tsx` source files, rendering `.gitkeep` redundant. | Deleted redundant `.gitkeep` files. |
| Leftover `/vite.svg` favicon link in `index.html` | HTML Link | References `/vite.svg`, which does not exist in `public/`. | Removed link tag from `index.html`. |
| `src/features/doctor/mock.ts` (dead exports) | Dead Code | Exports `MOCK_CLINIC_SCHEDULE`, `MOCK_WAITING_REPORTS`, `MOCK_WAITING_SYMPTOMS`, `IS_MOCK_DATA`, `MOCK_DIRECTORY_PATIENTS` and unused interfaces (`PatientSignals`, `ClinicPatient`, `WaitingReportItem`, `WaitingSymptomItem`, `DirectoryPatient`). Only `MOCK_DOCTOR` is imported in `DoctorLayout.tsx`. | Pruned dead exports and types; retained `MOCK_DOCTOR`. |
| 39 Unused Translation Keys | Localization | Symmetrically present in `en.json` and `ml.json` but not referenced anywhere in `src/` (e.g. `home.enterPortal`, `nav.switchTo*`, `config.notice*`, `doctorComposer.*`). | Symmetrically removed from both `en.json` and `ml.json`. Verified with `npm run i18n:check` and `tests/i18n.test.ts`. |
| 20 Temporary Scratch Scripts in `scripts/` (`capture-*.cjs`, `verify-live*.cjs`, `inspect-*.cjs`, `extracted-template.html`, etc.) | Temporary Scripts | One-off scratch scripts created during earlier manual debugging and screenshot collection. None are referenced in `package.json` or tests. | Deleted scratch files; preserved official scripts (`check-i18n.js`, `reset-demo-d1.js`, `verify-live-task10.cjs`). |
| `.gitignore` | Configuration | Missing explicit entry for `coverage/` directory generated during test coverage analysis. | Added `coverage/` to `.gitignore`. |

---

## Preserved Assets (Not Deleted)

The following were verified and deliberately preserved:
1. **Migrations & Seed Data**: All files in `migrations/` (`0001_initial_schema.sql`, `0002_seed_demo_data.sql`, `0003_staff_auth_credentials.sql`).
2. **Drizzle ORM Schema**: `worker/db/schema.ts` and `worker/db/client.ts` defining the database schema and types required by `AGENTS.md`.
3. **Design & Specification Documents**: `design/`, `docs/adr/`, `AGENTS.md`, `docs/ARCHITECTURE.md`, `docs/DEPLOY.md`.
4. **Stack Dependencies in `package.json`**: `clsx`, `tailwind-merge`, `zod`, `react-hook-form`, `drizzle-orm`, `drizzle-kit`, `@cloudflare/vitest-pool-workers` explicitly mandated by `AGENTS.md`.
