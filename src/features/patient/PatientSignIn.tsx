import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  Phone,
  ShieldCheck,
  Check,
  MessageSquare,
  AlertTriangle,
  FileText,
  Bell,
  Eye,
  MapPin,
  Info,
  CalendarDays,
  Pill,
  BadgeCheck,
} from 'lucide-react';
import { usePatient } from './PatientContext';
import { SAMPLE_PEOPLE, PatientPerson } from './mock';

function LangSwitch() {
  const { lang, setLang } = usePatient();
  return (
    <div className="w-[180px] sm:w-[190px]">
      <div className="seg seg-sm" role="radiogroup" aria-label="Language">
        <button
          type="button"
          role="radio"
          aria-checked={lang === 'en'}
          className={lang === 'en' ? 'on' : ''}
          onClick={() => setLang('en')}
        >
          English
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={lang === 'ml'}
          className={lang === 'ml' ? 'on' : ''}
          onClick={() => setLang('ml')}
        >
          മലയാളം
        </button>
      </div>
    </div>
  );
}

function Logo() {
  const { lang } = usePatient();
  return (
    <div className="flex items-center gap-3">
      <span className="logo" aria-hidden="true">
        ABC
      </span>
      <span className="leading-tight">
        <b className="block text-base font-bold text-[var(--ink)]">ABC Hospital</b>
        <span className="block text-xs text-[var(--ink3)]">
          {lang === 'ml' ? 'കെയർ ആപ്പ്' : 'Care app'}
        </span>
      </span>
    </div>
  );
}

function AuthFrame({
  back,
  title,
  sub,
  children,
}: {
  back?: () => void;
  title: string;
  sub?: string;
  children: React.ReactNode;
}) {
  const { lang } = usePatient();
  return (
    <div className="min-h-screen flex flex-col bg-[var(--paper)]">
      <div className="zari-band" />
      <div className="flex items-center justify-between gap-3 px-4 lg:px-10 pt-4">
        {back ? (
          <button
            type="button"
            className="back press text-sm font-semibold"
            onClick={back}
          >
            <ChevronLeft size={20} />
            {lang === 'ml' ? 'തിരികെ' : 'Back'}
          </button>
        ) : (
          <Logo />
        )}
        <div className="flex items-center gap-2">
          <span className="sample-badge">Sample</span>
          <LangSwitch />
        </div>
      </div>
      <main className="flex-1 w-full max-w-md mx-auto px-5 pt-8 pb-16 lg:pt-14">
        <h1 className="disp h1 text-[var(--ink)]">{title}</h1>
        {sub && <p className="text-[var(--ink2)] mt-3 text-base sm:text-lg">{sub}</p>}
        <div className="mt-8">{children}</div>
      </main>
    </div>
  );
}

