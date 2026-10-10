BEGIN;
SELECT plan(22);

-- 1-3. Check storage bucket patient-files
SELECT ok(
  EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'patient-files'),
  'Bucket patient-files exists'
);

SELECT ok(
  (SELECT public FROM storage.buckets WHERE id = 'patient-files') = false,
  'Bucket patient-files is private'
);

SELECT ok(
  (SELECT file_size_limit FROM storage.buckets WHERE id = 'patient-files') = 10485760,
  'Bucket patient-files has 10 MB limit'
);

-- 4. Check documents table exists with required columns
SELECT has_table('documents', 'Table documents exists');
SELECT has_column('documents', 'patient_id', 'documents has patient_id');
SELECT has_column('documents', 'storage_path', 'documents has storage_path');
SELECT has_column('documents', 'review_status', 'documents has review_status');

-- Seed test fixture data
INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
VALUES 
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin5@example.com', 'hash', now(), '{}', '{}', now(), now()),
  ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'desk5@example.com', 'hash', now(), '{}', '{}', now(), now()),
  ('33333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'cardio5@example.com', 'hash', now(), '{}', '{}', now(), now()),
  ('33333333-3333-3333-3333-333333333335', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'nocare5@example.com', 'hash', now(), '{}', '{}', now(), now()),
  ('44444444-4444-4444-4444-444444444444', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'patient5@example.com', 'hash', now(), '{}', '{}', now(), now()),
  ('55555555-5555-5555-5555-555555555555', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'stranger5@example.com', 'hash', now(), '{}', '{}', now(), now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.departments (id, name, code)
VALUES ('d5555555-0000-0000-0000-000000000001', 'Cardiology Dept 5', 'CARDIO5')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.staff (id, user_id, department_id, role, full_name, is_active)
VALUES 
  ('11111110-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'd5555555-0000-0000-0000-000000000001', 'admin', 'Admin 5', true),
  ('22222220-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 'd5555555-0000-0000-0000-000000000001', 'front_desk', 'Desk 5', true),
  ('33333330-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333', 'd5555555-0000-0000-0000-000000000001', 'doctor', 'Dr. Cardio 5', true),
  ('33333330-3333-3333-3333-333333333335', '33333333-3333-3333-3333-333333333335', 'd5555555-0000-0000-0000-000000000001', 'doctor', 'Dr. NoCare 5', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.patients (id, uhid, full_name, dob, gender, phone, id_checked)
VALUES 
  ('aaaa5555-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'ABC-5001', 'Patient Five', '1987-07-07', 'female', '9847000055', true),
  ('bbbb5555-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'ABC-5002', 'Stranger Five', '1995-10-10', 'male', '9847000056', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.patient_access (patient_id, user_id, relationship)
VALUES 
  ('aaaa5555-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '44444444-4444-4444-4444-444444444444', 'self'),
  ('bbbb5555-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '55555555-5555-5555-5555-555555555555', 'self')
ON CONFLICT (patient_id, user_id) DO NOTHING;

-- Care team link for Dr. Cardio 5
INSERT INTO public.care_team (patient_id, staff_id, reason, expires_at)
VALUES ('aaaa5555-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333330-3333-3333-3333-333333333333', 'appointment', now() + interval '1 year')
ON CONFLICT DO NOTHING;

-- 5. Patient cannot upload to stranger patient folder
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"44444444-4444-4444-4444-444444444444","role":"authenticated","aal":"aal1"}', true);
SELECT throws_ok(
  'INSERT INTO storage.objects (bucket_id, name, owner) VALUES (''patient-files'', ''bbbb5555-bbbb-bbbb-bbbb-bbbbbbbbbbbb/stranger.pdf'', ''44444444-4444-4444-4444-444444444444'')',
  '42501',
  NULL,
  'Patient cannot upload into a stranger folder'
);

-- 6. Patient can upload to own patient folder
INSERT INTO storage.objects (bucket_id, name, owner)
VALUES ('patient-files', 'aaaa5555-aaaa-aaaa-aaaa-aaaaaaaaaaaa/my_blood_test.pdf', '44444444-4444-4444-4444-444444444444');

SELECT is(
  (SELECT count(*)::int FROM storage.objects WHERE name = 'aaaa5555-aaaa-aaaa-aaaa-aaaaaaaaaaaa/my_blood_test.pdf'),
  0,
  'File in storage is not yet selectable until documents row exists'
);

-- 7. Patient can insert own document as pending
INSERT INTO public.documents (id, patient_id, storage_path, type, title, source, review_status, mime_type)
VALUES (
  'd0000001-1111-1111-1111-111111111111',
  'aaaa5555-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'aaaa5555-aaaa-aaaa-aaaa-aaaaaaaaaaaa/my_blood_test.pdf',
  'lab',
  'Blood Test Report',
  'patient',
  'pending',
  'application/pdf'
);

SELECT is(
  (SELECT count(*)::int FROM public.documents WHERE id = 'd0000001-1111-1111-1111-111111111111'),
  1,
  'Patient inserted own document with review_status pending'
);

-- 8. File in storage is now readable because documents row exists
SELECT is(
  (SELECT count(*)::int FROM storage.objects WHERE name = 'aaaa5555-aaaa-aaaa-aaaa-aaaaaaaaaaaa/my_blood_test.pdf'),
  1,
  'File in storage is readable once documents row exists'
);

-- 9. Patient cannot insert document as reviewed
SELECT throws_ok(
  'INSERT INTO public.documents (patient_id, storage_path, type, title, source, review_status, mime_type) VALUES (''aaaa5555-aaaa-aaaa-aaaa-aaaaaaaaaaaa'', ''aaaa5555-aaaa-aaaa-aaaa-aaaaaaaaaaaa/test2.pdf'', ''lab'', ''Fake Reviewed'', ''patient'', ''reviewed'', ''application/pdf'')',
  '42501',
  NULL,
  'Patient cannot insert document marked as reviewed'
);

-- 10. Patient cannot update document to mark it reviewed
UPDATE public.documents SET review_status = 'reviewed' WHERE id = 'd0000001-1111-1111-1111-111111111111';
SELECT is(
  (SELECT review_status FROM public.documents WHERE id = 'd0000001-1111-1111-1111-111111111111'),
  'pending',
  'Patient update attempt has no effect: document remains pending'
);

-- 11. Patient cannot read stranger document row
SELECT is(
  (SELECT count(*)::int FROM public.documents WHERE patient_id = 'bbbb5555-bbbb-bbbb-bbbb-bbbbbbbbbbbb'),
  0,
  'Patient cannot read stranger documents'
);

-- 12. Care team doctor reads patient document row
SELECT set_config('request.jwt.claims', '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated","aal":"aal2"}', true);
SELECT is(
  (SELECT count(*)::int FROM public.documents WHERE id = 'd0000001-1111-1111-1111-111111111111'),
  1,
  'Care team doctor can read patient document row'
);

-- 13. Care team doctor can read storage object
SELECT is(
  (SELECT count(*)::int FROM storage.objects WHERE name = 'aaaa5555-aaaa-aaaa-aaaa-aaaaaaaaaaaa/my_blood_test.pdf'),
  1,
  'Care team doctor can read patient file in storage'
);

-- 14. Doctor with no care link reads zero documents
SELECT set_config('request.jwt.claims', '{"sub":"33333333-3333-3333-3333-333333333335","role":"authenticated","aal":"aal2"}', true);
SELECT is(
  (SELECT count(*)::int FROM public.documents WHERE id = 'd0000001-1111-1111-1111-111111111111'),
  0,
  'Doctor with no care link reads zero documents'
);

-- 15. Doctor with no care link reads zero storage objects
SELECT is(
  (SELECT count(*)::int FROM storage.objects WHERE name = 'aaaa5555-aaaa-aaaa-aaaa-aaaaaaaaaaaa/my_blood_test.pdf'),
  0,
  'Doctor with no care link reads zero storage objects'
);

-- 16. Care team doctor can mark document reviewed
SELECT set_config('request.jwt.claims', '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated","aal":"aal2"}', true);
UPDATE public.documents
SET review_status = 'reviewed', reviewed_by = '33333330-3333-3333-3333-333333333333', reviewed_at = now()
WHERE id = 'd0000001-1111-1111-1111-111111111111';

SELECT is(
  (SELECT review_status FROM public.documents WHERE id = 'd0000001-1111-1111-1111-111111111111'),
  'reviewed',
  'Care team doctor can update review_status to reviewed'
);

-- 17. Front desk reads zero documents
SELECT set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated","aal":"aal2"}', true);
SELECT is(
  (SELECT count(*)::int FROM public.documents),
  0,
  'Front desk reads zero document rows'
);

-- 18. Hospital admin reads zero documents
SELECT set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated","aal":"aal2"}', true);
SELECT is(
  (SELECT count(*)::int FROM public.documents),
  0,
  'Hospital admin reads zero document rows'
);

-- 19. Storage objects reject DELETE (write-once)
SELECT throws_ok(
  'DELETE FROM storage.objects WHERE bucket_id = ''patient-files''',
  '42501',
  NULL,
  'Storage objects cannot be deleted'
);

SELECT * FROM finish();
ROLLBACK;
