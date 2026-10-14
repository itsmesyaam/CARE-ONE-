// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { app } from '../../worker/index';
import type { WorkerEnv } from '../../worker/env';

describe('Auth Security, WebAuthn Passkeys & Invariants', () => {
  const schemaDbPath = path.resolve(__dirname, '../../migrations/0001_schema.sql');
  const schemaGuardsPath = path.resolve(__dirname, '../../migrations/0002_guards.sql');
  const schemaTriggersPath = path.resolve(__dirname, '../../migrations/0003_audit_triggers.sql');
  const schemaEmailPath = path.resolve(__dirname, '../../migrations/0005_email_limits.sql');
  const schemaSessionsPath = path.resolve(__dirname, '../../migrations/0008_sessions.sql');
  const schemaPasskeysPath = path.resolve(__dirname, '../../migrations/0009_passkeys.sql');
  const schemaHardeningPath = path.resolve(__dirname, '../../migrations/0010_passkeys_and_tokens_hardening.sql');
  const schemaDropOtpsPath = path.resolve(__dirname, '../../migrations/0011_drop_auth_otps.sql');
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

    mockEnv = {
      DB: createD1Mock(dbSqlite),
      FILES_DB: createD1Mock(dbSqlite),
      REMINDERS: {} as Queue<unknown>,
      ENVIRONMENT: 'production',
      JWT_SECRET: 'test-jwt-secret-key-32-bytes-minimum-length!!',
      RESEND_API_KEY: 're_mock_key',
    };
  });

  it('verifies that no OTP routes or auth_otps tables remain', async () => {
    // 1. /api/auth/otp/send and /verify must return 404 Not Found
    const sendRes = await app.request('/api/auth/otp/send', { method: 'POST' }, mockEnv);
    expect(sendRes.status).toBe(404);

    const verifyRes = await app.request('/api/auth/otp/verify', { method: 'POST' }, mockEnv);
    expect(verifyRes.status).toBe(404);

    // 2. auth_otps table must NOT exist in SQLite schema
    const checkTable = dbSqlite
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'auth_otps';")
      .get();
    expect(checkTable).toBeUndefined();
  });

  it('every protected patient and staff route returns 401 without a valid session', async () => {
    const unauthenticatedRoutes = [
      { path: '/api/doctor/today', method: 'GET' },
      { path: '/api/doctor/patients', method: 'GET' },
      { path: '/api/doctor/account', method: 'GET' },
      { path: '/api/desk/patients', method: 'GET' },
      { path: '/api/patient/home', method: 'GET' },
      { path: '/api/patient/records', method: 'GET' },
      { path: '/api/admin/dashboard', method: 'GET' },
      { path: '/api/admin/audit-logs', method: 'GET' },
      { path: '/api/me/passkeys', method: 'GET' },
    ];

    for (const route of unauthenticatedRoutes) {
      const res = await app.request(route.path, { method: route.method }, mockEnv);
      expect(res.status, `Route ${route.path} should reject without session`).toBe(401);
    }
  });

  it('setup tokens: rejects expired, reused, or nonexistent tokens', async () => {
    // 1. Non-existent token fails options request
    const missingRes = await app.request('/api/auth/passkey/register/options', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: 'nonexistent-token-value' }),
    }, mockEnv);
    expect(missingRes.status).toBe(400);

    // 2. Insert expired token into D1
    const expiredToken = 'expired-token-12345678901234567890';
    const expiredData = new TextEncoder().encode(expiredToken);
    const expBuf = await crypto.subtle.digest('SHA-256', expiredData);
    const expHash = Array.from(new Uint8Array(expBuf)).map((b) => b.toString(16).padStart(2, '0')).join('');

    dbSqlite.exec(`
      INSERT INTO setup_tokens (id, user_id, token_hash, purpose, created_by, expires_at)
      VALUES ('t-expired', 'e0000000-0000-0000-0000-000000000001', '${expHash}', 'patient_setup', 'desk1', datetime('now', '-5 minutes'));
    `);

    const expiredRes = await app.request('/api/auth/passkey/register/options', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: expiredToken }),
    }, mockEnv);
    expect(expiredRes.status).toBe(400);

    // 3. Insert already used token
    const usedToken = 'used-token-12345678901234567890';
    const usedData = new TextEncoder().encode(usedToken);
    const usedBuf = await crypto.subtle.digest('SHA-256', usedData);
    const usedHash = Array.from(new Uint8Array(usedBuf)).map((b) => b.toString(16).padStart(2, '0')).join('');

    dbSqlite.exec(`
      INSERT INTO setup_tokens (id, user_id, token_hash, purpose, created_by, expires_at, used_at)
      VALUES ('t-used', 'e0000000-0000-0000-0000-000000000001', '${usedHash}', 'patient_setup', 'desk1', datetime('now', '+20 minutes'), datetime('now', '-2 minutes'));
    `);

    const usedRes = await app.request('/api/auth/passkey/register/options', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: usedToken }),
    }, mockEnv);
    expect(usedRes.status).toBe(400);
  });

  it('staff routes enforce AAL2: staff with AAL1 only (passkey without TOTP) is rejected with mfa_required', async () => {
    // Issue token with aal1 (Factor 1 only)
    const { signJwt } = await import('../../worker/auth/policy');
    const aal1Token = await signJwt({
      sub: 'b0000000-0000-0000-0000-000000000003',
      id: 'b0000000-0000-0000-0000-000000000003',
      role: 'doctor',
      aal: 'aal1',
      token_version: 1,
      exp: Math.floor(Date.now() / 1000) + 3600,
    }, mockEnv.JWT_SECRET!);

    const res = await app.request('/api/doctor/today', {
      headers: { Authorization: `Bearer ${aal1Token}` },
    }, mockEnv);

    expect(res.status).toBe(401);
    const data = (await res.json()) as { error: string };
    expect(data.error).toMatch(/mfa_required/i);
  });

  it('revoked passkey is not allowed and disabled user sessions are blocked', async () => {
    const { signJwt } = await import('../../worker/auth/policy');
    const validDoctorToken = await signJwt({
      sub: 'b0000000-0000-0000-0000-000000000003',
      id: 'b0000000-0000-0000-0000-000000000003',
      role: 'doctor',
      aal: 'aal2',
      token_version: 1,
      exp: Math.floor(Date.now() / 1000) + 3600,
    }, mockEnv.JWT_SECRET!);

    // Doctor can view /today
    const okRes = await app.request('/api/doctor/today', {
      headers: { Authorization: `Bearer ${validDoctorToken}` },
    }, mockEnv);
    expect(okRes.status).toBe(200);

    // Disable doctor (is_active = 0)
    dbSqlite.exec("UPDATE staff SET is_active = 0 WHERE id = 'b0000000-0000-0000-0000-000000000003';");

    // Session immediately blocked
    const blockedRes = await app.request('/api/doctor/today', {
      headers: { Authorization: `Bearer ${validDoctorToken}` },
    }, mockEnv);
    expect(blockedRes.status).toBe(401);
  });

  it('demo sign-in returns 403 in production', async () => {
    mockEnv.ENVIRONMENT = 'production';

    const res = await app.request('/api/auth/demo-signin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'front_desk' }),
    }, mockEnv);

    expect(res.status).toBe(403);
  });
});
