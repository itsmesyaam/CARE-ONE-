# Hospital Care Platform: rules for AI agents

## What this is
A patient-engagement and doctor-assistant web app for one hospital in Kerala, India. It stores health records, which are sensitive personal data under India's DPDP Act, so one mistake can expose a patient's medical history. Correctness and security always outrank speed.

The full specification is @docs/ARCHITECTURE.md. Read it in full before planning any task. If a request conflicts with it, stop and ask. Do not change the architecture without my approval.

## Project in brief
- This build is a demo. It runs on a free Supabase project with fictional demo data only. Polish, speed and a smooth demo matter more than backups and operations.
- One hospital. Five roles: patient or guardian, doctor, front desk, hospital admin, and us (the platform team, with no routine access to patient data).
- V1 features: patient registration and app invites by the front desk; appointments; doctor chart (history, allergies, medicines, consultation notes, reports, timeline); care plans; reminders by web push and email; patient report uploads with a doctor review queue; "What changed since the last visit" built from plain SQL queries; hospital admin dashboard showing counts only; English and Malayalam.
- Not in V1: any AI feature, payments, SMS or WhatsApp, video consultations, doctor-patient messaging.
- Access: patients and guardians see their own records. Doctors see patients on their care team; booking an appointment adds the doctor for one year. Restricted records are visible only within the authoring department. Emergency access needs a written reason, lasts 4 hours, and is logged. The hospital admin never reads an individual patient's clinical record. Staff must use two-factor sign-in.
- Production runs on Supabase in the Mumbai region. Real patient data exists only in production.

## Stack (do not add, remove or swap anything without asking)
- Frontend: React + TypeScript (strict) + Vite, one single-page app that is also a PWA (vite-plugin-pwa). Tailwind CSS + shadcn/ui, TanStack Query, React Router, React Hook Form + Zod, react-i18next (English and Malayalam).
- Backend: Supabase only: Postgres with Row-Level Security, Auth, Storage, Edge Functions (Deno), Cron. Local development uses the Supabase CLI.
- Hosting: static files on Cloudflare Pages.
- Tests: Vitest for units, pgTAP through `supabase test db` for access rules, Playwright for smoke tests.
- Not allowed: Next.js or any server rendering, a custom Node or Express server, Firebase, AWS, any AI or LLM API, analytics or session-replay tools.

## Credentials and accounts
1. Do not ask me for credentials until a task truly needs them.
2. The only credentials you may ever use are the local values from `supabase status` and, when I give them, the STAGING project URL and its publishable (anon) key. Store them only in `.env.local`, which must stay gitignored.
3. Never accept or use a service-role or secret key, a database password, an access token, or anything for the production project. If I paste one by mistake, do not use it, and tell me to rotate it immediately.
4. You may push to origin after all checks pass and the secret check is clean. Never force push. Never change repository settings, add collaborators, or create GitHub secrets. I do those myself.

## Safety rules: never break these
1. Work only against the local Supabase stack started with `supabase start`. Never run `supabase link`, `supabase db push`, `supabase functions deploy` or `supabase secrets`. Never use `--linked`, `--db-url` or `--project-ref`. Never deploy anything; I deploy through GitHub Actions myself.
2. The service-role (secret) key must never appear in frontend code or in any `VITE_` variable.
3. Never use real patient data. Seed data uses obviously fake people ("Test Patient 01"), `example.com` emails, and the test phone numbers set in `supabase/config.toml`.
4. Every new table in the `public` schema enables Row-Level Security in the same migration that creates it, gets explicit policies, and gets pgTAP tests in the same change.
5. Never use `user_metadata` or `raw_user_meta_data` for permissions. Roles come from the `staff` and `patient_access` tables through helper functions in the `private` schema.
6. Every `security definer` function sets `search_path = ''`, lives in the `private` schema unless it is a deliberate RPC, and has execute revoked from `public` and `anon`. Every view uses `security_invoker = true`.
7. No hard deletes of clinical data; use `deleted_at`. Signed consultation notes never change; corrections are addenda.
8. Patient data never goes into URLs, `console.log`, error reports, push notification text, email subjects, localStorage, IndexedDB or the service-worker cache.
9. No `dangerouslySetInnerHTML`, no `eval`, and never disable TypeScript checks, lint rules or tests to make something pass.
10. Never edit or delete a migration that is already committed. Fix it with a new migration.
11. Ask before any destructive command: `rm -rf`, `git reset --hard`, dropping tables outside a migration, or resetting anything other than the local database.

## Don't guess
1. If you are not certain how a library, CLI command, config key or Supabase API works, check before using it: the installed type definitions in `node_modules`, the command's `--help`, or the official docs (supabase.com/docs, react.dev, vite.dev, tanstack.com, ui.shadcn.com, developers.cloudflare.com). Name the source you used.
2. Before adding any npm package, confirm with `npm view <name> name version repository` that it exists and is the well-known package, say why it is needed, and wait for my approval. Never install a package you cannot verify.
3. Never say something works unless you ran it. Paste the exact commands and their real output. "Done" means `npm run typecheck`, `npm run lint`, `npm test`, `supabase db reset` and `supabase test db` all pass.
4. Never invent requirements, tables, fields, roles, screens or business rules. If the spec is silent or unclear, ask a question and wait.
5. List your assumptions at the top of every plan.
6. If a command fails, show the error and your diagnosis. Never fake output, test results or file contents.
7. "I don't know" and "I need to check" are always acceptable answers.

## How we work
1. Plan first. For every task, write a plan: files to create or change, migrations, tests, commands, risks. Wait for my approval before writing code.
2. One small task at a time. Do not touch unrelated files. No unrequested refactors or dependency upgrades.
3. For any access rule, write the failing pgTAP test first, then the policy, then show the test passing.
4. Work on a feature branch with small, clear commits. You may push to origin after all checks pass and the secret check is clean. Never force push, never commit `.env` files, keys or real data.

## When I write "Approved: Task N"
1. Restate the task and its acceptance checks in three lines.
2. Write the tests first and show them failing.
3. Implement the smallest change that makes them pass.
4. Run `npm run typecheck`, `npm run lint`, `npm test`, `supabase db reset` and `supabase test db`, and paste the real output of each. (Before these scripts exist, run what exists and say what is missing.)
5. List every file you changed, and every SQL policy or function I must read myself.
6. Commit on the feature branch. Do not push. Stop and wait.

## Conventions
- TypeScript strict; no `any`. Database types come from `supabase gen types typescript --local`.
- All UI text goes through i18n keys in the English and Malayalam files; no hard-coded strings in components.
- Times are stored as `timestamptz` (UTC) and shown in Asia/Kolkata.
- Folder layout follows "Repository and pipelines" in the spec.

## Phase procedure
When I start a phase:
1. Read AGENTS.md, docs/ARCHITECTURE.md and docs/PROGRESS.md (create PROGRESS.md if it does not exist).
2. Reply with a plan broken into small tasks. For each task: files, migrations, tests, how you will verify it, and risks. Add your questions and assumptions. Then stop.
3. Build only after I write "Approved: Task N", following the task procedure above.

When I write "Finish phase":
1. Run every check (typecheck, lint, unit tests, supabase db reset, supabase test db, build) and paste the real output.
2. List every SQL table, policy, function and trigger added in this phase, each with one line saying who it allows and why.
3. Update docs/PROGRESS.md: what now works, demo accounts, decisions made, known gaps, next phase.
4. Commit and stop.

Packages: a phase prompt may approve specific packages. Still confirm each one with npm view before installing. Any package not approved in AGENTS.md or the phase prompt needs my approval.
