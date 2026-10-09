import { describe, it, expect, beforeEach } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { createApp } from '../../worker/app';
import { generateTotp } from '../../worker/auth/totp';

import type { WorkerEnv } from '../../worker/env';

type BoundParam = string | number | null | undefined;
type QueryRow = Record<string, unknown>;

// In-memory D1 wrapper around node:sqlite DatabaseSync
function createMockD1(): { d1: D1Database; sqlite: DatabaseSync } {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec('PRAGMA foreign_keys = ON;');

  // Apply migrations
  const m1 = fs.readFileSync(path.resolve(process.cwd(), 'migrations/0001_initial_schema.sql'), 'utf8');
  sqlite.exec(m1);

  if (fs.existsSync(path.resolve(process.cwd(), 'migrations/0002_seed_demo_data.sql'))) {
    const m2 = fs.readFileSync(path.resolve(process.cwd(), 'migrations/0002_seed_demo_data.sql'), 'utf8');
    sqlite.exec(m2);
  }

  if (fs.existsSync(path.resolve(process.cwd(), 'migrations/0003_staff_auth_credentials.sql'))) {
    const m3 = fs.readFileSync(path.resolve(process.cwd(), 'migrations/0003_staff_auth_credentials.sql'), 'utf8');
    sqlite.exec(m3);
  }

  const d1 = {
    prepare(sql: string) {
      let boundParams: BoundParam[] = [];
      return {
        bind(...params: BoundParam[]) {
          boundParams = params;
          return this;
        },
        async first<T = unknown>(col?: string): Promise<T | null> {
          const stmt = sqlite.prepare(sql);
          const row = stmt.get(...boundParams) as QueryRow | undefined;
          if (!row) return null;
          return (col ? (row[col] as T) : (row as T)) ?? null;
        },
        async all<T = unknown>() {
          const stmt = sqlite.prepare(sql);
          const results = stmt.all(...boundParams) as T[];
          return { results, success: true, meta: { duration: 0 } };
        },
        async run() {
          const stmt = sqlite.prepare(sql);
          const info = stmt.run(...boundParams) as { changes?: number };
          return { success: true, meta: { changes: info.changes || 0, duration: 0 } };
        },
        async raw<T = unknown[]>() {
          const stmt = sqlite.prepare(sql);
          const rows = stmt.all(...boundParams) as QueryRow[];
          return rows.map((r: QueryRow) => Object.values(r)) as T[];
        },
      };
    },
    async batch<T = unknown>(statements: Array<{ run: () => Promise<unknown> }>) {
      const results = [];
      for (const s of statements) {
        results.push(await s.run());
      }
      return results as T[];
    },
    async exec(sql: string) {
      sqlite.exec(sql);
      return { count: 1, duration: 0 };
    },
  } as unknown as D1Database;

  return { d1, sqlite };
}

