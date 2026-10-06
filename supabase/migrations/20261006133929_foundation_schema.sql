-- Migration: 00001_foundation_schema
-- Description: Foundation schema, private helper functions, audit trigger, and strict RLS policies

-- 1. Private schema setup
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM public, anon;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

-- 2. Custom Enumeration Types
DO $$ BEGIN
  CREATE TYPE public.staff_role AS ENUM ('doctor', 'front_desk', 'hospital_admin');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.patient_relationship AS ENUM ('self', 'guardian');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.care_team_access_type AS ENUM ('routine', 'emergency');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 3. Public Tables
-- 3.1 Departments
CREATE TABLE IF NOT EXISTS public.departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

-- 3.2 Staff Directory
CREATE TABLE IF NOT EXISTS public.staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  department_id uuid REFERENCES public.departments(id),
  role public.staff_role NOT NULL,
  full_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;

-- 3.3 Patients
CREATE TABLE IF NOT EXISTS public.patients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_number text NOT NULL UNIQUE,
  full_name text NOT NULL,
  phone text NOT NULL,
  email text,
  date_of_birth date NOT NULL,
  gender text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;

-- 3.4 Patient Access (Linking auth users to patient records)
CREATE TABLE IF NOT EXISTS public.patient_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  auth_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  relationship public.patient_relationship NOT NULL DEFAULT 'self',
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT uq_patient_access UNIQUE (patient_id, auth_user_id)
);
ALTER TABLE public.patient_access ENABLE ROW LEVEL SECURITY;

-- 3.5 Care Team
CREATE TABLE IF NOT EXISTS public.care_team (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  staff_id uuid NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  access_type public.care_team_access_type NOT NULL DEFAULT 'routine',
  emergency_reason text,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
ALTER TABLE public.care_team ENABLE ROW LEVEL SECURITY;

-- 3.6 Audit Log (Immutable)
CREATE TABLE IF NOT EXISTS public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,
  action text NOT NULL,
  table_name text NOT NULL,
  record_id uuid,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- 4. Private Helper Functions (Strict Security Definer with search_path = '')
CREATE OR REPLACE FUNCTION private.is_aal2()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT coalesce((auth.jwt()->>'aal'), 'aal1') = 'aal2';
$$;
REVOKE ALL ON FUNCTION private.is_aal2() FROM public, anon;
GRANT EXECUTE ON FUNCTION private.is_aal2() TO authenticated;

CREATE OR REPLACE FUNCTION private.get_staff_role()
RETURNS public.staff_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT role FROM public.staff
  WHERE auth_user_id = auth.uid()
    AND deleted_at IS NULL;
$$;
REVOKE ALL ON FUNCTION private.get_staff_role() FROM public, anon;
GRANT EXECUTE ON FUNCTION private.get_staff_role() TO authenticated;

CREATE OR REPLACE FUNCTION private.is_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.staff
    WHERE auth_user_id = auth.uid()
      AND deleted_at IS NULL
  ) AND private.is_aal2();
$$;
REVOKE ALL ON FUNCTION private.is_staff() FROM public, anon;
GRANT EXECUTE ON FUNCTION private.is_staff() TO authenticated;

CREATE OR REPLACE FUNCTION private.is_doctor()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT (private.get_staff_role() = 'doctor'::public.staff_role) AND private.is_aal2();
$$;
REVOKE ALL ON FUNCTION private.is_doctor() FROM public, anon;
GRANT EXECUTE ON FUNCTION private.is_doctor() TO authenticated;

CREATE OR REPLACE FUNCTION private.is_front_desk()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT (private.get_staff_role() = 'front_desk'::public.staff_role) AND private.is_aal2();
$$;
REVOKE ALL ON FUNCTION private.is_front_desk() FROM public, anon;
GRANT EXECUTE ON FUNCTION private.is_front_desk() TO authenticated;

CREATE OR REPLACE FUNCTION private.is_hospital_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT (private.get_staff_role() = 'hospital_admin'::public.staff_role) AND private.is_aal2();
$$;
REVOKE ALL ON FUNCTION private.is_hospital_admin() FROM public, anon;
GRANT EXECUTE ON FUNCTION private.is_hospital_admin() TO authenticated;

