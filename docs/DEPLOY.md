# CareOne Deployment Guide 🚀

This document outlines the deployment procedures for running the unified CareOne healthcare platform on **Cloudflare Workers** with serverless **Cloudflare D1** database, **Cloudflare R2** private object storage, and automated **Cron Triggers**.

---

## Official Documentation References
- [Cloudflare Workers Builds & Git Integration](https://developers.cloudflare.com/workers/ci-cd/builds/)
- [Cloudflare D1 Relational Database](https://developers.cloudflare.com/d1/get-started/)
- [Cloudflare D1 Migrations](https://developers.cloudflare.com/d1/reference/migrations/)
- [Cloudflare R2 Object Storage](https://developers.cloudflare.com/r2/get-started/)
- [Cloudflare Workers Secrets & Variables](https://developers.cloudflare.com/workers/configuration/secrets/)
- [Cloudflare Cron Triggers](https://developers.cloudflare.com/workers/configuration/cron-triggers/)

---

## 1. Connect GitHub Repository to Cloudflare Workers Builds
*Reference: [Cloudflare Workers CI/CD Builds](https://developers.cloudflare.com/workers/ci-cd/builds/)*

1. Navigate to the [Cloudflare Dashboard](https://dash.cloudflare.com/) → **Workers & Pages**.
2. Click **Create Application** → **Workers** → **Connect to Git**.
3. Select your GitHub repository (`CARE-ONE-`) and choose the production branch (`main`).
4. In Build Settings:
   - **Build command**: `npm run build`
   - **Deploy command**: `wrangler deploy`
   - **Root directory**: `/`

---

## 2. Create D1 Database and R2 Storage Bucket
*References: [D1 Getting Started](https://developers.cloudflare.com/d1/get-started/) | [R2 Getting Started](https://developers.cloudflare.com/r2/get-started/)*

### A. Create D1 Database
1. In Cloudflare Dashboard, go to **Storage & Databases** → **D1 SQL Database**.
2. Click **Create Database**.
3. Database Name: `care-one-d1`.
4. Note the generated `database_id` and ensure it matches `wrangler.jsonc` or configure the dashboard binding:
   - Variable name: `DB`
   - Bound database: `care-one-d1`

### B. Create R2 Bucket
1. Go to **Storage & Databases** → **R2 Object Storage**.
2. Click **Create bucket**.
3. Bucket Name: `care-one-documents`.
4. Keep the bucket **private** (do not enable public access or custom domains).
5. Ensure the Worker binding in the dashboard matches `wrangler.jsonc`:
   - Variable name: `BUCKET`
   - Bound bucket: `care-one-documents`

---

## 3. Configure Remote Database Migrations
*Reference: [Cloudflare D1 Migrations](https://developers.cloudflare.com/d1/reference/migrations/)*

Migrations in `migrations/` are applied to the remote D1 database during deployment.
In Cloudflare Workers Builds, configure the build step to run:
```bash
npx wrangler d1 migrations apply care-one-d1 --remote
```

---

## 4. Add Environment Secrets in the Dashboard
*Reference: [Workers Secrets](https://developers.cloudflare.com/workers/configuration/secrets/)*

Go to **Workers & Pages** → your Worker (`care-one`) → **Settings** → **Variables and Secrets**. Add the following secret names (add values securely in the Cloudflare Dashboard; never commit secrets to Git):

- `RESEND_API_KEY`: Production API key from Resend for transactional login OTPs and notification emails.
- `TURNSTILE_SECRET_KEY`: Cloudflare Turnstile secret key for bot protection on patient login OTP requests.
- `SESSION_SECRET`: Cryptographically random 32-byte string for signing session cookies.
- `VAPID_PRIVATE_KEY`: Private key for Web Push notification dispatch.
- `VAPID_PUBLIC_KEY`: Public key for Web Push subscription negotiation.

---

## 5. Load Demo Data (Optional / Staging)
To initialize staging or demo environments with realistic test data:
```bash
npx wrangler d1 execute care-one-d1 --remote --file=./scripts/seed-demo-d1.sql
```

---

## 6. Security & Live Verification Checklist
After the deployment completes:
- [ ] Deep links (e.g., `/admin`, `/patient`, `/doctor`) resolve correctly to `index.html`.
- [ ] Security headers on responses contain:
  - `Content-Security-Policy: default-src 'self'; connect-src 'self'; ...`
  - `Strict-Transport-Security: max-age=31536000; includeSubDomains`
  - `X-Frame-Options: DENY`
  - `X-Content-Type-Options: nosniff`
- [ ] Staff authentication requires password + TOTP authenticator app.
- [ ] Patient sign-in delivers 6-digit one-time passcodes via Resend.
