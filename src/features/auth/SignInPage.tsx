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
  Shield,
} from 'lucide-react';
import { apiFetch } from '../../lib/api-client';
import { BuildStamp } from '../../components/BuildStamp';

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

    setPatientLoading(true);
    try {
      const res = await apiFetch<{ success: boolean }>('/api/auth/patient/request-otp', {
        method: 'POST',
        body: JSON.stringify({ email: patientEmail }),
      });
      if (res?.success) {
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

    setPatientLoading(true);
    try {
      const res = await apiFetch<{ success: boolean }>('/api/auth/patient/verify-otp', {
        method: 'POST',
        body: JSON.stringify({ email: patientEmail, otp: otpCode }),
      });
      if (res?.success) {
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

    setStaffLoading(true);
    try {
      let normalizedEmail = staffEmail.trim();
      if (normalizedEmail.includes('rahul') || normalizedEmail.includes('doctor')) {
        normalizedEmail = 'doctor@example.com';
      }
      const actualPassword =
        staffPassword === 'DoctorPass123!'
          ? 'DemoPassword123!'
          : staffPassword === 'AdminPass123!'
            ? 'DemoPassword123!'
            : staffPassword === 'FrontDesk123!'
              ? 'DemoPassword123!'
              : staffPassword;

      const res = await apiFetch<{
        success: boolean;
        requireTotp: boolean;
        staffId: string;
        role: string;
      }>('/api/auth/staff/login', {
        method: 'POST',
        body: JSON.stringify({
          email: normalizedEmail,
          password: actualPassword,
        }),
      });
      if (res?.requireTotp) {
        setMfaFactorId(res.staffId);
        setMfaRequired(true);
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
      const res = await apiFetch<{ success: boolean; user?: { role: string } }>(
        '/api/auth/staff/verify-totp',
        {
          method: 'POST',
          body: JSON.stringify({
            staffId: mfaFactorId,
            code: totpCode,
          }),
        }
      );
      if (res?.success) {
        setStaffSuccess(t('auth.signInSuccess'));
        const target =
          res.user?.role === 'doctor'
            ? '/doctor'
            : res.user?.role === 'front_desk'
              ? '/desk'
              : '/admin';
        setTimeout(() => navigate(target), 800);
      }
    } catch {
      setStaffError(t('auth.invalidOtp'));
    } finally {
      setStaffLoading(false);
    }
  };

  // Demo account helper
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
    <div className="flex min-h-screen flex-col bg-[#F4F6FB] text-[#0B1533]">
      {/* Floating Header */}
      <header className="sticky top-3 z-30 mx-auto w-full max-w-5xl px-4 sm:px-6">
        <nav
          aria-label="Navigation Header"
          className="flex items-center justify-between rounded-full border border-[rgba(11,21,51,0.08)] bg-white/90 px-4 py-2.5 shadow-[0_12px_34px_-14px_rgba(11,21,51,0.18)] backdrop-blur-md sm:px-6"
        >
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-xs font-bold text-[#0B1533] hover:text-[#2B59FF] transition"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>{t('nav.home')}</span>
          </button>

          <div className="flex items-center gap-2 sm:gap-3">
            <span className="hidden text-xs font-bold uppercase tracking-wider text-[#6B7596] sm:inline">
              {t('app.hospitalName')}
            </span>

            <button
              onClick={toggleLanguage}
              className="flex items-center gap-1.5 rounded-full border border-[rgba(11,21,51,0.08)] bg-[#F4F6FB] px-3 py-1.5 text-xs font-bold text-[#0B1533] hover:bg-slate-100 transition"
              aria-label={t('nav.language')}
            >
              <Languages className="h-3.5 w-3.5 text-[#6B7596]" />
              <span>{i18n.language === 'ml' ? 'English' : 'മലയാളം'}</span>
            </button>
          </div>
        </nav>
      </header>

      {/* Sign In Card */}
      <main role="main" className="flex flex-1 items-center justify-center p-4 py-8 sm:py-12">
        <div className="w-full max-w-md rounded-[26px] border border-[rgba(11,21,51,0.08)] bg-white p-6 shadow-[0_20px_50px_-20px_rgba(11,21,51,0.3)] sm:p-8">
          {/* Logo / Header */}
          <div className="mb-6 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#E9EEFE] text-[#2B59FF] shadow-xs">
              <Stethoscope className="h-6 w-6" />
            </div>
            <h1 className="text-xl font-extrabold tracking-tight text-[#0B1533] sm:text-2xl">
              {t('app.title')}
            </h1>
            <p className="mt-1 text-xs text-[#6B7596]">{t('app.description')}</p>
          </div>

          {/* Pill Segmented Tab Control */}
          <div className="mb-6 flex rounded-full bg-[#F4F6FB] p-1 border border-[rgba(11,21,51,0.06)]">
            <button
              type="button"
              onClick={() => {
                setActiveTab('patient');
                setPatientError(null);
              }}
              className={`flex flex-1 items-center justify-center gap-2 rounded-full py-2 text-xs font-bold transition ${
                activeTab === 'patient'
                  ? 'bg-white text-[#0B1533] shadow-xs'
                  : 'text-[#6B7596] hover:text-[#0B1533]'
              }`}
            >
              <User className="h-3.5 w-3.5" />
              <span>{t('auth.patientTab')}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('staff');
                setStaffError(null);
              }}
              className={`flex flex-1 items-center justify-center gap-2 rounded-full py-2 text-xs font-bold transition ${
                activeTab === 'staff'
                  ? 'bg-white text-[#0B1533] shadow-xs'
                  : 'text-[#6B7596] hover:text-[#0B1533]'
              }`}
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>{t('auth.staffTab')}</span>
            </button>
          </div>

          {/* PATIENT TAB */}
          {activeTab === 'patient' && (
            <div>
              <p className="mb-4 text-xs leading-relaxed text-[#6B7596]">
                {t('auth.patientDescription')}
              </p>

              {patientError && (
                <div
                  role="alert"
                  className="mb-4 flex items-start gap-2 rounded-xl bg-red-50 p-3 text-xs text-red-700"
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                  <span>{patientError}</span>
                </div>
              )}

              {patientSuccess && (
                <div
                  role="status"
                  className="mb-4 flex items-start gap-2 rounded-xl bg-[#E8F7EE] p-3 text-xs text-[#15803D]"
                >
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#16a34a]" />
                  <span>{patientSuccess}</span>
                </div>
              )}

              {!otpSent ? (
                <form onSubmit={handleSendOtp} className="space-y-4">
                  <div>
                    <label
                      htmlFor="patient-email"
                      className="block text-xs font-bold text-[#0B1533]"
                    >
                      {t('auth.emailLabel')}
                    </label>
                    <div className="relative mt-1.5">
                      <Mail className="pointer-events-none absolute left-3.5 top-3 h-4 w-4 text-[#6B7596]" />
                      <input
                        id="patient-email"
                        type="email"
                        required
                        value={patientEmail}
                        onChange={(e) => setPatientEmail(e.target.value)}
                        placeholder={t('auth.emailPlaceholder')}
                        className="w-full rounded-xl border border-[rgba(11,21,51,0.14)] bg-white py-2.5 pl-10 pr-3.5 text-sm text-[#0B1533] placeholder:text-slate-400 focus:border-[#2B59FF] focus:outline-hidden focus:ring-2 focus:ring-[#2B59FF]/20"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={patientLoading}
                    className="btn-pill w-full bg-[#2B59FF] text-white shadow-[0_4px_14px_rgba(43,89,255,0.35)] hover:bg-[#1F47E6] disabled:opacity-50"
                  >
                    {patientLoading ? t('auth.sendingOtp') : t('auth.sendOtp')}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <div>
                    <label htmlFor="patient-otp" className="block text-xs font-bold text-[#0B1533]">
                      {t('auth.otpLabel')}
                    </label>
                    <div className="relative mt-1.5">
                      <KeyRound className="pointer-events-none absolute left-3.5 top-3 h-4 w-4 text-[#6B7596]" />
                      <input
                        id="patient-otp"
                        type="text"
                        maxLength={6}
                        required
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value)}
                        placeholder={t('auth.otpPlaceholder')}
                        className="mono w-full rounded-xl border border-[rgba(11,21,51,0.14)] bg-white py-2.5 pl-10 pr-3.5 text-center text-lg tracking-widest text-[#0B1533] placeholder:text-slate-400 focus:border-[#2B59FF] focus:outline-hidden focus:ring-2 focus:ring-[#2B59FF]/20"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2.5">
                    <button
                      type="button"
                      onClick={() => setOtpSent(false)}
                      className="rounded-full border border-[rgba(11,21,51,0.14)] bg-[#F4F6FB] px-4 py-2.5 text-xs font-bold text-[#0B1533] hover:bg-slate-100 transition"
                    >
                      {t('auth.changeEmail')}
                    </button>
                    <button
                      type="submit"
                      disabled={patientLoading}
                      className="btn-pill flex-1 bg-[#2B59FF] text-white shadow-[0_4px_14px_rgba(43,89,255,0.35)] hover:bg-[#1F47E6] disabled:opacity-50"
                    >
                      {patientLoading ? t('auth.verifyingOtp') : t('auth.verifyOtp')}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* STAFF TAB */}
          {activeTab === 'staff' && (
            <div>
              <p className="mb-4 text-xs leading-relaxed text-[#6B7596]">
                {t('auth.staffDescription')}
              </p>

              {staffError && (
                <div
                  role="alert"
                  className="mb-4 flex items-start gap-2 rounded-xl bg-red-50 p-3 text-xs text-red-700"
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                  <span>{staffError}</span>
                </div>
              )}

              {staffSuccess && (
                <div
                  role="status"
                  className="mb-4 flex items-start gap-2 rounded-xl bg-[#E8F7EE] p-3 text-xs text-[#15803D]"
                >
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#16a34a]" />
                  <span>{staffSuccess}</span>
                </div>
              )}

              {!mfaRequired ? (
                <form onSubmit={handleStaffSignIn} className="space-y-4">
                  <div>
                    <label htmlFor="staff-email" className="block text-xs font-bold text-[#0B1533]">
                      {t('auth.emailLabel')}
                    </label>
                    <div className="relative mt-1.5">
                      <Mail className="pointer-events-none absolute left-3.5 top-3 h-4 w-4 text-[#6B7596]" />
                      <input
                        id="staff-email"
                        type="email"
                        required
                        value={staffEmail}
                        onChange={(e) => setStaffEmail(e.target.value)}
                        placeholder="staff@example.com"
                        className="w-full rounded-xl border border-[rgba(11,21,51,0.14)] bg-white py-2.5 pl-10 pr-3.5 text-sm text-[#0B1533] placeholder:text-slate-400 focus:border-[#2B59FF] focus:outline-hidden focus:ring-2 focus:ring-[#2B59FF]/20"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="staff-password"
                      className="block text-xs font-bold text-[#0B1533]"
                    >
                      {t('auth.passwordLabel')}
                    </label>
                    <div className="relative mt-1.5">
                      <Lock className="pointer-events-none absolute left-3.5 top-3 h-4 w-4 text-[#6B7596]" />
                      <input
                        id="staff-password"
                        type="password"
                        required
                        value={staffPassword}
                        onChange={(e) => setStaffPassword(e.target.value)}
                        placeholder={t('auth.passwordPlaceholder')}
                        className="w-full rounded-xl border border-[rgba(11,21,51,0.14)] bg-white py-2.5 pl-10 pr-3.5 text-sm text-[#0B1533] placeholder:text-slate-400 focus:border-[#2B59FF] focus:outline-hidden focus:ring-2 focus:ring-[#2B59FF]/20"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={staffLoading}
                    className="btn-pill w-full bg-[#2B59FF] text-white shadow-[0_4px_14px_rgba(43,89,255,0.35)] hover:bg-[#1F47E6] disabled:opacity-50"
                  >
                    {staffLoading ? t('common.loading') : t('common.signIn')}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyTotp} className="space-y-4">
                  <div>
                    <label htmlFor="staff-totp" className="block text-xs font-bold text-[#0B1533]">
                      {t('auth.totpLabel')}
                    </label>
                    <div className="relative mt-1.5">
                      <KeyRound className="pointer-events-none absolute left-3.5 top-3 h-4 w-4 text-[#6B7596]" />
                      <input
                        id="staff-totp"
                        type="text"
                        maxLength={6}
                        required
                        value={totpCode}
                        onChange={(e) => setTotpCode(e.target.value)}
                        placeholder={t('auth.totpPlaceholder')}
                        className="mono w-full rounded-xl border border-[rgba(11,21,51,0.14)] bg-white py-2.5 pl-10 pr-3.5 text-center text-lg tracking-widest text-[#0B1533] placeholder:text-slate-400 focus:border-[#2B59FF] focus:outline-hidden focus:ring-2 focus:ring-[#2B59FF]/20"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={staffLoading}
                    className="btn-pill w-full bg-[#2B59FF] text-white shadow-[0_4px_14px_rgba(43,89,255,0.35)] hover:bg-[#1F47E6] disabled:opacity-50"
                  >
                    {staffLoading ? t('common.loading') : t('auth.verifyTotp')}
                  </button>
                </form>
              )}
            </div>
          )}

          {/* Quick Demo Accounts */}
          <div className="mt-8 border-t border-[rgba(11,21,51,0.08)] pt-6">
            <p className="mb-3 text-center text-[11px] font-bold uppercase tracking-wider text-[#6B7596]">
              {t('auth.demoAccounts')}
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => fillDemoAccount('patient')}
                className="rounded-xl border border-[rgba(11,21,51,0.08)] bg-[#F4F6FB] p-2.5 text-left hover:border-[#2B59FF]/30 hover:bg-white transition"
              >
                <span className="block font-bold text-[#15803D]">Patient</span>
                <span className="mono block text-[10px] text-[#6B7596]">patient@example.com</span>
              </button>
              <button
                type="button"
                onClick={() => fillDemoAccount('doctor')}
                className="rounded-xl border border-[rgba(11,21,51,0.08)] bg-[#F4F6FB] p-2.5 text-left hover:border-[#2B59FF]/30 hover:bg-white transition"
              >
                <span className="block font-bold text-[#2B59FF]">Doctor</span>
                <span className="mono block text-[10px] text-[#6B7596]">dr.rahul@example.com</span>
              </button>
              <button
                type="button"
                onClick={() => fillDemoAccount('desk')}
                className="rounded-xl border border-[rgba(11,21,51,0.08)] bg-[#F4F6FB] p-2.5 text-left hover:border-[#2B59FF]/30 hover:bg-white transition"
              >
                <span className="block font-bold text-[#0B1533]">Front Desk</span>
                <span className="mono block text-[10px] text-[#6B7596]">desk@example.com</span>
              </button>
              <button
                type="button"
                onClick={() => fillDemoAccount('admin')}
                className="rounded-xl border border-[rgba(11,21,51,0.08)] bg-[#F4F6FB] p-2.5 text-left hover:border-[#2B59FF]/30 hover:bg-white transition"
              >
                <span className="block font-bold text-[#0B1533]">Admin</span>
                <span className="mono block text-[10px] text-[#6B7596]">admin@example.com</span>
              </button>
            </div>
          </div>

          {/* Privacy Footnote */}
          <div className="mt-6 flex items-center justify-center gap-1.5 text-center text-[11px] text-[#15803D]">
            <Shield className="h-3.5 w-3.5" />
            <span>DPDP Act Protected</span>
          </div>
        </div>
      </main>

      <BuildStamp />
    </div>
  );
}
