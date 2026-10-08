import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  Stethoscope,
  User,
  ShieldCheck,
  Languages,
  Lock,
  ArrowRight,
  Shield,
  Phone,
  Mail,
  MapPin,
} from 'lucide-react';
import { OfflineBanner } from '../components/OfflineBanner';
import { ConfigBanner } from '../components/ConfigBanner';
import { BuildStamp } from '../components/BuildStamp';

export function RootLayout(): React.JSX.Element {
  const { t, i18n } = useTranslation();

  const toggleLanguage = () => {
    const nextLang = i18n.language === 'ml' ? 'en' : 'ml';
    void i18n.changeLanguage(nextLang);
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#F4F6FB] text-[#0B1533]">
      <ConfigBanner />
      <OfflineBanner />

      {/* Floating Pill Header matching DoctorCare */}
      <header className="sticky top-3 z-30 mx-auto w-full max-w-5xl px-4 sm:px-6">
        <nav
          aria-label="Main Navigation"
          className="flex items-center justify-between rounded-full border border-[rgba(11,21,51,0.08)] bg-white/90 px-4 py-2.5 shadow-[0_12px_34px_-14px_rgba(11,21,51,0.18)] backdrop-blur-md sm:px-6"
        >
          {/* Hospital Logo & Name */}
          <Link to="/" className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#E9EEFE] text-[#2B59FF]">
              <Stethoscope className="h-5 w-5" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-extrabold text-xs sm:text-sm text-[#0B1533] leading-none tracking-tight truncate">
                {t('app.title')}
              </span>
              <span className="hidden sm:inline text-[11px] font-semibold text-[#6B7596] leading-tight">
                {t('app.hospitalName')}
              </span>
            </div>
          </Link>

          {/* Right Header Badges & Actions */}
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            {/* Live OPD Badge */}
            <span className="hidden items-center gap-2 rounded-full bg-[#E8F7EE] px-3 py-1 text-xs font-bold text-[#15803D] sm:inline-flex">
              <span className="live" />
              <span>{t('home.liveOpd')}</span>
            </span>

            {/* Language Toggle Pill */}
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-1.5 rounded-full border border-[rgba(11,21,51,0.08)] bg-[#F4F6FB] px-2.5 sm:px-3 py-1.5 text-xs font-bold text-[#0B1533] hover:bg-slate-100 transition whitespace-nowrap"
              aria-label={t('nav.language')}
            >
              <Languages className="h-3.5 w-3.5 text-[#6B7596]" />
              <span>{i18n.language === 'ml' ? 'English' : 'മലയാളം'}</span>
            </button>

            {/* Sign In CTA */}
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 sm:gap-2 rounded-full bg-[#2B59FF] px-3 sm:px-4 py-1.5 sm:py-2 text-xs font-bold text-white shadow-[0_4px_14px_rgba(43,89,255,0.35)] hover:bg-[#1F47E6] transition whitespace-nowrap"
            >
              <Lock className="h-3.5 w-3.5" />
              <span>{t('nav.signIn')}</span>
            </Link>
          </div>
        </nav>
      </header>

      {/* Main Content Area */}
      <main role="main" className="flex flex-1 flex-col items-center justify-center px-4 py-8 sm:py-12">
        <div className="w-full max-w-4xl">
          {/* Hero Section */}
          <div className="mb-10 text-center">
            {/* Vault Badge with Pulse */}
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-[#E9EEFE] px-3.5 py-1 text-xs font-bold tracking-wider uppercase text-[#2B59FF]">
              <span className="live" />
              <span>{t('home.vaultTag')}</span>
            </div>

            {/* Expressive Editorial Headline */}
            <h1 className="mb-3 text-3xl font-extrabold tracking-tight text-[#0B1533] sm:text-5xl lg:text-6xl">
              {t('home.heroTagline1')}{' '}
              <span className="serif text-[#2B59FF] italic font-normal">
                {t('home.heroTagline2')}
              </span>
            </h1>

            <p className="mx-auto max-w-xl text-sm leading-relaxed text-[#6B7596] sm:text-base">
              {t('home.heroDesc')}
            </p>
          </div>

          {/* Portal Cards Grid matching DoctorCare Card Aesthetic */}
          <div className="grid gap-6 sm:grid-cols-2">
            {/* Patient Portal Card */}
            <Link
              to="/patient/login"
              className="card-dc group flex flex-col justify-between p-6 sm:p-8"
            >
              <div>
                <div className="mb-4 flex items-center justify-between">
                  <span className="mono rounded-full bg-[#E8F7EE] px-3 py-1 text-[11px] font-bold text-[#15803D]">
                    {t('home.patientTag')}
                  </span>
                  <div className="go flex h-9 w-9 items-center justify-center rounded-full bg-[#F4F6FB] text-[#0B1533] shadow-xs">
                    <ArrowRight className="h-4 w-4" />
                  </div>
                </div>

                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#E8F7EE] text-[#15803D]">
                  <User className="h-6 w-6" />
                </div>

                <h2 className="text-xl font-bold tracking-tight text-[#0B1533] group-hover:text-[#2B59FF] transition">
                  {t('home.patientTitle')}
                </h2>
                <p className="mt-2 text-xs leading-relaxed text-[#6B7596] sm:text-sm">
                  {t('home.patientDesc')}
                </p>
              </div>

              <div className="mt-6 flex items-center gap-2 text-xs font-bold text-[#2B59FF]">
                <span>{t('auth.patientTab')}</span>
                <span className="group-hover:translate-x-1 transition">&rarr;</span>
              </div>
            </Link>

            {/* Doctor & Staff Console Card */}
            <Link
              to="/login"
              className="card-dc group flex flex-col justify-between p-6 sm:p-8"
            >
              <div>
                <div className="mb-4 flex items-center justify-between">
                  <span className="mono rounded-full bg-[#E9EEFE] px-3 py-1 text-[11px] font-bold text-[#2B59FF]">
                    {t('home.staffTag')}
                  </span>
                  <div className="go flex h-9 w-9 items-center justify-center rounded-full bg-[#F4F6FB] text-[#0B1533] shadow-xs">
                    <ArrowRight className="h-4 w-4" />
                  </div>
                </div>

                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#E9EEFE] text-[#2B59FF]">
                  <ShieldCheck className="h-6 w-6" />
                </div>

                <h2 className="text-xl font-bold tracking-tight text-[#0B1533] group-hover:text-[#2B59FF] transition">
                  {t('home.staffTitle')}
                </h2>
                <p className="mt-2 text-xs leading-relaxed text-[#6B7596] sm:text-sm">
                  {t('home.staffDesc')}
                </p>
              </div>

              <div className="mt-6 flex items-center gap-2 text-xs font-bold text-[#2B59FF]">
                <span>{t('auth.staffTab')}</span>
                <span className="group-hover:translate-x-1 transition">&rarr;</span>
              </div>
            </Link>
          </div>

          {/* Quick Hospital Contact & Privacy Bar */}
          <div className="mt-8 flex flex-col items-center justify-between gap-4 rounded-2xl border border-[rgba(11,21,51,0.08)] bg-white p-4 shadow-xs sm:flex-row sm:px-6">
            <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-semibold text-[#6B7596] sm:justify-start">
              <span className="flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 text-[#2B59FF]" />
                <span>0484-2800100</span>
              </span>
              <span className="flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-[#2B59FF]" />
                <span>care@abchospital.example.com</span>
              </span>
              <span className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-[#2B59FF]" />
                <span>Kochi, Kerala</span>
              </span>
            </div>

            <div className="flex items-center gap-3">
              <Link
                to="/admin"
                className="rounded-full border border-[rgba(11,21,51,0.08)] bg-[#F4F6FB] px-3 py-1 text-xs font-bold text-[#0B1533] hover:bg-slate-100 transition"
              >
                {t('nav.admin')}
              </Link>
            </div>
          </div>

          {/* DPDP Compliance Notice */}
          <div className="mt-4 flex items-center justify-center gap-2 text-center text-xs font-medium text-[#15803D]">
            <Shield className="h-4 w-4 shrink-0" />
            <span>{t('home.complianceBadge')}</span>
          </div>
        </div>
      </main>

      <BuildStamp />
    </div>
  );
}
