BEGIN;
SELECT plan(12);

-- 1-3. Check functions exist
SELECT has_function('public', 'get_admin_dashboard_counts', ARRAY[]::text[], 'Function get_admin_dashboard_counts exists');
SELECT has_function('public', 'get_admin_audit_logs', ARRAY['date', 'date', 'uuid', 'text', 'integer', 'integer'], 'Function get_admin_audit_logs exists');
SELECT has_function('public', 'what_changed', ARRAY['uuid'], 'Function what_changed exists');

-- Seed test fixture data
INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
VALUES 
  ('11111111-7777-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin7@example.com', 'hash', now(), '{}', '{}', now(), now()),
  ('22222222-7777-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'desk7@example.com', 'hash', now(), '{}', '{}', now(), now()),
  ('33333333-7777-3333-3333-333333333333', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'drcare7@example.com', 'hash', now(), '{}', '{}', now(), now()),
  ('44444444-7777-4444-4444-444444444444', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'drstranger7@example.com', 'hash', now(), '{}', '{}', now(), now()),
  ('55555555-7777-5555-5555-555555555555', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'patient7@example.com', 'hash', now(), '{}', '{}', now(), now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.departments (id, name, code)
VALUES ('d7777777-0000-0000-0000-000000000001', 'General Medicine 7', 'GEN7')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.staff (id, user_id, department_id, role, full_name, is_active)
VALUES 
  ('11111110-7777-1111-1111-111111111111', '11111111-7777-1111-1111-111111111111', 'd7777777-0000-0000-0000-000000000001', 'admin', 'Admin Seven', true),
  ('22222220-7777-2222-2222-222222222222', '22222222-7777-2222-2222-222222222222', 'd7777777-0000-0000-0000-000000000001', 'front_desk', 'Desk Seven', true),
  ('33333330-7777-3333-3333-333333333333', '33333333-7777-3333-3333-333333333333', 'd7777777-0000-0000-0000-000000000001', 'doctor', 'Dr. Care Seven', true),
  ('44444440-7777-4444-4444-444444444444', '44444444-7777-4444-4444-444444444444', 'd7777777-0000-0000-0000-000000000001', 'doctor', 'Dr. Stranger Seven', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.patients (id, uhid, full_name, dob, gender, phone, id_checked)
VALUES 
  ('aaaa7777-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'ABC-7001', 'Patient Seven', '1985-05-05', 'female', '9847000077', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.patient_access (patient_id, user_id, relationship)
VALUES 
  ('aaaa7777-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '55555555-7777-5555-5555-555555555555', 'self')
ON CONFLICT (patient_id, user_id) DO NOTHING;

-- Care team link for Dr. Care 7 only (Dr. Stranger 7 has NO care link)
INSERT INTO public.care_team (patient_id, staff_id, reason, expires_at)
VALUES ('aaaa7777-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333330-7777-3333-3333-333333333333', 'appointment', now() + interval '1 year')
ON CONFLICT DO NOTHING;

-- Signed encounter 2 days ago
INSERT INTO public.encounters (id, patient_id, doctor_id, department_id, status, sensitivity, chief_complaint, clinical_notes, signed_at, created_at)
VALUES ('e7777777-7777-7777-7777-777777777777', 'aaaa7777-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333330-7777-3333-3333-333333333333', 'd7777777-0000-0000-0000-000000000001', 'signed', 'normal', 'Routine visit', 'Stable', now() - interval '2 days', now() - interval '2 days')
ON CONFLICT (id) DO NOTHING;

-- New document created 1 day ago (since last encounter)
INSERT INTO public.documents (id, patient_id, storage_path, type, title, report_date, source, review_status, mime_type, created_at)
VALUES ('d0007777-7777-7777-7777-777777777777', 'aaaa7777-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'aaaa7777-aaaa-aaaa-aaaa-aaaaaaaaaaaa/doc1.pdf', 'lab', 'Recent Blood Test', current_date - 1, 'patient', 'pending', 'application/pdf', now() - interval '1 day')
ON CONFLICT (id) DO NOTHING;

-- Seed an appointment today
INSERT INTO public.appointments (id, patient_id, doctor_id, department_id, appointment_date, status)
VALUES ('a0007777-7777-7777-7777-777777777777', 'aaaa7777-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333330-7777-3333-3333-333333333333', 'd7777777-0000-0000-0000-000000000001', now(), 'booked')
ON CONFLICT (id) DO NOTHING;

-- Seed a follow-up item due today
INSERT INTO public.care_plans (id, patient_id, encounter_id, doctor_id, status, review_date)
VALUES ('c0007777-7777-7777-7777-777777777777', 'aaaa7777-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'e7777777-7777-7777-7777-777777777777', '33333330-7777-3333-3333-333333333333', 'active', current_date)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.care_plan_items (id, care_plan_id, patient_id, kind, detail, due_date, status)
VALUES ('c1117777-7777-7777-7777-777777777777', 'c0007777-7777-7777-7777-777777777777', 'aaaa7777-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'follow_up', 'Review blood work', current_date, 'pending')
ON CONFLICT (id) DO NOTHING;

-- 4. what_changed returns zero rows for a doctor with no care link
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"44444444-7777-4444-4444-444444444444","role":"authenticated","aal":"aal2"}', true);
SELECT is(
  (SELECT count(*)::int FROM public.what_changed('aaaa7777-aaaa-aaaa-aaaa-aaaaaaaaaaaa')),
  0,
  'what_changed returns zero rows for a doctor with no care link'
);

-- 5. what_changed returns new events for doctor ON care team
SELECT set_config('request.jwt.claims', '{"sub":"33333333-7777-3333-3333-333333333333","role":"authenticated","aal":"aal2"}', true);
SELECT is(
  (SELECT count(*)::int FROM public.what_changed('aaaa7777-aaaa-aaaa-aaaa-aaaaaaaaaaaa')),
  1,
  'what_changed returns new document for care team doctor'
);

-- 6. Dashboard RPC refuses non-admin (doctor)
SELECT throws_ok(
  'SELECT * FROM public.get_admin_dashboard_counts()',
  'P0001',
  NULL,
  'Dashboard RPC refuses non-admin doctor'
);

-- 7. Dashboard RPC refuses front desk
SELECT set_config('request.jwt.claims', '{"sub":"22222222-7777-2222-2222-222222222222","role":"authenticated","aal":"aal2"}', true);
SELECT throws_ok(
  'SELECT * FROM public.get_admin_dashboard_counts()',
  'P0001',
  NULL,
  'Dashboard RPC refuses front desk'
);

-- 8. Dashboard RPC refuses admin without aal2
SELECT set_config('request.jwt.claims', '{"sub":"11111111-7777-1111-1111-111111111111","role":"authenticated","aal":"aal1"}', true);
SELECT throws_ok(
  'SELECT * FROM public.get_admin_dashboard_counts()',
  'P0001',
  NULL,
  'Dashboard RPC refuses admin without aal2'
);

-- 9. Dashboard RPC succeeds for admin with aal2 and returns counts
SELECT set_config('request.jwt.claims', '{"sub":"11111111-7777-1111-1111-111111111111","role":"authenticated","aal":"aal2"}', true);
SELECT is(
  (SELECT (today_appointments >= 1 AND reports_waiting_review >= 1) FROM public.get_admin_dashboard_counts()),
  true,
  'Dashboard RPC returns correct counts for active admin with aal2'
);

-- 10. Access log RPC refuses non-admin (doctor)
SELECT set_config('request.jwt.claims', '{"sub":"33333333-7777-3333-3333-333333333333","role":"authenticated","aal":"aal2"}', true);
SELECT throws_ok(
  'SELECT * FROM public.get_admin_audit_logs()',
  'P0001',
  NULL,
  'Access log RPC refuses non-admin doctor'
);

-- 11. Access log RPC succeeds for admin with aal2
SELECT set_config('request.jwt.claims', '{"sub":"11111111-7777-1111-1111-111111111111","role":"authenticated","aal":"aal2"}', true);
SELECT is(
  (SELECT count(*)::int >= 0 FROM public.get_admin_audit_logs()),
  true,
  'Access log RPC succeeds for admin with aal2'
);

-- 12. Access log function never returns old_row or new_row
SELECT is(
  (SELECT count(*)::int
   FROM information_schema.routines r
   JOIN information_schema.parameters p
     ON r.specific_name = p.specific_name
   WHERE r.routine_schema = 'public'
     AND r.routine_name = 'get_admin_audit_logs'
     AND p.parameter_mode = 'OUT'
     AND p.parameter_name IN ('old_row', 'new_row')),
  0,
  'get_admin_audit_logs never exposes old_row or new_row output parameters'
);

SELECT * FROM finish();
ROLLBACK;
