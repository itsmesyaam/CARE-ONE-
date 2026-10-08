# UI Gap & Redesign Review: CareOne vs DoctorCare Reference Design

**Reference File**: `DoctorCare Home Page – Home — desktop.html` (Provided by User)  
**Date**: 2026-10-08  
**Scope Completed**: Phase 2 (Design Foundation) & Phase 3 (First Two Screens: Main Home & Login)  
**Status**: Ready for User Review — **Stopped awaiting "Approved: UI direction"**

---

## 1. Design Foundation & Tokens Implemented

| Category | DoctorCare Reference Value | Implemented in CareOne | Implementation Details |
| :--- | :--- | :--- | :--- |
| **Primary Typography** | `Plus Jakarta Sans` (400, 500, 600, 700, 800) | `font-family: 'Plus Jakarta Sans', system-ui, sans-serif` | Loaded via Google Fonts in `index.html`, CSP updated |
| **Editorial Accent Font** | `Instrument Serif` (Italic, 400) | `.serif { font-family: 'Instrument Serif', Georgia, serif; font-style: italic; }` | Used for expressive hero accents ("*in one place.*") |
| **Monospace / Code Font** | `JetBrains Mono` (500, 700) | `.mono { font-family: 'JetBrains Mono', monospace; }` | Used for pill tags, OTP codes, and build stamp hashes |
| **Surface Background** | `#F4F6FB` | `body { background-color: #F4F6FB; }` | Clean, cool clinical surface |
| **Primary Ink** | `#0B1533` | `color: #0B1533;` | High-contrast deep navy ink meeting WCAG AAA |
| **Primary Brand Blue** | `#2B59FF` | `bg-[#2B59FF]`, hover: `#1F47E6` | Vibrant royal cobalt (customizable via hospital_settings) |
| **Muted Secondary Ink** | `#6B7596` | `text-[#6B7596]` | High-legibility slate for subtext and descriptions |
| **Success / Live Pill** | `#15803D` on `#E8F7EE` | `.live` pulsing dot with emerald badge | Live OPD status indicator |
| **Card Radius & Shadow** | Radius: `26px`; Shadow: `0 16px 34px -20px rgba(11,21,51,0.35)` | `.card-dc` | Floating cards with smooth hover elevation (`translateY(-4px)`) |
| **Pill Elements** | Radius: `999px`; Height: `44px` | `.btn-pill`, rounded-full buttons & badges | 44px minimum tap targets across all viewports |
| **Subtle Borders** | `rgba(11, 21, 51, 0.08)` | `border-[rgba(11,21,51,0.08)]` | Soft alpha borders without heavy grey lines |

---

## 2. Screenshot Comparison Evidence

### A. Main Home Screen

| Viewport / Language | Reference Design | Before (Old UI) | After (DoctorCare Match) |
| :--- | :--- | :--- | :--- |
| **Desktop (1280x800) English** | [Reference Desktop](screenshots/reference-home-desktop.png) | [Before Desktop](screenshots/local-preview-home-desktop.png) | [After Desktop EN](screenshots/after-home-desktop-en.png) |
| **Desktop (1280x800) Malayalam** | N/A (English reference only) | [Before Desktop](screenshots/local-preview-home-desktop.png) | [After Desktop ML](screenshots/after-home-desktop-ml.png) |
| **Mobile (390px) English** | [Reference Mobile](screenshots/reference-home-mobile.png) | [Before Mobile](screenshots/local-preview-home-mobile.png) | [After Mobile EN](screenshots/after-home-mobile-en.png) |
| **Mobile (390px) Malayalam** | N/A (English reference only) | [Before Mobile](screenshots/local-preview-home-mobile.png) | [After Mobile ML](screenshots/after-home-mobile-ml.png) |

#### Home Screen Key Improvements:
1. **Floating Pill Header**: Replaced rigid rectangular navbar with floating pill navigation featuring hospital logo, live OPD indicator with glowing pulsing beacon (`.live`), bilingual language switch, and pill CTA.
2. **Editorial Hero Typography**: Styled headline *"Everything a visit needs, in one place."* with italic `Instrument Serif` in cobalt blue, backed by a medical vault badge.
3. **DoctorCare Portal Cards**:
   - Elevated cards with 26px radius, subtle border, and card hover physics (`translateY(-4px)`).
   - Monospace pill category tags (`PATIENT ACCESS · OTP CODE`, `CLINICAL STAFF · MFA 2FA`).
   - Circular action button with arrow rotation on hover (`rotate(-45deg)`).
   - Clear distinction between Patient Portal and Clinical Staff Console.