CREATE OR REPLACE FUNCTION private.can_access_patient(target_patient_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT (
    -- 1. Patient or Guardian via patient_access
    EXISTS (
      SELECT 1 FROM public.patient_access pa
      WHERE pa.patient_id = target_patient_id
        AND pa.auth_user_id = auth.uid()
        AND pa.deleted_at IS NULL
    )
    OR
    -- 2. Doctor on active care team (requires 2FA)
    (
      private.is_doctor() AND EXISTS (
        SELECT 1 FROM public.care_team ct
        JOIN public.staff s ON s.id = ct.staff_id
        WHERE ct.patient_id = target_patient_id
          AND s.auth_user_id = auth.uid()
          AND (ct.expires_at IS NULL OR ct.expires_at > now())
          AND ct.deleted_at IS NULL
          AND s.deleted_at IS NULL
      )
    )
    OR
    -- 3. Front Desk (registration/booking requires 2FA)
    private.is_front_desk()
    -- Hospital admin is explicitly excluded from viewing patient clinical rows
  );
$$;
REVOKE ALL ON FUNCTION private.can_access_patient(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION private.can_access_patient(uuid) TO authenticated;

-- 5. Audit Trigger Function
CREATE OR REPLACE FUNCTION private.audit_trigger_func()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_record_id uuid;
  v_old jsonb := NULL;
  v_new jsonb := NULL;
  v_actor_id uuid := auth.uid();
BEGIN
  IF (TG_OP = 'DELETE') THEN
    v_record_id := OLD.id;
    v_old := to_jsonb(OLD);
  ELSIF (TG_OP = 'UPDATE') THEN
    v_record_id := NEW.id;
    v_old := to_jsonb(OLD);
    v_new := to_jsonb(NEW);
  ELSIF (TG_OP = 'INSERT') THEN
    v_record_id := NEW.id;
    v_new := to_jsonb(NEW);
  END IF;

  INSERT INTO public.audit_log (
    actor_id,
    action,
    table_name,
    record_id,
    old_data,
    new_data
  ) VALUES (
    v_actor_id,
    TG_OP,
    TG_TABLE_NAME,
    v_record_id,
    v_old,
    v_new
  );

  IF (TG_OP = 'DELETE') THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION private.audit_trigger_func() FROM public, anon;

-- Immutability trigger for audit_log: prevent any UPDATE or DELETE
CREATE OR REPLACE FUNCTION private.deny_audit_log_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RAISE EXCEPTION 'audit_log rows cannot be updated or deleted'
    USING ERRCODE = '42501';
END;
$$;
REVOKE ALL ON FUNCTION private.deny_audit_log_mutation() FROM public, anon;

DROP TRIGGER IF EXISTS audit_log_deny_mutation ON public.audit_log;
CREATE TRIGGER audit_log_deny_mutation
  BEFORE UPDATE OR DELETE ON public.audit_log
  FOR EACH STATEMENT
  EXECUTE FUNCTION private.deny_audit_log_mutation();

-- Attach Audit Triggers to Business Tables
DROP TRIGGER IF EXISTS trg_audit_departments ON public.departments;
CREATE TRIGGER trg_audit_departments
  AFTER INSERT OR UPDATE OR DELETE ON public.departments
  FOR EACH ROW EXECUTE FUNCTION private.audit_trigger_func();

DROP TRIGGER IF EXISTS trg_audit_staff ON public.staff;
CREATE TRIGGER trg_audit_staff
  AFTER INSERT OR UPDATE OR DELETE ON public.staff
  FOR EACH ROW EXECUTE FUNCTION private.audit_trigger_func();

DROP TRIGGER IF EXISTS trg_audit_patients ON public.patients;
CREATE TRIGGER trg_audit_patients
  AFTER INSERT OR UPDATE OR DELETE ON public.patients
  FOR EACH ROW EXECUTE FUNCTION private.audit_trigger_func();

DROP TRIGGER IF EXISTS trg_audit_patient_access ON public.patient_access;
CREATE TRIGGER trg_audit_patient_access
  AFTER INSERT OR UPDATE OR DELETE ON public.patient_access
  FOR EACH ROW EXECUTE FUNCTION private.audit_trigger_func();

DROP TRIGGER IF EXISTS trg_audit_care_team ON public.care_team;
CREATE TRIGGER trg_audit_care_team
  AFTER INSERT OR UPDATE OR DELETE ON public.care_team
  FOR EACH ROW EXECUTE FUNCTION private.audit_trigger_func();

-- 6. Row-Level Security Policies
-- 6.1 Departments Policies
CREATE POLICY departments_select ON public.departments
  FOR SELECT TO authenticated
  USING (deleted_at IS NULL);

CREATE POLICY departments_insert ON public.departments
  FOR INSERT TO authenticated
  WITH CHECK (private.is_hospital_admin());

CREATE POLICY departments_update ON public.departments
  FOR UPDATE TO authenticated
  USING (private.is_hospital_admin())
  WITH CHECK (private.is_hospital_admin());

-- 6.2 Staff Policies
CREATE POLICY staff_select ON public.staff
  FOR SELECT TO authenticated
  USING (private.is_staff() OR auth_user_id = auth.uid());

CREATE POLICY staff_insert ON public.staff
  FOR INSERT TO authenticated
  WITH CHECK (private.is_hospital_admin());

CREATE POLICY staff_update ON public.staff
  FOR UPDATE TO authenticated
  USING (private.is_hospital_admin())
  WITH CHECK (private.is_hospital_admin());

-- 6.3 Patients Policies
CREATE POLICY patients_select ON public.patients
  FOR SELECT TO authenticated
  USING (deleted_at IS NULL AND private.can_access_patient(id));

CREATE POLICY patients_insert ON public.patients
  FOR INSERT TO authenticated
  WITH CHECK (private.is_front_desk());

CREATE POLICY patients_update ON public.patients
  FOR UPDATE TO authenticated
  USING (deleted_at IS NULL AND (private.is_front_desk() OR (private.is_doctor() AND private.can_access_patient(id))))
  WITH CHECK (deleted_at IS NULL AND (private.is_front_desk() OR (private.is_doctor() AND private.can_access_patient(id))));

-- 6.4 Patient Access Policies
CREATE POLICY patient_access_select ON public.patient_access
  FOR SELECT TO authenticated
  USING (deleted_at IS NULL AND (auth_user_id = auth.uid() OR private.is_front_desk()));

CREATE POLICY patient_access_insert ON public.patient_access
  FOR INSERT TO authenticated
  WITH CHECK (private.is_front_desk());

CREATE POLICY patient_access_update ON public.patient_access
  FOR UPDATE TO authenticated
  USING (private.is_front_desk())
  WITH CHECK (private.is_front_desk());

-- 6.5 Care Team Policies
CREATE POLICY care_team_select ON public.care_team
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL AND (
      private.can_access_patient(patient_id)
      OR staff_id IN (SELECT id FROM public.staff WHERE auth_user_id = auth.uid() AND deleted_at IS NULL)
    )
  );

CREATE POLICY care_team_insert ON public.care_team
  FOR INSERT TO authenticated
  WITH CHECK (
    private.is_front_desk()
    OR (
      private.is_doctor()
      AND access_type = 'emergency'::public.care_team_access_type
      AND emergency_reason IS NOT NULL
      AND emergency_reason <> ''
    )
  );

CREATE POLICY care_team_update ON public.care_team
  FOR UPDATE TO authenticated
  USING (private.is_front_desk())
  WITH CHECK (private.is_front_desk());

-- 6.6 Audit Log Policies (Hospital admin can view logs; mutations denied)
CREATE POLICY audit_log_select ON public.audit_log
  FOR SELECT TO authenticated
  USING (private.is_hospital_admin());

CREATE POLICY audit_log_insert ON public.audit_log
  FOR INSERT TO authenticated
  WITH CHECK (true);
