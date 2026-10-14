// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { app } from '../../worker/index';
import type { WorkerEnv } from '../../worker/env';
import { hashPassword } from '../../worker/auth/password';

describe('Task 2: Password Authentication Routes & Policies', () => {
  const schemaDbPath = path.resolve(__dirname, '../../migrations/0001_schema.sql');
  const schemaGuardsPath = path.resolve(__dirname, '../../migrations/0002_guards.sql');
  const schemaTriggersPath = path.resolve(__dirname, '../../migrations/0003_audit_triggers.sql');
  const schemaEmailPath = path.resolve(__dirname, '../../migrations/0005_email_limits.sql');
  const schemaSessionsPath = path.resolve(__dirname, '../../migrations/0008_sessions.sql');
  const schemaStaffEmailPath = path.resolve(__dirname, '../../migrations/0012_staff_email.sql');
  const schemaPasswordAuthPath = path.resolve(__dirname, '../../migrations/0013_username_password_auth.sql');
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

  beforeEach(async () => {
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
    if (fs.existsSync(seedPath)) {
      dbSqlite.exec(fs.readFileSync(seedPath, 'utf8'));
    }
    if (fs.existsSync(schemaStaffEmailPath)) {
      dbSqlite.exec(fs.readFileSync(schemaStaffEmailPath, 'utf8'));
    }
    if (fs.existsSync(schemaPasswordAuthPath)) {
      dbSqlite.exec(fs.readFileSync(schemaPasswordAuthPath, 'utf8'));
    }

    // Seed test users in users table
    const staffHash = await hashPassword('DemoPassword123!', 1000);
    const patientHash = await hashPassword('DemoPassword123!', 1000);

    dbSqlite.prepare(`
      INSERT INTO users (id, username, role, record_id, password_hash, password_salt, password_iterations, must_change_password)
      VALUES 
        ('b0000000-0000-0000-0000-000000000001', 'admin@example.com', 'admin', 'b0000000-0000-0000-0000-000000000001', '${staffHash.hash}', '${staffHash.salt}', ${staffHash.iterations}, 0),
        ('b0000000-0000-0000-0000-000000000002', 'desk@example.com', 'front_desk', 'b0000000-0000-0000-0000-000000000002', '${staffHash.hash}', '${staffHash.salt}', ${staffHash.iterations}, 0),
        ('b0000000-0000-0000-0000-000000000003', 'dr.rahul@example.com', 'doctor', 'b0000000-0000-0000-0000-000000000003', '${staffHash.hash}', '${staffHash.salt}', ${staffHash.iterations}, 0),
        ('e0000000-0000-0000-0000-000000000001', 'ABC-1001', 'patient', 'e0000000-0000-0000-0000-000000000001', '${patientHash.hash}', '${patientHash.salt}', ${patientHash.iterations}, 0);
    `).run();

    mockEnv = {
      DB: createD1Mock(dbSqlite),
      FILES_DB: createD1Mock(dbSqlite),
      REMINDERS: {} as Queue<unknown>,
      ENVIRONMENT: 'production',
      JWT_SECRET: 'test-jwt-secret-key-32-bytes-minimum-length!!',
      RESEND_API_KEY: 're_test_mock_key',
    };
  });

  it('POST /api/auth/login signs in with username and password, sets HttpOnly cookie (12h staff, 30d patient)', async () => {
    // 1. Staff sign-in
    const staffRes = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'admin@example.com',
        password: 'DemoPassword123!',
      }),
    }, mockEnv);

    expect(staffRes.status).toBe(200);
    const staffData = (await staffRes.json()) as { ok: boolean; user: { role: string; username: string } };
    expect(staffData.ok).toBe(true);
    expect(staffData.user.role).toBe('admin');

    const staffCookie = staffRes.headers.get('set-cookie');
    expect(staffCookie).toBeTruthy();
    expect(staffCookie).toContain('careone_session=');
    expect(staffCookie).toContain('HttpOnly');
    expect(staffCookie).toContain('SameSite=Strict');
    expect(staffCookie).toContain('Max-Age=43200'); // 12 hours

    // 2. Patient sign-in by MRN
    const patientRes = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'abc-1001', // case-insensitive
        password: 'DemoPassword123!',
      }),
    }, mockEnv);

    expect(patientRes.status).toBe(200);
    const patientData = (await patientRes.json()) as { ok: boolean; user: { role: string } };
    expect(patientData.ok).toBe(true);
    expect(patientData.user.role).toBe('patient');

    const patientCookie = patientRes.headers.get('set-cookie');
    expect(patientCookie).toContain('Max-Age=2592000'); // 30 days
  });

  it('returns generic error on wrong username or wrong password and locks account after 5 failed attempts for 15 minutes', async () => {
    // Unknown user
    const unknownRes = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'unknown@example.com',
        password: 'WrongPassword!',
      }),
    }, mockEnv);

    expect(unknownRes.status).toBe(401);
    const unknownData = (await unknownRes.json()) as { error: string };
    expect(unknownData.error).toBe('Invalid username or password');

    // 4 failed attempts for dr.rahul@example.com
    for (let i = 1; i <= 4; i++) {
      const wrongRes = await app.request('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'dr.rahul@example.com',
          password: 'IncorrectPassword!',
        }),
      }, mockEnv);
      expect(wrongRes.status).toBe(401);
      const wrongData = (await wrongRes.json()) as { error: string };
      expect(wrongData.error).toBe('Invalid username or password');
    }

    // 5th failed attempt triggers 15-minute lockout
    const fifthRes = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'dr.rahul@example.com',
        password: 'IncorrectPassword!',
      }),
    }, mockEnv);

    expect(fifthRes.status).toBe(429);
    const fifthData = (await fifthRes.json()) as { error: string };
    expect(fifthData.error).toMatch(/temporarily locked.*15 minutes/i);

    // 6th attempt even with correct password is rejected while locked
    const lockedRes = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'dr.rahul@example.com',
        password: 'DemoPassword123!',
      }),
    }, mockEnv);

    expect(lockedRes.status).toBe(429);
    const lockedData = (await lockedRes.json()) as { error: string };
    expect(lockedData.error).toMatch(/temporarily locked/i);
  });

  it('enforces password_change_required when must_change_password=1 and changes password', async () => {
    // Set must_change_password = 1 for admin
    dbSqlite.prepare("UPDATE users SET must_change_password = 1 WHERE username = 'admin@example.com'").run();

    // Login succeeds and issues session token
    const loginRes = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'admin@example.com',
        password: 'DemoPassword123!',
      }),
    }, mockEnv);

    expect(loginRes.status).toBe(200);
    const loginData = (await loginRes.json()) as { token: string; must_change_password: boolean };
    expect(loginData.must_change_password).toBe(true);
    const token = loginData.token;

    // Normal protected route must be blocked with 403 password_change_required
    const blockedRes = await app.request('/api/admin/dashboard', {
      headers: { Authorization: `Bearer ${token}` },
    }, mockEnv);

    expect(blockedRes.status).toBe(403);
    const blockedData = (await blockedRes.json()) as { error: string };
    expect(blockedData.error).toBe('password_change_required');

    // Change password via POST /api/me/password
    const changeRes = await app.request('/api/me/password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        currentPassword: 'DemoPassword123!',
        newPassword: 'MyNewSecurePassword2026!',
      }),
    }, mockEnv);

    expect(changeRes.status).toBe(200);
    const changeData = (await changeRes.json()) as { ok: boolean; token: string };
    expect(changeData.ok).toBe(true);
    const newToken = changeData.token;

    // Now protected admin route succeeds with new token
    const allowedRes = await app.request('/api/admin/dashboard', {
      headers: { Authorization: `Bearer ${newToken}` },
    }, mockEnv);
    expect(allowedRes.status).toBe(200);

    // Old token with bumped session_version must be rejected
    const oldRes = await app.request('/api/admin/dashboard', {
      headers: { Authorization: `Bearer ${token}` },
    }, mockEnv);
    expect(oldRes.status).toBe(401);
  });

  it('allows Front Desk to reset patient password and Admin to reset staff password with must_change_password=1', async () => {
    const { signJwt } = await import('../../worker/auth/policy');

    const deskToken = await signJwt({
      sub: 'b0000000-0000-0000-0000-000000000002',
      id: 'b0000000-0000-0000-0000-000000000002',
      role: 'front_desk',
      session_version: 1,
      must_change_password: 0,
      exp: Math.floor(Date.now() / 1000) + 3600,
    }, mockEnv.JWT_SECRET!);

    // Desk resets patient password
    const deskResetRes = await app.request('/api/desk/patients/e0000000-0000-0000-0000-000000000001/account', {
      method: 'POST',
      headers: { Authorization: `Bearer ${deskToken}` },
    }, mockEnv);

    expect(deskResetRes.status).toBe(200);
    const deskResetData = (await deskResetRes.json()) as { ok: boolean; temporary_password: string; username: string };
    expect(deskResetData.ok).toBe(true);
    expect(deskResetData.temporary_password).toHaveLength(12);
    expect(deskResetData.username).toBe('ABC-1001');

    // Admin resets staff password
    const adminToken = await signJwt({
      sub: 'b0000000-0000-0000-0000-000000000001',
      id: 'b0000000-0000-0000-0000-000000000001',
      role: 'admin',
      session_version: 1,
      must_change_password: 0,
      exp: Math.floor(Date.now() / 1000) + 3600,
    }, mockEnv.JWT_SECRET!);

    const staffResetRes = await app.request('/api/admin/staff/b0000000-0000-0000-0000-000000000003/password-reset', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    }, mockEnv);

    expect(staffResetRes.status).toBe(200);
    const staffResetData = (await staffResetRes.json()) as { ok: boolean; temporary_password: string; username: string };
    expect(staffResetData.ok).toBe(true);
    expect(staffResetData.temporary_password).toHaveLength(12);

    // Logout clears session cookie
    const logoutRes = await app.request('/api/auth/logout', {
      method: 'POST',
    }, mockEnv);
    expect(logoutRes.status).toBe(200);
    const logoutCookie = logoutRes.headers.get('set-cookie');
    expect(logoutCookie).toContain('Max-Age=0');

    // Immediate block when user is deactivated (is_active = 0)
    dbSqlite.prepare("UPDATE users SET is_active = 0 WHERE username = 'admin@example.com'").run();
    const deactivatedLoginRes = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'admin@example.com',
        password: 'DemoPassword123!',
      }),
    }, mockEnv);
    expect(deactivatedLoginRes.status).toBe(403);

    // Active session token also immediately rejected when is_active = 0
    const blockedActiveRes = await app.request('/api/admin/dashboard', {
      headers: { Authorization: `Bearer ${adminToken}` },
    }, mockEnv);
    expect(blockedActiveRes.status).toBe(401);
  });
});
