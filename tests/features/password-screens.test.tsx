import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import i18n from '../../src/lib/i18n';
import { PatientProvider } from '../../src/features/patient/PatientContext';
import { PatientSignIn } from '../../src/features/patient/PatientSignIn';
import { StaffSignIn } from '../../src/features/auth/StaffSignIn';
import { ForcePasswordChangeModal } from '../../src/components/auth/ForcePasswordChangeModal';
import { ResetPasswordModal } from '../../src/components/auth/ResetPasswordModal';

describe('Task 3: Username + Password Screens & Modals', () => {
  beforeEach(async () => {
    localStorage.clear();
    await i18n.changeLanguage('en');
    vi.clearAllMocks();
  });

  it('renders Patient Sign-In screen with hospital number/phone, password, show/hide toggle, and desk help notice', () => {
    render(
      <MemoryRouter>
        <PatientProvider initialStep="welcome">
          <PatientSignIn />
        </PatientProvider>
      </MemoryRouter>
    );

    expect(screen.getByLabelText(/Hospital number or phone/i)).toBeInTheDocument();
    const passwordInput = screen.getByLabelText(/^Password$/i);
    expect(passwordInput).toBeInTheDocument();
    expect(passwordInput).toHaveAttribute('type', 'password');

    // Show/hide toggle button exists and toggles type
    const toggleBtn = screen.getByRole('button', { name: /Show password|Hide password/i });
    expect(toggleBtn).toBeInTheDocument();
    fireEvent.click(toggleBtn);
    expect(passwordInput).toHaveAttribute('type', 'text');

    expect(screen.getByRole('button', { name: /^Sign In$/i })).toBeInTheDocument();
    expect(screen.getByText(/Forgot password\? Ask the front desk\./i)).toBeInTheDocument();
  });

  it('renders Staff Sign-In screen with email, password, and show/hide toggle', () => {
    render(
      <MemoryRouter>
        <StaffSignIn />
      </MemoryRouter>
    );

    expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
    const passwordInput = screen.getByLabelText(/^Password$/i);
    expect(passwordInput).toBeInTheDocument();
    expect(passwordInput).toHaveAttribute('type', 'password');

    const toggleBtn = screen.getByRole('button', { name: /Show password|Hide password/i });
    expect(toggleBtn).toBeInTheDocument();
    fireEvent.click(toggleBtn);
    expect(passwordInput).toHaveAttribute('type', 'text');

    expect(screen.getByRole('button', { name: /^Sign In$/i })).toBeInTheDocument();
  });

  it('renders ForcePasswordChangeModal showing visible password rules and required fields', () => {
    render(
      <ForcePasswordChangeModal
        isOpen={true}
        username="admin@example.com"
        onSuccess={vi.fn()}
      />
    );

    expect(screen.getByText(/Set New Password/i)).toBeInTheDocument();
    expect(screen.getByText(/At least 8 characters/i)).toBeInTheDocument();
    expect(screen.getByText(/Cannot be your username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Current.*password|Temporary password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^New password$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Confirm new password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Change Password|Update Password/i })).toBeInTheDocument();
  });

  it('renders ResetPasswordModal displaying temporary password once with copy button', () => {
    const handleClose = vi.fn();
    render(
      <ResetPasswordModal
        isOpen={true}
        title="Patient Login Created"
        username="ABC-2026-0001"
        temporaryPassword="Temp#G58WPW7"
        onClose={handleClose}
      />
    );

    expect(screen.getByText('Patient Login Created')).toBeInTheDocument();
    expect(screen.getByText('ABC-2026-0001')).toBeInTheDocument();
    expect(screen.getByText('Temp#G58WPW7')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Copy/i })).toBeInTheDocument();
  });
});
