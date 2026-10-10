# Patient Portal UI Verification Report

## 1. Overview
In accordance with user instructions, the visual design and styling for the **PATIENT side of CareOne** has been completely overhauled to match the user's reference specification (`design/patient/code/patient-app-reference.jsx`).

- **Theme Isolation:** Scoped strictly under `.patient-theme`. All doctor, front-desk, and hospital admin screens remain completely untouched.
- **Design Tokens Applied:**
  - Background: `--paper: #F2F4EF` (Kerala parchment off-white)
  - Primary text: `--ink: #173327` (Deep forest ink)
  - Supporting text: `--ink2: #4A5F56`, `--ink3: #5E7168`
  - Primary green: `--leaf: #1F6B4F`, `--leafd: #154D39`, `--leaft: #E2EEE7`
  - Accent gold: `--zari: #C9A43B`, `--zarit: #F7EED6`, `--zarii: #76570F` (Kasavu/Zari gold dual-stripe borders)
  - Emergency red: `--lat: #B23F2C`, `--latt: #F9E5E0` (Laterite red casualty banner)
  - Borders & dividers: `--line: #DCE3DD`, `--mist: #EBEFEB`
  - Typography: Google Font `Anek Malayalam` + `Noto Sans Malayalam` loaded in `index.html` with tabular numerals and Malayalam variable widths (line-height `1.62` under `.ml`).
  - Minimum tap targets: `>= 44px` on all mobile controls.

---

