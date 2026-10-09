# CareOne Hospital Platform — Progress Tracking

## Phase 1: Foundation (Completed)
- **App Scaffolding & Strict Tooling**: Vite + React + strict TypeScript, Tailwind CSS, TanStack Query, React Router SPA, react-i18next (en/ml), Vitest, ESLint flat config, Prettier.
- **Local Database & Auth**: Local database and auth stack configured. Environment templates in `.env.example` and local `.dev.vars` kept gitignored.
- **Foundation Schema & Access Controls**:
  - `private` schema with security definer helpers (`search_path = ''`).
  - Tables: `hospital_settings`, `departments`, `staff` (with role check), `patients`, `patient_access`, `care_team`, `emergency_access`, append-only `audit_log`.
  - Restrictive 2FA policies enforcing `aal2` for all staff data access.
  - Break-glass 4-hour `request_emergency_access` RPC with audit logging.
  - Audit triggers capturing inserts, updates, and deletes across sensitive tables.
  - Database types generated for schema.
- **Testing & Reset**:
  - Test suite verifying access rules passing.
  - `npm run demo:reset` command resets schema and reapplies migrations.

## Phase 2: App Shell, Design and Branding (Completed)
- `hospital_settings` singleton table with branding RPC `public.get_public_hospital_settings()`.
- Dynamic hospital branding tokens, theme CSS, and typography.
- Mobile bottom navigation and responsive desktop staff sidebar.

## Phase 3: Admin & Front Desk (Completed)
- Department management (create, edit, archive).
- Front desk patient registration with sequence UHID generator (`ABC-NNNN`) and ID checked checkbox (never storing ID numbers).
- Edge Functions `invite-staff` and `invite-patient` with AAL2 MFA enforcement.
- Appointments scheduling with automatic 1-year care team link trigger.
- Immutable privacy consents in English and Malayalam.

## Phase 4: Doctor Chart & Clinical Workflow (Completed)
- Tables: `encounters`, `encounter_addenda`, `conditions`, `allergies`, `medications`, `observations`.
- Freeze trigger preventing modification of signed clinical encounters.
- Emergency break-glass access RPC requiring written reason of at least 15 characters.
- Audit logging for chart views (`VIEWED_CHART`).
- `patient_timeline` view with `security_invoker = true`.

## Phase 5: Reports, Storage & Review Queue (Completed)
- Private `patient-files` storage bucket with 10 MB limit and strict mime type validation.
- Row-level security on storage objects following document permissions.
- Doctor review queue for patient uploads.

## Phase 6: Care Plans, Reminders & Patient Home (Completed)
- Tables: `care_plans`, `care_plan_items`, `reminders`, `push_subscriptions`, `symptom_reports`.
- Trigger automatically scheduling reminders for care plan items.
- Concurrency-safe reminder claiming RPC `public.claim_due_reminders` with `FOR UPDATE SKIP LOCKED`.
- Daily medicine reminder generation RPC `public.generate_daily_medicine_reminders`.
- Patient self-logging of vitals strictly enforced with `source = 'patient'`.

## Phase 7: "What Changed", Admin Dashboard & Access Log (Completed)
- **What Changed Panel**:
  - `public.what_changed(p_patient_id uuid)` security invoker function aggregating new lab reports, medication modifications, abnormal vital readings, missed tasks, and reported symptoms since last signed visit.
  - Doctor chart first panel component `WhatChangedPanel` with category badges, links to target records, IST time formatting, and empty states ("Nothing new since <date>" / "No previous visits").
- **Admin Operational Dashboard**:
  - `public.get_admin_dashboard_counts()` security definer RPC checking `admin` role and `aal2` MFA inside, returning operational counts only.
  - 6 metric cards: Today's Appointments, Follow-ups Due Today, Reports Waiting Review, Overdue Follow-ups, Consultations This Month, and Active App Patients (share & invited totals).
  - Operational workload distribution bar chart and patient app engagement donut chart powered by `recharts`.
- **System Access Log**:
  - `public.get_admin_audit_logs(...)` security definer RPC with AAL2 + admin checks.
  - Strictly omits `old_row` and `new_row` payloads from client results.
  - `AccessLogPage` with filtering by date range, staff actor, and action keyword.
  - Prominent visual highlighting for emergency access events (`EMERGENCY_ACCESS_GRANTED` / `emergency_access`).
