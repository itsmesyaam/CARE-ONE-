/**
 * CareOne Frontend API Client
 * Wraps native fetch for /api/* endpoints with cookie sessions, JSON serialization, and error handling.
 */

export async function apiFetch<T = unknown>(url: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (!response.ok) {
    let errorMsg = `API request failed with status ${response.status}`;
    try {
      const errJson = (await response.json()) as { error?: string };
      if (errJson && errJson.error) {
        errorMsg = errJson.error;
      }
    } catch {
      // ignore parsing failure
    }
    throw new Error(errorMsg);
  }

  return response.json() as Promise<T>;
}
