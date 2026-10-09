import React from 'react';
import { RouterProvider } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { router } from './routes';
import { queryClient } from '../lib/queryClient';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { getSupabaseConfigurationError } from '../lib/supabase';
import '../lib/i18n';

export function App(): React.JSX.Element {
  const configError = getSupabaseConfigurationError();

  if (configError) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-slate-800">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-red-200 p-8 text-center">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-red-50 text-red-600 flex items-center justify-center font-bold text-2xl mb-4 border border-red-100">
            !
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">Platform Configuration Error</h1>
          <p className="text-sm text-slate-600 mb-6 leading-relaxed">
            {configError}
          </p>
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono text-slate-600 break-all text-left">
            <div>Expected project:</div>
            <div className="font-semibold text-slate-800 mt-0.5">https://kndkohgpbnbbndvtgqvx.supabase.co</div>
          </div>
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
