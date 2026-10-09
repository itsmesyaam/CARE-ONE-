# Live Staff Sign-In "Failed to fetch" Audit & Resolution Report

**Target URL**: `https://care-one.syam18official.workers.dev/staff/signin`  
**Supabase Project ID**: `kndkohgpbnbbndvtgqvx`  
**Date & Time**: 2026-10-09 12:35 IST  

---

## 1. Evidence Collected from Live Site

A headless browser inspection was executed against `https://care-one.syam18official.workers.dev/staff/signin`. The security check passed and demo doctor credentials (`dr.rahul@example.com` / `DemoPassword123!`) were submitted.

### Exact Browser Console Error (Word for Word)
```text
[BROWSER CONSOLE ERROR]: Connecting to 'http://127.0.0.1:54321/auth/v1/token?grant_type=password' violates the following Content Security Policy directive: "connect-src 'self' https://*.supabase.co wss://*.supabase.co". The action has been blocked.
[BROWSER CONSOLE ERROR]: Fetch API cannot load http://127.0.0.1:54321/auth/v1/token?grant_type=password. Refused to connect because it violates the document's Content Security Policy.
```

### Failed Request Details from Network Tab
- **Request URL**: `http://127.0.0.1:54321/auth/v1/token?grant_type=password`
- **Method**: `POST`
- **Status**: Blocked by client / Content Security Policy (`(failed) net::ERR_BLOCKED_BY_CLIENT`)
- **UI Error Displayed**: `"Failed to fetch"`

### Built JavaScript Analysis
Inspection of the bundled assets loaded on `care-one.syam18official.workers.dev`:
- The client bundle contained `http://127.0.0.1:54321` as the active Supabase target URL.
- The live app was calling `http://127.0.0.1:54321` instead of `https://kndkohgpbnbbndvtgqvx.supabase.co`.

---

## 2. Root Cause Analysis

We audited the three potential causes:

### Cause a) Security Headers & CSP
- `public/_headers` had `connect-src 'self' https://*.supabase.co wss://*.supabase.co;`.
- The directive permitted Supabase wildcard domains, but strictly blocked local addresses (`127.0.0.1`).
- `style-src` was missing `https://fonts.googleapis.com` and `font-src` was missing `https://fonts.gstatic.com`, causing secondary stylesheet CSP violations.

### Cause b) Cloudflare Build Variables (THE ROOT CAUSE)
- **Diagnosis**: On Cloudflare Pages/Workers, `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` (or `VITE_SUPABASE_ANON_KEY`) were **missing or not set as build-time environment variables**.
- Because Vite replaces `import.meta.env.*` statically at build time, Vite fell back to `defaultUrl = 'http://127.0.0.1:54321'` defined in `src/lib/supabase.ts`.
- When deployed, the browser attempted to connect to the visitor's local machine (`127.0.0.1:54321`). The browser's Content Security Policy correctly blocked this insecure local cross-origin request, throwing `"TypeError: Failed to fetch"`.

### Cause c) Remote Supabase Project Health Check
We tested the live Supabase project endpoints for project `kndkohgpbnbbndvtgqvx`:
- **Auth Endpoint**: `GET https://kndkohgpbnbbndvtgqvx.supabase.co/auth/v1/health`
  - **HTTP Status**: `401 Unauthorized` (Expected when no API key is supplied)
  - **Response Payload**: `{"message":"No API key found in request","hint":"No `apikey` request header or url param was found."}`
  - **Gateway Header**: `sb-project-ref: kndkohgpbnbbndvtgqvx`
- **REST Endpoint**: `GET https://kndkohgpbnbbndvtgqvx.supabase.co/rest/v1/`
  - **HTTP Status**: `401 Unauthorized`
  - **Gateway Header**: `sb-project-ref: kndkohgpbnbbndvtgqvx`
- **Result**: The Supabase project is **healthy, active, and reachable**.

---

## 3. Implemented Fixes

### Fix 1: Security Headers Hardened with Exact Project Address
Updated `public/_headers`, `vercel.json`, and `index.html`:
- Added explicit project URL: `https://kndkohgpbnbbndvtgqvx.supabase.co` and `wss://kndkohgpbnbbndvtgqvx.supabase.co` to `connect-src` and `img-src`.
- Added `https://fonts.googleapis.com` to `style-src` and `https://fonts.gstatic.com` to `font-src`.
- Added `https://challenges.cloudflare.com` to `script-src` and `frame-src` for Cloudflare Turnstile bot protection.

