-- Foundation Schema Migration
-- Creates private schema, helper functions, audit_log, hospital_settings,
-- departments, staff, patients, patient_access, care_team, emergency_access,
-- Row-Level Security policies, and audit triggers.

-- 1. Private schema for security definer helpers
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

-- 2. Audit Log (append-only)
create table if not exists public.audit_log (
  id         bigint generated always as identity primary key,
  at         timestamptz not null default now(),
  actor_id   uuid references auth.users(id) on delete set null,
  action     text not null,
  table_name text,
  record_id  uuid,
  patient_id uuid,
  reason     text,
  old_row    jsonb,
  new_row    jsonb
);

alter table public.audit_log enable row level security;
revoke insert, update, delete, truncate on public.audit_log from anon, authenticated;

-- Audit trigger function
create or replace function private.audit_row()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  r jsonb := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
begin
  insert into public.audit_log
    (actor_id, action, table_name, record_id, patient_id, old_row, new_row)
  values (
    auth.uid(), tg_op, tg_table_name,
    (r ->> 'id')::uuid,
    coalesce((r ->> 'patient_id')::uuid,
             case when tg_table_name = 'patients' then (r ->> 'id')::uuid end),
    case when tg_op <> 'INSERT' then to_jsonb(old) end,
    case when tg_op <> 'DELETE' then to_jsonb(new) end
  );
  return null;
end $$;

