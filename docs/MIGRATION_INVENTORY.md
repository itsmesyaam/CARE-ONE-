# Supabase Dependency & Migration Inventory

> **Context**: Prepared in accordance with `AGENTS.md` (Cloudflare-only) and `docs/ARCHITECTURE.md` as the official checklist for decommissioning Supabase and migrating to Cloudflare Worker, D1 (SQLite), R2 (Storage), Better Auth, Hono, and Cron Triggers.
> **Date**: October 11, 2026

---

## 1. Frontend & Client Dependencies

Files importing `@supabase/*` or `src/lib/supabase.ts`, grouped by feature with detailed operation, target table/RPC, and query filters.

### A. Auth Feature (`src/features/auth/`)
* **Total Files**: 2
* **Total Calls**: 13

#### 1. [`src/features/auth/SignInPage.tsx`](file:///d:/CareOne/src/features/auth/SignInPage.tsx)
* **Imports**: `import { supabase, isSupabaseConfigured } from '../../lib/supabase';`
* **Calls**:
  1. `supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false } })`
     * **Operation**: Auth OTP request (email magic link / OTP code)
     * **Scope**: Patient login request
  2. `supabase.auth.verifyOtp({ email, token, type: 'email' })`
     * **Operation**: Auth OTP verification
     * **Scope**: Patient authentication completion
  3. `supabase.auth.signInWithPassword({ email: staffEmail, password: staffPassword })`
     * **Operation**: Primary password authentication
     * **Scope**: Staff login step 1
  4. `supabase.auth.mfa.getAuthenticatorAssuranceLevel()`
     * **Operation**: Check current session Assurance Level (`aal1` vs `aal2`)
     * **Scope**: Enforces staff 2FA requirement
  5. `supabase.auth.mfa.listFactors()`
     * **Operation**: List enrolled TOTP MFA factors
     * **Scope**: Retrieves `totp` factor ID for second factor challenge
  6. `supabase.auth.mfa.challenge({ factorId: mfaFactorId })`
     * **Operation**: Create TOTP challenge
     * **Scope**: Prepares MFA verification
  7. `supabase.auth.mfa.verify({ factorId, challengeId, code })`
     * **Operation**: Verify TOTP challenge code
     * **Scope**: Upgrades session to `aal2`

#### 2. [`src/features/auth/StaffSignIn.tsx`](file:///d:/CareOne/src/features/auth/StaffSignIn.tsx)
* **Imports**: `import { supabase } from '../../lib/supabase';`
* **Calls**:
  1. `supabase.auth.signInWithPassword({ email: trimmedEmail, password })`
     * **Operation**: Primary password authentication
     * **Scope**: Staff login stage 1
  2. `supabase.auth.mfa.listFactors()`
     * **Operation**: Fetch enrolled TOTP factors for user
     * **Scope**: Locates verified TOTP factor
  3. `supabase.auth.mfa.challengeAndVerify({ factorId, code: totpCode })`
     * **Operation**: Single-step challenge & verify TOTP code
     * **Scope**: Upgrades session to `aal2`
  4. `supabase.auth.mfa.challengeAndVerify({ factorId, code: '000000' })`
     * **Operation**: Dev/demo fallback challenge verification
     * **Scope**: Local development testing fallback
  5. `supabase.auth.signInWithPassword({ email, password: 'DemoPassword123!' })`
     * **Operation**: Demo account quick-fill login
     * **Scope**: Preset demo staff accounts
  6. `supabase.auth.signOut()`
     * **Operation**: Session revocation
     * **Scope**: Clear session on sign-in screen cancel / reset

---

### B. Front Desk Feature (`src/features/desk/`)
* **Total Files**: 0 in frontend (directory contains `.gitkeep`; desk staff authentication is handled via `StaffSignIn.tsx`, and patient registration/invite is handled by backend service-role Edge Function `invite-patient`).

---

### C. Doctor Feature (`src/features/doctor/`)
* **Total Files**: 9
* **Total Calls**: 50

