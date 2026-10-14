import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ShieldCheck,
  AlertCircle,
  Eye,
  EyeOff,
  Languages,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { usePatient } from './PatientContext';
import { BuildStamp } from '../../components/BuildStamp';
import { ForcePasswordChangeModal } from '../../components/auth/ForcePasswordChangeModal';
import { storeBrowserPasswordCredential } from '../../lib/auth-credentials';

export function PatientSignIn(): React.JSX.Element {
  const { lang, setLang, go } = usePatient();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [mustChangePassword, setMustChangePassword] = useState(false);

  const toggleLanguage = () => {
    const nextLang = lang === 'ml' ? 'en' : 'ml';
    setLang(nextLang);
    void i18n.changeLanguage(nextLang);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!username.trim() || !password) {
      setError(
        lang === 'ml'
          ? 'ഹോസ്പിറ്റൽ നമ്പറും പാസ്‌വേഡും നൽകുക.'
          : 'Please enter your hospital number and password.'
      );
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          password,
        }),
      });

      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        must_change_password?: boolean;
        token?: string;
      };

      if (!res.ok || !data.ok) {
        throw new Error(
          data.error ||
            (lang === 'ml'
              ? 'സൈൻ ഇൻ പരാജയപ്പെട്ടു. വിവരങ്ങൾ ശരിയാണോ എന്ന് പരിശോധിക്കുക.'
              : 'Sign-in failed. Please verify your credentials.')
        );
      }

      if (data.must_change_password) {
        setMustChangePassword(true);
        return;
      }

      void storeBrowserPasswordCredential(username, password);
      setSuccess(true);
      setTimeout(() => {
        go('app');
        navigate('/patient');
      }, 500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleDemoFill = (demoUhid: string) => {
    setUsername(demoUhid);
    setPassword('DemoPassword123!');
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#F4F6FB] text-[#0B1533]">
      {/* Header */}
      <header className="mx-auto w-full max-w-5xl px-4 sm:px-6 pt-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#E8F7EE] text-[#15803D] shadow-xs">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-sm sm:text-base text-[#0B1533] leading-none tracking-tight">
                CareOne
              </span>
              <span className="text-[11px] font-semibold text-[#6B7596] leading-tight">
                ABC Hospital Kerala
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={toggleLanguage}
            className="flex items-center gap-1.5 rounded-full border border-[rgba(11,21,51,0.08)] bg-white px-3 py-1.5 text-xs font-bold text-[#0B1533] hover:bg-slate-100 transition shadow-2xs"
            aria-label="Toggle language"
          >
            <Languages size={15} className="text-[#6B7596]" />
            <span>{lang === 'ml' ? 'English' : 'മലയാളം'}</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 w-full max-w-md mx-auto px-5 py-10 flex flex-col justify-center">
        <div className="bg-white rounded-3xl p-7 sm:p-9 shadow-xl border border-[rgba(11,21,51,0.08)]">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#E8F7EE] text-[#15803D] mb-4 shadow-xs">
              <Lock className="w-7 h-7" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0B1533] tracking-tight">
              {lang === 'ml' ? 'രോഗി സൈൻ ഇൻ' : 'Patient Sign-In'}
            </h1>
            <p className="text-xs sm:text-sm text-[#6B7596] mt-2">
              {lang === 'ml'
                ? 'നിങ്ങളുടെ ആരോഗ്യ രേഖകൾ കാണുന്നതിന് ഹോസ്പിറ്റൽ നമ്പറും പാസ്‌വേഡും നൽകുക.'
                : 'Enter your hospital number and password to view your health records.'}
            </p>
          </div>

          {error && (
            <div className="mt-5 rounded-2xl bg-rose-50 border border-rose-200 p-4 flex items-start gap-3 text-rose-800 text-xs">
              <AlertCircle className="w-5 h-5 flex-none mt-0.5 text-rose-600" />
              <div className="leading-relaxed font-semibold">{error}</div>
            </div>
          )}

          {success && (
            <div className="mt-5 rounded-2xl bg-emerald-50 border border-emerald-200 p-4 flex items-center gap-3 text-emerald-800 text-xs">
              <CheckCircle2 className="w-5 h-5 flex-none text-emerald-600" />
              <div className="font-bold">
                {lang === 'ml' ? 'വിജയകരമായി സൈൻ ഇൻ ചെയ്തു...' : 'Signed in successfully...'}
              </div>
            </div>
          )}

          <form method="post" action="#" onSubmit={handleSignIn} className="mt-6 space-y-4">
            <div>
              <label
                htmlFor="username"
                className="block text-xs font-bold text-[#0B1533] uppercase tracking-wider mb-1.5"
              >
                {lang === 'ml' ? 'ഹോസ്പിറ്റൽ നമ്പർ അല്ലെങ്കിൽ ഫോൺ' : 'Hospital number or phone'}
              </label>
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck="false"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                placeholder={lang === 'ml' ? 'ഉദാ: ABC-2026-0001' : 'e.g. ABC-2026-0001'}
                className="w-full rounded-2xl border border-[rgba(11,21,51,0.15)] px-4 py-3 text-sm text-[#0B1533] placeholder:text-[#9AA2BC] focus:border-[#15803D] focus:outline-hidden focus:ring-1 focus:ring-[#15803D]"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-xs font-bold text-[#0B1533] uppercase tracking-wider mb-1.5"
              >
                {lang === 'ml' ? 'പാസ്‌വേഡ്' : 'Password'}
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••••••"
                  className="w-full rounded-2xl border border-[rgba(11,21,51,0.15)] px-4 py-3 text-sm text-[#0B1533] placeholder:text-[#9AA2BC] pr-12 focus:border-[#15803D] focus:outline-hidden focus:ring-1 focus:ring-[#15803D]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-[#6B7596] hover:text-[#0B1533]"
                  aria-label={showPassword ? t('staffAuth.hidePassword', 'Hide password') : t('staffAuth.showPassword', 'Show password')}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || success}
              className="w-full py-3.5 px-5 rounded-2xl bg-[#15803D] hover:bg-[#166534] text-white font-extrabold text-sm sm:text-base shadow-md transition disabled:opacity-60 cursor-pointer mt-2"
            >
              {loading
                ? (lang === 'ml' ? 'സൈൻ ഇൻ ചെയ്യുന്നു...' : 'Signing In...')
                : (lang === 'ml' ? 'സൈൻ ഇൻ' : 'Sign In')}
            </button>
          </form>

          {/* Help box */}
          <div className="mt-6 pt-5 border-t border-[rgba(11,21,51,0.08)] text-center">
            <p className="text-xs text-[#6B7596] font-medium leading-relaxed">
              {lang === 'ml'
                ? 'പാസ്‌വേഡ് മറന്നോ? ഫ്രണ്ട് ഡെസ്കിൽ ചോദിക്കുക.'
                : 'Forgot password? Ask the front desk.'}
            </p>
          </div>

          {/* Demo account helper (Local / Testing) */}
          {import.meta.env.DEV && (
            <div className="mt-6 pt-4 border-t border-slate-100">
              <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                Demo Accounts
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => handleDemoFill('ABC-2026-0001')}
                  className="p-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold text-left truncate"
                >
                  Arun Kumar
                </button>
                <button
                  type="button"
                  onClick={() => handleDemoFill('ABC-2026-0002')}
                  className="p-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold text-left truncate"
                >
                  Baby Meenakshi
                </button>
              </div>
            </div>
          )}
        </div>

        <BuildStamp />
      </main>

      {/* Forced Password Change Modal */}
      {mustChangePassword && (
        <ForcePasswordChangeModal
          isOpen={mustChangePassword}
          username={username}
          onSuccess={() => {
            setMustChangePassword(false);
            setSuccess(true);
            setTimeout(() => {
              go('app');
              navigate('/patient');
            }, 500);
          }}
        />
      )}
    </div>
  );
}
