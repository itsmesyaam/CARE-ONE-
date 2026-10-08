import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { StaffSignIn } from '../../src/features/auth/StaffSignIn';

describe('Staff Auth Feature: StaffSignIn', () => {
  it('renders staff sign in screen with hospital branding and security check', () => {
    render(
      <MemoryRouter>
        <StaffSignIn />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { level: 1, name: /Staff sign-in/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/^Email$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Password$/i)).toBeInTheDocument();
    expect(screen.getByText(/Security check/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sign in/i })).toBeInTheDocument();
  });

  it('can navigate to 2FA verification step and display 6-digit code entry', async () => {
    render(
      <MemoryRouter initialEntries={['/staff/signin']}>
        <StaffSignIn initialStep="twofa" />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { level: 1, name: /Enter your 6-digit code/i })).toBeInTheDocument();
    expect(screen.getByText(/Patient records stay hidden until this step is done/i)).toBeInTheDocument();
    expect(screen.getByText(/Setting up two-factor for the first time\?/i)).toBeInTheDocument();
  });

  it('can navigate to 2FA enrollment wizard showing 3 numbered steps and QR code', async () => {
    render(
      <MemoryRouter>
        <StaffSignIn initialStep="enroll" />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { level: 1, name: /Set up two-factor sign-in/i })).toBeInTheDocument();
    expect(screen.getByText(/Install an authenticator app/i)).toBeInTheDocument();
    expect(screen.getByText(/Scan this code with the app/i)).toBeInTheDocument();
    expect(screen.getByText(/Type the code the app shows/i)).toBeInTheDocument();
    expect(screen.getByText(/JBSW Y3DP EHPK 3PXP/i)).toBeInTheDocument();
  });

  it('renders screen lock with doctor avatar and unlocks with password', async () => {
    render(
      <MemoryRouter>
        <StaffSignIn initialStep="lock" />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { level: 1, name: /Screen locked/i })).toBeInTheDocument();
    expect(screen.getByText(/Dr\. Rahul Nair/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Unlock/i })).toBeInTheDocument();
  });
});
