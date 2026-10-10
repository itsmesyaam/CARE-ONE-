BEGIN;
SELECT plan(12);

-- Test Fixtures
INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
VALUES 
  ('11111111-9999-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin_sec@example.com', 'hash', now(), '{}', '{}', now(), now()),
  ('33333333-9999-3333-3333-333333333333', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'doctor_sec@example.com', 'hash', now(), '{}', '{}', now(), now()),
  ('44444444-9999-4444-4444-444444444444', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'patient_sec@example.com', 'hash', now(), '{}', '{}', now(), now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.departments (id, name, code)
VALUES ('d9999999-0000-0000-0000-000000000001', 'General Medicine Sec', 'GENSEC')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.staff (id, user_id, department_id, role, full_name, is_active)
VALUES 
  ('33333330-9999-3333-3333-333333333333', '33333333-9999-3333-3333-333333333333', 'd9999999-0000-0000-0000-000000000001', 'doctor', 'Dr. Sec', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.patients (id, uhid, full_name, dob, gender, phone, id_checked)
VALUES 
  ('aaaa9999-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'ABC-9901', 'Patient Sec A', '1980-01-01', 'male', '9847000091', true),
  ('bbbb9999-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'ABC-9902', 'Patient Sec B', '1985-02-02', 'female', '9847000092', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.patient_access (patient_id, user_id, relationship)
VALUES 
  ('aaaa9999-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '44444444-9999-4444-4444-444444444444', 'self')
ON CONFLICT (patient_id, user_id) DO NOTHING;

INSERT INTO public.care_team (patient_id, staff_id, reason, expires_at)
VALUES ('aaaa9999-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333330-9999-3333-3333-333333333333', 'appointment', now() + interval '1 year')
ON CONFLICT DO NOTHING;

-- Seed clinical rows for care patient A
INSERT INTO public.allergies (id, patient_id, substance, severity)
VALUES ('11119999-0000-0000-0000-000000000001', 'aaaa9999-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Penicillin', 'severe')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.conditions (id, patient_id, doctor_id, department_id, name, status)
VALUES ('22229999-0000-0000-0000-000000000001', 'aaaa9999-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333330-9999-3333-3333-333333333333', 'd9999999-0000-0000-0000-000000000001', 'Type 2 Diabetes', 'active')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.medications (id, patient_id, doctor_id, department_id, drug, dose, status)
VALUES ('33339999-0000-0000-0000-000000000001', 'aaaa9999-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333330-9999-3333-3333-333333333333', 'd9999999-0000-0000-0000-000000000001', 'Metformin', '500mg', 'active')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.observations (id, patient_id, kind, value_text, unit, source)
VALUES ('44449999-0000-0000-0000-000000000001', 'aaaa9999-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'blood_pressure', '130/85', 'mmHg', 'clinic')
ON CONFLICT (id) DO NOTHING;

-- 1. Authenticated user CANNOT call claim_due_reminders
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"44444444-9999-4444-4444-444444444444","role":"authenticated"}', true);

SELECT throws_ok(
  'SELECT public.claim_due_reminders(10)',
  '42501',
  NULL,
  'Authenticated patient cannot execute claim_due_reminders'
);

-- 2. Authenticated user CANNOT call generate_daily_medicine_reminders
SELECT throws_ok(
  'SELECT public.generate_daily_medicine_reminders()',
  '42501',
  NULL,
  'Authenticated patient cannot execute generate_daily_medicine_reminders'
);

-- 3. Document insertion rejects storage_path not matching patient_id folder prefix
SELECT throws_ok(
  'INSERT INTO public.documents (patient_id, title, mime_type, storage_path, type, source, review_status) VALUES (''aaaa9999-aaaa-aaaa-aaaa-aaaaaaaaaaaa'', ''Test Report'', ''application/pdf'', ''bbbb9999-bbbb-bbbb-bbbb-bbbbbbbbbbbb/test.pdf'', ''lab'', ''patient'', ''pending'')',
  '23514',
  NULL,
  'Document insert rejects storage_path pointing to a different patient folder'
);

-- 4. Document insertion succeeds when storage_path matches patient_id prefix
INSERT INTO public.documents (patient_id, title, mime_type, storage_path, type, source, review_status)
VALUES ('aaaa9999-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'My Report', 'application/pdf', 'aaaa9999-aaaa-aaaa-aaaa-aaaaaaaaaaaa/report.pdf', 'lab', 'patient', 'pending');

SELECT is(
  (SELECT count(*)::int FROM public.documents WHERE patient_id = 'aaaa9999-aaaa-aaaa-aaaa-aaaaaaaaaaaa' AND title = 'My Report'),
  1,
  'Document insert succeeds when storage_path begins with own patient_id'
);

-- Doctor role with AAL2 for clinical delete and update checks
SELECT set_config('request.jwt.claims', '{"sub":"33333333-9999-3333-3333-333333333333","role":"authenticated","aal":"aal2"}', true);

-- 5. Doctor CANNOT hard delete allergies
DELETE FROM public.allergies WHERE id = '11119999-0000-0000-0000-000000000001';
SELECT is(
  (SELECT count(*)::int FROM public.allergies WHERE id = '11119999-0000-0000-0000-000000000001'),
  1,
  'Doctor cannot hard delete allergies (RLS blocks delete)'
);

-- 6. Doctor CANNOT hard delete conditions
DELETE FROM public.conditions WHERE id = '22229999-0000-0000-0000-000000000001';
SELECT is(
  (SELECT count(*)::int FROM public.conditions WHERE id = '22229999-0000-0000-0000-000000000001'),
  1,
  'Doctor cannot hard delete conditions (RLS blocks delete)'
);

-- 7. Doctor CANNOT hard delete medications
DELETE FROM public.medications WHERE id = '33339999-0000-0000-0000-000000000001';
SELECT is(
  (SELECT count(*)::int FROM public.medications WHERE id = '33339999-0000-0000-0000-000000000001'),
  1,
  'Doctor cannot hard delete medications (RLS blocks delete)'
);

-- 8. Doctor CANNOT hard delete observations
DELETE FROM public.observations WHERE id = '44449999-0000-0000-0000-000000000001';
SELECT is(
  (SELECT count(*)::int FROM public.observations WHERE id = '44449999-0000-0000-0000-000000000001'),
  1,
  'Doctor cannot hard delete observations (RLS blocks delete)'
);

-- 9. Doctor CAN update allergies
UPDATE public.allergies SET severity = 'moderate' WHERE id = '11119999-0000-0000-0000-000000000001';
SELECT is(
  (SELECT severity FROM public.allergies WHERE id = '11119999-0000-0000-0000-000000000001'),
  'moderate',
  'Doctor can update allergies for care patient'
);

-- 10. Doctor CAN insert allergies for care patient
INSERT INTO public.allergies (patient_id, substance, severity)
VALUES ('aaaa9999-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Aspirin', 'mild');
SELECT is(
  (SELECT count(*)::int FROM public.allergies WHERE patient_id = 'aaaa9999-aaaa-aaaa-aaaa-aaaaaaaaaaaa' AND substance = 'Aspirin'),
  1,
  'Doctor can insert new allergy for care patient'
);

-- 11. Doctor CAN update conditions
UPDATE public.conditions SET status = 'resolved' WHERE id = '22229999-0000-0000-0000-000000000001';
SELECT is(
  (SELECT status FROM public.conditions WHERE id = '22229999-0000-0000-0000-000000000001'),
  'resolved',
  'Doctor can update condition status'
);

-- 12. Doctor CAN update medications
UPDATE public.medications SET status = 'stopped' WHERE id = '33339999-0000-0000-0000-000000000001';
SELECT is(
  (SELECT status FROM public.medications WHERE id = '33339999-0000-0000-0000-000000000001'),
  'stopped',
  'Doctor can update medication status'
);

SELECT * FROM finish();
ROLLBACK;
