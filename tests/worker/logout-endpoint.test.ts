// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { app } from '../../worker/index';
import type { WorkerEnv } from '../../worker/env';

describe('Task 1: Server-Side GET /api/me Endpoint & Cookie Cleanup', () => {
  const schemaDbPath = path.resolve(__dirname, '../../migrations/0001_schema.sql');
  const schemaGuardsPath = path.resolve(__dirname, '../../migrations/0002_guards.sql');
  const schemaTriggersPath = path.resolve(__dirname, '../../migrations/0003_audit_triggers.sql');
  const schemaEmailPath = path.resolve(__dirname, '../../migrations/0005_email_limits.sql');
  const schemaSessionsPath = path.resolve(__dirname, '../../migrations/0008_sessions.sql');
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
    if (fs.existsSync(schemaStaffEmailPath)) {
      dbSqlite.exec(fs.readFileSync(schemaStaffEmailPath, 'utf8'));
    }
    if (fs.existsSync(schemaAuthPath)) {
      dbSqlite.exec(fs.readFileSync(schemaAuthPath, 'utf8'));
    }
    if (fs.existsSync(seedPath)) {
      dbSqlite.exec(fs.readFileSync(seedPath, 'utf8'));
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

  function extractCookie(res: Response, name = 'careone_session'): string | null {
    const setCookie = res.headers.get('set-cookie');
    if (!setCookie) return null;
    const match = setCookie.match(new RegExp(`${name}=([^;]+)`));
    return match && match[1] ? decodeURIComponent(match[1]) : null;
  }

  it('GET /api/me returns 401 unauthorized without a valid session', async () => {
    const res = await app.request('/api/me', { method: 'GET' }, mockEnv);
    expect(res.status).toBe(401);
    const data = (await res.json()) as { error: string };
    expect(data.error).toBe('unauthorized');
  });

  it('POST /api/auth/logout returns Set-Cookie with Max-Age=0, Path=/, and SameSite=Strict', async () => {
    const res = await app.request('/api/auth/logout', { method: 'POST' }, mockEnv);
    expect(res.status).toBe(200);

    const setCookie = res.headers.get('set-cookie');
    expect(setCookie).toBeTruthy();
    expect(setCookie).toContain('careone_session=;');
    expect(setCookie).toContain('Max-Age=0');
    expect(setCookie).toContain('Path=/');
    expect(setCookie).toContain('SameSite=Strict');
    expect(setCookie).toContain('HttpOnly');
    expect(setCookie).toContain('Secure');
  });

  it('logout from each role (patient, guardian, doctor, desk, admin) ends session and GET /api/me returns 401', async () => {
    const rolesToTest = [
      { username: 'ABC-1001', expectedRole: 'patient', name: 'Arun Kumar (Patient)' },
      { username: 'ABC-1002', expectedRole: 'guardian', name: 'Sujatha Nair (Guardian)' },
      { username: 'dr.rahul@example.com', expectedRole: 'doctor', name: 'Dr. Rahul (Doctor)' },
      { username: 'desk@example.com', expectedRole: 'front_desk', name: 'Anjali Nair (Front Desk)' },
      { username: 'admin@example.com', expectedRole: 'admin', name: 'Anand Verma (Admin)' },
    ];

    for (const testCase of rolesToTest) {
      // 1. Sign in
      const loginRes = await app.request('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: testCase.username,
          password: 'DemoPassword123!',
        }),
      }, mockEnv);

      expect(loginRes.status, `Sign-in failed for ${testCase.name}`).toBe(200);
      const cookieHeader = loginRes.headers.get('set-cookie');
      expect(cookieHeader).toBeTruthy();

      const sessionCookie = extractCookie(loginRes);
      expect(sessionCookie).toBeTruthy();

      // 2. GET /api/me succeeds with active cookie
      const meRes = await app.request('/api/me', {
        method: 'GET',
        headers: { Cookie: `careone_session=${encodeURIComponent(sessionCookie!)}` },
      }, mockEnv);

      expect(meRes.status, `GET /api/me should return 200 for ${testCase.name}`).toBe(200);
      const meData = (await meRes.json()) as { user: { role: string; username: string } };
      expect(meData.user.role).toBe(testCase.expectedRole);

      // 3. Call POST /api/auth/logout
      const logoutRes = await app.request('/api/auth/logout', {
        method: 'POST',
        headers: { Cookie: `careone_session=${encodeURIComponent(sessionCookie!)}` },
      }, mockEnv);
      expect(logoutRes.status).toBe(200);
      const clearedCookie = logoutRes.headers.get('set-cookie');
      expect(clearedCookie).toContain('Max-Age=0');

      // 4. Calling GET /api/me without cookie (or with cleared cookie) returns 401
      const meAfterLogout = await app.request('/api/me', {
        method: 'GET',
        headers: { Cookie: 'careone_session=' },
      }, mockEnv);
      expect(meAfterLogout.status, `GET /api/me must return 401 after logout for ${testCase.name}`).toBe(401);
    }
  });
});