describe('Native Authentication & Session Routes', () => {
  let mockEnv: WorkerEnv;

  beforeEach(() => {
    const { d1 } = createMockD1();
    mockEnv = {
      DB: d1,
      ENVIRONMENT: 'test',
      RESEND_API_KEY: 'mock-key',
    };
  });

  it('rejects patient OTP requests that exceed rate limit (max 3 per 10m)', async () => {
    const app = createApp();

    // 3 rapid requests should succeed
    for (let i = 0; i < 3; i++) {
      const res = await app.request('http://localhost/api/auth/patient/request-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'arun@example.com' }),
      }, mockEnv);
      expect(res.status).toBe(200);
    }

    // 4th request must be rate-limited (429)
    const res = await app.request('http://localhost/api/auth/patient/request-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'arun@example.com' }),
    }, mockEnv);
    expect(res.status).toBe(429);
    const body = (await res.json()) as { error: string };
    expect(body.error).toMatch(/rate limit|too many/i);
  });

  it('locks out patient OTP after 5 failed attempts', async () => {
    const app = createApp();

    // 1. Request OTP
    const reqRes = await app.request('http://localhost/api/auth/patient/request-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'arun@example.com' }),
    }, mockEnv);
    expect(reqRes.status).toBe(200);

    // 2. Fail 5 times
    for (let i = 0; i < 5; i++) {
      const failRes = await app.request('http://localhost/api/auth/patient/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'arun@example.com', otp: '999999' }),
      }, mockEnv);
      expect(failRes.status).toBe(i === 4 ? 429 : 401);
    }

    // 6th attempt should be firmly rejected as locked out
    const finalRes = await app.request('http://localhost/api/auth/patient/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'arun@example.com', otp: '999999' }),
    }, mockEnv);
    expect(finalRes.status).toBe(429);
  });

  it('verifies patient OTP and sets HttpOnly Secure SameSite=Strict session cookie', async () => {
    const app = createApp();

    // In test environment, request-otp returns demoOtp or dispatches
    const reqRes = await app.request('http://localhost/api/auth/patient/request-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'arun@example.com' }),
    }, mockEnv);
    const reqData = (await reqRes.json()) as { demoOtp?: string };
    const otp = reqData.demoOtp || '123456';

    const verifyRes = await app.request('http://localhost/api/auth/patient/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'arun@example.com', otp }),
    }, mockEnv);

    expect(verifyRes.status).toBe(200);
    const setCookie = verifyRes.headers.get('Set-Cookie');
    expect(setCookie).toBeDefined();
    expect(setCookie).toMatch(/HttpOnly/i);
    expect(setCookie).toMatch(/SameSite=Strict/i);
    expect(setCookie).toMatch(/Secure/i);
  });

  it('authenticates staff credentials and requires TOTP MFA', async () => {
    const app = createApp();

    // 1. Invalid password fails
    const badRes = await app.request('http://localhost/api/auth/staff/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'doctor@example.com', password: 'WrongPassword' }),
    }, mockEnv);
    expect(badRes.status).toBe(401);

    // 2. Correct password returns requireTotp: true
    const loginRes = await app.request('http://localhost/api/auth/staff/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'doctor@example.com', password: 'DemoPassword123!' }),
    }, mockEnv);
    expect(loginRes.status).toBe(200);
    const loginData = (await loginRes.json()) as {
      requireTotp: boolean;
      staffId: string;
      role: string;
    };
    expect(loginData.requireTotp).toBe(true);
    expect(loginData.staffId).toBeDefined();

    // 3. Invalid TOTP code fails
    const badTotpRes = await app.request('http://localhost/api/auth/staff/verify-totp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ staffId: loginData.staffId, code: '000000' }),
    }, mockEnv);
    expect(badTotpRes.status).toBe(401);

    // 4. Valid TOTP generates AAL2 session cookie
    const validCode = await generateTotp('JBSWY3DPEHPK3PXR'); // Secret for Dr. Rahul
    const totpRes = await app.request('http://localhost/api/auth/staff/verify-totp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ staffId: loginData.staffId, code: validCode }),
    }, mockEnv);
    expect(totpRes.status).toBe(200);
    const totpData = (await totpRes.json()) as {
      user: { role: string; aal: string };
    };
    expect(totpData.user.role).toBe('doctor');
    expect(totpData.user.aal).toBe('aal2');

    const cookie = totpRes.headers.get('Set-Cookie');
    expect(cookie).toMatch(/careone_session/);
  });

  it('enforces 10-minute idle session timeout', async () => {
    const app = createApp();

    // Login doctor
    const code = await generateTotp('JBSWY3DPEHPK3PXR');
    const totpRes = await app.request('http://localhost/api/auth/staff/verify-totp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ staffId: 'b0000000-0000-0000-0000-000000000003', code }),
    }, mockEnv);

    const cookieHeader = totpRes.headers.get('Set-Cookie')!;
    const match = cookieHeader.match(/careone_session=([^;]+)/);
    const token = match![1];

    // Check session immediate: succeeds
    const s1 = await app.request('http://localhost/api/auth/session', {
      method: 'GET',
      headers: { Cookie: `careone_session=${token}` },
    }, mockEnv);
    expect(s1.status).toBe(200);

    // Artificially age last_active_at in D1 to 11 minutes ago
    const pastTime = new Date(Date.now() - 11 * 60 * 1000).toISOString();
    await mockEnv.DB.prepare('UPDATE sessions SET last_active_at = ?').bind(pastTime).run();

    // Check session again: must be 401 Idle Timeout
    const s2 = await app.request('http://localhost/api/auth/session', {
      method: 'GET',
      headers: { Cookie: `careone_session=${token}` },
    }, mockEnv);
    expect(s2.status).toBe(401);
    const body = (await s2.json()) as { error: string };
    expect(body.error).toMatch(/idle|inactiv/i);
  });

  it('destroys session on signout', async () => {
    const app = createApp();

    const code = await generateTotp('JBSWY3DPEHPK3PXR');
    const totpRes = await app.request('http://localhost/api/auth/staff/verify-totp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ staffId: 'b0000000-0000-0000-0000-000000000003', code }),
    }, mockEnv);
    const cookieHeader = totpRes.headers.get('Set-Cookie')!;
    const match = cookieHeader.match(/careone_session=([^;]+)/);
    const token = match![1];

    // Sign out
    const outRes = await app.request('http://localhost/api/auth/signout', {
      method: 'POST',
      headers: { Cookie: `careone_session=${token}` },
    }, mockEnv);
    expect(outRes.status).toBe(200);

    // Subsequent session check fails
    const checkRes = await app.request('http://localhost/api/auth/session', {
      method: 'GET',
      headers: { Cookie: `careone_session=${token}` },
    }, mockEnv);
    expect(checkRes.status).toBe(401);
  });
});
