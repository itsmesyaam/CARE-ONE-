-- Phase 3 Task 1: Admin and Front Desk Database Schema
-- Adds archived_at to departments, id_checked to patients,
-- UHID sequence and generator, appointments table with care_team trigger,
-- and immutable consents table.

-- 1. Departments: Add archived_at
alter table public.departments
  add column if not exists archived_at timestamptz;

-- 2. Patients: Add id_checked
alter table public.patients
  add column if not exists id_checked boolean not null default false;

-- 3. Patient UHID Sequence & Generator Function
create sequence if not exists public.patient_uhid_seq start with 1001 increment by 1;
grant usage, select on sequence public.patient_uhid_seq to authenticated;

create or replace function public.generate_patient_uhid()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_short_code text;
  v_seq bigint;
begin
  select coalesce(short_code, 'ABC') into v_short_code
  from public.hospital_settings
  where id = 'default'
  limit 1;

  v_seq := nextval('public.patient_uhid_seq');

  return coalesce(v_short_code, 'ABC') || '-' || lpad(v_seq::text, 4, '0');
end;
$$;

revoke execute on function public.generate_patient_uhid() from public, anon;
grant execute on function public.generate_patient_uhid() to authenticated;

alter table public.patients
  alter column uhid set default public.generate_patient_uhid();

-- 4. Appointments Table
create table if not exists public.appointments (
  id               uuid primary key default gen_random_uuid(),
  patient_id       uuid not null references public.patients(id) on delete cascade,
  doctor_id        uuid not null references public.staff(id) on delete restrict,
  department_id    uuid references public.departments(id) on delete set null,
  appointment_date timestamptz not null,
  status           text not null default 'booked' check (status in ('booked', 'rescheduled', 'cancelled', 'arrived', 'done')),
  notes            text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists appointments_patient_id_idx on public.appointments(patient_id);
create index if not exists appointments_doctor_id_idx on public.appointments(doctor_id);
create index if not exists appointments_date_idx on public.appointments(appointment_date);

alter table public.appointments enable row level security;
revoke all on public.appointments from public, anon;
grant select, insert, update on public.appointments to authenticated;

-- Restrictive MFA policy on appointments for staff
create policy "staff need two-factor on appointments" on public.appointments
as restrictive for all to authenticated
using ( (select private.my_staff_id()) is null or (select auth.jwt() ->> 'aal') = 'aal2' )
with check ( (select private.my_staff_id()) is null or (select auth.jwt() ->> 'aal') = 'aal2' );

-- Patients read own and dependents appointments
create policy "patients read own appointments" on public.appointments
for select to authenticated
using ( patient_id in (select private.my_profile_patient_ids()) );

-- Front desk reads all appointments and manages them
create policy "front desk reads appointments" on public.appointments
for select to authenticated
using ( (select private.my_role()) = 'front_desk' );

create policy "front desk manages appointments" on public.appointments
for all to authenticated
using ( (select private.my_role()) = 'front_desk' )
with check ( (select private.my_role()) = 'front_desk' );

-- Doctors read and update appointments assigned to them, their department, or care patients
create policy "doctors read their appointments" on public.appointments
for select to authenticated
using (
  (select private.my_role()) = 'doctor' and (
    doctor_id = (select private.my_staff_id())
    or patient_id in (select private.my_care_patient_ids())
    or department_id = (select private.my_department_id())
  )
);

create policy "doctors update their appointments" on public.appointments
for update to authenticated
using (
  (select private.my_role()) = 'doctor' and (
    doctor_id = (select private.my_staff_id())
  )
)
with check (
  (select private.my_role()) = 'doctor' and (
    doctor_id = (select private.my_staff_id())
  )
);

-- Appointments audit trigger
create trigger appointments_audit after insert or update or delete on public.appointments
for each row execute function private.audit_row();

-- 5. Trigger: Add doctor to care_team for 1 year upon appointment booking
create or replace function private.handle_appointment_care_team()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_expiry timestamptz;
  v_existing_id uuid;
begin
  v_expiry := new.appointment_date + interval '1 year';

  select id into v_existing_id
  from public.care_team
  where patient_id = new.patient_id
    and staff_id = new.doctor_id
    and revoked_at is null
  order by expires_at desc nulls last
  limit 1;

  if v_existing_id is not null then
    update public.care_team
    set expires_at = greatest(expires_at, v_expiry)
    where id = v_existing_id;
  else
    insert into public.care_team (patient_id, staff_id, reason, expires_at)
    values (new.patient_id, new.doctor_id, 'appointment', v_expiry);
  end if;

  return new;
end;
$$;

revoke execute on function private.handle_appointment_care_team() from public, anon;
grant execute on function private.handle_appointment_care_team() to authenticated;

create trigger appointments_care_team_trigger
after insert or update of doctor_id, appointment_date on public.appointments
for each row execute function private.handle_appointment_care_team();

-- 6. Consents Table (Immutable log)
create table if not exists public.consents (
  id           uuid primary key default gen_random_uuid(),
  patient_id   uuid not null references public.patients(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  consent_type text not null default 'general',
  version      text not null default '1.0',
  agreed_at    timestamptz not null default now(),
  created_at   timestamptz not null default now()
);

create index if not exists consents_patient_id_idx on public.consents(patient_id);
create index if not exists consents_user_id_idx on public.consents(user_id);

alter table public.consents enable row level security;
revoke all on public.consents from public, anon;
grant select, insert on public.consents to authenticated;
revoke update, delete, truncate on public.consents from anon, authenticated;

-- Restrictive MFA policy on consents for staff
create policy "staff need two-factor on consents" on public.consents
as restrictive for all to authenticated
using ( (select private.my_staff_id()) is null or (select auth.jwt() ->> 'aal') = 'aal2' )
with check ( (select private.my_staff_id()) is null or (select auth.jwt() ->> 'aal') = 'aal2' );

-- Patients read and insert own consents
create policy "patients read own consents" on public.consents
for select to authenticated
using (
  user_id = (select auth.uid())
  or patient_id in (select private.my_profile_patient_ids())
);

create policy "patients insert own consents" on public.consents
for insert to authenticated
with check (
  user_id = (select auth.uid())
  and patient_id in (select private.my_profile_patient_ids())
);

-- Staff read consents for front desk or patients in care
create policy "staff read consents" on public.consents
for select to authenticated
using (
  (select private.my_role()) = 'front_desk'
  or patient_id in (select private.my_care_patient_ids())
);

-- Consents audit trigger
create trigger consents_audit after insert on public.consents
for each row execute function private.audit_row();