export function WelcomeView({ onStartSignIn }: { onStartSignIn: () => void }) {
  const { lang } = usePatient();
  const pv = [
    [Pill, lang === 'ml' ? 'രാത്രിയിലെ മരുന്നുകൾ' : 'Night medicines', '9:00 PM', 'leaf'],
    [BadgeCheck, lang === 'ml' ? 'ലിപിഡ് പ്രൊഫൈൽ പരിശോധിച്ചു' : 'Lipid profile reviewed', 'Dr. Rahul Nair', 'leaf'],
    [CalendarDays, lang === 'ml' ? 'അടുത്ത സന്ദർശനം, വ്യാഴം 15 ഒക്ടോ' : 'Next visit, Thu 15 Oct', '10:30 AM', 'zari'],
  ] as const;

  return (
    <div className="min-h-screen flex flex-col bg-[var(--paper)]">
      <div className="zari-band" />
      <header className="flex items-center justify-between gap-4 px-5 lg:px-12 pt-5">
        <Logo />
        <div className="flex items-center gap-2">
          <span className="sample-badge">Sample</span>
          <LangSwitch />
        </div>
      </header>

      <main className="flex-1 w-full max-w-6xl mx-auto grid lg:grid-cols-2 gap-12 items-center px-5 lg:px-12 py-10">
        <div>
          <h1 className="disp hero-t kin text-[var(--ink)]">
            {lang === 'ml' ? 'സന്ദർശനങ്ങൾക്കിടയിലും നിങ്ങളുടെ പരിചരണം.' : 'Your care, between visits.'}
          </h1>
          <p className="text-[var(--ink2)] text-base sm:text-lg mt-5 max-w-md">
            {lang === 'ml'
              ? 'ABC ഹോസ്പിറ്റലിലെ നിങ്ങളുടെ റിപ്പോർട്ടുകളും മരുന്നുകളും പരിചരണ പദ്ധതിയും ഇവിടെ കാണാം. ഓർമ്മപ്പെടുത്തലുകൾ ഫോണിൽ ലഭിക്കും.'
              : 'See your reports, medicines and care plan from ABC Hospital, and get reminders on your phone.'}
          </p>
          <div className="mt-8 max-w-sm">
            <button
              type="button"
              className="btn-p btn-pri press w-full shadow-sm"
              onClick={onStartSignIn}
            >
              {lang === 'ml' ? 'സൈൻ ഇൻ ചെയ്യുക' : 'Sign in'}
            </button>
            <p className="text-xs sm:text-sm text-[var(--ink3)] mt-4">
              {lang === 'ml'
                ? 'പുതിയ ആളാണോ? ഐഡി പരിശോധിച്ച ശേഷം ഫ്രണ്ട് ഡെസ്ക് അക്കൗണ്ട് തയ്യാറാക്കും.'
                : 'New here? The front desk sets up your account after checking your ID.'}
            </p>
          </div>
        </div>

        <div className="hidden lg:flex flex-col gap-3" aria-hidden="true">
          {pv.map(([Icon, a, b, tone], i) => (
            <div key={i} className="pv spring" style={{ '--i': i + 4 } as React.CSSProperties}>
              <span className={`ico ico-${tone}`}>
                <Icon size={20} />
              </span>
              <span className="flex-1 min-w-0">
                <b className="block truncate text-sm font-bold text-[var(--ink)]">{a}</b>
                <span className="block text-xs text-[var(--ink3)]">{b}</span>
              </span>
            </div>
          ))}
        </div>
      </main>

      <footer className="px-5 lg:px-12 pb-8">
        <a
          className="inline-flex items-center gap-2 font-semibold text-[var(--lat)] hover:underline"
          href="tel:112"
        >
          <Phone size={16} />
          {lang === 'ml' ? 'അടിയന്തര സാഹചര്യമാണോ? 112-ൽ വിളിക്കുക' : 'Emergency? Call 112'}
        </a>
      </footer>
    </div>
  );
}

