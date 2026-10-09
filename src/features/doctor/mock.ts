export interface DoctorProfile {
  id: string;
  name: string;
  dept: string;
  email: string;
  reg: string;
  room: string;
}

export interface PatientSignals {
  rep: number;
  rd: number;
  sx: number;
  miss: number;
  med: number;
}

export interface ClinicPatient {
  id: string;
  name: string;
  age: number;
  sex: 'male' | 'female' | 'other';
  mrn: string;
  reason: string;
  time: string;
  type: string;
  status: 'booked' | 'draft' | 'done' | 'cancel';
  allergies: Array<{ n: string }>;
  signals: PatientSignals;
}

export interface WaitingReportItem {
  id: string;
  patientId: string;
  patientName: string;
  title: string;
  daysWaiting: number;
  urgent?: boolean;
}

export interface WaitingSymptomItem {
  id: string;
  patientId: string;
  patientName: string;
  text: string;
  severity: 'mild' | 'moderate' | 'severe';
  daysWaiting: number;
}

export const MOCK_DOCTOR: DoctorProfile = {
  id: 'doc-1',
  name: 'Dr. Rahul Nair',
  dept: 'General Medicine',
  email: 'dr.rahul@example.com',
  reg: 'KMC 48291',
  room: 'OP Block B, Room 12',
};

export const MOCK_CLINIC_SCHEDULE: ClinicPatient[] = [
  {
    id: 'anjali',
    name: 'Anjali Menon',
    age: 42,
    sex: 'female',
    mrn: 'P-10492',
    reason: 'Follow-up for diabetes and blood pressure',
    time: '10:00 AM',
    type: 'Follow-up',
    status: 'booked',
    allergies: [{ n: 'penicillin' }],
    signals: { rep: 1, rd: 3, sx: 0, miss: 0, med: 0 },
  },
  {
    id: 'vinod',
    name: 'Vinod Kumar',
    age: 56,
    sex: 'male',
    mrn: 'P-09823',
    reason: 'High blood pressure review',
    time: '10:30 AM',
    type: 'Follow-up',
    status: 'booked',
    allergies: [],
    signals: { rep: 0, rd: 1, sx: 0, miss: 0, med: 1 },
  },
  {
    id: 'thankamma',
    name: 'Thankamma Varghese',
    age: 68,
    sex: 'female',
    mrn: 'P-11204',
    reason: 'Breathlessness on exertion',
    time: '11:00 AM',
    type: 'New visit',
    status: 'booked',
    allergies: [{ n: 'sulfa drugs' }],
    signals: { rep: 2, rd: 0, sx: 1, miss: 0, med: 0 },
  },
  {
    id: 'suresh',
    name: 'Suresh Pillai',
    age: 39,
    sex: 'male',
    mrn: 'P-08711',
    reason: 'Annual diabetes review',
    time: '11:30 AM',
    type: 'Follow-up',
    status: 'booked',
    allergies: [],
    signals: { rep: 0, rd: 0, sx: 0, miss: 0, med: 0 },
  },
];

export const MOCK_WAITING_REPORTS: WaitingReportItem[] = [
  {
    id: 'rep-1',
    patientId: 'thankamma',
    patientName: 'Thankamma Varghese',
    title: 'Echocardiogram Report',
    daysWaiting: 4,
    urgent: true,
  },
  {
    id: 'rep-2',
    patientId: 'anjali',
    patientName: 'Anjali Menon',
    title: 'HbA1c & Fasting Glucose',
    daysWaiting: 2,
    urgent: false,
  },
  {
    id: 'rep-3',
    patientId: 'vinod',
    patientName: 'Vinod Kumar',
    title: 'Lipid Profile',
    daysWaiting: 1,
    urgent: false,
  },
];

export const MOCK_WAITING_SYMPTOMS: WaitingSymptomItem[] = [
  {
    id: 'sym-1',
    patientId: 'thankamma',
    patientName: 'Thankamma Varghese',
    text: 'Mild chest tightness after walking 50 meters',
    severity: 'severe',
    daysWaiting: 1,
  },
  {
    id: 'sym-2',
    patientId: 'suresh',
    patientName: 'Suresh Pillai',
    text: 'Swelling around right ankle in the evening',
    severity: 'mild',
    daysWaiting: 3,
  },
];

