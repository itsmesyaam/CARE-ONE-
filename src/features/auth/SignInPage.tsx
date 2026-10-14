import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  KeyRound,
  ChevronRight,
  ShieldCheck,
  Stethoscope,
  Languages,
} from 'lucide-react';
import { BuildStamp } from '../../components/BuildStamp';

export function SignInPage(): React.JSX.Element {
  const { t, i18n } = useTranslation();

  const toggleLanguage = () => {
    const nextLang = i18n.language === 'ml' ? 'en' : 'ml';
    void i18n.changeLanguage(nextLang);
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

      {/* Main Choice Screen */}
      <main className="flex-1 w-full max-w-lg mx-auto px-5 py-12 flex flex-col justify-center">
        <div className="bg-white rounded-3xl p-7 sm:p-9 shadow-xl border border-[rgba(11,21,51,0.08)]">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-center text-[#0B1533]">
            {t('auth.signInTitle', 'Secure Sign-In')}
          </h1>
          <p className="text-sm text-[#6B7596] text-center mt-2 leading-relaxed">
            {i18n.language === 'ml'
              ? 'നിങ്ങളുടെ രജിസ്റ്റർ ചെയ്ത യൂസർനെയിമും പാസ്‌വേഡും ഉപയോഗിച്ച് സൈൻ ഇൻ ചെയ്യുക.'
              : 'Sign in with your registered hospital number or email and password.'}
          </p>

          <div className="mt-8 flex flex-col gap-4">
            {/* Patient Portal Option */}
            <Link
              to="/patient/login"
              className="group p-5 rounded-2xl border border-[rgba(11,21,51,0.08)] bg-[#FAFCFF] hover:bg-[#F0F5FF] hover:border-[#2B59FF]/30 transition-all shadow-2xs flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#E8F7EE] text-[#15803D] flex items-center justify-center flex-none">
                  <ShieldCheck size={26} />
                </div>
                <div>
                  <b className="block text-base font-bold text-[#0B1533] group-hover:text-[#2B59FF] transition">
                    {t('auth.patientTab', 'Patient or Guardian')}
                  </b>
                  <span className="block text-xs text-[#6B7596] mt-0.5">
                    {i18n.language === 'ml'
                      ? 'ഹോസ്പിറ്റൽ നമ്പറും പാസ്‌വേഡും ഉപയോഗിക്കുക'
                      : 'Sign in with hospital number and password'}
                  </span>
                </div>
              </div>
              <ChevronRight size={20} className="text-[#6B7596] group-hover:translate-x-1 transition text-right" />
            </Link>

            {/* Doctor & Staff Option */}
            <Link
              to="/staff/signin"
              className="group p-5 rounded-2xl border border-[rgba(11,21,51,0.08)] bg-[#FAFCFF] hover:bg-[#F0F5FF] hover:border-[#2B59FF]/30 transition-all shadow-2xs flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#E9EEFE] text-[#2B59FF] flex items-center justify-center flex-none">
                  <KeyRound size={24} />
                </div>
                <div>
                  <b className="block text-base font-bold text-[#0B1533] group-hover:text-[#2B59FF] transition">
                    {t('auth.staffTab', 'Hospital Staff')}
                  </b>
                  <span className="block text-xs text-[#6B7596] mt-0.5">
                    {i18n.language === 'ml'
                      ? 'ഇമെയിലും പാസ്‌വേഡും ഉപയോഗിക്കുക'
                      : 'Doctor, Front Desk, or Administrator (Email + Password)'}
                  </span>
                </div>
              </div>
              <ChevronRight size={20} className="text-[#6B7596] group-hover:translate-x-1 transition text-right" />
            </Link>
          </div>

          <div className="mt-8 pt-6 border-t border-[rgba(11,21,51,0.08)] flex items-start gap-2.5 text-xs text-[#6B7596]">
            <ShieldCheck size={18} className="text-[#15803D] flex-none mt-0.5" />
            <span>
              India DPDP Act 2023 compliant. Cryptographic authentication ensures your health data remains protected against credential phishing.
            </span>
          </div>
        </div>
      </main>

      <BuildStamp />
    </div>
  );
}
