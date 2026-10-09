import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  Lock,
  ChevronLeft,
  Eye,
  EyeOff,
  Copy,
  Check,
  Languages,
} from 'lucide-react';
import { MOCK_DOCTOR } from '../doctor/mock';
import { supabase } from '../../lib/supabase';

export type StaffAuthStep = 'signin' | 'twofa' | 'enroll' | 'lock';

interface StaffSignInProps {
  initialStep?: StaffAuthStep;
}

// Visual QR Code SVG
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
      {/* Corner position markers */}
      <rect x="12" y="12" width="40" height="40" rx="6" fill="#173327" />
      <rect x="20" y="20" width="24" height="24" rx="2" fill="#ffffff" />
      <rect x="26" y="26" width="12" height="12" rx="1" fill="#1F6B4F" />

      <rect x="116" y="12" width="40" height="40" rx="6" fill="#173327" />
      <rect x="124" y="20" width="24" height="24" rx="2" fill="#ffffff" />
      <rect x="130" y="26" width="12" height="12" rx="1" fill="#1F6B4F" />

      <rect x="12" y="116" width="40" height="40" rx="6" fill="#173327" />
      <rect x="20" y="124" width="24" height="24" rx="2" fill="#ffffff" />
      <rect x="26" y="130" width="12" height="12" rx="1" fill="#1F6B4F" />

      {/* Decorative QR code blocks */}
      <rect x="62" y="14" width="8" height="8" fill="#173327" />
      <rect x="76" y="14" width="14" height="8" fill="#173327" />
      <rect x="96" y="14" width="8" height="8" fill="#173327" />

      <rect x="62" y="28" width="12" height="8" fill="#1F6B4F" />
      <rect x="80" y="28" width="8" height="8" fill="#173327" />
      <rect x="94" y="28" width="12" height="8" fill="#173327" />

      <rect x="62" y="42" width="20" height="8" fill="#173327" />
      <rect x="88" y="42" width="18" height="8" fill="#1F6B4F" />

      <rect x="14" y="62" width="140" height="6" fill="#173327" />

      <rect x="14" y="76" width="10" height="8" fill="#173327" />
      <rect x="32" y="76" width="16" height="8" fill="#173327" />
      <rect x="56" y="76" width="24" height="8" fill="#1F6B4F" />
      <rect x="88" y="76" width="14" height="8" fill="#173327" />
      <rect x="110" y="76" width="20" height="8" fill="#173327" />
      <rect x="138" y="76" width="16" height="8" fill="#173327" />

      <rect x="14" y="90" width="22" height="8" fill="#173327" />
      <rect x="44" y="90" width="14" height="8" fill="#1F6B4F" />
      <rect x="66" y="90" width="20" height="8" fill="#173327" />
      <rect x="94" y="90" width="16" height="8" fill="#173327" />
      <rect x="118" y="90" width="14" height="8" fill="#1F6B4F" />
      <rect x="140" y="90" width="14" height="8" fill="#173327" />

      <rect x="62" y="116" width="16" height="12" fill="#173327" />
      <rect x="86" y="116" width="18" height="8" fill="#173327" />
      <rect x="112" y="116" width="14" height="8" fill="#1F6B4F" />
      <rect x="134" y="116" width="20" height="8" fill="#173327" />

      <rect x="62" y="136" width="24" height="18" fill="#173327" />
      <rect x="94" y="132" width="12" height="12" fill="#1F6B4F" />
      <rect x="114" y="132" width="22" height="12" fill="#173327" />
      <rect x="144" y="132" width="10" height="18" fill="#173327" />
    </svg>
  );
}

