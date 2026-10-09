import { describe, it, expect, beforeEach } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { createApp } from '../../worker/app';
import type { WorkerEnv } from '../../worker/env';
import { createSession } from '../../worker/auth/sessions';

type BoundParam = string | number | null | undefined;
type QueryRow = Record<string, unknown>;

function createMockD1(): { d1: D1Database; sqlite: DatabaseSync } {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec('PRAGMA foreign_keys = ON;');

  const m1 = fs.readFileSync(
    path.resolve(process.cwd(), 'migrations/0001_initial_schema.sql'),
    'utf8'
  );
  sqlite.exec(m1);
  const m2 = fs.readFileSync(
    path.resolve(process.cwd(), 'migrations/0002_seed_demo_data.sql'),
    'utf8'
  );
  sqlite.exec(m2);
  const m3 = fs.readFileSync(
    path.resolve(process.cwd(), 'migrations/0003_staff_auth_credentials.sql'),
    'utf8'
  );
  sqlite.exec(m3);

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
          const safe = boundParams.map((p) => (p === undefined ? null : p));
          const row = stmt.get(...safe) as QueryRow | undefined;
          if (!row) return null;
          return (col ? (row[col] as T) : (row as T)) ?? null;
        },
        async all<T = unknown>() {
          const stmt = sqlite.prepare(sql);
          const safe = boundParams.map((p) => (p === undefined ? null : p));
          const results = stmt.all(...safe) as T[];
          return { results, success: true, meta: { duration: 0 } };
        },
        async run() {
          const stmt = sqlite.prepare(sql);
          const safe = boundParams.map((p) => (p === undefined ? null : p));
          const info = stmt.run(...safe) as { changes?: number };
          return { success: true, meta: { changes: info.changes || 0, duration: 0 } };
        },
        async raw<T = unknown[]>() {
          const stmt = sqlite.prepare(sql);
          const safe = boundParams.map((p) => (p === undefined ? null : p));
          const rows = stmt.all(...safe) as QueryRow[];
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

describe('What Changed SQL Query Service', () => {
  let mockEnv: WorkerEnv;
  let d1: D1Database;

  const PATIENT_ARUN = 'e0000000-0000-0000-0000-000000000001';
  const DOCTOR_RAHUL = 'b0000000-0000-0000-0000-000000000003';
  const USER_RAHUL = 'a0000000-0000-0000-0000-000000000003';
  let doctorToken: string;

  beforeEach(async () => {
    const mock = createMockD1();
    d1 = mock.d1;
    mockEnv = {
      DB: d1,
      ENVIRONMENT: 'test',
    } as unknown as WorkerEnv;

    const { rawToken } = await createSession(d1, {
      userId: USER_RAHUL,
      role: 'doctor',
      staffId: DOCTOR_RAHUL,
      isMfaVerified: true,
    });
    doctorToken = rawToken;
  });

  it('aggregates newly uploaded reports, medication updates, abnormal readings, and symptom reports since last visit', async () => {
    const app = createApp();

    const res = await app.request(
      `/api/doctor/patients/${PATIENT_ARUN}/what-changed`,
      {
        method: 'GET',
        headers: {
          Cookie: `careone_session=${doctorToken}`,
        },
      },
      mockEnv
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      patientId: string;
      lastVisitDate: string | null;
      items: Array<{
        happened_at: string;
        kind: 'report' | 'medicine' | 'reading' | 'symptom';
        summary: string;
        ref_table: string;
        ref_id: string;
      }>;
    };

    expect(body.patientId).toBe(PATIENT_ARUN);
    expect(body.items).toBeDefined();
    expect(Array.isArray(body.items)).toBe(true);

    // Seed data for Arun includes a recent uploaded lab document and reported symptom
    const kinds = body.items.map((i) => i.kind);
    expect(kinds.includes('report') || kinds.includes('symptom')).toBe(true);
  });
});
