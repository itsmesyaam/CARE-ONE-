// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { app } from '../../worker/index';
import type { WorkerEnv } from '../../worker/env';

describe('Step 3: Sign-In Hardening & Session Invariants', () => {
  const schemaDbPath = path.resolve(__dirname, '../../migrations/0001_schema.sql');
  const schemaGuardsPath = path.resolve(__dirname, '../../migrations/0002_guards.sql');
  const schemaTriggersPath = path.resolve(__dirname, '../../migrations/0003_audit_triggers.sql');
  const schemaEmailPath = path.resolve(__dirname, '../../migrations/0005_email_limits.sql');
  const schemaSessionsPath = path.resolve(__dirname, '../../migrations/0008_sessions.sql');
  const schemaPasskeysPath = path.resolve(__dirname, '../../migrations/0009_passkeys.sql');
  const schemaHardeningPath = path.resolve(__dirname, '../../migrations/0010_passkeys_and_tokens_hardening.sql');
  const schemaDropOtpsPath = path.resolve(__dirname, '../../migrations/0011_drop_auth_otps.sql');
  const schemaStaffEmailPath = path.resolve(__dirname, '../../migrations/0012_staff_email.sql');
  const seedPath = path.resolve(__dirname, '../../seed/seed.sql');

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
        let boundParams: (string | number | bigint | null | Uint8Array)[] = [];
        const stmtObj = {
          bind(...params: unknown[]) {
            boundParams = params as (string | number | bigint | null | Uint8Array)[];
            return stmtObj;
          },
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
        return stmtObj;
      },
      batch: async (statements: Array<{ run: () => Promise<unknown> }>) => {
        const results = [];
        for (const s of statements) {
          results.push(await s.run());
        }
        return results;
      },
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
    if (fs.existsSync(schemaTriggersPath)) {
      dbSqlite.exec(fs.readFileSync(schemaTriggersPath, 'utf8'));
    }
    dbSqlite.exec(fs.readFileSync(schemaEmailPath, 'utf8'));
    if (fs.existsSync(schemaSessionsPath)) {
      dbSqlite.exec(fs.readFileSync(schemaSessionsPath, 'utf8'));
    }
    if (fs.existsSync(schemaPasskeysPath)) {
      dbSqlite.exec(fs.readFileSync(schemaPasskeysPath, 'utf8'));
    }
    if (fs.existsSync(schemaHardeningPath)) {
      dbSqlite.exec(fs.readFileSync(schemaHardeningPath, 'utf8'));
    }
    if (fs.existsSync(schemaDropOtpsPath)) {
      dbSqlite.exec(fs.readFileSync(schemaDropOtpsPath, 'utf8'));
    }
    if (fs.existsSync(seedPath)) {
      dbSqlite.exec(fs.readFileSync(seedPath, 'utf8'));
    }
    if (fs.existsSync(schemaStaffEmailPath)) {
      dbSqlite.exec(fs.readFileSync(schemaStaffEmailPath, 'utf8'));
    }

    mockEnv = {
      DB: createD1Mock(dbSqlite),
      FILES_DB: createD1Mock(dbSqlite),
      REMINDERS: {} as Queue<unknown>,
      ENVIRONMENT: 'production',
      JWT_SECRET: 'test-jwt-secret-key-32-bytes-minimum-length!!',
      RESEND_API_KEY: 're_test_mock_key',
    };
  });

  const DR_RAHUL_STAFF_ID = 'b0000000-0000-0000-0000-000000000003';

  function parseJwt(token: string): Record<string, unknown> {
    const parts = token.split('.');
    const b64 = parts[1]!.replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(Buffer.from(b64, 'base64').toString('utf8'));
  }

  it('rejects demo-signin with 403 when ENVIRONMENT=production', async () => {
    mockEnv.ENVIRONMENT = 'production';

    const res = await app.request('/api/auth/demo-signin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'doctor' }),
    }, mockEnv);

    expect(res.status).toBe(403);
    const data = (await res.json()) as { error: string };
    expect(data.error).toMatch(/disabled in production/i);
  });

  it('sets HttpOnly, Secure, SameSite=Strict cookies with correct TTLs (12h staff, 30d patient)', async () => {
    // 1. Staff 2FA verify
    const staffRes = await app.request('/api/auth/mfa/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'dr.rahul@example.com', code: '123456' }),
    }, { ...mockEnv, ENVIRONMENT: 'local' });

    expect(staffRes.status).toBe(200);
    const staffCookie = staffRes.headers.get('set-cookie');
    expect(staffCookie).toBeTruthy();
    expect(staffCookie?.toLowerCase()).toContain('httponly');
    expect(staffCookie?.toLowerCase()).toContain('secure');
    expect(staffCookie?.toLowerCase()).toContain('samesite=strict');

    const staffData = (await staffRes.json()) as { token?: string };
    expect(staffData.token).toBeTruthy();
    const staffPayload = parseJwt(staffData.token!);
    const staffTtl = (staffPayload.exp as number) - Math.floor(Date.now() / 1000);
    // Max 12 hours (43200s)
    expect(staffTtl).toBeGreaterThan(43000);
    expect(staffTtl).toBeLessThanOrEqual(43200);

    // 2. Patient session verify (via local demo-signin or passkey session)
    const patientRes = await app.request('/api/auth/demo-signin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'patient', id: 'e0000000-0000-0000-0000-000000000001' }),
    }, { ...mockEnv, ENVIRONMENT: 'local' });

    expect(patientRes.status).toBe(200);
    const patientCookie = patientRes.headers.get('set-cookie');
    expect(patientCookie).toBeTruthy();
    expect(patientCookie?.toLowerCase()).toContain('httponly');
    expect(patientCookie?.toLowerCase()).toContain('secure');
    expect(patientCookie?.toLowerCase()).toContain('samesite=strict');

    const patientData = (await patientRes.json()) as { token?: string };
    expect(patientData.token).toBeTruthy();
    const patientPayload = parseJwt(patientData.token!);
    const patientTtl = (patientPayload.exp as number) - Math.floor(Date.now() / 1000);
    // Max 30 days (2592000s)
    expect(patientTtl).toBeGreaterThan(2590000);
    expect(patientTtl).toBeLessThanOrEqual(2592000);
  });

  it('immediately blocks requests when a staff member is disabled (is_active = 0)', async () => {
    // 1. Staff signs in
    const signinRes = await app.request('/api/auth/mfa/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'dr.rahul@example.com', code: '123456' }),
    }, { ...mockEnv, ENVIRONMENT: 'local' });

    const { token } = (await signinRes.json()) as { token: string };

    // 2. First request succeeds
    const okRes = await app.request('/api/doctor/today', {
      headers: { Authorization: `Bearer ${token}` },
    }, mockEnv);
    expect(okRes.status).toBe(200);

    // 3. Disable staff member in D1
    dbSqlite.exec(`UPDATE staff SET is_active = 0 WHERE id = '${DR_RAHUL_STAFF_ID}'`);

    // 4. Next request with identical token is immediately rejected with 401
    const blockedRes = await app.request('/api/doctor/today', {
      headers: { Authorization: `Bearer ${token}` },
    }, mockEnv);
    expect(blockedRes.status).toBe(401);
    const blockedData = (await blockedRes.json()) as { code: string };
    expect(blockedData.code).toBe('ACCOUNT_INACTIVE');
  });

  it('immediately invalidates token on sign-out everywhere (token version bump)', async () => {
    // 1. Staff signs in
    const signinRes = await app.request('/api/auth/mfa/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'dr.rahul@example.com', code: '123456' }),
    }, { ...mockEnv, ENVIRONMENT: 'local' });

    const { token } = (await signinRes.json()) as { token: string };

    // 2. Request succeeds
    const okRes = await app.request('/api/doctor/today', {
      headers: { Authorization: `Bearer ${token}` },
    }, mockEnv);
    expect(okRes.status).toBe(200);

    // 3. Trigger sign-out everywhere (or bump token_version)
    const signoutRes = await app.request('/api/auth/signout-everywhere', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    }, mockEnv);
    expect(signoutRes.status).toBe(200);

    // 4. Next request with the old token fails immediately
    const revokedRes = await app.request('/api/doctor/today', {
      headers: { Authorization: `Bearer ${token}` },
    }, mockEnv);
    expect(revokedRes.status).toBe(401);
  });
});
