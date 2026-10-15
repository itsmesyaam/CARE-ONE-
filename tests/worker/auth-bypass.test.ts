// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { app } from '../../worker/index';
import type { WorkerEnv } from '../../worker/env';

describe('Security: Auth Bypass Prevention in Production/Local Environments', () => {
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
  let prodEnv: WorkerEnv;

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
      async batch<T = unknown>(statements: Array<{ run: () => Promise<unknown> }>): Promise<D1Result<T>[]> {
        const results = [];
        for (const s of statements) {
          results.push(await s.run());
        }
        return results as D1Result<T>[];
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
    prodEnv = {
      DB: d1Mock,
      FILES_DB: d1Mock,
      REMINDERS: {} as Queue<unknown>,
      ENVIRONMENT: 'production', // Production mode: MUST NOT honor x-actor-* headers!
      JWT_SECRET: 'test-jwt-secret-key-32-bytes-minimum-length!!',
      RESEND_API_KEY: 're_mock_key',
    };
  });

  const protectedEndpoints: Array<{ path: string; method: 'GET' | 'POST'; headers?: Record<string, string> }> = [
    { path: '/api/doctor/today', method: 'GET' },
    { path: '/api/doctor/patients', method: 'GET' },
    { path: '/api/doctor/patients/e0000000-0000-0000-0000-000000000001/what-changed', method: 'GET' },
    { path: '/api/patient/home', method: 'GET' },
    { path: '/api/patient/profiles', method: 'GET' },
    { path: '/api/patient/records', method: 'GET' },
    { path: '/api/patient/appointments', method: 'GET' },
    { path: '/api/admin/dashboard', method: 'GET' },
    { path: '/api/admin/audit-logs', method: 'GET' },
    { path: '/api/admin/staff', method: 'GET' },
    { path: '/api/admin/storage', method: 'GET' },
    { path: '/api/desk/patients', method: 'GET' },
    { path: '/api/desk/appointments', method: 'POST' },
    { path: '/api/files/f0000000-0000-0000-0000-000000000001/download', method: 'GET' },
    { path: '/api/files/upload', method: 'POST' },
    { path: '/api/me', method: 'GET' },
  ];

  for (const ep of protectedEndpoints) {
    it(`rejects ${ep.method} ${ep.path} with 401 when only x-actor-* headers are supplied in production`, async () => {
      const res = await app.request(
        ep.path,
        {
          method: ep.method,
          headers: {
            'x-actor-id': 'b0000000-0000-0000-0000-000000000003',
            'x-actor-role': 'doctor',
            'x-actor-aal': 'aal2',
            ...(ep.headers || {}),
          },
        },
        prodEnv
      );

      expect(res.status).toBe(401);
    });
  }

  it('rejects patient route with 401 when only patient x-actor-* headers are supplied', async () => {
    const res = await app.request(
      '/api/patient/records',
      {
        method: 'GET',
        headers: {
          'x-actor-id': 'e0000000-0000-0000-0000-000000000001',
          'x-actor-role': 'patient',
          'x-actor-aal': 'aal1',
        },
      },
      prodEnv
    );

    expect(res.status).toBe(401);
  });
});