4. **Hospital Contact & DPDP Compliance Bar**: Added quick contact bar (phone, email, Kochi location) and DPDP Act compliance shield badge.
5. **Mobile Responsiveness (390px)**: Zero horizontal scrolling; responsive navbar with `min-w-0` and `shrink-0` prevents truncation in both English and Malayalam.

---

### B. Login Screen

| Viewport / Language | Reference Design / Spec | Before (Old UI) | After (DoctorCare Match) |
| :--- | :--- | :--- | :--- |
| **Desktop (1280x800) Patient Tab (EN)** | DoctorCare Segmented Card | [Before Patient Desktop](screenshots/local-preview-login-patient-desktop.png) | [After Patient Desktop EN](screenshots/after-login-patient-desktop-en.png) |
| **Desktop (1280x800) Staff Tab (EN)** | DoctorCare Segmented Card | [Before Staff Desktop](screenshots/local-preview-login-staff-desktop.png) | [After Staff Desktop EN](screenshots/after-login-staff-desktop-en.png) |
| **Desktop (1280x800) Malayalam** | DoctorCare Segmented Card | [Before Desktop](screenshots/local-preview-login-staff-desktop.png) | [After Desktop ML](screenshots/after-login-desktop-ml.png) |
| **Mobile (390px) Patient Tab (EN)** | DoctorCare Mobile View | [Before Patient Mobile](screenshots/local-preview-login-patient-desktop.png) | [After Patient Mobile EN](screenshots/after-login-patient-mobile-en.png) |
| **Mobile (390px) Staff Tab (EN)** | DoctorCare Mobile View | [Before Staff Mobile](screenshots/local-preview-login-staff-mobile.png) | [After Staff Mobile EN](screenshots/after-login-staff-mobile-en.png) |
| **Mobile (390px) Malayalam** | DoctorCare Mobile View | [Before ML Mobile](screenshots/local-preview-login-malayalam-mobile.png) | [After Mobile ML](screenshots/after-login-mobile-ml.png) |

#### Login Screen Key Improvements:
1. **Floating Navigation Header**: Minimal floating header with back-to-home navigation pill, hospital name, and language selector.
2. **Elevated Card Container**: 26px rounded corners, subtle alpha border (`rgba(11,21,51,0.08)`), and soft ambient shadow.
3. **Pill Segmented Control**: Segmented toggle between Patient Sign-In and Staff Sign-In with smooth active indicator and icons.
4. **Modern Form Controls**: Friendly input fields with 12px rounded corners, leading icons (`Mail`, `Lock`), clean label typography, and high-visibility focus states.
5. **44px Pill Submit Button**: Royal cobalt `#2B59FF` button with hover transform and active states meeting tap target accessibility standards.
6. **Demo Accounts Grid**: Restyled 4-box demo account chips (`Patient`, `Doctor`, `Front Desk`, `Admin`) with clickable prefill functionality.
7. **Bilingual Malayalam Support**: Malayalam text formatted with adequate line-height and letter-spacing to prevent awkward breaks or truncation at 390px.

---

## 3. Verification & Acceptance Checklist

| Check | Command / Rule | Result | Evidence |
| :--- | :--- | :--- | :--- |
| **TypeScript** | `npm run typecheck` | Passed | Zero errors across entire project (`tsc --noEmit`) |
| **ESLint** | `npm run lint` | Passed | Clean (`eslint .`) |
| **Unit & Integration Tests** | `npm test` | Passed | 16 test files passed, 61 tests passed |
| **Bilingual Symmetry** | `npm run i18n:check` | Passed | 143 translation keys symmetric between EN and ML |
| **Production Build** | `npm run build` | Passed | `@tailwindcss/vite` integrated; 51 kB compiled CSS; PWA assets generated |
| **Security & Secrets** | Git status & rule check | Passed | Zero secrets, zero `.env` files, no clinical logic touched |
| **Mobile Layout (390px)** | Playwright inspection | Passed | No overflow, tap targets >= 44px, clean wrapping |

---

## 4. Current State & Next Steps

As requested in rule **"3. FIRST TWO SCREENS, THEN STOP"**:
- The Main Home screen and Login screen have been redesigned to match the DoctorCare reference design.
- Before, after, and reference screenshots have been captured at desktop (1280x800) and phone (390px) in both English and Malayalam.
- All code and asset modifications are verified locally and ready.

**Work is now STOPPED.** Waiting for the user's explicit command:
> **"Approved: UI direction"**
