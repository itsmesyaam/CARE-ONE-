import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Stethoscope, User, ShieldCheck, Languages, Lock } from 'lucide-react';
import { OfflineBanner } from '../components/OfflineBanner';
import { ConfigBanner } from '../components/ConfigBanner';

export function RootLayout(): React.JSX.Element {
  const { t, i18n } = useTranslation();

  const toggleLanguage = () => {
    const nextLang = i18n.language === 'ml' ? 'en' : 'ml';
    void i18n.changeLanguage(nextLang);
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <ConfigBanner />
      <OfflineBanner />

      {/* Navigation Header */}
      <header className="border-b border-slate-200 bg-white shadow-2xs">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-100 text-sky-800">
              <Stethoscope className="h-5 w-5" />
            </div>
            <div>
              <span className="block font-bold text-sm text-slate-900 leading-tight">
                {t('app.title')}
              </span>
              <span className="block text-[11px] text-slate-500">
                {t('app.hospitalName')}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 transition"
              aria-label={t('nav.language')}
            >
              <Languages className="h-3.5 w-3.5 text-slate-500" />
              <span>{i18n.language === 'ml' ? 'English' : 'മലയാളം'}</span>
            </button>

            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 rounded-lg bg-sky-700 px-3 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-sky-800 transition"
            >
              <Lock className="h-3.5 w-3.5" />
              <span>{t('nav.signIn')}</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Hero & Quick Navigation */}
      <main role="main" className="flex flex-1 items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-2xl">
          <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 text-center shadow-xs">
            <span className="mb-3 inline-block rounded-full bg-sky-100 px-3 py-1 text-xs font-medium text-sky-800">
              {t('common.welcome')} · {t('app.hospitalName')}
            </span>
            <h1 className="mb-2 text-2xl font-bold text-slate-900 sm:text-3xl">
              {t('app.title')}
            </h1>
            <p className="mx-auto max-w-md text-sm text-slate-600 sm:text-base">
              {t('app.description')}
            </p>
          </div>

          {/* Quick Access Tiles */}
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Patient Portal Tile */}
            <Link
              to="/login"
              className="group flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-2xs hover:border-sky-300 hover:shadow-xs transition"
            >
              <div>
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 group-hover:bg-emerald-100 transition">
                  <User className="h-5 w-5" />
                </div>
                <h2 className="font-semibold text-slate-900 group-hover:text-sky-900 transition text-base">
                  {t('auth.patientTab')}
                </h2>
                <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                  {t('auth.patientDescription')}
                </p>
              </div>
              <div className="mt-4 flex items-center text-xs font-semibold text-sky-700 group-hover:translate-x-0.5 transition">
                <span>{t('common.signIn')} &rarr;</span>
              </div>
            </Link>

            {/* Staff / Doctor Tile */}
            <Link
              to="/login"
              className="group flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-2xs hover:border-sky-300 hover:shadow-xs transition"
            >
              <div>
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-sky-50 text-sky-700 group-hover:bg-sky-100 transition">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <h2 className="font-semibold text-slate-900 group-hover:text-sky-900 transition text-base">
                  {t('auth.staffTab')}
                </h2>
                <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                  {t('auth.staffDescription')}
                </p>
              </div>
              <div className="mt-4 flex items-center text-xs font-semibold text-sky-700 group-hover:translate-x-0.5 transition">
                <span>{t('common.signIn')} &rarr;</span>
              </div>
            </Link>
          </div>

          {/* Admin Direct Access */}
          <div className="mt-4 text-center">
            <Link
              to="/admin"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-sky-700 transition"
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>{t('nav.admin')}</span>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
