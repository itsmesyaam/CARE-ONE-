import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { PatientSetup } from '../../src/features/patient/PatientSetup';
import { PatientProvider } from '../../src/features/patient/PatientContext';

// Mock simplewebauthn/browser
vi.mock('@simplewebauthn/browser', () => ({
  browserSupportsWebAuthn: vi.fn(() => true),
  startRegistration: vi.fn(async () => ({
    id: 'mock-cred-id',
    rawId: 'mock-raw-id',
    response: {
      clientDataJSON: 'mock-client-data',
      attestationObject: 'mock-attestation',
    },
    type: 'public-key',
  })),
}));

describe('Task 2: Staff Setup Page (/setup?token=...) with Passkey and TOTP Enrolment', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('detects staff setup token, displays staff information, and transitions to TOTP enrolment after passkey registration', async () => {
    const mockToken = 'mock-valid-staff-token-12345';

    // Mock fetch for registration options, verify, and MFA verify
    global.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString();

      if (url.includes('/api/auth/passkey/register/options')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            options: {
              challenge: 'mock-challenge',
              rp: { name: 'CareOne', id: 'localhost' },
              user: { id: 'mock-user-id', name: 'admin@example.com', displayName: 'Anand Verma' },
              pubKeyCredParams: [{ alg: -7, type: 'public-key' }],
            },
            user_id: 'b0000000-0000-0000-0000-000000000001',
            purpose: 'staff_setup',
            displayName: 'Anand Verma',
            email: 'admin@example.com',
            role: 'admin',
          }),
        } as Response;
      }

      if (url.includes('/api/auth/passkey/register/verify')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            ok: true,
            passkey_id: 'pk_mock_123',
            require_totp: true,
            totp_uri: 'otpauth://totp/CareOne:admin%40example.com?secret=JBSWY3DPEHPK3PXP&issuer=CareOne',
            totp_secret: 'JBSWY3DPEHPK3PXP',
            email: 'admin@example.com',
            role: 'admin',
          }),
        } as Response;
      }

      if (url.includes('/api/auth/mfa/verify')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            ok: true,
            token: 'mock-jwt-aal2-token',
            aal: 'aal2',
            user: { id: 'b0000000-0000-0000-0000-000000000001', email: 'admin@example.com', role: 'admin' },
          }),
        } as Response;
      }

      return {
        ok: false,
        status: 404,
        json: async () => ({ error: 'Not found' }),
      } as Response;
    }) as unknown as typeof fetch;

    render(
      <MemoryRouter initialEntries={[`/setup?token=${mockToken}`]}>
        <PatientProvider initialStep="welcome">
          <Routes>
            <Route path="/setup" element={<PatientSetup />} />
            <Route path="/admin" element={<div>Admin Dashboard Target</div>} />
          </Routes>
        </PatientProvider>
      </MemoryRouter>
    );

    // Initial passkey setup button
    const setupButton = await screen.findByRole('button', { name: /Create my passkey|Register security key/i });
    expect(setupButton).toBeInTheDocument();

    // Trigger passkey creation
    fireEvent.click(setupButton);

    // After passkey creation, it should prompt for TOTP authenticator enrolment
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Set up Authenticator App/i })).toBeInTheDocument();
    });

    // Should display secret key for manual entry
    expect(screen.getByText(/JBSWY3DPEHPK3PXP/i)).toBeInTheDocument();

    // Should display TOTP verification code input
    const inputs = screen.getAllByRole('textbox', { name: /Digit/i });
    expect(inputs).toHaveLength(6);

    // Enter digits 123456
    fireEvent.change(inputs[0]!, { target: { value: '1' } });
    fireEvent.change(inputs[1]!, { target: { value: '2' } });
    fireEvent.change(inputs[2]!, { target: { value: '3' } });
    fireEvent.change(inputs[3]!, { target: { value: '4' } });
    fireEvent.change(inputs[4]!, { target: { value: '5' } });
    fireEvent.change(inputs[5]!, { target: { value: '6' } });

    // Should elevate session and redirect to /admin
    await waitFor(() => {
      expect(screen.getByText('Admin Dashboard Target')).toBeInTheDocument();
    });
  });

  it('enforces DPDP consent barrier for patient setup before accessing health records', async () => {
    const mockToken = 'mock-valid-patient-token-67890';

    global.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString();

      if (url.includes('/api/auth/passkey/register/options')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            options: {
              challenge: 'mock-patient-challenge',
              rp: { name: 'CareOne', id: 'localhost' },
              user: { id: 'mock-patient-id', name: 'arun@example.com', displayName: 'Arun Kumar' },
              pubKeyCredParams: [{ alg: -7, type: 'public-key' }],
            },
            user_id: 'e0000000-0000-0000-0000-000000000001',
            purpose: 'patient_setup',
            displayName: 'Arun Kumar',
          }),
        } as Response;
      }

      if (url.includes('/api/auth/passkey/register/verify')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            ok: true,
            passkey_id: 'pk_mock_patient_456',
            require_totp: false,
            role: 'patient',
          }),
        } as Response;
      }

      return {
        ok: false,
        status: 404,
        json: async () => ({ error: 'Not found' }),
      } as Response;
    }) as unknown as typeof fetch;

    render(
      <MemoryRouter initialEntries={[`/setup?token=${mockToken}`]}>
        <PatientProvider initialStep="welcome">
          <Routes>
            <Route path="/setup" element={<PatientSetup />} />
            <Route path="/patient" element={<div>Patient Dashboard Target</div>} />
          </Routes>
        </PatientProvider>
      </MemoryRouter>
    );

    // Initial passkey setup button
    const setupButton = await screen.findByRole('button', { name: /Create my passkey/i });
    expect(setupButton).toBeInTheDocument();

    // Trigger passkey registration
    fireEvent.click(setupButton);

    // Must show DPDP Consent Screen barrier
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Digital Health Records Consent/i })).toBeInTheDocument();
    });

    // Patient Dashboard Target must NOT be visible yet
    expect(screen.queryByText('Patient Dashboard Target')).not.toBeInTheDocument();

    // Confirm consent
    const consentButton = screen.getByRole('button', { name: /I Agree & View My Records/i });
    fireEvent.click(consentButton);

    // Now navigates to /patient
    await waitFor(() => {
      expect(screen.getByText('Patient Dashboard Target')).toBeInTheDocument();
    });
  });
});
