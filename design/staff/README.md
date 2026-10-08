# Doctor and Staff Design Documentation

## Overview
This directory stores the official visual design reference code and assets for the **Doctor and Clinical Staff** portal of ABC Hospital Care Platform.

The reference implementation was provided in three parts (`PART 2A`, `PART 2B`, `PART 2C`), composed as an extension of the Kerala aesthetic established in the patient portal (Anek Malayalam typography, zari borders, forest leaf `#1F6B4F`, deep forest `#154D39`, paper background `#F2F4EF`, and gold `#C9A43B` accents).

---

## 1. Directory Structure
- `design/staff/code/doctor-app-reference.jsx`: Full raw reference implementation (99,039 bytes) provided by the user.
- `design/staff/reference/`: Self-contained runnable preview bundle and rendered reference screenshots.
- `design/staff/README.md`: Screen catalog, architectural coverage audit, and design token specification.

---

## 2. Screen Catalog & Architectural Coverage Audit

| Screen / Flow | In User Design? | Description & Key Elements | Status |
| :--- | :---: | :--- | :--- |
| **1. Staff Sign-In** | **Yes** (`SignIn`) | Email (`DOC.email`), password input with eye toggle, live security check badge (`.secchk`), submit button (`Btn`), admin password reset prompt. | Direct match |
| **2. Two-Factor Verification** | **Yes** (`TwoFA`) | 6-digit code entry boxes (`CodeBoxes`), security reminder (`Patient records stay hidden until this step is done`), lost phone prompt, first-time enroll link. | Direct match |
| **3. Two-Factor Enrollment** | **Yes** (`Enroll`) | 3-step numbered wizard (`.enum`), Authenticator app instructions, QR code (`<QR />`), manual 16-char setup key (`.keybox`) with copy button, verification code test. | Direct match |
| **4. Screen Lock & 10-Min Idle** | **Yes** (`LockScreen`, `IdleWarn`) | Fullscreen dark lockout (`.lockscr`), lock icon, Dr. avatar, password unlock input, "Not you? Sign out" option, floating amber idle countdown banner (`.idle`). | Direct match |
| **5. Doctor Today Screen** | **Yes** (`TodayS`) | Date headline, warm Kerala greeting (`Good morning, Dr. Rahul`), OPD room status, pending count, next patient ticket (`NextCard`), today's clinic schedule (`ClinicList`), waiting queues (`Waiting`). | Direct match |
| **6. Next Patient Ticket Card** | **Yes** (`NextCard`) | Leaf green ticket with zari header, circular ticket cutouts (`.tk-stub::before/after`), patient details (Name, Age, Sex, MRN, Reason), allergy warning banner (`AlertTriangle`), indicators (`Counters`), "Open chart" button, ticket stub with appointment time. | Direct match |
| **7. Today's Clinic List** | **Yes** (`ClinicList`) | Appointment timeline rows, time, patient identity, reason, status tag (`Booked`, `In consultation / Draft`, `Done`, `Cancelled`), indicators for waiting reports/readings/symptoms, next indicator. | Direct match |
| **8. Waiting Queue Summary** | **Yes** (`Waiting`) | Split card for waiting lab reports (days waiting, urgent flags) and waiting reported symptoms (severity badge, days waiting). Direct navigation to review queue. | Direct match |
| **9. Patients Directory** | **Yes** (`PatientsS`) | Directory tab with filter pills (My Care Team vs All Hospital Patients, Department filter), patient search by name/MRN, patient summary cards with last visit, active diagnoses, action counters, emergency access trigger. | Direct match |
| **10. Review Queue** | **Yes** (`ReviewS`) | Dual tabs: "Reports" (`RevSheet` transcription) and "Symptoms" (`SxCard` triage). Lists items needing doctor action with wait times, patient context, and direct chart links. | Direct match |
| **11. Patient Chart** | **Yes** (`ChartS`) | Comprehensive clinical chart: sticky header with allergies and vitals, 5 tabs: **What Changed** since last visit, **Visits** (signed consultation notes with addenda), **Readings** (interactive trend graphs with target bands), **Reports** (lab viewer and uploaded files), **Medicines** (active vs stopped), **Care Plan**. | Direct match |
| **12. Consultation Note Composer** | **Yes** (`Composer`) | 4-step consultation flow: **1. Note** (vitals, reason, findings, diagnoses), **2. Medicines** (dose, timing dots, food chips, automatic allergy alert & duplicate check), **3. Care Plan** (follow-up date picker, lab tests due, home monitoring, instructions), **4. Sign** (summary review & digital signature). Side drawer on desktop, modal sheet on mobile. | Direct match |
| **13. Doctor Account Screen** | **Yes** (`AccountS`) | Profile overview, Medical Council Registration Number (`KMC 48291`), 2FA status, Emergency Break-Glass audit log table (timestamp, patient, reason, duration), notification preferences, sign out confirmation. | Direct match |
| **14. Emergency Access (Break-Glass)** | **Yes** (`GlassSheet`) | 4-hour statutory access window, mandatory clinical rationale input, clear warning that access is logged and alerted to Hospital Admin. Real-time active access badge. | Direct match |
| **15. Signed Note Addendum Sheet** | **Yes** (`AddendumSheet`) | Immutable signed clinical note enforcement. Addendum sheet requires rationale and addendum text. Displays chronologically below original note with doctor name and timestamp. | Direct match |
| **16. System Outage Banner** | **Yes** (`Outage`) | Offline alert banner: "We can't reach the hospital system... Use the paper process until this clears" with direct "Call IT" button (`tel:2200`). | Direct match |

