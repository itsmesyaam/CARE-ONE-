-- Migration: 20261008180000_diet_guidance.sql
-- Description: Diet Guidance table, immutability rules, care plan diet items, and demo seeds.

-- 1. Diet Guides Table
create table if not exists public.diet_guides (
  id              uuid primary key default gen_random_uuid(),
  title_en        text not null,
  title_ml        text not null,
  eat_more_en     text not null,
  eat_more_ml     text not null,
  eat_less_en     text not null,
  eat_less_ml     text not null,
  avoid_en        text not null,
  avoid_ml        text not null,
  tips_en         text not null,
  tips_ml         text not null,
  condition_tags  text[] not null default '{}',
  status          text not null default 'draft' check (status in ('draft', 'approved')),
  approved_by     uuid references public.staff(id) on delete set null,
  approved_at     timestamptz,
  version         integer not null default 1,
  parent_id       uuid references public.diet_guides(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists diet_guides_status_idx on public.diet_guides(status);
create index if not exists diet_guides_condition_tags_idx on public.diet_guides using gin(condition_tags);

alter table public.diet_guides enable row level security;
revoke all on public.diet_guides from public, anon;
grant select, insert, update on public.diet_guides to authenticated;

-- 2. RLS Policies on Diet Guides
-- Approved guides are readable by any authenticated user (patients, guardians, staff)
create policy "approved diet guides are readable by everyone" on public.diet_guides
for select to authenticated
using (status = 'approved');

-- Staff with AAL2 MFA can view all guides (including drafts)
create policy "staff with aal2 can read all diet guides" on public.diet_guides
for select to authenticated
using (
  private.get_staff_role() in ('doctor', 'admin')
  and private.is_staff_mfa()
);

-- Staff with AAL2 MFA can create guides
create policy "staff with aal2 can insert diet guides" on public.diet_guides
for insert to authenticated
with check (
  private.get_staff_role() in ('doctor', 'admin')
  and private.is_staff_mfa()
);

-- Staff with AAL2 MFA can update draft guides and approve them
create policy "staff with aal2 can update diet guides" on public.diet_guides
for update to authenticated
using (
  private.get_staff_role() in ('doctor', 'admin')
  and private.is_staff_mfa()
)
with check (
  private.get_staff_role() in ('doctor', 'admin')
  and private.is_staff_mfa()
);

-- 3. Immutability Trigger for Approved Guides
create or replace function private.freeze_approved_diet_guides()
returns trigger language plpgsql set search_path = '' as $$
begin
  if old.status = 'approved' then
    if (old.title_en is distinct from new.title_en or
        old.title_ml is distinct from new.title_ml or
        old.eat_more_en is distinct from new.eat_more_en or
        old.eat_more_ml is distinct from new.eat_more_ml or
        old.eat_less_en is distinct from new.eat_less_en or
        old.eat_less_ml is distinct from new.eat_less_ml or
        old.avoid_en is distinct from new.avoid_en or
        old.avoid_ml is distinct from new.avoid_ml or
        old.tips_en is distinct from new.tips_en or
        old.tips_ml is distinct from new.tips_ml or
        old.condition_tags is distinct from new.condition_tags or
        old.version is distinct from new.version) then
      raise exception 'Approved diet guides cannot be edited. Create a new version instead.';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists trg_freeze_approved_diet_guides on public.diet_guides;
create trigger trg_freeze_approved_diet_guides
before update on public.diet_guides
for each row execute function private.freeze_approved_diet_guides();

-- 4. Extend care_plan_items with 'diet' kind and columns
alter table public.care_plan_items
  drop constraint if exists care_plan_items_kind_check;

alter table public.care_plan_items
  add constraint care_plan_items_kind_check
  check (kind in ('medicine', 'test', 'follow_up', 'reading', 'instruction', 'diet'));

alter table public.care_plan_items
  add column if not exists diet_guide_id uuid references public.diet_guides(id) on delete set null,
  add column if not exists doctor_note text;

create index if not exists care_plan_items_diet_guide_id_idx on public.care_plan_items(diet_guide_id);

-- 5. Validation trigger for care_plan_items diet attachment
create or replace function private.validate_care_plan_item_diet_guide()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.kind = 'diet' then
    if new.diet_guide_id is null then
      raise exception 'Diet care plan item must link a diet guide';
    end if;
    if not exists (
      select 1 from public.diet_guides
      where id = new.diet_guide_id and status = 'approved'
    ) then
      raise exception 'Only approved diet guides can be attached to a care plan';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists trg_validate_care_plan_item_diet_guide on public.care_plan_items;
create trigger trg_validate_care_plan_item_diet_guide
before insert or update on public.care_plan_items
for each row execute function private.validate_care_plan_item_diet_guide();

-- 6. Seed three approved demo diet guides
insert into public.diet_guides (
  id,
  title_en,
  title_ml,
  eat_more_en,
  eat_more_ml,
  eat_less_en,
  eat_less_ml,
  avoid_en,
  avoid_ml,
  tips_en,
  tips_ml,
  condition_tags,
  status,
  version
) values
(
  'e1111111-1111-1111-1111-111111111111',
  'Diabetes Diet Guidance',
  'പ്രമേഹ നിയന്ത്രണ ഭക്ഷണ ക്രമം',
  'Bitter gourd, drumstick leaves, green leafy vegetables, whole pulses like green gram, steel-cut oats.',
  'പാവയ്ക്ക, മുരിങ്ങയില, പച്ചക്കറികൾ, ചെറുപയർ തുടങ്ങിയ പയറുവർഗ്ഗങ്ങൾ, ഓട്സ്.',
  'Polished white rice (limit to one small cup per meal), tapioca, potato, ripe jackfruit and mango.',
  'വെള്ളയരി ചോറ് (ഒരു നേരം ചെറിയ ഒരു കപ്പ് മാത്രം), കപ്പ, ഉരുളക്കിഴങ്ങ്, ചക്ക, മാങ്ങ.',
  'Sugar, jaggery, carbonated soft drinks, bakery sweets, halwa, payasam, packaged fruit juices.',
  'പഞ്ചസാര, ശർക്കര, ശീതളപാനീയങ്ങൾ, ബേക്കറി മധുരപലഹാരങ്ങൾ, ഹൽവ, പായസം, പാക്കറ്റ് ജ്യൂസുകൾ.',
  'Eat meals at consistent times every day. Drink 2 to 3 liters of water. Have a light dinner before 8:00 PM.',
  'എല്ലാ ദിവസവും കൃത്യസമയത്ത് ആഹാരം കഴിക്കുക. ദിവസം 2-3 ലിറ്റർ വെള്ളം കുടിക്കുക. രാത്രി ഭക്ഷണം 8 മണിക്ക് മുൻപ് കഴിക്കുക.',
  array['diabetes', 'type2_diabetes', 'prediabetes'],
  'approved',
  1
),
(
  'e2222222-2222-2222-2222-222222222222',
  'Low-Salt Blood Pressure Diet',
  'രക്തസമ്മർദ്ദം കുറയ്ക്കുന്നതിനുള്ള കുറഞ്ഞ ഉപ്പ് ഭക്ഷണ ക്രമം',
  'Fresh seasonal vegetables, garlic, ginger, coriander leaves, raw cucumber, unsalted salads, fresh fruits like guava and papaya.',
  'പുതിയ പച്ചക്കറികൾ, വെളുത്തുള്ളി, ഇഞ്ചി, മല്ലിയില, സാലഡ് കക്കിരി, പേരയ്ക്ക, പപ്പായ തുടങ്ങിയ പഴങ്ങൾ.',
  'Salt added during cooking (use less than 1 level teaspoon of salt for the entire day), coconut milk gravies, papad.',
  'പാചകത്തിൽ ചേർക്കുന്ന ഉപ്പ് (ദിവസത്തിൽ ആകെ 1 ചെറിയ സ്പൂണിൽ താഴെ മാത്രം), തേങ്ങാപ്പാൽ കറികൾ, പപ്പടം.',
  'Pickles (achar), salted dry fish (karuvadu), potato chips, instant noodles, salted nuts, soy sauce.',
  'അച്ചാറുകൾ, ഉണക്കമീൻ, വറുത്ത ചിപ്സുകൾ, ഇൻസ്റ്റന്റ് നൂഡിൽസ്, ഉപ്പിട്ട പരിപ്പുകൾ, സോയാ സോസ്.',
  'Season food with lemon juice, pepper and cumin instead of adding extra salt. Never add extra salt at the table.',
  'രുചിക്കായി ഉപ്പിന് പകരം നാരങ്ങാനീര്, കുരുമുളകുപൊടി, ജീരകം എന്നിവ ഉപയോഗിക്കുക. ഭക്ഷണം കഴിക്കുമ്പോൾ മേശപ്പുറത്ത് ഉപ്പ് വിതറരുത്.',
  array['hypertension', 'blood_pressure', 'cardiac'],
  'approved',
  1
),
(
  'e3333333-3333-3333-3333-333333333333',
  'Heart-Healthy Dietary Guide',
  'ഹൃദയാരോഗ്യ സംരക്ഷണ ഭക്ഷണ ക്രമം',
  'Boiled or steamed pulses, small fish rich in omega-3 (sardine, mackerel) steamed with minimal oil, flaxseeds, unsalted almonds.',
  'പുഴുങ്ങിയ പയറുവർഗ്ഗങ്ങൾ, ഒമേഗ-3 അടങ്ങിയ ചെറിയ മീനുകൾ (മത്തി, അയില) കുറഞ്ഞ എണ്ണയിൽ തയ്യാറാക്കിയത്, ഫ്ലാക്സ് സീഡ്സ്, ബദാം.',
  'Red meat (beef, mutton, pork), egg yolks (limit to 2 per week), coconut oil (maximum 2 teaspoons a day).',
  'റെഡ് മീറ്റ് (പോത്തിറച്ചി, ആട്ടിറച്ചി), മുട്ടയുടെ മഞ്ഞക്കരു (ആഴ്ചയിൽ 2 എണ്ണം മാത്രം), വെളിച്ചെണ്ണ (ദിവസം പരമാവധി 2 സ്പൂൺ).',
  'Deep-fried snacks (banana chips, samosa, mixture), vanaspati/dalda, ghee roasts, processed sausages.',
  'എണ്ണയിൽ വറുത്ത പലഹാരങ്ങൾ (നേന്ത്രക്കായ ചിപ്സ്, സമോസ, മിക്സ്ചർ), വനസ്പതി, ഡാൽഡ, നെയ്യ് റോസ്റ്റ്.',
  'Choose boiling, steaming, or light grilling over deep frying. Take a 30-minute brisk walk daily if approved by your doctor.',
  'വറുക്കുന്നതിന് പകരം ആവിയിൽ വേവിക്കുന്നതോ കറിവെക്കുന്നതോ തിരഞ്ഞെടുക്കുക. ഡോക്ടറുടെ നിർദ്ദേശപ്രകാരം ദിവസവും 30 മിനിറ്റ് നടക്കുക.',
  array['cardiac', 'cholesterol', 'dyslipidemia', 'heart_healthy'],
  'approved',
  1
)
on conflict (id) do nothing;
