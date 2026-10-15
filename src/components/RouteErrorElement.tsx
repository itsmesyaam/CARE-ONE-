import { Link, useRouteError, isRouteErrorResponse } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, HelpCircle, Home, RefreshCw } from 'lucide-react';

export function RouteErrorElement(): React.JSX.Element {
  const error = useRouteError();
  const { t } = useTranslation();

  const is404 = isRouteErrorResponse(error) && error.status === 404;

  if (is404) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-lg">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-50 text-sky-600 border border-sky-100">
            <HelpCircle className="h-7 w-7" />
          </div>
          <h1 className="mb-2 text-xl font-bold text-slate-900">
            {t('notFound.title')}
          </h1>
          <p className="mb-6 text-sm text-slate-600 leading-relaxed">
            {t('notFound.message')}
          </p>
          <Link
            to="/"
            className="inline-flex items-center justify-center gap-2 w-full rounded-xl bg-sky-700 px-4 py-2.5 font-semibold text-sm text-white hover:bg-sky-800 transition"
          >
            <Home className="h-4 w-4" />
            {t('notFound.button')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md rounded-2xl border border-red-200 bg-white p-8 text-center shadow-lg">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600 border border-red-100">
          <AlertTriangle className="h-7 w-7" />
        </div>
        <h1 className="mb-2 text-xl font-bold text-slate-900">
          {t('errorBoundary.title')}
        </h1>
        <p className="mb-6 text-sm text-slate-600 leading-relaxed">
          {t('errorBoundary.message')}
        </p>
        <div className="flex flex-col gap-3">
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center justify-center gap-2 w-full rounded-xl bg-slate-900 px-4 py-2.5 font-semibold text-sm text-white hover:bg-slate-800 transition"
          >
            <RefreshCw className="h-4 w-4" />
            {t('errorBoundary.reload')}
          </button>
          <Link
            to="/"
            className="inline-flex items-center justify-center gap-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 font-semibold text-sm text-slate-700 hover:bg-slate-50 transition"
          >
            <Home className="h-4 w-4" />
            {t('notFound.button')}
          </Link>
        </div>
      </div>
    </div>
  );
}

export default RouteErrorElement;
