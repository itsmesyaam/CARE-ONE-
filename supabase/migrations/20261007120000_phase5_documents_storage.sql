-- Phase 5 Task 1: Storage Bucket, Documents Table, RLS Policies & Audit Triggers

-- 1. Create or configure 'patient-files' storage bucket
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'patient-files',
  'patient-files',
  false,
  10485760, -- 10 MB limit in bytes
  array['application/pdf', 'image/jpeg', 'image/png']
)
on conflict (id) do update set
  public = false,
  file_size_limit = 10485760,
  allowed_mime_types = array['application/pdf', 'image/jpeg', 'image/png'];

-- 2. Create public.documents table
create table if not exists public.documents (
  id              uuid primary key default gen_random_uuid(),
  patient_id      uuid not null references public.patients(id) on delete cascade,
  storage_path    text not null unique,
  type            text not null default 'lab' check (type in ('lab', 'imaging', 'prescription', 'other')),
  title           text not null,
  report_date     date not null default current_date,
  source          text not null default 'patient' check (source in ('patient', 'staff')),
  review_status   text not null default 'pending' check (review_status in ('pending', 'reviewed')),
  reviewed_by     uuid references public.staff(id) on delete set null,
  reviewed_at     timestamptz,
  file_size_bytes bigint,
  mime_type       text not null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists documents_patient_id_idx on public.documents(patient_id);
create index if not exists documents_review_status_idx on public.documents(review_status);

alter table public.documents enable row level security;
revoke all on public.documents from public, anon;
grant select, insert, update on public.documents to authenticated;

-- 3. Storage Policies on storage.objects
create policy "files follow their document row" on storage.objects
for select to authenticated
using (
  bucket_id = 'patient-files'
  and exists (
    select 1 from public.documents d
    where d.storage_path = storage.objects.name
  )
);

create policy "upload only into permitted patient folders" on storage.objects
for insert to authenticated
with check (
  bucket_id = 'patient-files'
  and (storage.foldername(name))[1] in (
    select id::text from private.my_profile_patient_ids() as id
    union
    select id::text from private.my_care_patient_ids() as id
  )
);

-- Note: No update or delete policies on storage.objects: files are write-once.

-- 4. Row-Level Security Policies on public.documents

-- Restrictive MFA policy for staff
create policy "staff need two-factor on documents" on public.documents
as restrictive for all to authenticated
using ( (select private.my_staff_id()) is null or (select auth.jwt() ->> 'aal') = 'aal2' )
with check ( (select private.my_staff_id()) is null or (select auth.jwt() ->> 'aal') = 'aal2' );

-- Patients read own documents
create policy "patients read own documents" on public.documents
for select to authenticated
using ( patient_id in (select private.my_profile_patient_ids()) );

-- Care team doctors read patient documents
create policy "care team reads documents" on public.documents
for select to authenticated
using ( patient_id in (select private.my_care_patient_ids()) );

-- Patients insert own documents with pending review status
create policy "patients upload own documents as pending" on public.documents
for insert to authenticated
with check (
  patient_id in (select private.my_profile_patient_ids())
  and source = 'patient'
  and review_status = 'pending'
  and reviewed_by is null
  and reviewed_at is null
);

-- Care team doctors can upload documents for their patients
create policy "doctors upload documents for care patients" on public.documents
for insert to authenticated
with check (
  (select private.my_role()) = 'doctor'
  and patient_id in (select private.my_care_patient_ids())
);

-- Care team doctors can update review status and metadata
create policy "doctors mark documents reviewed" on public.documents
for update to authenticated
using (
  (select private.my_role()) = 'doctor'
  and patient_id in (select private.my_care_patient_ids())
)
with check (
  (select private.my_role()) = 'doctor'
  and patient_id in (select private.my_care_patient_ids())
);

-- Audit Trigger on documents
create trigger documents_audit after insert or update on public.documents
for each row execute function private.audit_row();
