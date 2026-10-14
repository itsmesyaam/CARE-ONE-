import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, Link } from 'react-router-dom';
import {
  ShieldCheck,
  ChevronLeft,
  Copy,
  Check,
  Languages,
  Stethoscope,
  KeyRound,
  AlertCircle,
} from 'lucide-react';
import { startAuthentication, browserSupportsWebAuthn } from '@simplewebauthn/browser';
import { BuildStamp } from '../../components/BuildStamp';

export type StaffAuthStep = 'signin' | 'twofa' | 'enroll' | 'lock';

interface StaffSignInProps {
  initialStep?: StaffAuthStep;
}

// Visual QR Code SVG for TOTP enrollment
function QRCodeSvg(): React.JSX.Element {
  return (
    <svg
      width="168"
      height="168"
      viewBox="0 0 168 168"
      className="rounded-2xl border border-[var(--line)] bg-white p-2.5 shadow-sm"
      aria-label="Two-factor authentication QR code"
    >
      <rect width="168" height="168" fill="#ffffff" />
      <rect x="12" y="12" width="40" height="40" rx="6" fill="#173327" />
      <rect x="20" y="20" width="24" height="24" rx="2" fill="#ffffff" />
      <rect x="26" y="26" width="12" height="12" rx="1" fill="#1F6B4F" />

      <rect x="116" y="12" width="40" height="40" rx="6" fill="#173327" />
      <rect x="124" y="20" width="24" height="24" rx="2" fill="#ffffff" />
      <rect x="130" y="26" width="12" height="12" rx="1" fill="#1F6B4F" />

      <rect x="12" y="116" width="40" height="40" rx="6" fill="#173327" />
      <rect x="20" y="124" width="24" height="24" rx="2" fill="#ffffff" />
      <rect x="26" y="130" width="12" height="12" rx="1" fill="#1F6B4F" />

      <rect x="62" y="14" width="8" height="8" fill="#173327" />
      <rect x="76" y="14" width="14" height="8" fill="#173327" />
      <rect x="96" y="14" width="8" height="8" fill="#173327" />

      <rect x="62" y="28" width="12" height="8" fill="#1F6B4F" />
      <rect x="80" y="28" width="8" height="8" fill="#173327" />
      <rect x="94" y="28" width="12" height="8" fill="#173327" />

      <rect x="14" y="62" width="140" height="6" fill="#173327" />
      <rect x="14" y="76" width="10" height="8" fill="#173327" />
      <rect x="32" y="76" width="16" height="8" fill="#173327" />
      <rect x="56" y="76" width="24" height="8" fill="#1F6B4F" />
      <rect x="88" y="76" width="14" height="8" fill="#173327" />
    </svg>
  );
}

// 6-digit CodeBoxes Component for TOTP verification
interface CodeBoxesProps {
  label: string;
  onOk: (code: string) => void;
}

function CodeBoxes({ label, onOk }: CodeBoxesProps): React.JSX.Element {
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
    <div>
      <label className="lbl block text-sm font-semibold text-[var(--ink)] mb-2">{label}</label>
      <div className="flex justify-between gap-2 sm:gap-3" role="group" aria-label={label}>
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
            onChange={(e) => handleChange(idx, e.target.value)}
            onKeyDown={(e) => handleKeyDown(idx, e)}
            className="w-12 h-14 sm:w-14 sm:h-16 text-center text-2xl font-bold font-mono rounded-xl border border-[var(--line)] bg-white text-[var(--ink)] focus:border-[var(--leaf)] focus:ring-2 focus:ring-[var(--leaf)]/20 focus:outline-hidden transition shadow-xs"
            aria-label={`Digit ${idx + 1}`}
          />
        ))}
      </div>
    </div>
  );
}

