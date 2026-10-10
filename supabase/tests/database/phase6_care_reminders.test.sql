BEGIN;
SELECT plan(20);

-- 1-5. Check tables exist
SELECT has_table('care_plans', 'Table care_plans exists');
SELECT has_table('care_plan_items', 'Table care_plan_items exists');
SELECT has_table('reminders', 'Table reminders exists');
SELECT has_table('push_subscriptions', 'Table push_subscriptions exists');
SELECT has_table('symptom_reports', 'Table symptom_reports exists');

-- 6-7. Check functions exist
SELECT has_function('public', 'claim_due_reminders', ARRAY['integer'], 'Function claim_due_reminders exists');
SELECT has_function('public', 'generate_daily_medicine_reminders', ARRAY[]::text[], 'Function generate_daily_medicine_reminders exists');

-- Seed test fixture data
INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
VALUES 
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin6@example.com', 'hash', now(), '{}', '{}', now(), now()),
  ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'desk6@example.com', 'hash', now(), '{}', '{}', now(), now()),
  ('33333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'cardio6@example.com', 'hash', now(), '{}', '{}', now(), now()),
  ('44444444-4444-4444-4444-444444444444', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'patient6@example.com', 'hash', now(), '{}', '{}', now(), now()),
  ('55555555-5555-5555-5555-555555555555', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'stranger6@example.com', 'hash', now(), '{}', '{}', now(), now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.departments (id, name, code)
VALUES ('d6666666-0000-0000-0000-000000000001', 'Cardiology Dept 6', 'CARDIO6')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.staff (id, user_id, department_id, role, full_name, is_active)
VALUES 
  ('11111110-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'd6666666-0000-0000-0000-000000000001', 'admin', 'Admin 6', true),
  ('22222220-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 'd6666666-0000-0000-0000-000000000001', 'front_desk', 'Desk 6', true),
  ('33333330-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333', 'd6666666-0000-0000-0000-000000000001', 'doctor', 'Dr. Cardio 6', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.patients (id, uhid, full_name, dob, gender, phone, id_checked)
VALUES 
  ('aaaa6666-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'ABC-6001', 'Patient Six', '1982-02-02', 'male', '9847000066', true),
  ('bbbb6666-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'ABC-6002', 'Stranger Six', '1991-03-03', 'female', '9847000067', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.patient_access (patient_id, user_id, relationship)
VALUES 
  ('aaaa6666-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '44444444-4444-4444-4444-444444444444', 'self'),
  ('bbbb6666-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '55555555-5555-5555-5555-555555555555', 'self')
ON CONFLICT (patient_id, user_id) DO NOTHING;

-- Care team link for Dr. Cardio 6
INSERT INTO public.care_team (patient_id, staff_id, reason, expires_at)
VALUES ('aaaa6666-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333330-3333-3333-3333-333333333333', 'appointment', now() + interval '1 year')
ON CONFLICT DO NOTHING;

-- Seed signed encounter
INSERT INTO public.encounters (id, patient_id, doctor_id, department_id, status, sensitivity, chief_complaint, clinical_notes, signed_at)
VALUES ('e6666666-6666-6666-6666-666666666666', 'aaaa6666-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333330-3333-3333-3333-333333333333', 'd6666666-0000-0000-0000-000000000001', 'signed', 'normal', 'HTN checkup', 'Controlled BP', now())
ON CONFLICT (id) DO NOTHING;

-- Seed care plan & item by doctor
INSERT INTO public.care_plans (id, patient_id, encounter_id, doctor_id, status, review_date)
VALUES ('c0006666-6666-6666-6666-666666666666', 'aaaa6666-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'e6666666-6666-6666-6666-666666666666', '33333330-3333-3333-3333-333333333333', 'active', current_date + 30)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.care_plan_items (id, care_plan_id, patient_id, kind, detail, due_date, status)
VALUES ('c1116666-6666-6666-6666-666666666666', 'c0006666-6666-6666-6666-666666666666', 'aaaa6666-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'test', 'Lipid Profile', NULL, 'pending')
ON CONFLICT (id) DO NOTHING;

-- 8. Patient reads own care plan
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"44444444-4444-4444-4444-444444444444","role":"authenticated","aal":"aal1"}', true);
SELECT is(
  (SELECT count(*)::int FROM public.care_plans WHERE patient_id = 'aaaa6666-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  1,
  'Patient can read own care plan'
);

-- 9. Patient cannot read stranger care plan
SELECT is(
  (SELECT count(*)::int FROM public.care_plans WHERE patient_id = 'bbbb6666-bbbb-bbbb-bbbb-bbbbbbbbbbbb'),
  0,
  'Patient cannot read stranger care plans'
);

-- 10. Patient cannot edit doctor care plan
UPDATE public.care_plans SET status = 'cancelled' WHERE id = 'c0006666-6666-6666-6666-666666666666';
SELECT is(
  (SELECT status FROM public.care_plans WHERE id = 'c0006666-6666-6666-6666-666666666666'),
  'active',
  'Patient update on care_plans has no effect (doctor only)'
);

-- 11. Patient can mark own plan item completed
UPDATE public.care_plan_items
SET status = 'completed', completed_at = now()
WHERE id = 'c1116666-6666-6666-6666-666666666666';

SELECT is(
  (SELECT status FROM public.care_plan_items WHERE id = 'c1116666-6666-6666-6666-666666666666'),
  'completed',
  'Patient can tick off own care plan item'
);

-- 12. Patient can insert observation with source = 'patient'
INSERT INTO public.observations (patient_id, kind, value_text, unit, source)
VALUES ('aaaa6666-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Blood Pressure', '124/82', 'mmHg', 'patient');

SELECT is(
  (SELECT count(*)::int FROM public.observations WHERE patient_id = 'aaaa6666-aaaa-aaaa-aaaa-aaaaaaaaaaaa' AND source = 'patient'),
  1,
  'Patient can log vital reading with source = patient'
);

-- 13. Patient cannot insert observation with source = 'clinic'
SELECT throws_ok(
  'INSERT INTO public.observations (patient_id, kind, value_text, unit, source) VALUES (''aaaa6666-aaaa-aaaa-aaaa-aaaaaaaaaaaa'', ''HbA1c'', ''6.2'', ''%'', ''clinic'')',
  '42501',
  NULL,
  'Patient cannot insert observation with source = clinic'
);

-- 14. Patient can insert symptom report for self
INSERT INTO public.symptom_reports (patient_id, description, severity)
VALUES ('aaaa6666-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Mild headache since morning', 'mild');

SELECT is(
  (SELECT count(*)::int FROM public.symptom_reports WHERE patient_id = 'aaaa6666-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  1,
  'Patient can report symptoms for own profile'
);

-- 15. Patient cannot insert symptom report for stranger
SELECT throws_ok(
  'INSERT INTO public.symptom_reports (patient_id, description, severity) VALUES (''bbbb6666-bbbb-bbbb-bbbb-bbbbbbbbbbbb'', ''Fever'', ''moderate'')',
  '42501',
  NULL,
  'Patient cannot report symptoms for stranger'
);

-- 16. Patient cannot read stranger symptom report
SELECT is(
  (SELECT count(*)::int FROM public.symptom_reports WHERE patient_id = 'bbbb6666-bbbb-bbbb-bbbb-bbbbbbbbbbbb'),
  0,
  'Patient cannot read stranger symptom reports'
);

-- 17. Inserting care plan item creates reminder via trigger
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated","aal":"aal2"}', true);

INSERT INTO public.care_plan_items (care_plan_id, patient_id, kind, detail, due_date, status)
VALUES ('c0006666-6666-6666-6666-666666666666', 'aaaa6666-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'test', 'Echocardiogram', current_date + 7, 'pending');

SELECT is(
  (SELECT count(*)::int FROM public.reminders WHERE patient_id = 'aaaa6666-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  1,
  'Trigger automatically creates reminder for scheduled plan item'
);

-- 18. Front desk reads zero care plans
SELECT set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated","aal":"aal2"}', true);
SELECT is(
  (SELECT count(*)::int FROM public.care_plans),
  0,
  'Front desk reads zero care plans'
);

-- 19. Hospital admin reads zero care plans
SELECT set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated","aal":"aal2"}', true);
SELECT is(
  (SELECT count(*)::int FROM public.care_plans),
  0,
  'Hospital admin reads zero care plans'
);

-- 20. claim_due_reminders returns due reminders
SET LOCAL ROLE postgres;
UPDATE public.reminders SET scheduled_for = now() - interval '5 minutes', status = 'pending'
WHERE patient_id = 'aaaa6666-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
SELECT is(
  (SELECT count(*)::int FROM public.claim_due_reminders(10) WHERE patient_id = 'aaaa6666-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  1,
  'claim_due_reminders claims due pending reminders'
);

SELECT * FROM finish();
ROLLBACK;
