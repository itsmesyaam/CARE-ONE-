import React, { useEffect, useState, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useTranslation } from 'react-i18next';

export function AdminRouteGuard({ children }: { children: ReactNode }): React.JSX.Element {
  const { t } = useTranslation();
  const [checked, setChecked] = useState(false);
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setHasSession(!!data.session);
      setChecked(true);
    });
  }, []);

  if (!checked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-600 border-t-transparent" />
      </div>
    );
  }

  if (!hasSession) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-4">
        <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 text-center shadow-xs">
          <h2 className="mb-2 font-bold text-lg text-slate-900">
            {t('common.authRequired')}
          </h2>
          <p className="mb-4 text-slate-600 text-sm">
            {t('common.adminAuthMessage')}
          </p>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-lg bg-sky-700 px-4 py-2 font-medium text-sm text-white hover:bg-sky-800 transition"
          >
            {t('common.returnHome')}
          </a>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
