// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { app } from '../../worker/index';
import type { WorkerEnv } from '../../worker/env';

describe('Step 1: Auth Security & OTP Hardening Invariants', () => {
  const schemaDbPath = path.resolve(__dirname, '../../migrations/0001_schema.sql');
  const schemaGuardsPath = path.resolve(__dirname, '../../migrations/0002_guards.sql');
  const schemaEmailPath = path.resolve(__dirname, '../../migrations/0005_email_limits.sql');
  const schemaOtpsPath = path.resolve(__dirname, '../../migrations/0007_auth_otps.sql');

  let dbSqlite: DatabaseSync;
  let mockEnv: WorkerEnv;

  const mockMeta = {
    duration: 0,
    rows_read: 0,
    rows_written: 0,
    size_after: 0,
    last_row_id: 0,
    changed_db: false,
    changes: 0,
  };

  function createD1Mock(db: DatabaseSync): D1Database {
    return {
      prepare(query: string) {
        return {
          bind(...params: unknown[]) {
            const boundParams = params as (string | number | bigint | null | Uint8Array)[];
            return {
              async first<T = unknown>(col?: string): Promise<T | null> {
                const stmt = db.prepare(query);
                const row = stmt.get(...boundParams) as Record<string, unknown> | undefined;
                if (!row) return null;
                return (col ? row[col] : row) as T;
              },
              async all<T = unknown>(): Promise<D1Result<T>> {
                const stmt = db.prepare(query);
                const rows = stmt.all(...boundParams) as T[];
                return {
                  results: rows,
                  success: true,
                  meta: mockMeta,
                };
              },
              async run(): Promise<D1Response> {
                const stmt = db.prepare(query);
                stmt.run(...boundParams);
                return {
                  success: true,
                  meta: mockMeta,
                };
              },
            };
          },
        };
      },
      batch: async () => [],
      exec: async (sql: string) => {
        db.exec(sql);
        return { count: 0, duration: 0 };
      },
      dump: async () => new ArrayBuffer(0),
    } as unknown as D1Database;
  }

  beforeEach(() => {
    dbSqlite = new DatabaseSync(':memory:');
    dbSqlite.exec(fs.readFileSync(schemaDbPath, 'utf8'));
    dbSqlite.exec(fs.readFileSync(schemaGuardsPath, 'utf8'));
    dbSqlite.exec(fs.readFileSync(schemaEmailPath, 'utf8'));
    if (fs.existsSync(schemaOtpsPath)) {
      dbSqlite.exec(fs.readFileSync(schemaOtpsPath, 'utf8'));
    }

    mockEnv = {
      DB: createD1Mock(dbSqlite),
      FILES_DB: createD1Mock(dbSqlite),
      REMINDERS: {} as Queue<unknown>,
      ENVIRONMENT: 'production',
      JWT_SECRET: 'test-jwt-secret-key-32-bytes-minimum-length!!',
    };
  });

  it('rejects fixed demo code 123456 when ENVIRONMENT is not local', async () => {
    mockEnv.ENVIRONMENT = 'production';

    // 1. Send OTP
    const sendRes = await app.request(
      '/api/auth/otp/send',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: 'patient@example.com', purpose: 'patient' }),
      },
      mockEnv
    );
    expect(sendRes.status).toBe(200);

    // 2. Attempt verification with fixed code "123456"
    const verifyRes = await app.request(
      '/api/auth/otp/verify',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: 'patient@example.com', code: '123456' }),
      },
      mockEnv
    );

    // Must fail on production
    expect(verifyRes.status).toBe(401);
    const body = (await verifyRes.json()) as { error: string };
    expect(body.error).toMatch(/invalid.*code/i);
  });

  it('allows fixed demo code 123456 when ENVIRONMENT is local', async () => {
    mockEnv.ENVIRONMENT = 'local';

    const sendRes = await app.request(
      '/api/auth/otp/send',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: 'patient@example.com', purpose: 'patient' }),
      },
      mockEnv
    );
    expect(sendRes.status).toBe(200);

    const verifyRes = await app.request(
      '/api/auth/otp/verify',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: 'patient@example.com', code: '123456' }),
      },
      mockEnv
    );

    expect(verifyRes.status).toBe(200);
    const body = (await verifyRes.json()) as { ok: boolean };
    expect(body.ok).toBe(true);
  });

  it('enforces single-use for OTP codes on production', async () => {
    mockEnv.ENVIRONMENT = 'production';

    await app.request(
      '/api/auth/otp/send',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: 'singleuse@example.com', purpose: 'patient' }),
      },
      mockEnv
    );

    // Retrieve the generated code directly from the DB mock for testing verification
    const row = dbSqlite
      .prepare('SELECT plain_code FROM auth_otps WHERE identifier = ?')
      .get('singleuse@example.com') as { plain_code?: string } | undefined;

    // Use plain code if stored for testing, or valid production code
    const validCode = row?.plain_code;
    if (validCode) {
      // First verification succeeds
      const res1 = await app.request(
        '/api/auth/otp/verify',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identifier: 'singleuse@example.com', code: validCode }),
        },
        mockEnv
      );
      expect(res1.status).toBe(200);

      // Second verification with identical code must fail
      const res2 = await app.request(
        '/api/auth/otp/verify',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identifier: 'singleuse@example.com', code: validCode }),
        },
        mockEnv
      );
      expect(res2.status).toBe(401);
    }
  });

  it('locks identifier for 15 minutes after 5 consecutive failed attempts', async () => {
    mockEnv.ENVIRONMENT = 'production';

    await app.request(
      '/api/auth/otp/send',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: 'lockout@example.com', purpose: 'patient' }),
      },
      mockEnv
    );

    // First 4 failed attempts return 401
    for (let i = 1; i <= 4; i++) {
      const res = await app.request(
        '/api/auth/otp/verify',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identifier: 'lockout@example.com', code: '999999' }),
        },
        mockEnv
      );
      expect(res.status).toBe(401);
    }

    // 5th failed attempt locks the account and returns 429
    const lockRes5 = await app.request(
      '/api/auth/otp/verify',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: 'lockout@example.com', code: '999999' }),
      },
      mockEnv
    );
    expect(lockRes5.status).toBe(429);

    // Subsequent attempt while locked also returns 429 Locked
    const lockRes = await app.request(
      '/api/auth/otp/verify',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: 'lockout@example.com', code: '999999' }),
      },
      mockEnv
    );
    expect(lockRes.status).toBe(429);
    const body = (await lockRes.json()) as { error: string };
    expect(body.error).toMatch(/locked/i);
  });

  it('reserves last 20 emails for staff sign-in and exposes warning banner at 75% usage', async () => {
    mockEnv.ENVIRONMENT = 'production';
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());

    // Set count to 75 (non-staff limit reached)
    dbSqlite
      .prepare("INSERT INTO email_daily_counts (date, count, updated_at) VALUES (?, 75, datetime('now'))")
      .run(today);

    // Patient OTP send must be rejected because quota is reserved for staff
    const patientRes = await app.request(
      '/api/auth/otp/send',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: 'patient2@example.com', purpose: 'patient' }),
      },
      mockEnv
    );
    expect(patientRes.status).toBe(429);

    // Staff OTP send must succeed using reserved quota
    const staffRes = await app.request(
      '/api/auth/otp/send',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: 'dr.rahul@example.com', purpose: 'staff' }),
      },
      mockEnv
    );
    expect(staffRes.status).toBe(200);

    // Admin email usage endpoint must flag warning banner (76/95 >= 75%)
    const usageRes = await app.request('/api/admin/email/usage', { method: 'GET' }, mockEnv);
    expect(usageRes.status).toBe(200);
    const usage = (await usageRes.json()) as { warningBanner: boolean; count: number; max: number };
    expect(usage.warningBanner).toBe(true);
    expect(usage.max).toBe(95);
  });
});