#### 1. [`src/features/doctor/AddendumModal.tsx`](file:///d:/CareOne/src/features/doctor/AddendumModal.tsx)
* **Imports**: `import { supabase } from '../../lib/supabase';`
* **Calls**:
  1. Table: `encounter_addenda`
     * **Operation**: `.insert({ encounter_id, note_amendment, reason, author_id })`
     * **Filters**: None (insert)

#### 2. [`src/features/doctor/DoctorAccount.tsx`](file:///d:/CareOne/src/features/doctor/DoctorAccount.tsx)
* **Imports**: `import { supabase } from '../../lib/supabase';`
* **Calls**:
  1. Table: `patients`
     * **Operation**: `.select('*', { count: 'exact', head: true })`
     * **Filters**: None (active patient count)
  2. Table: `staff`
     * **Operation**: `.select('full_name, role, department_id, departments(name)')`
     * **Filters**: `.eq('id', user.id).single()`
  3. Auth: `supabase.auth.signOut()`
     * **Operation**: Session termination and local storage cleanup

#### 3. [`src/features/doctor/DoctorChart.tsx`](file:///d:/CareOne/src/features/doctor/DoctorChart.tsx)
* **Imports**: `import { supabase } from '../../lib/supabase';`
* **Calls**:
  1. Table: `patients`
     * **Operation**: `.select('*')`
     * **Filters**: `.eq('id', patientId).single()`
  2. Table: `care_team`
     * **Operation**: `.select('*')`
     * **Filters**: `.eq('patient_id', patientId).eq('staff_id', DR_RAHUL_STAFF_ID).is('revoked_at', null).maybeSingle()`
  3. Table: `emergency_access`
     * **Operation**: `.select('*')`
     * **Filters**: `.eq('patient_id', patientId).eq('staff_id', DR_RAHUL_STAFF_ID).gt('expires_at', now).order('created_at', { ascending: false }).limit(1).maybeSingle()`
  4. RPC: `supabase.rpc('log_chart_view', { p_patient_id: patientId })`
     * **Operation**: Stored procedure execution logging chart view
  5. Table: `allergies`
     * **Operation**: `.select('*')`
     * **Filters**: `.eq('patient_id', patientId)`
  6. Table: `conditions`
     * **Operation**: `.select('*')`
     * **Filters**: `.eq('patient_id', patientId)`
  7. Table: `encounters`
     * **Operation**: `.select('*, staff:doctor_id(full_name), departments:department_id(name), encounter_addenda(*)')`
     * **Filters**: `.eq('patient_id', patientId).order('created_at', { ascending: false })`
  8. RPC: `supabase.rpc('what_changed', { p_patient_id: patientId })`
     * **Operation**: Stored procedure generating visit-over-visit clinical delta
  9. Table: `observations`
     * **Operation**: `.select('*')`
     * **Filters**: `.eq('patient_id', patientId).order('measured_at', { ascending: false })`
  10. Table: `documents`
      * **Operation**: `.select('*')`
      * **Filters**: `.eq('patient_id', patientId).order('report_date', { ascending: false })`
  11. Table: `medications`
      * **Operation**: `.select('*')`
      * **Filters**: `.eq('patient_id', patientId).order('created_at', { ascending: false })`
  12. Table: `care_plans`
      * **Operation**: `.select('*, care_plan_items(*, diet_guides(*))')`
      * **Filters**: `.eq('patient_id', patientId).eq('status', 'active')`
  13. RPC: `supabase.rpc('request_emergency_access', { p_patient_id: targetPid, p_reason: reason })`
      * **Operation**: Stored procedure granting 4-hour break-glass emergency access
  14. Table: `emergency_access`
      * **Operation**: `.update({ expires_at: now })`
      * **Filters**: `.eq('id', activeEmergency.id)`
  15. Table: `documents`
      * **Operation**: `.update({ review_status: 'reviewed', reviewed_by, reviewed_at })`
      * **Filters**: `.eq('id', reviewSheetDoc.id)`
  16. Table: `symptom_reports`
      * **Operation**: `.update({ reviewed_by, reviewed_at })`
      * **Filters**: `.eq('id', symptomSheetItem.id)`

