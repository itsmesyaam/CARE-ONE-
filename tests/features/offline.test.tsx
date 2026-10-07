import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { OfflineBanner } from '../../src/components/OfflineBanner';

describe('OfflineBanner Component', () => {
  let originalOnLine: boolean;

  beforeEach(() => {
    originalOnLine = navigator.onLine;
  });

  afterEach(() => {
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      value: originalOnLine,
    });
  });

  it('renders nothing when navigator is online', () => {
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
    const { container } = render(<OfflineBanner />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders friendly banner when offline event is dispatched', () => {
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
    render(<OfflineBanner />);

    act(() => {
      Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
      window.dispatchEvent(new Event('offline'));
    });

    const banner = screen.getByRole('alert');
    expect(banner).toBeInTheDocument();
    expect(banner).toHaveTextContent(/offline/i);
  });

  it('hides banner when online event is dispatched', () => {
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
    render(<OfflineBanner />);

    expect(screen.getByRole('alert')).toBeInTheDocument();

    act(() => {
      Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
      window.dispatchEvent(new Event('online'));
    });

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
