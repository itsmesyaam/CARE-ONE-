# CareOne Deployment Guide 🚀

This document outlines the exact deployment procedures for hosting the CareOne single-page application on either **Vercel** or **Cloudflare Pages**, and linking with your remote Supabase project.

---

## 1. Hosting Option A: Deploying on Vercel

CareOne is configured with [`vercel.json`](../vercel.json) to handle Single-Page Application (SPA) client-side routing and enforce strict HTTP security headers matching our architecture specification.

### Vercel Project Configuration Reference
- [Vercel Project Configuration: Rewrites & Headers](https://vercel.com/docs/projects/project-configuration#headers)

### Steps to Deploy on Vercel (Perform in Vercel Dashboard)
1. **Import Repository**:
   - Go to [Vercel Dashboard](https://vercel.com/dashboard) and click **Add New...** → **Project**.
   - Select your GitHub repository (`CARE-ONE-`).
2. **Configure Project Settings**:
   - **Framework Preset**: Select `Vite`.
   - **Root Directory**: `./` (default).
   - **Build Command**: `npm run build` (or leave default Vite build command).
   - **Output Directory**: `dist` (default).
3. **Environment Variables**:
   Under **Environment Variables**, add only the public client credentials:
   - `VITE_SUPABASE_URL`: Your remote Supabase project URL (e.g. `https://<project-ref>.supabase.co`).
   - `VITE_SUPABASE_PUBLISHABLE_KEY`: Your Supabase publishable (anon) key.
   *(Note: The client also accepts `VITE_SUPABASE_ANON_KEY`. Never add the service-role key or any database passwords to Vercel).*
4. **Deploy**:
   - Click **Deploy**. Vercel will build the Vite bundle and deploy it with the security headers defined in `vercel.json`.
5. **Update Supabase Auth Configuration**:
   - Once deployment completes, copy your Vercel URL (e.g. `https://care-one.vercel.app`).
   - In your [Supabase Dashboard](https://supabase.com/dashboard) → **Authentication** → **URL Configuration**:
     - Set **Site URL** to `https://<your-project>.vercel.app`.
     - In **Redirect URLs**, add `https://<your-project>.vercel.app/**`.

---

## 2. Hosting Option B: Deploying on Cloudflare Pages

CareOne includes [`public/_headers`](../public/_headers), which Cloudflare Pages automatically picks up from `dist/_headers` on build.

### Steps to Deploy on Cloudflare Pages (Perform in Cloudflare Dashboard)
1. **Create Project**:
   - Go to [Cloudflare Dashboard](https://dash.cloudflare.com/) → **Workers & Pages** → **Create application** → **Pages** → **Connect to Git**.
   - Select the repository.
2. **Build Settings**:
   - **Framework Preset**: `Vite`.
   - **Build command**: `npm run build`.
   - **Build output directory**: `dist`.
3. **Environment Variables**:
   - `VITE_SUPABASE_URL`: `https://<project-ref>.supabase.co`.
   - `VITE_SUPABASE_ANON_KEY`: `<publishable-anon-key>`.
4. **Update Supabase Auth Configuration**:
   - In Supabase Dashboard → **Authentication** → **URL Configuration**:
     - Set **Site URL** to `https://<your-project>.pages.dev`.
     - Add `https://<your-project>.pages.dev/**` to **Redirect URLs**.

---

## 3. Remote Supabase Setup & Migrations (CLI)

Run these commands in your local terminal to initialize the remote database schema and deploy Edge Functions:

```bash
# 1. Login to Supabase CLI
npx supabase login

# 2. Link your local repository to your remote project
npx supabase link --project-ref <YOUR_PROJECT_ID>

# 3. Apply all database migrations
npx supabase db push

# 4. Set Edge Function production secrets
npx supabase secrets set ALLOWED_ORIGIN="https://<your-app-domain>" ENVIRONMENT="production"

# 5. Deploy Edge Functions
npx supabase functions deploy invite-staff
npx supabase functions deploy invite-patient
npx supabase functions deploy send-reminders
```

---

## 4. Security Verification Checklist

After deploying to either Vercel or Cloudflare:
- [ ] Verify that opening any deep link (e.g., `/admin`) rewrites correctly to `index.html` without a 404 error.
- [ ] Inspect response headers using browser DevTools or `curl -I https://<your-app-domain>`:
  - `Content-Security-Policy` is present and active.
  - `Strict-Transport-Security` enforces 1-year HSTS (`max-age=31536000`).
  - `X-Frame-Options: DENY` prevents framing/clickjacking.
  - `X-Content-Type-Options: nosniff` is enforced.
- [ ] Confirm staff sign-ins require TOTP two-factor authentication (AAL2).