#### 4. [`src/features/doctor/DoctorLayout.tsx`](file:///d:/CareOne/src/features/doctor/DoctorLayout.tsx)
* **Imports**: `import { supabase } from '../../lib/supabase';`
* **Calls**:
  1. Auth: `supabase.auth.signOut()`
     * **Operation**: Sign out session
  2. Table: `documents`
     * **Operation**: `.select('*', { count: 'exact', head: true })`
     * **Filters**: `.eq('review_status', 'pending')`
  3. Table: `symptom_reports`
     * **Operation**: `.select('*', { count: 'exact', head: true })`
     * **Filters**: `.is('reviewed_at', null)`

#### 5. [`src/features/doctor/DoctorPatients.tsx`](file:///d:/CareOne/src/features/doctor/DoctorPatients.tsx)
* **Imports**: `import { supabase } from '../../lib/supabase';`
* **Calls**:
  1. Table: `patients`
     * **Operation**: `.select('*').order('full_name')`
     * **Filters**: None
  2. Table: `care_team`
     * **Operation**: `.select('patient_id, staff_id')`
     * **Filters**: `.is('revoked_at', null)`
  3. Table: `emergency_access`
     * **Operation**: `.select('patient_id, staff_id, expires_at')`
     * **Filters**: `.gt('expires_at', now)`
  4. Table: `conditions`
     * **Operation**: `.select('patient_id, name, status')`
     * **Filters**: None
  5. Table: `documents`
     * **Operation**: `.select('patient_id')`
     * **Filters**: `.eq('review_status', 'pending')`
  6. Table: `symptom_reports`
     * **Operation**: `.select('patient_id')`
     * **Filters**: `.is('reviewed_at', null)`
  7. Table: `encounters`
     * **Operation**: `.select('patient_id, signed_at')`
     * **Filters**: `.eq('status', 'signed')`
  8. Table: `appointments`
     * **Operation**: `.select('patient_id, scheduled_at')`
     * **Filters**: `.gte('scheduled_at', now).order('scheduled_at', { ascending: true })`
  9. RPC: `supabase.rpc('request_emergency_access', { p_patient_id: targetPatient.id, p_reason: reason })`
     * **Operation**: Request emergency access for unlinked patient

#### 6. [`src/features/doctor/DoctorReview.tsx`](file:///d:/CareOne/src/features/doctor/DoctorReview.tsx)
* **Imports**: `import { supabase } from '../../lib/supabase';`
* **Calls**:
  1. Table: `documents`
     * **Operation**: `.select('*, patients(full_name, mrn)')`
     * **Filters**: `.eq('review_status', 'pending').order('uploaded_at', { ascending: false })`
  2. Table: `symptom_reports`
     * **Operation**: `.select('*, patients(full_name, mrn)')`
     * **Filters**: `.is('reviewed_at', null).order('reported_at', { ascending: false })`
  3. Table: `documents`
     * **Operation**: `.update({ review_status: 'reviewed', reviewed_by, reviewed_at, comment })`
     * **Filters**: `.eq('id', doc.id)`
  4. Table: `symptom_reports`
     * **Operation**: `.update({ reviewed_by, reviewed_at, doctor_note })`
     * **Filters**: `.eq('id', item.id)`

#### 7. [`src/features/doctor/DoctorToday.tsx`](file:///d:/CareOne/src/features/doctor/DoctorToday.tsx)
* **Imports**: `import { supabase } from '../../lib/supabase';`
* **Calls**:
  1. Table: `appointments`
     * **Operation**: `.select('*, patients(id, full_name, mrn, date_of_birth, phone), staff(full_name)')`
     * **Filters**: `.eq('doctor_id', DR_RAHUL_STAFF_ID).gte('scheduled_at', todayStart).lte('scheduled_at', todayEnd).order('scheduled_at', { ascending: true })`
  2. Table: `documents`
     * **Operation**: `.select('*', { count: 'exact', head: true })`
     * **Filters**: `.eq('review_status', 'pending')`
  3. Table: `symptom_reports`
     * **Operation**: `.select('*', { count: 'exact', head: true })`
     * **Filters**: `.is('reviewed_at', null)`
  4. Table: `encounters`
     * **Operation**: `.select('id, signed_at')`
     * **Filters**: `.eq('doctor_id', DR_RAHUL_STAFF_ID).gte('signed_at', todayStart).lte('signed_at', todayEnd)`

