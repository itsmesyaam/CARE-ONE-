-- Phase 7 Task 1: Admin Dashboard Counts and Access Log RPCs

-- 1. Admin Dashboard Counts RPC
-- Returns aggregated operational counts only, strictly enforcing admin role + AAL2 MFA inside.
create or replace function public.get_admin_dashboard_counts()
returns table (
  today_appointments bigint,
  follow_ups_due bigint,
  reports_waiting_review bigint,
  patients_overdue_follow_up bigint,
  consultations_this_month bigint,
  active_patients_30d bigint,
  invited_patients bigint,
  active_patient_share numeric
) language plpgsql security definer set search_path = '' as $$
declare
  v_role text;
  v_aal text;
  v_today_appointments bigint;
  v_follow_ups_due bigint;
  v_reports_waiting_review bigint;
  v_patients_overdue_follow_up bigint;
  v_consultations_this_month bigint;
  v_active_patients_30d bigint;
  v_invited_patients bigint;
  v_share numeric;
begin
  -- Enforce active admin role
  select s.role into v_role
  from public.staff s
  where s.user_id = auth.uid() and s.is_active and s.deleted_at is null;

  if v_role is null or v_role <> 'admin' then
    raise exception 'Unauthorized: Admin role required';
  end if;

  -- Enforce AAL2 MFA
  v_aal := (auth.jwt() ->> 'aal');
  if v_aal is null or v_aal <> 'aal2' then
    raise exception 'Unauthorized: Two-factor authentication (AAL2) required';
  end if;

  -- 1. Today's appointments (Asia/Kolkata date, excluding cancelled)
  select count(*) into v_today_appointments
  from public.appointments a
  where (a.appointment_date at time zone 'Asia/Kolkata')::date = (now() at time zone 'Asia/Kolkata')::date
    and a.status <> 'cancelled';

  -- 2. Follow-ups due today (pending follow_up care plan items due today in Asia/Kolkata)
  select count(distinct cpi.patient_id) into v_follow_ups_due
  from public.care_plan_items cpi
  where cpi.kind = 'follow_up'
    and cpi.status = 'pending'
    and cpi.due_date = (now() at time zone 'Asia/Kolkata')::date;

  -- 3. Reports waiting for review (pending documents)
  select count(*) into v_reports_waiting_review
  from public.documents d
  where d.review_status = 'pending';

  -- 4. Patients overdue for follow-up (pending follow_up items with due_date before today)
  select count(distinct cpi.patient_id) into v_patients_overdue_follow_up
  from public.care_plan_items cpi
  where cpi.kind = 'follow_up'
    and cpi.status = 'pending'
    and cpi.due_date < (now() at time zone 'Asia/Kolkata')::date;

  -- 5. Consultations this month (signed encounters in current calendar month in Asia/Kolkata)
  select count(*) into v_consultations_this_month
  from public.encounters e
  where e.status = 'signed'
    and date_trunc('month', e.signed_at at time zone 'Asia/Kolkata') = date_trunc('month', now() at time zone 'Asia/Kolkata');

  -- 6. Patients active in the last 30 days as a share of those invited
  select count(distinct al.patient_id) into v_active_patients_30d
  from public.audit_log al
  where al.patient_id is not null
    and al.at >= (now() - interval '30 days');

  select count(distinct pa.patient_id) into v_invited_patients
  from public.patient_access pa
  where pa.revoked_at is null;

  if v_invited_patients > 0 then
    v_share := round((v_active_patients_30d::numeric / v_invited_patients::numeric) * 100, 1);
  else
    v_share := 0;
  end if;

  return query
  select
    coalesce(v_today_appointments, 0),
    coalesce(v_follow_ups_due, 0),
    coalesce(v_reports_waiting_review, 0),
    coalesce(v_patients_overdue_follow_up, 0),
    coalesce(v_consultations_this_month, 0),
    coalesce(v_active_patients_30d, 0),
    coalesce(v_invited_patients, 0),
    coalesce(v_share, 0);
end;
$$;

revoke execute on function public.get_admin_dashboard_counts() from public, anon;
grant execute on function public.get_admin_dashboard_counts() to authenticated;

-- 2. Admin Access Log RPC
-- Returns audit events for admin review, strictly omitting old_row and new_row payloads.
create or replace function public.get_admin_audit_logs(
  p_start_date date default null,
  p_end_date date default null,
  p_staff_id uuid default null,
  p_action text default null,
  p_limit integer default 50,
  p_offset integer default 0
)
returns table (
  id bigint,
  at timestamptz,
  actor_id uuid,
  actor_name text,
  actor_role text,
  action text,
  table_name text,
  record_id uuid,
  patient_id uuid,
  reason text
) language plpgsql security definer set search_path = '' as $$
declare
  v_role text;
  v_aal text;
begin
  -- Enforce active admin role
  select s.role into v_role
  from public.staff s
  where s.user_id = auth.uid() and s.is_active and s.deleted_at is null;

  if v_role is null or v_role <> 'admin' then
    raise exception 'Unauthorized: Admin role required';
  end if;

  -- Enforce AAL2 MFA
  v_aal := (auth.jwt() ->> 'aal');
  if v_aal is null or v_aal <> 'aal2' then
    raise exception 'Unauthorized: Two-factor authentication (AAL2) required';
  end if;

  return query
  select
    al.id,
    al.at,
    al.actor_id,
    s.full_name as actor_name,
    s.role as actor_role,
    al.action,
    al.table_name,
    al.record_id,
    al.patient_id,
    al.reason
  from public.audit_log al
  left join public.staff s on s.user_id = al.actor_id and s.deleted_at is null
  where (p_start_date is null or (al.at at time zone 'Asia/Kolkata')::date >= p_start_date)
    and (p_end_date is null or (al.at at time zone 'Asia/Kolkata')::date <= p_end_date)
    and (p_staff_id is null or s.id = p_staff_id)
    and (p_action is null or al.action = p_action)
  order by al.at desc
  limit coalesce(p_limit, 50)
  offset coalesce(p_offset, 0);
end;
$$;

revoke execute on function public.get_admin_audit_logs(date, date, uuid, text, integer, integer) from public, anon;
grant execute on function public.get_admin_audit_logs(date, date, uuid, text, integer, integer) to authenticated;
