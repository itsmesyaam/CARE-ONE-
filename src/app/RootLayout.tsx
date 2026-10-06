import React from 'react';
import { useTranslation } from 'react-i18next';

export function RootLayout(): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <main role="main">
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-4">
        <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 text-center shadow-sm">
          <h1 className="mb-2 text-2xl font-bold text-slate-900">{t('app.title')}</h1>
          <p className="mb-4 text-slate-600">{t('app.description')}</p>
          <span className="inline-block rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-medium text-sky-800">
            {t('common.welcome')} - {t('app.hospitalName')}
          </span>
        </div>
      </div>
    </main>
  );
}
