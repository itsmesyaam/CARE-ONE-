import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PatientProvider } from '../../src/features/patient/PatientContext';
import { PatientSignIn } from '../../src/features/patient/PatientSignIn';
import { StaffSignIn } from '../../src/features/auth/StaffSignIn';
import { ForcePasswordChangeModal } from '../../src/components/auth/ForcePasswordChangeModal';
import { ChangePasswordCard } from '../../src/components/auth/ChangePasswordCard';
import { storeBrowserPasswordCredential } from '../../src/lib/auth-credentials';

describe('Fix 2: Browser Password Save & Autofill Semantic Forms', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('PatientSignIn renders semantic form with required autofill attributes', () => {
    render(
      <MemoryRouter>
        <PatientProvider initialStep="welcome">
          <PatientSignIn />
        </PatientProvider>
      </MemoryRouter>
    );

    const form = document.querySelector('form');
    expect(form).toBeInTheDocument();
    expect(form).toHaveAttribute('method', 'post');
    expect(form).toHaveAttribute('action', '#');

    // Label for username
    const usernameLabel = screen.getByLabelText(/Hospital number/i);
    expect(usernameLabel).toBeInTheDocument();

    // Username input attributes
    const usernameInput = screen.getByRole('textbox', { name: /Hospital number/i });
    expect(usernameInput).toHaveAttribute('id', 'username');
    expect(usernameInput).toHaveAttribute('name', 'username');
    expect(usernameInput).toHaveAttribute('autocomplete', 'username');
    expect(usernameInput).toHaveAttribute('autocapitalize', 'none');
    expect(usernameInput).toHaveAttribute('spellcheck', 'false');

    // Password input attributes
    const passwordInput = screen.getByLabelText(/^Password$/i);
    expect(passwordInput).toHaveAttribute('id', 'password');
    expect(passwordInput).toHaveAttribute('name', 'password');
    expect(passwordInput).toHaveAttribute('type', 'password');
    expect(passwordInput).toHaveAttribute('autocomplete', 'current-password');

    // Submit button inside form
    const submitBtn = form?.querySelector('button[type="submit"]');
    expect(submitBtn).toBeInTheDocument();

    // No autocomplete="off" anywhere on form or inputs
    expect(form?.getAttribute('autocomplete')).not.toBe('off');
    expect(usernameInput.getAttribute('autocomplete')).not.toBe('off');
    expect(passwordInput.getAttribute('autocomplete')).not.toBe('off');
  });

  it('StaffSignIn renders semantic form with email autofill attributes', () => {
    render(
      <MemoryRouter>
        <StaffSignIn />
      </MemoryRouter>
    );

    const form = document.querySelector('form');
    expect(form).toBeInTheDocument();
    expect(form).toHaveAttribute('method', 'post');
    expect(form).toHaveAttribute('action', '#');

    // Username / Email input attributes
    const emailInput = screen.getByLabelText(/Email/i);
    expect(emailInput).toHaveAttribute('id', 'username');
    expect(emailInput).toHaveAttribute('name', 'username');
    expect(emailInput).toHaveAttribute('type', 'email');
    expect(emailInput).toHaveAttribute('autocomplete', 'username');
    expect(emailInput).toHaveAttribute('autocapitalize', 'none');
    expect(emailInput).toHaveAttribute('spellcheck', 'false');

    // Password input attributes
    const passwordInput = screen.getByLabelText(/^Password$/i);
    expect(passwordInput).toHaveAttribute('id', 'password');
    expect(passwordInput).toHaveAttribute('name', 'password');
    expect(passwordInput).toHaveAttribute('type', 'password');
    expect(passwordInput).toHaveAttribute('autocomplete', 'current-password');

    // Submit button inside form
    const submitBtn = form?.querySelector('button[type="submit"]');
    expect(submitBtn).toBeInTheDocument();

    // No autocomplete="off" anywhere
    expect(form?.getAttribute('autocomplete')).not.toBe('off');
    expect(emailInput.getAttribute('autocomplete')).not.toBe('off');
    expect(passwordInput.getAttribute('autocomplete')).not.toBe('off');
  });

  it('ForcePasswordChangeModal includes hidden username and new-password autocomplete fields', () => {
    render(
      <ForcePasswordChangeModal
        isOpen={true}
        username="dr.rahul@example.com"
        onSuccess={vi.fn()}
      />
    );

    const usernameHidden = document.querySelector('input[autocomplete="username"]');
    expect(usernameHidden).toBeInTheDocument();
    expect(usernameHidden).toHaveValue('dr.rahul@example.com');

    const currentPw = screen.getByLabelText(/Current.*password|Temporary password/i);
    expect(currentPw).toHaveAttribute('autocomplete', 'current-password');

    const newPw = screen.getByLabelText(/^New password$/i);
    expect(newPw).toHaveAttribute('autocomplete', 'new-password');

    const confirmPw = screen.getByLabelText(/Confirm new password/i);
    expect(confirmPw).toHaveAttribute('autocomplete', 'new-password');
  });

  it('ChangePasswordCard includes hidden username and new-password autocomplete fields', () => {
    render(
      <ChangePasswordCard
        username="dr.rahul@example.com"
        onSuccess={vi.fn()}
      />
    );

    const usernameHidden = document.querySelector('input[autocomplete="username"]');
    expect(usernameHidden).toBeInTheDocument();
    expect(usernameHidden).toHaveValue('dr.rahul@example.com');

    const currentPw = screen.getByLabelText(/Current password/i);
    expect(currentPw).toHaveAttribute('autocomplete', 'current-password');

    const newPw = screen.getByLabelText(/^New password/i);
    expect(newPw).toHaveAttribute('autocomplete', 'new-password');

    const confirmPw = screen.getByLabelText(/Confirm new password/i);
    expect(confirmPw).toHaveAttribute('autocomplete', 'new-password');
  });

  it('storeBrowserPasswordCredential stores PasswordCredential when supported', async () => {
    const storeSpy = vi.fn().mockResolvedValue(undefined);
    // Mock PasswordCredential on window
    class MockPasswordCredential {
      id: string;
      password: string;
      name: string;
      constructor(data: { id: string; password: string; name: string }) {
        this.id = data.id;
        this.password = data.password;
        this.name = data.name;
      }
    }
    // @ts-expect-error Mocking window property
    window.PasswordCredential = MockPasswordCredential;
    Object.defineProperty(navigator, 'credentials', {
      value: { store: storeSpy },
      configurable: true,
      writable: true,
    });

    await storeBrowserPasswordCredential('dr.rahul@example.com', 'TestPass123!');

    expect(storeSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'dr.rahul@example.com',
        password: 'TestPass123!',
        name: 'dr.rahul@example.com',
      })
    );
  });
});
