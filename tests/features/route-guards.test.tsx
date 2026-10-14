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

  it('renders children when session exists and role is allowed', async () => {
    vi.spyOn(client.auth, 'getSession').mockResolvedValue({
      data: {
        session: {
          user: {
            id: 'doc-1',
            email: 'dr.rahul@example.com',
            role: 'doctor',
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
              <ProtectedRoute allowedRoles={['doctor']}>
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

  it('redirects to "/" when role is not in allowedRoles', async () => {
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
      expect(screen.getByText('Home Page')).toBeInTheDocument();
      expect(screen.queryByText('Admin Content')).not.toBeInTheDocument();
    });
  });

  it('AdminRouteGuard redirects to "/" when no session exists', async () => {
    vi.spyOn(client.auth, 'getSession').mockResolvedValue({
      data: { session: null },
      error: null,
    });

    render(
      <MemoryRouter initialEntries={['/admin']}>
        <Routes>
          <Route path="/" element={<div>Home Page</div>} />
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
      expect(screen.getByText('Home Page')).toBeInTheDocument();
      expect(screen.queryByText('Admin Secret')).not.toBeInTheDocument();
    });
  });
});
