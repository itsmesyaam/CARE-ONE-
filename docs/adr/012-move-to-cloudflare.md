# ADR 012: Move Complete Platform to Cloudflare Native Stack

- **Date:** October 9, 2026
- **Status:** Accepted
- **Decider:** Platform Team & Project Lead
- **Supersedes:** ADR 01, ADR 02, ADR 03, ADR 04, ADR 05, ADR 06, ADR 10, ADR 11 in `docs/ARCHITECTURE.md`

---

## 1. Context and Problem Statement

CareOne V1 was initially architected as a static Single Page Application hosted on Cloudflare Pages communicating cross-origin directly with an external PostgreSQL backend (leveraging Postgres Row-Level Security, external Auth with TOTP MFA, external Storage, and Edge Functions).

In operation and live deployment, this cross-origin architecture introduced substantial operational friction:
1. **Network and CSP Boundaries:** Cross-origin communication between Cloudflare and external backend endpoints caused network failures ("Failed to fetch"), complex Content Security Policies, and reliance on external PaaS project health and regional latency.
2. **Platform Fragmentations:** Managing two separate cloud environments (Cloudflare for frontend and CDN, separate PaaS for PostgreSQL, Storage, Functions, and Auth) duplicated secret management, deployment steps, and failure modes.
3. **Inactivity Pausing:** Free-tier external database projects automatically pause after inactivity, impacting demo reliability.

A strategic decision was made to consolidate the entire stack into a single, cohesive, native Cloudflare platform.

---

## 2. Decision

We are migrating the entire backend, database, authentication, storage, and background jobs to Cloudflare's serverless edge ecosystem:

1. **Unified Application & API Runtime:**
   - A single Cloudflare Worker serves both static web assets (React PWA) and the backend API under `/api` using **Hono**.
   - App and API share the exact same origin, simplifying Content Security Policy (`connect-src 'self'`) and eliminating cross-origin preflight overhead.

2. **Database & Migrations:**
   - Migrate from PostgreSQL to **Cloudflare D1** (serverless relational SQLite at the edge).
   - Use **Drizzle ORM** for type-safe queries and schema definition.
   - SQL migrations stored in `/migrations` and applied using D1 migrations.
   - Database-level SQLite triggers enforce audit log immutability (`audit_log` append-only), signed clinical note freezing, and care-team assignment on appointment creation.

3. **Authentication & Session Management:**
   - **Patients:** Passwordless 6-digit email OTPs stored hashed in D1, valid for 10 minutes, maximum 5 attempts, rate-limited, guarded by Cloudflare Turnstile, and dispatched via Resend API.
   - **Staff:** Strong password authentication plus Time-based One-Time Password (TOTP) authenticator application verification. Server-enforced 10-minute idle session timeout.
   - **Sessions:** Cryptographically random session tokens stored only as SHA-256 hashes in D1, transmitted via `HttpOnly`, `Secure`, `SameSite=Strict` cookies. State-changing requests enforce `Origin` header validation.

4. **Access Control & Authorization Layer:**
   - Centralized access layer middleware (`access.ts`) with a strict **default-deny** policy.
   - Every route declares allowed roles (`patient`, `guardian`, `doctor`, `front_desk`, `admin`).
   - All staff routes require verified two-factor authentication (AAL2 equivalent).
   - Patient isolation is scoped strictly in the SQL `WHERE` clause before query execution (never post-filtered).
   - Routes interact through data access helpers; no route accesses D1 directly without role validation.
   - Access-matrix test suite validates all roles and denial cases against every route.

5. **File Storage:**
   - Migrate from external storage to a private **Cloudflare R2** bucket.
   - All uploads and downloads pass strictly through authenticated Worker endpoints that verify permissions on every request. The R2 bucket is never exposed publicly.
   - 10 MB file size limit, MIME whitelist (PDF, JPEG, PNG), and client-side photo re-encoding.

6. **Scheduled Jobs (Reminders):**
   - Cloudflare **Cron Triggers** running every 5 minutes invoke the reminder runner.
   - Due reminders are claimed atomically using `UPDATE ... RETURNING`, dispatched via Web Push (generic, privacy-preserving text only), falling back to Resend email, with up to 3 retries.

7. **Local Development & Testing:**
   - Local development powered exclusively by `wrangler dev` with `--local` D1 and R2.
   - Unit and API access-matrix tests run via `vitest` with `@cloudflare/vitest-pool-workers`.
   - E2E smoke testing via Playwright.

---

## 3. What This Replaces

| Component | Previous Architecture (External PaaS) | New Architecture (Cloudflare) |
|---|---|---|
| **Hosting & Serving** | Cloudflare Pages (static only) | Cloudflare Worker (Static Assets + Hono `/api`) |
| **API Architecture** | Direct client-to-Postgres PostgREST RPCs | Hono REST API under `/api` with access layer |
| **Database** | PostgreSQL (managed) | Cloudflare D1 (SQLite) with Drizzle ORM |
| **Row Security** | PostgreSQL Row-Level Security (RLS) policies | Centralized Worker access middleware + SQL scoping |
| **Auth & MFA** | External Auth (email OTP, TOTP MFA) | D1-backed sessions, TOTP engine, Resend OTP |
| **File Storage** | External Storage buckets | Cloudflare R2 private bucket via Worker proxy |
| **Scheduled Tasks** | `pg_cron` calling Edge Functions | Cloudflare Cron Triggers |
| **Local Tooling** | External CLI and Docker | Wrangler (`wrangler dev --local`) |
| **Database Tests** | External harness | Vitest via `@cloudflare/vitest-pool-workers` |

---

## 4. Consequences and Trade-Offs

### Positive
- **Single Origin & Unified Infrastructure:** Eliminates all cross-origin errors, CORS preflights, and CSP friction. The browser only talks to `self`.
- **Zero Inactivity Pausing:** Cloudflare D1 and Workers do not sleep or pause after inactivity.
- **Auditable & Flexible Security Layer:** Access rules live in explicit, testable TypeScript middleware paired with database triggers for immutability.
- **Lower Latency & Edge Footprint:** API and database queries run across Cloudflare's global edge network.

### Negative & Mitigations
- **Loss of PostgreSQL RLS:** Instead of database-level RLS, security is enforced in the Worker application layer. **Mitigation:** Strict default-deny middleware, SQL-level WHERE scoping, and mandatory access-matrix tests on every route.
- **Custom Auth & TOTP Implementation:** We are responsible for password hashing, TOTP validation, and session lifecycle. **Mitigation:** Use established cryptographic standards (Web Crypto API, constant-time comparisons), server-enforced idle timeouts, and CPU profiling to keep verification under 10 ms.
- **SQLite Concurrency & Data Modeling:** D1 is based on SQLite, which handles types and constraints differently from Postgres. **Mitigation:** Use TEXT UUIDs, ISO-8601 UTC strings, JSON stored as TEXT, and D1 SQLite triggers for business rules.
