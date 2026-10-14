/**
 * Browser PasswordCredential helper for Credential Management API (Level 1)
 * Enables Chrome, Edge, and Android Chrome to offer "Save password?" prompt.
 */
export async function storeBrowserPasswordCredential(username: string, password: string): Promise<void> {
  if (
    typeof window !== 'undefined' &&
    'PasswordCredential' in window &&
    navigator.credentials &&
    typeof navigator.credentials.store === 'function'
  ) {
    try {
      // @ts-expect-error PasswordCredential is supported in Credential Management API Level 1
      const cred = new window.PasswordCredential({
        id: username.trim(),
        password,
        name: username.trim(),
      });
      await navigator.credentials.store(cred);
    } catch {
      // Ignore user cancellations or browser restrictions
    }
  }
}
