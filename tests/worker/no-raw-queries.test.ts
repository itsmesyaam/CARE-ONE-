// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { app } from '../../worker/index';
import type { WorkerEnv } from '../../worker/env';

describe('Security Gate: Generic Data Router Removal & No Raw Queries', () => {
  const schemaDbPath = path.resolve(__dirname, '../../migrations/0001_schema.sql');
  const schemaGuardsPath = path.resolve(__dirname, '../../migrations/0002_guards.sql');
  const schemaOtpsPath = path.resolve(__dirname, '../../migrations/0007_auth_otps.sql');
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
    if (fs.existsSync(schemaOtpsPath)) {
      dbSqlite.exec(fs.readFileSync(schemaOtpsPath, 'utf8'));
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
    };
  });

  it('rejects any request to /api/data with 404 Not Found', async () => {
    const queryRes = await app.request(
      '/api/data/query',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table: 'patients' }),
      },
      mockEnv
    );
    expect(queryRes.status).toBe(404);

    const mutateRes = await app.request(
      '/api/data/mutate',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table: 'patients', action: 'insert' }),
      },
      mockEnv
    );
    expect(mutateRes.status).toBe(404);
  });

  it('fails if worker/routes/data.ts exists on filesystem', () => {
    const dataRoutePath = path.resolve(__dirname, '../../worker/routes/data.ts');
    expect(fs.existsSync(dataRoutePath)).toBe(false);
  });

  it('fails if src/lib/client.ts exports QueryBuilder or client.from', async () => {
    const clientPath = path.resolve(__dirname, '../../src/lib/client.ts');
    const content = fs.readFileSync(clientPath, 'utf8');
    expect(content.includes('class QueryBuilder')).toBe(false);
    expect(content.includes('/api/data')).toBe(false);
    expect(content.includes('from<T')).toBe(false);
  });

  it('prohibits routes from accepting raw table or operator parameters', async () => {
    const attackPayload = {
      table: 'staff',
      col: 'phone',
      op: 'eq',
      raw: 'SELECT * FROM staff',
      filter: '1=1',
    };

    const res = await app.request(
      '/api/doctor/patients',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-actor-id': 'b0000000-0000-0000-0000-000000000003',
          'x-actor-role': 'doctor',
        },
        body: JSON.stringify(attackPayload),
      },
      mockEnv
    );

    // Either 404 Not Found (since POST /api/doctor/patients does not exist) or 400 Bad Request
    expect([400, 404, 405]).toContain(res.status);
  });
});