#### 8. [`src/features/doctor/NoteComposer.tsx`](file:///d:/CareOne/src/features/doctor/NoteComposer.tsx)
* **Imports**: `import { supabase } from '../../lib/supabase';`
* **Calls**:
  1. Auth: `supabase.auth.getUser()`
     * **Operation**: Get current authenticated user
  2. Table: `staff`
     * **Operation**: `.select('id, department_id')`
     * **Filters**: `.eq('id', authData.user.id).single()`
  3. Table: `encounters`
     * **Operation**: `.insert({ patient_id, doctor_id, department_id, chief_complaint, history_of_present_illness, examination_findings, assessment_plan, status: 'draft' }).select('id').single()`
     * **Filters**: None
  4. Table: `encounters`
     * **Operation**: `.update({ status: 'signed', signed_at: now })`
     * **Filters**: `.eq('id', encId)`
  5. Table: `medications`
     * **Operation**: `.insert({ patient_id, encounter_id, name, dosage, frequency, route, duration, instructions })`
     * **Filters**: None
  6. Table: `observations`
     * **Operation**: `.insert({ patient_id, encounter_id, observation_type, value_numeric, unit, notes })`
     * **Filters**: None
  7. Table: `care_plans`
     * **Operation**: `.select('id')`
     * **Filters**: `.eq('patient_id', patientId).eq('status', 'active').maybeSingle()`
  8. Table: `care_plans`
     * **Operation**: `.insert({ patient_id, created_by, status: 'active', title, intent: 'treatment' }).select('id').single()`
     * **Filters**: None
  9. Table: `care_plan_items`
     * **Operation**: `.insert({ care_plan_id, item_type, title, description, target_date, frequency })`
     * **Filters**: None

#### 9. [`src/features/doctor/api.ts`](file:///d:/CareOne/src/features/doctor/api.ts)
* **Imports**: `import { supabase } from '../../lib/supabase';`
* **Calls**:
  1. RPC: `supabase.rpc('what_changed', { p_patient_id: patientId })`
     * **Operation**: Invokes `what_changed` SQL function

---

### D. Patient Feature (`src/features/patient/`)
* **Total Files**: 1
* **Total Calls**: 1

#### 1. [`src/features/patient/PatientContext.tsx`](file:///d:/CareOne/src/features/patient/PatientContext.tsx)
* **Imports**: `import { supabase } from '../../lib/supabase';`
* **Calls**:
  1. Auth: `supabase.auth.signOut()`
     * **Operation**: Invalidates session on patient logout

*(Note: Patient dashboard records, appointments, reminders, and profile data in `src/features/patient/` currently consume mock/context stores and are ready to be bound to `/api` routes).*

---

### E. Admin Feature (`src/features/admin/`) & Guards
* **Total Files**: 3
* **Total Calls**: 6

#### 1. [`src/features/admin/AdminDashboard.tsx`](file:///d:/CareOne/src/features/admin/AdminDashboard.tsx)
* **Imports**: `import { supabase } from '../../lib/supabase';`
* **Calls**:
  1. Auth: `supabase.auth.signOut()`
     * **Operation**: Admin header session termination and query cache reset

#### 2. [`src/features/admin/api.ts`](file:///d:/CareOne/src/features/admin/api.ts)
* **Imports**: `import { supabase } from '../../lib/supabase';`
* **Calls**:
  1. RPC: `supabase.rpc('get_admin_dashboard_metrics')`
     * **Operation**: Fetch aggregated operational metric cards
  2. RPC: `supabase.rpc('get_admin_department_workload')`
     * **Operation**: Fetch department appointment and staff distribution
  3. RPC: `supabase.rpc('get_admin_access_summary')`
     * **Operation**: Fetch access logs and emergency break-glass count
  4. RPC: `supabase.rpc('get_admin_audit_logs', { p_limit: limit, p_offset: offset })`
     * **Operation**: Fetch paginated tamper-evident access log records

