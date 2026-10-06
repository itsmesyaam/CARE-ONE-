import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { App } from './App';

describe('Hospital Care Platform Root App', () => {
  it('renders application root container and welcome screen', () => {
    render(<App />);
    expect(screen.getByRole('main')).toBeDefined();
  });
});
