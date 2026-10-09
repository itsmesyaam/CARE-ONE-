// Sample / placeholder data for Patient Portal demonstration
// Labelled as "Sample" on screen where backend integration is partial or in progress.

export interface PatientPerson {
  id: string;
  name: string;
  first: string;
  ini: string;
  rel: 'self' | 'guardian';
  mrn: string;
  dob: string;
  phone?: string;
  email?: string;
  kid?: boolean;
}

export const SAMPLE_PEOPLE: PatientPerson[] = [
  {
    id: 'anjali',
    name: 'Anjali Menon',
    first: 'Anjali',
    ini: 'AM',
    rel: 'self',
    mrn: 'ABC-0012-7781',
    dob: '14 Mar 1984',
    phone: '+91 98••••••10',
    email: 'an•••@example.com',
  },
  {
    id: 'aarav',
    name: 'Aarav Menon',
    first: 'Aarav',
    ini: 'AV',
    rel: 'guardian',
    mrn: 'ABC-0019-4402',
    dob: '2 Jun 2017',
    kid: true,
  },
];

export interface MedicationItem {
  id: string;
  name: string;
  dose: string;
  how: string;
  food?: 'afterFood' | 'beforeFood' | 'atBed';
  p: [number, number, number] | null;
  since: string;
  by: string;
  on: boolean;
  stop?: string;
}

export interface MedicationSlot {
  k: 'morning' | 'noon' | 'night';
  time: string;
  meds: string[];
  eta?: [number, number];
}

export interface PatientRecordData {
  doc: string;
  planFrom: string;
  review: string;
  tg: Record<string, string>;
  next: {
    doc: string;
    dept: string;
    day: string;
    date: string;
    time: string;
    place: string;
    days: number;
    ics: string;
  };
  meds: MedicationItem[];
  slots: MedicationSlot[];
  doses: Record<string, string>;
  week: number[];
  tests: Array<{ id: string; name: string; due: string; st: 'todo' | 'sent'; on?: string }>;
  logs: Array<{
    id: string;
    k: string;
    name: string;
    when: string;
    next: string;
    last: string;
    missed?: string | null;
  }>;
  instr: string[];
  readings: Record<
    string,
    Array<{ d: string; v: number | [number, number]; s: 'h' | 'y'; ctx?: string }>
  >;
  reports: Array<{
    id: string;
    title: string;
    kind: 'lab' | 'scan' | 'rx' | 'disc' | 'other';
    s: 'h' | 'y';
    src?: string;
    date: string;
    mon: string;
    st: 'rev' | 'wait';
    by?: string;
    on?: string;
    file: string;
    size: string;
    trend?: string;
    vals?: Array<{ k: string; v: string; u?: string; ref?: string; hi?: boolean }>;
  }>;
  visits: Array<{
    id: string;
    date: string;
    doc: string;
    dept: string;
    reason: string;
    found: string;
    plan: string;
    signed: string;
    add: Array<{ on: string; by: string; text: string }>;
  }>;
  conds: Array<{ n: string; since: string; on: boolean }>;
  allergies: Array<{ n: string; r: string; sev: 'mild' | 'moderate' | 'severe' }>;
  symptoms: Array<{ id: string; date: string; text: string; sev: string; st: string; by?: string }>;
  appts: Array<{
    id: string;
    date: string;
    time: string;
    doc: string;
    dept: string;
    st: 'done' | 'missed' | 'booked';
  }>;
  rem: Array<{
    id: string;
    w: 'today' | 'next' | 'earlier';
    k: string;
    sub?: string;
    time: string;
    ic: string;
    done?: string;
  }>;
  reqs: Array<{
    id: string;
    k: string;
    text: string;
    sent: string;
    st: string;
    closed?: string;
    due?: string;
  }>;
}

export type PatientReportItem = PatientRecordData['reports'][number];

