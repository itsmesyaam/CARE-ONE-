import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SignInPage } from '../../src/features/auth/SignInPage';

describe('Auth Feature: SignInPage', () => {
  it('renders sign in screen with hospital branding and tabs', () => {
    render(
      <MemoryRouter>
        <SignInPage />
      </MemoryRouter>
    );

    expect(screen.getByText('CareOne Hospital Platform')).toBeInTheDocument();
    expect(screen.getByText('Patient Sign-In')).toBeInTheDocument();
    expect(screen.getByText('Staff Sign-In')).toBeInTheDocument();
  });

  it('allows switching between Patient and Staff tabs', () => {
    render(
      <MemoryRouter>
        <SignInPage />
      </MemoryRouter>
    );

    // Default is patient tab
    expect(screen.getByLabelText('Email Address')).toBeInTheDocument();
    expect(screen.getByText('Send Sign-in Code')).toBeInTheDocument();

    // Switch to staff tab
    fireEvent.click(screen.getByText('Staff Sign-In'));
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sign In/i })).toBeInTheDocument();
  });

  it('populates demo credentials when clicking quick demo buttons', () => {
    render(
      <MemoryRouter>
        <SignInPage />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByText('Doctor'));
    const staffEmailInput = screen.getByLabelText('Email Address') as HTMLInputElement;
    expect(staffEmailInput.value).toBe('dr.rahul@example.com');
  });

  it('renders language toggle button', () => {
    render(
      <MemoryRouter>
        <SignInPage />
      </MemoryRouter>
    );

    const langBtn = screen.getByRole('button', { name: /Language/i });
    expect(langBtn).toBeInTheDocument();
  });
});
