# CareOne Platform Handoff & Session Summary 🏥

## 📌 Current State & Live Deployment
- **Branch**: `main`
- **Latest Commit**: Synced and pushed to `origin/main`
- **Live Production URL**: [https://care-one.syam18official.workers.dev](https://care-one.syam18official.workers.dev)
- **Live Health Check**: `/api/health` -> `{"ok":true,"db":"ok","status":"ok","service":"care-one-api","d1":true}`
- **Hosting Stack**: 100% Cloudflare Free Tier ($0/month): Cloudflare Workers + D1 (`careone-db` and `careone-files`) + Cloudflare Queues + Cron Triggers. Zero external compute, zero Supabase dependencies.

---

## 🎯 Architecture & MVP Authentication Decision

The platform authentication model has been unified to **USERNAME + PASSWORD ONLY** for all users (patients and hospital staff):
- **No Passkeys / WebAuthn**: Removed all biometric prompts, device credentials, and `@simplewebauthn` dependencies.
- **No Staff TOTP MFA / AAL2**: Removed Google Authenticator / 6-digit TOTP requirements.
- **No OTP, SMS, or Email Codes**: Login is never open, but completely free of SMS/email friction.
- **Strict Free-Tier CPU Budget (< 10 ms)**: Password hashing uses native WebCrypto `PBKDF2` with SHA-256 and **50,000 iterations**, bench-tested at ~5.08 ms CPU time under Cloudflare Workers.
- **Constant-Time Comparison**: Hash verification executes in constant time using `crypto.subtle` byte comparison to prevent timing side-channel attacks.
- **Password Rules**: Minimum 8 characters, cannot equal username, blocks the top 100 most common passwords.

---

## 👥 Demo Accounts (Demo Only)

All demo accounts are fictional and seeded into both local and live remote D1 databases (`careone-db`) with initial password `DemoPassword123!` and `must_change_password = 0`:

| Role | Name | Username (Staff Email / Patient MRN) | Password | Notes |
|---|---|---|---|---|
| **Hospital Admin** | Anand Verma | `admin@example.com` | `DemoPassword123!` | Operational dashboard & staff password resets |
| **Front Desk** | Anjali Nair | `desk@example.com` | `DemoPassword123!` | Patient registration, appointments & patient password resets |
| **Doctor (General Medicine)** | Dr. Rahul Menon | `dr.rahul@example.com` | `DemoPassword123!` | Attending doctor on Arun Kumar's care team |
| **Specialist (Cardiology)** | Dr. Anjali Sharma | `dr.anjali@example.com` | `DemoPassword123!` | Cardiology specialist; department-scoped encounters |
| **Doctor (Ortho)** | Dr. Thomas Varghese | `dr.thomas@example.com` | `DemoPassword123!` | Unlinked doctor; break-glass emergency access |
| **Patient (Self)** | Arun Kumar | `ABC-1001` | `DemoPassword123!` | Patient portal; vitals, records & care plan |
| **Guardian** | Sujatha Nair | `ABC-1002` | `DemoPassword123!` | Guardian of Baby Meenakshi (`ABC-1003`) |

> [!NOTE]
> In production with real patients, newly created accounts receive a temporary password (`Temp#...`) and are strictly required to choose a new password upon first login before accessing any records.

---

## 🔐 Security Gates & Access Invariants

1. **Lockout Protection**: 5 consecutive failed login attempts automatically locks the account for 15 minutes (`locked_until`). 6th attempt returns HTTP 429.
2. **Timing Uniformity**: Non-existent usernames and incorrect passwords return the exact same generic error: `"Invalid username or password"` (HTTP 401).
3. **Session Cookies**:
   - Staff: 12-hour session duration (`Max-Age=43200`).
   - Patients: 30-day session duration (`Max-Age=2592000`).
   - Cookie flags: `HttpOnly`, `Secure`, `SameSite=Strict`.
4. **Forced Password Change Barrier**: While `must_change_password = 1`, all clinical and administrative routes return `403 {"error": "password_change_required"}` until `POST /api/me/password` is called.
5. **Instant Invalidation**: Password updates increment `session_version`, instantly invalidating sessions on all other devices.
6. **Active User Enforcement**: Every API request checks `is_active = 1` in D1. Deactivating a user immediately blocks all active sessions (`401 account_inactive`).
7. **DPDP Compliance & Shielding**:
   - Admin cannot access clinical records (routes return 404; admin dashboard returns aggregate numbers only).
   - Unlinked doctors receive 404 when requesting an unassigned patient chart until 4-hour emergency break-glass is executed with written justification.
   - Zero patient data is ever returned without a valid session (HTTP 401).

---

## 📱 Live Verification Walkthrough

To verify the platform on a desktop browser or mobile phone:

### 1. Patient Portal Walkthrough (Mobile / Desktop)
1. Navigate to: `https://care-one.syam18official.workers.dev/patient/login`
2. Enter **Hospital number or phone**: `ABC-1001`
3. Enter **Password**: `DemoPassword123!` (use the eye icon toggle to reveal/hide password).
4. Click **Sign In**.
5. You are redirected to `/patient/home`:
   - View recent visits, prescriptions, lab reports, and care plan.
   - Switch language to **മലയാളം** via the top toggle.

### 2. Hospital Staff Portal Walkthrough
1. Navigate to: `https://care-one.syam18official.workers.dev/staff/signin`
2. Sign in as Doctor (`dr.rahul@example.com` / `DemoPassword123!`).
3. You are redirected to `/doctor/today` (OPD queue).
4. Click on **Arun Kumar** (`ABC-1001`) to open the interactive clinical chart.
5. Review allergies, conditions, and past consultation notes.
6. Sign out using the user menu.

### 3. Front Desk Patient Password Reset Walkthrough
1. Sign in as Front Desk (`desk@example.com` / `DemoPassword123!`).
2. Navigate to the patient directory or open Arun Kumar's chart.
3. Click **"Create login / Reset password"**.
4. The system generates a 12-character temporary password (e.g., `Temp#X7K9M2P`) and displays it once on screen with a **Copy** button.
5. In a private/incognito window, go to `/patient/login` and sign in as `ABC-1001` with the temporary password.
6. The application blocks portal access and immediately opens the **Set New Password** modal.
7. Enter a new password satisfying all complexity rules (min 8 characters, != username).
8. Once saved, the portal unlocks immediately and displays the patient home screen.

### 4. Emergency CLI Password Reset Tool
If an administrator or staff member ever forgets their password, reset it securely from your laptop terminal without exposing any HTTP route:
```powershell
npm run set-password -- --username admin@example.com --remote
```
To run automated end-to-end tests against the live Cloudflare production API:
```powershell
npm run test:live-auth
```

---

## ✅ Quality & Test Gate Status

- **Automated Vitest Test Suite**: 43 test suites, 204 tests passing (100% pass rate).
- **TypeScript Strictness**: `npm run typecheck` passes with 0 errors.
- **ESLint Compliance**: `npm run lint` passes with 0 errors.
- **Bilingual i18n Symmetry**: `npm run i18n:check` passes with 100% symmetry across 469 keys.
- **Production Build**: `npm run build` generates optimized client bundle and Service Worker in < 1 second.
- **Live Production Proofs**: 9 out of 9 end-to-end HTTP verification proofs passed against `https://care-one.syam18official.workers.dev`.
