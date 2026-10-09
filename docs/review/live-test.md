# Live Demo Inspection Report: https://care-one-h7mc.vercel.app

**Inspection Timestamp**: 2026-10-07 16:40 IST  
**Environment**: Production deployment on Vercel (`https://care-one-h7mc.vercel.app`)  
**Methodology**: Headless Chromium (Playwright) testing across Desktop (1280x800) and Mobile (390x844), HTTP header inspection, static JavaScript bundle reverse analysis, and route reload audits.

---

## Findings (Sorted Most Serious First)

### 1. Critical: Uncaught Startup Crash Due to Missing External Backend Environment Variables
- **Severity**: Critical (Showstopper)
- **Problem**: When Vercel built the project, `VITE_EXTERNAL_URL` and `VITE_EXTERNAL_ANON_KEY` (or `VITE_EXTERNAL_PUBLISHABLE_KEY`) were not configured in the Vercel project environment variables. Because Vite statically inlines environment variables during `npm run build`, the missing variables caused Vite to compile an unconditional fatal error into the main bundle:
  ```javascript
  // Disassembled from /assets/index-C2YT_SA9.js:1:52247
  throw Error("Missing External Backend environment variables");
  ```
- **Evidence / Exact Error Text**:
  ```text
  Missing External Backend environment variables
  Error: Missing External Backend environment variables
      at https://care-one-h7mc.vercel.app/assets/index-C2YT_SA9.js:1:52247
  ```
- **Impact**: This error throws immediately during script evaluation on line 1 of the bundle. As a consequence, JavaScript execution halts completely before React can mount (`createRoot(...).render(...)`), leaving the DOM at `<div id="root"></div>` completely unrendered.

---

