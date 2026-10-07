import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  User,
  Lock,
  Mail,
  KeyRound,
  ArrowLeft,
  Languages,
  CheckCircle2,
  AlertCircle,
  Stethoscope,
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { ConfigBanner } from '../../components/ConfigBanner';

type Tab = 'patient' | 'staff';

export function SignInPage(): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<Tab>('patient');

  // Patient OTP states
  const [patientEmail, setPatientEmail] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [patientLoading, setPatientLoading] = useState(false);
  const [patientError, setPatientError] = useState<string | null>(null);
  const [patientSuccess, setPatientSuccess] = useState<string | null>(null);

  // Staff Password + MFA states
  const [staffEmail, setStaffEmail] = useState('');
  const [staffPassword, setStaffPassword] = useState('');
  const [mfaRequired, setMfaRequired] = useState(false);
  const [totpCode, setTotpCode] = useState('');
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
  const [staffLoading, setStaffLoading] = useState(false);
  const [staffError, setStaffError] = useState<string | null>(null);
  const [staffSuccess, setStaffSuccess] = useState<string | null>(null);

  const toggleLanguage = () => {
    const nextLang = i18n.language === 'ml' ? 'en' : 'ml';
    void i18n.changeLanguage(nextLang);
  };

  // Patient OTP Handlers
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setPatientError(null);
    setPatientSuccess(null);

    if (!patientEmail) return;

    if (!isSupabaseConfigured) {
      // Offline/demo fallback when env vars are not set
      setOtpSent(true);
      setPatientSuccess(t('auth.otpSentNotice', { email: patientEmail }));
      return;
    }

    setPatientLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: patientEmail,
        options: {
          shouldCreateUser: false,
        },
      });

      if (error) {
        setPatientError(error.message);
      } else {
        setOtpSent(true);
        setPatientSuccess(t('auth.otpSentNotice', { email: patientEmail }));
      }
    } catch {
      setPatientError(t('auth.authError'));
    } finally {
      setPatientLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setPatientError(null);

    if (!otpCode) return;

    if (!isSupabaseConfigured) {
      setPatientSuccess(t('auth.signInSuccess'));
      setTimeout(() => navigate('/'), 800);
      return;
    }

    setPatientLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email: patientEmail,
        token: otpCode,
        type: 'email',
      });

      if (error) {
        setPatientError(t('auth.invalidOtp'));
      } else {
        setPatientSuccess(t('auth.signInSuccess'));
        setTimeout(() => navigate('/'), 800);
      }
    } catch {
      setPatientError(t('auth.invalidOtp'));
    } finally {
      setPatientLoading(false);
    }
  };

  // Staff Password + MFA Handlers
  const handleStaffSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setStaffError(null);
    setStaffSuccess(null);

    if (!staffEmail || !staffPassword) return;

    if (!isSupabaseConfigured) {
      // Demo preview mode fallback
      setStaffSuccess(t('auth.signInSuccess'));
      setTimeout(() => navigate('/admin'), 800);
      return;
    }

    setStaffLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: staffEmail,
        password: staffPassword,
      });

      if (error) {
        setStaffError(error.message || t('auth.authError'));
        return;
      }

      // Check if MFA (TOTP) is required
      const aalResult = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (
        aalResult.data?.nextLevel === 'aal2' &&
        aalResult.data?.currentLevel !== 'aal2'
      ) {
        const factors = await supabase.auth.mfa.listFactors();
        const totpFactor = factors.data?.totp?.[0];
        if (totpFactor) {
          setMfaFactorId(totpFactor.id);
          setMfaRequired(true);
          return;
        }
      }

      setStaffSuccess(t('auth.signInSuccess'));
      if (data.session) {
        setTimeout(() => navigate('/admin'), 800);
      }
    } catch {
      setStaffError(t('auth.authError'));
    } finally {
      setStaffLoading(false);
    }
  };

  const handleVerifyTotp = async (e: React.FormEvent) => {
    e.preventDefault();
    setStaffError(null);

    if (!totpCode || !mfaFactorId) return;

    setStaffLoading(true);
    try {
      const challenge = await supabase.auth.mfa.challenge({ factorId: mfaFactorId });
      if (challenge.error) {
        setStaffError(challenge.error.message);
        return;
      }

      const verify = await supabase.auth.mfa.verify({
        factorId: mfaFactorId,
        challengeId: challenge.data.id,
        code: totpCode,
      });

      if (verify.error) {
        setStaffError(t('auth.invalidOtp'));
      } else {
        setStaffSuccess(t('auth.signInSuccess'));
        setTimeout(() => navigate('/admin'), 800);
      }
    } catch {
      setStaffError(t('auth.invalidOtp'));
    } finally {
      setStaffLoading(false);
    }
  };

  // Demo account quick filers
  const fillDemoAccount = (role: 'patient' | 'admin' | 'doctor' | 'desk') => {
    if (role === 'patient') {
      setActiveTab('patient');
      setPatientEmail('patient@example.com');
      setOtpSent(false);
      setOtpCode('123456');
    } else {
      setActiveTab('staff');
      setMfaRequired(false);
      if (role === 'admin') {
        setStaffEmail('admin@example.com');
        setStaffPassword('AdminPass123!');
      } else if (role === 'doctor') {
        setStaffEmail('dr.rahul@example.com');
        setStaffPassword('DoctorPass123!');
      } else if (role === 'desk') {
        setStaffEmail('desk@example.com');
        setStaffPassword('FrontDesk123!');
      }
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <ConfigBanner />

      {/* Top Bar */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('nav.home')}
          </button>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {t('app.hospitalName')}
            </span>
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 transition"
              aria-label={t('nav.language')}
            >
              <Languages className="h-3.5 w-3.5 text-slate-500" />
              {i18n.language === 'ml' ? 'English' : 'മലയാളം'}
            </button>
          </div>
        </div>
      </header>

      {/* Sign In Card Container */}
      <main className="flex flex-1 items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          {/* Logo / Header */}
          <div className="mb-6 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-sky-50 text-sky-700">
              <Stethoscope className="h-6 w-6" />
            </div>
            <h1 className="text-xl font-bold text-slate-900">{t('app.title')}</h1>
            <p className="mt-1 text-xs text-slate-500">{t('app.description')}</p>
          </div>

          {/* Role Tabs */}
          <div className="mb-6 flex rounded-lg bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => {
                setActiveTab('patient');
                setPatientError(null);
              }}
              className={`flex flex-1 items-center justify-center gap-2 rounded-md py-2 text-xs font-medium transition ${
                activeTab === 'patient'
                  ? 'bg-white text-sky-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <User className="h-3.5 w-3.5" />
              {t('auth.patientTab')}
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('staff');
                setStaffError(null);
              }}
              className={`flex flex-1 items-center justify-center gap-2 rounded-md py-2 text-xs font-medium transition ${
                activeTab === 'staff'
                  ? 'bg-white text-sky-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              {t('auth.staffTab')}
            </button>
          </div>

          {/* PATIENT TAB FORM */}
          {activeTab === 'patient' && (
            <div>
              <p className="mb-4 text-xs text-slate-600">
                {t('auth.patientDescription')}
              </p>

              {patientError && (
                <div
                  role="alert"
                  className="mb-4 flex items-start gap-2 rounded-lg bg-red-50 p-3 text-xs text-red-700"
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                  <span>{patientError}</span>
                </div>
              )}

              {patientSuccess && (
                <div
                  role="status"
                  className="mb-4 flex items-start gap-2 rounded-lg bg-emerald-50 p-3 text-xs text-emerald-800"
                >
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  <span>{patientSuccess}</span>
                </div>
              )}

              {!otpSent ? (
                <form onSubmit={handleSendOtp} className="space-y-4">
                  <div>
                    <label
                      htmlFor="patient-email"
                      className="block text-xs font-medium text-slate-700"
                    >
                      {t('auth.emailLabel')}
                    </label>
                    <div className="relative mt-1">
                      <Mail className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                      <input
                        id="patient-email"
                        type="email"
                        required
                        value={patientEmail}
                        onChange={e => setPatientEmail(e.target.value)}
                        placeholder={t('auth.emailPlaceholder')}
                        className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-sky-600 focus:outline-hidden focus:ring-1 focus:ring-sky-600"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={patientLoading}
                    className="w-full rounded-lg bg-sky-700 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-sky-800 disabled:opacity-50 transition"
                  >
                    {patientLoading ? t('auth.sendingOtp') : t('auth.sendOtp')}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <div>
                    <label
                      htmlFor="patient-otp"
                      className="block text-xs font-medium text-slate-700"
                    >
                      {t('auth.otpLabel')}
                    </label>
                    <div className="relative mt-1">
                      <KeyRound className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                      <input
                        id="patient-otp"
                        type="text"
                        maxLength={6}
                        required
                        value={otpCode}
                        onChange={e => setOtpCode(e.target.value)}
                        placeholder={t('auth.otpPlaceholder')}
                        className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 font-mono text-base tracking-widest text-slate-900 placeholder:text-slate-400 focus:border-sky-600 focus:outline-hidden focus:ring-1 focus:ring-sky-600 text-center"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setOtpSent(false)}
                      className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
                    >
                      {t('auth.changeEmail')}
                    </button>
                    <button
                      type="submit"
                      disabled={patientLoading}
                      className="flex-1 rounded-lg bg-sky-700 py-2 text-xs font-semibold text-white shadow-xs hover:bg-sky-800 disabled:opacity-50 transition"
                    >
                      {patientLoading ? t('auth.verifyingOtp') : t('auth.verifyOtp')}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* STAFF TAB FORM */}
          {activeTab === 'staff' && (
            <div>
              <p className="mb-4 text-xs text-slate-600">
                {t('auth.staffDescription')}
              </p>

              {staffError && (
                <div
                  role="alert"
                  className="mb-4 flex items-start gap-2 rounded-lg bg-red-50 p-3 text-xs text-red-700"
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                  <span>{staffError}</span>
                </div>
              )}

              {staffSuccess && (
                <div
                  role="status"
                  className="mb-4 flex items-start gap-2 rounded-lg bg-emerald-50 p-3 text-xs text-emerald-800"
                >
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  <span>{staffSuccess}</span>
                </div>
              )}

              {!mfaRequired ? (
                <form onSubmit={handleStaffSignIn} className="space-y-4">
                  <div>
                    <label
                      htmlFor="staff-email"
                      className="block text-xs font-medium text-slate-700"
                    >
                      {t('auth.emailLabel')}
                    </label>
                    <div className="relative mt-1">
                      <Mail className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                      <input
                        id="staff-email"
                        type="email"
                        required
                        value={staffEmail}
                        onChange={e => setStaffEmail(e.target.value)}
                        placeholder="staff@example.com"
                        className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-sky-600 focus:outline-hidden focus:ring-1 focus:ring-sky-600"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="staff-password"
                      className="block text-xs font-medium text-slate-700"
                    >
                      {t('auth.passwordLabel')}
                    </label>
                    <div className="relative mt-1">
                      <Lock className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                      <input
                        id="staff-password"
                        type="password"
                        required
                        value={staffPassword}
                        onChange={e => setStaffPassword(e.target.value)}
                        placeholder={t('auth.passwordPlaceholder')}
                        className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-sky-600 focus:outline-hidden focus:ring-1 focus:ring-sky-600"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={staffLoading}
                    className="w-full rounded-lg bg-sky-700 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-sky-800 disabled:opacity-50 transition"
                  >
                    {staffLoading ? t('common.loading') : t('common.signIn')}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyTotp} className="space-y-4">
                  <div>
                    <label
                      htmlFor="staff-totp"
                      className="block text-xs font-medium text-slate-700"
                    >
                      {t('auth.totpLabel')}
                    </label>
                    <div className="relative mt-1">
                      <KeyRound className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                      <input
                        id="staff-totp"
                        type="text"
                        maxLength={6}
                        required
                        value={totpCode}
                        onChange={e => setTotpCode(e.target.value)}
                        placeholder={t('auth.totpPlaceholder')}
                        className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 font-mono text-base tracking-widest text-slate-900 placeholder:text-slate-400 focus:border-sky-600 focus:outline-hidden focus:ring-1 focus:ring-sky-600 text-center"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={staffLoading}
                    className="w-full rounded-lg bg-sky-700 py-2 text-xs font-semibold text-white shadow-xs hover:bg-sky-800 disabled:opacity-50 transition"
                  >
                    {staffLoading ? t('common.loading') : t('auth.verifyTotp')}
                  </button>
                </form>
              )}
            </div>
          )}

          {/* Quick Demo Credentials */}
          <div className="mt-8 border-t border-slate-100 pt-6">
            <p className="mb-2.5 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              {t('auth.demoAccounts')}
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => fillDemoAccount('patient')}
                className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-left text-slate-700 hover:bg-slate-100 transition"
              >
                <span className="font-semibold text-sky-800 block">Patient</span>
                <span className="text-[10px] text-slate-500">patient@example.com</span>
              </button>
              <button
                type="button"
                onClick={() => fillDemoAccount('doctor')}
                className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-left text-slate-700 hover:bg-slate-100 transition"
              >
                <span className="font-semibold text-sky-800 block">Doctor</span>
                <span className="text-[10px] text-slate-500">dr.rahul@example.com</span>
              </button>
              <button
                type="button"
                onClick={() => fillDemoAccount('desk')}
                className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-left text-slate-700 hover:bg-slate-100 transition"
              >
                <span className="font-semibold text-sky-800 block">Front Desk</span>
                <span className="text-[10px] text-slate-500">desk@example.com</span>
              </button>
              <button
                type="button"
                onClick={() => fillDemoAccount('admin')}
                className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-left text-slate-700 hover:bg-slate-100 transition"
              >
                <span className="font-semibold text-sky-800 block">Admin</span>
                <span className="text-[10px] text-slate-500">admin@example.com</span>
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
