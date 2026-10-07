-- Phase 6 Task 1: Care Plans, Care Plan Items, Reminders, Push Subscriptions, and Symptom Reports Schema

-- 1. Care Plans Table
create table if not exists public.care_plans (
  id           uuid primary key default gen_random_uuid(),
  patient_id   uuid not null references public.patients(id) on delete cascade,
  encounter_id uuid references public.encounters(id) on delete set null,
  doctor_id    uuid not null references public.staff(id) on delete restrict,
  status       text not null default 'active' check (status in ('active', 'completed', 'cancelled')),
  title        text,
  notes        text,
  review_date  date,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists care_plans_patient_id_idx on public.care_plans(patient_id);
create index if not exists care_plans_doctor_id_idx on public.care_plans(doctor_id);

alter table public.care_plans enable row level security;
revoke all on public.care_plans from public, anon;
grant select, insert, update on public.care_plans to authenticated;

-- 2. Care Plan Items Table
create table if not exists public.care_plan_items (
  id           uuid primary key default gen_random_uuid(),
  care_plan_id uuid not null references public.care_plans(id) on delete cascade,
  patient_id   uuid not null references public.patients(id) on delete cascade,
  kind         text not null check (kind in ('medicine', 'test', 'follow_up', 'reading', 'instruction')),
  detail       text not null,
  timing       jsonb, -- e.g. {"morning":true,"afternoon":false,"night":true}
  due_date     date,
  status       text not null default 'pending' check (status in ('pending', 'completed', 'cancelled')),
  completed_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists care_plan_items_care_plan_id_idx on public.care_plan_items(care_plan_id);
create index if not exists care_plan_items_patient_id_idx on public.care_plan_items(patient_id);
create index if not exists care_plan_items_due_date_idx on public.care_plan_items(due_date);

alter table public.care_plan_items enable row level security;
revoke all on public.care_plan_items from public, anon;
grant select, insert, update on public.care_plan_items to authenticated;

-- 3. Reminders Table
create table if not exists public.reminders (
  id                uuid primary key default gen_random_uuid(),
  patient_id        uuid not null references public.patients(id) on delete cascade,
  care_plan_item_id uuid references public.care_plan_items(id) on delete set null,
  appointment_id    uuid references public.appointments(id) on delete set null,
  title             text not null,
  scheduled_for     timestamptz not null default now(),
  channel           text not null default 'push' check (channel in ('push', 'email')),
  status            text not null default 'pending' check (status in ('pending', 'claimed', 'sent', 'failed')),
  attempts          integer not null default 0,
  last_attempt_at   timestamptz,
  error_message     text,
  created_at        timestamptz not null default now()
);

create index if not exists reminders_patient_id_idx on public.reminders(patient_id);
create index if not exists reminders_status_sched_idx on public.reminders(status, scheduled_for);

alter table public.reminders enable row level security;
revoke all on public.reminders from public, anon;
grant select, insert, update on public.reminders to authenticated, service_role;

-- 4. Push Subscriptions Table
create table if not exists public.push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  endpoint   text not null unique,
  p256dh     text not null,
  auth       text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists push_subscriptions_user_id_idx on public.push_subscriptions(user_id);

alter table public.push_subscriptions enable row level security;
revoke all on public.push_subscriptions from public, anon;
grant select, insert, update, delete on public.push_subscriptions to authenticated, service_role;

-- 5. Symptom Reports Table
create table if not exists public.symptom_reports (
  id          uuid primary key default gen_random_uuid(),
  patient_id  uuid not null references public.patients(id) on delete cascade,
  description text not null,
  severity    text not null default 'moderate' check (severity in ('mild', 'moderate', 'severe')),
  reported_at timestamptz not null default now(),
  reviewed_by uuid references public.staff(id) on delete set null,
  reviewed_at timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists symptom_reports_patient_id_idx on public.symptom_reports(patient_id);

alter table public.symptom_reports enable row level security;
revoke all on public.symptom_reports from public, anon;
grant select, insert, update on public.symptom_reports to authenticated;

-- =========================================================
-- Audit Triggers
-- =========================================================

create trigger care_plans_audit after insert or update or delete on public.care_plans
for each row execute function private.audit_row();

create trigger care_plan_items_audit after insert or update or delete on public.care_plan_items
for each row execute function private.audit_row();

create trigger symptom_reports_audit after insert or update or delete on public.symptom_reports
for each row execute function private.audit_row();

-- =========================================================
-- Care Plan Item -> Reminder Trigger
-- =========================================================

create or replace function private.handle_care_plan_item_reminder()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.due_date is not null and new.kind <> 'medicine' then
    insert into public.reminders (patient_id, care_plan_item_id, title, scheduled_for, channel, status)
    values (
      new.patient_id,
      new.id,
      case 
        when new.kind = 'test' then 'Scheduled test: ' || new.detail
        when new.kind = 'follow_up' then 'Follow-up visit: ' || new.detail
        when new.kind = 'reading' then 'Reading due: ' || new.detail
        else 'Care task: ' || new.detail
      end,
      (new.due_date::text || ' 03:30:00+00')::timestamptz,
      'push',
      'pending'
    );
  end if;
  return new;
end;
$$;

create trigger care_plan_items_reminder_trigger
after insert on public.care_plan_items
for each row execute function private.handle_care_plan_item_reminder();

-- =========================================================
-- Row-Level Security Policies
-- =========================================================

-- Restrictive MFA Policies for Staff
create policy "staff need two-factor on care_plans" on public.care_plans
as restrictive for all to authenticated
using ( (select private.my_staff_id()) is null or (select auth.jwt() ->> 'aal') = 'aal2' )
with check ( (select private.my_staff_id()) is null or (select auth.jwt() ->> 'aal') = 'aal2' );

create policy "staff need two-factor on care_plan_items" on public.care_plan_items
as restrictive for all to authenticated
using ( (select private.my_staff_id()) is null or (select auth.jwt() ->> 'aal') = 'aal2' )
with check ( (select private.my_staff_id()) is null or (select auth.jwt() ->> 'aal') = 'aal2' );

create policy "staff need two-factor on reminders" on public.reminders
as restrictive for all to authenticated
using ( (select private.my_staff_id()) is null or (select auth.jwt() ->> 'aal') = 'aal2' )
with check ( (select private.my_staff_id()) is null or (select auth.jwt() ->> 'aal') = 'aal2' );

create policy "staff need two-factor on symptom_reports" on public.symptom_reports
as restrictive for all to authenticated
using ( (select private.my_staff_id()) is null or (select auth.jwt() ->> 'aal') = 'aal2' )
with check ( (select private.my_staff_id()) is null or (select auth.jwt() ->> 'aal') = 'aal2' );

-- --- 1. Care Plans Policies ---
create policy "patients read own care plans" on public.care_plans
for select to authenticated
using ( patient_id in (select private.my_profile_patient_ids()) );

create policy "care team reads care plans" on public.care_plans
for select to authenticated
using ( patient_id in (select private.my_care_patient_ids()) );

create policy "doctors manage care plans" on public.care_plans
for all to authenticated
using (
  (select private.my_role()) = 'doctor'
  and patient_id in (select private.my_care_patient_ids())
)
with check (
  (select private.my_role()) = 'doctor'
  and patient_id in (select private.my_care_patient_ids())
);

-- --- 2. Care Plan Items Policies ---
create policy "patients read own care plan items" on public.care_plan_items
for select to authenticated
using ( patient_id in (select private.my_profile_patient_ids()) );

create policy "care team reads care plan items" on public.care_plan_items
for select to authenticated
using ( patient_id in (select private.my_care_patient_ids()) );

create policy "doctors manage care plan items" on public.care_plan_items
for all to authenticated
using (
  (select private.my_role()) = 'doctor'
  and patient_id in (select private.my_care_patient_ids())
)
with check (
  (select private.my_role()) = 'doctor'
  and patient_id in (select private.my_care_patient_ids())
);

create policy "patients update own care plan items" on public.care_plan_items
for update to authenticated
using ( patient_id in (select private.my_profile_patient_ids()) )
with check ( patient_id in (select private.my_profile_patient_ids()) );

-- --- 3. Reminders Policies ---
create policy "patients read own reminders" on public.reminders
for select to authenticated
using ( patient_id in (select private.my_profile_patient_ids()) );

create policy "care team reads reminders" on public.reminders
for select to authenticated
using ( patient_id in (select private.my_care_patient_ids()) );

-- --- 4. Push Subscriptions Policies ---
create policy "users manage own push subscriptions" on public.push_subscriptions
for all to authenticated
using ( user_id = auth.uid() )
with check ( user_id = auth.uid() );

-- --- 5. Symptom Reports Policies ---
create policy "patients read own symptom reports" on public.symptom_reports
for select to authenticated
using ( patient_id in (select private.my_profile_patient_ids()) );

create policy "care team reads symptom reports" on public.symptom_reports
for select to authenticated
using ( patient_id in (select private.my_care_patient_ids()) );

create policy "patients insert own symptom reports" on public.symptom_reports
for insert to authenticated
with check ( patient_id in (select private.my_profile_patient_ids()) );

create policy "doctors review symptom reports" on public.symptom_reports
for update to authenticated
using (
  (select private.my_role()) = 'doctor'
  and patient_id in (select private.my_care_patient_ids())
)
with check (
  (select private.my_role()) = 'doctor'
  and patient_id in (select private.my_care_patient_ids())
);

-- --- 6. Observations: Patients log readings ---
create policy "patients insert own observations" on public.observations
for insert to authenticated
with check (
  patient_id in (select private.my_profile_patient_ids())
  and source = 'patient'
);

-- =========================================================
-- Public Functions & RPCs
-- =========================================================

-- Function 1: claim_due_reminders (uses FOR UPDATE SKIP LOCKED)
create or replace function public.claim_due_reminders(p_limit integer default 20)
returns setof public.reminders language plpgsql security definer set search_path = '' as $$
begin
  return query
  with due as (
    select id
    from public.reminders
    where status = 'pending'
      and scheduled_for <= now()
      and attempts < 3
    order by scheduled_for asc
    limit coalesce(p_limit, 20)
    for update skip locked
  )
  update public.reminders r
  set status = 'claimed',
      last_attempt_at = now()
  from due
  where r.id = due.id
  returning r.*;
end;
$$;

revoke execute on function public.claim_due_reminders(integer) from public, anon;
grant execute on function public.claim_due_reminders(integer) to authenticated, service_role;

-- Function 2: generate_daily_medicine_reminders
create or replace function public.generate_daily_medicine_reminders()
returns integer language plpgsql security definer set search_path = '' as $$
declare
  v_count integer := 0;
  v_item record;
  v_today date := current_date;
  v_sched timestamptz;
begin
  for v_item in
    select cpi.id, cpi.patient_id, cpi.detail, cpi.timing
    from public.care_plan_items cpi
    join public.care_plans cp on cp.id = cpi.care_plan_id
    where cp.status = 'active'
      and cpi.kind = 'medicine'
      and cpi.status = 'pending'
  loop
    -- Morning slot: 08:00 IST (02:30 UTC)
    if coalesce((v_item.timing->>'morning')::boolean, false) then
      v_sched := (v_today::text || ' 02:30:00+00')::timestamptz;
      if not exists (
        select 1 from public.reminders 
        where care_plan_item_id = v_item.id and scheduled_for = v_sched
      ) then
        insert into public.reminders (patient_id, care_plan_item_id, title, scheduled_for, channel, status)
        values (v_item.patient_id, v_item.id, 'Medicine reminder: ' || v_item.detail || ' (Morning)', v_sched, 'push', 'pending');
        v_count := v_count + 1;
      end if;
    end if;

    -- Afternoon slot: 13:00 IST (07:30 UTC)
    if coalesce((v_item.timing->>'afternoon')::boolean, false) then
      v_sched := (v_today::text || ' 07:30:00+00')::timestamptz;
      if not exists (
        select 1 from public.reminders 
        where care_plan_item_id = v_item.id and scheduled_for = v_sched
      ) then
        insert into public.reminders (patient_id, care_plan_item_id, title, scheduled_for, channel, status)
        values (v_item.patient_id, v_item.id, 'Medicine reminder: ' || v_item.detail || ' (Afternoon)', v_sched, 'push', 'pending');
        v_count := v_count + 1;
      end if;
    end if;

    -- Night slot: 20:00 IST (14:30 UTC)
    if coalesce((v_item.timing->>'night')::boolean, false) then
      v_sched := (v_today::text || ' 14:30:00+00')::timestamptz;
      if not exists (
        select 1 from public.reminders 
        where care_plan_item_id = v_item.id and scheduled_for = v_sched
      ) then
        insert into public.reminders (patient_id, care_plan_item_id, title, scheduled_for, channel, status)
        values (v_item.patient_id, v_item.id, 'Medicine reminder: ' || v_item.detail || ' (Night)', v_sched, 'push', 'pending');
        v_count := v_count + 1;
      end if;
    end if;
  end loop;

  return v_count;
end;
$$;

revoke execute on function public.generate_daily_medicine_reminders() from public, anon;
grant execute on function public.generate_daily_medicine_reminders() to authenticated, service_role;

-- Function 3: Admin Demo Control RPC: create_test_reminder
create or replace function public.create_test_reminder(p_patient_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
begin
  if (select private.my_role()) <> 'admin' then
    raise exception 'Admin role required to trigger demo test reminder';
  end if;

  insert into public.reminders (patient_id, title, scheduled_for, channel, status)
  values (p_patient_id, 'Demo test reminder', now() + interval '1 minute', 'push', 'pending')
  returning id into v_id;

  return v_id;
end;
$$;

revoke execute on function public.create_test_reminder(uuid) from public, anon;
grant execute on function public.create_test_reminder(uuid) to authenticated;

-- Function 4: what_changed RPC
create or replace function public.what_changed(p_patient_id uuid)
returns table (happened_at timestamptz, kind text, summary text, ref_table text, ref_id uuid)
language sql stable security invoker set search_path = '' as $$
  with last_visit as (
    select coalesce(max(e.signed_at), '-infinity'::timestamptz) as t
    from public.encounters e
    where e.patient_id = p_patient_id and e.status = 'signed'
  )
  select d.created_at, 'report', 'New report: ' || d.title, 'documents', d.id
  from public.documents d, last_visit lv
  where d.patient_id = p_patient_id and d.created_at > lv.t
  union all
  select m.updated_at, 'medicine', initcap(m.status) || ': ' || m.drug || ' ' || m.dose,
         'medications', m.id
  from public.medications m, last_visit lv
  where m.patient_id = p_patient_id and m.updated_at > lv.t
  union all
  select o.measured_at, 'reading', o.kind || ' ' || o.value_text || ' (outside range)',
         'observations', o.id
  from public.observations o, last_visit lv
  where o.patient_id = p_patient_id and o.measured_at > lv.t and o.out_of_range
  union all
  select i.due_date::timestamptz, 'missed', 'Missed: ' || i.detail, 'care_plan_items', i.id
  from public.care_plan_items i
  join public.care_plans c on c.id = i.care_plan_id, last_visit lv
  where c.patient_id = p_patient_id and i.status = 'pending'
    and i.due_date < current_date and i.due_date > lv.t::date
  union all
  select s.reported_at, 'symptom', 'Patient reported: ' || s.description,
         'symptom_reports', s.id
  from public.symptom_reports s, last_visit lv
  where s.patient_id = p_patient_id and s.reported_at > lv.t
  order by 1 desc
$$;

revoke execute on function public.what_changed(uuid) from public, anon;
grant execute on function public.what_changed(uuid) to authenticated;
