-- ============================================================================
-- CareOne Hospital Platform — Evergreen Demo Seed Data (SQLite D1)
-- Every relative timestamp is computed from datetime('now')
-- ============================================================================

-- Activate request context for seeding audit compliance
INSERT OR REPLACE INTO _request_ctx (id, actor_id, role, request_id)
VALUES (1, 'system-seed', 'admin', 'seed-run-1');

-- 1. Hospital Settings
INSERT INTO hospital_settings (id, hospital_name, short_code, logo_url, primary_color, secondary_color, casualty_phone, time_zone)
VALUES (
  'default',
  'ABC Hospital, Kochi',
  'ABC',
  '/hospital-logo.svg',
  '#0284c7',
  '#0f172a',
  '0484-2401122',
  'Asia/Kolkata'
)
ON CONFLICT (id) DO UPDATE SET
  hospital_name = excluded.hospital_name,
  short_code = excluded.short_code,
  casualty_phone = excluded.casualty_phone,
  time_zone = excluded.time_zone;

-- 2. Departments
INSERT INTO departments (id, name, code, created_at)
VALUES
  ('d0000000-0000-0000-0000-000000000001', 'General Medicine', 'GEN', datetime('now', '-1 year')),
  ('d0000000-0000-0000-0000-000000000002', 'Cardiology', 'CARDIO', datetime('now', '-1 year')),
  ('d0000000-0000-0000-0000-000000000003', 'Pediatrics', 'PED', datetime('now', '-1 year')),
  ('d0000000-0000-0000-0000-000000000004', 'Psychiatry', 'PSY', datetime('now', '-1 year')),
  ('d0000000-0000-0000-0000-000000000005', 'Orthopedics', 'ORTHO', datetime('now', '-1 year'))
ON CONFLICT (id) DO NOTHING;

-- 3. Staff Directory (Login users in Better Auth will link in Phase 4)
INSERT INTO staff (id, user_id, department_id, role, full_name, phone, is_active, created_at)
VALUES
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', NULL, 'admin', 'Anand Verma', '9847000101', 1, datetime('now', '-1 year')),
  ('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000002', NULL, 'front_desk', 'Anjali Nair', '9847000102', 1, datetime('now', '-1 year')),
  ('b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000001', 'doctor', 'Dr. Rahul Menon', '9847000103', 1, datetime('now', '-1 year')),
  ('b0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000004', 'd0000000-0000-0000-0000-000000000002', 'doctor', 'Dr. Anjali Pillai', '9847000104', 1, datetime('now', '-1 year')),
  ('b0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000005', 'd0000000-0000-0000-0000-000000000005', 'doctor', 'Dr. Thomas Varghese', '9847000105', 1, datetime('now', '-1 year')),
  ('b0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000006', 'd0000000-0000-0000-0000-000000000004', 'doctor', 'Dr. Kavitha Nambiar', '9847000106', 1, datetime('now', '-1 year'))
ON CONFLICT (id) DO NOTHING;

