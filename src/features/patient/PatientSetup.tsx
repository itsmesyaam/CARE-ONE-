import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { startRegistration, browserSupportsWebAuthn } from '@simplewebauthn/browser';
import {
  Fingerprint,
  ShieldCheck,
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  KeyRound,
  Copy,
  Check,
  QrCode,
  FileText,
  Lock,
} from 'lucide-react';
import { usePatient } from './PatientContext';
import { generateQrMatrix } from '../../lib/qr';

interface RegistrationOptionsData {
  options: unknown;
  user_id: string;
  purpose: 'patient' | 'patient_setup' | 'staff_setup';
  displayName: string;
  email?: string;
  role?: string;
}

interface TotpInfo {
  uri: string;
  secret: string;
  email: string;
  role: string;
}

// 6-digit CodeBoxes Component for TOTP verification
interface CodeBoxesProps {
  onOk: (code: string) => void;
  disabled?: boolean;
}

function CodeBoxes({ onOk, disabled }: CodeBoxesProps): React.JSX.Element {
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputsRef.current[0]?.focus();
  }, []);

  const handleChange = (index: number, val: string) => {
    const clean = val.replace(/\D/g, '');
    const newDigits = [...digits];

    if (clean.length > 1) {
      // Pasting full code
      const pasted = clean.slice(0, 6).split('');
      for (let i = 0; i < 6; i++) {
        newDigits[i] = pasted[i] || '';
      }
      setDigits(newDigits);
      const nextFocus = Math.min(pasted.length, 5);
      inputsRef.current[nextFocus]?.focus();
      if (newDigits.every((d) => d !== '')) {
        onOk(newDigits.join(''));
      }
      return;
    }

    newDigits[index] = clean;
    setDigits(newDigits);

    if (clean && index < 5) {
      inputsRef.current[index + 1]?.focus();
    }

    if (newDigits.every((d) => d !== '')) {
      onOk(newDigits.join(''));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  return (
    <div className="flex justify-between gap-2 sm:gap-3" role="group" aria-label="Authenticator code">
      {digits.map((digit, idx) => (
        <input
          key={idx}
          ref={(el) => {
            inputsRef.current[idx] = el;
          }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digit}
          disabled={disabled}
          onChange={(e) => handleChange(idx, e.target.value)}
          onKeyDown={(e) => handleKeyDown(idx, e)}
          className="w-12 h-14 sm:w-14 sm:h-16 text-center text-2xl font-bold font-mono rounded-xl border border-[var(--line)] bg-white text-[var(--ink)] focus:border-[var(--leaf)] focus:ring-2 focus:ring-[var(--leaf)]/20 focus:outline-hidden transition shadow-xs disabled:opacity-50"
          aria-label={`Digit ${idx + 1}`}
        />
      ))}
    </div>
  );
}

export function PatientSetup(): React.JSX.Element {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const navigate = useNavigate();
  const { lang, setLang } = usePatient();

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Flow State
  const [setupInfo, setSetupInfo] = useState<RegistrationOptionsData | null>(null);
  const [totpInfo, setTotpInfo] = useState<TotpInfo | null>(null);
  const [step, setStep] = useState<'passkey' | 'totp' | 'consent'>('passkey');
  const [copiedKey, setCopiedKey] = useState(false);

  // Fetch registration options / metadata on load
  useEffect(() => {
    let mounted = true;

    async function loadOptions() {
      if (!token) {
        if (mounted) {
          setError(
            lang === 'ml'
              ? 'സജ്ജീകരണ ലിങ്ക് അസാധുവാണ്. ഫ്രണ്ട് ഡെസ്കിൽ നിന്ന് പുതിയ QR കോഡ് നേടുക.'
              : 'Setup link is missing or invalid. Please ask the front desk or hospital admin for a new link.'
          );
          setInitialLoading(false);
        }
        return;
      }

      try {
        const optRes = await fetch('/api/auth/passkey/register/options', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });

        const optData = (await optRes.json()) as RegistrationOptionsData & { error?: string };
        if (!optRes.ok || !optData.options) {
          throw new Error(
            optData.error ||
              (lang === 'ml'
                ? 'ലിങ്ക് കാലഹരണപ്പെട്ടു അല്ലെങ്കിൽ ഇതിനകം ഉപയോഗിച്ചു. പുതിയ ലിങ്ക് നേടുക.'
                : 'Setup link is invalid, expired, or already used.')
          );
        }

        if (mounted) {
          setSetupInfo(optData);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : String(err));
        }
      } finally {
        if (mounted) {
          setInitialLoading(false);
        }
      }
    }

    void loadOptions();

    return () => {
      mounted = false;
    };
  }, [token, lang]);

  // Passkey Registration Handler
  const handleRegister = async () => {
    if (!token) {
      setError(
        lang === 'ml'
          ? 'സജ്ജീകരണ ലിങ്ക് അസാധുവാണ്.'
          : 'Setup link is missing or invalid.'
      );
      return;
    }

    if (!browserSupportsWebAuthn()) {
      setError(
        lang === 'ml'
          ? 'നിങ്ങളുടെ ബ്രൗസർ പാസ്‌കീ പിന്തുണയ്ക്കുന്നില്ല. Android 9+ ലെ Chrome അല്ലെങ്കിൽ iOS 16+ ലെ Safari ഉപയോഗിക്കുക.'
          : 'Your browser does not support passkeys. Please use Chrome on Windows/Android or Safari on Mac/iOS.'
      );
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let options = setupInfo?.options;

      // If options were not loaded yet, fetch now
      if (!options) {
        const optRes = await fetch('/api/auth/passkey/register/options', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });
        const optData = (await optRes.json()) as RegistrationOptionsData & { error?: string };
        if (!optRes.ok || !optData.options) {
          throw new Error(optData.error || 'Setup link expired or already used.');
        }
        options = optData.options;
        setSetupInfo(optData);
      }

      // 1. Browser platform biometric prompt (Windows Hello / Mac Touch ID / Android / Security Key)
      const regResponse = await startRegistration(options as Parameters<typeof startRegistration>[0]);

      // 2. Verify attestation on Worker backend
      const verifyRes = await fetch('/api/auth/passkey/register/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          response: regResponse,
          device_label: navigator.userAgent.includes('Mobile') ? 'Mobile Phone' : 'Desktop Browser',
        }),
      });

      const verifyData = (await verifyRes.json()) as {
        ok?: boolean;
        error?: string;
        require_totp?: boolean;
        totp_uri?: string;
        totp_secret?: string;
        email?: string;
        role?: string;
      };

      if (!verifyRes.ok || !verifyData.ok) {
        throw new Error(verifyData.error || 'Failed to register biometric passkey');
      }

      setSuccess(true);

      // Handle Staff Setup Flow: TOTP Enrolment
      if (verifyData.require_totp && verifyData.totp_uri && verifyData.totp_secret) {
        setTotpInfo({
          uri: verifyData.totp_uri,
          secret: verifyData.totp_secret,
          email: verifyData.email || setupInfo?.email || 'admin@example.com',
          role: verifyData.role || setupInfo?.role || 'admin',
        });
        setStep('totp');
        setSuccess(false);
      } else {
        // Patient Flow: Show DPDP Consent View
        setStep('consent');
      }
    } catch (err: unknown) {
      console.error('Passkey setup error:', err);
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes('NotAllowedError') || message.includes('cancelled')) {
        setError(
          lang === 'ml'
            ? 'ബയോമെട്രിക് രജിസ്ട്രേഷൻ റദ്ദാക്കി. വീണ്ടും ശ്രമിക്കുക.'
            : 'Biometric registration was cancelled. On Windows, ensure Windows Hello PIN or fingerprint is set up in Windows Settings, or choose "Use a phone" to scan with Android.'
        );
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  // Staff Factor 2: TOTP Verification Handler
  const handleTotpVerify = async (code: string) => {
    if (!totpInfo) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/mfa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: totpInfo.email,
          code,
        }),
      });

      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Invalid authenticator code. Check device time sync.');
      }

      setSuccess(true);
      setTimeout(() => {
        if (totpInfo.role === 'admin') {
          navigate('/admin');
        } else {
          navigate('/doctor');
        }
      }, 600);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid authenticator code');
    } finally {
      setLoading(false);
    }
  };

  // Copy TOTP Key to Clipboard
  const handleCopyKey = () => {
    if (!totpInfo?.secret) return;
    navigator.clipboard.writeText(totpInfo.secret);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2500);
  };

  // Render QR Code matrix for TOTP enrolment
  const totpUri = totpInfo?.uri;
  const totpMatrix = useMemo(() => {
    if (!totpUri) return null;
    try {
      return generateQrMatrix(totpUri);
    } catch {
      return null;
    }
  }, [totpUri]);

  const isStaff = setupInfo?.purpose === 'staff_setup';

  return (
    <div className={`min-h-screen flex flex-col bg-[var(--paper)] text-[var(--ink)] ${isStaff ? 'staff-theme' : 'patient-theme'}`}>
      <div className="zari-band" />

      {/* Header Bar */}
      <header className="flex items-center justify-between gap-4 px-5 lg:px-12 pt-5">
        <div className="flex items-center gap-3">
          <span className="logo" aria-hidden="true">
            ABC
          </span>
          <span className="leading-tight">
            <b className="block text-base font-bold text-[var(--ink)]">ABC Hospital</b>
            <span className="block text-xs text-[var(--ink3)]">
              {isStaff ? (lang === 'ml' ? 'സ്റ്റാഫ് കൺസോൾ' : 'Staff Console') : (lang === 'ml' ? 'കെയർ ആപ്പ്' : 'Care app')}
            </span>
          </span>
        </div>
        <div className="seg seg-sm w-[170px]" role="radiogroup">
          <button
            type="button"
            className={lang === 'en' ? 'on' : ''}
            onClick={() => setLang('en')}
          >
            English
          </button>
          <button
            type="button"
            className={lang === 'ml' ? 'on' : ''}
            onClick={() => setLang('ml')}
          >
            മലയാളം
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-lg mx-auto px-5 py-8 lg:py-14 flex flex-col justify-center">
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-[var(--line)]">

          {/* Initial Loading State */}
          {initialLoading && (
            <div className="py-16 flex flex-col items-center justify-center text-center gap-3">
              <span className="spin h-8 w-8 text-[var(--leaf)]" />
              <p className="text-sm font-semibold text-[var(--ink2)]">
                {lang === 'ml' ? 'സജ്ജീകരണ ലിങ്ക് പരിശോധിക്കുന്നു...' : 'Verifying setup link...'}
              </p>
            </div>
          )}

          {/* Initial Error State (e.g. invalid / expired link) */}
          {!initialLoading && error && !setupInfo && (
            <div className="py-6 text-center">
              <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4 mx-auto">
                <AlertCircle size={36} />
              </div>
              <h1 className="text-xl font-bold text-[var(--ink)]">
                {lang === 'ml' ? 'ലിങ്ക് അസാധുവാണ്' : 'Invalid or Expired Link'}
              </h1>
              <p className="text-sm text-[var(--ink2)] mt-2 leading-relaxed">
                {error}
              </p>
              <div className="mt-6">
                <button
                  type="button"
                  onClick={() => navigate(isStaff ? '/staff/login' : '/patient/login')}
                  className="btn-p btn-pri w-full py-3 text-sm font-bold"
                >
                  {lang === 'ml' ? 'ലോഗിൻ പേജിലേക്ക് മടങ്ങുക' : 'Return to Login'}
                </button>
              </div>
            </div>
          )}

          {/* STEP 1: Passkey Registration */}
          {!initialLoading && (!error || setupInfo) && step === 'passkey' && (
            <div>
              <div className="w-16 h-16 rounded-2xl bg-[var(--mist)] text-[var(--leaf)] flex items-center justify-center mb-6 mx-auto">
                {success ? <CheckCircle2 size={36} className="leaf" /> : isStaff ? <KeyRound size={36} /> : <Fingerprint size={36} />}
              </div>

              <h1 className="disp text-2xl sm:text-3xl font-bold text-center text-[var(--ink)]">
                {isStaff
                  ? lang === 'ml'
                    ? 'സെക്യൂരിറ്റി കീ അല്ലെങ്കിൽ പാസ്‌കീ സജ്ജീകരിക്കുക'
                    : 'Register Security Key / Passkey'
                  : lang === 'ml'
                  ? 'ബയോമെട്രിക് പ്രവേശനം ക്രമീകരിക്കുക'
                  : 'Set up Biometric Access'}
              </h1>

              {isStaff && setupInfo?.displayName && (
                <div className="mt-2 text-center">
                  <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-[var(--mist)] text-[var(--leaf)]">
                    {setupInfo.displayName} &bull; {setupInfo.role?.toUpperCase() || 'STAFF'}
                  </span>
                </div>
              )}

              <p className="text-[var(--ink2)] text-sm sm:text-base text-center mt-3 leading-relaxed">
                {isStaff
                  ? lang === 'ml'
                    ? 'ഹോസ്പിറ്റൽ സുരക്ഷാ നയം അനുസരിച്ച് പാസ്‌വേഡുകൾക്ക് പകരം ഫിസിക്കൽ സെക്യൂരിറ്റി കീ അല്ലെങ്കിൽ വിൻഡോസ് ഹലോ / ഫിംഗർപ്രിന്റ് ഉപയോഗിക്കുക.'
                    : 'Hospital security policy strictly requires hardware security keys or device passkeys. Passwords and SMS OTPs are prohibited.'
                  : lang === 'ml'
                  ? 'നിങ്ങളുടെ മെഡിക്കൽ രേഖകൾ സുരക്ഷിതമായി കാണാൻ ഫോണിന്റെ ഫിംഗർപ്രിന്റ് അല്ലെങ്കിൽ ഫെയ്സ് ലോക്ക് ഉപയോഗിക്കുക. പാസ്‌വേഡോ എസ്എംഎസ് കോഡോ ആവശ്യമില്ല.'
                  : 'Unlock your medical records instantly using your fingerprint, face unlock, or screen lock. No passwords or SMS codes needed.'}
              </p>

              {/* Windows Hello & Security Key Guidance for Staff */}
              {isStaff && (
                <div className="mt-5 p-4 rounded-2xl bg-sky-50 border border-sky-200 text-sky-900 text-xs sm:text-sm leading-relaxed">
                  <b className="block font-bold mb-1">
                    {lang === 'ml' ? 'ഡെസ്ക്ടോപ്പ് & വിൻഡോസ് ഉപയോക്താക്കൾ:' : 'Desktop & Windows Chrome Users:'}
                  </b>
                  {lang === 'ml'
                    ? 'വിൻഡോസ് ഹലോ (PIN/ഫിംഗർപ്രിന്റ്) ഉപയോഗിക്കുക. അല്ലെങ്കിൽ ബ്രൗസർ പ്രോംപ്റ്റിൽ "Use a phone" തിരഞ്ഞെടുത്ത് ആൻഡ്രോയിഡ് ഫോൺ ഉപയോഗിച്ച് സ്കാൻ ചെയ്യുക.'
                    : 'Use Windows Hello (PIN or fingerprint), or choose "Use a phone" in the browser prompt to scan a QR code with your mobile device.'}
                </div>
              )}

              <div className="mt-5 p-4 rounded-2xl bg-[var(--mist)] flex items-start gap-3">
                <ShieldCheck size={22} className="leaf flex-none mt-0.5" />
                <div className="text-xs sm:text-sm text-[var(--ink2)] leading-snug">
                  <b className="block text-[var(--ink)] font-semibold mb-0.5">
                    {lang === 'ml' ? 'ഇന്ത്യ ഡിപിഡിപി ആക്ട് സംരക്ഷിതം' : 'India DPDP Act Compliant'}
                  </b>
                  {lang === 'ml'
                    ? 'നിങ്ങളുടെ ബയോമെട്രിക് വിവരങ്ങൾ നിങ്ങളുടെ സ്വന്തം ഉപകരണത്തിൽ മാത്രമേ സൂക്ഷിക്കൂ; ഹോസ്പിറ്റൽ സെർവറുകളിലേക്ക് അയക്കില്ല.'
                    : 'Your biometrics never leave your physical device; only a cryptographic passkey is registered.'}
                </div>
              </div>

              {error && (
                <div className="mt-5 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-start gap-2.5">
                  <AlertCircle size={18} className="flex-none mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <div className="mt-8 flex flex-col gap-3">
                <button
                  type="button"
                  className="btn-p btn-pri press w-full shadow-md flex items-center justify-center gap-2"
                  disabled={loading || success}
                  onClick={handleRegister}
                >
                  {loading ? (
                    <>
                      <span className="spin" />
                      <span>{lang === 'ml' ? 'സജ്ജീകരിക്കുന്നു...' : 'Setting up...'}</span>
                    </>
                  ) : success ? (
                    <>
                      <CheckCircle2 size={18} />
                      <span>{lang === 'ml' ? 'വിജയം!' : 'Success!'}</span>
                    </>
                  ) : isStaff ? (
                    <>
                      <KeyRound size={20} />
                      <span>
                        {lang === 'ml' ? 'സെക്യൂരിറ്റി കീ രജിസ്റ്റർ ചെയ്യുക' : 'Register security key'}
                      </span>
                      <ArrowRight size={18} />
                    </>
                  ) : (
                    <>
                      <Fingerprint size={20} />
                      <span>
                        {lang === 'ml'
                          ? 'എന്റെ പാസ്‌കീ സൃഷ്ടിക്കുക'
                          : 'Create my passkey'}
                      </span>
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Staff TOTP Enrolment */}
          {!initialLoading && step === 'totp' && totpInfo && (
            <div className="fadein">
              <div className="w-16 h-16 rounded-2xl bg-[var(--leaft)] text-[var(--leafd)] flex items-center justify-center mb-5 mx-auto">
                <QrCode size={36} />
              </div>

              <h1 className="disp text-2xl sm:text-3xl font-bold text-center text-[var(--ink)]">
                {lang === 'ml'
                  ? 'ഓതന്റിക്കേറ്റർ ആപ്പ് സജ്ജീകരിക്കുക'
                  : 'Set up Authenticator App'}
              </h1>

              <p className="text-[var(--ink2)] text-xs sm:text-sm text-center mt-2 leading-relaxed">
                {lang === 'ml'
                  ? 'രണ്ടാം ഘട്ട സുരക്ഷയ്ക്കായി ഗൂഗിൾ ഓതന്റിക്കേറ്റർ ആപ്പ് ഉപയോഗിച്ച് ഈ QR കോഡ് സ്കാൻ ചെയ്യുക.'
                  : 'Hospital security requires two-factor authentication (TOTP). Scan this QR code with Google Authenticator or Microsoft Authenticator.'}
              </p>

              {/* QR Code SVG */}
              <div className="mt-5 p-4 rounded-2xl bg-white border border-[var(--line)] shadow-xs flex flex-col items-center">
                {totpMatrix ? (
                  <svg
                    viewBox={`0 0 ${totpMatrix.length} ${totpMatrix.length}`}
                    className="w-48 h-48 sm:w-52 sm:h-52 rounded-lg select-none"
                    aria-label="Two-factor authentication QR code"
                  >
                    <rect width={totpMatrix.length} height={totpMatrix.length} fill="#ffffff" />
                    {totpMatrix.flatMap((row, r) =>
                      row.map((cell, c) =>
                        cell ? (
                          <rect
                            key={`${r}-${c}`}
                            x={c}
                            y={r}
                            width={1}
                            height={1}
                            fill="#173327"
                          />
                        ) : null
                      )
                    )}
                  </svg>
                ) : (
                  <div className="w-48 h-48 flex items-center justify-center text-xs text-[var(--ink3)]">
                    QR code not available
                  </div>
                )}

                {/* Secret Key Display with Copy */}
                <div className="mt-4 w-full p-2.5 rounded-xl bg-[var(--mist)] border border-[var(--line)] flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-[var(--ink3)]">
                      {lang === 'ml' ? 'മാനുവൽ സീക്രട്ട് കീ' : 'Manual Setup Key'}
                    </span>
                    <span className="font-mono text-xs sm:text-sm font-bold text-[var(--ink)] tracking-wider">
                      {totpInfo.secret}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyKey}
                    className="p-2 rounded-lg text-[var(--ink2)] hover:bg-white hover:text-[var(--ink)] transition shadow-2xs"
                    aria-label="Copy secret key"
                  >
                    {copiedKey ? <Check size={18} className="text-emerald-600" /> : <Copy size={18} />}
                  </button>
                </div>
              </div>

              {/* 6-Digit Code Entry */}
              <div className="mt-6">
                <label className="block text-xs sm:text-sm font-semibold text-[var(--ink)] mb-2 text-center">
                  {lang === 'ml'
                    ? 'ആപ്പിൽ നിന്നുള്ള 6-അക്ക കോഡ് നൽകുക:'
                    : 'Enter the 6-digit code shown in your app:'}
                </label>
                <CodeBoxes onOk={handleTotpVerify} disabled={loading || success} />
              </div>

              {error && (
                <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm flex items-start gap-2">
                  <AlertCircle size={16} className="flex-none mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {success && (
                <div className="mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm flex items-center justify-center gap-2 font-semibold">
                  <CheckCircle2 size={18} />
                  <span>{lang === 'ml' ? 'പരിശോധന വിജയിച്ചു! റീഡയറക്ട് ചെയ്യുന്നു...' : 'Two-factor verified! Redirecting to dashboard...'}</span>
                </div>
              )}
            </div>
          )}

          {/* STEP 3: Patient DPDP Consent Barrier */}
          {!initialLoading && step === 'consent' && (
            <div className="fadein">
              <div className="w-16 h-16 rounded-2xl bg-[var(--mist)] text-[var(--leaf)] flex items-center justify-center mb-6 mx-auto">
                <FileText size={36} />
              </div>

              <h1 className="disp text-2xl sm:text-3xl font-bold text-center text-[var(--ink)]">
                {lang === 'ml'
                  ? 'ഡിജിറ്റൽ ആരോഗ്യ രേഖകൾക്കുള്ള സമ്മതം'
                  : 'Digital Health Records Consent'}
              </h1>

              <div className="mt-4 p-4 rounded-2xl bg-[var(--paper)] border border-[var(--line)] text-xs sm:text-sm text-[var(--ink2)] space-y-3 leading-relaxed">
                <p>
                  <b>ABC Hospital</b>{' '}
                  {lang === 'ml'
                    ? 'ഇന്ത്യയുടെ ഡിജിറ്റൽ വ്യക്തിഗത വിവര സംരക്ഷണ നിയമം (DPDP Act 2023) പ്രകാരം നിങ്ങളുടെ മെഡിക്കൽ രേഖകൾ കാണുന്നതിന് ഈ സുരക്ഷിത പോർട്ടൽ നൽകുന്നു.'
                    : 'provides this secure digital portal under India’s Digital Personal Data Protection Act 2023 to enable direct access to your clinical records.'}
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>{lang === 'ml' ? 'കൺസൾട്ടേഷൻ കുറിപ്പുകൾ, മരുന്നുകൾ, ലാബ് റിപ്പോർട്ടുകൾ കാണുക.' : 'Review consultation notes, prescriptions, and diagnostic lab reports.'}</li>
                  <li>{lang === 'ml' ? 'നിങ്ങളുടെ പരിചരണ സംഘവുമായി സുരക്ഷിതമായി വിവരങ്ങൾ കൈമാറുക.' : 'Track health readings and care plan reminders.'}</li>
                  <li>{lang === 'ml' ? 'നിങ്ങൾക്ക് എപ്പോൾ വേണമെങ്കിലും പ്രൊഫൈലിൽ നിന്ന് സമ്മതം പിൻവലിക്കാം.' : 'You can view, download, or withdraw digital access anytime in your Profile.'}</li>
                </ul>
              </div>

              <div className="mt-6 flex items-center gap-2 text-xs text-[var(--ink3)]">
                <Lock size={16} className="text-[var(--leaf)] flex-none" />
                <span>
                  {lang === 'ml'
                    ? 'സമ്മതം നൽകിയാൽ മാത്രമേ ക്ലിനിക്കൽ രേഖകൾ തുറക്കൂ.'
                    : 'Health records remain locked until consent is confirmed.'}
                </span>
              </div>

              <div className="mt-8">
                <button
                  type="button"
                  className="btn-p btn-pri press w-full shadow-md flex items-center justify-center gap-2"
                  onClick={() => navigate('/patient')}
                >
                  <span>
                    {lang === 'ml'
                      ? 'സമ്മതിക്കുന്നു, രേഖകൾ കാണുക'
                      : 'I Agree & View My Records'}
                  </span>
                  <ArrowRight size={18} />
                </button>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
