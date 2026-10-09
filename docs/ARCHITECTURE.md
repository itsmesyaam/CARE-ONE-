# Hospital Care Platform — System Architecture (V1)

Oct 6, 2026 · @psbaburam@gmail.com

> [!IMPORTANT]
> **ARCHITECTURE UPDATE (October 9, 2026):**
> Migrated to a native Cloudflare architecture (Cloudflare Workers + Hono, Cloudflare D1 + Drizzle ORM, R2, Cron Triggers).
> All previous stack sections in this specification are **SUPERSEDED by [ADR 012: Move to Cloudflare](adr/012-move-to-cloudflare.md)** and the updated stack rules in [AGENTS.md](../AGENTS.md).

## Summary

Build V1 as one React web app and Cloudflare Worker API, with every access rule enforced by the Worker access layer and D1 database. Cloudflare supplies the database, logins, file storage and scheduled jobs, and serves the app files.

Four decisions shape everything else:

- One isolated database per hospital: ABC Hospital gets its own D1 database in the Mumbai region, so no bug can ever mix two hospitals' data.
- The access layer and database are the security guard: strict checks on every read and write, so a broken screen still cannot show one patient's records to another.
- "What changed since the last visit" is built from plain database queries in V1. AI arrives in V2 only to narrate those facts, never to replace them.
- The patient app is an installable web app (PWA). A Play Store version can come later from the same code.

Three rules are non-negotiable:

1. Real patient data lives only in production. Local development and staging hold fake data only.
2. Nothing reaches production until automated tests prove each role sees only what it should.
3. Backups are encrypted, copied off-site, and test-restored every month.

Running cost for one hospital is about ₹1,000–₹2,000 a month plus a domain; every other service runs on a free tier (see Costs).

## Requirements and constraints

V1 serves five roles inside one hospital, and each sees a different slice of the same records. The business plan names three sides; V1 adds a front-desk role because someone must register patients and verify who they are.

| Role | Can do in V1 | Cannot do |
| --- | --- | --- |
| Patient or guardian | See own profile, reports, prescriptions, appointments, care plan and reminders; upload reports; log readings such as BP; report symptoms | See anyone else's data; change anything a doctor wrote |
| Doctor | Search the patient list; open charts of patients they care for; write and sign notes; prescribe; build care plans and follow-ups; review uploads; see what changed | Open a chart with no care relationship, except through logged emergency access; edit a signed note |
| Front desk | Register patients, check identity, link app accounts, book appointments | Read notes, reports or medicines |
| Hospital admin | Manage departments, staff and branding; see hospital-wide counts; review the access log | Read any single patient's clinical record |
| Platform team (us) | Ship code, run database changes, watch errors | Touch patient data in normal work; production access only in a logged emergency |

| Quality | V1 target |
| --- | --- |
| Security | Every route guarded by default-deny access layer; staff sign in with two-factor codes; every chart opening logged |
| Data loss in a disaster | At most 6 hours of data at risk |
| Recovery time | Back online within 4 hours |
| Speed | A patient chart opens in under 2 seconds on 4G |
| Scale | 50,000 patients and 100 staff on the smallest database size |
| Language | English and Malayalam from day one |
| Devices | Patients on Android phones as an installed web app; staff on desktop browsers |
| Cost | $0 to build; minimal cost to run |

Constraints: Cloudflare, GitHub and free tiers only; no AWS console or servers to manage; a small team; Indian health-data law. One assumption drives scope: doctors do not already write notes in another hospital system. If they do, V1 reads from that system instead of replacing it (see Open questions).

## Architecture overview

The whole system is one Cloudflare Worker serving static assets and the `/api` REST backend, with Cloudflare D1 database and R2 private storage; there is no external server to run.

&#91;embedded content: System architecture · 3 kinds of users, Cloudflare Worker parts, 4 outside services\]

App files come from Cloudflare, and every data request goes to the Worker access layer, where role declarations and SQL scoping decide what comes back. Sentry and StatusCake watch from outside and never receive patient data.

## Technology stack and hosting

Everything except production domain and mail allowances runs on free tiers that allow business use. Every piece is mainstream, well documented, and replaceable without rewriting the app.

*(Consolidated under ADR 012 in favor of Cloudflare Workers + Hono, D1 + Drizzle ORM, R2, and Cron Triggers).*

