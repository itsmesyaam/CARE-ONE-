import { queryClient } from './queryClient';

export const SIGNED_OUT_NOTICE_KEY = 'careone_signed_out_notice';

export interface LogoutOptions {
  expired?: boolean;
  message?: string;
}

let isLoggingOut = false;
let logoutNavigator: ((to: string, opts?: { replace?: boolean }) => Promise<unknown> | void) | null = null;

export function registerLogoutNavigator(
  nav: (to: string, opts?: { replace?: boolean }) => Promise<unknown> | void
): void {
  logoutNavigator = nav;
}

/**
 * Shared logout function:
 * 1. POST /api/auth/logout (clears server session and cookie)
 * 2. Clears TanStack Query cache (queryClient.clear())
 * 3. Clears localStorage & sessionStorage (preserving careone_lang)
 * 4. Navigates to '/' with { replace: true }
 */
export async function logout(options?: LogoutOptions): Promise<void> {
  if (isLoggingOut) return;
  isLoggingOut = true;

  try {
    if (typeof fetch === 'function') {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'same-origin',
      });
    }
  } catch {
    // Offline or network error: proceed with local cleanup
  }

  try {
    queryClient.clear();
  } catch {
    // ignore
  }

  try {
    const savedLang = localStorage.getItem('careone_lang');
    localStorage.clear();
    sessionStorage.clear();
    if (savedLang) {
      localStorage.setItem('careone_lang', savedLang);
    }
    if (options?.expired) {
      sessionStorage.setItem(SIGNED_OUT_NOTICE_KEY, 'true');
    } else if (options?.message) {
      sessionStorage.setItem(SIGNED_OUT_NOTICE_KEY, options.message);
    }
  } catch {
    // ignore
  }

  try {
    if (logoutNavigator) {
      void logoutNavigator('/', { replace: true });
    } else if (typeof window !== 'undefined' && window.location) {
      window.location.replace('/');
    }
  } catch {
    if (typeof window !== 'undefined' && window.location) {
      window.location.replace('/');
    }
  } finally {
    isLoggingOut = false;
  }
}

export const SESSION_ACTIVE_KEY = 'careone_has_session';

export function isProtectedPath(pathname: string): boolean {
  const publicPaths = [
    '/',
    '/login',
    '/signin',
    '/patient/login',
    '/patient/signin',
    '/patient/setup',
    '/staff/signin',
    '/doctor/login',
    '/change-password',
    '/setup',
  ];
  if (publicPaths.includes(pathname)) return false;
  return /^\/(patient|doctor|admin|desk|staff)/.test(pathname);
}

let isInterceptorSetup = false;

/**
 * Global 401 Interceptor:
 * Intercepts any 401 from protected /api/* endpoints and triggers logout({ expired: true })
 * ONLY IF:
 * 1. The user was signed in (we had an active session flag in this tab)
 * 2. The current route is a protected page (/patient/*, /doctor/*, /admin, etc.)
 * Never triggers on public/login pages and never bounces away from login forms.
 */
export function setupAuthInterceptor(force = false): void {
  if ((isInterceptorSetup && !force) || typeof globalThis.fetch !== 'function') return;
  isInterceptorSetup = true;

  const originalFetch = globalThis.fetch.bind(globalThis);
  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const res = await originalFetch(input, init);
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : (input as Request)?.url || '';

    const hasSession =
      typeof sessionStorage !== 'undefined' &&
      sessionStorage.getItem(SESSION_ACTIVE_KEY) === 'true';

    const currentPath =
      typeof window !== 'undefined' && window.location ? window.location.pathname : '';

    if (
      res.status === 401 &&
      url.includes('/api/') &&
      !url.includes('/api/auth/login') &&
      !url.includes('/api/auth/logout') &&
      !url.includes('/api/auth/signout')
    ) {
      if (hasSession && isProtectedPath(currentPath)) {
        void logout({ expired: true });
      }
    }

    return res;
  };
}
