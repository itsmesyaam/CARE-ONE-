import React, { useState, useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { router } from './routes';
import { queryClient } from '../lib/queryClient';
import { ErrorBoundary } from '../components/ErrorBoundary';
import '../lib/i18n';

export function App(): React.JSX.Element {
  const { t } = useTranslation();
  const [healthFailed, setHealthFailed] = useState<boolean>(false);

  useEffect(() => {
    let active = true;
    fetch('/api/health')
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Health check failed with status ${res.status}`);
        }
      })
      .catch(() => {
        if (active) {
          setHealthFailed(true);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  if (healthFailed) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-slate-800">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-200 p-8 text-center">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-2xl mb-4 border border-amber-100">
            !
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">
            {t('serviceUnavailable.title')}
          </h1>
          <p className="text-sm text-slate-600 mb-6 leading-relaxed">
            {t('serviceUnavailable.message')}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-xl transition"
          >
            {t('serviceUnavailable.retry')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
