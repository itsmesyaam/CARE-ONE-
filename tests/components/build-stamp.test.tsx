import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BuildStamp } from '../../src/components/BuildStamp';

describe('Components: BuildStamp', () => {
  it('renders build stamp with version and commit indicator', () => {
    render(<BuildStamp />);
    expect(screen.getByTestId('build-stamp')).toBeInTheDocument();
    expect(screen.getByText(/CareOne v0\.1\.0/)).toBeInTheDocument();
    expect(screen.getByText(/git:/)).toBeInTheDocument();
  });
});