### Fix 2: Production Startup Validation
Added `getSupabaseConfigurationError()` in `src/lib/supabase.ts` and wired it into `src/app/App.tsx`:
- When running in a production build on a remote host (non-localhost), the application checks `VITE_SUPABASE_URL`.
- If `VITE_SUPABASE_URL` is missing, contains `localhost` / `127.0.0.1`, or contains placeholder `YOUR-PROJECT`, the SPA **refuses to start** and presents a clear on-screen configuration banner showing the issue and the expected project address (`https://kndkohgpbnbbndvtgqvx.supabase.co`).

### Fix 3: Friendly User Error for Network / Fetch Failures
In `src/features/auth/StaffSignIn.tsx`:
- Intercepted raw `"Failed to fetch"`, `"NetworkError"`, and `"refused to connect"` exceptions.
- Replaced with user-friendly error message:
  - English: `"We can't reach the server right now. Please try again."`
  - Malayalam: `"സെർവറുമായി ബന്ധപ്പെടാൻ സാധിക്കുന്നില്ല. ദയവായി അല്പം കഴിഞ്ഞ് വീണ്ടും ശ്രമിക്കുക."`
- The technical error details are logged to `console.error('[CareOne Technical Error] Failed to reach Supabase backend:', err)`.

---

## 4. User Action Items: Cloudflare & Supabase Configuration

### Step A: Configure Build Variables in Cloudflare Pages / Workers
Follow these steps in your Cloudflare dashboard:
1. Log in to [dash.cloudflare.com](https://dash.cloudflare.com).
2. Go to **Workers & Pages** > Select your project (`care-one` or `care-one-h7mc`).
3. Click **Settings** > **Environment variables**.
4. Under **Production** (and **Preview**), add the following **Build & Runtime** variables:
   - Variable name: `VITE_SUPABASE_URL`  
     Value: `https://kndkohgpbnbbndvtgqvx.supabase.co`
   - Variable name: `VITE_SUPABASE_PUBLISHABLE_KEY` (or `VITE_SUPABASE_ANON_KEY`)  
     Value: `<your-supabase-anon-key>` *(The anon/publishable key from your Supabase project API settings. NEVER use the service-role key)*.
5. Save the variables.
6. Trigger a **Redeploy** so Vite compiles with these variables baked into the client bundle.

### Step B: Configure Supabase Auth URLs
In your Supabase project dashboard for `kndkohgpbnbbndvtgqvx`:
1. Navigate to **Authentication** > **URL Configuration**.
2. Set **Site URL** to:
   ```text
   https://care-one.syam18official.workers.dev
   ```
3. In **Redirect URLs**, add the following entries:
   ```text
   https://care-one.syam18official.workers.dev/**
   https://care-one.syam18official.workers.dev/auth/callback
   https://care-one.syam18official.workers.dev/staff/signin
   https://care-one.syam18official.workers.dev/patient/signin
   http://localhost:5173/**
   http://127.0.0.1:5173/**
   ```
4. Click **Save**.

### Step C: Cloudflare Turnstile Bot Protection (Optional / Recommended)
If you wish to enable Turnstile in Supabase Auth:
1. In Cloudflare Dashboard, go to **Turnstile** > Add a widget for domain `care-one.syam18official.workers.dev`.
2. Copy the **Site Key** and **Secret Key**.
3. In Supabase Dashboard, go to **Authentication** > **Bot Protection**.
4. Enable **Enable CAPTCHA protection**, select **Cloudflare Turnstile**, and paste the **Turnstile secret key**. *(Never place this secret in client-side code).*

---

## 5. Quality Verification Gates

All automated checks pass:
- `npm run typecheck`: **0 errors**
- `npm run lint`: **0 errors, 0 warnings**
- `npm test`: **25 test files / 102 tests passed**
- `npx supabase test db`: **10 test suites / 160 pgTAP tests passed**
- `npx playwright test tests/e2e/doctor-journey.spec.ts`: **1 passed**
- `node scripts/check-i18n.js`: **446 keys verified with 100% symmetry**
- `npm run build`: **Production bundle successfully created**
