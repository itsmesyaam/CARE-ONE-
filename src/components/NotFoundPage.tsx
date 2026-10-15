import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { HelpCircle, Home } from 'lucide-react';

export function NotFoundPage(): React.JSX.Element {
  const { t } = useTranslation();

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

export default NotFoundPage;
