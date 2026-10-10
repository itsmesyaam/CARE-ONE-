BEGIN;
SELECT plan(15);

-- 1. Check schemas
SELECT has_schema('private', 'Schema private exists');

-- 2-9. Check tables in public
SELECT has_table('hospital_settings', 'Table hospital_settings exists');
SELECT has_table('departments', 'Table departments exists');
SELECT has_table('staff', 'Table staff exists');
SELECT has_table('patients', 'Table patients exists');
SELECT has_table('patient_access', 'Table patient_access exists');
SELECT has_table('care_team', 'Table care_team exists');
SELECT has_table('emergency_access', 'Table emergency_access exists');
SELECT has_table('audit_log', 'Table audit_log exists');

-- 10. Check public SELECT access on hospital_settings
SELECT has_column('hospital_settings', 'hospital_name', 'hospital_settings has hospital_name');

-- 11-13. Check private helper functions
SELECT has_function('private', 'get_staff_role', 'Function private.get_staff_role exists');
SELECT has_function('private', 'is_staff_mfa', 'Function private.is_staff_mfa exists');
SELECT has_function('private', 'can_access_patient', ARRAY['uuid'], 'Function private.can_access_patient exists');

-- 14. Check public emergency access RPC
SELECT has_function('public', 'request_emergency_access', ARRAY['uuid', 'text'], 'Function public.request_emergency_access exists');

-- 15. Check audit_log immutability (no update/delete policies)
SELECT ok(
  NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'audit_log' AND cmd IN ('UPDATE', 'DELETE')
  ),
  'audit_log has no UPDATE or DELETE policies'
);

SELECT * FROM finish();
ROLLBACK;
