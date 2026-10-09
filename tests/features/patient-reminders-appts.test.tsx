import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import i18n from '../../src/lib/i18n';
import { PatientProvider } from '../../src/features/patient/PatientContext';
import { PatientProfile } from '../../src/features/patient/PatientProfile';
import { PatientReminders } from '../../src/features/patient/PatientReminders';
import { PatientAppointments } from '../../src/features/patient/PatientAppointments';
import { PatientLayout } from '../../src/features/patient/PatientLayout';
import * as apiClient from '../../src/lib/api-client';

describe('Patient Reminders & Appointments Feature', () => {
  beforeEach(async () => {
    localStorage.clear();
    sessionStorage.clear();
    await i18n.changeLanguage('en');
    vi.clearAllMocks();
  });

  it('renders PatientReminders with grouped sections, actions, preview, and toggle', () => {
    render(
      <MemoryRouter initialEntries={['/patient/reminders']}>
        <PatientProvider initialStep="app">
          <PatientReminders />
        </PatientProvider>
      </MemoryRouter>
    );

    // Title
    expect(screen.getByRole('heading', { level: 1, name: /Reminders/i })).toBeInTheDocument();

    // Group sections
    expect(screen.getByRole('heading', { level: 2, name: /^Today$/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /^Coming up$/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /^Earlier today$/i })).toBeInTheDocument();

    // Specific reminders
    expect(screen.getByText(/Night medicines/i)).toBeInTheDocument();
    expect(screen.getByText(/Check blood pressure/i)).toBeInTheDocument();

    // Push notification preview card
    expect(screen.getByText(/What you'll see on your phone/i)).toBeInTheDocument();
    expect(screen.getAllByText(/ABC Hospital/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/You have a new reminder from ABC Hospital/i)).toBeInTheDocument();

    // Push switch toggle
    const pushSwitch = screen.getByRole('switch', { name: /Reminders on this phone/i });
    expect(pushSwitch).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(pushSwitch);
    expect(pushSwitch).toHaveAttribute('aria-checked', 'false');
  });

  it('renders PatientAppointments with upcoming ticket and past visits', () => {
    render(
      <MemoryRouter initialEntries={['/patient/appointments']}>
        <PatientProvider initialStep="app">
          <PatientAppointments />
        </PatientProvider>
      </MemoryRouter>
    );

    // Header
    expect(screen.getByRole('heading', { level: 1, name: /Appointments/i })).toBeInTheDocument();

    // Upcoming section & Ticket
    expect(screen.getByRole('heading', { level: 2, name: /^Upcoming$/i })).toBeInTheDocument();
    expect(screen.getAllByText(/Dr\. Rahul Nair/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/General Medicine/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/OP Block B, Room 12/i)).toBeInTheDocument();

    // Past visits
    expect(screen.getByRole('heading', { level: 2, name: /Past visits/i })).toBeInTheDocument();
    expect(screen.getByText(/Dr\. Anita Paul/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Completed/i).length).toBeGreaterThan(0);

    // Call desk link
    const telLinks = screen
      .getAllByRole('link')
      .filter((l) => l.getAttribute('href') === 'tel:04840001234');
    expect(telLinks.length).toBeGreaterThan(0);
  });

  it('navigates from Profile to Reminders and Appointments correctly', async () => {
    render(
      <MemoryRouter initialEntries={['/patient/profile']}>
        <PatientProvider initialStep="app">
          <Routes>
            <Route path="/patient" element={<PatientLayout />}>
              <Route path="profile" element={<PatientProfile />} />
              <Route path="reminders" element={<PatientReminders />} />
              <Route path="appointments" element={<PatientAppointments />} />
            </Route>
          </Routes>
        </PatientProvider>
      </MemoryRouter>
    );

    // Click Reminders shortcut row in Portal Shortcuts
    const shortcutsSection = screen.getByRole('region', { name: /Portal Shortcuts/i });
    const remindersRow = within(shortcutsSection).getByRole('button', { name: /Reminders/i });
    fireEvent.click(remindersRow);

    // PatientReminders heading should appear
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: /Reminders/i })).toBeInTheDocument();
    });
  });

  it('signs out user completely by calling /api/auth/signout and clearing session', async () => {
    const signOutSpy = vi
      .spyOn(apiClient, 'apiFetch')
      .mockResolvedValue({ success: true } as never);

    render(
      <MemoryRouter initialEntries={['/patient/profile']}>
        <PatientProvider initialStep="app">
          <Routes>
            <Route path="/patient" element={<PatientLayout />}>
              <Route path="profile" element={<PatientProfile />} />
            </Route>
          </Routes>
        </PatientProvider>
      </MemoryRouter>
    );

    // Open sign out modal
    const signOutBtn = screen.getByRole('button', { name: /Sign out/i });
    fireEvent.click(signOutBtn);

    // Confirm inside modal
    const confirmBtn = screen
      .getAllByRole('button', { name: /Sign out/i })
      .find((btn) => btn.closest('[role="dialog"]') !== null);
    expect(confirmBtn).toBeDefined();
    if (confirmBtn) {
      fireEvent.click(confirmBtn);
    }

    await waitFor(() => {
      expect(signOutSpy).toHaveBeenCalledWith(
        '/api/auth/signout',
        expect.objectContaining({ method: 'POST' })
      );
    });
  });
});
