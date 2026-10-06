BEGIN;
SELECT plan(21);

-- 1. Departments has archived_at
SELECT has_column('departments', 'archived_at', 'departments has archived_at column');

-- 2. Patients has id_checked
SELECT has_column('patients', 'id_checked', 'patients has id_checked column');

-- 3. Sequence and generate_patient_uhid function exist
SELECT has_function('public', 'generate_patient_uhid', ARRAY[]::text[], 'Function public.generate_patient_uhid exists');
SELECT ok(
  public.generate_patient_uhid() ~ '^ABC-[0-9]+$',
  'generate_patient_uhid produces short_code-sequence format'
);

-- 4. Appointments table exists with required columns
SELECT has_table('appointments', 'Table appointments exists');
SELECT has_column('appointments', 'patient_id', 'appointments has patient_id');
SELECT has_column('appointments', 'doctor_id', 'appointments has doctor_id');
SELECT has_column('appointments', 'appointment_date', 'appointments has appointment_date');
SELECT has_column('appointments', 'status', 'appointments has status');

-- 5. Consents table exists and is immutable
SELECT has_table('consents', 'Table consents exists');
SELECT ok(
  NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'consents' AND cmd IN ('UPDATE', 'DELETE')
  ),
  'consents has no UPDATE or DELETE policies'
);

-- Seed test fixture data
INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
VALUES 
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'test_admin@example.com', 'hash', now(), '{}', '{}', now(), now()),
  ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'test_desk@example.com', 'hash', now(), '{}', '{}', now(), now()),
  ('33333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'test_doctor@example.com', 'hash', now(), '{}', '{}', now(), now()),
  ('44444444-4444-4444-4444-444444444444', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'test_patient_parent@example.com', 'hash', now(), '{}', '{}', now(), now()),
  ('55555555-5555-5555-5555-555555555555', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'test_stranger@example.com', 'hash', now(), '{}', '{}', now(), now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.departments (id, name, code)
VALUES ('d0000000-0000-0000-0000-000000000001', 'Test Cardiology', 'CARDIO')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.staff (id, user_id, department_id, role, full_name, is_active)
VALUES 
  ('11111110-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'd0000000-0000-0000-0000-000000000001', 'admin', 'Admin User', true),
  ('22222220-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 'd0000000-0000-0000-0000-000000000001', 'front_desk', 'Desk User', true),
  ('33333330-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333', 'd0000000-0000-0000-0000-000000000001', 'doctor', 'Dr. Smith', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.patients (id, uhid, full_name, dob, gender, phone, id_checked)
VALUES 
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'ABC-0001', 'Patient Parent', '1980-01-01', 'female', '9876543210', true),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'ABC-0002', 'Patient Child', '2015-05-05', 'male', '9876543210', true),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'ABC-0003', 'Patient Stranger', '1990-09-09', 'male', '9876543211', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.patient_access (patient_id, user_id, relationship)
VALUES 
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '44444444-4444-4444-4444-444444444444', 'self'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '44444444-4444-4444-4444-444444444444', 'guardian'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '55555555-5555-5555-5555-555555555555', 'self')
ON CONFLICT (patient_id, user_id) DO NOTHING;

-- 6. Trigger adds doctor to care_team on appointment booking with 1-year expiry
INSERT INTO public.appointments (patient_id, doctor_id, department_id, appointment_date, status)
VALUES ('cccccccc-cccc-cccc-cccc-cccccccccccc', '33333330-3333-3333-3333-333333333333', 'd0000000-0000-0000-0000-000000000001', '2026-11-01 10:00:00+00', 'booked');

SELECT is(
  (SELECT expires_at FROM public.care_team 
   WHERE patient_id = 'cccccccc-cccc-cccc-cccc-cccccccccccc' 
     AND staff_id = '33333330-3333-3333-3333-333333333333'
   ORDER BY created_at DESC LIMIT 1),
  '2027-11-01 10:00:00+00'::timestamptz,
  'Booking appointment sets care_team expires_at to exactly 1 year later'
);

-- Seed appointment for parent and child
INSERT INTO public.appointments (patient_id, doctor_id, department_id, appointment_date, status)
VALUES 
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333330-3333-3333-3333-333333333333', 'd0000000-0000-0000-0000-000000000001', '2026-11-02 10:00:00+00', 'booked'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '33333330-3333-3333-3333-333333333333', 'd0000000-0000-0000-0000-000000000001', '2026-11-03 10:00:00+00', 'booked');

-- 7. Test Front Desk read patients
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated","aal":"aal2"}', true);
SELECT is(
  (SELECT count(*)::int FROM public.patients),
  3,
  'Front desk with AAL2 can read all patients'
);

-- 8. Front Desk cannot change audit_log
SELECT throws_ok(
  'DELETE FROM public.audit_log',
  '42501',
  NULL,
  'Front desk cannot modify or delete audit_log'
);

-- 9. Admin cannot read individual patient rows
SELECT set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated","aal":"aal2"}', true);
SELECT is(
  (SELECT count(*)::int FROM public.patients),
  0,
  'Hospital admin cannot read individual patient records'
);

-- 10. Admin cannot read individual patient appointments
SELECT is(
  (SELECT count(*)::int FROM public.appointments),
  0,
  'Hospital admin cannot read clinical appointments'
);

-- 11. Patient sees only their own and their child appointments
SELECT set_config('request.jwt.claims', '{"sub":"44444444-4444-4444-4444-444444444444","role":"authenticated","aal":"aal1"}', true);
SELECT is(
  (SELECT count(*)::int FROM public.appointments),
  2,
  'Patient sees only their own and child appointments (2 out of 3)'
);

-- 12. Patient cannot see stranger appointment
SELECT is(
  (SELECT count(*)::int FROM public.appointments WHERE patient_id = 'cccccccc-cccc-cccc-cccc-cccccccccccc'),
  0,
  'Patient cannot see stranger appointment'
);

-- 13. Patient can insert own consent
INSERT INTO public.consents (patient_id, user_id, consent_type, version)
VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '44444444-4444-4444-4444-444444444444', 'general', '1.0');

SELECT is(
  (SELECT count(*)::int FROM public.consents WHERE patient_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  1,
  'Patient can insert and read own consent'
);

-- 14. Patient cannot insert consent for stranger
SELECT throws_ok(
  'INSERT INTO public.consents (patient_id, user_id, consent_type, version) VALUES (''cccccccc-cccc-cccc-cccc-cccccccccccc'', ''44444444-4444-4444-4444-444444444444'', ''general'', ''1.0'')',
  '42501',
  NULL,
  'Patient cannot insert consent for patient they do not have access to'
);

-- 15. Consents cannot be deleted
SELECT throws_ok(
  'DELETE FROM public.consents',
  '42501',
  NULL,
  'Consents cannot be deleted'
);

SELECT * FROM finish();
ROLLBACK;