## 2. Coverage Analysis (9 Patient Screens)
All 9 required screens are covered in the user's reference design code:
1. **Sign-in with email code:** Covered (Welcome view, phone/email input, 6-digit OTP keypad).
2. **Consent (DPDP statutory items):** Covered (5 DPDP points: What we use, Why, Who can see, Where it's kept, Your rights).
3. **Home:** Covered (greeting, next visit appointment ticket with circular cut-outs, today's medicines timeline with timing dots, vitals sparklines, prep checklist, emergency casualty banner).
4. **Records & Reports:** Covered (report list, test status tags, report viewer modal, upload sheet).
5. **Care plan:** Covered (daily routine, diet restrictions, doctor instructions).
6. **Log a reading:** Covered (blood pressure, fasting sugar, weight with context tag).
7. **Report a symptom:** Covered (symptom multi-select, severity scale, 112 emergency alert banner).
8. **Profile & family profiles:** Covered (family switcher between Anjali and Aarav, language toggle, text size, push/email notification toggles, sign out).
9. **Notification permissions:** Covered (web push and email notification toggles).

---

## 3. Real Data vs. Sample Data Breakdown (Patient Home)
To strictly follow DPDP safety rules and user constraints:
- Any feature not yet connected to production Postgres tables uses typed placeholder data from `src/features/patient/mock.ts` and displays a visible **`SAMPLE`** badge in the UI.

| Element | Data Source | Status / Implementation |
| :--- | :--- | :--- |
| **User Authentication & Session** | Real Supabase Auth | Session check and route guards via `src/features/auth/` |
| **Language Toggle (EN / ML)** | Real client state | Integrated with `i18next` and scoped `.ml` typography |
| **Emergency Casualty & Help Contacts** | Real / Settings Schema | Links directly to 112 / casualty contact lines |
| **Appointment Ticket (Dr. Rahul Nair)** | `src/features/patient/mock.ts` | **Sample** (`SAMPLE` badge displayed on header & card) |
| **Today's Medication Timeline** | `src/features/patient/mock.ts` | **Sample** (`SAMPLE` badge displayed; marks doses interactively in state) |
| **"Before your visit" Prep Checklist** | `src/features/patient/mock.ts` | **Sample** (`SAMPLE` badge displayed) |
| **Vitals Readings Sparklines (BP, Sugar)** | `src/features/patient/mock.ts` | **Sample** (interactive SVG sparklines with high/low bounds) |
| **Family Profiles (Anjali / Aarav)** | `src/features/patient/mock.ts` | **Sample** (interactive profile switcher modal) |
| **Notification Badge (5 unread)** | `src/features/patient/mock.ts` | **Sample** |

---

## 4. Screenshot Evidence: First Two Screens

### A. Patient Sign-In (Desktop - 1280x800)
| Language | Before (Previous Generic UI) | Reference Design Code | Implemented (After) |
| :--- | :--- | :--- | :--- |
| **English** | `docs/review/screenshots/local-login-patient-desktop.png` | `docs/review/screenshots/patient-design-signin-desktop-en.png` | `docs/review/screenshots/patient-after-signin-desktop-en.png` |
| **Malayalam** | `docs/review/screenshots/after-login-desktop-ml.png` | `docs/review/screenshots/patient-design-signin-desktop-ml.png` | `docs/review/screenshots/patient-after-signin-desktop-ml.png` |

### B. Patient Sign-In (Mobile - 390x844)
| Language | Before (Previous Generic UI) | Reference Design Code | Implemented (After) |
| :--- | :--- | :--- | :--- |
| **English** | `docs/review/screenshots/local-login-patient-mobile.png` | `docs/review/screenshots/patient-design-signin-mobile-en.png` | `docs/review/screenshots/patient-after-signin-mobile-en.png` |
| **Malayalam** | `docs/review/screenshots/local-login-malayalam-mobile.png` | `docs/review/screenshots/patient-design-signin-mobile-ml.png` | `docs/review/screenshots/patient-after-signin-mobile-ml.png` |

### C. Patient Home Screen (Desktop - 1280x800)
| Language | Before (Previous Generic UI) | Reference Design Code | Implemented (After) |
| :--- | :--- | :--- | :--- |
| **English** | `docs/review/screenshots/local-home-desktop.png` | `docs/review/screenshots/patient-design-home-desktop-en.png` | `docs/review/screenshots/patient-after-home-desktop-en.png` |
| **Malayalam** | `docs/review/screenshots/after-home-desktop-ml.png` | `docs/review/screenshots/patient-design-home-desktop-ml.png` | `docs/review/screenshots/patient-after-home-desktop-ml.png` |

### D. Patient Home Screen (Mobile - 390x844)
| Language | Before (Previous Generic UI) | Reference Design Code | Implemented (After) |
| :--- | :--- | :--- | :--- |
| **English** | `docs/review/screenshots/local-home-mobile.png` | `docs/review/screenshots/patient-design-home-mobile-en.png` | `docs/review/screenshots/patient-after-home-mobile-en.png` |
| **Malayalam** | `docs/review/screenshots/after-home-mobile-ml.png` | `docs/review/screenshots/patient-design-home-mobile-ml.png` | `docs/review/screenshots/patient-after-home-mobile-ml.png` |

---

---

## 5. Screen 1: Care Plan Screen (Implemented)

### A. Real Data vs. Sample Data Breakdown (Care Plan)
| Element | Data Source | Status / Implementation |
| :--- | :--- | :--- |
| **Originating Doctor & Review Target** | `src/features/patient/mock.ts` | **Sample** (`Dr. Rahul Nair`, review `15 Oct 2026`) |
| **Locked Plan Notice** | Statutory DPDP note | Semantic `<div role="note">` with `<Lock>` |
| **7-Day Adherence Rings** | `src/features/patient/mock.ts` | **Sample** (`Ring` SVG indicators, 25 of 28 doses taken) |
| **Active Medicines List** | `src/features/patient/mock.ts` | **Sample** (Metformin, Amlodipine, Atorvastatin with dosage dots and food guidance) |
| **Lab Tests Due / Uploaded** | `src/features/patient/mock.ts` | **Sample** (HbA1c due on 12 Oct with upload button; Lipid profile uploaded) |
| **Target Readings to Log** | `src/features/patient/mock.ts` | **Sample** (BP, fasting sugar with frequency, next due date, missed tags) |
| **Doctor Instructions** | `src/features/patient/mock.ts` | **Sample** (30 min walking, low salt/pickles/papadam, hydration) |
| **Follow-up Visit Card** | `src/features/patient/mock.ts` | **Sample** (Thu 15 Oct 10:30 AM, Dr. Rahul Nair, OP Block B) |

### B. Screenshot Evidence: Care Plan Screen

#### Care Plan (Desktop - 1280x800)
| Language | Design Reference | Implemented (After) |
| :--- | :--- | :--- |
| **English** | `docs/review/screenshots/patient-design-plan-desktop-en.png` | `docs/review/screenshots/patient-after-plan-desktop-en.png` |
| **Malayalam** | `docs/review/screenshots/patient-design-plan-desktop-ml.png` | `docs/review/screenshots/patient-after-plan-desktop-ml.png` |

#### Care Plan (Mobile - 390x844)
| Language | Design Reference | Implemented (After) |
| :--- | :--- | :--- |
| **English** | `docs/review/screenshots/patient-design-plan-mobile-en.png` | `docs/review/screenshots/patient-after-plan-mobile-en.png` |
| **Malayalam** | `docs/review/screenshots/patient-design-plan-mobile-ml.png` | `docs/review/screenshots/patient-after-plan-mobile-ml.png` |

---

## 6. Screen 2: Records & Reports Screen (Implemented)

### A. Real Data vs. Sample Data Breakdown (Records & Reports)
| Element | Data Source | Status / Implementation |
| :--- | :--- | :--- |
| **Reports List (Monthly grouped)** | `src/features/patient/mock.ts` | **Sample** (`SAMPLE` badge displayed; grouped by October, September, August) |
| **Category Filter & Search** | Interactive Client State | Filters by query and categories (`All`, `Reviewed`, `Waiting review`, `By you`) |
| **Status Badges** | `src/features/patient/mock.ts` | **Sample** (`tag-leaf` with badge check for Reviewed; `tag-zari` with clock for Waiting review) |
| **Report Viewer Modal (`ReportSheetModal`)** | `src/features/patient/mock.ts` | **Sample** (renders document preview, doctor review note, key values table, open/download buttons) |
| **Upload Sheet Modal (`UploadSheetModal`)** | Client Validation + State | Real client-side format (`PDF`, `JPG`, `PNG`) and size check (`<= 10 MB`), step progress simulation |
| **DPDP / Storage in India Notice** | Statutory DPDP note | Semantic `<div role="note">` with ShieldCheck / Lock icon |
| **Vitals Readings Tab (`readings`)** | `src/features/patient/mock.ts` | **Sample** (BP history list with systolic/diastolic values and target badges) |
| **Medicines Tab (`meds`)** | `src/features/patient/mock.ts` | **Sample** (Active prescriptions list with dosage, prescribing doctor, and lock note) |
| **Visits Tab (`visits`)** | `src/features/patient/mock.ts` | **Sample** (Signed clinical consultation notes with immutable notice) |
| **Health Summary Tab (`summary`)** | `src/features/patient/mock.ts` | **Sample** (Active conditions and documented allergies list) |

### B. Screenshot Evidence: Records & Reports Screen

#### Records & Reports (Desktop - 1280x800)
| Language | Design Reference | Implemented (After) |
| :--- | :--- | :--- |
| **English** | `docs/review/screenshots/patient-design-records-desktop-en.png` | `docs/review/screenshots/patient-after-records-desktop-en.png` |
| **Malayalam** | `docs/review/screenshots/patient-design-records-desktop-ml.png` | `docs/review/screenshots/patient-after-records-desktop-ml.png` |

#### Records & Reports (Mobile - 390x844)
| Language | Design Reference | Implemented (After) |
| :--- | :--- | :--- |
| **English** | `docs/review/screenshots/patient-design-records-mobile-en.png` | `docs/review/screenshots/patient-after-records-mobile-en.png` |
| **Malayalam** | `docs/review/screenshots/patient-design-records-mobile-ml.png` | `docs/review/screenshots/patient-after-records-mobile-ml.png` |

#### Interactive Modals (Desktop)
| Modal Type | Screenshot Artifact | Key Features |
| :--- | :--- | :--- |
| **Report Viewer Modal** | `docs/review/screenshots/patient-after-records-report-modal.png` | Key clinical values table, elevated rust values, doctor sign-off badge, file actions |
| **Upload Sheet Modal** | `docs/review/screenshots/patient-after-records-upload-modal.png` | Camera / file picker cards, <=10MB validator, DPDP India vault storage notice |

---

## 7. Screen 3: Log a Reading Sheet Modal (Implemented)

### A. Real Data vs. Sample Data Breakdown (Log a Reading Sheet)
| Element | Data Source | Status / Implementation |
| :--- | :--- | :--- |
| **Metric Selector (`bp`, `sugar`, `weight`)** | Client Interactive State | Segmented pill control (`.seg`) with icons and localized labels |
| **Blood Pressure Inputs (`sys`, `dia`, `pul`)** | Real Client Form State | Number inputs with validation (`60-260 mmHg`, `30-160 mmHg`, `sys > dia`), rest guidance tip |
| **Blood Sugar Inputs & Timing Chips** | Real Client Form State | Big number display (`.num-big`), meal context chips (`fasting`, `2 hrs after food`, `random`) |
| **Weight Input (`wt`)** | Real Client Form State | Big decimal input with `step="0.1"`, kg unit label |
| **Implausible Number Warning** | Dynamic Client Validator | Semantic alert (`role="alert"`) warning when numbers are out of physiological bounds |
| **Elevated Out-of-Range Warning** | Clinical Threshold Rules | Status warning (`role="status"`, `.warn`) flagging when reading exceeds doctor-prescribed goals |
| **Target Normal Range Display** | `d.tg` Prescriptions | Contextual card display (`.lock-note`) showing Dr. Rahul Nair's targets for BP and sugar |
| **Date & Time Selector** | Segmented Control | Options for "Now" vs "Earlier today" with integrated native time picker |
| **Save Reading Action** | Patient Context Database | Appends entry to `d.readings`, clears missed status in `d.logs`, and triggers toast |

### B. Visual Evidence & Side-by-Side Comparison (Screen 3)

#### Log a Reading Sheet (Desktop - 1280x800)
| Language | Design Reference | Implemented (After) |
| :--- | :--- | :--- |
| **English** | `docs/review/screenshots/patient-design-reading-desktop-en.png` | `docs/review/screenshots/patient-after-reading-desktop-en.png` |
| **Malayalam** | `docs/review/screenshots/patient-design-reading-desktop-ml.png` | `docs/review/screenshots/patient-after-reading-desktop-ml.png` |

#### Log a Reading Sheet (Mobile - 390x844)
| Language | Design Reference | Implemented (After) |
| :--- | :--- | :--- |
| **English** | `docs/review/screenshots/patient-design-reading-mobile-en.png` | `docs/review/screenshots/patient-after-reading-mobile-en.png` |
| **Malayalam** | `docs/review/screenshots/patient-design-reading-mobile-ml.png` | `docs/review/screenshots/patient-after-reading-mobile-ml.png` |

#### Detailed Reading States (Desktop)
| State / Metric | Screenshot Artifact | Key Features |
| :--- | :--- | :--- |
| **Blood Sugar + Meal Chips** | `docs/review/screenshots/patient-after-reading-sugar-modal.png` | Big number display, meal context chips, fasting/post-meal target note |
| **Elevated Warning (High BP)** | `docs/review/screenshots/patient-after-reading-warning-modal.png` | Out-of-target warning banner (`152/96 mmHg`), doctor alert note, casualty callout |

---

## 8. Screen 4: Report a Symptom Sheet Modal (Implemented)

### A. Real Data vs. Sample Data Breakdown (Report a Symptom Sheet)
| Element | Data Source | Status / Implementation |
| :--- | :--- | :--- |
| **Emergency SOS Notice** | Legal / Statutory Care Policy | Prominent red callout (`.sos`) stating form is unmonitored 24/7, with direct dial buttons for 112 (`tel:112`) and ABC casualty (`tel:04840000112`) |
| **Symptom Multi-Select Chips** | Interactive Client State | Toggleable symptom chips (`Dizziness`, `Headache`, `Breathlessness`, `Chest pain`, `Swollen feet`, `Tiredness`, `Fever`, `Something else`) with check icons |
| **Red-Flag Clinical Emergency Alert** | Clinical Safety Rules | Semantic alert (`role="alert"`, `.warn`) dynamically displayed when critical symptoms (`Chest pain` or `Breathlessness`) are selected or severity is `Severe` |
| **Description Textarea** | Real Form Input | Multi-line free-text area (`id="sx"`) with placeholder and accessible label |
| **Onset Timing Selector** | Segmented Control | Options for `Today`, `Yesterday`, `2 to 3 days ago`, and `Over a week` |
| **Severity Segmented Control** | Segmented Control (`.seg`) | Tri-state selector: `Mild`, `Moderate`, `Severe` |
| **Submit Symptom Action** | Patient Context Database | Appends entry to `d.symptoms` with review status `wait` (Waiting review), updates Health Summary, and fires confirmation toast |
| **Health Summary Review List** | `PatientRecords.tsx` | Displays patient's reported symptoms alongside conditions & allergies with doctor review status tags (`tag-leaf` vs `tag-zari`) |

### B. Visual Evidence & Side-by-Side Comparison (Screen 4)

#### Report a Symptom Sheet (Desktop - 1280x800)
| Language | Design Reference | Implemented (After) |
| :--- | :--- | :--- |
| **English** | `docs/review/screenshots/patient-design-symptom-desktop-en.png` | `docs/review/screenshots/patient-after-symptom-desktop-en.png` |
| **Malayalam** | `docs/review/screenshots/patient-design-symptom-desktop-ml.png` | `docs/review/screenshots/patient-after-symptom-desktop-ml.png` |

#### Report a Symptom Sheet (Mobile - 390x844)
| Language | Design Reference | Implemented (After) |
| :--- | :--- | :--- |
| **English** | `docs/review/screenshots/patient-design-symptom-mobile-en.png` | `docs/review/screenshots/patient-after-symptom-mobile-en.png` |
| **Malayalam** | `docs/review/screenshots/patient-design-symptom-mobile-ml.png` | `docs/review/screenshots/patient-after-symptom-mobile-ml.png` |

#### Critical Clinical Alert State (Desktop)
| State / Scenario | Screenshot Artifact | Key Features |
| :--- | :--- | :--- |
| **Red-Flag Emergency Warning** | `docs/review/screenshots/patient-after-symptom-redflag-modal.png` | Triggered on Chest Pain / Breathlessness / Severe; instructs immediate call to 112/casualty without waiting for app response |

---

## 9. Screen 5: Profile Screen (Implemented)

### A. Real Data vs. Sample Data Breakdown (Profile)
| Element | Data Source | Status / Implementation |
| :--- | :--- | :--- |
| **Patient ID Card (`.idcard`)** | `SAMPLE_PEOPLE` / Session | Displays patient name, avatar, DOB, MRN with `.mrn` font, and dual Kasavu gold stripes (`linear-gradient(var(--zari), var(--zari)) 0 0/100% 6px no-repeat, linear-gradient(var(--zari), var(--zari)) 0 9px/100% 2px no-repeat`). Shows phone/email for adult, and guardian for minor. |
| **Family Profile Switcher** | `SAMPLE_PEOPLE` (`mock.ts`) | Interactive list of linked profiles (Anjali Menon / Aarav Menon); switches active account globally (`setPid`), updates records, and fires confirmation toast (`Now viewing Aarav's records`). |
| **Hospital Help Contacts** | Static / Hospital Schema | Direct dial links for Front desk (`tel:04840001234`), 24/7 Casualty (`tel:04840000112`), and Grievance Officer (`mailto:grievance@abchospital.example`). |
| **Language Switcher** | Client State & `i18next` | Segmented control (`.seg-sm`) switching between English and Malayalam with instantaneous UI update and persistence in `localStorage`. |
| **Text Size Selector** | DOM `fontSize` Control | Segmented control (`Default`, `Large`, `Larger`) scaling root font size (`16px`, `17.5px`, `19px`). |
| **Push & Email Notification Switches** | Client State (`push`, `mail`) | Semantic switches (`role="switch"`, `.sw`, `.on`) toggling alerts with toast feedback. |
| **Portal Shortcuts** | Client State / Navigation | Direct links to Privacy & your data notice, Reminders view, and Appointments view. |
| **Sign Out Action** | Supabase Auth / Session | Trigger button opening `ConfirmSheetModal` with clear device data warning, Cancel action, and confirmed sign out redirect. |

### B. Visual Evidence & Side-by-Side Comparison (Screen 5)

#### Profile Screen (Desktop - 1280x800)
| Language | Design Reference | Implemented (After) |
| :--- | :--- | :--- |
| **English** | `docs/review/screenshots/patient-design-profile-desktop-en.png` | `docs/review/screenshots/patient-after-profile-desktop-en.png` |
| **Malayalam** | `docs/review/screenshots/patient-design-profile-desktop-ml.png` | `docs/review/screenshots/patient-after-profile-desktop-ml.png` |

#### Profile Screen (Mobile - 390x844)
| Language | Design Reference | Implemented (After) |
| :--- | :--- | :--- |
| **English** | `docs/review/screenshots/patient-design-profile-mobile-en.png` | `docs/review/screenshots/patient-after-profile-mobile-en.png` |
| **Malayalam** | `docs/review/screenshots/patient-design-profile-mobile-ml.png` | `docs/review/screenshots/patient-after-profile-mobile-ml.png` |

#### Confirmation Dialog State (Desktop)
| State / Scenario | Screenshot Artifact | Key Features |
| :--- | :--- | :--- |
| **Sign Out Confirmation Dialog** | `docs/review/screenshots/patient-after-profile-signout-modal.png` | Scrim overlay, "Sign out of this phone?" dialog, device wipe notice, Cancel & Sign out buttons |

---

## 10. Verification Checklist & Quality Gates
- `npm run typecheck` (`tsc --noEmit`): **PASSED** (0 errors)
- `npm run lint` (`eslint .`): **PASSED** (0 errors, 0 warnings)
- `npm test` (`vitest run`): **PASSED** (21 test files, 85 unit tests)
- `npm run i18n:check`: **PASSED** (181 keys verified with 100% symmetry)
- `npm run build`: **PASSED** (Clean bundle, PWA service worker generated in 577ms)
- `npx supabase test db`: **PASSED** (9 test files, 144 pgTAP tests passed)

---

## 11. Patient Screen Sequence Status
Per instructions, screens are implemented one at a time:
1. [x] **Sign-in & Home screens** (Kerala theme foundation, welcome, OTP, appointment ticket, medicines timeline) - **DONE**
2. [x] **Care plan** (daily routine, medicines, diet restrictions, doctor instructions) - **DONE**
3. [x] **Records and reports** (tabbed view: reports list, test status tags, report viewer modal, upload sheet with file picker or camera, format guidance, size check) - **DONE**
4. [x] **Log a reading sheet** (BP, blood sugar, weight, with normal ranges, time tag, instant feedback) - **DONE**
5. [x] **Report a symptom sheet** (symptom picker, severity slider, date/time, and prominent emergency callout) - **DONE**
6. [x] **Profile** (language switch, family profile switcher with relationship tags, notification toggles, sign out) - **DONE**