export function StaffSignIn({ initialStep = 'signin' }: StaffSignInProps): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const [step, setStep] = useState<StaffAuthStep>(initialStep);
  const [email] = useState('dr.rahul@example.com');
  const [busy, setBusy] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [detectedRole, setDetectedRole] = useState<string>('doctor');

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const toggleLanguage = () => {
    const nextLang = i18n.language === 'ml' ? 'en' : 'ml';
    i18n.changeLanguage(nextLang);
  };

  // 1. Staff Passkey Authentication Handler
  const handlePasskeySignIn = async () => {
    setAuthError(null);

    if (!browserSupportsWebAuthn()) {
      setAuthError('Your browser does not support WebAuthn security keys or passkeys.');
      return;
    }

    setBusy(true);

    try {
      // Fetch authentication options
      const optRes = await fetch('/api/auth/passkey/login/options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const optData = (await optRes.json()) as { options?: unknown; error?: string };
      if (!optRes.ok || !optData.options) {
        throw new Error(optData.error || 'Failed to initialize passkey sign-in');
      }

      // Prompt hardware security key or device biometric
      const authResponse = await startAuthentication(optData.options as Parameters<typeof startAuthentication>[0]);

      // Verify on backend
      const verifyRes = await fetch('/api/auth/passkey/login/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response: authResponse }),
      });

      const verifyData = (await verifyRes.json()) as {
        ok?: boolean;
        error?: string;
        require_totp?: boolean;
        role?: string;
      };

      if (!verifyRes.ok || !verifyData.ok) {
        throw new Error(verifyData.error || 'Passkey verification failed');
      }

      setDetectedRole(verifyData.role || 'doctor');

      // Staff requirement: passkey satisfies Factor 1; advance to Factor 2 (TOTP)
      if (verifyData.require_totp) {
        setStep('twofa');
        showToast('Passkey verified. Enter authenticator code.');
      } else {
        // Direct navigation if already elevated
        navigate(verifyData.role === 'admin' ? '/admin' : '/doctor');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes('NotAllowedError') || message.toLowerCase().includes('cancel')) {
        setAuthError('Passkey authentication was cancelled. Please try again.');
      } else {
        setAuthError(message);
      }
    } finally {
      setBusy(false);
    }
  };

  // 2. Staff Factor 2: TOTP Verification Handler
  const handleTotpVerify = async (code: string) => {
    setAuthError(null);
    setBusy(true);

    try {
      const res = await fetch('/api/auth/mfa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      });

      const data = (await res.json()) as { ok?: boolean; error?: string; user?: { role?: string } };
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Invalid authenticator code. Check device time sync.');
      }

      showToast('Two-factor authentication successful');
      const role = data.user?.role || detectedRole;

      setTimeout(() => {
        if (role === 'admin') {
          navigate('/admin');
        } else {
          navigate('/doctor');
        }
      }, 500);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Invalid authenticator code');
    } finally {
      setBusy(false);
    }
  };

  // Local demo sign-in handler for developers
  const handleDemoSignIn = async (role: 'doctor' | 'front_desk' | 'admin') => {
    setBusy(true);
    setAuthError(null);
    try {
      const res = await fetch('/api/auth/demo-signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Demo sign-in failed');
      }
      showToast(`Signed in as ${role}`);
      setTimeout(() => {
        navigate(role === 'admin' ? '/admin' : '/doctor');
      }, 500);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const copySetupKey = () => {
    navigator.clipboard.writeText('JBSWY3DPEHPK3PXP');
    showToast(t('staffAuth.keyCopied'));
  };

  const isLocal = import.meta.env.DEV;

  return (
    <div className="staff-theme min-h-screen flex flex-col bg-[var(--paper)] overflow-x-hidden w-full">
      <div className="zari-band" />

      {/* Top Header Bar */}
      <header className="w-full max-w-7xl mx-auto flex items-center justify-between gap-3 px-4 sm:px-6 lg:px-10 pt-4">
        {step !== 'signin' ? (
          <button
            type="button"
            className="inline-flex items-center gap-1.5 text-sm font-bold text-[var(--leaf)] hover:text-[var(--leafd)] transition-colors"
            onClick={() => setStep('signin')}
          >
            <ChevronLeft size={20} />
            {t('staffAuth.back')}
          </button>
        ) : (
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <Link to="/" className="flex items-center gap-2.5 sm:gap-3 min-w-0" aria-label="CareOne Home">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#E9EEFE] text-[#2B59FF] shadow-xs">
                <Stethoscope className="h-5 w-5" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-extrabold text-sm sm:text-base text-[var(--ink)] leading-none tracking-tight truncate">
                  CareOne
                </span>
                <span className="text-[11px] font-semibold text-[var(--ink3)] leading-tight truncate">
                  {t('staffAuth.forStaff')}
                </span>
              </div>
            </Link>
          </div>
        )}

        <button
          type="button"
          onClick={toggleLanguage}
          className="shrink-0 inline-flex items-center gap-1.5 rounded-full border border-[var(--line)] bg-white px-3.5 py-1.5 text-xs font-semibold text-[var(--ink2)] shadow-2xs hover:bg-[var(--leaft)] transition-colors"
          aria-label="Toggle language"
        >
          <Languages size={15} />
          <span>{i18n.language === 'ml' ? 'English' : 'മലയാളം'}</span>
        </button>
      </header>

      {/* Auth Content Area */}
      <main className="flex-1 w-full max-w-md mx-auto px-5 pt-8 pb-24 lg:pt-14">
        {step === 'signin' && (
          <div className="fadein">
            <h1 className="disp h1 text-[var(--ink)]">{t('staffAuth.signInTitle')}</h1>
            <p className="mt-3 text-lg text-[var(--ink2)] leading-relaxed">
              Sign in using your hardware security key or device passkey. Two-factor authenticator app is required.
            </p>

            {authError && (
              <div className="mt-5 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-start gap-2.5">
                <AlertCircle size={18} className="flex-none mt-0.5" />
                <span>{authError}</span>
              </div>
            )}

            <div className="mt-8 flex flex-col gap-4">
              {/* Primary Passkey Sign-in Button */}
              <button
                type="button"
                className="btn btn-pri w-full py-4 text-base font-bold shadow-md flex items-center justify-center gap-2.5"
                disabled={busy}
                onClick={handlePasskeySignIn}
              >
                {busy ? (
                  <>
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>Verifying passkey...</span>
                  </>
                ) : (
                  <>
                    <KeyRound size={20} />
                    <span>Sign in with security key / passkey</span>
                  </>
                )}
              </button>

              <div className="p-4 rounded-2xl bg-[var(--mist)] flex items-start gap-3 mt-2">
                <ShieldCheck size={20} className="leaf flex-none mt-0.5" />
                <p className="text-xs text-[var(--ink2)] leading-snug">
                  Hospital staff must use physical security keys or registered biometric passkeys plus TOTP. Single-factor passwords and email codes are prohibited.
                </p>
              </div>

              {/* Local-only Demo Sign-in buttons */}
              {isLocal && (
                <div className="mt-6 p-4 rounded-2xl bg-amber-50/80 border border-amber-200 text-left">
                  <span className="block text-[11px] font-bold uppercase tracking-wider text-amber-800 mb-2">
                    Local Development Only (Demo Accounts)
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => handleDemoSignIn('doctor')}
                      className="px-2 py-2 text-xs font-semibold rounded-xl bg-white border border-amber-300 text-amber-900 hover:bg-amber-100 transition shadow-xs text-center"
                    >
                      Dr. Rahul
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDemoSignIn('front_desk')}
                      className="px-2 py-2 text-xs font-semibold rounded-xl bg-white border border-amber-300 text-amber-900 hover:bg-amber-100 transition shadow-xs text-center"
                    >
                      Front Desk
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDemoSignIn('admin')}
                      className="px-2 py-2 text-xs font-semibold rounded-xl bg-white border border-amber-300 text-amber-900 hover:bg-amber-100 transition shadow-xs text-center"
                    >
                      Admin
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-8 pt-6 border-t border-[var(--line)]">
              <button
                type="button"
                className="link text-sm"
                onClick={() => navigate('/patient/login')}
              >
                {t('staffAuth.patientApp')}
              </button>
            </div>
          </div>
        )}

        {step === 'twofa' && (
          <div className="fadein">
            <h1 className="disp h1 text-[var(--ink)]">{t('staffAuth.twofaTitle')}</h1>
            <p className="mt-3 text-lg text-[var(--ink2)] leading-relaxed">
              Enter the 6-digit verification code from your authenticator app (Google Authenticator / Microsoft Authenticator).
            </p>

            <div className="mt-8">
              <CodeBoxes label={t('staffAuth.authCode')} onOk={handleTotpVerify} />
              {authError && (
                <p className="mt-3 text-sm font-semibold text-rose-600" role="alert">
                  {authError}
                </p>
              )}
            </div>

            <div className="lock-note mt-6">
              <ShieldCheck size={18} className="flex-none mt-0.5 text-emerald-700" />
              <span>{t('staffAuth.recordsHiddenNote')}</span>
            </div>

            <p className="mt-5 text-sm text-[var(--ink3)]">
              {t('staffAuth.lostPhone')}
            </p>

            <button
              type="button"
              className="link mt-4 block text-left text-sm"
              onClick={() => setStep('enroll')}
            >
              {t('staffAuth.firstTimeEnroll')}
            </button>
          </div>
        )}

        {step === 'enroll' && (
          <div className="fadein">
            <h1 className="disp h1 text-[var(--ink)]">{t('staffAuth.enrollTitle')}</h1>
            <p className="mt-3 text-lg text-[var(--ink2)] leading-relaxed">
              {t('staffAuth.enrollSub')}
            </p>

            <ol className="mt-8 flex flex-col gap-8">
              <li className="flex gap-4">
                <span className="enum">1</span>
                <div className="min-w-0 flex-1">
                  <h2 className="h3 text-[var(--ink)]">{t('staffAuth.step1Title')}</h2>
                  <p className="mt-1 text-sm text-[var(--ink2)]">{t('staffAuth.step1Desc')}</p>
                </div>
              </li>

              <li className="flex gap-4">
                <span className="enum">2</span>
                <div className="min-w-0 flex-1">
                  <h2 className="h3 text-[var(--ink)]">{t('staffAuth.step2Title')}</h2>
                  <div className="mt-3">
                    <QRCodeSvg />
                  </div>
                  <p className="mt-3 text-sm text-[var(--ink3)]">{t('staffAuth.step2Alt')}</p>
                  <div className="keybox">
                    <b className="num text-sm text-[var(--ink)]">JBSW Y3DP EHPK 3PXP</b>
                    <button
                      type="button"
                      className="p-1.5 rounded-lg text-[var(--ink2)] hover:bg-white hover:text-[var(--ink)] transition-colors"
                      onClick={copySetupKey}
                      aria-label={t('staffAuth.copyKey')}
                    >
                      <Copy size={18} />
                    </button>
                  </div>
                </div>
              </li>

              <li className="flex gap-4">
                <span className="enum">3</span>
                <div className="min-w-0 flex-1">
                  <h2 className="h3 text-[var(--ink)]">{t('staffAuth.step3Title')}</h2>
                  <div className="mt-3">
                    <CodeBoxes
                      label={t('staffAuth.codeFromApp')}
                      onOk={handleTotpVerify}
                    />
                  </div>
                </div>
              </li>
            </ol>
          </div>
        )}

        {step === 'lock' && (
          <div className="fadein text-center">
            <div className="w-16 h-16 rounded-full bg-[var(--leaft)] text-[var(--leafd)] flex items-center justify-center font-bold text-2xl mx-auto mb-4 select-none">
              RN
            </div>
            <h1 className="disp h1 text-[var(--ink)]">Screen locked</h1>
            <p className="mt-1 font-semibold text-[var(--ink)]">Dr. Rahul Nair</p>
            <p className="mt-2 text-sm text-[var(--ink2)]">
              Enter your 6-digit authenticator code or tap your passkey to unlock.
            </p>

            <div className="mt-8 text-left">
              <CodeBoxes label="Authenticator code" onOk={handleTotpVerify} />
              {authError && (
                <p className="mt-3 text-sm font-semibold text-rose-600" role="alert">
                  {authError}
                </p>
              )}
            </div>

            <div className="mt-6 flex flex-col gap-3">
              <button
                type="button"
                className="btn btn-primary w-full py-3"
                onClick={handlePasskeySignIn}
              >
                Unlock
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Floating Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[var(--ink)] text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2 text-sm font-semibold">
          <Check size={18} className="text-emerald-400" />
          {toastMsg}
        </div>
      )}

      <BuildStamp />
    </div>
  );
}