| Layer | Choice | Free-tier fit | Why this one |
| --- | --- | --- | --- |
| App for all roles | React + TypeScript + Vite, one installable web app (PWA) | Open source | Behind a login there is nothing for server rendering to add; one codebase serves phones and desktops |
| Screens | Tailwind CSS + shadcn/ui | Open source | Accessible components; large text for older patients |
| Data and forms | TanStack Query; React Hook Form + Zod | Open source | Caching and retries; one set of validation rules per form |
| Languages | react-i18next | Open source | English and Malayalam strings from day one |
| Hosting & API | Cloudflare Worker + Hono | Generous free tier | Static assets and /api on the same origin; connect-src 'self' |
| Database | Cloudflare D1 + Drizzle ORM | 5M read rows/day free | Serverless SQLite at the edge with SQL migrations in /migrations |
| Login and reminder email | [Resend](https://resend.com/pricing) direct API | 3,000 a month, 100 a day | Transactional OTP codes and notifications |
| Push reminders | Web Push sent from Worker Cron Trigger | Free | No SMS cost; works on Android and on iPhones once the app is added to the home screen |
| Bot protection | Cloudflare Turnstile on login and code-request screens | Free | Stops code flooding and scripted login attempts |
| Error tracking | Sentry, with personal-data scrubbing on | Free developer plan | See crashes without seeing patient data |
| Uptime alerts | StatusCake | [Free tier allows business use](https://notifier.so/guides/statuscake-vs-uptimerobot/) | Alerts when the app or database stops answering |
| Files & Storage | [Cloudflare R2](https://developers.cloudflare.com/r2/pricing/) | 10 GB-month free; no download fees | Private bucket read/written only via Worker routes |
| Code and pipelines | GitHub private repository + GitHub Actions | Free plan minutes cover this pipeline | Tests, database changes, scheduled backups |
| Local development | Wrangler CLI | Free | `wrangler dev` with local D1 and R2 |
|  |  |  |  |
|  |  |  |  |

Two paid items are worth it later: GitHub Pro or Team to lock the main branch (free private repositories cannot), and Resend's paid tier once email passes 100 a day.

## Architecture decision records

*(Note: ADRs 01, 02, 03, 04, 05, 06, 10, and 11 below are superseded by [ADR 012: Move to Cloudflare](adr/012-move-to-cloudflare.md)).*

Twelve decisions carry the design, and each picks the simpler option unless patient safety demands more. Each row is a short ADR: what we chose, what we turned down, and the cost we accept.

| ADR | Decision | Rejected alternative | Trade-off we accept |
| --- | --- | --- | --- |
| 01 App shape *(Superseded by ADR 012)* | One React web app and Worker API; no separate servers | Next.js on Vercel; a Node API server | Single edge runtime for frontend assets and API |
| 02 Hosting *(Superseded by ADR 012)* | Static files on Cloudflare | Vercel Hobby, which bars commercial use | Cloudflare becomes our unified runtime |
| 03 Tenancy *(Superseded by ADR 012)* | One D1 database per hospital | One shared database with a hospital column on every row | Each extra hospital adds a database and its own migration run |
| 04 Authorization *(Superseded by ADR 012)* | Access layer with care-team links; admins see counts only; logged emergency access | Permission checks inside client screens | Every route needs access-matrix tests |
| 05 Patient sign-in *(Superseded by ADR 012)* | One-time codes; no self sign-up; front desk links the account after an ID check | Open sign-up where patients claim their own records | Each patient needs one desk step to get started |
| 06 Staff sign-in *(Superseded by ADR 012)* | Password plus an authenticator-app code, enforced on the server | Password only; SMS codes | Each staff member installs an authenticator app once |
| 07 Record integrity | Signed notes are frozen; corrections become addenda; nothing is hard-deleted | Freely editable records | More tables, but it matches medico-legal practice |
| 08 What changed | A SQL query in V1; AI narration only in V2 | AI summary from day one | Less wow at launch; every line traces to a real record |
| 09 Data model | Plain tables shaped like FHIR resources | A full FHIR server; or ad-hoc tables | Some mapping work when ABDM or hospital systems connect |
| 10 Reminders *(Superseded by ADR 012)* | Web Push plus email; SMS and WhatsApp later | SMS from day one | iPhone users must add the app to their home screen to get push |
| 11 Backups *(Superseded by ADR 012)* | D1 snapshots and nightly file copy to R2 | Cloud-only backups | One more scheduled job to watch |
| 12 Platform migration | Complete move to Cloudflare Workers, Hono, D1, Drizzle ORM, R2, Cron Triggers | Staying with cross-origin external hosting | Solves cross-origin networking issues, eliminates pausing, single unified edge runtime |

## Data model

Twenty-two tables cover V1, and every clinical row carries `patient_id`, the one key every access rule checks. Table names follow FHIR resources so later links to ABDM or a hospital system are a mapping job, not a redesign.

| Area | Table | Holds | FHIR shape |
| --- | --- | --- | --- |
| Hospital | `hospital_settings` | Name, logo, colours, time zone, emergency number (one row) | Organization |
| Hospital | `departments` | Cardiology, Pediatrics and the rest | Organization |
| Hospital | `staff` | Login link, role, department, council registration number, active flag | PractitionerRole |
| Patients | `patients` | Hospital number (MRN), name, date of birth, sex, phone, email | Patient |
| Patients | `patient_access` | Which login may open which patient: self, guardian or caregiver | RelatedPerson |
| Patients | `care_team` | Which staff may open which chart, why, and until when | CareTeam |
| Patients | `consents` | Notice version, language, given and withdrawn times | Consent |
| Clinical | `encounters` | Consultation notes, status (draft or signed), signed time | Encounter |
| Clinical | `encounter_addenda` | Corrections to signed notes, with author and reason | Composition |
| Clinical | `conditions` | Diagnoses and history, active or resolved | Condition |
| Clinical | `allergies` | Substance, reaction, severity | AllergyIntolerance |
| Clinical | `medications` | Drug, dose, timing, start, stop, prescriber | MedicationRequest |
| Clinical | `observations` | BP, sugar, HbA1c, weight; value, unit, time, source | Observation |
| Clinical | `documents` | Uploaded reports and prescriptions; file path, source, review status | DocumentReference |
| Clinical | `symptom_reports` | What the patient reported, when, who reviewed it | Observation |
| Care | `care_plans` | Plan per consultation, status, review date | CarePlan |
| Care | `care_plan_items` | Medicine, test, follow-up, reading or instruction, with due dates | CarePlan activity |
| Care | `appointments` | Patient, doctor, department, time, status | Appointment |
| Care | `reminders` | What to remind, when, channel, delivery status, attempts | CommunicationRequest |
| Care | `push_subscriptions` | Each device's push address for a login | none |
| Governance | `audit_log` | Who did what to which record, when, and why | AuditEvent |
| Governance | `data_requests` | Patient requests to see, correct or erase data, with due dates | Task |

Conventions that apply to every table:

- Primary keys are UUIDs; times are stored in UTC and shown in IST.
- `patient_id` is indexed everywhere it appears, because every policy filters on it.
- Nothing is hard-deleted. Rows get `deleted_at`, and the app role is never granted DELETE.
- Notes, documents and diagnoses carry `sensitivity`: normal or restricted (for example psychiatry or HIV care).
- Patient-entered rows carry `source = 'patient'` and display as "patient-reported, not yet reviewed".
- Never store Aadhaar numbers. The desk records that an ID was checked, not the ID number.

Once a note is signed, a database trigger rejects every edit. Doctors correct it with an addendum, so the original and the correction both survive. Uploaded files are write-once for the same reason.

## Security design

The database and access layer decide who sees which patient, and nothing in the app can override it. Five layers sit around that rule: identity, data protection, app hardening, audit, and strict access controls.

### Who can see what

| Data | Patient or guardian | Doctor on the care team | Any other doctor | Front desk | Hospital admin |
| --- | --- | --- | --- | --- | --- |
| Name, phone, hospital number | Own | Yes | Search only | Yes | No |
| Notes, medicines, diagnoses | Own | Yes; restricted items only within own department | Emergency access only | No | No |
| Reports and files | Own | Yes | Emergency access only | No | No |
| Appointments | Own | Own patients | No | All | Counts only |
| Access log | V2: who opened my record | No | No | No | Who, what and when |

Booking an appointment adds the doctor to that patient's care team for one year after the visit. Emergency access asks the doctor for a written reason, lasts 4 hours, and alerts the admin. Caregivers see normal items only; restricted items need the patient's own consent.

### Identity and sessions

- Public sign-up is switched off. The front desk creates each patient login after checking an ID, so nobody can claim someone else's records.
- Patients sign in with a one-time code by email, or by SMS once the hospital's registered SMS sender is connected.
- Staff use a password plus an authenticator-app code. The access layer blocks staff reads until that second step is done.
- Server-enforced 10-minute idle session timeouts and strong password verification.
- Sessions expire after 15 minutes of inactivity on staff screens, which matters on shared ward computers.
- Cloudflare Turnstile guards every code request, which stops attackers burning SMS credit or flooding inboxes.

### Data protection

- Database, logins and files stay in Mumbai region.
- Files live in one private R2 bucket under `patient_id/document_id`. Only PDF, JPEG and PNG up to 10 MB are accepted, and download links expire after 60 seconds.
- Photos are re-encoded in the browser before upload, which strips hidden location data.
- No patient detail ever appears in a URL, a notification, an email subject, a log line or an error report. A push says "You have a new reminder from ABC Hospital", nothing more.
- The installed app caches screens, never patient data. Signing out clears everything held in memory.

### App hardening

- Cloudflare sends strict security headers: a Content Security Policy that only allows our own origin (`connect-src 'self'`), plus HSTS, no framing, and no referrer leaks.
- Forms validate with Zod, and the database repeats every rule with constraints, so bad data cannot slip in through the API.
- Dependabot, `npm audit` and gitleaks run on every pull request.
- An OWASP ZAP scan runs against staging before go-live and before each major release.

### Audit trail

- Database triggers record every insert and update on clinical tables in `audit_log`, with the old and new values.
- Opening a chart, using emergency access, downloading a file and exporting data each write their own entry.
- Sign-ins and sensitive events are recorded in `audit_log`.
- Nobody can edit or delete the log through the API. It is exported nightly with the backups and kept for at least a year (see Compliance).
- A scheduled check emails the admin about emergency access, repeated failed logins, or one account opening an unusual number of charts in an hour.

### Security traps that cause real breaches *(Superseded by ADR 012)*

*(In the Cloudflare architecture under ADR 012 and Safety Rule 4, all routes are protected by a single Worker access layer with default deny, explicit role checks, D1 SQLite triggers for immutable logs, and mandatory access-matrix tests).*

1. Any route lacking explicit role declarations defaults to deny. CI fails if any route lacks access tests.
2. Patient scoping is always enforced in the SQL WHERE clause; never fetch all and filter in memory.
3. Client-provided roles or permissions in headers/tokens are never trusted. Roles come strictly from server-side database records.
4. Secrets never go into frontend code or VITE_ bundles.
5. Database triggers freeze signed clinical records and ensure audit logs are strictly append-only.

## Key workflows

Four flows carry V1: onboarding, the consultation, report uploads and reminders. Together they form the care loop the business plan describes, with the database checking permissions at every step.

&#91;embedded content: The care loop · 6 steps, 3 of them between visits\]

Steps 3 to 5 happen while the patient is at home, so the doctor starts the next visit already knowing what happened.

### Patient onboarding

1. The front desk finds the patient by phone or hospital number, or registers them.
2. The desk checks an ID card and records only that it was checked.
3. The desk presses "Invite to app". An Edge Function confirms the caller is front-desk staff, creates the login and links it to the patient as self or guardian.
4. The patient opens the hospital's link, enters the phone or email on file, and types the code.
5. The first screen shows the privacy notice in Malayalam or English. Consent is stored with its version before any record appears.

One login can hold several profiles, because Indian families often share one phone. A mother can see her own record and her child's, each linked by the desk.

### Consultation and care plan

1. Booking the appointment adds the doctor to the care team.
2. Opening the chart logs the view and loads "What changed" first: new reports, medicine changes, out-of-range readings, missed plan items and reported symptoms since the last signed note.
3. The doctor writes the note as a draft, prescribes, then signs. Signing freezes the note.
4. The doctor builds the care plan: medicines with times, tests with due dates, and the follow-up date.
5. A trigger turns plan items into reminders, and the patient sees the plan on their next app open.

### Report upload

1. The patient or staff picks a PDF or photo. The browser shrinks photos and strips location data.
2. The file goes to the patient's own folder in the private bucket; any other folder is refused.
3. The report appears as "patient-reported, not yet reviewed" in the doctor's review queue.
4. The doctor opens it, types key values such as HbA1c if useful, and marks it reviewed.
5. Only then does the patient see "Reviewed by Dr. Rahul" and the trend for that test.

The symptom form states that it is not watched around the clock, and shows the casualty number and 112 on the same screen.

### Reminders *(Superseded by ADR 012)*

*(Superseded by ADR 012: Reminders are triggered by Cloudflare Cron Triggers every 5 minutes claiming due reminders with atomic D1 UPDATE ... RETURNING, sending Web Push and falling back to Resend email).*

1. Every 5 minutes, Cloudflare Cron Trigger calls the reminder runner.
2. The job claims due reminders atomically (`UPDATE ... RETURNING`), so concurrent runs never duplicate dispatches.
3. It sends Web Push with generic text only, then falls back to Resend email if no push succeeds.
4. Each result is written back: sent, retry later, or abandoned after 3 failed attempts.
5. A scheduled job creates the next day's medicine reminders from active care plans.

## Reliability

The app stays up through three habits: identical environments, small tested releases, and backups restored on a schedule. Static files and APIs on Cloudflare almost never fail, so the work goes into the database and the release process.

### Environments *(Superseded by ADR 012)*

*(Superseded by ADR 012: Local development uses wrangler dev with local D1 and R2; Staging and Production deploy through Cloudflare Workers Builds).*

| Environment | Backend & Database | App hosting | Data |
| --- | --- | --- | --- |
| Local | wrangler dev + local D1 & R2 | Vite dev server / Worker static assets | Fake seed data |
| Staging | Cloudflare Worker + D1 staging preview | Cloudflare Worker preview deployment | Fake data only |
| Production | Cloudflare Worker + D1 production | Cloudflare Worker on hospital domain | Real patients |

### Release process

1. Every change starts as a pull request. CI runs type checks, unit tests, access-matrix tests, the build and a secret scan.
2. Merging to `main` deploys the app and database migrations to staging.
3. A smoke test signs in as each role, opens a chart and uploads a file.
4. A manually triggered Release workflow applies migrations to production, then publishes the app.
5. Migrations add in one release and remove in a later one, so the live app never meets a missing column.

Nobody changes the production schema from the dashboard; a weekly job compares production with the migrations folder. A bad app release rolls back in one click on Cloudflare, and database problems are fixed forward with a new migration.

### Backups and restore

| Copy | How often | Kept | Where |
| --- | --- | --- | --- |
| Database snapshots | Daily | 30 days | Cloudflare R2 |
| Encrypted database dump (schema, data) | Every 6 hours | 30 days | Cloudflare R2 |
| Encrypted copy of uploaded files | Nightly | 30 days of versions | Cloudflare R2 |
| Audit log export | Nightly | At least 1 year | Cloudflare R2 |

GitHub Actions runs the dumps, encrypts them with `age` before they touch disk, and uploads to R2. The decryption key is held offline by two named people, never in GitHub. Every month a dump is restored into a scratch database and checked; every quarter a full restore into a new database is timed against the 4-hour target.

### Monitoring

- StatusCake checks the app and a `/api/health` endpoint every 5 minutes; the route runs one tiny database query.
- Sentry records app and API errors, with personal-data scrubbing on and session replay off.
- GitHub emails the team when a backup or release job fails.
- Each week someone reviews logs, failed reminders and disk use.

### When something breaks

If the service is down, the app shows a plain banner telling patients to contact the desk, and the hospital's existing paper process carries on. If data is damaged, the latest backup is restored to a new database and the app is pointed at it: at most 6 hours of data at risk, back within 4 hours.

## Compliance in India

Build to the DPDP Rules now, because their core duties start on 13 May 2027 and V1 will still be running then. Until that date the IT Act's Section 43A and the 2011 sensitive-data rules stay in force ([Khaitan & Co summary](https://www.khaitanco.com/sites/default/files/2025-11/ERGO%20-%20Digital%20Personal%20%20Data%20Protection%20Rules%20-%2015%20November%202025.pdf)), and CERT-In's 2022 directions apply throughout.

The hospital is the Data Fiduciary and our company is its Data Processor. The two sign a data processing agreement that lists the safeguards in this document, the breach-notice duty, and how data returns to the hospital if the contract ends. Cloudflare, Resend and Sentry go in it as sub-processors.

| Duty | Source | How the design meets it |
| --- | --- | --- |
| Plain notice of what data, for what purpose, for which service; withdrawal as easy as consent | DPDP Rules, from 13 May 2027 | Notice in Malayalam and English before first use; "Withdraw consent" in settings; each version stored in `consents` |
| Access, correction, erasure and nominee rights; grievances closed within 90 days | DPDP Act and Rules | `data_requests` with due dates; patients download their own record; erasure stops where medical-records law requires keeping data |
| Encryption or masking, access control, logging and monitoring, continuity | DPDP Rule 6 | Row-Level Security, two-factor staff login, `audit_log`, encrypted backups |
| Keep logs, and the personal data needed to investigate, for at least 1 year | DPDP Rules 6 and 8(3) | `audit_log` kept in the Mumbai database and exported nightly |
| Tell affected people without delay; tell the Data Protection Board without delay, with a detailed report within 72 hours | DPDP Rule 7 | One-page incident runbook with named owners and message templates |
| Report cyber incidents to CERT-In within 6 hours; keep system logs for 180 days in India | [CERT-In directions, 2022](https://www.linklaters.com/en/insights/blogs/digilinks/2022/may/india-new-and-onerous-cyber-security-framework-and-breach-reporting-obligations) | Same runbook; access and sign-in logs live in the Mumbai database |
| Verifiable parental consent for anyone under 18 | DPDP Rules | A child's record is opened through a parent or guardian login verified in person at the desk |
| Processor contracts must carry security safeguards | DPDP Rule 6 | The data processing agreement above |

Two more rules shape the product. If doctors start advising patients through the app, the Telemedicine Practice Guidelines apply, so V1 keeps messaging out. Later, ABDM integration (ABHA linking and consent-based record sharing) becomes an adapter on the FHIR-shaped tables rather than a rewrite.

This is an engineering reading of the rules, not legal advice. Have the hospital's counsel confirm the notice text, the retention schedule and the runbook before go-live.

## AI in V2

AI joins in V2 as a narrator and helper, never as the doctor, and every AI sentence links to the records it came from. It starts only after V1's plain-query version of each feature has run reliably in the pilot.

| Feature | Used by | Guardrail |
| --- | --- | --- |
| Narrated "What changed" and visit summary | Doctor | Built from V1's query results; each line links to its record; labelled as an AI draft |
| Plain-language report explanation | Patient | Only after a doctor marks the report reviewed; explains terms, never diagnoses; ends by pointing back to the doctor |
| Values pulled from uploaded reports | Staff | Suggested values save only after a person confirms them |
| Voice to note | Doctor | Produces a draft; the doctor edits and signs |
| Plain-language search | Doctor | Runs with the doctor's own permissions; returns records, not answers |

Rules every AI call follows:

- Use a paid API whose contract forbids training on our data and limits retention. Free consumer tiers are off-limits for patient data.
- Prefer processing inside India; otherwise name the transfer in the privacy notice and the processing agreement.
- Send the minimum: no name, phone or hospital number, and only the records the task needs.
- Calls go through an Edge Function that loads data with the user's own login, so the model never sees what that user could not open.
- Every call writes to `audit_log`: who asked, which records went out, which model answered.
- No diagnosis, triage or dosing suggestions. That keeps the product clear of software-as-medical-device rules.
- Before launch, pilot doctors grade outputs on a set of de-identified real cases.

## Repository and pipelines

One repository holds the app, the database and the pipelines, so a change to a screen and the rule that guards it ship together. Production changes only through one manual workflow that re-runs every test first.

```text
care-one/
├── src/
│   ├── app/                router, providers, layouts per role
│   ├── features/
│   │   ├── auth/           sign-in, two-factor enrollment, idle lock
│   │   ├── patient/        home, records, care plan, reminders, uploads
│   │   ├── doctor/         patient list, chart, what changed, notes, review queue
│   │   ├── desk/           registration, invites, appointments
│   │   └── admin/          dashboard, staff, departments, branding, access log
│   ├── components/ui/      shadcn components
│   ├── lib/                api client, query client, Zod schemas, i18n
│   └── locales/            en.json, ml.json
├── worker/
│   ├── index.ts            Hono app entry point, static asset & /api routing
│   ├── src/routes/         patient, doctor, desk, admin, auth, documents
│   └── src/middleware/     access layer, session handling, origin check
├── migrations/             D1 SQL migrations
├── scripts/                reset-demo-d1.js, seed-demo-d1.sql
├── public/
│   ├── _headers            security headers for Cloudflare
│   └── manifest.webmanifest
├── wrangler.jsonc          Worker bindings (D1, R2, Cron, assets)
├── .github/workflows/      ci, deploy
└── docs/adr/               one file per decision above
```

| Workflow | Runs on | What it does |
| --- | --- | --- |
| `ci` | Every pull request | Type check, lint, unit tests, access-matrix tests; build; gitleaks; `npm audit` |
| `deploy-staging` | Merge to `main` | Applies migrations to staging D1, deploys Worker |
| `release` | Manual, after staging passes | Re-runs tests, applies migrations to production D1, deploys Worker |
| `backup` | Every 6 hours; files nightly | Database snapshot and file copy to R2 |
| `restore-check` | Monthly | Restores the latest dump and compares row counts |

Secrets live in Cloudflare Dashboard variables and secrets (and `.dev.vars` locally). The app build and client bundles never contain secret keys.

## Build roadmap

V1 takes about 12 weeks with two developers; a 3-month pilot in one department then decides whether V2 starts. Each phase ships something a doctor can try on staging, so problems surface early.

&#91;embedded content: V1 roadmap · 6 two-week phases, 2 gates\]

The go-live gate is the safety line: no real patient enters the system until all four checks pass.

| Pilot metric | How it is measured | Proposed target |
| --- | --- | --- |
| Follow-ups kept | Follow-up visits attended, divided by follow-ups due | Above the hospital's current rate, measured in month one |
| Reports in before the visit | Follow-ups where a new report arrived beforehand | At least half |
| Patient activation | Invited patients who sign in within 7 days | At least 60% |
| Doctor time per chart | Timed sample of chart reviews, before and after | Lower than before |
| Access incidents | Failed access tests or reported leaks | Zero |

## Costs

Building costs nothing; running one hospital in production costs roughly ₹1,000–₹2,000 a month plus domain fees.

| Item | Development and staging | Production, one hospital |
| --- | --- | --- |
| Cloudflare Workers, D1, Assets | Free | Free / Workers Paid if CPU exceeds free tier |
| Cloudflare Turnstile, R2 | Free | Free; storage above 10 GB is $0.015 per GB a month |
| Email (Resend) | Free | Free up to 100 a day; [$20 a month](https://resend.com/pricing) beyond that |
| GitHub, Sentry, StatusCake | Free | Free; a paid GitHub plan is optional, for locking the main branch |
| Domain | None | Roughly ₹1,000 a year, or a subdomain of the hospital's site |
| SMS codes (optional) | None | Per message, through the hospital's registered SMS provider |

Costs that appear only with growth: file storage past 100 GB, and high email volume.

## Open questions for the hospital

The first question changes the most: if doctors already write notes in another system, V1 reads from it rather than duplicating it.

- [ ] Does the hospital run an HIS or EMR today, and where do doctors write notes?
- [ ] Phone codes or email codes for patients? Phone codes need the hospital's DLT-registered SMS sender.
- [ ] Pilot scope: which department, how many doctors, how many patients?
- [ ] Who are the hospital's grievance officer and data protection contact?
- [ ] Which departments' records count as restricted?
- [ ] What retention schedule does the hospital's legal advisor set for records and logs?
- [ ] May encrypted backups and error reports sit outside India, or must everything stay in India?
- [ ] Which web address will patients see?
- [ ] Who at the hospital holds the second copy of the backup decryption key?

## Appendix: security patterns

These seven patterns are the core of the first migration; every clinical table repeats patterns 2 to 4. Column names follow the data model above.

### 1. Helper functions in a private schema

The API never exposes the `private` schema, so these run only inside policies.

```sql
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create or replace function private.my_staff_id()
returns uuid language sql stable security definer set search_path = '' as $$
  select s.id from public.staff s
  where s.user_id = (select auth.uid()) and s.is_active
$$;

create or replace function private.my_role()
returns text language sql stable security definer set search_path = '' as $$
  select s.role from public.staff s
  where s.user_id = (select auth.uid()) and s.is_active
$$;

create or replace function private.my_department_id()
returns uuid language sql stable security definer set search_path = '' as $$
  select s.department_id from public.staff s
  where s.user_id = (select auth.uid()) and s.is_active
$$;

-- Patients this login opens as self or guardian (caregivers get a narrower policy)
create or replace function private.my_profile_patient_ids()
returns setof uuid language sql stable security definer set search_path = '' as $$
  select pa.patient_id from public.patient_access pa
  where pa.user_id = (select auth.uid())
    and pa.relationship in ('self', 'guardian')
    and pa.revoked_at is null
$$;

-- Patients this staff member currently cares for
create or replace function private.my_care_patient_ids()
returns setof uuid language sql stable security definer set search_path = '' as $$
  select ct.patient_id
  from public.care_team ct
  join public.staff s on s.id = ct.staff_id
  where s.user_id = (select auth.uid()) and s.is_active
    and ct.revoked_at is null
    and (ct.expires_at is null or ct.expires_at > now())
$$;

revoke execute on all functions in schema private from public, anon;
grant execute on all functions in schema private to authenticated;
```

### 2. Read rules for a clinical table

```sql
alter table public.encounters enable row level security;

create policy "own records" on public.encounters
for select to authenticated
using ( patient_id in (select private.my_profile_patient_ids()) and status = 'signed' );

create policy "care team reads" on public.encounters
for select to authenticated
using (
  patient_id in (select private.my_care_patient_ids())
  and ( sensitivity = 'normal'
        or department_id = (select private.my_department_id()) )
);

-- Staff see nothing until they finish two-factor sign-in
create policy "staff need two-factor" on public.encounters
as restrictive for all to authenticated
using ( (select private.my_staff_id()) is null
        or (select auth.jwt() ->> 'aal') = 'aal2' )
with check ( (select private.my_staff_id()) is null
             or (select auth.jwt() ->> 'aal') = 'aal2' );
```

### 3. Write rules and frozen signed notes

```sql
create policy "doctors start notes for their patients" on public.encounters
for insert to authenticated
with check (
  (select private.my_role()) = 'doctor'
  and doctor_id = (select private.my_staff_id())
  and patient_id in (select private.my_care_patient_ids())
  and status = 'draft'
);

create policy "doctors edit their own drafts" on public.encounters
for update to authenticated
using ( doctor_id = (select private.my_staff_id()) and status = 'draft' )
with check ( doctor_id = (select private.my_staff_id()) );

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
```

### 4. Append-only audit trail

```sql
create table public.audit_log (
  id         bigint generated always as identity primary key,
  at         timestamptz not null default now(),
  actor_id   uuid,
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
-- Admins read who/what/when through a definer function that leaves out old_row and new_row.

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

create trigger encounters_audit after insert or update on public.encounters
for each row execute function private.audit_row();
```

### 5. Files follow their database row

A file opens only if the user can already see its `documents` row, so restricted-record rules cover files automatically.

```sql
-- Bucket 'patient-files': private, PDF/JPEG/PNG only, 10 MB limit
create policy "files follow their document row" on storage.objects
for select to authenticated
using (
  bucket_id = 'patient-files'
  and exists (select 1 from public.documents d where d.storage_path = objects.name)
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
-- No update or delete policies: files are write-once.
```

### 6. "What changed" without AI

It runs with the caller's own permissions, so a doctor only ever sees rows the policies already allow.

```sql
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
```

### 7. Tests that block a leaky release

Run as access-matrix tests by `@cloudflare/vitest-pool-workers` in CI (`tests/worker-access.test.ts`). Every route enforces default-deny and covers unauthenticated, cross-patient, unverified staff, and authorized roles.

### Security headers for Cloudflare

Saved as `public/_headers`.

```text
/*
  Content-Security-Policy: default-src 'self'; script-src 'self' https://challenges.cloudflare.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self'; frame-src https://challenges.cloudflare.com; frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self'
  Strict-Transport-Security: max-age=31536000; includeSubDomains
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Referrer-Policy: no-referrer
  Permissions-Policy: camera=(self), microphone=(), geolocation=()
  Cross-Origin-Opener-Policy: same-origin
```

## Sources

- [Cloudflare Workers documentation](https://developers.cloudflare.com/workers/)
- [Cloudflare D1 documentation](https://developers.cloudflare.com/d1/)
- [Cloudflare R2 pricing](https://developers.cloudflare.com/r2/pricing/)
- [Resend pricing](https://resend.com/pricing)
- [Khaitan & Co on the DPDP Rules 2025](https://www.khaitanco.com/sites/default/files/2025-11/ERGO%20-%20Digital%20Personal%20%20Data%20Protection%20Rules%20-%2015%20November%202025.pdf)
- [Linklaters on the CERT-In directions](https://www.linklaters.com/en/insights/blogs/digilinks/2022/may/india-new-and-onerous-cyber-security-framework-and-breach-reporting-obligations)
- [StatusCake and UptimeRobot free plans compared](https://notifier.so/guides/statuscake-vs-uptimerobot/)
- [Khaitan & Co on the DPDP Rules 2025](https://www.khaitanco.com/sites/default/files/2025-11/ERGO%20-%20Digital%20Personal%20%20Data%20Protection%20Rules%20-%2015%20November%202025.pdf)
- [Linklaters on the CERT-In directions](https://www.linklaters.com/en/insights/blogs/digilinks/2022/may/india-new-and-onerous-cyber-security-framework-and-breach-reporting-obligations)
- [StatusCake and UptimeRobot free plans compared](https://notifier.so/guides/statuscake-vs-uptimerobot/)
