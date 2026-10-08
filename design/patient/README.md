# CareOne Patient App Design Specification & Coverage Analysis

**Design Source**: Patient UI code provided by user  
**Saved Code**: [`design/patient/code/patient-app-reference.tsx`](code/patient-app-reference.tsx)  
**Date**: 2026-10-08  

---

## 1. Design System & Theme Foundations

### Color Tokens
- `--paper`: `#F2F4EF` (Soft Kerala warm off-white / parchment background)
- `--ink`: `#173327` (Deep forest ink for primary text and titles)
- `--ink2`: `#4A5F56` (Medium forest slate for secondary text)
- `--ink3`: `#5E7168` (Muted sage for tertiary text, metadata and timestamps)
- `--leaf`: `#1F6B4F` (Primary deep herbal green brand color)
- `--leafd`: `#154D39` (Primary hover / dark shade)
- `--leaft`: `#E2EEE7` (Light herbal green tint for tags, icons, badges)
- `--zari`: `#C9A43B` (Traditional Kerala gold zari band accent)
- `--zarit`: `#F7EED6` (Soft gold tint)
- `--zarii`: `#76570F` (Dark gold for text on zari tint)
- `--lat`: `#B23F2C` (Laterite terracotta red for emergency / warnings / missed)
- `--latt`: `#F9E5E0` (Soft terracotta tint)
- `--line`: `#DCE3DD` (Subtle boundary borders)
- `--mist`: `#EBEFEB` (Neutral secondary surface)

### Visual Elements
- **Zari Band**: Traditional dual-stripe gold accent line (`12px` height) applied to headers, ID cards, and tickets.
- **Brand Logo**: Rounded emerald badge with white "ABC" lettering and gold zari base stripes.
- **Typography**: `Anek Malayalam`, `Noto Sans Malayalam`, and clean system fallbacks with variable font width adjustments (`wdth 116` / `100`).
- **Interactive Controls**:
  - Segmented controls (`.seg`): Pill container with sliding active white card.
  - Buttons (`.btn`): 52px min-height, 16px radius, tactile active compression (`transform: scale(0.97)`).
  - Appointment Ticket (`.ticket`): Deep leaf green card with dashed perforation stub, countdown badge, and cut-out circular notches.
  - Bottom Bar (`.bnav`): 5-slot navigation bar with elevated circular center FAB (`+` button).
  - Sticky Desktop Sidebar (`.side`): Professional clinical sidebar with emergency casualty hotline widget.

---

## 2. Screen & Feature Coverage Matrix

| Required Patient Screen | Status in Reference Code | Implementation Component | Notes |
| :--- | :--- | :--- | :--- |
| **1. Sign-in with email code** | **Covered** | `SignIn` & `Otp` | Phone/Email toggle, security check badge, 6-digit input boxes, resend timer, message auto-fill preview. |
| **2. Consent** | **Covered** | `Consent` | 5 DPDP Act principles (What, Why, Who, Where, Choices), version tag, grievance email, agree checkbox. |
| **3. Home Screen** | **Covered** | `HomeS` (`Ticket`, `Prep`, `Meds`, `ReadTiles`, `Recent`, `Install`, `Sos`) | Greeting with date, next appointment ticket, pre-visit checklist, medication schedule timeline, vitals tiles with sparklines, recent reports, PWA install prompt, emergency banner. |
| **4. Records & Reports** | **Covered** | `RecordsS` (`ReportsT`, `ReportSheet`, `UploadSheet`) | Tabbed records view: searchable reports with review badges, extracted key values, PDF/JPG thumbnail, and 60-second secure temporary download links. |
| **5. Care Plan** | **Covered** | `PlanS` | 7-day adherence rings, doctor-prescribed active meds, lab test schedule, vitals logging schedule, lifestyle instructions, and follow-up appointment link. |
| **6. Log a Reading** | **Covered** | `ReadingSheet` | Multi-vital logger (Blood Pressure with systolic/diastolic/pulse; Blood Sugar with fasting/post-meal; Weight) with plausibility boundaries and out-of-target warnings. |
| **7. Report a Symptom** | **Covered** | `SymptomSheet` | 24/7 non-emergency notice, direct 112 and casualty telephone buttons, red-flag warning triggers (chest pain/shortness of breath), symptom chips, free text, duration, severity. |
| **8. Profile** | **Covered** | `MeS` (`IdCard`, family switch, settings) | Digital hospital ID card with MRN, family member switcher with instant toast, emergency casualty hotlines, language toggle (EN/ML), font size, sign out confirmation. |
| **9. Notification Permission** | **Covered** | `RemS` & `MeS` | Push notification toggle, email fallback toggle, lock-screen notification preview mockup. |

**Coverage Conclusion**: **100% of required patient screens are covered in the design code.** No supplementary agent-designed screens are needed.

---

## 3. Plan for Implementation

### Step 3 Scope: Scope Theme & Rebuild First Two Screens
1. **Patient Theme Foundation**:
   - Scope the CSS variables and classes to `.patient-portal` so staff and admin portals remain completely unaffected.
   - Load `Anek Malayalam` Google font in `index.html` (with updated CSP).
2. **Rebuild First Two Screens**:
   - **Screen 1: Patient Sign-In & OTP Flow** (`/login` patient tab or dedicated patient route).
   - **Screen 2: Patient Home Screen** (`/patient` or `/portal`).
3. **Verification**:
   - Automated checks (`typecheck`, `lint`, `test`, `i18n:check`, `build`).
   - Screenshots captured at 390px (mobile) and desktop (1280x800) in both English and Malayalam.
   - Stop and await `"Approved: patient design"`.