export function SignInForm({
  onBack,
  onSentCode,
}: {
  onBack: () => void;
  onSentCode: (contact: string) => void;
}) {
  const { lang, setContact } = usePatient();
  const [method, setMethod] = useState<'phone' | 'email'>('phone');
  const [val, setVal] = useState('98765 43210');
  const [chk, setChk] = useState(0);

  useEffect(() => {
    const a = setTimeout(() => setChk(1), 300);
    const b = setTimeout(() => setChk(2), 1400);
    return () => {
      clearTimeout(a);
      clearTimeout(b);
    };
  }, []);

  const ok =
    method === 'phone'
      ? val.replace(/\D/g, '').length === 10
      : /^\S+@\S+\.\S+$/.test(val);

  const handleSend = () => {
    const formatted =
      method === 'phone'
        ? '+91 ' + val.replace(/\D/g, '').replace(/^(\d{2})\d{6}(\d{2})$/, '$1••••••$2')
        : val.replace(/^(.{2}).*(@.*)$/, '$1•••$2');
    setContact(formatted);
    onSentCode(formatted);
  };

  return (
    <AuthFrame
      back={onBack}
      title={lang === 'ml' ? 'സൈൻ ഇൻ ചെയ്യുക' : 'Sign in'}
      sub={
        lang === 'ml'
          ? 'ഹോസ്പിറ്റലിൽ നൽകിയ ഫോൺ നമ്പറോ ഇമെയിലോ ഉപയോഗിക്കുക.'
          : 'Use the phone number or email the hospital has on file.'
      }
    >
      <div className="seg" role="radiogroup" aria-label="Sign in method">
        <button
          type="button"
          role="radio"
          aria-checked={method === 'phone'}
          className={method === 'phone' ? 'on' : ''}
          onClick={() => {
            setMethod('phone');
            setVal('98765 43210');
          }}
        >
          {lang === 'ml' ? 'ഫോൺ' : 'Phone'}
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={method === 'email'}
          className={method === 'email' ? 'on' : ''}
          onClick={() => {
            setMethod('email');
            setVal('anjali@example.com');
          }}
        >
          {lang === 'ml' ? 'ഇമെയിൽ' : 'Email'}
        </button>
      </div>

      <label className="lbl mt-6 block text-sm font-semibold text-[var(--ink)]" htmlFor="contact">
        {method === 'phone'
          ? lang === 'ml'
            ? 'മൊബൈൽ നമ്പർ'
            : 'Mobile number'
          : lang === 'ml'
          ? 'ഇമെയിൽ വിലാസം'
          : 'Email address'}
      </label>

      <div className="field">
        {method === 'phone' && <span className="pfx">+91</span>}
        <input
          id="contact"
          value={val}
          type={method === 'phone' ? 'tel' : 'email'}
          inputMode={method === 'phone' ? 'numeric' : 'email'}
          autoComplete={method === 'phone' ? 'tel-national' : 'email'}
          onChange={e =>
            setVal(
              method === 'phone'
                ? e.target.value.replace(/[^\d ]/g, '').slice(0, 11)
                : e.target.value
            )
          }
        />
      </div>

      <div className="secchk mt-4" aria-live="polite">
        <ShieldCheck size={20} className={chk === 2 ? 'leaf' : 'ink3'} />
        <span className="flex-1 text-sm font-semibold text-[var(--ink)]">
          {lang === 'ml' ? 'സുരക്ഷാ പരിശോധന' : 'Security check'}
        </span>
        {chk < 2 ? (
          <span className="flex items-center gap-2 text-xs text-[var(--ink3)]">
            <span className="spin" />
            {lang === 'ml' ? 'പരിശോധിക്കുന്നു' : 'Checking'}
          </span>
        ) : (
          <span className="tag tag-leaf">
            <Check size={14} />
            {lang === 'ml' ? 'പൂർത്തിയായി' : 'Done'}
          </span>
        )}
      </div>

      <button
        type="button"
        className="btn-p btn-pri press w-full mt-6"
        disabled={!ok || chk < 2}
        onClick={handleSend}
      >
        {lang === 'ml' ? 'കോഡ് അയയ്ക്കുക' : 'Send code'}
      </button>

      <p className="text-xs text-[var(--ink3)] mt-5">
        {lang === 'ml'
          ? 'നമ്പർ അല്ലെങ്കിൽ ഇമെയിൽ മാറിയോ? ഫ്രണ്ട് ഡെസ്കിൽ പുതുക്കുക.'
          : 'Changed your number or email? Update it at the front desk.'}
      </p>
    </AuthFrame>
  );
}

