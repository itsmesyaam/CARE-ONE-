-- ============================================================================
-- CareOne Cloudflare D1 Initial Schema Migration
-- Standard: TEXT IDs (UUIDv4), ISO-8601 UTC TEXT timestamps, JSON in TEXT
-- ============================================================================

-- 1. Hospital Settings
CREATE TABLE IF NOT EXISTS hospital_settings (
  id              TEXT PRIMARY KEY DEFAULT 'default' CHECK (id = 'default'),
  hospital_name   TEXT NOT NULL DEFAULT 'ABC Hospital',
  short_code      TEXT DEFAULT 'ABC',
  logo_url        TEXT,
  primary_color   TEXT NOT NULL DEFAULT '#0284c7',
  secondary_color TEXT NOT NULL DEFAULT '#0f172a',
  casualty_phone  TEXT DEFAULT '0484-2401122',
  time_zone       TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- 2. Departments
CREATE TABLE IF NOT EXISTS departments (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL UNIQUE,
  code       TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- 3. Staff Directory
CREATE TABLE IF NOT EXISTS staff (
  id            TEXT PRIMARY KEY,
  user_id       TEXT NOT NULL UNIQUE,
  department_id TEXT REFERENCES departments(id) ON DELETE RESTRICT,
  role          TEXT NOT NULL CHECK (role IN ('doctor', 'front_desk', 'admin')),
  full_name     TEXT NOT NULL,
  phone         TEXT,
  is_active     INTEGER NOT NULL DEFAULT 1,
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  deleted_at    TEXT
);

-- 4. Patients
CREATE TABLE IF NOT EXISTS patients (
  id            TEXT PRIMARY KEY,
  uhid          TEXT UNIQUE,
  mrn           TEXT UNIQUE,
  full_name     TEXT NOT NULL,
  dob           TEXT,
  date_of_birth TEXT,
  gender        TEXT NOT NULL CHECK (gender IN ('male', 'female', 'other')),
  blood_group   TEXT CHECK (blood_group IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')),
  phone         TEXT,
  email         TEXT,
  id_checked    INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  deleted_at    TEXT
);

-- 5. Patient Access Mappings
CREATE TABLE IF NOT EXISTS patient_access (
  id           TEXT PRIMARY KEY,
  patient_id   TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  user_id      TEXT NOT NULL,
  relationship TEXT NOT NULL CHECK (relationship IN ('self', 'guardian', 'caregiver')),
  created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  revoked_at   TEXT,
  UNIQUE (patient_id, user_id)
);

-- 6. Consents
CREATE TABLE IF NOT EXISTS consents (
  id           TEXT PRIMARY KEY,
  patient_id   TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  user_id      TEXT NOT NULL,
  consent_type TEXT NOT NULL DEFAULT 'general',
  version      TEXT NOT NULL DEFAULT '1.0',
  agreed_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- 7. Care Team
CREATE TABLE IF NOT EXISTS care_team (
  id         TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  staff_id   TEXT NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  reason     TEXT DEFAULT 'appointment',
  active     INTEGER NOT NULL DEFAULT 1,
  expires_at TEXT,
  revoked_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE(patient_id, staff_id)
);

-- 8. Emergency Access
CREATE TABLE IF NOT EXISTS emergency_access (
  id         TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  staff_id   TEXT NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  reason     TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- 9. Appointments
CREATE TABLE IF NOT EXISTS appointments (
  id               TEXT PRIMARY KEY,
  patient_id       TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id        TEXT NOT NULL REFERENCES staff(id) ON DELETE RESTRICT,
  department_id    TEXT REFERENCES departments(id) ON DELETE SET NULL,
  appointment_date TEXT,
  start_time       TEXT,
  end_time         TEXT,
  status           TEXT NOT NULL DEFAULT 'booked' CHECK (status IN ('booked', 'scheduled', 'rescheduled', 'cancelled', 'arrived', 'done')),
  notes            TEXT,
  created_at       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- 10. Clinical Encounters
CREATE TABLE IF NOT EXISTS encounters (
  id              TEXT PRIMARY KEY,
  patient_id      TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id       TEXT NOT NULL REFERENCES staff(id) ON DELETE RESTRICT,
  department_id   TEXT REFERENCES departments(id) ON DELETE SET NULL,
  status          TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'signed')),
  sensitivity     TEXT NOT NULL DEFAULT 'normal' CHECK (sensitivity IN ('normal', 'restricted')),
  chief_complaint TEXT,
  clinical_notes  TEXT,
  subjective      TEXT,
  objective       TEXT,
  assessment      TEXT,
  plan            TEXT,
  diagnosis       TEXT,
  signed_at       TEXT,
  created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- 11. Encounter Addenda
CREATE TABLE IF NOT EXISTS encounter_addenda (
  id           TEXT PRIMARY KEY,
  encounter_id TEXT NOT NULL REFERENCES encounters(id) ON DELETE CASCADE,
  patient_id   TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id    TEXT NOT NULL REFERENCES staff(id) ON DELETE RESTRICT,
  reason       TEXT NOT NULL,
  notes        TEXT NOT NULL,
  created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- 12. Conditions
CREATE TABLE IF NOT EXISTS conditions (
  id             TEXT PRIMARY KEY,
  patient_id     TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id      TEXT REFERENCES staff(id) ON DELETE RESTRICT,
  department_id  TEXT REFERENCES departments(id) ON DELETE SET NULL,
  name           TEXT NOT NULL,
  status         TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'resolved')),
  sensitivity    TEXT NOT NULL DEFAULT 'normal' CHECK (sensitivity IN ('normal', 'restricted')),
  diagnosed_date TEXT,
  notes          TEXT,
  created_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- 13. Allergies
CREATE TABLE IF NOT EXISTS allergies (
  id          TEXT PRIMARY KEY,
  patient_id  TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  substance   TEXT NOT NULL,
  reaction    TEXT,
  severity    TEXT NOT NULL DEFAULT 'moderate' CHECK (severity IN ('mild', 'moderate', 'severe')),
  recorded_by TEXT REFERENCES staff(id) ON DELETE SET NULL,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- 14. Medications
CREATE TABLE IF NOT EXISTS medications (
  id             TEXT PRIMARY KEY,
  patient_id     TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id      TEXT NOT NULL REFERENCES staff(id) ON DELETE RESTRICT,
  department_id  TEXT REFERENCES departments(id) ON DELETE SET NULL,
  drug           TEXT NOT NULL,
  dose           TEXT NOT NULL,
  timing         TEXT NOT NULL DEFAULT '{"morning":true,"afternoon":false,"night":true}',
  duration_days  INTEGER,
  instructions   TEXT,
  status         TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'stopped', 'completed')),
  stopped_reason TEXT,
  stopped_at     TEXT,
  sensitivity    TEXT NOT NULL DEFAULT 'normal' CHECK (sensitivity IN ('normal', 'restricted')),
  created_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- 15. Clinical Observations
CREATE TABLE IF NOT EXISTS observations (
  id           TEXT PRIMARY KEY,
  patient_id   TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  kind         TEXT NOT NULL,
  value_text   TEXT NOT NULL,
  unit         TEXT,
  source       TEXT NOT NULL DEFAULT 'clinic' CHECK (source IN ('clinic', 'patient')),
  out_of_range INTEGER NOT NULL DEFAULT 0,
  measured_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  recorded_by  TEXT REFERENCES staff(id) ON DELETE SET NULL,
  created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- 16. Documents
CREATE TABLE IF NOT EXISTS documents (
  id              TEXT PRIMARY KEY,
  patient_id      TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  storage_path    TEXT NOT NULL UNIQUE,
  type            TEXT NOT NULL DEFAULT 'lab' CHECK (type IN ('lab', 'imaging', 'prescription', 'other')),
  title           TEXT NOT NULL,
  report_date     TEXT NOT NULL DEFAULT (date('now')),
  source          TEXT NOT NULL DEFAULT 'patient' CHECK (source IN ('patient', 'staff')),
  review_status   TEXT NOT NULL DEFAULT 'pending' CHECK (review_status IN ('pending', 'reviewed')),
  reviewed_by     TEXT REFERENCES staff(id) ON DELETE SET NULL,
  reviewed_at     TEXT,
  file_size_bytes INTEGER,
  mime_type       TEXT NOT NULL,
  created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- 17. Diet Guides Catalog
CREATE TABLE IF NOT EXISTS diet_guides (
  id             TEXT PRIMARY KEY,
  title_en       TEXT NOT NULL,
  title_ml       TEXT NOT NULL,
  eat_more_en    TEXT NOT NULL,
  eat_more_ml    TEXT NOT NULL,
  eat_less_en    TEXT NOT NULL,
  eat_less_ml    TEXT NOT NULL,
  avoid_en       TEXT NOT NULL,
  avoid_ml       TEXT NOT NULL,
  tips_en        TEXT NOT NULL,
  tips_ml        TEXT NOT NULL,
  condition_tags TEXT NOT NULL DEFAULT '[]',
  status         TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved')),
  approved_by    TEXT REFERENCES staff(id) ON DELETE SET NULL,
  approved_at    TEXT,
  version        INTEGER NOT NULL DEFAULT 1,
  parent_id      TEXT REFERENCES diet_guides(id) ON DELETE SET NULL,
  created_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- 18. Care Plans
CREATE TABLE IF NOT EXISTS care_plans (
  id           TEXT PRIMARY KEY,
  patient_id   TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  encounter_id TEXT REFERENCES encounters(id) ON DELETE SET NULL,
  doctor_id    TEXT NOT NULL REFERENCES staff(id) ON DELETE RESTRICT,
  status       TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  title        TEXT,
  notes        TEXT,
  review_date  TEXT,
  created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- 19. Care Plan Items
CREATE TABLE IF NOT EXISTS care_plan_items (
  id            TEXT PRIMARY KEY,
  care_plan_id  TEXT NOT NULL REFERENCES care_plans(id) ON DELETE CASCADE,
  patient_id    TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  kind          TEXT NOT NULL CHECK (kind IN ('medicine', 'test', 'follow_up', 'reading', 'instruction', 'diet')),
  detail        TEXT NOT NULL,
  timing        TEXT,
  due_date      TEXT,
  diet_guide_id TEXT REFERENCES diet_guides(id) ON DELETE SET NULL,
  doctor_note   TEXT,
  status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
  completed_at  TEXT,
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- 20. Reminders
CREATE TABLE IF NOT EXISTS reminders (
  id                TEXT PRIMARY KEY,
  patient_id        TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  care_plan_item_id TEXT REFERENCES care_plan_items(id) ON DELETE SET NULL,
  appointment_id    TEXT REFERENCES appointments(id) ON DELETE SET NULL,
  title             TEXT NOT NULL,
  scheduled_for     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  channel           TEXT NOT NULL DEFAULT 'push' CHECK (channel IN ('push', 'email')),
  status            TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'claimed', 'processing', 'sent', 'failed')),
  attempts          INTEGER NOT NULL DEFAULT 0,
  last_attempt_at   TEXT,
  error_message     TEXT,
  created_at        TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at        TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- 21. Push Subscriptions
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL,
  endpoint   TEXT NOT NULL UNIQUE,
  p256dh     TEXT NOT NULL,
  auth       TEXT NOT NULL,
  user_agent TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- 22. Symptom Reports
CREATE TABLE IF NOT EXISTS symptom_reports (
  id          TEXT PRIMARY KEY,
  patient_id  TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  severity    TEXT NOT NULL DEFAULT 'moderate' CHECK (severity IN ('mild', 'moderate', 'severe')),
  reported_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  reviewed_by TEXT REFERENCES staff(id) ON DELETE SET NULL,
  reviewed_at TEXT,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- 23. Audit Log
CREATE TABLE IF NOT EXISTS audit_log (
  id         TEXT PRIMARY KEY,
  at         TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  actor_id   TEXT,
  action     TEXT NOT NULL,
  table_name TEXT,
  record_id  TEXT,
  patient_id TEXT,
  reason     TEXT,
  old_row    TEXT,
  new_row    TEXT
);

-- 24. Auth Sessions (Cloudflare Native)
CREATE TABLE IF NOT EXISTS sessions (
  id              TEXT PRIMARY KEY,
  token_hash      TEXT NOT NULL UNIQUE,
  user_id         TEXT NOT NULL,
  role            TEXT NOT NULL,
  staff_id        TEXT REFERENCES staff(id) ON DELETE CASCADE,
  patient_id      TEXT REFERENCES patients(id) ON DELETE CASCADE,
  is_mfa_verified INTEGER NOT NULL DEFAULT 0,
  created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  last_active_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  expires_at      TEXT NOT NULL
);

-- 25. Email OTPs (Patient Login)
CREATE TABLE IF NOT EXISTS email_otps (
  id          TEXT PRIMARY KEY,
  email       TEXT NOT NULL,
  code_hash   TEXT NOT NULL,
  attempts    INTEGER NOT NULL DEFAULT 0,
  expires_at  TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- 26. Staff Auth Credentials (Password + TOTP)
CREATE TABLE IF NOT EXISTS staff_auth (
  staff_id        TEXT PRIMARY KEY REFERENCES staff(id) ON DELETE CASCADE,
  password_hash   TEXT NOT NULL,
  password_salt   TEXT NOT NULL,
  totp_secret     TEXT NOT NULL,
  totp_enabled    INTEGER NOT NULL DEFAULT 1,
  failed_attempts INTEGER NOT NULL DEFAULT 0,
  locked_until    TEXT,
  updated_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- ============================================================================
-- SQLITE TRIGGERS (DATA INTEGRITY & IMMUTABILITY)
-- ============================================================================

-- A. Audit Log Append-Only
CREATE TRIGGER IF NOT EXISTS trg_audit_log_prevent_update
BEFORE UPDATE ON audit_log
BEGIN
  SELECT RAISE(ABORT, 'audit_log is append-only and cannot be updated');
END;

CREATE TRIGGER IF NOT EXISTS trg_audit_log_prevent_delete
BEFORE DELETE ON audit_log
BEGIN
  SELECT RAISE(ABORT, 'audit_log is append-only and cannot be deleted');
END;

-- B. Frozen Signed Clinical Notes
CREATE TRIGGER IF NOT EXISTS trg_encounters_freeze_signed_update
BEFORE UPDATE ON encounters
WHEN OLD.status = 'signed'
BEGIN
  SELECT RAISE(ABORT, 'signed encounter notes are frozen and cannot be edited; use addenda');
END;

CREATE TRIGGER IF NOT EXISTS trg_encounters_freeze_signed_delete
BEFORE DELETE ON encounters
WHEN OLD.status = 'signed'
BEGIN
  SELECT RAISE(ABORT, 'signed encounter notes are frozen and cannot be deleted');
END;

-- C. Approved Diet Guides Frozen
CREATE TRIGGER IF NOT EXISTS trg_diet_guides_freeze_approved_update
BEFORE UPDATE ON diet_guides
WHEN OLD.status = 'approved'
BEGIN
  SELECT RAISE(ABORT, 'approved diet guides are frozen and cannot be edited; create a new version');
END;

-- D. Care-Team Auto-Assignment on Appointment Booking
CREATE TRIGGER IF NOT EXISTS trg_appointments_care_team
AFTER INSERT ON appointments
BEGIN
  INSERT INTO care_team (id, patient_id, staff_id, reason, active, created_at)
  VALUES (
    lower(hex(randomblob(16))),
    NEW.patient_id,
    NEW.doctor_id,
    'appointment',
    1,
    strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
  )
  ON CONFLICT(patient_id, staff_id) DO UPDATE SET active = 1, expires_at = datetime('now', '+1 year');
END;