---

## 3. Design Tokens & Styling Specification

### Color Palette
- **Paper Background**: `#F2F4EF` (`--paper`)
- **Primary Ink**: `#173327` (`--ink`) - Deep forest black-green
- **Secondary Ink**: `#4A5F56` (`--ink2`) - Muted slate green
- **Tertiary Ink / Subtext**: `#5E7168` (`--ink3`) - Subtle caption green
- **Leaf Green (Primary)**: `#1F6B4F` (`--leaf`) - Deep Kerala palm green
- **Leaf Dark (Sidebar & Hero)**: `#154D39` (`--leafd`) - Rich dark pine
- **Leaf Tint**: `#E2EEE7` (`--leaft`) - Light mint surface
- **Zari Gold**: `#C9A43B` (`--zari`) - Traditional kasavu zari gold
- **Zari Tint**: `#F7EED6` (`--zarit`) - Warm gold cream
- **Zari Intense**: `#76570F` (`--zarii`) - Deep antique bronze
- **Laterite Red (Urgent / High)**: `#B23F2C` (`--lat`) - Malabar laterite clay red
- **Laterite Tint**: `#F9E5E0` (`--latt`) - Soft coral tint
- **Border Line**: `#DCE3DD` (`--line`) - Soft neutral sage
- **Mist Neutral**: `#EBEFEB` (`--mist`) - Light chip background

### Typography
- **Primary Font**: `Anek Malayalam`, `Noto Sans Malayalam`, system sans-serif.
- **Display Weights**: Variable font width `100` to `125`, font weight `700` (`.disp`, `.greet`, `.h1`).
- **Tabular Figures**: `font-variant-numeric: tabular-nums` (`.num`, `.big-num`).
- **Ticket Stubs**: Bold tabular time displays (`.tk-stub b` at `1.85rem` to `2.9rem`).

### Component Geometry & Surfaces
- **Corner Radii**: Cards (`20px` to `24px`), buttons (`14px` to `16px`), chips (`999px` pill), dialogs (`24px`).
- **Ticket Aesthetics**: `.ticket` with dual semicircular cutouts (`.tk-stub::before` and `.tk-stub::after`), dashed divider line (`2px dashed rgba(255,255,255,0.35)`).
- **Zari Band**: 12px double gold woven band header (`6px` primary bar + `2px` secondary bar).
- **Security Banners**: High-contrast lock notes with inline shield and lock icons.
