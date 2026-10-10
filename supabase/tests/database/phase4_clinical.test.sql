BEGIN;
SELECT plan(22);

-- 1-6. Check clinical tables exist
SELECT has_table('encounters', 'Table encounters exists');
SELECT has_table('encounter_addenda', 'Table encounter_addenda exists');
SELECT has_table('conditions', 'Table conditions exists');
SELECT has_table('allergies', 'Table allergies exists');
SELECT has_table('medications', 'Table medications exists');
SELECT has_table('observations', 'Table observations exists');

-- 7. Check timeline view exists
SELECT has_view('patient_timeline', 'View patient_timeline exists');

-- 8-9. Check RPC functions exist
SELECT has_function('public', 'log_chart_view', ARRAY['uuid'], 'Function public.log_chart_view exists');
SELECT has_function('public', 'request_emergency_access', ARRAY['uuid', 'text'], 'Function public.request_emergency_access exists');

-- Seed test fixture data
INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
VALUES 
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin4@example.com', 'hash', now(), '{}', '{}', now(), now()),
  ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'desk4@example.com', 'hash', now(), '{}', '{}', now(), now()),
  ('33333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'cardio_doc@example.com', 'hash', now(), '{}', '{}', now(), now()),
  ('33333333-3333-3333-3333-333333333334', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'ortho_doc@example.com', 'hash', now(), '{}', '{}', now(), now()),
  ('33333333-3333-3333-3333-333333333335', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'no_care_doc@example.com', 'hash', now(), '{}', '{}', now(), now()),
  ('44444444-4444-4444-4444-444444444444', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'patient4@example.com', 'hash', now(), '{}', '{}', now(), now()),
  ('55555555-5555-5555-5555-555555555555', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'stranger4@example.com', 'hash', now(), '{}', '{}', now(), now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.departments (id, name, code)
VALUES 
  ('d1111111-0000-0000-0000-000000000001', 'Cardiology Dept', 'CARDIO4'),
  ('d2222222-0000-0000-0000-000000000002', 'Orthopedics Dept', 'ORTHO4')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.staff (id, user_id, department_id, role, full_name, is_active)
VALUES 
  ('11111110-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'd1111111-0000-0000-0000-000000000001', 'admin', 'Admin 4', true),
  ('22222220-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 'd1111111-0000-0000-0000-000000000001', 'front_desk', 'Desk 4', true),
  ('33333330-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333', 'd1111111-0000-0000-0000-000000000001', 'doctor', 'Dr. Cardio', true),
  ('33333330-3333-3333-3333-333333333334', '33333333-3333-3333-3333-333333333334', 'd2222222-0000-0000-0000-000000000002', 'doctor', 'Dr. Ortho', true),
  ('33333330-3333-3333-3333-333333333335', '33333333-3333-3333-3333-333333333335', 'd1111111-0000-0000-0000-000000000001', 'doctor', 'Dr. NoCare', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.patients (id, uhid, full_name, dob, gender, phone, id_checked)
VALUES 
  ('aaaa4444-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'ABC-4001', 'Patient Four', '1985-05-15', 'female', '9847000001', true),
  ('bbbb4444-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'ABC-4002', 'Stranger Four', '1992-08-20', 'male', '9847000002', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.patient_access (patient_id, user_id, relationship)
VALUES 
  ('aaaa4444-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '44444444-4444-4444-4444-444444444444', 'self'),
  ('bbbb4444-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '55555555-5555-5555-5555-555555555555', 'self')
ON CONFLICT (patient_id, user_id) DO NOTHING;

-- Care team link: Dr. Cardio and Dr. Ortho are on care team for Patient Four
INSERT INTO public.care_team (patient_id, staff_id, reason, expires_at)
VALUES 
  ('aaaa4444-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333330-3333-3333-3333-333333333333', 'appointment', now() + interval '1 year'),
  ('aaaa4444-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333330-3333-3333-3333-333333333334', 'consultation', now() + interval '1 year')
ON CONFLICT DO NOTHING;

-- Clinical seed: normal signed encounter, draft encounter, restricted signed encounter
INSERT INTO public.encounters (id, patient_id, doctor_id, department_id, status, sensitivity, chief_complaint, clinical_notes, signed_at)
VALUES 
  ('e1111111-1111-1111-1111-111111111111', 'aaaa4444-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333330-3333-3333-3333-333333333333', 'd1111111-0000-0000-0000-000000000001', 'signed', 'normal', 'Chest pain', 'ECG normal', now()),
  ('e2222222-2222-2222-2222-222222222222', 'aaaa4444-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333330-3333-3333-3333-333333333333', 'd1111111-0000-0000-0000-000000000001', 'draft', 'normal', 'Follow up draft', 'Pending lab report', null),
  ('e3333333-3333-3333-3333-333333333333', 'aaaa4444-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333330-3333-3333-3333-333333333333', 'd1111111-0000-0000-0000-000000000001', 'signed', 'restricted', 'Psych evaluation', 'Restricted cardiology notes', now())
ON CONFLICT (id) DO NOTHING;

-- 10. Emergency access rejects reason under 15 chars
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"33333333-3333-3333-3333-333333333335","role":"authenticated","aal":"aal2"}', true);
SELECT throws_ok(
  'SELECT public.request_emergency_access(''bbbb4444-bbbb-bbbb-bbbb-bbbbbbbbbbbb''::uuid, ''Too short'')',
  'P0001',
  NULL,
  'Emergency access rejects reason under 15 characters'
);

-- 11. Emergency access succeeds for reason >= 15 chars
SELECT lives_ok(
  'SELECT public.request_emergency_access(''bbbb4444-bbbb-bbbb-bbbb-bbbbbbbbbbbb''::uuid, ''Severe acute trauma emergency in ER triage'')',
  'Emergency access succeeds with reason >= 15 characters'
);

-- 12. Log chart view RPC records audit log
SELECT lives_ok(
  'SELECT public.log_chart_view(''bbbb4444-bbbb-bbbb-bbbb-bbbbbbbbbbbb''::uuid)',
  'log_chart_view RPC succeeds'
);

-- 13. Freeze trigger: signed notes cannot change
SET LOCAL ROLE postgres;
SELECT throws_ok(
  'UPDATE public.encounters SET chief_complaint = ''Tampered'' WHERE id = ''e1111111-1111-1111-1111-111111111111''',
  'P0001',
  NULL,
  'Trigger freezes signed notes: UPDATE rejected'
);

-- 14. Addendum can be added for signed encounter
INSERT INTO public.encounter_addenda (encounter_id, patient_id, doctor_id, reason, notes)
VALUES ('e1111111-1111-1111-1111-111111111111', 'aaaa4444-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333330-3333-3333-3333-333333333333', 'Correction to BP reading', 'BP rechecked at 120/80');

SELECT is(
  (SELECT count(*)::int FROM public.encounter_addenda WHERE encounter_id = 'e1111111-1111-1111-1111-111111111111'),
  1,
  'Encounter addendum successfully inserted'
);

-- 15. Doctor with no care link reads zero clinical rows for Patient Four
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"33333333-3333-3333-3333-333333333335","role":"authenticated","aal":"aal2"}', true);
SELECT is(
  (SELECT count(*)::int FROM public.encounters WHERE patient_id = 'aaaa4444-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  0,
  'Doctor with no care link reads zero clinical rows'
);

-- 16. Care team doctor in same authoring department reads restricted encounter
SELECT set_config('request.jwt.claims', '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated","aal":"aal2"}', true);
SELECT is(
  (SELECT count(*)::int FROM public.encounters WHERE id = 'e3333333-3333-3333-3333-333333333333'),
  1,
  'Doctor in authoring department reads restricted encounter'
);

-- 17. Care team doctor in DIFFERENT department cannot read restricted encounter
SELECT set_config('request.jwt.claims', '{"sub":"33333333-3333-3333-3333-333333333334","role":"authenticated","aal":"aal2"}', true);
SELECT is(
  (SELECT count(*)::int FROM public.encounters WHERE id = 'e3333333-3333-3333-3333-333333333333'),
  0,
  'Doctor in different department cannot read restricted encounter'
);

-- 18. Front desk reads zero clinical rows
SELECT set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated","aal":"aal2"}', true);
SELECT is(
  (SELECT count(*)::int FROM public.encounters),
  0,
  'Front desk reads zero clinical rows'
);

-- 19. Hospital admin reads zero clinical rows
SELECT set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated","aal":"aal2"}', true);
SELECT is(
  (SELECT count(*)::int FROM public.encounters),
  0,
  'Hospital admin reads zero clinical rows'
);

-- 20. Patient reads own signed encounters
SELECT set_config('request.jwt.claims', '{"sub":"44444444-4444-4444-4444-444444444444","role":"authenticated","aal":"aal1"}', true);
SELECT is(
  (SELECT count(*)::int FROM public.encounters WHERE id = 'e1111111-1111-1111-1111-111111111111'),
  1,
  'Patient reads own signed encounter'
);

-- 21. Patient cannot read own draft encounter
SELECT is(
  (SELECT count(*)::int FROM public.encounters WHERE id = 'e2222222-2222-2222-2222-222222222222'),
  0,
  'Patient cannot read draft encounter'
);

-- 22. Patient cannot read stranger encounters
SELECT is(
  (SELECT count(*)::int FROM public.encounters WHERE patient_id = 'bbbb4444-bbbb-bbbb-bbbb-bbbbbbbbbbbb'),
  0,
  'Patient cannot read stranger encounters'
);

SELECT * FROM finish();
ROLLBACK;
