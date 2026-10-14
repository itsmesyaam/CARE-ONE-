// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { app } from '../../worker/index';
import type { WorkerEnv } from '../../worker/env';
import { signJwt } from '../../worker/auth/policy';

describe('Auth Security, Password Invariants & Access Gates', () => {
  const schemaDbPath = path.resolve(__dirname, '../../migrations/0001_schema.sql');
  const schemaGuardsPath = path.resolve(__dirname, '../../migrations/0002_guards.sql');
  const schemaTriggersPath = path.resolve(__dirname, '../../migrations/0003_audit_triggers.sql');
  const schemaEmailPath = path.resolve(__dirname, '../../migrations/0005_email_limits.sql');
  const schemaSessionsPath = path.resolve(__dirname, '../../migrations/0008_sessions.sql');
  const schemaPasskeysPath = path.resolve(__dirname, '../../migrations/0009_passkeys.sql');
  const schemaHardeningPath = path.resolve(__dirname, '../../migrations/0010_passkeys_and_tokens_hardening.sql');
  const schemaDropOtpsPath = path.resolve(__dirname, '../../migrations/0011_drop_auth_otps.sql');
  const schemaStaffEmailPath = path.resolve(__dirname, '../../migrations/0012_staff_email.sql');
  const schemaAuthPath = path.resolve(__dirname, '../../migrations/0013_username_password_auth.sql');
  const seedUsersPath = path.resolve(__dirname, '../../migrations/0014_seed_demo_users.sql');
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
    if (fs.existsSync(schemaAuthPath)) {
      dbSqlite.exec(fs.readFileSync(schemaAuthPath, 'utf8'));
    }
    if (fs.existsSync(seedUsersPath)) {
      dbSqlite.exec(fs.readFileSync(seedUsersPath, 'utf8'));
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

  it('verifies that no OTP, WebAuthn, or passkeys tables or endpoints exist', async () => {
    // 1. Obsolete routes must return 404 Not Found
    const obsoleteRoutes = [
      '/api/auth/otp/send',
      '/api/auth/otp/verify',
      '/api/auth/passkey/login/options',
      '/api/auth/passkey/login/verify',
      '/api/auth/passkey/register/options',
      '/api/auth/passkey/register/verify',
      '/api/auth/demo-signin',
    ];

    for (const route of obsoleteRoutes) {
      const res = await app.request(route, { method: 'POST' }, mockEnv);
      expect(res.status, `Route ${route} must be 404`).toBe(404);
    }

    // 2. Dropped tables must NOT exist in SQLite schema
    const droppedTables = ['auth_otps', 'passkeys', 'setup_tokens', 'webauthn_challenges'];
    for (const tableName of droppedTables) {
      const checkTable = dbSqlite
        .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?;")
        .get(tableName);
      expect(checkTable, `Table ${tableName} should be dropped`).toBeUndefined();
    }
  });

  it('grep check: verifies zero references to OTP, passkey, or WebAuthn in src and worker', () => {
    const srcDir = path.resolve(__dirname, '../../src');
    const workerDir = path.resolve(__dirname, '../../worker');

    function scanFiles(dir: string): string[] {
      let results: string[] = [];
      const list = fs.readdirSync(dir);
      for (const file of list) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat && stat.isDirectory()) {
          results = results.concat(scanFiles(fullPath));
        } else if (/\.(ts|tsx|html|css)$/.test(file)) {
          results.push(fullPath);
        }
      }
      return results;
    }

    const allFiles = [...scanFiles(srcDir), ...scanFiles(workerDir)];
    for (const filePath of allFiles) {
      const content = fs.readFileSync(filePath, 'utf8');
      expect(content).not.toMatch(/\/api\/auth\/otp/i);
      expect(content).not.toMatch(/\/api\/auth\/passkey/i);
      expect(content).not.toMatch(/one-time code/i);
      expect(content).not.toMatch(/one-time-code/i);
      expect(content).not.toMatch(/SimpleWebAuthn/i);
    }
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
      { path: '/api/me/password', method: 'POST' },
    ];

    for (const route of unauthenticatedRoutes) {
      const res = await app.request(route.path, { method: route.method }, mockEnv);
      expect(res.status, `Route ${route.path} should reject without session`).toBe(401);
      const data = (await res.json()) as { error: string };
      expect(data.error).toBe('unauthorized');
    }
  });

  it('disabled user (is_active = 0) is blocked immediately across all routes', async () => {
    // 1. Valid doctor session
    const doctorToken = await signJwt({
      sub: 'b0000000-0000-0000-0000-000000000003',
      id: 'b0000000-0000-0000-0000-000000000003',
      role: 'doctor',
      session_version: 1,
      exp: Math.floor(Date.now() / 1000) + 3600,
    }, mockEnv.JWT_SECRET!);

    // Doctor can view /today
    const okRes = await app.request('/api/doctor/today', {
      headers: { Authorization: `Bearer ${doctorToken}` },
    }, mockEnv);
    expect(okRes.status).toBe(200);

    // 2. Disable doctor in both staff and users tables
    dbSqlite.exec("UPDATE users SET is_active = 0 WHERE username = 'dr.rahul@example.com';");
    dbSqlite.exec("UPDATE staff SET is_active = 0 WHERE id = 'b0000000-0000-0000-0000-000000000003';");

    // Session immediately blocked
    const blockedRes = await app.request('/api/doctor/today', {
      headers: { Authorization: `Bearer ${doctorToken}` },
    }, mockEnv);
    expect(blockedRes.status).toBe(401);
    const blockedData = (await blockedRes.json()) as { error: string };
    expect(blockedData.error).toBe('account_inactive');
  });

  it('session version bump immediately invalidates previous sessions (sign-out everywhere)', async () => {
    // 1. Session with version 1
    const tokenV1 = await signJwt({
      sub: 'b0000000-0000-0000-0000-000000000003',
      id: 'b0000000-0000-0000-0000-000000000003',
      role: 'doctor',
      session_version: 1,
      exp: Math.floor(Date.now() / 1000) + 3600,
    }, mockEnv.JWT_SECRET!);

    const okRes = await app.request('/api/doctor/today', {
      headers: { Authorization: `Bearer ${tokenV1}` },
    }, mockEnv);
    expect(okRes.status).toBe(200);

    // 2. Bump session_version in users table
    dbSqlite.exec("UPDATE users SET session_version = session_version + 1 WHERE username = 'dr.rahul@example.com';");

    // 3. Old session token is now rejected with 401
    const invalidatedRes = await app.request('/api/doctor/today', {
      headers: { Authorization: `Bearer ${tokenV1}` },
    }, mockEnv);
    expect(invalidatedRes.status).toBe(401);
  });

  it('forced password change blocks clinical and desk routes until password is changed', async () => {
    // 1. Set must_change_password = 1 for Dr. Rahul
    dbSqlite.exec("UPDATE users SET must_change_password = 1 WHERE username = 'dr.rahul@example.com';");

    const doctorToken = await signJwt({
      sub: 'b0000000-0000-0000-0000-000000000003',
      id: 'b0000000-0000-0000-0000-000000000003',
      role: 'doctor',
      session_version: 1,
      exp: Math.floor(Date.now() / 1000) + 3600,
    }, mockEnv.JWT_SECRET!);

    // Protected route blocked with 403
    const blockedRes = await app.request('/api/doctor/today', {
      headers: { Authorization: `Bearer ${doctorToken}` },
    }, mockEnv);
    expect(blockedRes.status).toBe(403);
    const blockedData = (await blockedRes.json()) as { error: string };
    expect(blockedData.error).toBe('password_change_required');

    // Changing password via /api/me/password is permitted
    const changeRes = await app.request('/api/me/password', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${doctorToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        currentPassword: 'DemoPassword123!',
        newPassword: 'BrandNewSecurePass2026!',
      }),
    }, mockEnv);
    expect(changeRes.status).toBe(200);

    // must_change_password reset to 0 in D1
    const userRow = dbSqlite
      .prepare("SELECT must_change_password, session_version FROM users WHERE username = 'dr.rahul@example.com';")
      .get() as { must_change_password: number; session_version: number };
    expect(userRow.must_change_password).toBe(0);
  });

  it('desk can reset patient password, but is rejected on staff reset; admin can reset staff password', async () => {
    const deskToken = await signJwt({
      sub: 'b0000000-0000-0000-0000-000000000002',
      id: 'b0000000-0000-0000-0000-000000000002',
      role: 'front_desk',
      session_version: 1,
      exp: Math.floor(Date.now() / 1000) + 3600,
    }, mockEnv.JWT_SECRET!);

    const adminToken = await signJwt({
      sub: 'b0000000-0000-0000-0000-000000000001',
      id: 'b0000000-0000-0000-0000-000000000001',
      role: 'admin',
      session_version: 1,
      exp: Math.floor(Date.now() / 1000) + 3600,
    }, mockEnv.JWT_SECRET!);

    // 1. Desk resets patient password
    const patientId = 'e0000000-0000-0000-0000-000000000001';
    const deskResetPatientRes = await app.request(`/api/desk/patients/${patientId}/account`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${deskToken}` },
    }, mockEnv);
    expect(deskResetPatientRes.status).toBe(200);
    const patientResetData = (await deskResetPatientRes.json()) as { ok: boolean; temporary_password: string; username: string };
    expect(patientResetData.ok).toBe(true);
    expect(patientResetData.temporary_password).toMatch(/^Temp#[A-Za-z0-9]{7}$/);

    // 2. Desk attempts to reset staff password -> 404 (desk not allowed on admin routes)
    const staffId = 'b0000000-0000-0000-0000-000000000003';
    const deskResetStaffRes = await app.request(`/api/admin/staff/${staffId}/password-reset`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${deskToken}` },
    }, mockEnv);
    expect(deskResetStaffRes.status).toBe(404);

    // 3. Admin resets staff password -> 200
    const adminResetStaffRes = await app.request(`/api/admin/staff/${staffId}/password-reset`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    }, mockEnv);
    expect(adminResetStaffRes.status).toBe(200);
    const adminResetData = (await adminResetStaffRes.json()) as { ok: boolean; temporary_password: string; username: string };
    expect(adminResetData.ok).toBe(true);
    expect(adminResetData.temporary_password).toMatch(/^Temp#[A-Za-z0-9]{7}$/);
  });

  it('enforces lockout after 5 consecutive failed logins', async () => {
    // 4 failed logins return 401
    for (let i = 1; i <= 4; i++) {
      const failRes = await app.request('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'admin@example.com', password: 'WrongPassword123!' }),
      }, mockEnv);
      expect(failRes.status).toBe(401);
      const data = (await failRes.json()) as { error: string };
      expect(data.error).toBe('Invalid username or password');
    }

    // 5th attempt locks the account and returns 429
    const fifthRes = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin@example.com', password: 'WrongPassword123!' }),
    }, mockEnv);
    expect(fifthRes.status).toBe(429);
    const fifthData = (await fifthRes.json()) as { error: string };
    expect(fifthData.error).toMatch(/temporarily locked.*15 minutes/i);

    // 6th attempt is also rejected with 429 while locked
    const sixthRes = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin@example.com', password: 'DemoPassword123!' }),
    }, mockEnv);
    expect(sixthRes.status).toBe(429);
    const sixthData = (await sixthRes.json()) as { error: string };
    expect(sixthData.error).toMatch(/temporarily locked/i);
  });
});
