-- Phase 2 Task 1: Extend hospital_settings and add public branding RPC

-- 1. Update audit_row function to safely parse record_id as UUID without crashing on non-UUID keys (e.g. 'default')
create or replace function private.audit_row()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  r jsonb := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  v_rec_id uuid := null;
  v_pat_id uuid := null;
begin
  if (r ->> 'id') ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' then
    v_rec_id := (r ->> 'id')::uuid;
  end if;

  if (r ->> 'patient_id') ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' then
    v_pat_id := (r ->> 'patient_id')::uuid;
  elsif tg_table_name = 'patients' and v_rec_id is not null then
    v_pat_id := v_rec_id;
  end if;

  insert into public.audit_log
    (actor_id, action, table_name, record_id, patient_id, old_row, new_row)
  values (
    auth.uid(), tg_op, tg_table_name,
    v_rec_id,
    v_pat_id,
    case when tg_op <> 'INSERT' then to_jsonb(old) end,
    case when tg_op <> 'DELETE' then to_jsonb(new) end
  );
  return null;
end $$;

-- 2. Alter hospital_settings table to add missing branding columns
alter table public.hospital_settings
  add column if not exists short_code text not null default 'ABC',
  add column if not exists logo_path text,
  add column if not exists accent_color text not null default '#C9A43B',
  add column if not exists casualty_phone text not null default '0484 000 0112',
  add column if not exists time_zone text not null default 'Asia/Kolkata';

-- Update primary_color default to Kerala leaf green (#1F6B4F) from design tokens
alter table public.hospital_settings
  alter column primary_color set default '#1F6B4F';

-- Ensure the singleton row exists with these initial settings
insert into public.hospital_settings (
  id, hospital_name, short_code, logo_path, primary_color, accent_color, casualty_phone, time_zone
) values (
  'default', 'ABC Hospital', 'ABC', null, '#1F6B4F', '#C9A43B', '0484 000 0112', 'Asia/Kolkata'
)
on conflict (id) do update set
  hospital_name = excluded.hospital_name,
  short_code = excluded.short_code,
  primary_color = excluded.primary_color,
  accent_color = excluded.accent_color,
  casualty_phone = excluded.casualty_phone,
  time_zone = excluded.time_zone,
  updated_at = now();

-- Revoke write permissions from public and anon
revoke insert, update, delete, truncate on public.hospital_settings from public, anon;
grant select on public.hospital_settings to public, anon, authenticated;

-- 3. Security-definer RPC returning ONLY public branding fields
create or replace function public.get_public_hospital_settings()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'hospital_name', s.hospital_name,
    'short_code', s.short_code,
    'logo_path', s.logo_path,
    'primary_color', s.primary_color,
    'accent_color', s.accent_color,
    'casualty_phone', s.casualty_phone,
    'time_zone', s.time_zone
  )
  from public.hospital_settings s
  where s.id = 'default'
  limit 1;
$$;

-- Allow anon and authenticated to execute the branding RPC
revoke execute on function public.get_public_hospital_settings() from public;
grant execute on function public.get_public_hospital_settings() to anon, authenticated;
