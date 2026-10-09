-- ============================================================================
-- CareOne Cloudflare D1 Evergreen Demo Seed Data
-- ============================================================================

-- 1. Hospital Settings
INSERT INTO hospital_settings (id, hospital_name, short_code, logo_url, primary_color, secondary_color, casualty_phone, time_zone, created_at, updated_at)
VALUES (
  'default',
  'ABC Hospital, Kochi',
  'ABC',
  '/hospital-logo.svg',
  '#0284c7',
  '#0f172a',
  '0484-2401122',
  'Asia/Kolkata',
  strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-1 year'),
  strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
)
ON CONFLICT (id) DO UPDATE SET
  hospital_name = excluded.hospital_name,
  short_code = excluded.short_code,
  casualty_phone = excluded.casualty_phone,
  time_zone = excluded.time_zone;

-- 2. Departments
INSERT OR IGNORE INTO departments (id, name, code, created_at)
VALUES
  ('d0000000-0000-0000-0000-000000000001', 'General Medicine', 'GEN', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-1 year')),
  ('d0000000-0000-0000-0000-000000000002', 'Cardiology', 'CARDIO', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-1 year')),
  ('d0000000-0000-0000-0000-000000000003', 'Pediatrics', 'PED', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-1 year')),
  ('d0000000-0000-0000-0000-000000000004', 'Psychiatry', 'PSY', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-1 year')),
  ('d0000000-0000-0000-0000-000000000005', 'Orthopedics', 'ORTHO', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-1 year'));

-- 3. Staff Directory
INSERT OR IGNORE INTO staff (id, user_id, department_id, role, full_name, phone, is_active, created_at)
VALUES
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', NULL, 'admin', 'Anand Verma', '9847000101', 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-1 year')),
  ('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000002', NULL, 'front_desk', 'Anjali Nair', '9847000102', 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-1 year')),
  ('b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000001', 'doctor', 'Dr. Rahul Menon', '9847000103', 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-1 year')),
  ('b0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000004', 'd0000000-0000-0000-0000-000000000002', 'doctor', 'Dr. Anjali Pillai', '9847000104', 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-1 year')),
  ('b0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000005', 'd0000000-0000-0000-0000-000000000005', 'doctor', 'Dr. Thomas Varghese', '9847000105', 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-1 year')),
  ('b0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000006', 'd0000000-0000-0000-0000-000000000004', 'doctor', 'Dr. Kavitha Nambiar', '9847000106', 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-1 year'));

-- 4. Staff Auth (Password: DemoPassword123! with deterministic PBKDF2 hash, standard TOTP Base32 secrets)
INSERT OR IGNORE INTO staff_auth (staff_id, password_hash, password_salt, totp_secret, totp_enabled, failed_attempts)
VALUES
  ('b0000000-0000-0000-0000-000000000001', 'e46358364f9bfef96f30e010a300d89280d00f68c34790a36a3f2d2a9f1a0e83', 'salt_admin_123', 'JBSWY3DPEHPK3PXP', 1, 0),
  ('b0000000-0000-0000-0000-000000000002', 'e46358364f9bfef96f30e010a300d89280d00f68c34790a36a3f2d2a9f1a0e83', 'salt_desk_123', 'JBSWY3DPEHPK3PXQ', 1, 0),
  ('b0000000-0000-0000-0000-000000000003', 'e46358364f9bfef96f30e010a300d89280d00f68c34790a36a3f2d2a9f1a0e83', 'salt_rahul_123', 'JBSWY3DPEHPK3PXR', 1, 0),
  ('b0000000-0000-0000-0000-000000000004', 'e46358364f9bfef96f30e010a300d89280d00f68c34790a36a3f2d2a9f1a0e83', 'salt_anjali_123', 'JBSWY3DPEHPK3PXS', 1, 0),
  ('b0000000-0000-0000-0000-000000000005', 'e46358364f9bfef96f30e010a300d89280d00f68c34790a36a3f2d2a9f1a0e83', 'salt_thomas_123', 'JBSWY3DPEHPK3PXT', 1, 0),
  ('b0000000-0000-0000-0000-000000000006', 'e46358364f9bfef96f30e010a300d89280d00f68c34790a36a3f2d2a9f1a0e83', 'salt_kavitha_123', 'JBSWY3DPEHPK3PXU', 1, 0);

-- 5. Patients (Fictional Demo Patients)
INSERT OR IGNORE INTO patients (id, uhid, mrn, full_name, dob, date_of_birth, gender, blood_group, phone, email, id_checked, created_at)
VALUES
  ('e0000000-0000-0000-0000-000000000001', 'ABC-1001', 'ABC-1001', 'Arun Kumar', '1978-05-14', '1978-05-14', 'male', 'B+', '9847000001', 'arun@example.com', 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-185 days')),
  ('e0000000-0000-0000-0000-000000000002', 'ABC-1002', 'ABC-1002', 'Sujatha Nair', '1992-08-20', '1992-08-20', 'female', 'O+', '9847000002', 'mother@example.com', 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-120 days')),
  ('e0000000-0000-0000-0000-000000000003', 'ABC-1003', 'ABC-1003', 'Baby Meenakshi', '2020-04-10', '2020-04-10', 'female', 'O+', '9847000002', 'mother@example.com', 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-120 days')),
  ('e0000000-0000-0000-0000-000000000004', 'ABC-1004', 'ABC-1004', 'Naveen Raj', '1997-02-18', '1997-02-18', 'male', 'A+', '9847000004', 'naveen@example.com', 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-90 days')),
  ('e0000000-0000-0000-0000-000000000005', 'ABC-1005', 'ABC-1005', 'Faisal Rahman', '1974-11-05', '1974-11-05', 'male', 'AB+', '9847000005', 'faisal@example.com', 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-80 days')),
  ('e0000000-0000-0000-0000-000000000006', 'ABC-1006', 'ABC-1006', 'Mary Joseph', '1965-07-22', '1965-07-22', 'female', 'O-', '9847000006', 'mary@example.com', 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-75 days')),
  ('e0000000-0000-0000-0000-000000000007', 'ABC-1007', 'ABC-1007', 'Gokul Das', '1988-09-30', '1988-09-30', 'male', 'B-', '9847000007', 'gokul@example.com', 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-70 days'));

-- 6. Patient Access Mappings
INSERT OR IGNORE INTO patient_access (id, patient_id, user_id, relationship, created_at)
VALUES
  ('pa000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'self', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-180 days')),
  ('pa000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000002', 'self', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-120 days')),
  ('pa000000-0000-0000-0000-000000000003', 'e0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000002', 'guardian', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-120 days'));

-- 7. Consents
INSERT OR IGNORE INTO consents (id, patient_id, user_id, consent_type, version, agreed_at, created_at)
VALUES
  ('cn000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'general', '1.0', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-180 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-180 days')),
  ('cn000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000002', 'general', '1.0', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-120 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-120 days')),
  ('cn000000-0000-0000-0000-000000000003', 'e0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000002', 'general', '1.0', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-120 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-120 days'));

-- 8. Care Team Links
INSERT OR IGNORE INTO care_team (id, patient_id, staff_id, reason, active, created_at)
VALUES
  ('ct000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000003', 'appointment', 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-180 days')),
  ('ct000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000004', 'appointment', 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-14 days')),
  ('ct000000-0000-0000-0000-000000000003', 'e0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000006', 'appointment', 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-10 days')),
  ('ct000000-0000-0000-0000-000000000004', 'e0000000-0000-0000-0000-000000000007', 'b0000000-0000-0000-0000-000000000005', 'appointment', 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-70 days'));

-- 9. Clinical Encounters for Arun Kumar
INSERT OR IGNORE INTO encounters (id, patient_id, doctor_id, department_id, status, sensitivity, chief_complaint, clinical_notes, subjective, objective, assessment, plan, diagnosis, signed_at, created_at, updated_at)
VALUES
  ('ec000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000001', 'signed', 'normal', 'Initial evaluation for fatigue and elevated fasting sugar', 'Patient presents with polyuria and fatigue. BP elevated on examination.', 'Fatigue, polyuria', 'BP 146/90, Fasting Blood Sugar 168', 'Type 2 Diabetes Mellitus, Essential Hypertension', 'Start Metformin 500mg, Telmisartan 40mg', 'Type 2 Diabetes Mellitus, Essential Hypertension', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-180 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-180 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-180 days')),
  ('ec000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000001', 'signed', 'normal', 'Follow-up for glycemic and blood pressure review', 'Fasting sugars erratic. Up-titrated Metformin to 1000mg BD.', 'Erratic blood sugar readings', 'BP 140/88, HbA1c 7.5%', 'Uncontrolled T2DM, Stage 1 HTN', 'Increase Metformin to 1000mg BD. Strict dietary moderation.', 'Uncontrolled T2DM, Stage 1 HTN', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-90 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-90 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-90 days')),
  ('ec000000-0000-0000-0000-000000000003', 'e0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000001', 'signed', 'normal', 'Worsening lethargy and exertional palpitations', 'HbA1c progressively rising. Cardiology referral advised.', 'Lethargy and exertional palpitations', 'BP 150/94, HbA1c 8.4%', 'T2DM with secondary hypertension; rule out CAD', 'Refer to Cardiology, 2D Echo, Home BP logging', 'T2DM with secondary hypertension', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-14 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-14 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-14 days')),
  ('ec000000-0000-0000-0000-000000000004', 'e0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000006', 'd0000000-0000-0000-0000-000000000004', 'signed', 'restricted', 'Severe panic episodes and generalized anxiety', 'Confidential psychiatric evaluation conducted.', 'Severe anxiety, panic', 'Normal physical exam, MSE: anxious affect', 'Generalized Anxiety Disorder', 'Cognitive therapy and SSRI prescription', 'Generalized Anxiety Disorder with Panic Attacks', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-10 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-10 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-10 days'));

-- 10. Conditions
INSERT OR IGNORE INTO conditions (id, patient_id, doctor_id, department_id, name, status, sensitivity, diagnosed_date, created_at, updated_at)
VALUES
  ('cd000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000001', 'Type 2 Diabetes Mellitus', 'active', 'normal', '2026-04-12', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-180 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-180 days')),
  ('cd000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000001', 'Essential Hypertension', 'active', 'normal', '2026-04-12', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-180 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-180 days'));

-- 11. Allergies
INSERT OR IGNORE INTO allergies (id, patient_id, substance, reaction, severity, recorded_by, created_at)
VALUES
  ('al000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'Penicillin', 'Urticaria and generalized rash', 'moderate', 'b0000000-0000-0000-0000-000000000003', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-180 days'));

-- 12. Medications
INSERT OR IGNORE INTO medications (id, patient_id, doctor_id, department_id, drug, dose, timing, instructions, status, created_at, updated_at)
VALUES
  ('md000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000001', 'Metformin ER', '1000 mg', '{"morning":true,"afternoon":false,"night":true}', 'Take with meals', 'active', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-90 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-90 days')),
  ('md000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000001', 'Telmisartan', '40 mg', '{"morning":true,"afternoon":false,"night":false}', 'Take once daily before breakfast', 'active', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-180 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-180 days'));

-- 13. Clinical Observations
INSERT OR IGNORE INTO observations (id, patient_id, kind, value_text, unit, source, out_of_range, measured_at, recorded_by, created_at)
VALUES
  ('ob000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'HbA1c', '6.8', '%', 'clinic', 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-180 days'), 'b0000000-0000-0000-0000-000000000003', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-180 days')),
  ('ob000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000001', 'HbA1c', '7.5', '%', 'clinic', 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-90 days'), 'b0000000-0000-0000-0000-000000000003', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-90 days')),
  ('ob000000-0000-0000-0000-000000000003', 'e0000000-0000-0000-0000-000000000001', 'HbA1c', '8.4', '%', 'clinic', 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-14 days'), 'b0000000-0000-0000-0000-000000000003', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-14 days')),
  ('ob000000-0000-0000-0000-000000000004', 'e0000000-0000-0000-0000-000000000001', 'Blood Pressure', '138/86', 'mmHg', 'patient', 0, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-12 days'), NULL, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-12 days')),
  ('ob000000-0000-0000-0000-000000000005', 'e0000000-0000-0000-0000-000000000001', 'Blood Pressure', '146/92', 'mmHg', 'patient', 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-10 days'), NULL, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-10 days')),
  ('ob000000-0000-0000-0000-000000000006', 'e0000000-0000-0000-0000-000000000001', 'Blood Pressure', '152/96', 'mmHg', 'patient', 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-7 days'), NULL, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-7 days')),
  ('ob000000-0000-0000-0000-000000000007', 'e0000000-0000-0000-0000-000000000001', 'Blood Pressure', '148/94', 'mmHg', 'patient', 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-4 days'), NULL, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-4 days')),
  ('ob000000-0000-0000-0000-000000000008', 'e0000000-0000-0000-0000-000000000001', 'Blood Pressure', '142/90', 'mmHg', 'patient', 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-1 day'), NULL, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-1 day'));

-- 14. Diet Guides
INSERT OR IGNORE INTO diet_guides (id, title_en, title_ml, eat_more_en, eat_more_ml, eat_less_en, eat_less_ml, avoid_en, avoid_ml, tips_en, tips_ml, condition_tags, status, approved_by, approved_at, version, created_at, updated_at)
VALUES
  (
    'dg000000-0000-0000-0000-000000000001',
    'Dietary Management for Type 2 Diabetes',
    'ടൈപ്പ് 2 പ്രമേഹത്തിനുള്ള ഭക്ഷണ നിയന്ത്രണം',
    'Leafy greens, whole pulses, bitter gourd, unpolished red rice in moderate quantity, cucumber, oats.',
    'ഇലക്കറികൾ, പയറുവർഗ്ഗങ്ങൾ, പാവയ്ക്ക, തവിടുകളയാത്ത മട്ടയരി മിതമായ അളവിൽ, വെള്ളരിക്ക, ഓട്സ്.',
    'White rice, potatoes, tapioca, ripe plantains, sweet fruits like mangoes and jackfruit.',
    'വെളുത്ത അരി, ഉരുളക്കിഴങ്ങ്, മരച്ചീനി, നേന്ത്രപ്പഴം, മാങ്ങ, ചക്ക.',
    'Refined sugars, sweets, bakery biscuits, sweet aerated drinks, processed juices.',
    'പഞ്ചസാര, മധുരപലഹാരങ്ങൾ, ബേക്കറി ബിസ്ക്കറ്റുകൾ, ശീതളപാനീയങ്ങൾ, പാക്കറ്റ് ജ്യൂസുകൾ.',
    'Have frequent small meals. Drink at least 8 glasses of water. Avoid skipping breakfast.',
    'ചെറിയ അളവിൽ കൃത്യസമയത്ത് കഴിക്കുക. ദിവസവും കുറഞ്ഞത് 8 ഗ്ലാസ് വെള്ളം കുടിക്കുക. പ്രഭാതഭക്ഷണം ഒഴിവാക്കരുത്.',
    '["diabetes"]',
    'approved',
    'b0000000-0000-0000-0000-000000000003',
    strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-60 days'),
    1,
    strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-60 days'),
    strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-60 days')
  ),
  (
    'dg000000-0000-0000-0000-000000000002',
    'Low-Sodium Diet for Hypertension',
    'ഉയർന്ന രക്തസമ്മർദ്ദത്തിനുള്ള ഉപ്പ് കുറഞ്ഞ ഭക്ഷണം',
    'Fresh vegetables, fruits, coconut water, steamed food, unsalted nuts.',
    'പച്ചക്കറികൾ, പഴങ്ങൾ, ഇളനീർ, പുഴുങ്ങിയ ഭക്ഷണം, ഉപ്പില്ലാത്ത നട്സ്.',
    'Pappadam, bakery breads, packed savouries, canned soups, hotel gravies.',
    'പപ്പടം, ബ്രെഡ്, മിക്സ്ചർ, ടിന്നിലടച്ച സൂപ്പുകൾ, ഹോട്ടൽ കറികൾ.',
    'Pickles, salted dried fish, chips, instant noodles, ajinomoto, excessive table salt.',
    'അച്ചാറുകൾ, ഉണക്കമീൻ, ചിപ്സ്, നൂഡിൽസ്, അജിനോമോട്ടോ, ഭക്ഷണത്തിൽ അധിക ഉപ്പ് ചേർക്കുന്നത്.',
    'Limit total salt to less than 1 teaspoon (5g) per day. Flavour dishes with lemon and ginger instead.',
    'ദിവസേനയുള്ള ഉപ്പിന്റെ അളവ് ഒരു ചെറിയ സ്പൂണിൽ താഴെയാക്കുക. രുചിക്ക് നാരങ്ങാനീരും ഇഞ്ചിയും ഉപയോഗിക്കുക.',
    '["hypertension"]',
    'approved',
    'b0000000-0000-0000-0000-000000000003',
    strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-60 days'),
    1,
    strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-60 days'),
    strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-60 days')
  ),
  (
    'dg000000-0000-0000-0000-000000000003',
    'Heart-Healthy Lipid Management Diet',
    'ഹൃദയാരോഗ്യത്തിനും കൊളസ്ട്രോൾ നിയന്ത്രണത്തിനുമുള്ള ഭക്ഷണം',
    'Garlic, oats, flaxseeds, boiled fish (sardines/mackerel), green tea, vegetables.',
    'വെളുത്തുള്ളി, ഓട്സ്, ചണവിത്ത്, മീൻ കറി (ചാള, അയല), ഗ്രീൻ ടീ, പച്ചക്കറികൾ.',
    'Coconut oil in excess, fried snacks, egg yolk, red meat, whole milk products.',
    'വെളിച്ചെണ്ണ അമിതമായി ഉപയോഗിക്കുന്നത്, വറുത്ത പലഹാരങ്ങൾ, മുട്ടയുടെ മഞ്ഞ, റെഡ് മീറ്റ്.',
    'Trans fats, re-heated frying oil, beef, mutton, vanaspati, cream cakes.',
    'ട്രാൻസ് ഫാറ്റുകൾ, വീണ്ടും ചൂടാക്കിയ എണ്ണ, ബീഫ്, മട്ടൺ, വനസ്പതി, ക്രീം കേക്കുകൾ.',
    'Walk 30 minutes daily. Prefer steaming and boiling over deep frying.',
    'ദിവസവും 30 മിനിറ്റ് നടക്കുക. എണ്ണയിൽ വറുക്കുന്നതിന് പകരം ആവിയിൽ വേവിച്ച ഭക്ഷണം ശീലമാക്കുക.',
    '["cardiology", "lipids"]',
    'approved',
    'b0000000-0000-0000-0000-000000000004',
    strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-60 days'),
    1,
    strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-60 days'),
    strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-60 days')
  );

-- 15. Care Plans & Items
INSERT OR IGNORE INTO care_plans (id, patient_id, encounter_id, doctor_id, status, review_date, created_at, updated_at)
VALUES
  ('cc000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'ec000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000003', 'active', strftime('%Y-%m-%d', 'now', '+14 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-14 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-14 days'));

INSERT OR IGNORE INTO care_plan_items (id, care_plan_id, patient_id, kind, detail, due_date, diet_guide_id, doctor_note, status, created_at, updated_at)
VALUES
  ('ca000000-0000-0000-0000-000000000001', 'cc000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'follow_up', 'Fasting blood sugar & lipid follow-up', strftime('%Y-%m-%d', 'now', '-3 days'), NULL, NULL, 'pending', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-14 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-14 days')),
  ('ca000000-0000-0000-0000-000000000002', 'cc000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'test', 'Echocardiogram (2D Echo)', strftime('%Y-%m-%d', 'now', '+7 days'), NULL, NULL, 'pending', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-14 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-14 days')),
  ('ca000000-0000-0000-0000-000000000003', 'cc000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'diet', 'Low-Sodium & Diabetic Diet', NULL, 'dg000000-0000-0000-0000-000000000001', 'One cup of red rice per meal. Strict low salt.', 'pending', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-14 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-14 days'));

-- 16. Uploaded Documents
INSERT OR IGNORE INTO documents (id, patient_id, storage_path, type, title, report_date, source, review_status, mime_type, file_size_bytes, created_at, updated_at)
VALUES
  ('dc000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001/metabolic_panel_recent.pdf', 'lab', 'Comprehensive Metabolic Panel & Lipid Profile', strftime('%Y-%m-%d', 'now', '-2 days'), 'patient', 'pending', 'application/pdf', 245000, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-2 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-2 days')),
  ('dc000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000006', 'e0000000-0000-0000-0000-000000000006/chest_xray.png', 'imaging', 'Chest X-Ray PA View', strftime('%Y-%m-%d', 'now', '-1 day'), 'patient', 'pending', 'image/png', 1120000, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-1 day'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-1 day'));

-- 17. Symptom Reports
INSERT OR IGNORE INTO symptom_reports (id, patient_id, description, severity, reported_at, created_at, updated_at)
VALUES
  ('sr000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'Mild chest tightness and dizziness after morning walk', 'moderate', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-4 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-4 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-4 days'));

-- 18. Appointments
INSERT OR IGNORE INTO appointments (id, patient_id, doctor_id, department_id, appointment_date, start_time, end_time, status, notes, created_at, updated_at)
VALUES
  ('aa000000-0000-0000-0000-000000000000', 'e0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000001', strftime('%Y-%m-%d 09:30:00', 'now'), strftime('%Y-%m-%dT09:30:00Z', 'now'), strftime('%Y-%m-%dT10:00:00Z', 'now'), 'booked', 'Follow-up for uncontrolled sugar and fatigue; cardiology referral review', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-7 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  ('aa000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000004', 'd0000000-0000-0000-0000-000000000002', strftime('%Y-%m-%d 11:30:00', 'now'), strftime('%Y-%m-%dT11:30:00Z', 'now'), strftime('%Y-%m-%dT12:00:00Z', 'now'), 'booked', 'Referred by Dr. Rahul for cardiac evaluation and exertional palpitations', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-5 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  ('aa000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000001', strftime('%Y-%m-%d 14:00:00', 'now'), strftime('%Y-%m-%dT14:00:00Z', 'now'), strftime('%Y-%m-%dT14:30:00Z', 'now'), 'booked', 'Routine diabetic review', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-3 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  ('aa000000-0000-0000-0000-000000000003', 'e0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000003', strftime('%Y-%m-%d 15:00:00', 'now'), strftime('%Y-%m-%dT15:00:00Z', 'now'), strftime('%Y-%m-%dT15:30:00Z', 'now'), 'arrived', 'Pediatric fever follow-up', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-1 day'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));

-- 19. Audit Log
INSERT INTO audit_log (id, at, actor_id, action, table_name, record_id, patient_id, reason)
VALUES
  ('lg000000-0000-0000-0000-000000000001', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-14 days'), 'a0000000-0000-0000-0000-000000000003', 'VIEWED_CHART', 'patients', 'e0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'Routine consultation review'),
  ('lg000000-0000-0000-0000-000000000002', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-10 days'), 'a0000000-0000-0000-0000-000000000006', 'VIEWED_CHART', 'patients', 'e0000000-0000-0000-0000-000000000004', 'e0000000-0000-0000-0000-000000000004', 'Psychiatric intake'),
  ('lg000000-0000-0000-0000-000000000003', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-2 days'), 'a0000000-0000-0000-0000-000000000003', 'EMERGENCY_ACCESS_GRANTED', 'emergency_access', 'ea000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000007', 'Acute breathlessness in emergency casualty triage');
