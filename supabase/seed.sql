-- ============================================================================
-- CareOne Hospital Platform — Evergreen Demo Seed Data
-- Every timestamp is relative to current_date / now() so the demo is evergreen.
-- ============================================================================

-- 1. Hospital Settings
insert into public.hospital_settings (id, hospital_name, short_code, logo_url, primary_color, secondary_color, casualty_phone, time_zone)
values (
  'default',
  'ABC Hospital, Kochi',
  'ABC',
  '/hospital-logo.svg',
  '#0284c7',
  '#0f172a',
  '0484-2401122',
  'Asia/Kolkata'
)
on conflict (id) do update set
  hospital_name = excluded.hospital_name,
  short_code = excluded.short_code,
  casualty_phone = excluded.casualty_phone,
  time_zone = excluded.time_zone;

-- 2. Departments
insert into public.departments (id, name, code, created_at)
values
  ('d0000000-0000-0000-0000-000000000001', 'General Medicine', 'GEN', now() - interval '1 year'),
  ('d0000000-0000-0000-0000-000000000002', 'Cardiology', 'CARDIO', now() - interval '1 year'),
  ('d0000000-0000-0000-0000-000000000003', 'Pediatrics', 'PED', now() - interval '1 year'),
  ('d0000000-0000-0000-0000-000000000004', 'Psychiatry', 'PSY', now() - interval '1 year'),
  ('d0000000-0000-0000-0000-000000000005', 'Orthopedics', 'ORTHO', now() - interval '1 year')
on conflict (id) do nothing;