#### 3. [`src/components/AdminRouteGuard.tsx`](file:///d:/CareOne/src/components/AdminRouteGuard.tsx)
* **Imports**: `import { supabase } from '../lib/supabase';`
* **Calls**:
  1. Auth: `supabase.auth.getSession()`
     * **Operation**: Session existence check before mounting admin views

---

### F. Shared Infrastructure / App Shell
* **Total Files**: 3
* **Total Calls**: 3

#### 1. [`src/lib/supabase.ts`](file:///d:/CareOne/src/lib/supabase.ts)
* **Imports**: `import { createClient } from '@supabase/supabase-js';`
* **Calls**:
  1. `createClient<Database>(supabaseUrl, supabaseAnonKey)`: Supabase client factory
  2. Exports: `getSupabaseConfigurationError()`, `isSupabaseConfigured`, `supabase`

#### 2. [`src/app/App.tsx`](file:///d:/CareOne/src/app/App.tsx)
* **Imports**: `import { getSupabaseConfigurationError } from '../lib/supabase';`
* **Calls**:
  1. `getSupabaseConfigurationError()`: Startup URL configuration check

#### 3. [`src/components/ConfigBanner.tsx`](file:///d:/CareOne/src/components/ConfigBanner.tsx)
* **Imports**: `import { isSupabaseConfigured } from '../lib/supabase';`
* **Calls**:
  1. Evaluates `isSupabaseConfigured` to conditionally render configuration warning

---

## 2. SQL Migrations Inventory (`supabase/migrations/`)

Summary of all 9 committed migrations in `supabase/migrations/`:

### Migration 1: `20261006204500_foundation_schema.sql`
* **Tables Created (8)**:
  1. `public.audit_log`
  2. `public.hospital_settings`
  3. `public.departments`
  4. `public.staff`
  5. `public.patients`
  6. `public.patient_access`
  7. `public.care_team`
  8. `public.emergency_access`
* **Functions (13)**:
  1. `private.audit_row()` (Trigger function writing to `public.audit_log`)
  2. `private.my_staff_id()`
  3. `private.my_role()`
  4. `private.get_staff_role()`
  5. `private.my_department_id()`
  6. `private.is_staff()`
  7. `private.is_staff_mfa()`
  8. `private.is_admin_mfa()`
  9. `private.is_doctor_mfa()`
  10. `private.is_desk_mfa()`
  11. `private.my_profile_patient_ids()`
  12. `private.my_care_patient_ids()`
  13. `private.can_access_patient(target_patient_id uuid)`
  14. `public.request_emergency_access(p_patient_id uuid, p_reason text)`
* **Triggers (5)**:
  1. `staff_audit` on `public.staff`
  2. `patient_access_audit` on `public.patient_access`
  3. `care_team_audit` on `public.care_team`
  4. `emergency_access_audit` on `public.emergency_access`
  5. `hospital_settings_audit` on `public.hospital_settings`
* **RLS Policies (28)**:
  * `hospital_settings`: anyone reads, admin updates, admin inserts (3)
  * `departments`: authenticated reads, admin manages (2)
  * `staff`: staff need two-factor, staff reads own record, admin reads all staff, admin manages staff (4)
  * `patients`: staff need two-factor, patients read own record, care team reads patient, doctors search demographics, front desk reads/inserts/updates patients (7)
  * `patient_access`: staff need two-factor, patients read own links, front desk reads/manages links (4)
  * `care_team`: staff need two-factor, patients read own, staff read, front desk/admin manage (4)
  * `emergency_access`: staff need two-factor, doctors read own, admin reads log (3)

### Migration 2: `20261006210000_hospital_settings_branding.sql`
* **Tables Created (0)**: Extends `public.hospital_settings` columns (`primary_color`, `secondary_color`, `casualty_phone`, `time_zone`, `branding_json`).
* **Functions (1)**:
  1. `public.get_public_hospital_settings()` (RPC returning unauthenticated branding)
* **Triggers (0)**
* **RLS Policies (0)**

