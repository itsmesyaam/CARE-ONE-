import { lazy, Suspense } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import { RootLayout } from './RootLayout';
import { AdminRouteGuard } from '../components/AdminRouteGuard';
import { SignInPage } from '../features/auth/SignInPage';
import { PatientProvider } from '../features/patient/PatientContext';
import { PatientSignIn } from '../features/patient/PatientSignIn';
import { PatientLayout } from '../features/patient/PatientLayout';
import { PatientHome } from '../features/patient/PatientHome';
import { PatientCarePlan } from '../features/patient/PatientCarePlan';
import { PatientRecords } from '../features/patient/PatientRecords';
import { PatientProfile } from '../features/patient/PatientProfile';

import { StaffSignIn } from '../features/auth/StaffSignIn';
import { DoctorLayout } from '../features/doctor/DoctorLayout';
import { DoctorToday } from '../features/doctor/DoctorToday';
import { DoctorPatients } from '../features/doctor/DoctorPatients';

const AdminDashboard = lazy(() =>
  import('../features/admin/AdminDashboard').then(m => ({ default: m.AdminDashboard })),
);

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
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
    element: <DoctorLayout />,
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
    path: '/patient',
    element: (
      <PatientProvider initialStep="app">
        <PatientLayout />
      </PatientProvider>
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
    ],
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
]);
