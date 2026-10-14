/**
 * Cryptographic Password Management using native WebCrypto API
 * Free plan compliant: uses PBKDF2-SHA-256 with constant-time verification.
 * Zero external libraries (no bcrypt/argon2/scrypt).
 */

export const DEFAULT_PBKDF2_ITERATIONS = 50000;

function bytesToHex(bytes: Uint8Array): string {
  let hex = '';
  for (let i = 0; i < bytes.length; i++) {
    hex += (bytes[i] ?? 0).toString(16).padStart(2, '0');
  }
  return hex;
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

/**
 * Constant-time byte comparison to prevent timing side-channel attacks
 */
export function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
  }
  return diff === 0;
}

/**
 * Derives a PBKDF2-SHA-256 hash using native WebCrypto
 */
async function derivePbkdf2Hash(
  password: string,
  saltBytes: Uint8Array,
  iterations: number
): Promise<Uint8Array> {
  const enc = new TextEncoder();
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBytes as unknown as BufferSource,
      iterations,
      hash: 'SHA-256',
    },
    passwordKey,
    256 // 32 bytes
  );

  return new Uint8Array(derivedBits);
}

/**
 * Hashes a plaintext password using a random 16-byte salt and WebCrypto PBKDF2
 */
export async function hashPassword(
  password: string,
  iterations = DEFAULT_PBKDF2_ITERATIONS
): Promise<{ hash: string; salt: string; iterations: number }> {
  const saltBytes = new Uint8Array(16);
  crypto.getRandomValues(saltBytes);

  const hashBytes = await derivePbkdf2Hash(password, saltBytes, iterations);

  return {
    hash: bytesToHex(hashBytes),
    salt: bytesToHex(saltBytes),
    iterations,
  };
}

/**
 * Verifies a password against stored PBKDF2 hash, salt, and iterations in constant time
 */
export async function verifyPassword(
  password: string,
  storedHashHex: string,
  storedSaltHex: string,
  iterations: number
): Promise<boolean> {
  const saltBytes = hexToBytes(storedSaltHex);
  const expectedHashBytes = hexToBytes(storedHashHex);

  const computedHashBytes = await derivePbkdf2Hash(password, saltBytes, iterations);

  return constantTimeEqual(computedHashBytes, expectedHashBytes);
}

// 100 most common passwords to block
export const TOP_100_COMMON_PASSWORDS: ReadonlySet<string> = new Set([
  '123456',
  'password',
  '12345678',
  'qwerty',
  '123456789',
  '12345',
  '1234',
  '111111',
  '1234567',
  'dragon',
  '123123',
  'baseball',
  'football',
  'monkey',
  'letmein',
  'shadow',
  'master',
  '666666',
  'sunshine',
  '123321',
  '654321',
  'welcome',
  'princess',
  'solo',
  'trustno1',
  'iloveyou',
  'chelsea',
  'secret',
  'admin',
  'charlie',
  'donald',
  'mustang',
  'superman',
  'starwars',
  'killer',
  'computer',
  'hospital',
  'michelle',
  'jessica',
  'pepper',
  'ashley',
  'daniel',
  'robert',
  'michael',
  'thomas',
  'spiderman',
  'harley',
  'bailey',
  'system',
  'pass123',
  'admin123',
  'careone',
  'careone123',
  'doctor',
  'doctor123',
  'qwerty123',
  'password1',
  'password123',
  'welcome1',
  'welcome123',
  'abc123',
  'testing',
  'guest',
  'operator',
  'default',
  'login',
  'security',
  'freedom',
  'passcode',
  'access',
  'change',
  'change123',
  'changeme',
  'user',
  'user123',
  'hospital123',
  'abc@123',
  'demo',
  'demo123',
  'temp123',
  'temporary',
  'sample',
  'sample123',
  'service',
  'kerala',
  'kerala123',
  'godbless',
  'jesus',
  'orange',
  'cookie',
  'butter',
  'flower',
  'summer',
  'winter',
  'spring',
  'autumn',
  'hunter',
  'matrix',
  'corvette',
  'liverpool',
  'arsenal',
  'chelsea1',
]);

export interface PasswordValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validates password rules:
 * - Minimum 8 characters
 * - Not equal to username (case-insensitive)
 * - Block top 100 most common passwords
 */
export function validatePasswordRules(
  password: string,
  username?: string
): PasswordValidationResult {
  const errors: string[] = [];

  if (!password || password.length < 8) {
    errors.push('Password must be at least 8 characters');
  }

  if (username && password.toLowerCase() === username.trim().toLowerCase()) {
    errors.push('Password cannot be the same as your username');
  }

  if (TOP_100_COMMON_PASSWORDS.has(password.toLowerCase())) {
    errors.push('This password is too common or easily guessed');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
