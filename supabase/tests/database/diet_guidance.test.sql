BEGIN;
SELECT plan(16);

-- 1-2. Verify table exists and has RLS enabled
SELECT has_table('diet_guides', 'Table diet_guides exists');
SELECT ok(
  (SELECT relrowsecurity FROM pg_class WHERE relname = 'diet_guides'),
  'RLS is enabled on public.diet_guides'
);

-- 3-4. Verify functions exist
SELECT has_function('private', 'freeze_approved_diet_guides', ARRAY[]::text[], 'Function freeze_approved_diet_guides exists');
SELECT has_function('private', 'validate_care_plan_item_diet_guide', ARRAY[]::text[], 'Function validate_care_plan_item_diet_guide exists');

-- Seed test fixture users and roles
INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
VALUES 
  ('d1111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'dietdoc@example.com', 'hash', now(), '{}', '{}', now(), now()),
  ('d2222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'dietpat@example.com', 'hash', now(), '{}', '{}', now(), now()),
  ('d3333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'dietstranger@example.com', 'hash', now(), '{}', '{}', now(), now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.departments (id, name, code)
VALUES ('dd000000-0000-0000-0000-000000000001', 'Endocrinology Dept', 'ENDO')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.staff (id, user_id, department_id, role, full_name, is_active)
VALUES 
  ('d1111110-1111-1111-1111-111111111111', 'd1111111-1111-1111-1111-111111111111', 'dd000000-0000-0000-0000-000000000001', 'doctor', 'Dr. Diet Specialist', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.patients (id, uhid, full_name, dob, gender, phone, id_checked)
VALUES 
  ('daaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'ABC-7001', 'Diet Patient', '1985-05-05', 'female', '9847000071', true),
  ('dbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'ABC-7002', 'Diet Stranger', '1990-06-06', 'male', '9847000072', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.patient_access (patient_id, user_id, relationship)
VALUES 
  ('daaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'd2222222-2222-2222-2222-222222222222', 'self'),
  ('dbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'd3333333-3333-3333-3333-333333333333', 'self')
ON CONFLICT (patient_id, user_id) DO NOTHING;

INSERT INTO public.care_team (patient_id, staff_id, reason, expires_at)
VALUES ('daaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'd1111110-1111-1111-1111-111111111111', 'appointment', now() + interval '1 year')
ON CONFLICT DO NOTHING;

INSERT INTO public.encounters (id, patient_id, doctor_id, department_id, status, sensitivity, chief_complaint, clinical_notes, signed_at)
VALUES ('deeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'daaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'd1111110-1111-1111-1111-111111111111', 'dd000000-0000-0000-0000-000000000001', 'signed', 'normal', 'Diabetes consultation', 'Dietary counsel needed', now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.care_plans (id, patient_id, encounter_id, doctor_id, status, review_date)
VALUES ('dccccccc-cccc-cccc-cccc-cccccccccccc', 'daaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'deeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'd1111110-1111-1111-1111-111111111111', 'active', current_date + 30)
ON CONFLICT (id) DO NOTHING;

-- 5. Staff with AAL2 can insert a draft diet guide
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"d1111111-1111-1111-1111-111111111111","role":"authenticated","aal":"aal2"}', true);

INSERT INTO public.diet_guides (
  id, title_en, title_ml, eat_more_en, eat_more_ml, eat_less_en, eat_less_ml, avoid_en, avoid_ml, tips_en, tips_ml, condition_tags, status, version
) VALUES (
  'd0000001-0000-0000-0000-000000000001',
  'Draft Renal Diet', 'ഡ്രാഫ്റ്റ് വൃക്ക ആഹാരം',
  'Leafy vegetables', 'ഇലക്കറികൾ',
  'Sodium salts', 'ഉപ്പ്',
  'Processed foods', 'സംസ്കരിച്ച ഭക്ഷണങ്ങൾ',
  'Drink measured water', 'അളന്ന വെള്ളം കുടിക്കുക',
  ARRAY['renal', 'kidney'],
  'draft',
  1
);

SELECT is(
  (SELECT status FROM public.diet_guides WHERE id = 'd0000001-0000-0000-0000-000000000001'),
  'draft',
  'Doctor can create a draft diet guide'
);

-- 6. Patient cannot insert a diet guide
SELECT set_config('request.jwt.claims', '{"sub":"d2222222-2222-2222-2222-222222222222","role":"authenticated","aal":"aal1"}', true);
SELECT throws_ok(
  'INSERT INTO public.diet_guides (title_en, title_ml, eat_more_en, eat_more_ml, eat_less_en, eat_less_ml, avoid_en, avoid_ml, tips_en, tips_ml, status) VALUES (''Hack Diet'', ''ഹാക്ക്'', ''X'', ''X'', ''X'', ''X'', ''X'', ''X'', ''X'', ''X'', ''approved'')',
  '42501',
  NULL,
  'Patient cannot insert diet guides'
);

-- 7-8. Patient cannot update or read draft diet guides
UPDATE public.diet_guides SET title_en = 'Compromised Title' WHERE id = 'd0000001-0000-0000-0000-000000000001';

SELECT is(
  (SELECT count(*)::int FROM public.diet_guides WHERE id = 'd0000001-0000-0000-0000-000000000001'),
  0,
  'Draft diet guides are not visible to patients'
);

-- Doctor checks that draft title was untouched by patient update attempt
SELECT set_config('request.jwt.claims', '{"sub":"d1111111-1111-1111-1111-111111111111","role":"authenticated","aal":"aal2"}', true);
SELECT is(
  (SELECT title_en FROM public.diet_guides WHERE id = 'd0000001-0000-0000-0000-000000000001'),
  'Draft Renal Diet',
  'Patient cannot update diet guides'
);

-- 9. Doctor approves the diet guide
SELECT set_config('request.jwt.claims', '{"sub":"d1111111-1111-1111-1111-111111111111","role":"authenticated","aal":"aal2"}', true);
UPDATE public.diet_guides 
SET status = 'approved', approved_by = 'd1111110-1111-1111-1111-111111111111', approved_at = now()
WHERE id = 'd0000001-0000-0000-0000-000000000001';

SELECT is(
  (SELECT status FROM public.diet_guides WHERE id = 'd0000001-0000-0000-0000-000000000001'),
  'approved',
  'Doctor can approve a diet guide'
);

-- 10. Patient CAN read approved diet guides
SELECT set_config('request.jwt.claims', '{"sub":"d2222222-2222-2222-2222-222222222222","role":"authenticated","aal":"aal1"}', true);
SELECT is(
  (SELECT count(*)::int FROM public.diet_guides WHERE id = 'd0000001-0000-0000-0000-000000000001'),
  1,
  'Patient can read approved diet guides'
);

-- 11. Approved guide is immutable (editing contents throws exception)
SELECT set_config('request.jwt.claims', '{"sub":"d1111111-1111-1111-1111-111111111111","role":"authenticated","aal":"aal2"}', true);
SELECT throws_ok(
  'UPDATE public.diet_guides SET eat_more_en = ''Changed content'' WHERE id = ''d0000001-0000-0000-0000-000000000001''',
  'P0001',
  'Approved diet guides cannot be edited. Create a new version instead.',
  'Editing an approved diet guide raises an immutability exception'
);

-- 12. Cannot link a draft diet guide to care_plan_items
INSERT INTO public.diet_guides (
  id, title_en, title_ml, eat_more_en, eat_more_ml, eat_less_en, eat_less_ml, avoid_en, avoid_ml, tips_en, tips_ml, status
) VALUES (
  'd0000002-0000-0000-0000-000000000002',
  'Draft Keto', 'ഡ്രാഫ്റ്റ് കീറ്റോ',
  'Fats', 'കൊഴുപ്പ്',
  'Carbs', 'ധാന്യങ്ങൾ',
  'Sugar', 'പഞ്ചസാര',
  'Drink water', 'വെള്ളം കുടിക്കുക',
  'draft'
);

SELECT throws_ok(
  'INSERT INTO public.care_plan_items (care_plan_id, patient_id, kind, detail, diet_guide_id) VALUES (''dccccccc-cccc-cccc-cccc-cccccccccccc'', ''daaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'', ''diet'', ''Keto advice'', ''d0000002-0000-0000-0000-000000000002'')',
  'P0001',
  'Only approved diet guides can be attached to a care plan',
  'Cannot attach draft diet guide to care plan items'
);

-- 13. Can link an approved diet guide to care_plan_items with kind = diet and doctor_note
INSERT INTO public.care_plan_items (
  id, care_plan_id, patient_id, kind, detail, diet_guide_id, doctor_note
) VALUES (
  'd3333333-cccc-cccc-cccc-cccccccccccc',
  'dccccccc-cccc-cccc-cccc-cccccccccccc',
  'daaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'diet',
  'Renal diet plan',
  'd0000001-0000-0000-0000-000000000001',
  'One cup of cooked rice per meal only'
);

SELECT is(
  (SELECT doctor_note FROM public.care_plan_items WHERE id = 'd3333333-cccc-cccc-cccc-cccccccccccc'),
  'One cup of cooked rice per meal only',
  'Doctor can attach approved diet guide with custom clinical note'
);

-- 14. Patient can read diet item in own care plan
SELECT set_config('request.jwt.claims', '{"sub":"d2222222-2222-2222-2222-222222222222","role":"authenticated","aal":"aal1"}', true);
SELECT is(
  (SELECT count(*)::int FROM public.care_plan_items WHERE id = 'd3333333-cccc-cccc-cccc-cccccccccccc'),
  1,
  'Patient sees diet item in their own care plan'
);

-- 15. Stranger patient cannot read diet item in someone else care plan
SELECT set_config('request.jwt.claims', '{"sub":"d3333333-3333-3333-3333-333333333333","role":"authenticated","aal":"aal1"}', true);
SELECT is(
  (SELECT count(*)::int FROM public.care_plan_items WHERE id = 'd3333333-cccc-cccc-cccc-cccccccccccc'),
  0,
  'Stranger patient cannot read other patient diet care plan items'
);

-- 16. Seeded demo approved guides exist
RESET ROLE;
SELECT is(
  (SELECT count(*)::int FROM public.diet_guides WHERE status = 'approved' AND id NOT IN ('d0000001-0000-0000-0000-000000000001')),
  3,
  'Three demo diet guides are seeded and approved'
);

SELECT * FROM finish();
ROLLBACK;