-- 3. Auth Users & Verified TOTP Factors
-- Password for all demo accounts: DemoPassword123!
insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  -- Staff
  ('a0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin@example.com', extensions.crypt('DemoPassword123!', extensions.gen_salt('bf', 10)), now(), '{"provider":"email","providers":["email"]}', '{"role":"admin"}', now() - interval '1 year', now()),
  ('a0000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'desk@example.com', extensions.crypt('DemoPassword123!', extensions.gen_salt('bf', 10)), now(), '{"provider":"email","providers":["email"]}', '{"role":"front_desk"}', now() - interval '1 year', now()),
  ('a0000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'dr.rahul@example.com', extensions.crypt('DemoPassword123!', extensions.gen_salt('bf', 10)), now(), '{"provider":"email","providers":["email"]}', '{"role":"doctor"}', now() - interval '1 year', now()),
  ('a0000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'dr.anjali@example.com', extensions.crypt('DemoPassword123!', extensions.gen_salt('bf', 10)), now(), '{"provider":"email","providers":["email"]}', '{"role":"doctor"}', now() - interval '1 year', now()),
  ('a0000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'dr.thomas@example.com', extensions.crypt('DemoPassword123!', extensions.gen_salt('bf', 10)), now(), '{"provider":"email","providers":["email"]}', '{"role":"doctor"}', now() - interval '1 year', now()),
  ('a0000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'dr.kavitha@example.com', extensions.crypt('DemoPassword123!', extensions.gen_salt('bf', 10)), now(), '{"provider":"email","providers":["email"]}', '{"role":"doctor"}', now() - interval '1 year', now()),
  -- Patients
  ('c0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'arun@example.com', extensions.crypt('DemoPassword123!', extensions.gen_salt('bf', 10)), now(), '{"provider":"email","providers":["email"]}', '{"role":"patient"}', now() - interval '1 year', now()),
  ('c0000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'mother@example.com', extensions.crypt('DemoPassword123!', extensions.gen_salt('bf', 10)), now(), '{"provider":"email","providers":["email"]}', '{"role":"patient"}', now() - interval '1 year', now()),
  ('c0000000-0000-0000-0000-000000000099', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'stranger@example.com', extensions.crypt('DemoPassword123!', extensions.gen_salt('bf', 10)), now(), '{"provider":"email","providers":["email"]}', '{"role":"patient"}', now() - interval '1 year', now())
on conflict (id) do nothing;

-- Deterministic TOTP Authenticator factors (RFC 4648 Base32 secrets)
insert into auth.mfa_factors (id, user_id, friendly_name, factor_type, status, secret, created_at, updated_at)
values
  ('f0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Admin Authenticator', 'totp', 'verified', 'JBSWY3DPEHPK3PXP', now(), now()),
  ('f0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000002', 'Desk Authenticator', 'totp', 'verified', 'JBSWY3DPEHPK3PXQ', now(), now()),
  ('f0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000003', 'Dr. Rahul Authenticator', 'totp', 'verified', 'JBSWY3DPEHPK3PXR', now(), now()),
  ('f0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000004', 'Dr. Anjali Authenticator', 'totp', 'verified', 'JBSWY3DPEHPK3PXS', now(), now()),
  ('f0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000005', 'Dr. Thomas Authenticator', 'totp', 'verified', 'JBSWY3DPEHPK3PXT', now(), now()),
  ('f0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000006', 'Dr. Kavitha Authenticator', 'totp', 'verified', 'JBSWY3DPEHPK3PXU', now(), now())
on conflict (id) do nothing;

-- 4. Staff Directory
insert into public.staff (id, user_id, department_id, role, full_name, phone, is_active, created_at)
values
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', null, 'admin', 'Anand Verma', '9847000101', true, now() - interval '1 year'),
  ('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000002', null, 'front_desk', 'Anjali Nair', '9847000102', true, now() - interval '1 year'),
  ('b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000001', 'doctor', 'Dr. Rahul Menon', '9847000103', true, now() - interval '1 year'),
  ('b0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000004', 'd0000000-0000-0000-0000-000000000002', 'doctor', 'Dr. Anjali Pillai', '9847000104', true, now() - interval '1 year'),
  ('b0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000005', 'd0000000-0000-0000-0000-000000000005', 'doctor', 'Dr. Thomas Varghese', '9847000105', true, now() - interval '1 year'),
  ('b0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000006', 'd0000000-0000-0000-0000-000000000004', 'doctor', 'Dr. Kavitha Nambiar', '9847000106', true, now() - interval '1 year')
on conflict (id) do nothing;

-- 5. Patients (21 Fictional Malayali Patients)
insert into public.patients (id, uhid, full_name, dob, gender, blood_group, phone, id_checked, created_at)
values
  -- Main Story: Arun Kumar (48)
  ('e0000000-0000-0000-0000-000000000001', 'ABC-1001', 'Arun Kumar', current_date - interval '48 years', 'male', 'B+', '9847000001', true, now() - interval '185 days'),
  -- Guardian Story: Mother & Child
  ('e0000000-0000-0000-0000-000000000002', 'ABC-1002', 'Sujatha Nair', current_date - interval '34 years', 'female', 'O+', '9847000002', true, now() - interval '120 days'),
  ('e0000000-0000-0000-0000-000000000003', 'ABC-1003', 'Baby Meenakshi', current_date - interval '6 years', 'female', 'O+', '9847000002', true, now() - interval '120 days'),
  -- Restricted Psychiatry Patient
  ('e0000000-0000-0000-0000-000000000004', 'ABC-1004', 'Naveen Raj', current_date - interval '29 years', 'male', 'A+', '9847000004', true, now() - interval '90 days'),
  -- Diverse Patients
  ('e0000000-0000-0000-0000-000000000005', 'ABC-1005', 'Faisal Rahman', current_date - interval '52 years', 'male', 'AB+', '9847000005', true, now() - interval '80 days'),
  ('e0000000-0000-0000-0000-000000000006', 'ABC-1006', 'Mary Joseph', current_date - interval '61 years', 'female', 'O-', '9847000006', true, now() - interval '75 days'),
  ('e0000000-0000-0000-0000-000000000007', 'ABC-1007', 'Gokul Das', current_date - interval '38 years', 'male', 'B-', '9847000007', true, now() - interval '70 days'),
  ('e0000000-0000-0000-0000-000000000008', 'ABC-1008', 'Devika Menon', current_date - interval '27 years', 'female', 'A-', '9847000008', true, now() - interval '65 days'),
  ('e0000000-0000-0000-0000-000000000009', 'ABC-1009', 'Sivadasan Pillai', current_date - interval '67 years', 'male', 'O+', '9847000009', true, now() - interval '60 days'),
  ('e0000000-0000-0000-0000-000000000010', 'ABC-1010', 'Sneha George', current_date - interval '31 years', 'female', 'B+', '9847000010', true, now() - interval '55 days'),
  ('e0000000-0000-0000-0000-000000000011', 'ABC-1011', 'Deepa Suresh', current_date - interval '44 years', 'female', 'A+', '9847000011', true, now() - interval '50 days'),
  ('e0000000-0000-0000-0000-000000000012', 'ABC-1012', 'Rajesh Kurup', current_date - interval '56 years', 'male', 'O+', '9847000012', true, now() - interval '45 days'),
  ('e0000000-0000-0000-0000-000000000013', 'ABC-1013', 'Karthik Varma', current_date - interval '33 years', 'male', 'B+', '9847000013', true, now() - interval '40 days'),
  ('e0000000-0000-0000-0000-000000000014', 'ABC-1014', 'Laila Beevi', current_date - interval '70 years', 'female', 'AB-', '9847000014', true, now() - interval '35 days'),
  ('e0000000-0000-0000-0000-000000000015', 'ABC-1015', 'Mathew Chacko', current_date - interval '49 years', 'male', 'A+', '9847000015', true, now() - interval '30 days'),
  ('e0000000-0000-0000-0000-000000000016', 'ABC-1016', 'Parvathy Warrier', current_date - interval '25 years', 'female', 'O+', '9847000016', true, now() - interval '25 days'),
  ('e0000000-0000-0000-0000-000000000017', 'ABC-1017', 'Biju Chandran', current_date - interval '42 years', 'male', 'B+', '9847000017', true, now() - interval '20 days'),
  ('e0000000-0000-0000-0000-000000000018', 'ABC-1018', 'Rema Panicker', current_date - interval '59 years', 'female', 'A+', '9847000018', true, now() - interval '18 days'),
  ('e0000000-0000-0000-0000-000000000019', 'ABC-1019', 'Vinod Shenoy', current_date - interval '36 years', 'male', 'O-', '9847000019', true, now() - interval '15 days'),
  ('e0000000-0000-0000-0000-000000000020', 'ABC-1020', 'Lakshmi Thampi', current_date - interval '63 years', 'female', 'B-', '9847000020', true, now() - interval '10 days'),
  ('e0000000-0000-0000-0000-000000000021', 'ABC-1021', 'Haridas Namboothiri', current_date - interval '74 years', 'male', 'A+', '9847000021', true, now() - interval '5 days')
on conflict (id) do nothing;

-- 6. Patient Access Mappings
insert into public.patient_access (patient_id, user_id, relationship)
values
  ('e0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'self'),
  ('e0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000002', 'self'),
  -- Mother is guardian of Baby Meenakshi
  ('e0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000002', 'guardian')
on conflict (patient_id, user_id) do nothing;

-- 7. Consents
insert into public.consents (patient_id, user_id, consent_type, version, agreed_at)
values
  ('e0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'general', '1.0', now() - interval '180 days'),
  ('e0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000002', 'general', '1.0', now() - interval '120 days'),
  ('e0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000002', 'general', '1.0', now() - interval '120 days')
on conflict do nothing;

-- 8. Care Team Links
insert into public.care_team (patient_id, staff_id, reason, expires_at)
values
  -- Dr. Rahul cares for Arun Kumar (General Medicine)
  ('e0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000003', 'appointment', now() + interval '1 year'),
  -- Dr. Anjali cares for Arun Kumar (Cardiology referral)
  ('e0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000004', 'appointment', now() + interval '1 year'),
  -- Dr. Kavitha cares for Naveen Raj (Psychiatry)
  ('e0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000006', 'appointment', now() + interval '1 year'),
  -- Dr. Thomas cares for Gokul Das and Mathew Chacko (Orthopedics - zero link to Arun)
  ('e0000000-0000-0000-0000-000000000007', 'b0000000-0000-0000-0000-000000000005', 'appointment', now() + interval '1 year'),
  ('e0000000-0000-0000-0000-000000000015', 'b0000000-0000-0000-0000-000000000005', 'appointment', now() + interval '1 year')
on conflict do nothing;

-- 9. Clinical Encounters for Arun Kumar (3 Signed Consultations over 6 Months)
insert into public.encounters (id, patient_id, doctor_id, department_id, status, sensitivity, chief_complaint, clinical_notes, diagnosis, signed_at, created_at)
values
  -- Visit 1: 6 months ago (now - 180 days)
  ('ec000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000001', 'signed', 'normal', 'Initial evaluation for fatigue and elevated fasting sugar', 'Patient presents with polyuria and fatigue. BP elevated on examination. Starting oral anti-diabetic and ACE inhibitor.', 'Type 2 Diabetes Mellitus, Essential Hypertension', now() - interval '180 days', now() - interval '180 days'),
  -- Visit 2: 3 months ago (now - 90 days)
  ('ec000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000001', 'signed', 'normal', 'Follow-up for glycemic and blood pressure review', 'Fasting sugars erratic. Up-titrated Metformin to 1000mg BD. Advised strict dietary moderation and daily walking.', 'Uncontrolled T2DM, Stage 1 HTN', now() - interval '90 days', now() - interval '90 days'),
  -- Visit 3: 2 weeks ago (now - 14 days)
  ('ec000000-0000-0000-0000-000000000003', 'e0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000001', 'signed', 'normal', 'Worsening lethargy and exertional palpitations', 'HbA1c progressively rising. Complaining of intermittent exertional palpitation. Advised cardiology consult with Dr. Anjali, home BP diary logging, and repeat metabolic panel.', 'T2DM with secondary hypertension; Rule out CAD', now() - interval '14 days', now() - interval '14 days'),
  -- Restricted Encounter for Naveen Raj (Psychiatry Department Only)
  ('ec000000-0000-0000-0000-000000000004', 'e0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000006', 'd0000000-0000-0000-0000-000000000004', 'signed', 'restricted', 'Severe panic episodes and generalized anxiety', 'Psychiatric evaluation conducted in confidence. Initiated SSRI and cognitive therapy schedule.', 'Generalized Anxiety Disorder with Panic Attacks', now() - interval '10 days', now() - interval '10 days'),
  -- Recent signed consultation this month for Faisal Rahman
  ('ec000000-0000-0000-0000-000000000005', 'e0000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000001', 'signed', 'normal', 'Routine diabetic review consultation', 'Blood sugars stable. Continue current regimen.', 'Controlled T2DM', greatest(date_trunc('month', now() at time zone 'Asia/Kolkata') + interval '5 minutes', now() - interval '2 hours'), greatest(date_trunc('month', now() at time zone 'Asia/Kolkata') + interval '5 minutes', now() - interval '2 hours'))
on conflict (id) do nothing;

-- 10. Conditions & Allergies
insert into public.conditions (patient_id, doctor_id, department_id, name, status, sensitivity, diagnosed_date)
values
  ('e0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000001', 'Type 2 Diabetes Mellitus', 'active', 'normal', current_date - interval '180 days'),
  ('e0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000001', 'Essential Hypertension', 'active', 'normal', current_date - interval '180 days')
on conflict do nothing;

insert into public.allergies (patient_id, substance, reaction, severity, recorded_by)
values
  ('e0000000-0000-0000-0000-000000000001', 'Penicillin', 'Urticaria and generalized rash', 'moderate', 'b0000000-0000-0000-0000-000000000003')
on conflict do nothing;

-- 11. Medications for Arun Kumar
insert into public.medications (patient_id, doctor_id, department_id, drug, dose, timing, instructions, status, created_at, updated_at)
values
  ('e0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000001', 'Metformin ER', '1000 mg', '{"morning":true,"afternoon":false,"night":true}', 'Take with meals', 'active', now() - interval '90 days', now() - interval '90 days'),
  ('e0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000001', 'Telmisartan', '40 mg', '{"morning":true,"afternoon":false,"night":false}', 'Take once daily before breakfast', 'active', now() - interval '180 days', now() - interval '180 days')
on conflict do nothing;

-- 12. Clinical Observations
insert into public.observations (patient_id, kind, value_text, unit, source, out_of_range, measured_at, recorded_by, created_at)
values
  -- Rising HbA1c across 3 Visits
  ('e0000000-0000-0000-0000-000000000001', 'HbA1c', '6.8', '%', 'clinic', true, now() - interval '180 days', 'b0000000-0000-0000-0000-000000000003', now() - interval '180 days'),
  ('e0000000-0000-0000-0000-000000000001', 'HbA1c', '7.5', '%', 'clinic', true, now() - interval '90 days', 'b0000000-0000-0000-0000-000000000003', now() - interval '90 days'),
  ('e0000000-0000-0000-0000-000000000001', 'HbA1c', '8.4', '%', 'clinic', true, now() - interval '14 days', 'b0000000-0000-0000-0000-000000000003', now() - interval '14 days'),
  -- Home Blood Pressure diary (logged by patient across past 2 weeks since last visit)
  ('e0000000-0000-0000-0000-000000000001', 'Blood Pressure', '138/86', 'mmHg', 'patient', false, now() - interval '12 days', null, now() - interval '12 days'),
  ('e0000000-0000-0000-0000-000000000001', 'Blood Pressure', '146/92', 'mmHg', 'patient', true, now() - interval '10 days', null, now() - interval '10 days'),
  ('e0000000-0000-0000-0000-000000000001', 'Blood Pressure', '152/96', 'mmHg', 'patient', true, now() - interval '7 days', null, now() - interval '7 days'),
  ('e0000000-0000-0000-0000-000000000001', 'Blood Pressure', '148/94', 'mmHg', 'patient', true, now() - interval '4 days', null, now() - interval '4 days'),
  ('e0000000-0000-0000-0000-000000000001', 'Blood Pressure', '142/90', 'mmHg', 'patient', true, now() - interval '1 day', null, now() - interval '1 day')
on conflict do nothing;

-- 13. Care Plans & Items
insert into public.care_plans (id, patient_id, encounter_id, doctor_id, status, review_date, created_at)
values
  ('cc000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'ec000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000003', 'active', current_date + interval '14 days', now() - interval '14 days'),
  -- Other patient plans
  ('cc000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000005', null, 'b0000000-0000-0000-0000-000000000003', 'active', current_date, now() - interval '20 days')
on conflict (id) do nothing;

insert into public.care_plan_items (id, care_plan_id, patient_id, kind, detail, due_date, status, created_at)
values
  -- 1 Missed follow-up for Arun Kumar (due 3 days ago, pending)
  ('ca000000-0000-0000-0000-000000000001', 'cc000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'follow_up', 'Fasting blood sugar & lipid follow-up', current_date - interval '3 days', 'pending', now() - interval '14 days'),
  -- Follow-up due today for dashboard counts
  ('ca000000-0000-0000-0000-000000000002', 'cc000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000005', 'follow_up', 'Hypertension review check', current_date, 'pending', now() - interval '20 days'),
  -- Future scheduled test
  ('ca000000-0000-0000-0000-000000000003', 'cc000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'test', 'Echocardiogram (2D Echo)', current_date + interval '7 days', 'pending', now() - interval '14 days')
on conflict (id) do nothing;

-- 14. Uploaded Documents (Arun's pending report waiting for review)
insert into public.documents (id, patient_id, storage_path, type, title, report_date, source, review_status, mime_type, file_size_bytes, created_at)
values
  ('dc000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001/metabolic_panel_recent.pdf', 'lab', 'Comprehensive Metabolic Panel & Lipid Profile', current_date - interval '2 days', 'patient', 'pending', 'application/pdf', 245000, now() - interval '2 days'),
  -- Another pending report for dashboard count
  ('dc000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000006', 'e0000000-0000-0000-0000-000000000006/chest_xray.png', 'imaging', 'Chest X-Ray PA View', current_date - interval '1 day', 'patient', 'pending', 'image/png', 1120000, now() - interval '1 day')
on conflict (id) do nothing;

-- 15. Symptom Reports (Arun reported symptom 4 days ago)
insert into public.symptom_reports (patient_id, description, severity, reported_at, created_at)
values
  ('e0000000-0000-0000-0000-000000000001', 'Mild chest tightness and dizziness after morning walk', 'moderate', now() - interval '4 days', now() - interval '4 days'),
  ('e0000000-0000-0000-0000-000000000008', 'Headache and nausea since yesterday', 'mild', now() - interval '1 day', now() - interval '1 day')
on conflict do nothing;

-- 16. Appointments (Today's Bookings & Cardiology Referral)
insert into public.appointments (id, patient_id, doctor_id, department_id, appointment_date, status, notes)
values
  -- Arun Kumar referral visit with Dr. Anjali today
  ('aa000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000004', 'd0000000-0000-0000-0000-000000000002', now() + interval '2 hours', 'booked', 'Referred by Dr. Rahul for cardiac evaluation and exertional palpitations'),
  -- Today's other appointments across departments
  ('aa000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000001', now() + interval '3 hours', 'booked', 'Routine diabetic review'),
  -- Pediatric fever follow-up (Dr. Rahul)
  ('aa000000-0000-0000-0000-000000000003', 'e0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000003', now() + interval '4 hours', 'arrived', 'Pediatric fever follow-up'),
  -- Orthopedic review (Dr. Thomas)
  ('aa000000-0000-0000-0000-000000000004', 'e0000000-0000-0000-0000-000000000007', 'b0000000-0000-0000-0000-000000000005', 'd0000000-0000-0000-0000-000000000005', now() + interval '5 hours', 'booked', 'Knee joint pain review')
on conflict (id) do nothing;

-- 17. Audit Log History (including normal chart views and emergency access)
insert into public.audit_log (at, actor_id, action, table_name, record_id, patient_id, reason)
values
  (now() - interval '14 days', 'a0000000-0000-0000-0000-000000000003', 'VIEWED_CHART', 'patients', 'e0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'Routine consultation review'),
  (now() - interval '10 days', 'a0000000-0000-0000-0000-000000000006', 'VIEWED_CHART', 'patients', 'e0000000-0000-0000-0000-000000000004', 'e0000000-0000-0000-0000-000000000004', 'Psychiatric intake'),
  (now() - interval '2 days', 'a0000000-0000-0000-0000-000000000003', 'EMERGENCY_ACCESS_GRANTED', 'emergency_access', gen_random_uuid(), 'e0000000-0000-0000-0000-000000000009', 'Acute breathlessness in emergency casualty triage')
on conflict do nothing;
