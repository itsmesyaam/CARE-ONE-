// Runtime version check and self‑update for the PWA
// This file is imported once at app start (see src/main.tsx).
// It periodically fetches /version.json (no‑store) and compares the
// embedded __APP_COMMIT__ (injected by Vite) with the live commit.
// If they differ, the Service Worker is unregistered, all caches are
// cleared, and the page reloads once (guarded by sessionStorage).

async function clearCachesAndReload() {
  if (typeof window === 'undefined') return;
  if (sessionStorage.getItem('sw_updated')) {
    return;
  }
  sessionStorage.setItem('sw_updated', '1');

  try {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        await registration.unregister();
      }
    }
  } catch (err) {
    console.warn('Failed to unregister service worker:', err);
  }

  try {
    if (typeof caches !== 'undefined') {
      const keys = await caches.keys();
      await Promise.all(keys.map(k => caches.delete(k)));
    }
  } catch (err) {
    console.warn('Failed to clear caches:', err);
  }

  window.location.reload();
}

async function checkVersion() {
  try {
    const resp = await fetch('/version.json', { cache: 'no-store' });
    if (!resp.ok) return;
    const data = (await resp.json()) as { commit?: string; version?: string };
    if (data && data.commit) {
      if (typeof __APP_COMMIT__ !== 'undefined' && __APP_COMMIT__ !== 'unknown') {
        if (data.commit !== __APP_COMMIT__) {
          await clearCachesAndReload();
          return;
        }
      }
      // If version matches, reset update guard for future updates
      sessionStorage.removeItem('sw_updated');
    }
  } catch (e) {
    console.warn('Version check failed:', e);
  }
}

// Initial check on load
if (typeof window !== 'undefined') {
  checkVersion();
  // Repeat check every 5 minutes
  setInterval(checkVersion, 5 * 60 * 1000);
}
