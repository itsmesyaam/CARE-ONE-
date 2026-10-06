import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import './i18n';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false
    }
  }
});

function HomeView(): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-sm border border-slate-200 p-6 text-center">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">
          {t('app.title')}
        </h1>
        <p className="text-slate-600 mb-4">
          {t('app.description')}
        </p>
        <span className="inline-block bg-sky-100 text-sky-800 text-xs px-2.5 py-0.5 rounded-full font-medium">
          {t('common.welcome')}
        </span>
      </div>
    </div>
  );
}

export default function App(): React.JSX.Element {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <main role="main">
          <Routes>
            <Route path="/" element={<HomeView />} />
          </Routes>
        </main>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