- **Demo Accounts**:
  - Admin: `admin@example.com` / `admin7@example.com`
  - Doctor: `doctor@example.com` / `drcare7@example.com`
  - Front Desk: `desk@example.com` / `desk7@example.com`
  - Patient: `patient@example.com` / `patient7@example.com`
- **Decisions Made**:
  - Date boundaries ("today", "this month") are calculated in `Asia/Kolkata` time zone.
  - Raw table record payloads (`old_row`, `new_row`) are strictly inaccessible to the API, guaranteeing admin users cannot view individual clinical row data.
  - Approved `recharts@3.10.1` package installed for visual operational analytics.
- **Known Gaps**:
  - External SMS/WhatsApp gateway integration (planned for V2; push & email in V1).
  - ABDM health data exchange integration (V2).
- **Next Phase**:
  - Hardening, end-to-end smoke testing with Playwright, and deployment pipeline configuration.

## Bug Fixes & Patient Experience Enhancements (Completed)
- **Sign-Out Session Eviction**:
  - `PatientContext` & `ConfirmSheetModal`: `signOut` is now asynchronous, executes `POST /api/auth/signout`, purges sensitive session/local state, and cleanly redirects to `/patient/signin`.
  - `DoctorLayout`: Sidebar and mobile headers now execute `POST /api/auth/signout`, clear session storage, and relocate staff to `/staff/signin`.
  - `StaffSignIn`: Lock-screen "Not you? Sign out" option explicitly executes `POST /api/auth/signout` and resets flow to primary sign-in.
- **Patient Reminders & Appointments Screens**:
  - Built responsive `PatientReminders.tsx` (grouped time slots, action triggers, push settings toggle, iPhone installation notes, lockscreen notification preview).
  - Built responsive `PatientAppointments.tsx` (upcoming ticket, historical visits list with status chips, direct casualty/front desk tel links).
  - Configured routes in `routes.tsx` (`/patient/reminders`, `/patient/appointments`, `/patient/appts`) and synchronized tab state across `PatientLayout` and `PatientProfile`.
  - Achieved 100% symmetric i18n keys across English and Malayalam for `patientReminders` and `patientAppts`.
  - Verified with 25 test suites passing (102 tests).

## Phase 8: Doctor Portal Audit & Clinical Workflow Remediation (Completed)
- **AAL2 Two-Factor MFA Authentication**:
  - Live `StaffSignIn` workflow supporting password login, challenge verification with TOTP factor `f0000000-0000-0000-0000-000000000003`, and automatic session elevation to AAL2.
  - TOTP verification helper `src/lib/totp.ts` verified with RFC 6238 specifications.
- **Doctor Clinical Workflows & Interface**:
  - Built `DoctorToday.tsx`: Live clinic schedule with Arun Kumar priority demo ticket, OPD room indicator, pending report and symptom counters, and penicillin allergy banner.
  - Built `DoctorPatients.tsx`: Full patient directory and "My Care Team" roster with search, filter, and break-glass emergency access trigger.
  - Built `DoctorChart.tsx`: Comprehensive patient chart featuring 6 clinical sections: What Changed (via `what_changed` RPC), Visits, Readings (with targets and source tags), Reports, Medicines, and Care Plan (with diet guidance).
  - Built `NoteComposer.tsx`: 4-step wizard (Note -> Meds -> Plan -> Sign) adhering to immutable encounter freeze triggers (draft then signed) with real-time penicillin allergy warnings and care plan diet attachment.
  - Built `AddendumModal.tsx`: Immutable addendum composer for signed clinical notes.
  - Built `DoctorReview.tsx`: Dual-tab clinical review queue for pending lab reports and patient symptoms, with required doctor comment for patient and next step selector.
  - Built `DoctorAccount.tsx`: Doctor profile, council reg KMC 48291, 2FA status, and emergency access audit logs.
- **Verification & Documentation**:
  - Captured 24 screenshots across Desktop (1280px), Tablet (768px), and Mobile (390px) in `docs/review/screenshots/`.
  - Comprehensive audit matrix in `docs/review/doctor-audit.md`.
  - Added Playwright test suite `tests/e2e/doctor-journey.spec.ts` passing end-to-end.
  - All 10 pgTAP database test suites passing (160 tests).
  - 100% symmetric bilingual support (English and Malayalam, 445 keys).

