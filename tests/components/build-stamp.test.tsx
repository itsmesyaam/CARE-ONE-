import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BuildStamp } from '../../src/components/BuildStamp';
import pkg from '../../package.json';

describe('Components: BuildStamp', () => {
  it('renders build stamp with dynamic version from package.json and commit indicator', () => {
    render(<BuildStamp />);
    expect(screen.getByTestId('build-stamp')).toBeInTheDocument();
    expect(screen.getByText(new RegExp(`CareOne v${pkg.version.replace('.', '\\.')}`))).toBeInTheDocument();
    expect(screen.getByText(/git:/)).toBeInTheDocument();
  });
});
