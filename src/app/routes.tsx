import { lazy, Suspense } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import { RootLayout } from './RootLayout';

const AdminDashboard = lazy(() =>
  import('../features/admin/AdminDashboard').then(m => ({ default: m.AdminDashboard })),
);

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
  },
  {
    path: '/admin',
    element: (
      <Suspense
        fallback={
          <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-600 border-t-transparent" />
          </div>
        }
      >
        <AdminDashboard />
      </Suspense>
    ),
  },
]);
