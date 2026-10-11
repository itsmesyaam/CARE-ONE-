-- ============================================================================
-- Migration: 0001_schema.sql
-- Description: Core D1 Relational Schema (SQLite)
-- Converts PostgreSQL schema from Supabase to SQLite for Cloudflare D1
-- ============================================================================

PRAGMA foreign_keys = ON;

-- 1. Audit Log (append-only)
CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  at TEXT NOT NULL DEFAULT (datetime('now')),
  actor_id TEXT,
  action TEXT NOT NULL,
  table_name TEXT,
  record_id TEXT,
  patient_id TEXT,
  reason TEXT,
  old_row TEXT,
  new_row TEXT
);

-- 2. Hospital Settings (Singleton for hospital branding)
CREATE TABLE IF NOT EXISTS hospital_settings (
  id TEXT PRIMARY KEY DEFAULT 'default' CHECK (id = 'default'),
  hospital_name TEXT NOT NULL DEFAULT 'ABC Hospital',
  short_code TEXT NOT NULL DEFAULT 'ABC',
  logo_url TEXT,
  logo_path TEXT,
  primary_color TEXT NOT NULL DEFAULT '#1F6B4F',
  secondary_color TEXT NOT NULL DEFAULT '#0f172a',
  accent_color TEXT NOT NULL DEFAULT '#C9A43B',
  casualty_phone TEXT NOT NULL DEFAULT '0484 000 0112',
  time_zone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 3. Departments
CREATE TABLE IF NOT EXISTS departments (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  code TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  archived_at TEXT
);

-- 4. Staff Directory
CREATE TABLE IF NOT EXISTS staff (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  department_id TEXT REFERENCES departments(id) ON DELETE RESTRICT,
  role TEXT NOT NULL CHECK (role IN ('doctor', 'front_desk', 'admin')),
  full_name TEXT NOT NULL,
  phone TEXT,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at TEXT
);

-- 5. Patients
CREATE TABLE IF NOT EXISTS patients (
  id TEXT PRIMARY KEY,
  uhid TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  dob TEXT NOT NULL,
  gender TEXT NOT NULL CHECK (gender IN ('male', 'female', 'other')),
  blood_group TEXT CHECK (blood_group IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')),
  phone TEXT NOT NULL,
  email TEXT,
  id_checked INTEGER NOT NULL DEFAULT 0 CHECK (id_checked IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at TEXT
);

-- 6. Patient Access Mappings (Self, Guardian, Caregiver)
CREATE TABLE IF NOT EXISTS patient_access (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  relationship TEXT NOT NULL CHECK (relationship IN ('self', 'guardian', 'caregiver')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  revoked_at TEXT,
  UNIQUE (patient_id, user_id)
);

-- 7. Care Team Links
CREATE TABLE IF NOT EXISTS care_team (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  staff_id TEXT NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  reason TEXT,
  expires_at TEXT,
  revoked_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 8. Emergency Access (Break-glass 4-hour window)
CREATE TABLE IF NOT EXISTS emergency_access (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  staff_id TEXT NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 9. Appointments
CREATE TABLE IF NOT EXISTS appointments (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id TEXT NOT NULL REFERENCES staff(id) ON DELETE RESTRICT,
  department_id TEXT REFERENCES departments(id) ON DELETE SET NULL,
  appointment_date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'booked' CHECK (status IN ('booked', 'rescheduled', 'cancelled', 'arrived', 'done')),
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 10. Consents (Immutable Privacy Consent Log)
CREATE TABLE IF NOT EXISTS consents (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  consent_type TEXT NOT NULL DEFAULT 'general',
  version TEXT NOT NULL DEFAULT '1.0',
  agreed_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 11. Encounters (Clinical Consultations)
CREATE TABLE IF NOT EXISTS encounters (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id TEXT NOT NULL REFERENCES staff(id) ON DELETE RESTRICT,
  department_id TEXT REFERENCES departments(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'signed')),
  sensitivity TEXT NOT NULL DEFAULT 'normal' CHECK (sensitivity IN ('normal', 'restricted')),
  chief_complaint TEXT,
  clinical_notes TEXT,
  examination TEXT,
  diagnosis TEXT,
  signed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 12. Encounter Addenda (Corrections to Signed Encounters)
CREATE TABLE IF NOT EXISTS encounter_addenda (
  id TEXT PRIMARY KEY,
  encounter_id TEXT NOT NULL REFERENCES encounters(id) ON DELETE CASCADE,
  patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id TEXT NOT NULL REFERENCES staff(id) ON DELETE RESTRICT,
  reason TEXT NOT NULL,
  notes TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 13. Conditions (Diagnoses & Chronic Conditions)
CREATE TABLE IF NOT EXISTS conditions (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id TEXT REFERENCES staff(id) ON DELETE RESTRICT,
  department_id TEXT REFERENCES departments(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'resolved')),
  sensitivity TEXT NOT NULL DEFAULT 'normal' CHECK (sensitivity IN ('normal', 'restricted')),
  diagnosed_date TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 14. Allergies
CREATE TABLE IF NOT EXISTS allergies (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  substance TEXT NOT NULL,
  reaction TEXT,
  severity TEXT NOT NULL DEFAULT 'moderate' CHECK (severity IN ('mild', 'moderate', 'severe')),
  recorded_by TEXT REFERENCES staff(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 15. Medications
CREATE TABLE IF NOT EXISTS medications (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id TEXT NOT NULL REFERENCES staff(id) ON DELETE RESTRICT,
  department_id TEXT REFERENCES departments(id) ON DELETE SET NULL,
  drug TEXT NOT NULL,
  dose TEXT NOT NULL,
  timing TEXT NOT NULL DEFAULT '{"morning":true,"afternoon":false,"night":true}',
  duration_days INTEGER,
  instructions TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'stopped', 'completed')),
  stopped_reason TEXT,
  stopped_at TEXT,
  sensitivity TEXT NOT NULL DEFAULT 'normal' CHECK (sensitivity IN ('normal', 'restricted')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 16. Observations (Vitals & Clinical Measurements)
CREATE TABLE IF NOT EXISTS observations (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  value_text TEXT NOT NULL,
  unit TEXT,
  measured_at TEXT NOT NULL DEFAULT (datetime('now')),
  source TEXT NOT NULL DEFAULT 'clinic' CHECK (source IN ('clinic', 'patient')),
  out_of_range INTEGER NOT NULL DEFAULT 0 CHECK (out_of_range IN (0, 1)),
  recorded_by TEXT REFERENCES staff(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 17. Diet Guides (Clinical Nutrition Guidelines)
CREATE TABLE IF NOT EXISTS diet_guides (
  id TEXT PRIMARY KEY,
  title_en TEXT NOT NULL,
  title_ml TEXT NOT NULL,
  eat_more_en TEXT NOT NULL,
  eat_more_ml TEXT NOT NULL,
  eat_less_en TEXT NOT NULL,
  eat_less_ml TEXT NOT NULL,
  avoid_en TEXT NOT NULL,
  avoid_ml TEXT NOT NULL,
  tips_en TEXT NOT NULL,
  tips_ml TEXT NOT NULL,
  condition_tags TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved')),
  approved_by TEXT REFERENCES staff(id) ON DELETE SET NULL,
  approved_at TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  parent_id TEXT REFERENCES diet_guides(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 18. Documents (Uploaded Lab & Imaging Reports)
CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL DEFAULT 'lab' CHECK (type IN ('lab', 'imaging', 'prescription', 'other')),
  title TEXT NOT NULL,
  report_date TEXT NOT NULL DEFAULT (date('now')),
  source TEXT NOT NULL DEFAULT 'patient' CHECK (source IN ('patient', 'staff')),
  review_status TEXT NOT NULL DEFAULT 'pending' CHECK (review_status IN ('pending', 'reviewed')),
  reviewed_by TEXT REFERENCES staff(id) ON DELETE SET NULL,
  reviewed_at TEXT,
  file_size_bytes INTEGER,
  mime_type TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 19. Care Plans
CREATE TABLE IF NOT EXISTS care_plans (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  encounter_id TEXT REFERENCES encounters(id) ON DELETE SET NULL,
  doctor_id TEXT NOT NULL REFERENCES staff(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  title TEXT,
  notes TEXT,
  review_date TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 20. Care Plan Items
CREATE TABLE IF NOT EXISTS care_plan_items (
  id TEXT PRIMARY KEY,
  care_plan_id TEXT NOT NULL REFERENCES care_plans(id) ON DELETE CASCADE,
  patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('medicine', 'test', 'follow_up', 'reading', 'instruction', 'diet')),
  detail TEXT NOT NULL,
  timing TEXT,
  due_date TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
  completed_at TEXT,
  diet_guide_id TEXT REFERENCES diet_guides(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 21. Reminders
CREATE TABLE IF NOT EXISTS reminders (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  care_plan_item_id TEXT REFERENCES care_plan_items(id) ON DELETE SET NULL,
  appointment_id TEXT REFERENCES appointments(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  scheduled_for TEXT NOT NULL DEFAULT (datetime('now')),
  channel TEXT NOT NULL DEFAULT 'push' CHECK (channel IN ('push', 'email')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'claimed', 'sent', 'failed')),
  attempts INTEGER NOT NULL DEFAULT 0,
  last_attempt_at TEXT,
  error_message TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 22. Push Subscriptions
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 23. Symptom Reports
CREATE TABLE IF NOT EXISTS symptom_reports (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'moderate' CHECK (severity IN ('mild', 'moderate', 'severe')),
  reported_at TEXT NOT NULL DEFAULT (datetime('now')),
  reviewed_by TEXT REFERENCES staff(id) ON DELETE SET NULL,
  reviewed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================================
-- Indexes: Performance index on every table with patient_id
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_audit_log_patient_id ON audit_log(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_access_patient_id ON patient_access(patient_id);
CREATE INDEX IF NOT EXISTS idx_care_team_patient_id ON care_team(patient_id);
CREATE INDEX IF NOT EXISTS idx_emergency_access_patient_id ON emergency_access(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_patient_id ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_consents_patient_id ON consents(patient_id);
CREATE INDEX IF NOT EXISTS idx_encounters_patient_id ON encounters(patient_id);
CREATE INDEX IF NOT EXISTS idx_encounter_addenda_patient_id ON encounter_addenda(patient_id);
CREATE INDEX IF NOT EXISTS idx_conditions_patient_id ON conditions(patient_id);
CREATE INDEX IF NOT EXISTS idx_allergies_patient_id ON allergies(patient_id);
CREATE INDEX IF NOT EXISTS idx_medications_patient_id ON medications(patient_id);
CREATE INDEX IF NOT EXISTS idx_observations_patient_id ON observations(patient_id);
CREATE INDEX IF NOT EXISTS idx_documents_patient_id ON documents(patient_id);
CREATE INDEX IF NOT EXISTS idx_care_plans_patient_id ON care_plans(patient_id);
CREATE INDEX IF NOT EXISTS idx_care_plan_items_patient_id ON care_plan_items(patient_id);
CREATE INDEX IF NOT EXISTS idx_reminders_patient_id ON reminders(patient_id);
CREATE INDEX IF NOT EXISTS idx_symptom_reports_patient_id ON symptom_reports(patient_id);

-- Additional lookup indexes
CREATE INDEX IF NOT EXISTS idx_staff_user_id ON staff(user_id);
CREATE INDEX IF NOT EXISTS idx_staff_department_id ON staff(department_id);
CREATE INDEX IF NOT EXISTS idx_patients_uhid ON patients(uhid);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor_id ON appointments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_encounters_doctor_id ON encounters(doctor_id);
CREATE INDEX IF NOT EXISTS idx_documents_review_status ON documents(review_status);
CREATE INDEX IF NOT EXISTS idx_reminders_status_sched ON reminders(status, scheduled_for);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_diet_guides_status ON diet_guides(status);
