# CareOne Platform Handoff & Session Summary

## 📌 Current State & Branch
- **Branch**: `main`
- **Latest Commit**: `12a970f8` (`chore: bump version to 0.1.2 and update version.json`)
- **Live Worker URL**: [https://care-one.syam18official.workers.dev](https://care-one.syam18official.workers.dev)
- **Deployment Status**: Production active on Cloudflare Workers + D1 (`careone-db` and `careone-files`).
- **Live Health Check**: `/api/health` verified (`{"ok":true,"db":"ok","commit":"0e5dda6e","status":"ok","service":"care-one-api","d1":true}`)
- **Live Version**: `/version.json` verified (`0.1.2`, build `2026-10-14T10:44:40.096Z`)

---

## 🎯 What Was Completed

### STEP 0 — Inventory & Audit
- Traced the hard-coded `"482 913"` code to a mock helper in `src/features/patient/PatientSignIn.tsx`.
- Audited all legacy OTP endpoints (`/api/auth/otp/send`, `/api/auth/otp/verify`), code boxes, and `auth_otps` table.

### STEP 1 — Database Schema Hardening
- Applied and hardened migrations:
  - `migrations/0009_passkeys.sql`: Created `passkeys` table, `setup_tokens` table, and `webauthn_challenges` table.
  - `migrations/0010_passkeys_and_tokens_hardening.sql`: Added indexes (`idx_passkeys_user_id`, `idx_setup_tokens_user_id`, `idx_setup_tokens_token_hash`) and immutable triggers for audit logging on passkey and token actions.
  - `migrations/0011_drop_auth_otps.sql`: Completely dropped the legacy `auth_otps` table.

### STEP 2 — Passkey Server (Worker Engine)
- Integrated `@simplewebauthn/server` in `worker/routes/passkey.ts`:
  - `POST /api/auth/passkey/login/options` & `POST /api/auth/passkey/login/verify`: FIDO2 / WebAuthn assertion verification with IP rate limiting and `SameSite=Strict`, `HttpOnly`, `Secure` session cookies (12h for staff, 30d for patients).
  - `POST /api/auth/passkey/register/options` & `POST /api/auth/passkey/register/verify`: Biometric attestation verification tied strictly to single-use 32-byte setup tokens (SHA-256 hashed).
  - `POST /api/desk/patients/:id/setup-link`: Generates 30-minute onboarding QR links (Front Desk / Admin only, requires AAL2 MFA).
  - `POST /api/admin/staff/:id/setup-link`: Generates staff onboarding passkey links (Admin only).
  - `GET /api/me/passkeys` & `DELETE /api/me/passkeys/:id`: User device management and passkey revocation.
  - `POST /api/desk/patients/:id/revoke-passkeys`: Bulk revocation for lost devices.

### STEP 3 — Client UI Screens (React + SimpleWebAuthn)
- `/patient/login` (`src/features/patient/PatientSignIn.tsx`):
  - Clean UI with a single prominent biometric button: *"Sign in with fingerprint or face lock"*.
  - Helper note: *"First time? Ask the front desk for your setup QR code."*
  - Zero OTP code boxes, SMS inputs, or email code forms.
  - Full bilingual support (English and Malayalam).
  - Environment guard: Demo sign-in buttons only rendered when `ENVIRONMENT === 'local'`.
- `/setup?token=...` (`src/features/patient/PatientSetup.tsx`):
  - Plain-language explainer for patients.
  - Browser WebAuthn capability check (`browserSupportsWebAuthn`).
  - Single-click *"Create my passkey"* triggering native device biometric prompt.
  - Redirects directly to consent and patient portal.
- Front Desk QR Setup Modal (`src/components/SetupQrModal.tsx`):
  - In-browser SVG QR code rendering via pure TypeScript matrix generator (`src/lib/qr.ts` - 0 external npm dependencies).
  - 30-minute live countdown timer and one-click clipboard copy.
  - Revocation action for lost/stolen phones.
- Staff Sign-In (`src/features/auth/StaffSignIn.tsx`):
  - Enforces WebAuthn security key / passkey first (Factor 1), followed by 6-digit TOTP authenticator code (Factor 2 / `aal2`).
  - Automatic lock screen on 10-minute idle inactivity.
- Account Management (`src/components/PasskeyDeviceList.tsx`):
  - Lists registered devices with dates and revocation buttons in `PatientProfile.tsx` and `DoctorAccount.tsx`.

### STEP 4 — Full OTP Removal
- Deleted `/api/auth/otp/send` and `/api/auth/otp/verify` endpoints from `worker/routes/auth.ts`.
- Removed `signInWithPassword`, `signInWithOtp`, and `verifyOtp` client methods from `src/lib/client.ts`.
- Removed legacy OTP translation keys (`sendOtp`, `sendingOtp`, `verifyOtp`, `verifyingOtp`, `otpSentNotice`, `otpLabel`, `otpPlaceholder`, `sendStaffOtp`, `invalidOtp`, `emailOtpTitle`, `emailOtpSub`, `sendCodeBtn`, `emailCode`) from `src/locales/en.json` and `src/locales/ml.json`.
- Removed legacy `.otp` and `.webotp` CSS classes from `src/index.css`.
- Removed `'otp'` step from `PatientContext.tsx`.
- Updated `README.md` and `AGENTS.md` to reflect Cloudflare Workers, D1, and passkey architecture.

### STEP 5 — Rigorous Verification & Tests
- **Test Results**: All 42 test files and 202 tests pass (`npm test`).
  - Grep test confirms 0 OTP routes, tables, or "one-time-code" strings remain.
  - Every protected patient and staff route returns 401 without an active session.
  - Setup tokens reject expired, reused, non-existent, and cross-user tokens.
  - Patients and unauthenticated users cannot generate setup tokens.
  - Front Desk staff without two-factor (`aal1`) are rejected with `401 {"error": "mfa_required"}`.
  - Revoked passkeys and disabled users (`is_active = 0`) are immediately blocked.
  - Demo sign-in is strictly blocked (`403`) when `ENVIRONMENT=production`.
  - Full 8-role access matrix verified.
- **Typecheck**: `npm run typecheck` passed with 0 errors.
- **Lint**: `npm run lint` passed with 0 errors.
- **i18n Symmetry**: `npm run i18n:check` passed with 100% key symmetry across all 440 keys.
- **Build**: `npm run build` completed successfully.

### STEP 6 — Deployment & Remote DB Sync
- Remote D1 database migrations applied to `careone-db`:
  - `0009_passkeys.sql` ✅
  - `0010_passkeys_and_tokens_hardening.sql` ✅
  - `0011_drop_auth_otps.sql` ✅
- Bumped app version to `0.1.2` in `package.json` and `public/version.json`.
- Deployed Worker bundle and static assets via `npx wrangler deploy`.
- Confirmed live operation at `https://care-one.syam18official.workers.dev`.

---

## 📱 Live Testing Walkthrough Guide

To test the end-to-end passkey biometric workflow on a physical smartphone:

### Step 1: Front Desk Generates Setup QR Code
1. Open [https://care-one.syam18official.workers.dev/staff/signin](https://care-one.syam18official.workers.dev/staff/signin) on desktop.
2. Sign in as Front Desk staff (`desk@example.com`).
3. In the patient directory or Doctor Chart view, select demo patient **"Arun Kumar"**.
4. Click the **"Set up app"** button in the header.
5. The **Setup App with Passkey** modal opens with a live QR code and a 30-minute countdown.

### Step 2: Patient Scans QR Code on Phone
1. Open the camera or QR scanner on an Android device (Android 9+) or iPhone (iOS 16+).
2. Scan the on-screen QR code, which opens `https://care-one.syam18official.workers.dev/setup?token=...`.
3. The page displays: *"Set up your fingerprint or screen lock. No passwords or SMS codes."*
4. Tap **"Create my passkey"**.
5. Your device's native biometric prompt appears (fingerprint, Face ID, or screen PIN/pattern).
6. Confirm the biometric check. The passkey is attested and registered in Cloudflare D1.
7. The patient is automatically transitioned through consent to the patient portal home screen.

### Step 3: Verify Subsequent Biometric Sign-In
1. In the mobile browser, navigate to [https://care-one.syam18official.workers.dev/patient/login](https://care-one.syam18official.workers.dev/patient/login).
2. Notice: **No code boxes or password inputs exist anywhere on the page.**
3. Tap **"Sign in with fingerprint or face lock"**.
4. Touch your fingerprint sensor or verify Face ID.
5. You are instantly signed in to your patient portal.

---

## 🛠️ Commands to Resume / Local Development

```powershell
# 1. Start frontend dev server
npm run dev

# 2. Start Worker backend locally
npm run worker:dev

# 3. Apply local database migrations
npm run db:migrate:local
npx wrangler d1 migrations apply FILES_DB --local

# 4. Run test suites
npm test

# 5. Typecheck & Lint
npm run typecheck
npm run lint
npm run i18n:check
```
