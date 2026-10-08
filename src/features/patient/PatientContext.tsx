/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { SAMPLE_PEOPLE, createSampleSeed, PatientPerson, PatientRecordData } from './mock';

export interface PatientSheetConfig {
  type: 'add' | 'upload' | 'reading' | 'symptom' | 'report' | 'request' | 'confirm' | 'notice' | 'who';
  test?: string;
  k?: string;
  id?: string;
}

export interface PatientContextType {
  lang: string;
  setLang: (lang: string) => void;
  step: 'welcome' | 'signin' | 'otp' | 'consent' | 'who' | 'app';
  setStep: (step: 'welcome' | 'signin' | 'otp' | 'consent' | 'who' | 'app') => void;
  go: (step: 'welcome' | 'signin' | 'otp' | 'consent' | 'who' | 'app') => void;
  pid: string;
  setPid: (pid: string) => void;
  p: PatientPerson;
  d: PatientRecordData;
  tab: string;
  setTab: (tab: string) => void;
  nav: (tab: string, recTab?: string) => void;
  recTab: string;
  setRecTab: (recTab: string) => void;
  metric: string;
  setMetric: (metric: string) => void;
  sheet: PatientSheetConfig | null;
  openSheet: (sheet: PatientSheetConfig) => void;
  closeSheet: () => void;
  toast: (msg: string) => void;
  toastMsg: string | null;
  outage: boolean;
  setOutage: (outage: boolean) => void;
  contact: string;
  setContact: (contact: string) => void;
  push: boolean;
  setPush: (push: boolean) => void;
  mail: boolean;
  setMail: (mail: boolean) => void;
  size: number;
  setSize: (size: number) => void;
  inst: boolean;
  setInst: (inst: boolean) => void;
  take: (key: string) => void;
  addReport: (params: { title: string; kind: string; file: { name: string; size: number }; test?: string | null }) => string;
  addReading: (k: string, v: number | [number, number], ctx?: string | null) => void;
  addSymptom: (params: { sel: string[]; txt: string; sev: 'mild' | 'moderate' | 'severe'; since?: string }) => void;
  signOut: (msg?: string) => void;
  isSampleData: boolean;
}

const PatientContext = createContext<PatientContextType | null>(null);

export const usePatient = (): PatientContextType => {
  const ctx = useContext(PatientContext);
  if (!ctx) throw new Error('usePatient must be used within PatientProvider');
  return ctx;
};

