import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from '../../src/components/ProtectedRoute';
import { AdminRouteGuard } from '../../src/components/AdminRouteGuard';
import { client } from '../../src/lib/client';

describe('Client Route Guards (ProtectedRoute & AdminRouteGuard)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders children when session exists and role is allowed (including specialist)', async () => {
    vi.spyOn(client.auth, 'getSession').mockResolvedValue({
      data: {
        session: {
          user: {
            id: 'spec-1',
            email: 'dr.kavitha@example.com',
            role: 'specialist',
          },
        },
      },
      error: null,
    });

    render(
      <MemoryRouter initialEntries={['/doctor']}>
        <Routes>
          <Route path="/" element={<div>Home Page</div>} />
          <Route
            path="/doctor"
            element={
              <ProtectedRoute allowedRoles={['doctor', 'specialist']}>
                <div>Doctor Content</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Doctor Content')).toBeInTheDocument();
    });
  });

  it('redirects to "/" when session is null', async () => {
    vi.spyOn(client.auth, 'getSession').mockResolvedValue({
      data: { session: null },
      error: null,
    });

    render(
      <MemoryRouter initialEntries={['/doctor']}>
        <Routes>
          <Route path="/" element={<div>Home Page</div>} />
          <Route
            path="/doctor"
            element={
              <ProtectedRoute allowedRoles={['doctor']}>
                <div>Doctor Content</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Home Page')).toBeInTheDocument();
      expect(screen.queryByText('Doctor Content')).not.toBeInTheDocument();
    });
  });

  it('redirects signed-in user with mismatched role to their own home (/patient, /doctor, /admin) not "/"', async () => {
    // Patient visits /admin -> must redirect to /patient
    vi.spyOn(client.auth, 'getSession').mockResolvedValue({
      data: {
        session: {
          user: {
            id: 'pat-1',
            role: 'patient',
          },
        },
      },
      error: null,
    });

    render(
      <MemoryRouter initialEntries={['/admin']}>
        <Routes>
          <Route path="/" element={<div>Home Page</div>} />
          <Route path="/patient" element={<div>Patient Home</div>} />
          <Route path="/doctor" element={<div>Doctor Home</div>} />
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <div>Admin Content</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Patient Home')).toBeInTheDocument();
      expect(screen.queryByText('Admin Content')).not.toBeInTheDocument();
      expect(screen.queryByText('Home Page')).not.toBeInTheDocument();
    });
  });

  it('redirects doctor who visits /patient to /doctor (their own home)', async () => {
    vi.spyOn(client.auth, 'getSession').mockResolvedValue({
      data: {
        session: {
          user: {
            id: 'doc-1',
            role: 'doctor',
          },
        },
      },
      error: null,
    });

    render(
      <MemoryRouter initialEntries={['/patient']}>
        <Routes>
          <Route path="/" element={<div>Home Page</div>} />
          <Route path="/doctor" element={<div>Doctor Home</div>} />
          <Route
            path="/patient"
            element={
              <ProtectedRoute allowedRoles={['patient', 'guardian']}>
                <div>Patient Content</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Doctor Home')).toBeInTheDocument();
      expect(screen.queryByText('Patient Content')).not.toBeInTheDocument();
    });
  });

  it('redirects to /change-password when must_change_password is true', async () => {
    vi.spyOn(client.auth, 'getSession').mockResolvedValue({
      data: {
        session: {
          user: {
            id: 'doc-1',
            role: 'doctor',
            must_change_password: true,
          },
        },
      },
      error: null,
    });

    render(
      <MemoryRouter initialEntries={['/doctor']}>
        <Routes>
          <Route path="/change-password" element={<div>Change Password Screen</div>} />
          <Route
            path="/doctor"
            element={
              <ProtectedRoute allowedRoles={['doctor']}>
                <div>Doctor Content</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Change Password Screen')).toBeInTheDocument();
      expect(screen.queryByText('Doctor Content')).not.toBeInTheDocument();
    });
  });

  it('AdminRouteGuard requires role === "admin" and redirects non-admin to their own home', async () => {
    vi.spyOn(client.auth, 'getSession').mockResolvedValue({
      data: {
        session: {
          user: {
            id: 'doc-1',
            role: 'doctor',
          },
        },
      },
      error: null,
    });

    render(
      <MemoryRouter initialEntries={['/admin']}>
        <Routes>
          <Route path="/" element={<div>Home Page</div>} />
          <Route path="/doctor" element={<div>Doctor Home</div>} />
          <Route
            path="/admin"
            element={
              <AdminRouteGuard>
                <div>Admin Secret</div>
              </AdminRouteGuard>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Doctor Home')).toBeInTheDocument();
      expect(screen.queryByText('Admin Secret')).not.toBeInTheDocument();
    });
  });
});
