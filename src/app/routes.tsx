import { createBrowserRouter } from 'react-router-dom';
import { RootLayout } from './RootLayout';
import { AdminDashboard } from '../features/admin/AdminDashboard';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
  },
  {
    path: '/admin',
    element: <AdminDashboard />,
  },
]);