export const PatientProvider: React.FC<{ children: React.ReactNode; initialStep?: 'welcome' | 'signin' | 'otp' | 'consent' | 'who' | 'app' }> = ({
  children,
  initialStep = 'app',
}) => {
  const { i18n } = useTranslation();
  const [lang, setLangState] = useState<string>(() => {
    try {
      return localStorage.getItem('careone_lang') || i18n.language || 'en';
    } catch {
      return i18n.language || 'en';
    }
  });
  const [step, setStep] = useState<'welcome' | 'signin' | 'otp' | 'consent' | 'who' | 'app'>(initialStep);
  const [pid, setPid] = useState<string>('anjali');
  const [tab, setTabState] = useState<string>('home');
  const [recTab, setRecTab] = useState<string>('reports');
  const [metric, setMetric] = useState<string>('bp');
  const [sheet, setSheet] = useState<PatientSheetConfig | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [outage, setOutage] = useState<boolean>(false);
  const [contact, setContact] = useState<string>('+91 98••••••10');
  const [push, setPush] = useState<boolean>(true);
  const [mail, setMail] = useState<boolean>(true);
  const [size, setSize] = useState<number>(0);
  const [inst, setInst] = useState<boolean>(false);
  const [db, setDb] = useState(() => createSampleSeed());

  useEffect(() => {
    const sizes = ['16px', '17.5px', '19px'];
    document.documentElement.style.fontSize = sizes[size] || '16px';
    return () => {
      document.documentElement.style.fontSize = '';
    };
  }, [size]);

  useEffect(() => {
    if (lang && i18n.language !== lang) {
      void i18n.changeLanguage(lang);
    }
  }, [lang, i18n]);

  const setLang = (newLang: string) => {
    setLangState(newLang);
    try {
      localStorage.setItem('careone_lang', newLang);
    } catch {
      // ignore
    }
    i18n.changeLanguage(newLang);
  };

  const toast = (msg: string) => {
    setToastMsg(msg);
  };

  useEffect(() => {
    if (!toastMsg) return;
    const timer = setTimeout(() => setToastMsg(null), 3400);
    return () => clearTimeout(timer);
  }, [toastMsg]);

  const go = useCallback((s: 'welcome' | 'signin' | 'otp' | 'consent' | 'who' | 'app') => {
    setSheet(null);
    setStep(s);
    window.scrollTo(0, 0);
  }, []);

  const setTab = useCallback((v: string) => {
    setTabState(v);
    window.scrollTo(0, 0);
  }, []);

  const openSheet = useCallback((s: PatientSheetConfig) => {
    setSheet(s);
  }, []);

  const closeSheet = useCallback(() => {
    setSheet(null);
  }, []);

  const nav = useCallback((v: string, r?: string) => {
    setStep('app');
    if (r) setRecTab(r);
    setTabState(v);
    window.scrollTo(0, 0);
    try {
      const targetPath = v === 'home' ? '/patient' : `/patient/${v}`;
      if (window.location.pathname !== targetPath) {
        window.history.pushState(null, '', targetPath);
        window.dispatchEvent(new PopStateEvent('popstate'));
      }
    } catch {
      // ignore
    }
  }, []);

  const fallbackRecord: PatientRecordData = useMemo(() => createSampleSeed()['anjali'] as PatientRecordData, []);
  const fallbackPerson: PatientPerson = SAMPLE_PEOPLE[0] as PatientPerson;
  const d: PatientRecordData = useMemo(() => (db[pid] || fallbackRecord), [db, pid, fallbackRecord]);
  const p: PatientPerson = useMemo(() => SAMPLE_PEOPLE.find(x => x.id === pid) || fallbackPerson, [pid, fallbackPerson]);

  const take = (key: string) => {
    const was = !!d.doses[key];
    const all = d.slots.flatMap(s => s.meds.map(m => s.k + '-' + m));
    const after = all.filter(k => (k === key ? !was : d.doses[k])).length;
    setDb((prev: Record<string, PatientRecordData>): Record<string, PatientRecordData> => {
      const target: PatientRecordData = prev[pid] ?? fallbackRecord;
      const newDoses: Record<string, string> = { ...target.doses };
      if (was) delete newDoses[key];
      else newDoses[key] = '7:29 PM';
      const updated: PatientRecordData = {
        ...target,
        doses: newDoses,
      };
      return {
        ...prev,
        [pid]: updated,
      };
    });
    toast(was ? 'Unmarked' : after === all.length ? "All of today's medicines are taken." : 'Marked as taken');
  };

  const addReport = ({ title, kind, file, test }: { title: string; kind: string; file: { name: string; size: number }; test?: string | null }) => {
    const id = 'r' + Date.now();
    const sizeStr = file.size > 1024 * 1024 ? `${(file.size / (1024 * 1024)).toFixed(1)} MB` : `${Math.round(file.size / 1024)} KB`;
    setDb((prev: Record<string, PatientRecordData>): Record<string, PatientRecordData> => {
      const target: PatientRecordData = prev[pid] ?? fallbackRecord;
      const updatedReports = [
        {
          id,
          title,
          kind: kind as 'lab' | 'scan' | 'rx' | 'disc' | 'other',
          s: 'y' as const,
          date: '6 Oct 2026',
          mon: 'October 2026',
          st: 'wait' as const,
          file: file.name,
          size: sizeStr,
        },
        ...target.reports,
      ];
      const updatedTests = test
        ? target.tests.map(q => (q.id === test ? { ...q, st: 'sent' as const, on: '6 Oct' } : q))
        : target.tests;
      return {
        ...prev,
        [pid]: {
          ...target,
          reports: updatedReports,
          tests: updatedTests,
        },
      };
    });
    return id;
  };

  const addReading = (k: string, v: number | [number, number], ctx?: string | null) => {
    const high = isReadingHigh(k, v);
    setDb((prev: Record<string, PatientRecordData>): Record<string, PatientRecordData> => {
      const target: PatientRecordData = prev[pid] ?? fallbackRecord;
      const currentReadings = target.readings[k as keyof typeof target.readings] || [];
      const newEntry = {
        d: '6 Oct',
        v,
        s: high ? ('h' as const) : ('y' as const),
        ...(ctx ? { ctx } : {}),
      };
      const updatedReadings = {
        ...target.readings,
        [k]: [...currentReadings, newEntry],
      };
      const updatedLogs = target.logs.map(l =>
        l.k === k ? { ...l, last: '6 Oct', missed: undefined } : l
      );
      return {
        ...prev,
        [pid]: {
          ...target,
          readings: updatedReadings,
          logs: updatedLogs,
        },
      };
    });
    toast(
      lang === 'ml'
        ? 'റീഡിംഗ് രേഖപ്പെടുത്തി. ഡോക്ടർ പരിശോധിക്കുന്നത് വരെ അവലോകനം കാക്കുന്നു എന്ന് കാണിക്കും.'
        : 'Reading saved. It shows as not yet reviewed until your doctor sees it.'
    );
  };

  const addSymptom = ({
    sel,
    txt,
    sev,
  }: {
    sel: string[];
    txt: string;
    sev: 'mild' | 'moderate' | 'severe';
    since?: string;
  }) => {
    const symptomMap: Record<string, string> = {
      dizzy: 'Dizziness',
      headache: 'Headache',
      breath: 'Breathlessness',
      chest: 'Chest pain',
      swelling: 'Swollen feet',
      tired: 'Tiredness',
      fever: 'Fever',
      otherS: 'Other symptom',
    };
    const parts = [
      sel.filter(s => s !== 'otherS').map(s => symptomMap[s] || s).join(', '),
      txt.trim(),
    ].filter(Boolean);
    const text = parts.join('. ') || 'Reported symptom';

    setDb((prev: Record<string, PatientRecordData>): Record<string, PatientRecordData> => {
      const target: PatientRecordData = prev[pid] ?? fallbackRecord;
      const newSymptom = {
        id: 's' + Date.now(),
        date: '6 Oct 2026',
        text,
        sev,
        st: 'wait' as const,
      };
      return {
        ...prev,
        [pid]: {
          ...target,
          symptoms: [newSymptom, ...(target.symptoms || [])],
        },
      };
    });
    toast(
      lang === 'ml'
        ? 'ലക്ഷണം അയച്ചു. പരിചരണ സംഘം പരിശോധിക്കും.'
        : 'Symptom sent. Your care team will review it.'
    );
  };

  const signOut = (msg?: string) => {
    setDb(createSampleSeed());
    setPid('anjali');
    setTabState('home');
    setSheet(null);
    setInst(false);
    setStep('welcome');
    if (msg) toast(msg);
  };

  const value: PatientContextType = {
    lang,
    setLang,
    step,
    setStep,
    go,
    pid,
    setPid,
    p,
    d,
    tab,
    setTab,
    nav,
    recTab,
    setRecTab,
    metric,
    setMetric,
    sheet,
    openSheet,
    closeSheet,
    toast,
    toastMsg,
    outage,
    setOutage,
    contact,
    setContact,
    push,
    setPush,
    mail,
    setMail,
    size,
    setSize,
    inst,
    setInst,
    take,
    addReport,
    addReading,
    addSymptom,
    signOut,
    isSampleData: true,
  };

  return <PatientContext.Provider value={value}>{children}</PatientContext.Provider>;
};

export const isReadingHigh = (k: string, v: number | [number, number]): boolean => {
  if (k === 'bp' && Array.isArray(v)) {
    return v[0] >= 130 || v[1] >= 80;
  }
  if (k === 'sugar' && typeof v === 'number') {
    return v > 130 || v < 80;
  }
  if (k === 'weight' && typeof v === 'number') {
    return v > 68;
  }
  if (k === 'a1c' && typeof v === 'number') {
    return v >= 7.0;
  }
  return false;
};
