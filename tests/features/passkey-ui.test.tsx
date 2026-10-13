import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { PatientProvider } from '../../src/features/patient/PatientContext';
import { PatientSignIn } from '../../src/features/patient/PatientSignIn';
import { PatientSetup } from '../../src/features/patient/PatientSetup';
import { StaffSignIn } from '../../src/features/auth/StaffSignIn';

describe('Task 3: Client Passkeys UI Verification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('PatientSignIn renders biometric passkey button and omits all OTP digit boxes and 482 913 button', () => {
    render(
      <MemoryRouter>
        <PatientProvider initialStep="signin">
          <PatientSignIn />
        </PatientProvider>
      </MemoryRouter>
    );

    // 1. Biometric Passkey button must be present
    const passkeyBtn = screen.getByRole('button', { name: /fingerprint|face|passkey/i });
    expect(passkeyBtn).toBeInTheDocument();

    // 2. Old OTP digit inputs and hardcoded Messages 482 913 box must be absent
    expect(screen.queryByText(/482\s*913/i)).toBeNull();
    expect(screen.queryByText(/from messages/i)).toBeNull();
    expect(screen.queryByPlaceholderText(/123456/i)).toBeNull();
    expect(screen.queryByRole('textbox', { name: /digit/i })).toBeNull();
  });

  it('PatientSetup renders onboarding screen with bilingual instructions and passkey registration button', () => {
    render(
      <MemoryRouter initialEntries={['/setup?token=test-setup-token-123']}>
        <Routes>
          <Route path="/setup" element={<PatientSetup />} />
        </Routes>
      </MemoryRouter>
    );

    // Explains fingerprint / biometric unlock
    expect(screen.getByText(/fingerprint|face|passkey|ബയോമെട്രിക്/i)).toBeInTheDocument();

    // Registration action button
    const registerBtn = screen.getByRole('button', { name: /register|set up|തുടങ്ങുക|രേഖപ്പെടുത്തുക/i });
    expect(registerBtn).toBeInTheDocument();
  });

  it('StaffSignIn renders passkey sign-in button', () => {
    render(
      <MemoryRouter>
        <StaffSignIn />
      </MemoryRouter>
    );

    // Must have passkey sign-in option
    const passkeyBtn = screen.getByRole('button', { name: /passkey|fingerprint|security key/i });
    expect(passkeyBtn).toBeInTheDocument();
  });
});
