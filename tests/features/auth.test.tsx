import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SignInPage } from '../../src/features/auth/SignInPage';

describe('Auth Feature: SignInPage (Passkey Portal Selection)', () => {
  it('renders sign in screen with hospital branding and portal links', () => {
    render(
      <MemoryRouter>
        <SignInPage />
      </MemoryRouter>
    );

    expect(screen.getByText('CareOne')).toBeInTheDocument();
    expect(screen.getByText('ABC Hospital Kerala')).toBeInTheDocument();
    expect(screen.getByText(/Patient Sign-In/i)).toBeInTheDocument();
    expect(screen.getByText(/Staff Sign-In/i)).toBeInTheDocument();
  });

  it('provides dedicated links to patient biometric login and staff security key login', () => {
    render(
      <MemoryRouter>
        <SignInPage />
      </MemoryRouter>
    );

    const patientLink = screen.getByRole('link', { name: /Patient Sign-In/i });
    expect(patientLink).toHaveAttribute('href', '/patient/login');

    const staffLink = screen.getByRole('link', { name: /Staff Sign-In/i });
    expect(staffLink).toHaveAttribute('href', '/staff/signin');

    // Strict requirement: zero password field, zero OTP email code inputs
    expect(screen.queryByLabelText(/Password/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Email/i)).not.toBeInTheDocument();
  });

  it('renders language toggle button', () => {
    render(
      <MemoryRouter>
        <SignInPage />
      </MemoryRouter>
    );

    const langBtn = screen.getByRole('button', { name: /Toggle language/i });
    expect(langBtn).toBeInTheDocument();
  });
});