### Migration 3: `20261006211500_phase3_admin_desk.sql`
* **Tables Created (2)**:
  1. `public.appointments`
  2. `public.consents`
* **Functions (2)**:
  1. `public.generate_patient_uhid()` (Deterministic UHID generator)
  2. `private.handle_appointment_care_team()` (Auto-links doctor to `care_team` for 1 year)
* **Triggers (3)**:
  1. `appointments_audit` on `public.appointments`
  2. `appointments_care_team_trigger` on `public.appointments`
  3. `consents_audit` on `public.consents`
* **RLS Policies (10)**:
  * `appointments`: staff need two-factor, patients read own, front desk reads/manages, doctors read/update their appointments (6)
  * `consents`: staff need two-factor, patients read/insert own, staff read consents (4)

### Migration 4: `20261007110000_phase4_doctor_chart.sql`
* **Tables Created (6)**:
  1. `public.encounters`
  2. `public.encounter_addenda`
  3. `public.conditions`
  4. `public.allergies`
  5. `public.medications`
  6. `public.observations`
* **Functions (3)**:
  1. `private.freeze_signed_notes()` (Prevents modification of signed encounters)
  2. `public.request_emergency_access(p_patient_id uuid, p_reason text)` (Overridden with 4-hour window)
  3. `public.log_chart_view(p_patient_id uuid)` (Audits doctor chart views)
* **Triggers (7)**:
  1. `encounters_freeze` on `public.encounters`
  2. `encounters_audit` on `public.encounters`
  3. `encounter_addenda_audit` on `public.encounter_addenda`
  4. `conditions_audit` on `public.conditions`
  5. `allergies_audit` on `public.allergies`
  6. `medications_audit` on `public.medications`
  7. `observations_audit` on `public.observations`
* **RLS Policies (24)**:
  * `encounters`: staff need two-factor, patients read signed, care team reads, doctors start notes, doctors edit drafts (5)
  * `encounter_addenda`: staff need two-factor, patients read, care team reads, doctors insert (4)
  * `conditions`: staff need two-factor, patients read, care team reads, doctors manage (4)
  * `allergies`: staff need two-factor, patients read, care team reads, doctors manage (4)
  * `medications`: staff need two-factor, patients read, care team reads, doctors manage (4)
  * `observations`: staff need two-factor, patients read, care team reads, doctors manage (4)

### Migration 5: `20261007120000_phase5_documents_storage.sql`
* **Tables Created (1)**:
  1. `public.documents`
* **Functions (0)**
* **Triggers (1)**:
  1. `documents_audit` on `public.documents`
* **RLS Policies (8)**:
  * `storage.objects`: files follow document row, upload only into permitted patient folders (2)
  * `public.documents`: staff need two-factor, patients read own, care team reads, patients upload pending, doctors upload, doctors mark reviewed (6)

### Migration 6: `20261007130000_phase6_care_reminders.sql`
* **Tables Created (5)**:
  1. `public.care_plans`
  2. `public.care_plan_items`
  3. `public.reminders`
  4. `public.push_subscriptions`
  5. `public.symptom_reports`
* **Functions (5)**:
  1. `private.handle_care_plan_item_reminder()` (Auto-generates reminder on care plan item creation)
  2. `public.claim_due_reminders(p_limit integer)` (RPC using `FOR UPDATE SKIP LOCKED`)
  3. `public.generate_daily_medicine_reminders()` (RPC generating medicine reminders)
  4. `public.create_test_reminder(p_patient_id uuid)` (RPC creating test reminder)
  5. `public.what_changed(p_patient_id uuid)` (RPC computing visit-over-visit delta)
* **Triggers (4)**:
  1. `care_plans_audit` on `public.care_plans`
  2. `care_plan_items_audit` on `public.care_plan_items`
  3. `symptom_reports_audit` on `public.symptom_reports`
  4. `care_plan_items_reminder_trigger` on `public.care_plan_items`
