import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import i18n from '../../src/lib/i18n';
import { PatientProvider } from '../../src/features/patient/PatientContext';
import { PatientProfile } from '../../src/features/patient/PatientProfile';
import { PatientLayout } from '../../src/features/patient/PatientLayout';

describe('Patient Profile Screen (Screen 5)', () => {
  beforeEach(async () => {
    localStorage.clear();
    await i18n.changeLanguage('en');
    vi.clearAllMocks();
  });

  it('renders patient ID card with Kasavu styling, name, MRN, and contact info', () => {
    render(
      <MemoryRouter initialEntries={['/patient/profile']}>
        <PatientProvider initialStep="app">
          <PatientProfile />
        </PatientProvider>
      </MemoryRouter>
    );

    // Patient ID card elements
    expect(screen.getAllByText('Anjali Menon').length).toBeGreaterThan(0);
    expect(screen.getByText('ABC-0012-7781')).toBeInTheDocument();
    expect(screen.getByText(/Born 14 Mar 1984|14 Mar 1984/i)).toBeInTheDocument();
    expect(screen.getByText('+91 98••••••10')).toBeInTheDocument();
    expect(screen.getByText('an•••@example.com')).toBeInTheDocument();
  });

  it('renders family members list and switches active profile to Aarav', async () => {
    render(
      <MemoryRouter initialEntries={['/patient/profile']}>
        <PatientProvider initialStep="app">
          <PatientProfile />
        </PatientProvider>
      </MemoryRouter>
    );

    expect(screen.getByText('Aarav Menon')).toBeInTheDocument();

    // Switch to Aarav
    const aaravBtn = screen.getByRole('button', { name: /Aarav Menon/i });
    fireEvent.click(aaravBtn);

    // Profile card should now show Aarav Menon with kid guardian tag
    expect(screen.getAllByText('Aarav Menon').length).toBeGreaterThan(0);
    expect(screen.getByText('ABC-0019-4402')).toBeInTheDocument();
    expect(screen.getAllByText(/Anjali Menon/i).length).toBeGreaterThan(0);
  });

  it('allows switching language between English and Malayalam', () => {
    render(
      <MemoryRouter initialEntries={['/patient/profile']}>
        <PatientProvider initialStep="app">
          <PatientProfile />
        </PatientProvider>
      </MemoryRouter>
    );

    const mlButton = screen.getByRole('button', { name: /മലയാളം/i });
    fireEvent.click(mlButton);

    // Malayalam profile title or labels should appear
    expect(screen.getByText('പ്രൊഫൈൽ')).toBeInTheDocument();
  });

  it('toggles notification switches for push and email reminders', () => {
    render(
      <MemoryRouter initialEntries={['/patient/profile']}>
        <PatientProvider initialStep="app">
          <PatientProfile />
        </PatientProvider>
      </MemoryRouter>
    );

    const switches = screen.getAllByRole('switch');
    expect(switches.length).toBeGreaterThanOrEqual(2);

    // Toggle push
    const pushSwitch = switches[0]!;
    expect(pushSwitch).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(pushSwitch);
    expect(pushSwitch).toHaveAttribute('aria-checked', 'false');

    // Toggle email
    const emailSwitch = switches[1]!;
    expect(emailSwitch).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(emailSwitch);
    expect(emailSwitch).toHaveAttribute('aria-checked', 'false');
  });

  it('renders hospital help links for front desk, casualty, and grievance', () => {
    render(
      <MemoryRouter initialEntries={['/patient/profile']}>
        <PatientProvider initialStep="app">
          <PatientProfile />
        </PatientProvider>
      </MemoryRouter>
    );

    const casualtyLink = screen.getByRole('link', { name: /0484 000 0112/i });
    expect(casualtyLink).toHaveAttribute('href', 'tel:04840000112');

    const deskLink = screen.getByRole('link', { name: /0484 000 1234/i });
    expect(deskLink).toHaveAttribute('href', 'tel:04840001234');
  });

  it('opens sign out confirmation modal and confirms sign out', () => {
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

    // Click sign out button in Profile
    const signOutBtn = screen.getByRole('button', { name: /Sign out/i });
    fireEvent.click(signOutBtn);

    // Modal dialog should open
    expect(screen.getByRole('dialog', { name: /Sign out of this phone\?/i })).toBeInTheDocument();
    expect(screen.getByText(/This clears your records from this device/i)).toBeInTheDocument();

    // Confirm sign out inside dialog
    const confirmBtn = screen
      .getAllByRole('button', { name: /Sign out/i })
      .find((btn) => btn.closest('[role="dialog"]') !== null);
    expect(confirmBtn).toBeDefined();
    if (confirmBtn) fireEvent.click(confirmBtn);
  });
});
