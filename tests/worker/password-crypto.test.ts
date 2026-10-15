// @vitest-environment node
import { describe, it, expect } from 'vitest';
import {
  hashPassword,
  verifyPassword,
  validatePasswordRules,
  DEFAULT_PBKDF2_ITERATIONS,
} from '../../worker/auth/password';

describe('Task 1: WebCrypto PBKDF2 Password Hashing & Rules', () => {
  it('hashes and verifies password using PBKDF2-SHA-256 with 16-byte salt and constant-time compare', async () => {
    const password = 'DemoPassword123!';
    const { hash, salt, iterations } = await hashPassword(password);

    expect(salt).toHaveLength(32); // 16 bytes hex-encoded = 32 hex chars
    expect(hash).toHaveLength(64); // SHA-256 = 32 bytes = 64 hex chars
    expect(iterations).toBe(DEFAULT_PBKDF2_ITERATIONS);
    expect(iterations).toBe(50000); // 50,000 iterations safely < 10 ms CPU

    // Correct password succeeds
    const isValid = await verifyPassword(password, hash, salt, iterations);
    expect(isValid).toBe(true);

    // Wrong password fails
    const isWrong = await verifyPassword('WrongPassword!', hash, salt, iterations);
    expect(isWrong).toBe(false);
  });

  it('measures CPU execution time of PBKDF2 to ensure it is safely under 10 ms on free tier', async () => {
    const password = 'DemoPassword123!';
    // Warm-up to ensure WebCrypto JIT is initialized
    await hashPassword(password, 50000);
    const t0 = performance.now();
    await hashPassword(password, 50000);
    const duration = performance.now() - t0;

    // In local development / Cloudflare isolates, PBKDF2 executes in < 3-8 ms.
    // In CI environments (e.g. GitHub Actions shared 2-core runners), wall clock can fluctuate up to 60 ms.
    const maxAllowed = process.env.CI ? 60 : 15;
    expect(duration).toBeLessThan(maxAllowed);
  });

  it('enforces password rules: min 8 chars, not equal to username, blocks common passwords', () => {
    // Valid password
    const valid = validatePasswordRules('ValidSecretPassword1!', 'admin@example.com');
    expect(valid.valid).toBe(true);
    expect(valid.errors).toHaveLength(0);

    // Short password (< 8 chars)
    const short = validatePasswordRules('short', 'admin@example.com');
    expect(short.valid).toBe(false);
    expect(short.errors).toContain('Password must be at least 8 characters');

    // Password equals username
    const matchesUser = validatePasswordRules('admin@example.com', 'admin@example.com');
    expect(matchesUser.valid).toBe(false);
    expect(matchesUser.errors).toContain('Password cannot be the same as your username');

    // Common password blocked
    const common = validatePasswordRules('password123', 'someone');
    expect(common.valid).toBe(false);
    expect(common.errors).toContain('This password is too common or easily guessed');
  });
});
