import { lazy, Suspense } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import { RootLayout } from './RootLayout';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { AdminRouteGuard } from '../components/AdminRouteGuard';
import { SignInPage } from '../features/auth/SignInPage';
import { PatientProvider } from '../features/patient/PatientContext';
import { PatientSignIn } from '../features/patient/PatientSignIn';
import { PatientLayout } from '../features/patient/PatientLayout';
import { PatientHome } from '../features/patient/PatientHome';
import { PatientCarePlan } from '../features/patient/PatientCarePlan';
import { PatientRecords } from '../features/patient/PatientRecords';
import { PatientProfile } from '../features/patient/PatientProfile';
import { PatientReminders } from '../features/patient/PatientReminders';
import { PatientAppointments } from '../features/patient/PatientAppointments';

import { StaffSignIn } from '../features/auth/StaffSignIn';
import { ChangePasswordPage } from '../features/auth/ChangePasswordPage';
import { DoctorLayout } from '../features/doctor/DoctorLayout';
import { DoctorToday } from '../features/doctor/DoctorToday';
import { DoctorPatients } from '../features/doctor/DoctorPatients';
import { DoctorChart } from '../features/doctor/DoctorChart';
import { DoctorReview } from '../features/doctor/DoctorReview';
import { DoctorAccount } from '../features/doctor/DoctorAccount';
import { registerLogoutNavigator } from '../lib/logout';
import { RouteErrorElement } from '../components/RouteErrorElement';
import { NotFoundPage } from '../components/NotFoundPage';

const AdminDashboard = lazy(() =>
  import('../features/admin/AdminDashboard').then(m => ({ default: m.AdminDashboard })),
);

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    errorElement: <RouteErrorElement />,
  },
  {
    path: '/login',
    element: <SignInPage />,
  },
  {
    path: '/signin',
    element: <SignInPage />,
  },
  {
    path: '/staff/login',
    element: <StaffSignIn />,
  },
  {
    path: '/staff/signin',
    element: <StaffSignIn />,
  },
  {
    path: '/doctor/login',
    element: <StaffSignIn />,
  },
  {
    path: '/doctor/signin',
    element: <StaffSignIn />,
  },
  {
    path: '/doctor',
    element: (
      <ProtectedRoute allowedRoles={['doctor', 'specialist', 'front_desk', 'admin', 'staff']}>
        <DoctorLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <DoctorToday />,
      },
      {
        path: 'today',
        element: <DoctorToday />,
      },
      {
        path: 'patients',
        element: <DoctorPatients />,
      },
      {
        path: 'chart/:id',
        element: <DoctorChart />,
      },
      {
        path: 'review',
        element: <DoctorReview />,
      },
      {
        path: 'account',
        element: <DoctorAccount />,
      },
    ],
  },
  {
    path: '/patient/login',
    element: (
      <PatientProvider initialStep="welcome">
        <PatientSignIn />
      </PatientProvider>
    ),
  },
  {
    path: '/patient/signin',
    element: (
      <PatientProvider initialStep="welcome">
        <PatientSignIn />
      </PatientProvider>
    ),
  },
  {
    path: '/setup',
    element: (
      <PatientProvider initialStep="welcome">
        <PatientSignIn />
      </PatientProvider>
    ),
  },
  {
    path: '/patient/setup',
    element: (
      <PatientProvider initialStep="welcome">
        <PatientSignIn />
      </PatientProvider>
    ),
  },
  {
    path: '/patient',
    element: (
      <ProtectedRoute allowedRoles={['patient', 'guardian']}>
        <PatientProvider initialStep="app">
          <PatientLayout />
        </PatientProvider>
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <PatientHome />,
      },
      {
        path: 'plan',
        element: <PatientCarePlan />,
      },
      {
        path: 'records',
        element: <PatientRecords />,
      },
      {
        path: 'profile',
        element: <PatientProfile />,
      },
      {
        path: 'me',
        element: <PatientProfile />,
      },
      {
        path: 'reminders',
        element: <PatientReminders />,
      },
      {
        path: 'appointments',
        element: <PatientAppointments />,
      },
      {
        path: 'appts',
        element: <PatientAppointments />,
      },
    ],
  },
  {
    path: '/change-password',
    element: <ChangePasswordPage />,
  },
  {
    path: '/admin',
    element: (
      <AdminRouteGuard>
        <Suspense
          fallback={
            <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-600 border-t-transparent" />
            </div>
          }
        >
          <AdminDashboard />
        </Suspense>
      </AdminRouteGuard>
    ),
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
]);

registerLogoutNavigator((to, opts) => router.navigate(to, opts));