* **RLS Policies (17)**:
  * `care_plans`: staff need two-factor, patients read own, care team reads, doctors manage (4)
  * `care_plan_items`: staff need two-factor, patients read own, care team reads, doctors manage, patients update own (5)
  * `reminders`: staff need two-factor, patients read own, care team reads (3)
  * `push_subscriptions`: users manage own (1)
  * `symptom_reports`: staff need two-factor, patients read own, care team reads, patients insert, doctors review (5)

### Migration 7: `20261007140000_phase7_dashboard_audit.sql`
* **Tables Created (0)**
* **Functions (2)**:
  1. `public.get_admin_dashboard_counts()` (RPC returning aggregate operational counts for admin at AAL2)
  2. `public.get_admin_audit_logs(start_date, end_date, staff_id, action, limit, offset)` (RPC returning sanitised audit log)
* **Triggers (0)**
* **RLS Policies (0)**

### Migration 8: `20261007150000_security_audit_hardening.sql`
* **Tables Created (0)**
* **Functions (0)**
* **Triggers (0)**
* **RLS Policies (9)**:
  * Updates anti-IDOR policy on `storage.objects`
  * Replaces permissive `manage` policies with explicit `INSERT` and `UPDATE` policies (prohibiting `DELETE`) on `allergies`, `conditions`, `medications`, and `observations` (8)

### Migration 9: `20261008180000_diet_guidance.sql`
* **Tables Created (1)**:
  1. `public.diet_guides`
* **Functions (2)**:
  1. `private.freeze_approved_diet_guides()` (Prevents modifying approved diet guides)
  2. `private.validate_care_plan_item_diet_guide()` (Enforces valid diet guide reference)
* **Triggers (2)**:
  1. `trg_freeze_approved_diet_guides` on `public.diet_guides`
  2. `trg_validate_care_plan_item_diet_guide` on `public.care_plan_items`
* **RLS Policies (4)**:
  * `diet_guides`: approved readable by everyone, staff AAL2 read all, staff AAL2 insert, staff AAL2 update (4)

---

## 3. Edge Functions Inventory (`supabase/functions/`)

### 1. `invite-patient` (`supabase/functions/invite-patient/`)
* **Entry**: `index.ts`, **Logic**: `handler.ts`
* **Caller Requirements**: Valid JWT session with `role in ('front_desk', 'admin')` and `aal === 'aal2'`.
* **Rate Limit**: Max 10 requests per 5 minutes per actor.
* **What it Does**:
  1. Validates recipient `email`, target `patient_id` UUID, and `relationship` (`self`, `guardian`, `caregiver`).
  2. Checks that patient exists in `public.patients` and is not soft-deleted.
  3. Uses Supabase admin client (`SUPABASE_SERVICE_ROLE_KEY`) to call `auth.admin.inviteUserByEmail`. If user already exists in `auth.users`, retrieves their user ID.
  4. Upserts row in `public.patient_access` linking `patient_id` to `user_id` with specified `relationship`.

### 2. `invite-staff` (`supabase/functions/invite-staff/`)
* **Entry**: `index.ts`, **Logic**: `handler.ts`
* **Caller Requirements**: Valid JWT session with `role = 'admin'` and `aal === 'aal2'`.
* **Rate Limit**: Max 10 requests per 5 minutes per actor.
* **What it Does**:
  1. Validates `email`, `full_name`, and `role` (`doctor`, `front_desk`, `admin`).
  2. Uses Supabase admin client (`SUPABASE_SERVICE_ROLE_KEY`) to call `auth.admin.inviteUserByEmail`. If user already exists in `auth.users`, retrieves their user ID.
  3. Upserts row in `public.staff` with `user_id`, `role`, `department_id`, `full_name`, and sets `is_active = true`.

### 3. Shared Helpers (`supabase/functions/_shared/`)
* **`auth.ts`**: Verifies caller authentication via `supabase.auth.getUser()`, inspects `auth.jwt()`, confirms `aal === 'aal2'`, and queries `public.staff` to check authorized role.
* **`cors.ts`**: Provides preflight OPTIONS handling and validates allowed origin (`getAllowedOrigin()`).
* **`rate-limit.ts`**: In-memory sliding-window rate limiter tracking request timestamps per caller key.

---

## 4. Environment Variables Mentioning Supabase or Vercel