-- 4. Patients (21 Fictional Malayali Patients)
INSERT INTO patients (id, uhid, full_name, dob, gender, blood_group, phone, id_checked, created_at)
VALUES
  -- Main Story: Arun Kumar (48)
  ('e0000000-0000-0000-0000-000000000001', 'ABC-1001', 'Arun Kumar', date('now', '-48 years'), 'male', 'B+', '9847000001', 1, datetime('now', '-185 days')),
  -- Guardian Story: Mother & Child
  ('e0000000-0000-0000-0000-000000000002', 'ABC-1002', 'Sujatha Nair', date('now', '-34 years'), 'female', 'O+', '9847000002', 1, datetime('now', '-120 days')),
  ('e0000000-0000-0000-0000-000000000003', 'ABC-1003', 'Baby Meenakshi', date('now', '-6 years'), 'female', 'O+', '9847000002', 1, datetime('now', '-120 days')),
  -- Restricted Psychiatry Patient
  ('e0000000-0000-0000-0000-000000000004', 'ABC-1004', 'Naveen Raj', date('now', '-29 years'), 'male', 'A+', '9847000004', 1, datetime('now', '-90 days')),
  -- Diverse Patients
  ('e0000000-0000-0000-0000-000000000005', 'ABC-1005', 'Faisal Rahman', date('now', '-52 years'), 'male', 'AB+', '9847000005', 1, datetime('now', '-80 days')),
  ('e0000000-0000-0000-0000-000000000006', 'ABC-1006', 'Mary Joseph', date('now', '-61 years'), 'female', 'O-', '9847000006', 1, datetime('now', '-75 days')),
  ('e0000000-0000-0000-0000-000000000007', 'ABC-1007', 'Gokul Das', date('now', '-38 years'), 'male', 'B-', '9847000007', 1, datetime('now', '-70 days')),
  ('e0000000-0000-0000-0000-000000000008', 'ABC-1008', 'Devika Menon', date('now', '-27 years'), 'female', 'A-', '9847000008', 1, datetime('now', '-65 days')),
  ('e0000000-0000-0000-0000-000000000009', 'ABC-1009', 'Sivadasan Pillai', date('now', '-67 years'), 'male', 'O+', '9847000009', 1, datetime('now', '-60 days')),
  ('e0000000-0000-0000-0000-000000000010', 'ABC-1010', 'Sneha George', date('now', '-31 years'), 'female', 'B+', '9847000010', 1, datetime('now', '-55 days')),
  ('e0000000-0000-0000-0000-000000000011', 'ABC-1011', 'Deepa Suresh', date('now', '-44 years'), 'female', 'A+', '9847000011', 1, datetime('now', '-50 days')),
  ('e0000000-0000-0000-0000-000000000012', 'ABC-1012', 'Rajesh Kurup', date('now', '-56 years'), 'male', 'O+', '9847000012', 1, datetime('now', '-45 days')),
  ('e0000000-0000-0000-0000-000000000013', 'ABC-1013', 'Karthik Varma', date('now', '-33 years'), 'male', 'B+', '9847000013', 1, datetime('now', '-40 days')),
  ('e0000000-0000-0000-0000-000000000014', 'ABC-1014', 'Laila Beevi', date('now', '-70 years'), 'female', 'AB-', '9847000014', 1, datetime('now', '-35 days')),
  ('e0000000-0000-0000-0000-000000000015', 'ABC-1015', 'Mathew Chacko', date('now', '-49 years'), 'male', 'A+', '9847000015', 1, datetime('now', '-30 days')),
  ('e0000000-0000-0000-0000-000000000016', 'ABC-1016', 'Parvathy Warrier', date('now', '-25 years'), 'female', 'O+', '9847000016', 1, datetime('now', '-25 days')),
  ('e0000000-0000-0000-0000-000000000017', 'ABC-1017', 'Biju Chandran', date('now', '-42 years'), 'male', 'B+', '9847000017', 1, datetime('now', '-20 days')),
  ('e0000000-0000-0000-0000-000000000018', 'ABC-1018', 'Rema Panicker', date('now', '-59 years'), 'female', 'A+', '9847000018', 1, datetime('now', '-18 days')),
  ('e0000000-0000-0000-0000-000000000019', 'ABC-1019', 'Vinod Shenoy', date('now', '-36 years'), 'male', 'O-', '9847000019', 1, datetime('now', '-15 days')),
  ('e0000000-0000-0000-0000-000000000020', 'ABC-1020', 'Lakshmi Thampi', date('now', '-63 years'), 'female', 'B-', '9847000020', 1, datetime('now', '-10 days')),
  ('e0000000-0000-0000-0000-000000000021', 'ABC-1021', 'Haridas Namboothiri', date('now', '-74 years'), 'male', 'A+', '9847000021', 1, datetime('now', '-5 days'))
ON CONFLICT (id) DO NOTHING;

