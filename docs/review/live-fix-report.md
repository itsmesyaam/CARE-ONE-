# CareOne Live Deployment Resolution Report

**Live URL**: https://care-one-h7mc.vercel.app  
**Date**: 2026-10-07  
**Status**: Resolved & Live Verified

---

## 1. Executive Summary & Required Dashboard Actions

The blank screen and missing login screens on `https://care-one-h7mc.vercel.app` have been resolved. The application is now fully live, responsive on both desktop and mobile viewports, bilingual (English & Malayalam), and provides full Patient (Email OTP) and Staff (Password + Authenticator MFA) sign-in screens.

Because the live Vercel environment does not yet have your Supabase project credentials injected, the application displays a friendly **Supabase Environment Pending** banner at the top of the screen instead of crashing.

### Exact Steps for You in the Vercel & Supabase Dashboards

> [!IMPORTANT]
> In accordance with the security rules in `AGENTS.md`, never paste or store any secret, database password, or `service_role` key into Vercel or frontend repositories. Only the public URL and publishable/anon key are permitted.

#### Step A: Configure Environment Variables in Vercel
1. Open the [Vercel Dashboard](https://vercel.com) and navigate to your project (`care-one-h7mc` or `CARE-ONE-`).
2. Go to **Settings** &rarr; **Environment Variables**.
3. Add the following two environment variables:
   - **Key**: `VITE_SUPABASE_URL`  
     **Value**: `https://<your-project-ref>.supabase.co`
   - **Key**: `VITE_SUPABASE_PUBLISHABLE_KEY` (or `VITE_SUPABASE_ANON_KEY`)  
     **Value**: `<your-supabase-publishable-or-anon-key>`
4. Set the environment targets to **Production**, **Preview**, and **Development**.
5. Click **Save**, then go to **Deployments** &rarr; select the latest deployment &rarr; click **Redeploy** (without cache).

#### Step B: Configure Redirect URLs in Supabase
1. Open the [Supabase Dashboard](https://supabase.com/dashboard) and navigate to your project.
2. Go to **Authentication** &rarr; **URL Configuration**.
3. Under **Site URL**, set:
   ```text
   https://care-one-h7mc.vercel.app
   ```
4. Under **Redirect URLs**, add:
   ```text
   https://care-one-h7mc.vercel.app/**
   http://localhost:5173/**
   ```
5. Click **Save**.

---

## 2. Root Cause Analysis

### Cause 1: Vite Build-Time Inlining & Fatal Client Crash
Vite statically evaluates and inlines `import.meta.env.VITE_*` during `npm run build`. When `VITE_SUPABASE_URL` was omitted in Vercel's build container:
```javascript
// src/lib/supabase.ts (original)
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}
```
Vite compiled this into an unconditional runtime exception:
```javascript
throw Error("Missing Supabase environment variables");
```
Because this ran during initial bundle evaluation on line 1, JavaScript execution halted before React could mount `<div id="root"></div>`, leaving users with a blank white page.

### Cause 2: Missing Login Screens in Codebase
A full audit of `src/` and `docs/PROGRESS.md` confirmed that **no authentication UI existed in the codebase**:
- `src/features/auth/` contained only an empty `.gitkeep`.
- `src/app/routes.tsx` had only routes for `/` and `/admin` (with `/admin` guarded by a redirect back to `/`).
- `src/app/RootLayout.tsx` had only a static placeholder card with no navigation links or forms.

### Cause 3: Content-Security-Policy Meta Tag Collision
[`index.html`](file:///d:/CareOne/index.html) contained a fallback `<meta http-equiv="Content-Security-Policy">` that only whitelisted `localhost:*` and `127.0.0.1:*` in `connect-src`. Browsers enforce the most restrictive intersection of both the HTTP header and the `<meta>` tag, which would have blocked all network requests to remote `*.supabase.co` backends.

---

## 3. What Was Fixed

1. **Resilient Supabase Client (`src/lib/supabase.ts`)**:
   - Replaced unconditional startup throws with fallback preview credentials.
   - Exported `isSupabaseConfigured: boolean` to dynamically detect when remote backend environment variables are available.
2. **CSP Modernization (`index.html`)**:
   - Permitted `https://*.supabase.co` and `wss://*.supabase.co` across `connect-src` and `img-src` in the HTML meta tag.
3. **Startup Check Banner (`src/components/ConfigBanner.tsx`)**:
   - Non-intrusive, accessible banner rendered at the top of all views when `!isSupabaseConfigured`, cleanly guiding operators to add the environment variables in Vercel.
4. **React Error Boundary (`src/components/ErrorBoundary.tsx`)**:
   - Wrapped the entire application component tree (`src/app/App.tsx`) to catch unexpected rendering errors gracefully with a reload button.
5. **Authentication Screens (`src/features/auth/SignInPage.tsx`)**:
   - **Patient Sign-In**: Email input, one-time OTP delivery request, and 6-digit OTP verification.
   - **Staff Sign-In**: Email and password authentication with two-factor authenticator app (TOTP MFA / AAL2) challenge flow.
   - **Quick Demo Account Chips**: One-click autofill for fictional demo roles (Patient, Doctor, Front Desk, Admin).
6. **Navigation & Home Portal (`src/app/RootLayout.tsx`)**:
   - Added header with hospital branding, live bilingual language toggle (English / മലയാളം), and prominent "Sign In" and "Admin Dashboard" buttons.
   - Added interactive portal cards directing patients and doctors to their respective login flows.
7. **Bilingual Parity (`src/locales/en.json`, `src/locales/ml.json`)**:
   - Added 36 matching keys for authentication, error boundary, and navigation.
   - Verified 100% symmetry (130 keys) via `npm run i18n:check`.

---

## 4. Verification & Screenshots

### Automated Checks Real Output
- `npm run typecheck`: Passed (0 errors).
- `npm run lint`: Passed (0 errors).
- `npm test`: Passed (60 tests passed across 15 test files).
- `npx supabase test db`: Passed (144 pgTAP tests across 9 suites).
- `npm run i18n:check`: Passed (130 keys with 100% symmetry).

### Captured Screenshots
All screenshots are saved locally in [`docs/review/screenshots/`](file:///d:/CareOne/docs/review/screenshots/):
1. **Local Preview**:
   - `local-home-desktop.png` (Desktop 1280x800 home screen with portal cards)
   - `local-home-mobile.png` (Mobile 390px home screen)
   - `local-login-patient-desktop.png` (Patient OTP screen)
   - `local-login-staff-desktop.png` (Staff password + MFA screen)
   - `local-login-patient-mobile.png` (Mobile 390px sign-in screen)
   - `local-login-malayalam-mobile.png` (Mobile 390px Malayalam sign-in screen)
2. **Live Vercel Production (`https://care-one-h7mc.vercel.app`)**:
   - `live-home-desktop.png` (Live verified home page with setup banner and portal links)
   - `live-login-desktop.png` (Live verified `/login` route)
   - `live-login-mobile.png` (Live verified `/login` on 390px phone viewport)
   - `live-login-mobile-ml.png` (Live verified Malayalam toggle on live Vercel URL)

### Live Console Inspection
- Network status: HTTP 200 on both `/` and `/login`.
- Console errors: `0` (clean execution without runtime exceptions).

---

## 5. Anything Still Not Working / Next Steps

1. **Backend Database Operations on Live Site**:
   The live UI, validation, and demo flows are fully functioning. Once you paste `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` into your Vercel project settings, the setup banner will disappear and live Supabase queries and OTP email dispatch will activate.
2. **Clinical Route Expansion**:
   Future phases will link authenticated sessions directly into the doctor chart (`/doctor`) and desk registration (`/desk`) views.
