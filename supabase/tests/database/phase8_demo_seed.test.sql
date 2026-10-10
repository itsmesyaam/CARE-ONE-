BEGIN;
SELECT plan(10);

-- 1. Arun Kumar exists
SELECT is(
  (SELECT count(*)::int FROM public.patients WHERE id = 'e0000000-0000-0000-0000-000000000001' AND full_name = 'Arun Kumar'),
  1,
  'Arun Kumar exists in seeded patients'
);

-- 2. Dr. Rahul calling what_changed for Arun Kumar returns at least 5 items
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-000000000003","role":"authenticated","aal":"aal2"}', true);
SELECT is(
  (SELECT count(*)::int >= 5 FROM public.what_changed('e0000000-0000-0000-0000-000000000001')),
  true,
  'Arun Kumar what_changed panel yields at least 5 items for Dr. Rahul'
);

-- 3. Admin dashboard counts are all strictly > 0
SELECT set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-000000000001","role":"authenticated","aal":"aal2"}', true);
SELECT is(
  (SELECT (
    today_appointments > 0 AND
    follow_ups_due > 0 AND
    reports_waiting_review > 0 AND
    patients_overdue_follow_up > 0 AND
    consultations_this_month > 0 AND
    active_patients_30d > 0
  ) FROM public.get_admin_dashboard_counts()),
  true,
  'Admin dashboard operational counts are all strictly > 0'
);

-- 4. Mother guardian can access child profile (Baby Meenakshi)
SELECT set_config('request.jwt.claims', '{"sub":"c0000000-0000-0000-0000-000000000002","role":"authenticated","aal":"aal1"}', true);
SELECT is(
  (SELECT count(*)::int FROM public.patients WHERE id = 'e0000000-0000-0000-0000-000000000003'),
  1,
  'Mother guardian can read child patient profile'
);

-- 5. Stranger cannot access child profile
SELECT set_config('request.jwt.claims', '{"sub":"c0000000-0000-0000-0000-000000000099","role":"authenticated","aal":"aal1"}', true);
SELECT is(
  (SELECT count(*)::int FROM public.patients WHERE id = 'e0000000-0000-0000-0000-000000000003'),
  0,
  'Stranger cannot read child patient profile'
);

-- 6. Restricted psychiatry note is visible to Dr. Kavitha (Psychiatry)
SELECT set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-000000000006","role":"authenticated","aal":"aal2"}', true);
SELECT is(
  (SELECT count(*)::int FROM public.encounters WHERE patient_id = 'e0000000-0000-0000-0000-000000000004' AND sensitivity = 'restricted'),
  1,
  'Psychiatry doctor can read restricted psychiatry encounter'
);

-- 7. Restricted psychiatry note is invisible to Dr. Rahul (General Medicine)
SELECT set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-000000000003","role":"authenticated","aal":"aal2"}', true);
SELECT is(
  (SELECT count(*)::int FROM public.encounters WHERE patient_id = 'e0000000-0000-0000-0000-000000000004' AND sensitivity = 'restricted'),
  0,
  'General Medicine doctor cannot read restricted psychiatry encounter'
);

-- 8. Restricted psychiatry note is invisible to Dr. Anjali (Cardiology)
SELECT set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-000000000004","role":"authenticated","aal":"aal2"}', true);
SELECT is(
  (SELECT count(*)::int FROM public.encounters WHERE patient_id = 'e0000000-0000-0000-0000-000000000004' AND sensitivity = 'restricted'),
  0,
  'Cardiology doctor cannot read restricted psychiatry encounter'
);

-- 9. Dr. Thomas has zero care link to Arun Kumar
SELECT is(
  (SELECT count(*)::int FROM public.care_team WHERE patient_id = 'e0000000-0000-0000-0000-000000000001' AND staff_id = 'b0000000-0000-0000-0000-000000000005'),
  0,
  'Dr. Thomas has zero care team link to Arun Kumar'
);

-- 10. Staff accounts have verified TOTP factors in auth.mfa_factors
SET LOCAL ROLE postgres;
SELECT is(
  (SELECT count(*)::int FROM auth.mfa_factors WHERE status = 'verified' AND factor_type = 'totp'),
  6,
  'All 6 staff members have verified TOTP authenticator factors in auth.mfa_factors'
);

SELECT * FROM finish();
ROLLBACK;