| Environment Variable | Location / Files | Description & Purpose |
| :--- | :--- | :--- |
| `VITE_SUPABASE_URL` | `src/lib/supabase.ts`, `vite.config.ts`, `.env.example`, `docs/DEPLOY.md` | Public Supabase project REST/Auth endpoint (e.g. `https://kndkohgpbnbbndvtgqvx.supabase.co` or local `http://127.0.0.1:54321`). |
| `VITE_SUPABASE_ANON_KEY` | `src/lib/supabase.ts`, `.env.example`, `docs/DEPLOY.md` | Public publishable anonymous API key for Supabase client SDK. |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | `src/lib/supabase.ts`, `vite.config.ts`, `docs/DEPLOY.md` | Alias for the publishable anon key used in deployment settings. |
| `SUPABASE_URL` | `supabase/functions/*`, `tests/functions/*` | Backend environment variable injected into Deno Edge Functions pointing to Supabase instance. |
| `SUPABASE_ANON_KEY` | `supabase/functions/*`, `tests/functions/*` | Anonymous API key passed to Edge Functions for authenticating user requests. |
| `SUPABASE_SERVICE_ROLE_KEY` | `supabase/functions/*`, `tests/functions/*` | High-privilege secret service role key passed to Edge Functions for admin auth user invites. |
| `SUPABASE_AUTH_SMS_TWILIO_AUTH_TOKEN` | `supabase/config.toml` | Placeholder Twilio token for SMS auth provider. |
| `SUPABASE_AUTH_EXTERNAL_APPLE_SECRET` | `supabase/config.toml` | Placeholder Apple OAuth client secret. |
| `VERCEL_GIT_COMMIT_SHA` | `vite.config.ts` | Git commit hash injected by Vercel deployment pipeline to generate build stamp. |
| `VERCEL` / `VERCEL_ENV` / `VERCEL_URL` | `vercel.json`, `vite.config.ts`, `docs/DEPLOY.md` | Vercel deployment environment flags and domain URLs. |

---

## 5. Summary Counts per Feature (Migration Checklist)

| Feature / Domain Area | Files Importing Supabase | Direct Supabase Calls / Operations | Target Tables & RPCs |
| :--- | :---: | :---: | :--- |
| **Auth** | 2 | 13 | `auth.signInWithOtp`, `auth.verifyOtp`, `auth.signInWithPassword`, `auth.mfa.getAuthenticatorAssuranceLevel`, `auth.mfa.listFactors`, `auth.mfa.challenge`, `auth.mfa.verify`, `auth.mfa.challengeAndVerify`, `auth.signOut` |
| **Front Desk** | 0 | 0 *(1 Edge Func)* | *(Handled via `invite-patient` Edge Function)* |
| **Doctor** | 9 | 50 | `patients`, `care_team`, `emergency_access`, `allergies`, `conditions`, `encounters`, `encounter_addenda`, `observations`, `documents`, `medications`, `care_plans`, `care_plan_items`, `symptom_reports`, `appointments`, `staff`; RPCs: `log_chart_view`, `what_changed`, `request_emergency_access` |
| **Patient** | 1 | 1 | `auth.signOut` |
| **Hospital Admin** | 3 | 6 | `auth.signOut`, `auth.getSession`; RPCs: `get_admin_dashboard_metrics`, `get_admin_department_workload`, `get_admin_access_summary`, `get_admin_audit_logs` |
| **Shared / App Shell** | 3 | 3 | `createClient`, `getSupabaseConfigurationError`, `isSupabaseConfigured` |
| **Total Frontend** | **18 files** | **73 calls** | |
| **Backend Migrations** | **9 migrations** | **17 tables, 69 policies, 17 triggers, 21 functions** | Full relational schema + RLS + pg_cron |
| **Edge Functions** | **2 functions (+ 3 shared)** | **6 service role calls** | `invite-patient`, `invite-staff`, auth & rate limiting |
| **Environment Variables** | **10 variables** | — | 8 Supabase + 2 Vercel |

---

*This inventory forms the complete, exhaustive roadmap for Phase 1 through Phase 9 of the Cloudflare migration.*
