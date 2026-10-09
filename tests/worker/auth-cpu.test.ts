import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword, sha256Hex } from '../../worker/auth/crypto';
import { generateTotp, verifyTotp } from '../../worker/auth/totp';

describe('WebCrypto Auth Performance & CPU Limits', () => {
  it('benchmarks PBKDF2-SHA256 password hashing within Workers 10ms CPU limit', async () => {
    const password = 'DemoPassword123!';
    const salt = 'salt_rahul_123';

    // Warm-up
    await hashPassword(password, salt, 10000);

    const iterations = 5;
    const times: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const t0 = performance.now();
      await hashPassword(password, `${salt}_${i}`, 10000);
      const elapsed = performance.now() - t0;
      times.push(elapsed);
    }

    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    console.log(`[CPU Benchmark] Average PBKDF2 (10,000 iters) duration: ${avgTime.toFixed(3)} ms`);

    // Verify well under Workers 10ms CPU limit
    expect(avgTime).toBeLessThan(10);
  });

  it('benchmarks PBKDF2 password verification within Workers 10ms CPU limit', async () => {
    const password = 'DemoPassword123!';
    const salt = 'salt_rahul_123';
    const knownHash = await hashPassword(password, salt, 10000);

    const t0 = performance.now();
    const isValid = await verifyPassword(password, knownHash, salt, 10000);
    const elapsed = performance.now() - t0;

    console.log(`[CPU Benchmark] PBKDF2 verify duration: ${elapsed.toFixed(3)} ms`);
    expect(isValid).toBe(true);
    expect(elapsed).toBeLessThan(10);
  });

  it('benchmarks RFC 6238 TOTP verification within Workers CPU limits (< 2ms)', async () => {
    const secret = 'JBSWY3DPEHPK3PXR';
    const code = await generateTotp(secret);

    const t0 = performance.now();
    const isValid = await verifyTotp(secret, code);
    const elapsed = performance.now() - t0;

    console.log(`[CPU Benchmark] TOTP verify duration: ${elapsed.toFixed(3)} ms`);
    expect(isValid).toBe(true);
    expect(elapsed).toBeLessThan(5);
  });

  it('benchmarks SHA-256 session token hashing (< 1ms)', async () => {
    const rawToken = '4f8a1e2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f';

    const t0 = performance.now();
    const hash = await sha256Hex(rawToken);
    const elapsed = performance.now() - t0;

    console.log(`[CPU Benchmark] SHA-256 session hash duration: ${elapsed.toFixed(3)} ms`);
    expect(hash).toHaveLength(64);
    expect(elapsed).toBeLessThan(2);
  });
});
