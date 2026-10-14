// @vitest-environment node
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { app } from '../../worker/index';
import type { WorkerEnv } from '../../worker/env';
import { client } from '../../src/lib/client';

describe('Contract Test: Real Worker /api/auth/session and client.auth.getSession()', () => {
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
          raw(): Promise<unknown[]> {
            throw new Error('Not implemented in mock');
          },
        };
        return stmtObj;
      },
      async batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]> {
        const results: D1Result<T>[] = [];
        for (const s of statements) {
          const res = await s.run();
          results.push(res as D1Result<T>);
        }
        return results;
      },
      async exec(query: string): Promise<D1ExecResult> {
        db.exec(query);
        return { count: 1, duration: 0 };
      },
      dump(): Promise<ArrayBuffer> {
        throw new Error('Not implemented');
      },
    } as unknown as D1Database;
  }

  beforeEach(() => {
    dbSqlite = new DatabaseSync(':memory:');
    dbSqlite.exec(fs.readFileSync(schemaDbPath, 'utf8'));
    dbSqlite.exec(fs.readFileSync(schemaGuardsPath, 'utf8'));
    dbSqlite.exec(fs.readFileSync(schemaTriggersPath, 'utf8'));
    dbSqlite.exec(fs.readFileSync(schemaEmailPath, 'utf8'));
    dbSqlite.exec(fs.readFileSync(schemaSessionsPath, 'utf8'));
    dbSqlite.exec(fs.readFileSync(schemaStaffEmailPath, 'utf8'));
    dbSqlite.exec(fs.readFileSync(schemaAuthPath, 'utf8'));
    dbSqlite.exec(fs.readFileSync(seedUsersPath, 'utf8'));
    dbSqlite.exec(fs.readFileSync(seedPath, 'utf8'));

    const d1Mock = createD1Mock(dbSqlite);
    mockEnv = {
      DB: d1Mock,
      FILES_DB: d1Mock,
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

  it('real worker /api/auth/session contract matches client.auth.getSession() parsing', async () => {
    // 1. Real Login on Worker
    const loginRes = await app.request(
      '/api/auth/login',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'dr.rahul@example.com',
          password: 'DemoPassword123!',
        }),
      },
      mockEnv
    );

    expect(loginRes.status).toBe(200);
    const authCookie = extractCookie(loginRes);
    expect(authCookie).toBeTruthy();

    // 2. Real /api/auth/session on Worker
    const sessionRes = await app.request(
      '/api/auth/session',
      {
        method: 'GET',
        headers: {
          Cookie: `careone_session=${encodeURIComponent(authCookie!)}`,
        },
      },
      mockEnv
    );

    expect(sessionRes.status).toBe(200);
    const rawJson = (await sessionRes.clone().json()) as {
      session: { user: { role: string; id: string; must_change_password: boolean } };
    };
    // Validate the real server response shape: { session: { user: { id, role, must_change_password } } }
    expect(rawJson).toHaveProperty('session');
    expect(rawJson.session).toHaveProperty('user');
    expect(rawJson.session.user.role).toBe('doctor');

    // 3. Connect real Worker response directly to client.auth.getSession()
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
      if (typeof url === 'string' && url.includes('/api/auth/session')) {
        return sessionRes.clone();
      }
      return new Response(null, { status: 404 });
    });

    const parsedSession = await client.auth.getSession();

    // MUST NOT BE NULL!
    expect(parsedSession.data?.session).not.toBeNull();
    expect(parsedSession.data?.session?.user.role).toBe('doctor');
    expect(parsedSession.data?.session?.user.id).toBeTruthy();
  });
});
