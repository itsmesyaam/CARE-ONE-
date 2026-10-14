import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ShieldCheck,
  AlertCircle,
  Eye,
  EyeOff,
  Languages,
  CheckCircle2,
  Stethoscope,
  ChevronLeft,
} from 'lucide-react';
import { BuildStamp } from '../../components/BuildStamp';
import { ForcePasswordChangeModal } from '../../components/auth/ForcePasswordChangeModal';

export interface StaffSignInProps {
  onUnlock?: () => void;
  initialStep?: string;
}

export function StaffSignIn({ onUnlock }: StaffSignInProps = {}): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [userRole, setUserRole] = useState<string>('doctor');

  const toggleLanguage = () => {
    const nextLang = i18n.language === 'ml' ? 'en' : 'ml';
    void i18n.changeLanguage(nextLang);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError(
        i18n.language === 'ml'
          ? 'ഇമെയിലും പാസ്‌വേഡും നൽകുക.'
          : 'Please enter your email and password.'
      );
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: email.trim(),
          password,
        }),
      });

      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        must_change_password?: boolean;
        user?: { role: string };
      };

      if (!res.ok || !data.ok) {
        throw new Error(
          data.error ||
            (i18n.language === 'ml'
              ? 'സൈൻ ഇൻ പരാജയപ്പെട്ടു. വിവരങ്ങൾ ശരിയാണോ എന്ന് പരിശോധിക്കുക.'
              : 'Sign-in failed. Please verify your credentials.')
        );
      }

      const role = data.user?.role || 'doctor';
      setUserRole(role);

      if (data.must_change_password) {
        setMustChangePassword(true);
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        if (onUnlock) {
          onUnlock();
          return;
        }
        if (role === 'admin') {
          navigate('/admin');
        } else {
          navigate('/doctor');
        }
      }, 500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleDemoFill = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('DemoPassword123!');
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#F4F6FB] text-[#0B1533]">
      {/* Header */}
      <header className="mx-auto w-full max-w-5xl px-4 sm:px-6 pt-5">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 sm:gap-3" aria-label="CareOne Home">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#E9EEFE] text-[#2B59FF] shadow-xs">
              <Stethoscope className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-sm sm:text-base text-[#0B1533] leading-none tracking-tight">
                CareOne
              </span>
              <span className="text-[11px] font-semibold text-[#6B7596] leading-tight">
                ABC Hospital Kerala
              </span>
            </div>
          </Link>

          <button
            type="button"
            onClick={toggleLanguage}
            className="flex items-center gap-1.5 rounded-full border border-[rgba(11,21,51,0.08)] bg-white px-3 py-1.5 text-xs font-bold text-[#0B1533] hover:bg-slate-100 transition shadow-2xs"
            aria-label="Toggle language"
          >
            <Languages size={15} className="text-[#6B7596]" />
            <span>{i18n.language === 'ml' ? 'English' : 'മലയാളം'}</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 w-full max-w-md mx-auto px-5 py-10 flex flex-col justify-center">
        <div className="bg-white rounded-3xl p-7 sm:p-9 shadow-xl border border-[rgba(11,21,51,0.08)]">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#E9EEFE] text-[#2B59FF] mb-4 shadow-xs">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0B1533] tracking-tight">
              {i18n.language === 'ml' ? 'സ്റ്റാഫ് സൈൻ ഇൻ' : 'Staff Sign-In'}
            </h1>
            <p className="text-xs sm:text-sm text-[#6B7596] mt-2">
              {i18n.language === 'ml'
                ? 'ഹോസ്പിറ്റൽ ഇമെയിലും പാസ്‌വേഡും ഉപയോഗിച്ച് പ്രവേശിക്കുക.'
                : 'Sign in with your hospital email and password.'}
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
                {i18n.language === 'ml' ? 'വിജയകരമായി സൈൻ ഇൻ ചെയ്തു...' : 'Signed in successfully...'}
              </div>
            </div>
          )}

          <form onSubmit={handleSignIn} className="mt-6 space-y-4">
            <div>
              <label
                htmlFor="staff-email"
                className="block text-xs font-bold text-[#0B1533] uppercase tracking-wider mb-1.5"
              >
                {t('staffAuth.email', 'Email')}
              </label>
              <input
                id="staff-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="doctor@example.com"
                className="w-full rounded-2xl border border-[rgba(11,21,51,0.15)] px-4 py-3 text-sm text-[#0B1533] placeholder:text-[#9AA2BC] focus:border-[#2B59FF] focus:outline-hidden focus:ring-1 focus:ring-[#2B59FF]"
              />
            </div>

            <div>
              <label
                htmlFor="staff-password"
                className="block text-xs font-bold text-[#0B1533] uppercase tracking-wider mb-1.5"
              >
                {t('staffAuth.password', 'Password')}
              </label>
              <div className="relative">
                <input
                  id="staff-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••••••"
                  className="w-full rounded-2xl border border-[rgba(11,21,51,0.15)] px-4 py-3 text-sm text-[#0B1533] placeholder:text-[#9AA2BC] pr-12 focus:border-[#2B59FF] focus:outline-hidden focus:ring-1 focus:ring-[#2B59FF]"
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
              className="w-full py-3.5 px-5 rounded-2xl bg-[#2B59FF] hover:bg-[#1E45D9] text-white font-extrabold text-sm sm:text-base shadow-md transition disabled:opacity-60 cursor-pointer mt-2"
            >
              {loading
                ? (i18n.language === 'ml' ? 'സൈൻ ഇൻ ചെയ്യുന്നു...' : 'Signing In...')
                : (i18n.language === 'ml' ? 'സൈൻ ഇൻ' : 'Sign In')}
            </button>
          </form>

          {/* Help box */}
          <div className="mt-6 pt-5 border-t border-[rgba(11,21,51,0.08)] text-center">
            <p className="text-xs text-[#6B7596] font-medium leading-relaxed">
              {t('staffAuth.forgotPassword', 'Forgot your password? The hospital admin can reset it.')}
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
                  onClick={() => handleDemoFill('admin@example.com')}
                  className="p-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold text-left truncate"
                >
                  Admin
                </button>
                <button
                  type="button"
                  onClick={() => handleDemoFill('dr.rahul@example.com')}
                  className="p-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold text-left truncate"
                >
                  Dr. Rahul
                </button>
                <button
                  type="button"
                  onClick={() => handleDemoFill('desk@example.com')}
                  className="p-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold text-left truncate"
                >
                  Front Desk
                </button>
                <button
                  type="button"
                  onClick={() => handleDemoFill('dr.anjali@example.com')}
                  className="p-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold text-left truncate"
                >
                  Dr. Anjali
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 text-center">
          <Link
            to="/patient/login"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#6B7596] hover:text-[#0B1533] transition"
          >
            <ChevronLeft size={16} />
            <span>
              {i18n.language === 'ml'
                ? 'രോഗി പോർട്ടലിലേക്ക് മാറുക'
                : 'Switch to Patient Portal'}
            </span>
          </Link>
        </div>

        <BuildStamp />
      </main>

      {/* Forced Password Change Modal */}
      {mustChangePassword && (
        <ForcePasswordChangeModal
          isOpen={mustChangePassword}
          username={email}
          onSuccess={() => {
            setMustChangePassword(false);
            setSuccess(true);
            setTimeout(() => {
              if (onUnlock) {
                onUnlock();
                return;
              }
              if (userRole === 'admin') {
                navigate('/admin');
              } else {
                navigate('/doctor');
              }
            }, 500);
          }}
        />
      )}
    </div>
  );
}
