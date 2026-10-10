BEGIN;
SELECT plan(10);

-- 1-5. Check hospital_settings has the extended columns
SELECT has_column('hospital_settings', 'short_code', 'hospital_settings has short_code');
SELECT has_column('hospital_settings', 'logo_path', 'hospital_settings has logo_path');
SELECT has_column('hospital_settings', 'accent_color', 'hospital_settings has accent_color');
SELECT has_column('hospital_settings', 'casualty_phone', 'hospital_settings has casualty_phone');
SELECT has_column('hospital_settings', 'time_zone', 'hospital_settings has time_zone');

-- 6. Check public RPC get_public_hospital_settings exists
SELECT has_function('public', 'get_public_hospital_settings', ARRAY[]::text[], 'Function public.get_public_hospital_settings exists');

-- 7. Anonymous user can execute get_public_hospital_settings
SET LOCAL ROLE anon;
SELECT lives_ok(
  'SELECT public.get_public_hospital_settings()',
  'anon can execute get_public_hospital_settings'
);

-- 8. Anonymous user cannot update hospital_settings (permission denied)
SELECT throws_ok(
  'UPDATE public.hospital_settings SET hospital_name = ''Hacked''',
  '42501',
  NULL,
  'anon cannot update hospital_settings'
);

-- 9. Authenticated non-admin cannot update hospital_settings
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated","aal":"aal1"}', true);
UPDATE public.hospital_settings SET hospital_name = 'Hacked';
SELECT is(
  (SELECT count(*)::int FROM public.hospital_settings WHERE hospital_name = 'Hacked'),
  0,
  'non-admin update has no effect due to RLS'
);

-- 10. Returns expected branding fields from RPC
SELECT ok(
  (public.get_public_hospital_settings()->>'short_code') = 'ABC'
  AND (public.get_public_hospital_settings()->>'primary_color') = '#1F6B4F'
  AND (public.get_public_hospital_settings()->>'accent_color') = '#C9A43B',
  'public branding returns ABC, #1F6B4F leaf green, and #C9A43B zari gold'
);

SELECT * FROM finish();
ROLLBACK;