export function OtpForm({
  contact,
  onBack,
  onVerifySuccess,
}: {
  contact: string;
  onBack: () => void;
  onVerifySuccess: () => void;
}) {
  const { lang, toast } = usePatient();
  const empty = ['', '', '', '', '', ''];
  const [digits, setDigits] = useState<string[]>(empty);
  const [hasError, setHasError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sec, setSec] = useState(30);
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    refs.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (sec <= 0) return;
    const timer = setTimeout(() => setSec(sec - 1), 1000);
    return () => clearTimeout(timer);
  }, [sec]);

  const verifyDigits = (arr: string[]) => {
    if (arr.join('').length < 6) return;
    setBusy(true);
    setHasError(false);
    setTimeout(() => {
      setBusy(false);
      if (arr.join('') === '000000') {
        setHasError(true);
        setDigits(empty);
        refs.current[0]?.focus();
      } else {
        onVerifySuccess();
      }
    }, 800);
  };

  const fillCode = (str: string) => {
    const arr = str.replace(/\D/g, '').slice(0, 6).split('');
    const next = empty.map((_, i) => arr[i] || '');
    setDigits(next);
    refs.current[Math.min(arr.length, 5)]?.focus();
    verifyDigits(next);
  };

  const handleChange = (i: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '');
    if (raw.length >= 6) return fillCode(raw);
    const next = [...digits];
    next[i] = raw.slice(-1);
    setDigits(next);
    setHasError(false);
    if (next[i] && i < 5) refs.current[i + 1]?.focus();
    verifyDigits(next);
  };

  return (
    <AuthFrame
      back={onBack}
      title={lang === 'ml' ? '6 അക്ക കോഡ് നൽകുക' : 'Enter the 6-digit code'}
      sub={
        lang === 'ml'
          ? `${contact}-ലേക്ക് കോഡ് അയച്ചു.`
          : `We sent it to ${contact}.`
      }
    >
      <div
        className={`otp ${hasError ? 'shake' : ''}`}
        role="group"
        aria-label="One-time verification code"
      >
        {digits.map((val, i) => (
          <input
            key={i}
            ref={el => {
              refs.current[i] = el;
            }}
            value={val}
            inputMode="numeric"
            maxLength={6}
            autoComplete={i === 0 ? 'one-time-code' : 'off'}
            aria-label={`Digit ${i + 1}`}
            className={`${val ? 'filled' : ''} ${hasError ? 'bad' : ''}`}
            onChange={e => handleChange(i, e)}
            onKeyDown={e => {
              if (e.key === 'Backspace' && !digits[i] && i > 0) {
                refs.current[i - 1]?.focus();
              }
            }}
            onPaste={e => {
              e.preventDefault();
              fillCode(e.clipboardData.getData('text'));
            }}
          />
        ))}
      </div>

      {hasError && (
        <p className="err mt-3 flex items-center gap-1.5 text-xs font-semibold text-[var(--lat)]" role="alert">
          <AlertTriangle size={16} />
          {lang === 'ml'
            ? 'കോഡ് ശരിയല്ല. ഏറ്റവും പുതിയ മെസേജ് നോക്കി വീണ്ടും ശ്രമിക്കുക.'
            : "That code didn't match. Check the latest message and try again."}
        </p>
      )}

      {/* Auto-fill prompt */}
      <button
        type="button"
        className="webotp press mt-5 text-left"
        onClick={() => fillCode('482913')}
      >
        <MessageSquare size={18} className="leaf flex-none" />
        <span className="flex-1 text-xs sm:text-sm text-[var(--ink)]">
          {lang === 'ml' ? 'മെസേജിൽ നിന്ന്' : 'From Messages'}: <b className="num">482 913</b>
        </span>
        <span className="text-xs font-bold text-[var(--leaf)]">
          {lang === 'ml' ? 'ചേർക്കുക' : 'Tap to fill'}
        </span>
      </button>

      <div className="flex items-center justify-between gap-3 mt-6 min-h-8">
        {sec > 0 ? (
          <span className="text-xs text-[var(--ink3)]">
            {lang === 'ml'
              ? `0:${String(sec).padStart(2, '0')} കഴിഞ്ഞ് വീണ്ടും അയയ്ക്കാം`
              : `Resend code in 0:${String(sec).padStart(2, '0')}`}
          </span>
        ) : (
          <button
            type="button"
            className="link text-xs font-bold"
            onClick={() => {
              setSec(30);
              toast(lang === 'ml' ? 'പുതിയ കോഡ് അയച്ചു' : 'New code sent');
            }}
          >
            {lang === 'ml' ? 'കോഡ് വീണ്ടും അയയ്ക്കുക' : 'Resend code'}
          </button>
        )}
        {busy && (
          <span className="flex items-center gap-1.5 text-xs text-[var(--ink2)]">
            <span className="spin" />
            {lang === 'ml' ? 'പരിശോധിക്കുന്നു' : 'Checking code'}
          </span>
        )}
      </div>
    </AuthFrame>
  );
}

