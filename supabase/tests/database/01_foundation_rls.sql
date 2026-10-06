begin;
select plan(17);

-- 1. Check RLS is enabled on all required public tables
select is(
  (select relrowsecurity from pg_class where relname = 'departments' and relnamespace = 'public'::regnamespace),
  true,
  'departments has Row-Level Security enabled'
);

select is(
  (select relrowsecurity from pg_class where relname = 'staff' and relnamespace = 'public'::regnamespace),
  true,
  'staff has Row-Level Security enabled'
);

select is(
  (select relrowsecurity from pg_class where relname = 'patients' and relnamespace = 'public'::regnamespace),
  true,
  'patients has Row-Level Security enabled'
);

select is(
  (select relrowsecurity from pg_class where relname = 'patient_access' and relnamespace = 'public'::regnamespace),
  true,
  'patient_access has Row-Level Security enabled'
);

select is(
  (select relrowsecurity from pg_class where relname = 'care_team' and relnamespace = 'public'::regnamespace),
  true,
  'care_team has Row-Level Security enabled'
);

select is(
  (select relrowsecurity from pg_class where relname = 'audit_log' and relnamespace = 'public'::regnamespace),
  true,
  'audit_log has Row-Level Security enabled'
);

-- 2. Anonymous users cannot read any tables
set local role anon;

select is_empty(
  'select * from public.departments',
  'Anonymous users cannot read departments'
);

select is_empty(
  'select * from public.patients',
  'Anonymous users cannot read patients'
);

select is_empty(
  'select * from public.staff',
  'Anonymous users cannot read staff'
);

select is_empty(
  'select * from public.patient_access',
  'Anonymous users cannot read patient_access'
);

select is_empty(
  'select * from public.care_team',
  'Anonymous users cannot read care_team'
);

select is_empty(
  'select * from public.audit_log',
  'Anonymous users cannot read audit_log'
);

-- Switch back to postgres superuser to seed test fixture data in test transaction
set local role postgres;

-- Create test auth users
insert into auth.users (id, instance_id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'patient_a@example.com', '{"provider":"email"}', '{}', now(), now()),
  ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'patient_b@example.com', '{"provider":"email"}', '{}', now(), now()),
  ('33333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'doctor@example.com', '{"provider":"email"}', '{}', now(), now()),
  ('44444444-4444-4444-4444-444444444444', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin@example.com', '{"provider":"email"}', '{}', now(), now());

-- Create test patients
insert into public.patients (id, hospital_number, full_name, phone, email, date_of_birth, gender)
values
  ('a1111111-1111-1111-1111-111111111111', 'HOSP-001', 'Test Patient A', '+919876543210', 'patient_a@example.com', '1990-01-01', 'female'),
  ('b2222222-2222-2222-2222-222222222222', 'HOSP-002', 'Test Patient B', '+919876543211', 'patient_b@example.com', '1992-02-02', 'male');

-- Link patient access
insert into public.patient_access (patient_id, auth_user_id, relationship)
values
  ('a1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'self'),
  ('b2222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 'self');

-- Create staff entries
insert into public.staff (id, auth_user_id, role, full_name)
values
  ('c3333333-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333', 'doctor', 'Dr. Test Doctor'),
  ('c4444444-4444-4444-4444-444444444444', '44444444-4444-4444-4444-444444444444', 'hospital_admin', 'Admin Test User');

-- 3. Patient Isolation: Patient A cannot read Patient B
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated","aal":"aal1"}', true);

select results_eq(
  'select id from public.patients',
  ARRAY['a1111111-1111-1111-1111-111111111111'::uuid],
  'Patient A can only read their own record and cannot read Patient B'
);

-- 4. Staff without two-factor (aal1) see nothing in staff directory
select set_config('request.jwt.claims', '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated","aal":"aal1"}', true);

select results_eq(
  'select id from public.staff',
  ARRAY['c3333333-3333-3333-3333-333333333333'::uuid],
  'Staff with aal1 only sees own row, not protected staff directory'
);

-- 5. Hospital Admin cannot read individual patient rows (even with aal2)
select set_config('request.jwt.claims', '{"sub":"44444444-4444-4444-4444-444444444444","role":"authenticated","aal":"aal2"}', true);

select is_empty(
  'select * from public.patients',
  'Hospital admin cannot read any individual patient rows'
);

-- 6. Nobody can edit or delete audit_log
select throws_ok(
  'delete from public.audit_log',
  '42501',
  NULL,
  'Nobody can delete from audit_log'
);

select throws_ok(
  'update public.audit_log set action = ''TAMPERED''',
  '42501',
  NULL,
  'Nobody can update audit_log'
);

select * from finish();
rollback;