-- 5. Patient Access Mappings
INSERT INTO patient_access (id, patient_id, user_id, relationship, created_at)
VALUES
  ('pa000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'self', datetime('now', '-185 days')),
  ('pa000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000002', 'self', datetime('now', '-120 days')),
  ('pa000000-0000-0000-0000-000000000003', 'e0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000002', 'guardian', datetime('now', '-120 days'))
ON CONFLICT (patient_id, user_id) DO NOTHING;

-- 6. Consents
INSERT INTO consents (id, patient_id, user_id, consent_type, version, agreed_at, created_at)
VALUES
  ('cn000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'general', '1.0', datetime('now', '-180 days'), datetime('now', '-180 days')),
  ('cn000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000002', 'general', '1.0', datetime('now', '-120 days'), datetime('now', '-120 days')),
  ('cn000000-0000-0000-0000-000000000003', 'e0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000002', 'general', '1.0', datetime('now', '-120 days'), datetime('now', '-120 days'))
ON CONFLICT (id) DO NOTHING;

-- 7. Care Team Links
INSERT INTO care_team (id, patient_id, staff_id, reason, expires_at, created_at)
VALUES
  ('ct000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000003', 'appointment', datetime('now', '+1 year'), datetime('now', '-180 days')),
  ('ct000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000004', 'appointment', datetime('now', '+1 year'), datetime('now', '-14 days')),
  ('ct000000-0000-0000-0000-000000000003', 'e0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000006', 'appointment', datetime('now', '+1 year'), datetime('now', '-90 days')),
  ('ct000000-0000-0000-0000-000000000004', 'e0000000-0000-0000-0000-000000000007', 'b0000000-0000-0000-0000-000000000005', 'appointment', datetime('now', '+1 year'), datetime('now', '-70 days')),
  ('ct000000-0000-0000-0000-000000000005', 'e0000000-0000-0000-0000-000000000015', 'b0000000-0000-0000-0000-000000000005', 'appointment', datetime('now', '+1 year'), datetime('now', '-30 days'))
ON CONFLICT (id) DO NOTHING;

-- 8. Clinical Encounters for Arun Kumar & Others
INSERT INTO encounters (id, patient_id, doctor_id, department_id, status, sensitivity, chief_complaint, clinical_notes, diagnosis, signed_at, created_at, updated_at)
VALUES
  -- Visit 1: 6 months ago (now - 180 days)
  ('ec000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000001', 'signed', 'normal', 'Initial evaluation for fatigue and elevated fasting sugar', 'Patient presents with polyuria and fatigue. BP elevated on examination. Starting oral anti-diabetic and ACE inhibitor.', 'Type 2 Diabetes Mellitus, Essential Hypertension', datetime('now', '-180 days'), datetime('now', '-180 days'), datetime('now', '-180 days')),
  -- Visit 2: 3 months ago (now - 90 days)
  ('ec000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000001', 'signed', 'normal', 'Follow-up for glycemic and blood pressure review', 'Fasting sugars erratic. Up-titrated Metformin to 1000mg BD. Advised strict dietary moderation and daily walking.', 'Uncontrolled T2DM, Stage 1 HTN', datetime('now', '-90 days'), datetime('now', '-90 days'), datetime('now', '-90 days')),
  -- Visit 3: 2 weeks ago (now - 14 days)
  ('ec000000-0000-0000-0000-000000000003', 'e0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000001', 'signed', 'normal', 'Worsening lethargy and exertional palpitations', 'HbA1c progressively rising. Complaining of intermittent exertional palpitation. Advised cardiology consult with Dr. Anjali, home BP diary logging, and repeat metabolic panel.', 'T2DM with secondary hypertension; Rule out CAD', datetime('now', '-14 days'), datetime('now', '-14 days'), datetime('now', '-14 days')),
  -- Restricted Encounter for Naveen Raj (Psychiatry Department Only)
  ('ec000000-0000-0000-0000-000000000004', 'e0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000006', 'd0000000-0000-0000-0000-000000000004', 'signed', 'restricted', 'Severe panic episodes and generalized anxiety', 'Psychiatric evaluation conducted in confidence. Initiated SSRI and cognitive therapy schedule.', 'Generalized Anxiety Disorder with Panic Attacks', datetime('now', '-10 days'), datetime('now', '-10 days'), datetime('now', '-10 days')),
  -- Routine consultation for Faisal Rahman
  ('ec000000-0000-0000-0000-000000000005', 'e0000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000001', 'signed', 'normal', 'Routine diabetic review consultation', 'Blood sugars stable. Continue current regimen.', 'Controlled T2DM', datetime('now', '-2 hours'), datetime('now', '-2 hours'), datetime('now', '-2 hours'))
ON CONFLICT (id) DO NOTHING;

-- 9. Conditions & Allergies
INSERT INTO conditions (id, patient_id, doctor_id, department_id, name, status, sensitivity, diagnosed_date, created_at, updated_at)
VALUES
  ('cd000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000001', 'Type 2 Diabetes Mellitus', 'active', 'normal', date('now', '-180 days'), datetime('now', '-180 days'), datetime('now', '-180 days')),
  ('cd000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000001', 'Essential Hypertension', 'active', 'normal', date('now', '-180 days'), datetime('now', '-180 days'), datetime('now', '-180 days'))
ON CONFLICT (id) DO NOTHING;

INSERT INTO allergies (id, patient_id, substance, reaction, severity, recorded_by, created_at)
VALUES
  ('al000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'Penicillin', 'Urticaria and generalized rash', 'moderate', 'b0000000-0000-0000-0000-000000000003', datetime('now', '-180 days'))
ON CONFLICT (id) DO NOTHING;

-- 10. Medications for Arun Kumar
INSERT INTO medications (id, patient_id, doctor_id, department_id, drug, dose, timing, instructions, status, created_at, updated_at)
VALUES
  ('md000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000001', 'Metformin ER', '1000 mg', '{"morning":true,"afternoon":false,"night":true}', 'Take with meals', 'active', datetime('now', '-90 days'), datetime('now', '-90 days')),
  ('md000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000001', 'Telmisartan', '40 mg', '{"morning":true,"afternoon":false,"night":false}', 'Take once daily before breakfast', 'active', datetime('now', '-180 days'), datetime('now', '-180 days'))
ON CONFLICT (id) DO NOTHING;

-- 11. Clinical Observations
INSERT INTO observations (id, patient_id, kind, value_text, unit, source, out_of_range, measured_at, recorded_by, created_at)
VALUES
  -- Rising HbA1c across 3 Visits
  ('ob000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'HbA1c', '6.8', '%', 'clinic', 1, datetime('now', '-180 days'), 'b0000000-0000-0000-0000-000000000003', datetime('now', '-180 days')),
  ('ob000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000001', 'HbA1c', '7.5', '%', 'clinic', 1, datetime('now', '-90 days'), 'b0000000-0000-0000-0000-000000000003', datetime('now', '-90 days')),
  ('ob000000-0000-0000-0000-000000000003', 'e0000000-0000-0000-0000-000000000001', 'HbA1c', '8.4', '%', 'clinic', 1, datetime('now', '-14 days'), 'b0000000-0000-0000-0000-000000000003', datetime('now', '-14 days')),
  -- Home Blood Pressure diary (logged by patient across past 2 weeks)
  ('ob000000-0000-0000-0000-000000000004', 'e0000000-0000-0000-0000-000000000001', 'Blood Pressure', '138/86', 'mmHg', 'patient', 0, datetime('now', '-12 days'), NULL, datetime('now', '-12 days')),
  ('ob000000-0000-0000-0000-000000000005', 'e0000000-0000-0000-0000-000000000001', 'Blood Pressure', '146/92', 'mmHg', 'patient', 1, datetime('now', '-10 days'), NULL, datetime('now', '-10 days')),
  ('ob000000-0000-0000-0000-000000000006', 'e0000000-0000-0000-0000-000000000001', 'Blood Pressure', '152/96', 'mmHg', 'patient', 1, datetime('now', '-7 days'), NULL, datetime('now', '-7 days')),
  ('ob000000-0000-0000-0000-000000000007', 'e0000000-0000-0000-0000-000000000001', 'Blood Pressure', '148/94', 'mmHg', 'patient', 1, datetime('now', '-4 days'), NULL, datetime('now', '-4 days')),
  ('ob000000-0000-0000-0000-000000000008', 'e0000000-0000-0000-0000-000000000001', 'Blood Pressure', '142/90', 'mmHg', 'patient', 1, datetime('now', '-1 day'), NULL, datetime('now', '-1 day'))
ON CONFLICT (id) DO NOTHING;

-- 12. Care Plans & Items
INSERT INTO care_plans (id, patient_id, encounter_id, doctor_id, status, review_date, created_at, updated_at)
VALUES
  ('cc000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'ec000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000003', 'active', date('now', '+14 days'), datetime('now', '-14 days'), datetime('now', '-14 days')),
  ('cc000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000005', NULL, 'b0000000-0000-0000-0000-000000000003', 'active', date('now'), datetime('now', '-20 days'), datetime('now', '-20 days'))
ON CONFLICT (id) DO NOTHING;

INSERT INTO care_plan_items (id, care_plan_id, patient_id, kind, detail, due_date, status, created_at, updated_at)
VALUES
  ('ca000000-0000-0000-0000-000000000001', 'cc000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'follow_up', 'Fasting blood sugar & lipid follow-up', date('now', '-3 days'), 'pending', datetime('now', '-14 days'), datetime('now', '-14 days')),
  ('ca000000-0000-0000-0000-000000000002', 'cc000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000005', 'follow_up', 'Hypertension review check', date('now'), 'pending', datetime('now', '-20 days'), datetime('now', '-20 days')),
  ('ca000000-0000-0000-0000-000000000003', 'cc000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'test', 'Echocardiogram (2D Echo)', date('now', '+7 days'), 'pending', datetime('now', '-14 days'), datetime('now', '-14 days'))
ON CONFLICT (id) DO NOTHING;

-- 13. Uploaded Documents
INSERT INTO documents (id, patient_id, storage_path, type, title, report_date, source, review_status, mime_type, file_size_bytes, created_at, updated_at)
VALUES
  ('dc000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001/metabolic_panel_recent.pdf', 'lab', 'Comprehensive Metabolic Panel & Lipid Profile', date('now', '-2 days'), 'patient', 'pending', 'application/pdf', 245000, datetime('now', '-2 days'), datetime('now', '-2 days')),
  ('dc000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000006', 'e0000000-0000-0000-0000-000000000006/chest_xray.png', 'imaging', 'Chest X-Ray PA View', date('now', '-1 day'), 'patient', 'pending', 'image/png', 1120000, datetime('now', '-1 day'), datetime('now', '-1 day'))
ON CONFLICT (id) DO NOTHING;

-- 14. Symptom Reports
INSERT INTO symptom_reports (id, patient_id, description, severity, reported_at, created_at, updated_at)
VALUES
  ('sy000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'Mild chest tightness and dizziness after morning walk', 'moderate', datetime('now', '-4 days'), datetime('now', '-4 days'), datetime('now', '-4 days')),
  ('sy000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000008', 'Headache and nausea since yesterday', 'mild', datetime('now', '-1 day'), datetime('now', '-1 day'), datetime('now', '-1 day'))
ON CONFLICT (id) DO NOTHING;

-- 15. Appointments (Today's Bookings & Referrals)
INSERT INTO appointments (id, patient_id, doctor_id, department_id, appointment_date, status, notes, created_at, updated_at)
VALUES
  ('aa000000-0000-0000-0000-000000000000', 'e0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000001', strftime('%Y-%m-%d', 'now', '+5 hours', '+30 minutes') || 'T04:00:00.000Z', 'booked', 'Follow-up for uncontrolled sugar and fatigue; cardiology referral review', datetime('now', '-1 day'), datetime('now', '-1 day')),
  ('aa000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000004', 'd0000000-0000-0000-0000-000000000002', strftime('%Y-%m-%d', 'now', '+5 hours', '+30 minutes') || 'T04:45:00.000Z', 'booked', 'Referred by Dr. Rahul for cardiac evaluation and exertional palpitations', datetime('now', '-1 day'), datetime('now', '-1 day')),
  ('aa000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000001', strftime('%Y-%m-%d', 'now', '+5 hours', '+30 minutes') || 'T05:30:00.000Z', 'booked', 'Routine diabetic review', datetime('now', '-2 days'), datetime('now', '-2 days')),
  ('aa000000-0000-0000-0000-000000000003', 'e0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000003', strftime('%Y-%m-%d', 'now', '+5 hours', '+30 minutes') || 'T06:15:00.000Z', 'arrived', 'Pediatric fever follow-up', datetime('now', '-1 day'), datetime('now', '-1 day')),
  ('aa000000-0000-0000-0000-000000000004', 'e0000000-0000-0000-0000-000000000007', 'b0000000-0000-0000-0000-000000000005', 'd0000000-0000-0000-0000-000000000005', strftime('%Y-%m-%d', 'now', '+5 hours', '+30 minutes') || 'T07:00:00.000Z', 'booked', 'Knee joint pain review', datetime('now', '-3 days'), datetime('now', '-3 days'))
ON CONFLICT (id) DO UPDATE SET
  appointment_date = excluded.appointment_date,
  status = excluded.status,
  notes = excluded.notes,
  updated_at = datetime('now');

-- 16. Diet Guides
INSERT INTO diet_guides (
  id, title_en, title_ml, eat_more_en, eat_more_ml, eat_less_en, eat_less_ml, avoid_en, avoid_ml, tips_en, tips_ml, condition_tags, status, version
) VALUES
(
  'e1111111-1111-1111-1111-111111111111',
  'Diabetes Diet Guidance',
  'പ്രമേഹ നിയന്ത്രണ ഭക്ഷണ ക്രമം',
  'Bitter gourd, drumstick leaves, green leafy vegetables, whole pulses like green gram, steel-cut oats.',
  'പാവയ്ക്ക, മുരിങ്ങയില, പച്ചക്കറികൾ, ചെറുപയർ തുടങ്ങിയ പയറുവർഗ്ഗങ്ങൾ, ഓട്സ്.',
  'Polished white rice (limit to one small cup per meal), tapioca, potato, ripe jackfruit and mango.',
  'വെള്ളയരി ചോറ് (ഒരു നേരം ചെറിയ ഒരു കപ്പ് മാത്രം), കപ്പ, ഉരുളക്കിഴങ്ങ്, ചക്ക, മാങ്ങ.',
  'Sugar, jaggery, carbonated soft drinks, bakery sweets, halwa, payasam, packaged fruit juices.',
  'പഞ്ചസാര, ശർക്കര, ശീതളപാനീയങ്ങൾ, ബേക്കറി മധുരപലഹാരങ്ങൾ, ഹൽവ, പായസം, പാക്കറ്റ് ജ്യൂസുകൾ.',
  'Eat meals at consistent times every day. Drink 2 to 3 liters of water. Have a light dinner before 8:00 PM.',
  'എല്ലാ ദിവസവും കൃത്യസമയത്ത് ആഹാരം കഴിക്കുക. ദിവസം 2-3 ലിറ്റർ വെള്ളം കുടിക്കുക. രാത്രി ഭക്ഷണം 8 മണിക്ക് മുൻപ് കഴിക്കുക.',
  '["diabetes", "type2_diabetes", "prediabetes"]',
  'approved',
  1
),
(
  'e2222222-2222-2222-2222-222222222222',
  'Low-Salt Blood Pressure Diet',
  'രക്തസമ്മർദ്ദം കുറയ്ക്കുന്നതിനുള്ള കുറഞ്ഞ ഉപ്പ് ഭക്ഷണ ക്രമം',
  'Fresh seasonal vegetables, garlic, ginger, coriander leaves, raw cucumber, unsalted salads, fresh fruits like guava and papaya.',
  'പുതിയ പച്ചക്കറികൾ, വെളുത്തുള്ളി, ഇഞ്ചി, മല്ലിയില, സാലഡ് കക്കിരി, പേരയ്ക്ക, പപ്പായ തുടങ്ങിയ പഴങ്ങൾ.',
  'Salt added during cooking (use less than 1 level teaspoon of salt for the entire day), coconut milk gravies, papad.',
  'പാചകത്തിൽ ചേർക്കുന്ന ഉപ്പ് (ദിവസത്തിൽ ആകെ 1 ചെറിയ സ്പൂണിൽ താഴെ മാത്രം), തേങ്ങാപ്പാൽ കറികൾ, പപ്പടം.',
  'Pickles (achar), salted dry fish (karuvadu), potato chips, instant noodles, salted nuts, soy sauce.',
  'അച്ചാറുകൾ, ഉണക്കമീൻ, വറുത്ത ചിപ്സുകൾ, ഇൻസ്റ്റന്റ് നൂഡിൽസ്, ഉപ്പിട്ട പരിപ്പുകൾ, സോയാ സോസ്.',
  'Season food with lemon juice, pepper and cumin instead of adding extra salt. Never add extra salt at the table.',
  'രുചിക്കായി ഉപ്പിന് പകരം നാരങ്ങാനീര്, കുരുമുളകുപൊടി, ജീരകം എന്നിവ ഉപയോഗിക്കുക. ഭക്ഷണം കഴിക്കുമ്പോൾ മേശപ്പുറത്ത് ഉപ്പ് വിതറരുത്.',
  '["hypertension", "blood_pressure", "cardiac"]',
  'approved',
  1
),
(
  'e3333333-3333-3333-3333-333333333333',
  'Heart-Healthy Dietary Guide',
  'ഹൃദയാരോഗ്യ സംരക്ഷണ ഭക്ഷണ ക്രമം',
  'Boiled or steamed pulses, small fish rich in omega-3 (sardine, mackerel) steamed with minimal oil, flaxseeds, unsalted almonds.',
  'പുഴുങ്ങിയ പയറുവർഗ്ഗങ്ങൾ, ഒമേഗ-3 അടങ്ങിയ ചെറിയ മീനുകൾ (മത്തി, അയില) കുറഞ്ഞ എണ്ണയിൽ തയ്യാറാക്കിയത്, ഫ്ലാക്സ് സീഡ്സ്, ബദാം.',
  'Red meat (beef, mutton, pork), egg yolks (limit to 2 per week), coconut oil (maximum 2 teaspoons a day).',
  'റെഡ് മീറ്റ് (പോത്തിറച്ചി, ആട്ടിറച്ചി), മുട്ടയുടെ മഞ്ഞക്കരു (ആഴ്ചയിൽ 2 എണ്ണം മാത്രം), വെളിച്ചെണ്ണ (ദിവസം പരമാവധി 2 സ്പൂൺ).',
  'Deep-fried snacks (banana chips, samosa, mixture), vanaspati/dalda, ghee roasts, processed sausages.',
  'എണ്ണയിൽ വറുത്ത പലഹാരങ്ങൾ (നേന്ത്രക്കായ ചിപ്സ്, സമോസ, മിക്സ്ചർ), വനസ്പതി, ഡാൽഡ, നെയ്യ് റോസ്റ്റ്.',
  'Choose boiling, steaming, or light grilling over deep frying. Take a 30-minute brisk walk daily if approved by your doctor.',
  'വറുക്കുന്നതിന് പകരം ആവിയിൽ വേവിക്കുന്നതോ കറിവെക്കുന്നതോ തിരഞ്ഞെടുക്കുക. ഡോക്ടറുടെ നിർദ്ദേശപ്രകാരം ദിവസവും 30 മിനിറ്റ് നടക്കുക.',
  '["cardiac", "cholesterol", "dyslipidemia", "heart_healthy"]',
  'approved',
  1
)
ON CONFLICT (id) DO NOTHING;

-- 17. Baseline Audit Log History
INSERT INTO audit_log (at, actor_id, action, table_name, record_id, patient_id, reason)
VALUES
  (datetime('now', '-14 days'), 'a0000000-0000-0000-0000-000000000003', 'VIEWED_CHART', 'patients', 'e0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'Routine consultation review'),
  (datetime('now', '-10 days'), 'a0000000-0000-0000-0000-000000000006', 'VIEWED_CHART', 'patients', 'e0000000-0000-0000-0000-000000000004', 'e0000000-0000-0000-0000-000000000004', 'Psychiatric intake'),
  (datetime('now', '-2 days'), 'a0000000-0000-0000-0000-000000000003', 'EMERGENCY_ACCESS_GRANTED', 'emergency_access', 'em000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000009', 'Acute breathlessness in emergency casualty triage');

-- Clean up request context after seeding
DELETE FROM _request_ctx WHERE id = 1;