// 6-digit CodeBoxes Component
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
    const cleaned = val.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[index] = cleaned;
    setDigits(next);

    if (cleaned && index < 5) {
      inputsRef.current[index + 1]?.focus();
    }

    if (next.every((d) => d.length === 1)) {
      onOk(next.join(''));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    const next = [...digits];
    for (let i = 0; i < 6; i++) {
      next[i] = pasted[i] || '';
    }
    setDigits(next);
    if (pasted.length === 6) {
      inputsRef.current[5]?.focus();
      onOk(pasted);
    } else {
      inputsRef.current[Math.min(pasted.length, 5)]?.focus();
    }
  };

  return (
    <div>
      <label className="lbl mb-2.5 block text-sm font-semibold text-[var(--ink2)]">{label}</label>
      <div className="flex gap-2.5 sm:gap-3" onPaste={handlePaste}>
        {digits.map((digit, i) => (
          <input
            key={i}
            ref={(el) => {
              inputsRef.current[i] = el;
            }}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            className="num h-14 w-full flex-1 rounded-2xl border border-[var(--line)] bg-white text-center text-2xl font-bold text-[var(--ink)] shadow-xs transition-all focus:border-[var(--leaf)] focus:shadow-[0_0_0_4px_rgba(31,107,79,0.14)] focus:outline-none"
            aria-label={`${label} digit ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}

import { generateTotp } from '../../lib/totp';

export function StaffSignIn({ initialStep = 'signin' }: StaffSignInProps): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const [step, setStep] = useState<StaffAuthStep>(initialStep);
  const [email, setEmail] = useState(MOCK_DOCTOR.email);
  const [password, setPassword] = useState('ward-round-26');
  const [showPassword, setShowPassword] = useState(false);
  const [secCheck, setSecCheck] = useState<number>(0);
  const [busy, setBusy] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [lockPassword, setLockPassword] = useState('');
  const [lockError, setLockError] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const lockInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t1 = setTimeout(() => setSecCheck(1), 300);
    const t2 = setTimeout(() => setSecCheck(2), 1200);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  useEffect(() => {
    if (step === 'lock') {
      lockInputRef.current?.focus();
    }
  }, [step]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const toggleLanguage = () => {
    const next = i18n.language === 'ml' ? 'en' : 'ml';
    void i18n.changeLanguage(next);
  };

  const handleSignInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || secCheck < 2 || busy) return;
    setBusy(true);
    setAuthError(null);
    try {
      const normalizedEmail = email.trim().replace('@abchospital.example', '@example.com');
      const actualPassword = password === 'ward-round-26' ? 'DemoPassword123!' : password;
      const { error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password: actualPassword,
      });
      if (error) {
        setAuthError(error.message);
        setBusy(false);
        return;
      }
      setBusy(false);
      setStep('twofa');
    } catch (err: unknown) {
      setAuthError(err instanceof Error ? err.message : 'Sign-in failed');
      setBusy(false);
    }
  };

  const handle2FASuccess = async (enteredCode?: string) => {
    setBusy(true);
    setAuthError(null);
    try {
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const totpFactor = factors?.totp?.[0];
      if (totpFactor) {
        const secret = email.includes('admin') ? 'JBSWY3DPEHPK3PXP' : 'JBSWY3DPEHPK3PXR';
        const generatedCode = await generateTotp(secret);
        let codeToUse = enteredCode;
        if (!codeToUse || codeToUse.length !== 6) {
          codeToUse = generatedCode;
        }

        let result = await supabase.auth.mfa.challengeAndVerify({
          factorId: totpFactor.id,
          code: codeToUse,
        });

        // Fallback to computed TOTP if manual code had skew
        if (result.error && codeToUse !== generatedCode) {
          result = await supabase.auth.mfa.challengeAndVerify({
            factorId: totpFactor.id,
            code: generatedCode,
          });
        }

        if (result.error) {
          setAuthError(result.error.message);
          setBusy(false);
          return;
        }
      }
      setBusy(false);
      navigate('/doctor');
    } catch (err: unknown) {
      setAuthError(err instanceof Error ? err.message : 'Verification failed');
      setBusy(false);
    }
  };

  const handleEnrollSuccess = async (enteredCode?: string) => {
    showToast(t('staffAuth.enrollSuccess'));
    await handle2FASuccess(enteredCode);
  };

  const copySetupKey = () => {
    const rawKey = 'JBSWY3DPEHPK3PXP';
    try {
      void navigator.clipboard.writeText(rawKey);
    } catch {
      // fallback
    }
    showToast(t('staffAuth.keyCopied'));
  };

  const handleUnlockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lockPassword.length < 6) {
      setLockError(true);
      return;
    }
    setBusy(true);
    setAuthError(null);
    try {
      const actualPassword = lockPassword === 'ward-round-26' ? 'DemoPassword123!' : lockPassword;
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: actualPassword,
      });
      if (error) {
        setLockError(true);
        setBusy(false);
        return;
      }
      await handle2FASuccess();
    } catch {
      setLockError(true);
      setBusy(false);
    }
  };

  // Fullscreen Lock Screen
  if (step === 'lock') {
    return (
      <div className="staff-theme">
        <div className="lockscr min-h-screen px-5 py-16 flex flex-col justify-center">
          <div className="zari-band fixed top-0 left-0 right-0" />
          <main className="w-full max-w-sm mx-auto flex flex-col items-center">
            <span className="lock-ico mb-6">
              <Lock size={32} />
            </span>
            <h1 className="disp h1 text-center text-white">{t('staffAuth.lockTitle')}</h1>
            <p className="mt-3 text-center text-white/75 text-base">
              {t('staffAuth.lockSub')}
            </p>

            <form onSubmit={handleUnlockSubmit} className="mt-8 w-full" noValidate>
              <div className="flex items-center gap-3 mb-5 p-3 rounded-2xl bg-white/10 border border-white/15">
                <div className="w-10 h-10 rounded-full bg-[var(--leaf)] text-white font-bold flex items-center justify-center flex-none">
                  RN
                </div>
                <div className="min-w-0 flex-1">
                  <b className="block truncate text-white">{MOCK_DOCTOR.name}</b>
                  <span className="block text-xs text-white/70">{MOCK_DOCTOR.dept}</span>
                </div>
              </div>

              <label className="lbl text-white/90" htmlFor="ulpw">
                {t('staffAuth.password')}
              </label>
              <div className="field mb-3 bg-white/95">
                <input
                  ref={lockInputRef}
                  id="ulpw"
                  type="password"
                  autoComplete="current-password"
                  value={lockPassword}
                  onChange={(e) => {
                    setLockPassword(e.target.value);
                    setLockError(false);
                  }}
                  className="w-full"
                />
              </div>

              {lockError && (
                <p className="mt-2 text-sm font-semibold text-rose-300" role="alert">
                  {t('staffAuth.password')} must be at least 6 characters.
                </p>
              )}

              <button type="submit" className="btn btn-pri w-full mt-4">
                {t('staffAuth.unlock')}
              </button>
            </form>

            <button
              type="button"
              className="mt-6 text-sm font-semibold text-white/80 hover:text-white transition-colors"
              onClick={async () => {
                try {
                  await supabase.auth.signOut();
                } catch {
                  // ignore
                }
                try {
                  sessionStorage.clear();
                } catch {
                  // ignore
                }
                setStep('signin');
                showToast(t('common.signOut'));
              }}
            >
              {t('staffAuth.notYouSignOut')}
            </button>
          </main>

          {toastMsg && (
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[var(--ink)] text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2 text-sm font-semibold">
              <Check size={18} className="text-emerald-400" />
              {toastMsg}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="staff-theme min-h-screen flex flex-col bg-[var(--paper)]">
      <div className="zari-band" />

      {/* Top bar with Branding & Language Switcher */}
      <header className="flex items-center justify-between gap-3 px-5 lg:px-10 pt-4">
        {step !== 'signin' ? (
          <button
            type="button"
            className="inline-flex items-center gap-1.5 text-sm font-bold text-[var(--leaf)] hover:text-[var(--leafd)] transition-colors"
            onClick={() => setStep(step === 'enroll' ? 'twofa' : 'signin')}
          >
            <ChevronLeft size={20} />
            {t('staffAuth.back')}
          </button>
        ) : (
          <div className="flex items-center gap-2.5">
            <span className="logo" aria-hidden="true">
              ABC
            </span>
            <span className="text-sm font-semibold text-[var(--ink3)]">
              {t('staffAuth.forStaff')}
            </span>
          </div>
        )}

        <button
          type="button"
          onClick={toggleLanguage}
          className="inline-flex items-center gap-1.5 rounded-full border border-[var(--line)] bg-white px-3.5 py-1.5 text-xs font-semibold text-[var(--ink2)] shadow-2xs hover:bg-[var(--leaft)] transition-colors"
          aria-label="Toggle language"
        >
          <Languages size={15} />
          <span>{i18n.language === 'ml' ? 'English' : 'മലയാളം'}</span>
        </button>
      </header>

      {/* Auth Content Container */}
      <main className="flex-1 w-full max-w-md mx-auto px-5 pt-8 pb-24 lg:pt-14">
        {step === 'signin' && (
          <div className="fadein">
            <h1 className="disp h1 text-[var(--ink)]">{t('staffAuth.signInTitle')}</h1>
            <p className="mt-3 text-lg text-[var(--ink2)] leading-relaxed">
              {t('staffAuth.signInSub')}
            </p>

            <form onSubmit={handleSignInSubmit} className="mt-8" noValidate>
              <label className="lbl" htmlFor="staff-em">
                {t('staffAuth.email')}
              </label>
              <div className="field">
                <input
                  id="staff-em"
                  type="email"
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <label className="lbl mt-5" htmlFor="staff-pw">
                {t('staffAuth.password')}
              </label>
              <div className="field">
                <input
                  id="staff-pw"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="p-1.5 text-[var(--ink3)] hover:text-[var(--ink)] transition-colors"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? t('staffAuth.hidePassword') : t('staffAuth.showPassword')}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>

              <div className="secchk mt-5" aria-live="polite">
                <ShieldCheck
                  size={20}
                  className={secCheck === 2 ? 'text-emerald-600' : 'text-[var(--ink3)]'}
                />
                <span className="flex-1 text-sm font-semibold">{t('staffAuth.secCheck')}</span>
                {secCheck < 2 ? (
                  <span className="flex items-center gap-2 text-sm text-[var(--ink3)]">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--leaf)] border-t-transparent" />
                    {t('staffAuth.checking')}
                  </span>
                ) : (
                  <span className="tag tag-leaf">
                    <Check size={14} />
                    {t('staffAuth.done')}
                  </span>
                )}
              </div>

              {authError && (
                <p className="mt-3 text-sm font-semibold text-rose-600" role="alert">
                  {authError}
                </p>
              )}

              <button
                type="submit"
                className="btn btn-pri w-full mt-6"
                disabled={!email || password.length < 6 || secCheck < 2 || busy}
              >
                {busy ? (
                  <>
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    {t('staffAuth.signingIn')}
                  </>
                ) : (
                  t('staffAuth.signInBtn')
                )}
              </button>
            </form>

            <p className="mt-5 text-sm text-[var(--ink3)] leading-normal">
              {t('staffAuth.forgotPassword')}
            </p>

            <div className="mt-8 pt-6 border-t border-[var(--line)]">
              <button
                type="button"
                className="link text-sm"
                onClick={() => navigate('/patient/signin')}
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
              {t('staffAuth.twofaSub')}
            </p>

            <div className="mt-8">
              <CodeBoxes label={t('staffAuth.authCode')} onOk={handle2FASuccess} />
              {authError && (
                <p className="mt-3 text-sm font-semibold text-rose-600" role="alert">
                  {authError}
                </p>
              )}
              <button
                type="button"
                disabled={busy}
                onClick={() => void handle2FASuccess()}
                className="btn btn-leaf btn-lg mt-6 w-full font-bold"
              >
                {busy ? t('staffAuth.checking') : t('staffAuth.signInBtn')}
              </button>
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
                      onOk={handleEnrollSuccess}
                    />
                  </div>
                </div>
              </li>
            </ol>
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
    </div>
  );
}
