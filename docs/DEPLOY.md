# CareOne Deployment Guide 🚀

This document details the exact, step-by-step production deployment procedure for the **CareOne Healthcare Platform** on **Cloudflare Workers**. Follow these steps to configure your infrastructure via the Cloudflare Dashboard and GitHub integration.

---

## Official Cloudflare Documentation References
Before starting, review the official Cloudflare guides:
- **Workers Builds & Git Integration**: [https://developers.cloudflare.com/workers/ci-cd/builds/](https://developers.cloudflare.com/workers/ci-cd/builds/)
- **Workers Configuration & Bindings**: [https://developers.cloudflare.com/workers/configuration/bindings/](https://developers.cloudflare.com/workers/configuration/bindings/)
- **Workers Secrets & Environment Variables**: [https://developers.cloudflare.com/workers/configuration/secrets/](https://developers.cloudflare.com/workers/configuration/secrets/)
- **Cloudflare D1 Relational Database**: [https://developers.cloudflare.com/d1/get-started/](https://developers.cloudflare.com/d1/get-started/)
- **Cloudflare D1 Migrations Workflow**: [https://developers.cloudflare.com/d1/reference/migrations/](https://developers.cloudflare.com/d1/reference/migrations/)
- **Cloudflare R2 Object Storage**: [https://developers.cloudflare.com/r2/get-started/](https://developers.cloudflare.com/r2/get-started/)
- **Cloudflare Cron Triggers**: [https://developers.cloudflare.com/workers/configuration/cron-triggers/](https://developers.cloudflare.com/workers/configuration/cron-triggers/)

---

## Step 1: Connect GitHub Repository to Cloudflare Workers Builds
*Official Documentation: [Cloudflare Workers CI/CD Builds](https://developers.cloudflare.com/workers/ci-cd/builds/)*

1. Log into your [Cloudflare Dashboard](https://dash.cloudflare.com/).
2. In the left navigation, select **Compute (Workers) > Workers & Pages**.
3. Click **Create Application** > **Workers** tab > **Connect to Git**.
4. Authorize Cloudflare to access your GitHub account and select the repository: `CARE-ONE-`.
5. Configure deployment settings:
   - **Production branch**: `main`
   - **Framework preset**: None
   - **Build command**: `npx wrangler d1 migrations apply care-one-d1 --remote && npm run build`
   - **Deploy command**: `wrangler deploy`
   - **Root directory**: `/`
6. Click **Save and Deploy**. (The initial build may pause pending Step 2 database & storage provisioning).

---

## Step 2: Create D1 Database and R2 Storage Bucket in Dashboard
*Official Documentation: [D1 Getting Started](https://developers.cloudflare.com/d1/get-started/) & [R2 Getting Started](https://developers.cloudflare.com/r2/get-started/)*

### A. Create D1 Relational Database
1. In Cloudflare Dashboard, navigate to **Storage & Databases > D1 SQL Database**.
2. Click **Create database**.
3. Enter database details:
   - **Database name**: `care-one-d1`
4. Click **Create**.
5. Once created, note the unique **Database ID** UUID shown in the database dashboard.
6. Link the database to your Worker:
   - Go to **Workers & Pages > care-one > Settings > Bindings**.
   - Click **Add binding** > Select **D1 Database**.
   - Set **Variable name**: `DB`
   - Set **D1 Database**: select `care-one-d1`.
   - Click **Deploy / Save**.

### B. Create Private R2 Storage Bucket
1. In Cloudflare Dashboard, navigate to **Storage & Databases > R2 Object Storage**.
2. Click **Create bucket**.
3. Enter bucket details:
   - **Bucket name**: `care-one-documents`
   - **Location hint**: Automatic or APAC / India
4. Click **Create bucket**.
5. **Security check**: Ensure Public Development URL / Custom Domain is **Disabled** (bucket must remain strictly private).
6. Link the bucket to your Worker:
   - Go to **Workers & Pages > care-one > Settings > Bindings**.
   - Click **Add binding** > Select **R2 Bucket**.
   - Set **Variable name**: `BUCKET`
   - Set **R2 Bucket**: select `care-one-documents`.
   - Click **Deploy / Save**.

---

## Step 3: Apply Remote Database Migrations Automatically
*Official Documentation: [Cloudflare D1 Migrations](https://developers.cloudflare.com/d1/reference/migrations/)*

All database schema, immutability triggers, and constraints are maintained under the `migrations/` directory.

### Automated CI/CD Execution
In your Cloudflare Workers Builds settings (configured in Step 1), the build command executes migrations before packaging:
```bash
npx wrangler d1 migrations apply care-one-d1 --remote && npm run build
```

### Manual CLI Execution (If Needed)
You can also run or verify migrations directly from your local terminal:
```bash
npx wrangler d1 migrations apply care-one-d1 --remote
```
Cloudflare will prompt:
`✔ About to apply N migrations on care-one-d1. Continue? ... yes`

---

## Step 4: Add Secrets in the Cloudflare Dashboard
*Official Documentation: [Workers Secrets & Variables](https://developers.cloudflare.com/workers/configuration/secrets/)*

> [!IMPORTANT]
> Never put secret values in `wrangler.jsonc`, frontend code, or git commits. Enter values exclusively in the Cloudflare Dashboard.

Navigate to **Workers & Pages > care-one > Settings > Variables and Secrets**. Under **Secrets**, click **Add** for each:

| Secret Name | Purpose | Source / Notes |
|---|---|---|
| `RESEND_API_KEY` | Transactional email delivery for patient 6-digit OTP codes and overdue notifications. | [resend.com/api-keys](https://resend.com/api-keys) |
| `TURNSTILE_SECRET_KEY` | Cloudflare Turnstile bot verification secret for patient OTP login endpoints. | Cloudflare Dashboard > **Turnstile** > Add site > Site Secret |
| `SESSION_SECRET` | 32-byte cryptographically secure random string used for session cookie integrity. | Generate using `openssl rand -hex 32` |
| `VAPID_PRIVATE_KEY` | Web Push notification signing key (ECDSA P-256). | Private key generated by standard Web Push generator |
| `VAPID_PUBLIC_KEY` | Web Push notification public application key. | Companion public key configured for client push subscriptions |

Click **Save and deploy** to activate the secrets.

---

## Step 5: Load Demo Data
*Official Documentation: [Querying D1 Remote Databases](https://developers.cloudflare.com/d1/get-started/#4-query-your-database)*

To seed staging or demo environments with realistic Malayalam/English test accounts, departments, and clinical encounters:

Run the following commands from your deployment terminal:
```bash
# 1. Apply core demo data (patients, doctors, appointments, encounters)
npx wrangler d1 execute care-one-d1 --remote --file=./migrations/0002_seed_demo_data.sql

# 2. Seed staff authentication credentials (PBKDF2 hashes & TOTP secrets)
npx wrangler d1 execute care-one-d1 --remote --file=./migrations/0003_staff_auth_credentials.sql
```

The remote database is now fully initialized with:
- **Admin**: `admin@example.com` (Password: `Admin@CareOne2026!`, TOTP: `123456`)
- **Doctor**: `doctor@example.com` (Password: `Doctor@CareOne2026!`, TOTP: `123456`)
- **Front Desk**: `desk@example.com` (Password: `Desk@CareOne2026!`, TOTP: `123456`)
- **Patient**: `arun@example.com` (OTP code via Resend)

---

## Step 6: Live Verification Checklist
*Official Documentation: [Cloudflare Cron Triggers](https://developers.cloudflare.com/workers/configuration/cron-triggers/)*

After Cloudflare deploys the application, verify the live deployment:

1. **Build Stamp Verification**:
   - Access the live site footer and confirm the displayed build stamp (`commit <hash>`) matches your latest GitHub commit on `main`.
2. **Security Headers**:
   - Inspect response headers in browser DevTools:
     - `Content-Security-Policy`: contains `connect-src 'self'`
     - `Strict-Transport-Security`: `max-age=31536000; includeSubDomains`
     - `X-Frame-Options`: `DENY`
     - `X-Content-Type-Options`: `nosniff`
3. **Role Sign-in Verification**:
   - **Admin**: Sign in at `/staff/signin` using password + TOTP; verify operational metrics dashboard.
   - **Doctor**: Sign in at `/staff/signin`; verify patient list, "What Changed" panel, and encounter note composer.
   - **Front Desk**: Sign in at `/staff/signin`; verify patient registration and appointments schedule.
   - **Patient**: Sign in at `/patient/signin`; receive 6-digit OTP code, verify timeline and prescriptions.
4. **Cron Reminders Background Runner**:
   - In Cloudflare Dashboard, verify **Workers & Pages > care-one > Triggers** shows the automated 5-minute schedule: `*/5 * * * *`.
