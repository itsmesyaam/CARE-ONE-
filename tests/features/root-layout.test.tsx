import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { RootLayout } from '../../src/app/RootLayout';

describe('App: RootLayout', () => {
  it('renders navigation header with brand and action links', () => {
    render(
      <MemoryRouter>
        <RootLayout />
      </MemoryRouter>
    );

    expect(screen.getAllByText('CareOne Hospital Platform').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Sign In').length).toBeGreaterThan(0);
    expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
  });

  it('renders quick portal access cards for Patient and Staff', () => {
    render(
      <MemoryRouter>
        <RootLayout />
      </MemoryRouter>
    );

    expect(screen.getByText('Patient Sign-In')).toBeInTheDocument();
    expect(screen.getByText('Staff Sign-In')).toBeInTheDocument();
  });
});