export const IS_MOCK_DATA = true;

export interface DirectoryPatient {
  id: string;
  name: string;
  age: number;
  sex: 'male' | 'female' | 'other';
  mrn: string;
  phone: string;
  conditions: string[];
  lastVisit: string;
  nextVisit: string;
  overdue?: string | null;
  signals: PatientSignals;
  inCareTeam: boolean;
  owner?: string;
  dept?: string;
}

export const MOCK_DIRECTORY_PATIENTS: DirectoryPatient[] = [
  {
    id: 'anjali',
    name: 'Anjali Menon',
    age: 42,
    sex: 'female',
    mrn: 'P-10492',
    phone: '+91 98470 12345',
    conditions: ['Type 2 Diabetes', 'Hypertension'],
    lastVisit: '22 Sep 2026',
    nextVisit: 'Thu, 15 Oct, 10:00 AM',
    overdue: null,
    signals: { rep: 1, rd: 3, sx: 0, miss: 0, med: 0 },
    inCareTeam: true,
  },
  {
    id: 'vinod',
    name: 'Vinod Kumar',
    age: 56,
    sex: 'male',
    mrn: 'P-09823',
    phone: '+91 94471 23456',
    conditions: ['Essential Hypertension', 'Dyslipidemia'],
    lastVisit: '18 Aug 2026',
    nextVisit: 'Thu, 15 Oct, 10:30 AM',
    overdue: null,
    signals: { rep: 0, rd: 1, sx: 0, miss: 0, med: 1 },
    inCareTeam: true,
  },
  {
    id: 'thankamma',
    name: 'Thankamma Varghese',
    age: 68,
    sex: 'female',
    mrn: 'P-11204',
    phone: '+91 98462 34567',
    conditions: ['Heart Failure (NYHA II)', 'Osteoarthritis'],
    lastVisit: '10 Jul 2026',
    nextVisit: 'Thu, 15 Oct, 11:00 AM',
    overdue: '15 Aug 2026',
    signals: { rep: 2, rd: 0, sx: 1, miss: 0, med: 0 },
    inCareTeam: true,
  },
  {
    id: 'suresh',
    name: 'Suresh Pillai',
    age: 39,
    sex: 'male',
    mrn: 'P-08711',
    phone: '+91 94463 45678',
    conditions: ['Prediabetes', 'Obesity'],
    lastVisit: '12 Jan 2026',
    nextVisit: 'Thu, 15 Oct, 11:30 AM',
    overdue: null,
    signals: { rep: 0, rd: 0, sx: 0, miss: 0, med: 0 },
    inCareTeam: true,
  },
  {
    id: 'harikrishnan',
    name: 'Harikrishnan Nair',
    age: 51,
    sex: 'male',
    mrn: 'P-07612',
    phone: '+91 94475 99887',
    conditions: ['Coronary Artery Disease', 'Post-PTCA'],
    lastVisit: '04 Oct 2026',
    nextVisit: 'Not scheduled with you',
    overdue: null,
    signals: { rep: 0, rd: 0, sx: 0, miss: 0, med: 0 },
    inCareTeam: false,
    owner: 'Dr. Anita Paul',
    dept: 'Cardiology',
  },
  {
    id: 'fathima',
    name: 'Fathima Beevi',
    age: 63,
    sex: 'female',
    mrn: 'P-12055',
    phone: '+91 98472 88776',
    conditions: ['Bronchial Asthma'],
    lastVisit: '28 Sep 2026',
    nextVisit: 'Not scheduled with you',
    overdue: null,
    signals: { rep: 0, rd: 0, sx: 0, miss: 0, med: 0 },
    inCareTeam: false,
    owner: 'Dr. Meera Iyer',
    dept: 'Pulmonology',
  },
];

export const GLASS_QUICK_REASONS = [
  'In casualty with chest pain, need medication history',
  'Severe allergic reaction in casualty',
  'Emergency surgery needed',
  'Patient unconscious, family requested review',
];
