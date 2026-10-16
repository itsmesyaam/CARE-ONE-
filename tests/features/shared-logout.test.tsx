import { describe, it, expect, vi, beforeEach } from 'vitest';
import { logout, setupAuthInterceptor, SIGNED_OUT_NOTICE_KEY } from '../../src/lib/logout';
import { queryClient } from '../../src/lib/queryClient';
import { router } from '../../src/app/routes';

describe('Shared Logout and 401 Interceptor', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it('logout() posts to /api/auth/logout, purges query cache, preserves careone_lang, and navigates to /', async () => {
    localStorage.setItem('careone_lang', 'ml');
    localStorage.setItem('other_key', 'some_secret');
    sessionStorage.setItem('temp_data', 'temp_value');

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Set-Cookie': 'careone_session=; Path=/; Max-Age=0' },
      })
    );
    const clearQuerySpy = vi.spyOn(queryClient, 'clear');
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue();

    await logout();

    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/auth/logout',
      expect.objectContaining({ method: 'POST' })
    );
    expect(clearQuerySpy).toHaveBeenCalled();
    expect(localStorage.getItem('careone_lang')).toBe('ml');
    expect(localStorage.getItem('other_key')).toBeNull();
    expect(sessionStorage.getItem('temp_data')).toBeNull();
    expect(navigateSpy).toHaveBeenCalledWith('/', { replace: true });
  });

  it('logout() gracefully proceeds to / and clears state even when fetch fails (offline)', async () => {
    localStorage.setItem('careone_lang', 'en');
    localStorage.setItem('stale_key', 'val');
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network error (offline)'));
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue();

    await logout();

    expect(localStorage.getItem('careone_lang')).toBe('en');
    expect(localStorage.getItem('stale_key')).toBeNull();
    expect(navigateSpy).toHaveBeenCalledWith('/', { replace: true });
  });

  it('setupAuthInterceptor does NOT logout on 401 if user had no active session', async () => {
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue();
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 })
    );
    setupAuthInterceptor(true);

    // No session in sessionStorage
    const res = await fetch('/api/patient/profiles');
    expect(res.status).toBe(401);

    await new Promise((r) => setTimeout(r, 10));
    expect(sessionStorage.getItem(SIGNED_OUT_NOTICE_KEY)).toBeNull();
    expect(navigateSpy).not.toHaveBeenCalled();
  });

  it('setupAuthInterceptor does NOT redirect away from login or public pages on 401', async () => {
    sessionStorage.setItem('careone_has_session', 'true');
    // Set window.location.pathname to /patient/login
    Object.defineProperty(window, 'location', {
      value: { pathname: '/patient/login', replace: vi.fn() },
      writable: true,
      configurable: true,
    });

    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue();
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 })
    );
    setupAuthInterceptor(true);

    const res = await fetch('/api/patient/profiles');
    expect(res.status).toBe(401);

    await new Promise((r) => setTimeout(r, 10));
    expect(sessionStorage.getItem(SIGNED_OUT_NOTICE_KEY)).toBeNull();
    expect(navigateSpy).not.toHaveBeenCalled();
  });

  it('setupAuthInterceptor redirects to / and sets notice on 401 when user had active session on protected page', async () => {
    sessionStorage.setItem('careone_has_session', 'true');
    Object.defineProperty(window, 'location', {
      value: { pathname: '/doctor/today', replace: vi.fn() },
      writable: true,
      configurable: true,
    });

    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue();
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url.includes('/api/auth/logout')) {
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }
      if (url.includes('/api/doctor/today')) {
        return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 });
      }
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    });
    setupAuthInterceptor(true);

    const res = await fetch('/api/doctor/today');
    expect(res.status).toBe(401);

    await new Promise((r) => setTimeout(r, 10));

    expect(sessionStorage.getItem(SIGNED_OUT_NOTICE_KEY)).toBeTruthy();
    expect(navigateSpy).toHaveBeenCalledWith('/', { replace: true });
  });

  it('setupAuthInterceptor does NOT logout on 401 from /api/auth/login', async () => {
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue();
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: 'invalid_credentials' }), { status: 401 })
    );
    setupAuthInterceptor(true);

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: 'test', password: 'bad' }),
    });
    expect(res.status).toBe(401);

    expect(sessionStorage.getItem(SIGNED_OUT_NOTICE_KEY)).toBeNull();
    expect(navigateSpy).not.toHaveBeenCalled();
  });
});
