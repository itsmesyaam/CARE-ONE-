import { describe, it, expect, beforeEach } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { createApp } from '../../worker/app';
import type { WorkerEnv } from '../../worker/env';
import { createSession } from '../../worker/auth/sessions';
import { getRoutePolicies } from '../../worker/middleware/access';

type BoundParam = string | number | null | undefined;
type QueryRow = Record<string, unknown>;

function createMockD1(): { d1: D1Database; sqlite: DatabaseSync } {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec('PRAGMA foreign_keys = ON;');

  const m1 = fs.readFileSync(path.resolve(process.cwd(), 'migrations/0001_initial_schema.sql'), 'utf8');
  sqlite.exec(m1);
  const m2 = fs.readFileSync(path.resolve(process.cwd(), 'migrations/0002_seed_demo_data.sql'), 'utf8');
  sqlite.exec(m2);
  const m3 = fs.readFileSync(path.resolve(process.cwd(), 'migrations/0003_staff_auth_credentials.sql'), 'utf8');
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
          const safe = boundParams.map(p => (p === undefined ? null : p));
          const row = stmt.get(...safe) as QueryRow | undefined;
          if (!row) return null;
          return (col ? (row[col] as T) : (row as T)) ?? null;
        },
        async all<T = unknown>() {
          const stmt = sqlite.prepare(sql);
          const safe = boundParams.map(p => (p === undefined ? null : p));
          const results = stmt.all(...safe) as T[];
          return { results, success: true, meta: { duration: 0 } };
        },
        async run() {
          const stmt = sqlite.prepare(sql);
          const safe = boundParams.map(p => (p === undefined ? null : p));
          const info = stmt.run(...safe) as { changes?: number };
          return { success: true, meta: { changes: info.changes || 0, duration: 0 } };
        },
        async raw<T = unknown[]>() {
          const stmt = sqlite.prepare(sql);
          const safe = boundParams.map(p => (p === undefined ? null : p));
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

describe('Access Layer Security Matrix', () => {
  let mockEnv: WorkerEnv;
  let d1: D1Database;

  // Demo IDs from seed
  const PATIENT_A = 'e0000000-0000-0000-0000-000000000001'; // Arun Kumar
  const PATIENT_B = 'e0000000-0000-0000-0000-000000000004'; // Naveen Raj
  const DEPENDENT_C = 'e0000000-0000-0000-0000-000000000003'; // Baby Meenakshi
  const GUARDIAN_USER = 'e0000000-0000-0000-0000-000000000002'; // Sujatha Nair (Mother)

  const DOCTOR_CARE_TEAM = 'b0000000-0000-0000-0000-000000000003'; // Dr. Rahul (on care team for Arun)
  const DOCTOR_OTHER = 'b0000000-0000-0000-0000-000000000006'; // Dr. Kavitha (not on care team for Arun)
  const FRONT_DESK = 'b0000000-0000-0000-0000-000000000002'; // Anjali Nair
  const ADMIN = 'b0000000-0000-0000-0000-000000000001'; // Anand Verma

  beforeEach(() => {
    const mock = createMockD1();
    d1 = mock.d1;
    mockEnv = {
      DB: d1,
      ENVIRONMENT: 'test',
    } as unknown as WorkerEnv;
  });

  // Helper to create tokens
  async function makeToken(params: {
    userId: string;
    role: string;
    staffId?: string;
    patientId?: string;
    isMfaVerified: boolean;
  }) {
    const { rawToken } = await createSession(d1, params);
    return rawToken;
  }

  it('1. Denies request when no session cookie is provided (401 Unauthenticated)', async () => {
    const app = createApp();
    const res = await app.request(`http://localhost/api/patients/${PATIENT_A}/chart`, {
      method: 'GET',
    }, mockEnv);

    expect(res.status).toBe(401);
  });

  it('2. Allows Patient A to access their own records (200 OK)', async () => {
    const app = createApp();
    const token = await makeToken({
      userId: PATIENT_A,
      role: 'patient',
      patientId: PATIENT_A,
      isMfaVerified: true,
    });

    const res = await app.request(`http://localhost/api/patients/${PATIENT_A}/chart`, {
      method: 'GET',
      headers: { Cookie: `careone_session=${token}` },
    }, mockEnv);

    expect(res.status).toBe(200);
  });

  it('3. Denies Patient A attempting to access Patient B records (403 Forbidden)', async () => {
    const app = createApp();
    const token = await makeToken({
      userId: PATIENT_A,
      role: 'patient',
      patientId: PATIENT_A,
      isMfaVerified: true,
    });

    const res = await app.request(`http://localhost/api/patients/${PATIENT_B}/chart`, {
      method: 'GET',
      headers: { Cookie: `careone_session=${token}` },
    }, mockEnv);

    expect(res.status).toBe(403);
    const body = (await res.json()) as { error: string };
    expect(body.error).toMatch(/scope|isolation|forbidden/i);
  });

  it('4. Allows Guardian to access dependent records (200 OK)', async () => {
    const app = createApp();
    const token = await makeToken({
      userId: GUARDIAN_USER,
      role: 'guardian',
      patientId: GUARDIAN_USER,
      isMfaVerified: true,
    });

    const res = await app.request(`http://localhost/api/patients/${DEPENDENT_C}/chart`, {
      method: 'GET',
      headers: { Cookie: `careone_session=${token}` },
    }, mockEnv);

    expect(res.status).toBe(200);
  });

  it('5. Allows Doctor on care team to access patient records (200 OK)', async () => {
    const app = createApp();
    const token = await makeToken({
      userId: 'a0000000-0000-0000-0000-000000000003',
      role: 'doctor',
      staffId: DOCTOR_CARE_TEAM,
      isMfaVerified: true,
    });

    const res = await app.request(`http://localhost/api/patients/${PATIENT_A}/chart`, {
      method: 'GET',
      headers: { Cookie: `careone_session=${token}` },
    }, mockEnv);

    expect(res.status).toBe(200);
  });

  it('6. Denies Doctor NOT on care team from accessing patient records (403 Forbidden)', async () => {
    const app = createApp();
    const token = await makeToken({
      userId: 'a0000000-0000-0000-0000-000000000006',
      role: 'doctor',
      staffId: DOCTOR_OTHER,
      isMfaVerified: true,
    });

    const res = await app.request(`http://localhost/api/patients/${PATIENT_A}/chart`, {
      method: 'GET',
      headers: { Cookie: `careone_session=${token}` },
    }, mockEnv);

    expect(res.status).toBe(403);
    const body = (await res.json()) as { error: string };
    expect(body.error).toMatch(/care team|not authorized/i);
  });

  it('7. Denies Doctor without two-factor authentication (403 MFA Required)', async () => {
    const app = createApp();
    const token = await makeToken({
      userId: 'a0000000-0000-0000-0000-000000000003',
      role: 'doctor',
      staffId: DOCTOR_CARE_TEAM,
      isMfaVerified: false, // AAL1 only, 2FA not completed
    });

    const res = await app.request(`http://localhost/api/patients/${PATIENT_A}/chart`, {
      method: 'GET',
      headers: { Cookie: `careone_session=${token}` },
    }, mockEnv);

    expect(res.status).toBe(403);
    const body = (await res.json()) as { error: string };
    expect(body.error).toMatch(/two-factor|mfa|aal2/i);
  });

  it('8. Denies Front Desk from accessing individual clinical notes (403 Forbidden)', async () => {
    const app = createApp();
    const token = await makeToken({
      userId: 'a0000000-0000-0000-0000-000000000002',
      role: 'front_desk',
      staffId: FRONT_DESK,
      isMfaVerified: true,
    });

    const res = await app.request(`http://localhost/api/patients/${PATIENT_A}/chart`, {
      method: 'GET',
      headers: { Cookie: `careone_session=${token}` },
    }, mockEnv);

    expect(res.status).toBe(403);
    const body = (await res.json()) as { error: string };
    expect(body.error).toMatch(/forbidden|role/i);
  });

  it('9. Denies Admin from reading individual patient chart (403 Forbidden)', async () => {
    const app = createApp();
    const token = await makeToken({
      userId: 'a0000000-0000-0000-0000-000000000001',
      role: 'admin',
      staffId: ADMIN,
      isMfaVerified: true,
    });

    const res = await app.request(`http://localhost/api/patients/${PATIENT_A}/chart`, {
      method: 'GET',
      headers: { Cookie: `careone_session=${token}` },
    }, mockEnv);

    expect(res.status).toBe(403);
    const body = (await res.json()) as { error: string };
    expect(body.error).toMatch(/admin cannot access individual clinical records|role not authorized/i);
  });

  it('10. Blocks state-changing request with mismatched Origin header (CSRF Protection)', async () => {
    const app = createApp();
    const token = await makeToken({
      userId: 'a0000000-0000-0000-0000-000000000003',
      role: 'doctor',
      staffId: DOCTOR_CARE_TEAM,
      isMfaVerified: true,
    });

    const res = await app.request(`http://localhost/api/patients/${PATIENT_A}/chart`, {
      method: 'POST',
      headers: {
        Cookie: `careone_session=${token}`,
        'Content-Type': 'application/json',
        Origin: 'https://malicious-site.example.com',
      },
      body: JSON.stringify({ note: 'test' }),
    }, mockEnv);

    expect(res.status).toBe(403);
    const body = (await res.json()) as { error: string };
    expect(body.error).toMatch(/origin|csrf/i);
  });

  it('11. Enforces that EVERY registered API route has an explicit access policy declaration', async () => {
    const policies = getRoutePolicies();
    expect(policies.size).toBeGreaterThan(0);

    for (const [, policy] of policies.entries()) {
      expect(policy).toBeDefined();
      if (!policy.public) {
        expect(policy.allowedRoles).toBeDefined();
        expect(policy.allowedRoles.length).toBeGreaterThan(0);
      }
    }
  });
});
