import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { App } from './App';

describe('Hospital Care Platform Root App', () => {
  it('renders application root container and welcome screen when healthy', () => {
    render(<App />);
    expect(screen.getByRole('main')).toBeDefined();
  });

  it('renders Service temporarily unavailable screen when /api/health fails', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementationOnce(() =>
      Promise.resolve(new Response(null, { status: 503 }))
    );

    render(<App />);

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: /Service temporarily unavailable/i })
      ).toBeInTheDocument();
    });

    expect(
      screen.getByText(/We are experiencing a temporary disruption. Please check back shortly./i)
    ).toBeInTheDocument();

    expect(screen.getByRole('button', { name: /Reload Application/i })).toBeInTheDocument();
    fetchSpy.mockRestore();
  });
});
