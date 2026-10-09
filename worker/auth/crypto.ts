/**
 * CareOne WebCrypto Cryptographic Helpers
 * Optimized for Cloudflare Workers runtime CPU constraints (< 10ms CPU)
 */

export const PBKDF2_DEFAULT_ITERATIONS = 10000;

/**
 * Constant-time comparison to prevent timing attacks.
 */
export function timingSafeEqual(a: string | Uint8Array, b: string | Uint8Array): boolean {
  const bufA = typeof a === 'string' ? new TextEncoder().encode(a) : a;
  const bufB = typeof b === 'string' ? new TextEncoder().encode(b) : b;

  if (bufA.length !== bufB.length) {
    return false;
  }

  let mismatch = 0;
  for (let i = 0; i < bufA.length; i++) {
    mismatch |= (bufA[i] ?? 0) ^ (bufB[i] ?? 0);
  }

  return mismatch === 0;
}

/**
 * Computes a SHA-256 hex digest for a string (used for tokens and OTP hashing).
 */
export async function sha256Hex(data: string): Promise<string> {
  const encoded = new TextEncoder().encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoded);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Generates cryptographically secure random hex string.
 */
export function generateRandomToken(bytes = 32): string {
  const array = new Uint8Array(bytes);
  crypto.getRandomValues(array);
  return Array.from(array)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Derives a PBKDF2-SHA256 password hash.
 * 10,000 iterations executes in ~1.5 - 2.5 ms, well within the 10 ms CPU budget.
 */
export async function hashPassword(
  password: string,
  salt: string,
  iterations: number = PBKDF2_DEFAULT_ITERATIONS
): Promise<string> {
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: new TextEncoder().encode(salt),
      iterations,
      hash: 'SHA-256',
    },
    passwordKey,
    256 // 32 bytes = 256 bits
  );

  const hashArray = Array.from(new Uint8Array(derivedBits));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Verifies a password against a stored hash using constant-time comparison.
 */
export async function verifyPassword(
  password: string,
  storedHash: string,
  salt: string,
  iterations: number = PBKDF2_DEFAULT_ITERATIONS
): Promise<boolean> {
  const computedHash = await hashPassword(password, salt, iterations);
  return timingSafeEqual(computedHash, storedHash);
}