### 2. Critical: Conflicting `<meta>` Content-Security-Policy in `index.html` Restricting API Traffic
- **Severity**: Critical (Network Blocker)
- **Problem**: Even if environment variables are injected, live API requests to External Backend will be blocked by the browser. While the HTTP response header from `vercel.json` permits `connect-src 'self' https://*.external-backend.example.com wss://*.external-backend.example.com;`, [`index.html`](file:///d:/CareOne/index.html) contains a hardcoded fallback `<meta>` tag:
  ```html
  <!-- index.html lines 6-9 -->
  <meta
    http-equiv="Content-Security-Policy"
    content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self' http://localhost:* http://127.0.0.1:* ws://localhost:* ws://127.0.0.1:*; object-src 'none'; base-uri 'self';"
  />
  ```
- **Evidence**:
  The meta tag defines `connect-src 'self' http://localhost:* http://127.0.0.1:* ws://localhost:* ws://127.0.0.1:*` without `https://*.external-backend.example.com`. Browsers enforce the most restrictive intersection of both policies, meaning all network calls to remote External Backend instances (`https://kndkohgpbnbbndvtgqvx.external-backend.example.com`) will be rejected by CSP.
- **Impact**: The app will fail to communicate with any remote External Backend database or auth backend in production.

---

### 3. High: Total Render Failure on Both Desktop and Mobile Viewports
- **Severity**: High
- **Problem**: Due to Finding #1, neither the desktop layout nor the phone-sized layout (390 px wide) renders any user interface.
- **Evidence**:
  - Desktop Viewport (`1280x800`): Captured 100% blank white screen. DOM inspector shows empty `<div id="root"></div>`.
  - Mobile Viewport (`390x844`): Captured 100% blank white screen.
  - Screenshots recorded:
    - Desktop Home: `screenshot-desktop-home.png`
    - Mobile 390px Home: `screenshot-mobile-home.png`
    - Admin Route: `screenshot-admin.png`
- **Impact**: Users on both mobile and desktop see a blank white page. Layout responsiveness, cut-off text, and Malayalam font rendering cannot be visually evaluated on the live deployment until the startup crash is resolved.

---

### 4. High: Missing Sign-In Screens & Authentication Flows
- **Severity**: High
- **Problem**: Sign-in screens do not load. Furthermore, inspecting [`src/app/routes.tsx`](file:///d:/CareOne/src/app/routes.tsx) reveals that there are no standalone routes defined for `/login` or `/signin`.
- **Evidence**:
  Navigating to `/login` or `/signin` returns the index HTML (due to SPA rewrites), but the client router has no matched route definition for these paths, falling back to empty matching or the crashing root layout.
- **Impact**: Fictional demo accounts (`admin@example.com`, `dr.rahul@example.com`, `desk@example.com`, `arun.kumar@example.com`) cannot be authenticated on the live web demo.

---

### 5. High: Missing Application Feature Routes (Discrepancy with `docs/PROGRESS.md`)
- **Severity**: High
- **Problem**: A comparison between [`docs/PROGRESS.md`](file:///d:/CareOne/docs/PROGRESS.md) and [`src/app/routes.tsx`](file:///d:/CareOne/src/app/routes.tsx) shows that many completed feature modules are implemented in `src/features/` but are not mapped to router paths in `routes.tsx`:
  - **Front Desk Module** (`Phase 3`): Sequence UHID registration, appointments, patient search. (No route defined).
  - **Doctor Clinical Chart & What Changed** (`Phase 4 & 7`): Patient timeline, allergies, conditions, vitals curves. (No route defined).
  - **Document Review Queue** (`Phase 5`): Lab report upload and review. (No route defined).
  - **Patient / Guardian Companion Portal** (`Phase 6`): Medications schedule by time of day, home vitals logging, profile switching. (No route defined).
- **Evidence**:
  `src/app/routes.tsx` contains only two entries:
  ```typescript
  export const router = createBrowserRouter([
    { path: '/', element: <RootLayout /> },
    { path: '/admin', element: <AdminRouteGuard><AdminDashboard /></AdminRouteGuard> }
  ]);
  ```
- **Impact**: Only `/` and `/admin` can ever be loaded by users; all other clinical and front-desk workflows cannot be reached via navigation.

---

### 6. Low: Occurrence of `sb_secret` in Loaded JavaScript (Confirmed False Positive)
- **Severity**: Low / Informational
- **Investigation**: Scanned all loaded bundles (`index-C2YT_SA9.js`, `vendor-query-BEOjS5Kb.js`, `vendor-charts-D4p-EZSv.js`, `vendor-react-09lvjlTf.js`, `rolldown-runtime-hePW80VL.js`, `registerSW.js`).
- **Evidence**:
  - Found match for `sb_secret` in `/assets/vendor-query-BEOjS5Kb.js`:
    ```javascript
    wo=e=>e.startsWith("sb_publishable_")||e.startsWith("sb_secret_")
    ```
  - **Analysis**: This is internal SDK logic in `external-backend-client` validating API key prefix formats. It is **not** an exposed secret key.
  - **Secret Scan**: Searched for `service_role` and JWT token patterns (`eyJ...`). **Zero secret keys, zero service-role keys, and zero real credentials are baked into the live client code.**

---

### 7. Verified Working: HTTP Security Headers and Vercel SPA Routing
- **Status**: Passed / Operating as Designed
- **Evidence**:
  - **HTTP Response Headers** (Verified on `GET https://care-one-h7mc.vercel.app/`):
    - `content-security-policy`: Present with strict directives matching `vercel.json`.
    - `strict-transport-security`: `max-age=31536000; includeSubDomains` (Present).
    - `x-frame-options`: `DENY` (Present).
    - `x-content-type-options`: `nosniff` (Present).
    - `referrer-policy`: `no-referrer` (Present).
    - `permissions-policy`: `camera=(self), microphone=(), geolocation=()` (Present).
    - `cross-origin-opener-policy`: `same-origin` (Present).
  - **SPA Routing & Direct Reloads**:
    - `GET /` -> HTTP 200
    - `GET /admin` -> HTTP 200 (direct reload succeeds without 404)
    - All tested paths successfully rewrite to `/index.html` via `vercel.json` rewrites.
