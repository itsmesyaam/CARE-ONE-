import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Home,
  ClipboardList,
  Plus,
  FileText,
  User,
  Bell,
  ChevronDown,
  CalendarDays,
  X,
  Info,
  Check,
  MessageSquare,
  FileUp,
  AlertTriangle,
  ChevronRight,
  HeartPulse,
} from 'lucide-react';
import { usePatient, PatientSheetConfig } from './PatientContext';
import { SAMPLE_PEOPLE, PatientPerson } from './mock';
import { ReportSheetModal, UploadSheetModal } from './PatientRecords';
import { ReadingSheetModal } from './ReadingSheetModal';
import { SymptomSheetModal } from './SymptomSheetModal';
import { ConfirmSheetModal } from './ConfirmSheetModal';

function TopBar({ onOpenWho }: { onOpenWho: () => void }) {
  const { lang, p, d, setTab } = usePatient();
  const navigate = useNavigate();
  const notifCount = d.rem.filter(r => r.w !== 'earlier').length;

  return (
    <header className="topbar lg:hidden">
      <button
        type="button"
        className="flex items-center gap-3 press pr-2 text-left"
        onClick={onOpenWho}
        aria-label="Switch profile"
      >
        <span
          className={`av ${p.kid ? 'kid' : ''}`}
          style={{ width: 40, height: 40, fontSize: 14 }}
          aria-hidden="true"
        >
          {p.ini}
        </span>
        <span className="leading-tight">
          <b className="block text-sm font-bold text-[var(--ink)]">{p.first}</b>
          <span className="block text-[11px] text-[var(--ink3)]">
            {p.rel === 'self'
              ? lang === 'ml'
                ? 'നിങ്ങൾ'
                : 'You'
              : lang === 'ml'
              ? 'നിങ്ങൾ രക്ഷിതാവ്'
              : "You're the guardian"}
          </span>
        </span>
        <ChevronDown size={18} className="ink3" />
      </button>

      <div className="flex items-center gap-2">
        <span className="sample-badge">Sample</span>
        <button
          type="button"
          className="icon-btn press relative"
          onClick={() => {
            setTab('reminders');
            navigate('/patient/reminders');
          }}
          aria-label={lang === 'ml' ? `ഓർമ്മപ്പെടുത്തലുകൾ, ${notifCount}` : `Reminders, ${notifCount}`}
        >
          <Bell size={22} className="text-[var(--ink)]" />
          {notifCount > 0 && (
            <span
              className="absolute top-1 right-1 min-w-[19px] h-[19px] px-1 rounded-full bg-[var(--lat)] text-white text-[11px] font-bold grid place-items-center border-2 border-[var(--paper)]"
            >
              {notifCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}

function SideNav({ onOpenWho }: { onOpenWho: () => void }) {
  const { lang, p, tab, setTab, openSheet } = usePatient();
  const navigate = useNavigate();

  const navItems = [
    { key: 'home', icon: Home, label: lang === 'ml' ? 'ഹോം' : 'Home' },
    { key: 'plan', icon: ClipboardList, label: lang === 'ml' ? 'പദ്ധതി' : 'Care plan' },
    { key: 'records', icon: FileText, label: lang === 'ml' ? 'രേഖകൾ' : 'Records' },
    { key: 'reminders', icon: Bell, label: lang === 'ml' ? 'ഓർമ്മപ്പെടുത്തലുകൾ' : 'Reminders' },
    { key: 'appts', icon: CalendarDays, label: lang === 'ml' ? 'അപ്പോയിന്റ്മെന്റുകൾ' : 'Appointments' },
    { key: 'me', icon: User, label: lang === 'ml' ? 'പ്രൊഫൈൽ' : 'Profile' },
  ];

  return (
    <aside className="side hidden lg:flex">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="logo" aria-hidden="true">
            ABC
          </span>
          <span className="leading-tight">
            <b className="block font-bold text-[var(--ink)]">ABC Hospital</b>
            <span className="block text-xs text-[var(--ink3)]">
              {lang === 'ml' ? 'കെയർ ആപ്പ്' : 'Care app'}
            </span>
          </span>
        </div>
        <span className="sample-badge">Sample</span>
      </div>

      <button
        type="button"
        className="flex items-center gap-3 p-2.5 rounded-2xl border border-[var(--line)] press w-full text-left"
        onClick={onOpenWho}
      >
        <span
          className={`av ${p.kid ? 'kid' : ''}`}
          style={{ width: 40, height: 40, fontSize: 14 }}
          aria-hidden="true"
        >
          {p.ini}
        </span>
        <span className="flex-1 min-w-0 leading-tight">
          <b className="block truncate text-sm font-bold text-[var(--ink)]">{p.name}</b>
          <span className="block text-xs text-[var(--ink3)]">
            {p.rel === 'self'
              ? lang === 'ml'
                ? 'നിങ്ങൾ'
                : 'You'
              : lang === 'ml'
              ? 'നിങ്ങൾ രക്ഷിതാവ്'
              : "You're the guardian"}
          </span>
        </span>
        <ChevronDown size={18} className="ink3" />
      </button>

      <nav className="flex flex-col gap-1" aria-label="Main">
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = tab === item.key;
          return (
            <button
              key={item.key}
              type="button"
              className={`sn press ${isActive ? 'on' : ''}`}
              onClick={() => {
                setTab(item.key);
                if (item.key === 'home') navigate('/patient');
                else if (item.key === 'plan') navigate('/patient/plan');
                else if (item.key === 'records') navigate('/patient/records');
                else if (item.key === 'reminders') navigate('/patient/reminders');
                else if (item.key === 'appts') navigate('/patient/appointments');
                else if (item.key === 'me') navigate('/patient/profile');
              }}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon size={20} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <button
        type="button"
        className="btn-p btn-pri press w-full shadow-sm"
        onClick={() => openSheet({ type: 'add' })}
      >
        <Plus size={20} />
        <span>{lang === 'ml' ? 'രേഖയിൽ ചേർക്കുക' : 'Add to record'}</span>
      </button>

      <div className="mt-auto side-sos">
        <b className="block text-xs uppercase tracking-wider text-[var(--lat)] font-bold">
          {lang === 'ml' ? 'അടിയന്തര സഹായം' : 'Emergency casualty'}
        </b>
        <a href="tel:112" className="block mt-1 text-2xl num font-extrabold text-[#6B2417]">
          112
        </a>
        <a href="tel:04840000112" className="block text-xs text-[#6B2417] mt-0.5">
          {lang === 'ml' ? 'കാഷ്വാലിറ്റി' : 'Casualty'} 0484 000 0112
        </a>
      </div>
    </aside>
  );
}

function BottomNav() {
  const { lang, tab, setTab, openSheet } = usePatient();
  const navigate = useNavigate();

  const items = [
    { key: 'home', icon: Home, label: lang === 'ml' ? 'ഹോം' : 'Home' },
    { key: 'plan', icon: ClipboardList, label: lang === 'ml' ? 'പദ്ധതി' : 'Plan' },
    null, // FAB in middle
    { key: 'records', icon: FileText, label: lang === 'ml' ? 'രേഖകൾ' : 'Records' },
    { key: 'me', icon: User, label: lang === 'ml' ? 'പ്രൊഫൈൽ' : 'Profile' },
  ];

  return (
    <nav className="bnav lg:hidden" aria-label="Mobile Navigation">
      {items.map(item => {
        if (!item) {
          return (
            <button
              key="fab"
              type="button"
              className="fab press shadow-lg"
              onClick={() => openSheet({ type: 'add' })}
              aria-label="Add to record"
            >
              <Plus size={28} />
            </button>
          );
        }

        const Icon = item.icon;
        const isActive = tab === item.key;

        return (
          <button
            key={item.key}
            type="button"
            className={`bn ${isActive ? 'on' : ''}`}
            onClick={() => {
              setTab(item.key);
              if (item.key === 'home') navigate('/patient');
              else if (item.key === 'plan') navigate('/patient/plan');
              else if (item.key === 'records') navigate('/patient/records');
              else if (item.key === 'me') navigate('/patient/profile');
            }}
            aria-current={isActive ? 'page' : undefined}
          >
            <span className="bi">
              <Icon size={22} />
            </span>
            <span className="text-[11px] font-semibold">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

function WhoSheetModal({ onClose }: { onClose: () => void }) {
  const { lang, pid, setPid, toast } = usePatient();

  return (
    <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center lg:p-6">
      <div className="scrim absolute inset-0 bg-black/40" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Switch profile"
        className="sheet relative w-full lg:max-w-md bg-white rounded-t-3xl lg:rounded-3xl p-6 shadow-2xl z-10"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="disp text-xl font-bold text-[var(--ink)]">
            {lang === 'ml' ? 'ആരുടെ രേഖകൾ?' : 'Whose records?'}
          </h2>
          <button
            type="button"
            className="icon-btn"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex flex-col gap-3" role="radiogroup">
          {SAMPLE_PEOPLE.map((person: PatientPerson) => (
            <button
              key={person.id}
              type="button"
              role="radio"
              aria-checked={pid === person.id}
              className={`who press ${pid === person.id ? 'on' : ''}`}
              onClick={() => {
                setPid(person.id);
                toast(
                  lang === 'ml'
                    ? `ഇപ്പോൾ ${person.first}-ന്റെ രേഖകൾ`
                    : `Now viewing ${person.first}'s records`
                );
                onClose();
              }}
            >
              <span
                className={`av ${person.kid ? 'kid' : ''}`}
                style={{ width: 44, height: 44, fontSize: 15 }}
                aria-hidden="true"
              >
                {person.ini}
              </span>
              <span className="flex-1 min-w-0">
                <b className="block text-sm font-bold text-[var(--ink)]">{person.name}</b>
                <span className="block text-xs text-[var(--ink2)]">
                  {person.rel === 'self'
                    ? lang === 'ml'
                      ? 'നിങ്ങൾ'
                      : 'You'
                    : lang === 'ml'
                    ? 'നിങ്ങളുടെ കുട്ടി'
                    : "Your child, you're the guardian"}
                </span>
              </span>
              <span className="radio" />
            </button>
          ))}
        </div>

        <p className="flex gap-2 text-xs text-[var(--ink3)] mt-5">
          <Info size={16} className="flex-none mt-0.5" />
          {lang === 'ml'
            ? 'മറ്റൊരാളെ ചേർക്കാൻ അവരുടെ ഐഡിയുമായി ഫ്രണ്ട് ഡെസ്കിൽ വരിക.'
            : 'To link another family member, bring their ID to the front desk.'}
        </p>
      </div>
    </div>
  );
}

function AddSheetModal({ onClose }: { onClose: () => void }) {
  const { lang, openSheet } = usePatient();

  const options: Array<{
    key: PatientSheetConfig['type'];
    icon: React.ElementType;
    title: string;
    sub: string;
    tone: string;
  }> = [
    {
      key: 'upload',
      icon: FileUp,
      title: lang === 'ml' ? 'റിപ്പോർട്ട് അപ്‌ലോഡ് ചെയ്യുക' : 'Upload a report',
      sub: lang === 'ml' ? 'ലാബ് ഫലം, കുറിപ്പ് അല്ലെങ്കിൽ ഡിസ്ചാർജ്' : 'Lab test, prescription or discharge summary',
      tone: 'leaf',
    },
    {
      key: 'reading',
      icon: HeartPulse,
      title: lang === 'ml' ? 'റീഡിംഗ് രേഖപ്പെടുത്തുക' : 'Log a reading',
      sub: lang === 'ml' ? 'ബ്ലഡ് പ്രഷർ, ഷുഗർ അല്ലെങ്കിൽ ഭാരം' : 'Blood pressure, blood sugar or weight',
      tone: 'leaf',
    },
    {
      key: 'symptom',
      icon: MessageSquare,
      title: lang === 'ml' ? 'ലക്ഷണം അറിയിക്കുക' : 'Report a symptom',
      sub: lang === 'ml' ? 'ഡോക്ടറോട് അസ്വസ്ഥത പറയുക' : 'Tell your doctor what feels wrong',
      tone: 'zari',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center lg:p-6">
      <div className="scrim absolute inset-0 bg-black/40" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={lang === 'ml' ? 'രേഖയിൽ ചേർക്കുക' : 'Add to record'}
        className="sheet relative w-full lg:max-w-md bg-white rounded-t-3xl lg:rounded-3xl p-6 shadow-2xl z-10"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="disp text-xl font-bold text-[var(--ink)]">
            {lang === 'ml' ? 'രേഖയിൽ ചേർക്കുക' : 'Add to record'}
          </h2>
          <button
            type="button"
            className="icon-btn press"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex flex-col gap-3">
          {options.map(opt => {
            const Icon = opt.icon;
            return (
              <button
                key={opt.key}
                type="button"
                className="opt press"
                onClick={() => {
                  onClose();
                  openSheet({ type: opt.key });
                }}
              >
                <span className={`ico ico-lg ico-${opt.tone}`}>
                  <Icon size={24} />
                </span>
                <span className="flex-1 min-w-0 text-left">
                  <b className="block text-base font-bold text-[var(--ink)]">{opt.title}</b>
                  <span className="block text-xs text-[var(--ink2)]">{opt.sub}</span>
                </span>
                <ChevronRight size={20} className="text-[var(--ink3)] flex-none" />
              </button>
            );
          })}
        </div>

        <p className="text-xs text-[var(--ink2)] mt-5 flex gap-2">
          <AlertTriangle size={18} className="flex-none text-[var(--lat)]" />
          <span>
            {lang === 'ml'
              ? 'അടിയന്തിര സാഹചര്യങ്ങളിൽ ആപ്പ് ഉപയോഗിക്കരുത് — 112 അല്ലെങ്കിൽ കാഷ്വാലിറ്റി വിളിക്കുക.'
              : 'For emergencies do not use the app — call 112 or casualty immediately.'}
          </span>
        </p>
      </div>
    </div>
  );
}

export function PatientLayout(): React.JSX.Element {
  const location = useLocation();
  const { lang, toastMsg, tab, setTab, sheet, closeSheet } = usePatient();
  const [whoOpen, setWhoOpen] = useState(false);

  useEffect(() => {
    if (location.pathname === '/patient/profile' || location.pathname === '/patient/me') {
      if (tab !== 'me') setTab('me');
    } else if (location.pathname === '/patient/plan' && tab !== 'plan') {
      setTab('plan');
    } else if (location.pathname === '/patient/records' && tab !== 'records') {
      setTab('records');
    } else if (location.pathname === '/patient/reminders' && tab !== 'reminders') {
      setTab('reminders');
    } else if (
      (location.pathname === '/patient/appointments' || location.pathname === '/patient/appts') &&
      tab !== 'appts'
    ) {
      setTab('appts');
    } else if (location.pathname === '/patient' && tab !== 'home') {
      setTab('home');
    }
  }, [location.pathname, tab, setTab]);

  return (
    <div className={`patient-theme ${lang === 'ml' ? 'ml' : ''}`}>
      <div className="lg:flex min-h-screen">
        <SideNav onOpenWho={() => setWhoOpen(true)} />
        <div className="flex-1 min-w-0 flex flex-col">
          <TopBar onOpenWho={() => setWhoOpen(true)} />

          <main className="fadein w-full max-w-xl md:max-w-2xl lg:max-w-6xl mx-auto px-5 lg:px-12 pb-36 lg:pb-16 lg:pt-10">
            <Outlet />
          </main>
        </div>
        <BottomNav />
      </div>

      {whoOpen && <WhoSheetModal onClose={() => setWhoOpen(false)} />}
      {sheet?.type === 'add' && <AddSheetModal onClose={closeSheet} />}
      {sheet?.type === 'upload' && <UploadSheetModal test={sheet.test} onClose={closeSheet} />}
      {sheet?.type === 'report' && sheet.id && <ReportSheetModal id={sheet.id} onClose={closeSheet} />}
      {sheet?.type === 'reading' && <ReadingSheetModal k0={sheet.k} onClose={closeSheet} />}
      {sheet?.type === 'symptom' && <SymptomSheetModal onClose={closeSheet} />}
      {sheet?.type === 'confirm' && <ConfirmSheetModal k={sheet.k} onClose={closeSheet} />}

      {/* Global Toast */}
      {toastMsg && (
        <div
          className="toast"
          role="status"
          aria-live="polite"
        >
          <Check size={18} className="flex-none text-[var(--leaf)]" />
          <span>{toastMsg}</span>
        </div>
      )}
    </div>
  );
}