-- 3. Hospital Settings (Singleton for dynamic branding)
create table if not exists public.hospital_settings (
  id              text primary key default 'default' check (id = 'default'),
  hospital_name   text not null default 'ABC Hospital',
  logo_url        text,
  primary_color   text not null default '#0284c7',
  secondary_color text not null default '#0f172a',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

alter table public.hospital_settings enable row level security;

-- 4. Departments
create table if not exists public.departments (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,
  code       text not null unique,
  created_at timestamptz not null default now()
);

alter table public.departments enable row level security;

-- 5. Staff
create table if not exists public.staff (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null unique references auth.users(id) on delete restrict,
  department_id uuid references public.departments(id) on delete restrict,
  role          text not null check (role in ('doctor', 'front_desk', 'admin')),
  full_name     text not null,
  phone         text,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  deleted_at    timestamptz
);

alter table public.staff enable row level security;

-- 6. Patients
create table if not exists public.patients (
  id          uuid primary key default gen_random_uuid(),
  uhid        text not null unique,
  full_name   text not null,
  dob         date not null,
  gender      text not null check (gender in ('male', 'female', 'other')),
  blood_group text check (blood_group in ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')),
  phone       text not null,
  email       text,
  created_at  timestamptz not null default now(),
  deleted_at  timestamptz
);

alter table public.patients enable row level security;

-- 7. Patient Access (Self, Guardian, Caregiver mapping)
create table if not exists public.patient_access (
  id           uuid primary key default gen_random_uuid(),
  patient_id   uuid not null references public.patients(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  relationship text not null check (relationship in ('self', 'guardian', 'caregiver')),
  created_at   timestamptz not null default now(),
  revoked_at   timestamptz,
  unique (patient_id, user_id)
);

alter table public.patient_access enable row level security;

-- 8. Care Team
create table if not exists public.care_team (
  id         uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  staff_id   uuid not null references public.staff(id) on delete cascade,
  reason     text,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.care_team enable row level security;

-- 9. Emergency Access (Break-glass 4-hour window)
create table if not exists public.emergency_access (
  id         uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  staff_id   uuid not null references public.staff(id) on delete cascade,
  reason     text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

alter table public.emergency_access enable row level security;

-- =========================================================
-- Helper Functions (Private Schema)
-- =========================================================

create or replace function private.my_staff_id()
returns uuid language sql stable security definer set search_path = '' as $$
  select s.id from public.staff s
  where s.user_id = (select auth.uid()) and s.is_active and s.deleted_at is null;
$$;

create or replace function private.my_role()
returns text language sql stable security definer set search_path = '' as $$
  select s.role from public.staff s
  where s.user_id = (select auth.uid()) and s.is_active and s.deleted_at is null;
$$;

create or replace function private.get_staff_role()
returns text language sql stable security definer set search_path = '' as $$
  select private.my_role();
$$;

create or replace function private.my_department_id()
returns uuid language sql stable security definer set search_path = '' as $$
  select s.department_id from public.staff s
  where s.user_id = (select auth.uid()) and s.is_active and s.deleted_at is null;
$$;

create or replace function private.is_staff()
returns boolean language sql stable security definer set search_path = '' as $$
  select (private.my_staff_id() is not null);
$$;

create or replace function private.is_staff_mfa()
returns boolean language sql stable security definer set search_path = '' as $$
  select (private.my_staff_id() is not null and (auth.jwt() ->> 'aal') = 'aal2');
$$;

create or replace function private.is_admin_mfa()
returns boolean language sql stable security definer set search_path = '' as $$
  select (private.my_role() = 'admin' and (auth.jwt() ->> 'aal') = 'aal2');
$$;

create or replace function private.is_doctor_mfa()
returns boolean language sql stable security definer set search_path = '' as $$
  select (private.my_role() = 'doctor' and (auth.jwt() ->> 'aal') = 'aal2');
$$;

create or replace function private.is_desk_mfa()
returns boolean language sql stable security definer set search_path = '' as $$
  select (private.my_role() = 'front_desk' and (auth.jwt() ->> 'aal') = 'aal2');
$$;

create or replace function private.my_profile_patient_ids()
returns setof uuid language sql stable security definer set search_path = '' as $$
  select pa.patient_id from public.patient_access pa
  where pa.user_id = (select auth.uid())
    and pa.relationship in ('self', 'guardian')
    and pa.revoked_at is null;
$$;

create or replace function private.my_care_patient_ids()
returns setof uuid language sql stable security definer set search_path = '' as $$
  select ct.patient_id
  from public.care_team ct
  join public.staff s on s.id = ct.staff_id
  where s.user_id = (select auth.uid()) and s.is_active and s.deleted_at is null
    and ct.revoked_at is null
    and (ct.expires_at is null or ct.expires_at > now())
  union
  select ea.patient_id
  from public.emergency_access ea
  join public.staff s on s.id = ea.staff_id
  where s.user_id = (select auth.uid()) and s.is_active and s.deleted_at is null
    and ea.expires_at > now();
$$;

create or replace function private.can_access_patient(target_patient_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from private.my_profile_patient_ids() p where p = target_patient_id
    union
    select 1 from private.my_care_patient_ids() c where c = target_patient_id
  );
$$;

revoke execute on all functions in schema private from public, anon;
grant execute on all functions in schema private to authenticated;

-- =========================================================
-- Public RPC Functions
-- =========================================================

create or replace function public.request_emergency_access(p_patient_id uuid, p_reason text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_staff_id uuid;
  v_access_id uuid;
begin
  if not private.is_doctor_mfa() then
    raise exception 'Doctor two-factor authentication required for emergency access';
  end if;

  if p_reason is null or length(trim(p_reason)) < 5 then
    raise exception 'A written reason of at least 5 characters is required';
  end if;

  v_staff_id := private.my_staff_id();

  insert into public.emergency_access (patient_id, staff_id, reason, expires_at)
  values (p_patient_id, v_staff_id, trim(p_reason), now() + interval '4 hours')
  returning id into v_access_id;

  insert into public.audit_log (actor_id, action, table_name, record_id, patient_id, reason)
  values (auth.uid(), 'EMERGENCY_ACCESS_GRANTED', 'emergency_access', v_access_id, p_patient_id, trim(p_reason));

  return v_access_id;
end;
$$;

revoke execute on function public.request_emergency_access(uuid, text) from public, anon;
grant execute on function public.request_emergency_access(uuid, text) to authenticated;

-- =========================================================
-- RLS Policies
-- =========================================================

-- 1. Hospital Settings Policies
create policy "anyone reads hospital_settings" on public.hospital_settings
for select to public
using (true);

create policy "admin updates hospital_settings" on public.hospital_settings
for update to authenticated
using (private.is_admin_mfa())
with check (private.is_admin_mfa());

create policy "admin inserts hospital_settings" on public.hospital_settings
for insert to authenticated
with check (private.is_admin_mfa());

-- 2. Departments Policies
create policy "anyone authenticated reads departments" on public.departments
for select to authenticated
using (true);

create policy "admin manages departments" on public.departments
for all to authenticated
using (private.is_admin_mfa())
with check (private.is_admin_mfa());

-- 3. Staff Policies
create policy "staff need two-factor" on public.staff
as restrictive for all to authenticated
using ( (select auth.jwt() ->> 'aal') = 'aal2' )
with check ( (select auth.jwt() ->> 'aal') = 'aal2' );

create policy "staff reads own record" on public.staff
for select to authenticated
using ( user_id = (select auth.uid()) );

create policy "admin reads all staff" on public.staff
for select to authenticated
using ( (select private.my_role()) = 'admin' );

create policy "admin manages staff" on public.staff
for all to authenticated
using ( (select private.my_role()) = 'admin' )
with check ( (select private.my_role()) = 'admin' );

-- 4. Patients Policies
create policy "staff need two-factor on patients" on public.patients
as restrictive for all to authenticated
using ( (select private.my_staff_id()) is null or (select auth.jwt() ->> 'aal') = 'aal2' )
with check ( (select private.my_staff_id()) is null or (select auth.jwt() ->> 'aal') = 'aal2' );

create policy "patients read own record" on public.patients
for select to authenticated
using ( id in (select private.my_profile_patient_ids()) );

create policy "care team reads patient" on public.patients
for select to authenticated
using ( id in (select private.my_care_patient_ids()) );

create policy "doctors search patient demographics" on public.patients
for select to authenticated
using ( (select private.my_role()) = 'doctor' );

create policy "front desk reads patients" on public.patients
for select to authenticated
using ( (select private.my_role()) = 'front_desk' );

create policy "front desk inserts patients" on public.patients
for insert to authenticated
with check ( (select private.my_role()) = 'front_desk' );

create policy "front desk updates patients" on public.patients
for update to authenticated
using ( (select private.my_role()) = 'front_desk' )
with check ( (select private.my_role()) = 'front_desk' );

-- 5. Patient Access Policies
create policy "staff need two-factor on patient_access" on public.patient_access
as restrictive for all to authenticated
using ( (select private.my_staff_id()) is null or (select auth.jwt() ->> 'aal') = 'aal2' )
with check ( (select private.my_staff_id()) is null or (select auth.jwt() ->> 'aal') = 'aal2' );

create policy "patients read own access links" on public.patient_access
for select to authenticated
using ( user_id = (select auth.uid()) );

create policy "front desk reads patient_access" on public.patient_access
for select to authenticated
using ( (select private.my_role()) = 'front_desk' );

create policy "front desk manages patient_access" on public.patient_access
for all to authenticated
using ( (select private.my_role()) = 'front_desk' )
with check ( (select private.my_role()) = 'front_desk' );

-- 6. Care Team Policies
create policy "staff need two-factor on care_team" on public.care_team
as restrictive for all to authenticated
using ( (select private.my_staff_id()) is null or (select auth.jwt() ->> 'aal') = 'aal2' )
with check ( (select private.my_staff_id()) is null or (select auth.jwt() ->> 'aal') = 'aal2' );

create policy "patients read own care team" on public.care_team
for select to authenticated
using ( patient_id in (select private.my_profile_patient_ids()) );

create policy "staff read care team" on public.care_team
for select to authenticated
using ( staff_id = (select private.my_staff_id()) or patient_id in (select private.my_care_patient_ids()) );

create policy "front desk and admin manage care team" on public.care_team
for all to authenticated
using ( (select private.my_role()) in ('front_desk', 'admin') )
with check ( (select private.my_role()) in ('front_desk', 'admin') );

-- 7. Emergency Access Policies
create policy "staff need two-factor on emergency_access" on public.emergency_access
as restrictive for all to authenticated
using ( (select auth.jwt() ->> 'aal') = 'aal2' )
with check ( (select auth.jwt() ->> 'aal') = 'aal2' );

create policy "doctors read own emergency access" on public.emergency_access
for select to authenticated
using ( staff_id = (select private.my_staff_id()) );

create policy "admin reads emergency access log" on public.emergency_access
for select to authenticated
using ( (select private.my_role()) = 'admin' );

-- =========================================================
-- Audit Triggers on Sensitive Tables
-- =========================================================

create trigger staff_audit after insert or update or delete on public.staff
for each row execute function private.audit_row();

create trigger patient_access_audit after insert or update or delete on public.patient_access
for each row execute function private.audit_row();

create trigger care_team_audit after insert or update or delete on public.care_team
for each row execute function private.audit_row();

create trigger emergency_access_audit after insert or update or delete on public.emergency_access
for each row execute function private.audit_row();

create trigger hospital_settings_audit after insert or update or delete on public.hospital_settings
for each row execute function private.audit_row();
