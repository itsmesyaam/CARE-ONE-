-- Phase 4 Task 1: Doctor Chart Schema, RLS, Audit Triggers, Freeze Trigger, Timeline View & RPCs

-- 1. Encounters Table
create table if not exists public.encounters (
  id              uuid primary key default gen_random_uuid(),
  patient_id      uuid not null references public.patients(id) on delete cascade,
  doctor_id       uuid not null references public.staff(id) on delete restrict,
  department_id   uuid references public.departments(id) on delete set null,
  status          text not null default 'draft' check (status in ('draft', 'signed')),
  sensitivity     text not null default 'normal' check (sensitivity in ('normal', 'restricted')),
  chief_complaint text,
  clinical_notes  text,
  examination     text,
  diagnosis       text,
  signed_at       timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists encounters_patient_id_idx on public.encounters(patient_id);
create index if not exists encounters_doctor_id_idx on public.encounters(doctor_id);

alter table public.encounters enable row level security;
revoke all on public.encounters from public, anon;
grant select, insert, update on public.encounters to authenticated;

-- 2. Encounter Addenda Table (for corrections after signing)
create table if not exists public.encounter_addenda (
  id           uuid primary key default gen_random_uuid(),
  encounter_id uuid not null references public.encounters(id) on delete cascade,
  patient_id   uuid not null references public.patients(id) on delete cascade,
  doctor_id    uuid not null references public.staff(id) on delete restrict,
  reason       text not null,
  notes        text not null,
  created_at   timestamptz not null default now()
);

create index if not exists encounter_addenda_patient_id_idx on public.encounter_addenda(patient_id);
create index if not exists encounter_addenda_encounter_id_idx on public.encounter_addenda(encounter_id);

alter table public.encounter_addenda enable row level security;
revoke all on public.encounter_addenda from public, anon;
grant select, insert on public.encounter_addenda to authenticated;

-- 3. Conditions Table (diagnoses & chronic conditions)
create table if not exists public.conditions (
  id             uuid primary key default gen_random_uuid(),
  patient_id     uuid not null references public.patients(id) on delete cascade,
  doctor_id      uuid references public.staff(id) on delete restrict,
  department_id  uuid references public.departments(id) on delete set null,
  name           text not null,
  status         text not null default 'active' check (status in ('active', 'resolved')),
  sensitivity    text not null default 'normal' check (sensitivity in ('normal', 'restricted')),
  diagnosed_date date,
  notes          text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists conditions_patient_id_idx on public.conditions(patient_id);

alter table public.conditions enable row level security;
revoke all on public.conditions from public, anon;
grant select, insert, update on public.conditions to authenticated;

-- 4. Allergies Table
create table if not exists public.allergies (
  id          uuid primary key default gen_random_uuid(),
  patient_id  uuid not null references public.patients(id) on delete cascade,
  substance   text not null,
  reaction    text,
  severity    text not null default 'moderate' check (severity in ('mild', 'moderate', 'severe')),
  recorded_by uuid references public.staff(id) on delete set null,
  created_at  timestamptz not null default now()
);

create index if not exists allergies_patient_id_idx on public.allergies(patient_id);

alter table public.allergies enable row level security;
revoke all on public.allergies from public, anon;
grant select, insert, update on public.allergies to authenticated;

-- 5. Medications Table
create table if not exists public.medications (
  id             uuid primary key default gen_random_uuid(),
  patient_id     uuid not null references public.patients(id) on delete cascade,
  doctor_id      uuid not null references public.staff(id) on delete restrict,
  department_id  uuid references public.departments(id) on delete set null,
  drug           text not null,
  dose           text not null,
  timing         jsonb not null default '{"morning":true,"afternoon":false,"night":true}'::jsonb,
  duration_days  integer,
  instructions   text,
  status         text not null default 'active' check (status in ('active', 'stopped', 'completed')),
  stopped_reason text,
  stopped_at     timestamptz,
  sensitivity    text not null default 'normal' check (sensitivity in ('normal', 'restricted')),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists medications_patient_id_idx on public.medications(patient_id);

alter table public.medications enable row level security;
revoke all on public.medications from public, anon;
grant select, insert, update on public.medications to authenticated;

-- 6. Observations Table (Vitals & Clinical readings)
create table if not exists public.observations (
  id           uuid primary key default gen_random_uuid(),
  patient_id   uuid not null references public.patients(id) on delete cascade,
  kind         text not null,
  value_text   text not null,
  unit         text,
  measured_at  timestamptz not null default now(),
  source       text not null default 'clinic' check (source in ('clinic', 'patient')),
  out_of_range boolean not null default false,
  recorded_by  uuid references public.staff(id) on delete set null,
  created_at   timestamptz not null default now()
);

create index if not exists observations_patient_id_idx on public.observations(patient_id);

alter table public.observations enable row level security;
revoke all on public.observations from public, anon;
grant select, insert, update on public.observations to authenticated;

-- =========================================================
-- Freeze Trigger for Signed Notes
-- =========================================================

create or replace function private.freeze_signed_notes()
returns trigger language plpgsql set search_path = '' as $$
begin
  if old.status = 'signed' then
    raise exception 'Signed notes cannot change. Add an addendum instead.';
  end if;
  return new;
end $$;

create trigger encounters_freeze before update on public.encounters
for each row execute function private.freeze_signed_notes();

-- =========================================================
-- Audit Triggers on Clinical Tables
-- =========================================================

create trigger encounters_audit after insert or update or delete on public.encounters
for each row execute function private.audit_row();

create trigger encounter_addenda_audit after insert or update or delete on public.encounter_addenda
for each row execute function private.audit_row();

create trigger conditions_audit after insert or update or delete on public.conditions
for each row execute function private.audit_row();

create trigger allergies_audit after insert or update or delete on public.allergies
for each row execute function private.audit_row();

create trigger medications_audit after insert or update or delete on public.medications
for each row execute function private.audit_row();

create trigger observations_audit after insert or update or delete on public.observations
for each row execute function private.audit_row();

-- =========================================================
-- Row-Level Security Policies
-- =========================================================

-- Restrictive MFA Policies for Staff on Clinical Tables
create policy "staff need two-factor on encounters" on public.encounters
as restrictive for all to authenticated
using ( (select private.my_staff_id()) is null or (select auth.jwt() ->> 'aal') = 'aal2' )
with check ( (select private.my_staff_id()) is null or (select auth.jwt() ->> 'aal') = 'aal2' );

create policy "staff need two-factor on encounter_addenda" on public.encounter_addenda
as restrictive for all to authenticated
using ( (select private.my_staff_id()) is null or (select auth.jwt() ->> 'aal') = 'aal2' )
with check ( (select private.my_staff_id()) is null or (select auth.jwt() ->> 'aal') = 'aal2' );

create policy "staff need two-factor on conditions" on public.conditions
as restrictive for all to authenticated
using ( (select private.my_staff_id()) is null or (select auth.jwt() ->> 'aal') = 'aal2' )
with check ( (select private.my_staff_id()) is null or (select auth.jwt() ->> 'aal') = 'aal2' );

create policy "staff need two-factor on allergies" on public.allergies
as restrictive for all to authenticated
using ( (select private.my_staff_id()) is null or (select auth.jwt() ->> 'aal') = 'aal2' )
with check ( (select private.my_staff_id()) is null or (select auth.jwt() ->> 'aal') = 'aal2' );

create policy "staff need two-factor on medications" on public.medications
as restrictive for all to authenticated
using ( (select private.my_staff_id()) is null or (select auth.jwt() ->> 'aal') = 'aal2' )
with check ( (select private.my_staff_id()) is null or (select auth.jwt() ->> 'aal') = 'aal2' );

create policy "staff need two-factor on observations" on public.observations
as restrictive for all to authenticated
using ( (select private.my_staff_id()) is null or (select auth.jwt() ->> 'aal') = 'aal2' )
with check ( (select private.my_staff_id()) is null or (select auth.jwt() ->> 'aal') = 'aal2' );

-- --- 1. Encounters Policies ---
create policy "patients read own signed encounters" on public.encounters
for select to authenticated
using ( patient_id in (select private.my_profile_patient_ids()) and status = 'signed' );

create policy "care team reads encounters" on public.encounters
for select to authenticated
using (
  patient_id in (select private.my_care_patient_ids())
  and (
    sensitivity = 'normal'
    or department_id = (select private.my_department_id())
  )
);

create policy "doctors start notes for care patients" on public.encounters
for insert to authenticated
with check (
  (select private.my_role()) = 'doctor'
  and doctor_id = (select private.my_staff_id())
  and patient_id in (select private.my_care_patient_ids())
  and status = 'draft'
);

create policy "doctors edit own draft notes" on public.encounters
for update to authenticated
using ( doctor_id = (select private.my_staff_id()) and status = 'draft' )
with check ( doctor_id = (select private.my_staff_id()) );

-- --- 2. Encounter Addenda Policies ---
create policy "patients read own encounter addenda" on public.encounter_addenda
for select to authenticated
using ( patient_id in (select private.my_profile_patient_ids()) );

create policy "care team reads encounter addenda" on public.encounter_addenda
for select to authenticated
using ( patient_id in (select private.my_care_patient_ids()) );

create policy "doctors insert addenda" on public.encounter_addenda
for insert to authenticated
with check (
  (select private.my_role()) = 'doctor'
  and doctor_id = (select private.my_staff_id())
  and patient_id in (select private.my_care_patient_ids())
);

-- --- 3. Conditions Policies ---
create policy "patients read own conditions" on public.conditions
for select to authenticated
using ( patient_id in (select private.my_profile_patient_ids()) );

create policy "care team reads conditions" on public.conditions
for select to authenticated
using (
  patient_id in (select private.my_care_patient_ids())
  and (
    sensitivity = 'normal'
    or department_id = (select private.my_department_id())
  )
);

create policy "doctors manage conditions" on public.conditions
for all to authenticated
using (
  (select private.my_role()) = 'doctor'
  and patient_id in (select private.my_care_patient_ids())
)
with check (
  (select private.my_role()) = 'doctor'
  and patient_id in (select private.my_care_patient_ids())
);

-- --- 4. Allergies Policies ---
create policy "patients read own allergies" on public.allergies
for select to authenticated
using ( patient_id in (select private.my_profile_patient_ids()) );

create policy "care team reads allergies" on public.allergies
for select to authenticated
using ( patient_id in (select private.my_care_patient_ids()) );

create policy "doctors manage allergies" on public.allergies
for all to authenticated
using (
  (select private.my_role()) = 'doctor'
  and patient_id in (select private.my_care_patient_ids())
)
with check (
  (select private.my_role()) = 'doctor'
  and patient_id in (select private.my_care_patient_ids())
);

-- --- 5. Medications Policies ---
create policy "patients read own medications" on public.medications
for select to authenticated
using ( patient_id in (select private.my_profile_patient_ids()) );

create policy "care team reads medications" on public.medications
for select to authenticated
using (
  patient_id in (select private.my_care_patient_ids())
  and (
    sensitivity = 'normal'
    or department_id = (select private.my_department_id())
  )
);

create policy "doctors manage medications" on public.medications
for all to authenticated
using (
  (select private.my_role()) = 'doctor'
  and patient_id in (select private.my_care_patient_ids())
)
with check (
  (select private.my_role()) = 'doctor'
  and patient_id in (select private.my_care_patient_ids())
);

-- --- 6. Observations Policies ---
create policy "patients read own observations" on public.observations
for select to authenticated
using ( patient_id in (select private.my_profile_patient_ids()) );

create policy "care team reads observations" on public.observations
for select to authenticated
using ( patient_id in (select private.my_care_patient_ids()) );

create policy "doctors manage observations" on public.observations
for all to authenticated
using (
  (select private.my_role()) = 'doctor'
  and patient_id in (select private.my_care_patient_ids())
)
with check (
  (select private.my_role()) = 'doctor'
  and patient_id in (select private.my_care_patient_ids())
);

-- =========================================================
-- Public RPC Functions
-- =========================================================

-- Updated request_emergency_access: enforces minimum 15 characters reason
create or replace function public.request_emergency_access(p_patient_id uuid, p_reason text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_staff_id uuid;
  v_access_id uuid;
begin
  if not private.is_doctor_mfa() then
    raise exception 'Doctor two-factor authentication required for emergency access';
  end if;

  if p_reason is null or length(trim(p_reason)) < 15 then
    raise exception 'A written reason of at least 15 characters is required';
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

-- log_chart_view RPC: writes VIEWED_CHART to audit_log
create or replace function public.log_chart_view(p_patient_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  insert into public.audit_log (actor_id, action, table_name, record_id, patient_id)
  values (auth.uid(), 'VIEWED_CHART', 'patients', p_patient_id, p_patient_id);
end;
$$;

revoke execute on function public.log_chart_view(uuid) from public, anon;
grant execute on function public.log_chart_view(uuid) to authenticated;

-- =========================================================
-- Patient Timeline View (security_invoker = true)
-- =========================================================

create or replace view public.patient_timeline with (security_invoker = true) as
select
  e.id as event_id,
  e.patient_id,
  coalesce(e.signed_at, e.created_at) as happened_at,
  'encounter' as event_type,
  e.status as status,
  e.sensitivity,
  coalesce(e.chief_complaint, 'Consultation note') as title,
  e.diagnosis as details,
  e.doctor_id as actor_id
from public.encounters e
union all
select
  m.id as event_id,
  m.patient_id,
  m.created_at as happened_at,
  'medication' as event_type,
  m.status as status,
  m.sensitivity,
  m.drug || ' (' || m.dose || ')' as title,
  m.instructions as details,
  m.doctor_id as actor_id
from public.medications m
union all
select
  c.id as event_id,
  c.patient_id,
  c.created_at as happened_at,
  'condition' as event_type,
  c.status as status,
  c.sensitivity,
  c.name as title,
  c.notes as details,
  c.doctor_id as actor_id
from public.conditions c
union all
select
  o.id as event_id,
  o.patient_id,
  o.measured_at as happened_at,
  'observation' as event_type,
  case when o.out_of_range then 'abnormal' else 'normal' end as status,
  'normal' as sensitivity,
  o.kind || ': ' || o.value_text || coalesce(' ' || o.unit, '') as title,
  'Source: ' || o.source as details,
  o.recorded_by as actor_id
from public.observations o;

revoke all on public.patient_timeline from public, anon;
grant select on public.patient_timeline to authenticated;