export function ConsentView({
  onAgree,
  onDecline,
}: {
  onAgree: () => void;
  onDecline: () => void;
}) {
  const { lang } = usePatient();
  const [agreed, setAgreed] = useState(false);

  const rows = [
    [
      FileText,
      lang === 'ml' ? 'ഉപയോഗിക്കുന്ന വിവരങ്ങൾ' : 'What we use',
      lang === 'ml'
        ? 'നിങ്ങളുടെ പേര്, ഫോൺ/ഇമെയിൽ, ഹോസ്പിറ്റൽ നമ്പർ, ഡോക്ടർമാർ തയ്യാറാക്കുന്നതും നിങ്ങൾ അപ്‌ലോഡ് ചെയ്യുന്നതുമായ രേഖകൾ.'
        : 'Your name, contact details, hospital number, and the records your care team creates or you upload.',
    ],
    [
      Bell,
      lang === 'ml' ? 'എന്തിന്' : 'Why',
      lang === 'ml'
        ? 'രേഖകൾ കാണിക്കാനും പരിചരണ പദ്ധതി ഓർമ്മിപ്പിക്കാനും, നിങ്ങൾ പങ്കിടുന്നവ ഡോക്ടർമാർക്ക് കാണാനും.'
        : 'To show you your records, remind you about your care plan, and let your doctors see what you share between visits.',
    ],
    [
      Eye,
      lang === 'ml' ? 'ആർക്കൊക്കെ കാണാം' : 'Who can see it',
      lang === 'ml'
        ? 'നിങ്ങൾ, ഡെസ്കിൽ ബന്ധിപ്പിച്ച കുടുംബാംഗങ്ങൾ, നിങ്ങളെ ചികിത്സിക്കുന്ന ഡോക്ടർമാർ. ഓരോ തവണ രേഖ തുറക്കുന്നതും രേഖപ്പെടുത്തും.'
        : 'You, family you link at the desk, and doctors caring for you. Every time someone opens your record, it is logged.',
    ],
    [
      MapPin,
      lang === 'ml' ? 'എവിടെ സൂക്ഷിക്കുന്നു' : 'Where it is kept',
      lang === 'ml' ? 'ഇന്ത്യയിലെ സുരക്ഷിത സെർവറുകളിൽ.' : 'On secure servers in India.',
    ],
    [
      ShieldCheck,
      lang === 'ml' ? 'നിങ്ങളുടെ അവകാശങ്ങൾ' : 'Your choices',
      lang === 'ml'
        ? 'പ്രൊഫൈലിൽ നിന്ന് എപ്പോൾ വേണമെങ്കിലും വിവരങ്ങൾ കാണാം, തിരുത്താം, മായ്ക്കാൻ ആവശ്യപ്പെടാം, നോമിനിയെ ചേർക്കാം, സമ്മതം പിൻവലിക്കാം.'
        : 'See, correct or ask to erase your data, name a nominee, or withdraw consent anytime in Profile. Withdrawing does not affect your treatment.',
    ],
  ] as const;

  return (
    <AuthFrame
      title={lang === 'ml' ? 'നിങ്ങളുടെ വിവരങ്ങൾ എങ്ങനെ ഉപയോഗിക്കുന്നു' : 'How we use your information'}
      sub={lang === 'ml' ? 'രേഖകൾ കാണുന്നതിന് മുമ്പ് ഇത് വായിക്കുക.' : 'Read this before you see your records.'}
    >
      <div className="grp">
        {rows.map(([Icon, title, desc], i) => (
          <div key={i} className="row items-start">
            <span className="ico ico-leaf">
              <Icon size={18} />
            </span>
            <div className="flex-1">
              <h3 className="h3 text-sm font-bold text-[var(--ink)]">{title}</h3>
              <p className="text-xs text-[var(--ink2)] mt-1 leading-relaxed">{desc}</p>
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-[var(--ink3)] mt-4">
        {lang === 'ml' ? 'അറിയിപ്പ് പതിപ്പ് 1.2, ഒക്ടോബർ 2026' : 'Notice version 1.2, updated 1 Oct 2026'}
      </p>
      <p className="text-xs text-[var(--ink3)] mt-1">
        {lang === 'ml'
          ? 'പരാതികൾക്ക്: ഗ്രീവൻസ് ഓഫീസർ, grievance@abchospital.example'
          : 'Questions or complaints: Grievance Officer, grievance@abchospital.example'}
      </p>

      <label className="check mt-6">
        <input
          type="checkbox"
          checked={agreed}
          onChange={e => setAgreed(e.target.checked)}
        />
        <span className="text-xs sm:text-sm font-medium text-[var(--ink)]">
          {lang === 'ml'
            ? 'ഞാൻ ഇത് വായിച്ചു. എന്റെ വിവരങ്ങൾ ഇങ്ങനെ ഉപയോഗിക്കാൻ സമ്മതിക്കുന്നു.'
            : "I've read this and agree to ABC Hospital using my information this way."}
        </span>
      </label>

      <div className="flex gap-3 mt-6">
        <button
          type="button"
          className="btn-p btn-sec press flex-1"
          onClick={onDecline}
        >
          {lang === 'ml' ? 'ഇപ്പോൾ വേണ്ട' : 'Not now'}
        </button>
        <button
          type="button"
          className="btn-p btn-pri press flex-1"
          disabled={!agreed}
          onClick={onAgree}
        >
          {lang === 'ml' ? 'സമ്മതിച്ച് തുടരുക' : 'Agree and continue'}
        </button>
      </div>
    </AuthFrame>
  );
}

export function WhoView({ onContinue }: { onContinue: () => void }) {
  const { lang, pid, setPid } = usePatient();

  return (
    <AuthFrame
      title={lang === 'ml' ? 'ആരുടെ രേഖകൾ?' : 'Whose records?'}
      sub={lang === 'ml' ? 'ഈ ലോഗിനുമായി ബന്ധിപ്പിച്ചവർ.' : 'Your login is linked to these people.'}
    >
      <div className="flex flex-col gap-3" role="radiogroup">
        {SAMPLE_PEOPLE.map((person: PatientPerson) => (
          <button
            key={person.id}
            type="button"
            role="radio"
            aria-checked={pid === person.id}
            className={`who press ${pid === person.id ? 'on' : ''}`}
            onClick={() => setPid(person.id)}
          >
            <span
              className={`av ${person.kid ? 'kid' : ''}`}
              style={{ width: 52, height: 52, fontSize: 18 }}
              aria-hidden="true"
            >
              {person.ini}
            </span>
            <span className="flex-1 min-w-0">
              <b className="block text-base font-bold text-[var(--ink)]">{person.name}</b>
              <span className="block text-xs text-[var(--ink2)]">
                {person.rel === 'self'
                  ? lang === 'ml'
                    ? 'നിങ്ങൾ'
                    : 'You'
                  : lang === 'ml'
                  ? 'നിങ്ങളുടെ കുട്ടി, നിങ്ങൾ രക്ഷിതാവ്'
                  : "Your child, you're the guardian"}
              </span>
              <span className="block text-xs text-[var(--ink3)] mt-0.5">
                {lang === 'ml' ? 'ഹോസ്പിറ്റൽ നമ്പർ' : 'Hospital number'} {person.mrn}
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

      <button
        type="button"
        className="btn-p btn-pri press w-full mt-6"
        onClick={onContinue}
      >
        {lang === 'ml' ? 'തുടരുക' : 'Continue'}
      </button>
    </AuthFrame>
  );
}

export function PatientSignIn(): React.JSX.Element {
  const { lang, step, go, contact, toast } = usePatient();
  const navigate = useNavigate();

  let body: React.JSX.Element;
  if (step === 'welcome') {
    body = <WelcomeView onStartSignIn={() => go('signin')} />;
  } else if (step === 'signin') {
    body = (
      <SignInForm
        onBack={() => go('welcome')}
        onSentCode={() => go('otp')}
      />
    );
  } else if (step === 'otp') {
    body = (
      <OtpForm
        contact={contact}
        onBack={() => go('signin')}
        onVerifySuccess={() => go('consent')}
      />
    );
  } else if (step === 'consent') {
    body = (
      <ConsentView
        onAgree={() => go('who')}
        onDecline={() => {
          go('welcome');
          toast('You can agree later. Your treatment at the hospital is not affected.');
        }}
      />
    );
  } else if (step === 'who') {
    body = (
      <WhoView
        onContinue={() => {
          go('app');
          navigate('/patient');
        }}
      />
    );
  } else {
    body = <WelcomeView onStartSignIn={() => go('signin')} />;
  }

  return (
    <div className={`patient-theme ${lang === 'ml' ? 'ml' : ''} min-h-screen bg-[var(--paper)]`}>
      {body}
    </div>
  );
}