export const createSampleSeed = (): Record<string, PatientRecordData> => ({
  anjali: {
    doc: 'Dr. Rahul Nair',
    planFrom: '22 Sep 2026',
    review: '15 Oct 2026',
    tg: {
      bp: 'below 130/80',
      sugar: '80 to 130 mg/dL before breakfast',
      a1c: 'below 7%',
    },
    next: {
      doc: 'Dr. Rahul Nair',
      dept: 'General Medicine',
      day: 'Thu',
      date: '15 Oct',
      time: '10:30 AM',
      place: 'OP Block B, Room 12',
      days: 9,
      ics: '20261015T050000Z',
    },
    meds: [
      {
        id: 'm1',
        name: 'Metformin',
        dose: '500 mg',
        how: '1 tablet',
        food: 'afterFood',
        p: [1, 0, 1],
        since: 'Mar 2021',
        by: 'Dr. Rahul Nair',
        on: true,
      },
      {
        id: 'm2',
        name: 'Amlodipine',
        dose: '5 mg',
        how: '1 tablet',
        food: 'afterFood',
        p: [1, 0, 0],
        since: '18 Aug 2026',
        by: 'Dr. Rahul Nair',
        on: true,
      },
      {
        id: 'm3',
        name: 'Atorvastatin',
        dose: '10 mg',
        how: '1 tablet',
        food: 'atBed',
        p: [0, 0, 1],
        since: '22 Sep 2026',
        by: 'Dr. Rahul Nair',
        on: true,
      },
      {
        id: 'm4',
        name: 'Glimepiride',
        dose: '1 mg',
        how: '1 tablet',
        food: 'beforeFood',
        p: [1, 0, 0],
        since: 'Mar 2024',
        stop: '22 Sep 2026',
        by: 'Dr. Rahul Nair',
        on: false,
      },
    ],
    slots: [
      { k: 'morning', time: '8:00 AM', meds: ['m1', 'm2'] },
      { k: 'night', time: '9:00 PM', meds: ['m1', 'm3'], eta: [1, 31] },
    ],
    doses: { 'morning-m1': '8:14 AM', 'morning-m2': '8:14 AM' },
    week: [1, 1, 0.75, 1, 1, 1],
    tests: [
      { id: 't1', name: 'HbA1c', due: 'Mon 12 Oct', st: 'todo' },
      { id: 't2', name: 'Lipid profile, fasting', due: 'Mon 12 Oct', st: 'sent', on: '3 Oct' },
    ],
    logs: [
      {
        id: 'l1',
        k: 'bp',
        name: 'Blood pressure',
        when: 'Monday and Thursday mornings',
        next: 'Thu 8 Oct',
        last: '5 Oct',
        missed: 'Mon 28 Sep',
      },
      {
        id: 'l2',
        k: 'sugar',
        name: 'Fasting sugar',
        when: 'Every Monday, before breakfast',
        next: 'Mon 12 Oct',
        last: '5 Oct',
      },
    ],
    instr: [
      'Walk for 30 minutes, 5 days a week.',
      'Keep salt low. Go easy on pickles, papadam and dried fish.',
      'Take metformin after food, never on an empty stomach.',
    ],
    readings: {
      bp: [
        { d: '18 Aug', v: [146, 92], s: 'h' },
        { d: '22 Sep', v: [142, 90], s: 'h' },
        { d: '24 Sep', v: [136, 88], s: 'y' },
        { d: '1 Oct', v: [134, 86], s: 'y' },
        { d: '5 Oct', v: [131, 84], s: 'y' },
      ],
      sugar: [
        { d: '18 Aug', v: 148, s: 'h', ctx: 'fasting' },
        { d: '20 Sep', v: 132, s: 'h', ctx: 'fasting' },
        { d: '28 Sep', v: 126, s: 'y', ctx: 'fasting' },
        { d: '5 Oct', v: 118, s: 'y', ctx: 'fasting' },
      ],
      weight: [
        { d: '18 Aug', v: 70.6, s: 'h' },
        { d: '22 Sep', v: 69.4, s: 'h' },
        { d: '5 Oct', v: 68.2, s: 'y' },
      ],
      a1c: [
        { d: 'Mar', v: 8.4, s: 'h' },
        { d: 'Jun', v: 8.1, s: 'h' },
        { d: '20 Sep', v: 7.4, s: 'h' },
      ],
    },
    reports: [
      {
        id: 'r1',
        title: 'Lipid profile',
        kind: 'lab',
        s: 'y',
        date: '3 Oct 2026',
        mon: 'October 2026',
        st: 'wait',
        file: 'lipid-profile.pdf',
        size: '412 KB',
      },
      {
        id: 'r2',
        title: 'HbA1c and fasting glucose',
        kind: 'lab',
        s: 'h',
        src: 'ABC Hospital lab',
        date: '20 Sep 2026',
        mon: 'September 2026',
        st: 'rev',
        by: 'Dr. Rahul Nair',
        on: '22 Sep 2026',
        file: 'hba1c-20-sep.pdf',
        size: '188 KB',
        trend: 'a1c',
        vals: [
          { k: 'HbA1c', v: '7.4', u: '%', ref: 'Target below 7', hi: true },
          { k: 'Fasting glucose', v: '132', u: 'mg/dL', ref: 'Normal 70 to 100', hi: true },
        ],
      },
      {
        id: 'r3',
        title: 'ECG',
        kind: 'scan',
        s: 'h',
        src: 'ABC Hospital cardiology',
        date: '22 Sep 2026',
        mon: 'September 2026',
        st: 'rev',
        by: 'Dr. Rahul Nair',
        on: '22 Sep 2026',
        file: 'ecg-22-sep.pdf',
        size: '96 KB',
        vals: [{ k: 'Result', v: 'Normal sinus rhythm' }],
      },
      {
        id: 'r4',
        title: 'Chest X-ray',
        kind: 'scan',
        s: 'h',
        src: 'ABC Hospital radiology',
        date: '18 Aug 2026',
        mon: 'August 2026',
        st: 'rev',
        by: 'Dr. Rahul Nair',
        on: '18 Aug 2026',
        file: 'chest-xray.jpg',
        size: '1.2 MB',
        vals: [{ k: 'Result', v: 'No abnormality seen' }],
      },
      {
        id: 'r5',
        title: 'Old prescription from family doctor',
        kind: 'rx',
        s: 'y',
        date: '12 Aug 2026',
        mon: 'August 2026',
        st: 'rev',
        by: 'Dr. Rahul Nair',
        on: '18 Aug 2026',
        file: 'prescription.jpg',
        size: '860 KB',
        vals: [],
      },
    ],
    visits: [
      {
        id: 'v1',
        date: '22 Sep 2026',
        doc: 'Dr. Rahul Nair',
        dept: 'General Medicine',
        reason: 'Follow-up for diabetes and blood pressure',
        found:
          'BP 142/90. HbA1c 7.4%, down from 8.1% in June. Weight 69.4 kg. Feet checked, no problems.',
        plan: 'Continue metformin. Stop glimepiride. Start atorvastatin 10 mg. Check BP at home twice a week. Repeat HbA1c and lipid profile before the next visit.',
        signed: '22 Sep 2026, 11:42 AM',
        add: [
          {
            on: '23 Sep 2026, 9:05 AM',
            by: 'Dr. Rahul Nair',
            text: 'Atorvastatin is to be taken at night, not in the morning.',
          },
        ],
      },
      {
        id: 'v2',
        date: '18 Aug 2026',
        doc: 'Dr. Rahul Nair',
        dept: 'General Medicine',
        reason: 'High blood pressure readings at a pharmacy',
        found: 'BP 146/92 on two readings. Chest X-ray clear.',
        plan: 'Start amlodipine 5 mg in the morning. Cut down on salt. Review in 4 to 5 weeks.',
        signed: '18 Aug 2026, 12:10 PM',
        add: [],
      },
    ],
    conds: [
      { n: 'Type 2 diabetes', since: '2021', on: true },
      { n: 'High blood pressure', since: '2026', on: true },
      { n: 'Childhood asthma', since: '1992', on: false },
    ],
    allergies: [
      { n: 'Penicillin', r: 'Skin rash', sev: 'moderate' },
      { n: 'Shellfish', r: 'Itching', sev: 'mild' },
    ],
    symptoms: [
      {
        id: 's1',
        date: '29 Sep 2026',
        text: 'Mild headache in the evenings for 3 days.',
        sev: 'mild',
        st: 'seen',
        by: 'Dr. Rahul Nair',
      },
    ],
    appts: [
      {
        id: 'a2',
        date: 'Tue, 22 Sep 2026',
        time: '11:00 AM',
        doc: 'Dr. Rahul Nair',
        dept: 'General Medicine',
        st: 'done',
      },
      {
        id: 'a3',
        date: 'Tue, 18 Aug 2026',
        time: '11:30 AM',
        doc: 'Dr. Rahul Nair',
        dept: 'General Medicine',
        st: 'done',
      },
      {
        id: 'a4',
        date: 'Thu, 2 Jul 2026',
        time: '10:00 AM',
        doc: 'Dr. Anita Paul',
        dept: 'Ophthalmology',
        st: 'missed',
      },
    ],
    rem: [
      {
        id: 'n1',
        w: 'today',
        k: 'nightMeds',
        sub: 'Metformin, Atorvastatin',
        time: '9:00 PM',
        ic: 'pill',
      },
      { id: 'n2', w: 'next', k: 'checkBp', time: 'Thu 8 Oct, 7:00 AM', ic: 'heart' },
      { id: 'n3', w: 'next', k: 'fastingSugar', time: 'Mon 12 Oct, 7:00 AM', ic: 'drop' },
      { id: 'n4', w: 'next', k: 'testsDue', sub: 'HbA1c', time: 'Mon 12 Oct', ic: 'flask' },
      {
        id: 'n5',
        w: 'next',
        k: 'visitSoon',
        sub: 'Dr. Rahul Nair, 10:30 AM',
        time: 'Wed 14 Oct, 6:00 PM',
        ic: 'cal',
      },
      {
        id: 'n0',
        w: 'earlier',
        k: 'morningMeds',
        sub: 'Metformin, Amlodipine',
        time: '8:00 AM',
        ic: 'pill',
        done: '8:14 AM',
      },
    ],
    reqs: [
      {
        id: 'q1',
        k: 'correction',
        text: 'My date of birth is 14 Mar 1984, not 4 Mar.',
        sent: '12 Sep 2026',
        st: 'closed',
        closed: '19 Sep 2026',
      },
    ],
  },
  aarav: {
    doc: 'Dr. Meera Iyer',
    planFrom: '15 Sep 2026',
    review: '28 Oct 2026',
    tg: {},
    next: {
      doc: 'Dr. Meera Iyer',
      dept: 'Pediatrics',
      day: 'Wed',
      date: '28 Oct',
      time: '4:00 PM',
      place: "Children's OP, Room 3",
      days: 22,
      ics: '20261028T103000Z',
    },
    meds: [
      {
        id: 'm1',
        name: 'Budesonide inhaler',
        dose: '100 mcg',
        how: '2 puffs',
        food: 'atBed',
        p: [0, 0, 1],
        since: 'Apr 2022',
        by: 'Dr. Meera Iyer',
        on: true,
      },
      {
        id: 'm2',
        name: 'Salbutamol inhaler',
        dose: '100 mcg',
        how: '2 puffs',
        p: null,
        since: 'Apr 2022',
        by: 'Dr. Meera Iyer',
        on: true,
      },
    ],
    slots: [{ k: 'night', time: '8:30 PM', meds: ['m1'], eta: [1, 1] }],
    doses: {},
    week: [1, 1, 1, 0, 1, 1],
    tests: [],
    logs: [
      {
        id: 'l1',
        k: 'weight',
        name: 'Weight',
        when: 'Once a month',
        next: 'Sun 1 Nov',
        last: '15 Sep',
      },
    ],
    instr: [
      'Rinse mouth with water after the budesonide inhaler.',
      'Carry the salbutamol inhaler to school.',
    ],
    readings: {
      weight: [
        { d: '10 Jun', v: 26.9, s: 'h' },
        { d: '15 Sep', v: 28.1, s: 'h' },
      ],
    },
    reports: [
      {
        id: 'r1',
        title: 'Spirometry',
        kind: 'lab',
        s: 'h',
        src: 'ABC Hospital lab',
        date: '15 Sep 2026',
        mon: 'September 2026',
        st: 'rev',
        by: 'Dr. Meera Iyer',
        on: '15 Sep 2026',
        file: 'spirometry.pdf',
        size: '240 KB',
        vals: [{ k: 'FEV1', v: '92', u: '% of expected' }],
      },
    ],
    visits: [
      {
        id: 'v1',
        date: '15 Sep 2026',
        doc: 'Dr. Meera Iyer',
        dept: 'Pediatrics',
        reason: 'Asthma review',
        found: 'Chest clear. Two night-time coughing spells in the last month.',
        plan: 'Continue budesonide at night. Salbutamol when needed. Review in 6 weeks.',
        signed: '15 Sep 2026, 4:40 PM',
        add: [],
      },
    ],
    conds: [{ n: 'Asthma, mild', since: '2022', on: true }],
    allergies: [{ n: 'Peanuts', r: 'Hives', sev: 'moderate' }],
    symptoms: [],
    appts: [
      {
        id: 'a2',
        date: 'Tue, 15 Sep 2026',
        time: '4:00 PM',
        doc: 'Dr. Meera Iyer',
        dept: 'Pediatrics',
        st: 'done',
      },
    ],
    rem: [
      {
        id: 'n1',
        w: 'today',
        k: 'nightMeds',
        sub: 'Budesonide inhaler',
        time: '8:30 PM',
        ic: 'pill',
      },
      {
        id: 'n2',
        w: 'next',
        k: 'visitSoon',
        sub: 'Dr. Meera Iyer, 4:00 PM',
        time: 'Tue 27 Oct, 6:00 PM',
        ic: 'cal',
      },
      { id: 'n3', w: 'next', k: 'logWeight', time: 'Sun 1 Nov', ic: 'scale' },
    ],
    reqs: [],
  },
});
