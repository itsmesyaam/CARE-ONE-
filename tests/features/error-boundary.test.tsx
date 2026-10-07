import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { ErrorBoundary } from '../../src/components/ErrorBoundary';

function BrokenComponent(): React.JSX.Element {
  throw new Error('Test crash');
}

describe('Components: ErrorBoundary', () => {
  it('renders children when no error occurs', () => {
    render(
      <ErrorBoundary>
        <div>All is well</div>
      </ErrorBoundary>
    );
    expect(screen.getByText('All is well')).toBeInTheDocument();
  });

  it('catches render errors and renders fallback UI with reload button', () => {
    const originalError = console.error;
    console.error = () => {};

    render(
      <ErrorBoundary>
        <BrokenComponent />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Reload Application/i })).toBeInTheDocument();

    console.error = originalError;
  });
});
