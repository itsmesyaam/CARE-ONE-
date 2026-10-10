-- Migration: 20261007140000_security_audit_hardening.sql
-- Description: Security audit hardening:
-- 1. Restrict claim_due_reminders and generate_daily_medicine_reminders to service_role only.
-- 2. Add storage path prefix constraint on documents and update storage SELECT policy to prevent IDOR.
-- 3. Replace 'ALL' policies on clinical tables with explicit INSERT and UPDATE to prevent hard deletes.

-- 1. Restrict internal reminder RPC execution
revoke execute on function public.claim_due_reminders(integer) from public, anon, authenticated;
grant execute on function public.claim_due_reminders(integer) to service_role;

revoke execute on function public.generate_daily_medicine_reminders() from public, anon, authenticated;
grant execute on function public.generate_daily_medicine_reminders() to service_role;

-- 2. Prevent storage path IDOR on documents table
alter table public.documents
  add constraint documents_storage_path_patient_prefix_check
  check (storage_path like (patient_id::text || '/%'));

-- Enforce folder prefix match in storage object SELECT policy
drop policy if exists "files follow their document row" on storage.objects;
create policy "files follow their document row"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'patient-files'
    and exists (
      select 1 from public.documents d
      where d.storage_path = objects.name
        and (storage.foldername(objects.name))[1] = d.patient_id::text
    )
  );

-- 3. Prevent hard deletes on clinical tables (allergies, conditions, medications, observations)
-- Allergies
drop policy if exists "doctors manage allergies" on public.allergies;
create policy "doctors insert allergies" on public.allergies
  for insert to authenticated
  with check (
    (select private.my_role()) = 'doctor'
    and patient_id in (select private.my_care_patient_ids())
  );
create policy "doctors update allergies" on public.allergies
  for update to authenticated
  using (
    (select private.my_role()) = 'doctor'
    and patient_id in (select private.my_care_patient_ids())
  )
  with check (
    (select private.my_role()) = 'doctor'
    and patient_id in (select private.my_care_patient_ids())
  );

-- Conditions
drop policy if exists "doctors manage conditions" on public.conditions;
create policy "doctors insert conditions" on public.conditions
  for insert to authenticated
  with check (
    (select private.my_role()) = 'doctor'
    and patient_id in (select private.my_care_patient_ids())
  );
create policy "doctors update conditions" on public.conditions
  for update to authenticated
  using (
    (select private.my_role()) = 'doctor'
    and patient_id in (select private.my_care_patient_ids())
  )
  with check (
    (select private.my_role()) = 'doctor'
    and patient_id in (select private.my_care_patient_ids())
  );

-- Medications
drop policy if exists "doctors manage medications" on public.medications;
create policy "doctors insert medications" on public.medications
  for insert to authenticated
  with check (
    (select private.my_role()) = 'doctor'
    and patient_id in (select private.my_care_patient_ids())
  );
create policy "doctors update medications" on public.medications
  for update to authenticated
  using (
    (select private.my_role()) = 'doctor'
    and patient_id in (select private.my_care_patient_ids())
  )
  with check (
    (select private.my_role()) = 'doctor'
    and patient_id in (select private.my_care_patient_ids())
  );

-- Observations
drop policy if exists "doctors manage observations" on public.observations;
create policy "doctors insert observations" on public.observations
  for insert to authenticated
  with check (
    (select private.my_role()) = 'doctor'
    and patient_id in (select private.my_care_patient_ids())
  );
create policy "doctors update observations" on public.observations
  for update to authenticated
  using (
    (select private.my_role()) = 'doctor'
    and patient_id in (select private.my_care_patient_ids())
  )
  with check (
    (select private.my_role()) = 'doctor'
    and patient_id in (select private.my_care_patient_ids())
  );
