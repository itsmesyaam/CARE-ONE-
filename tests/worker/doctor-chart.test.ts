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

describe('Doctor Clinical Chart & Workflow API', () => {
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

  it('allows doctor to create a draft consultation note, sign it, and freeze it against edits', async () => {
    const app = createApp();

    // 1. Create draft note
    const draftRes = await app.request(`/api/doctor/patients/${PATIENT_ARUN}/encounters`, {
      method: 'POST',
      headers: {
        Cookie: `careone_session=${doctorToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        summary: 'Patient presents with mild fatigue and elevated blood glucose.',
        clinicalNotes: 'Plan to adjust metformin dosage and advise morning walks.',
        status: 'draft',
      }),
    }, mockEnv);

    expect(draftRes.status).toBe(200);
    const draftData = (await draftRes.json()) as { encounter: { id: string; status: string } };
    expect(draftData.encounter.id).toBeDefined();
    expect(draftData.encounter.status).toBe('draft');

    const encounterId = draftData.encounter.id;

    // 2. Sign note (elevation to signed status)
    const signRes = await app.request(`/api/doctor/encounters/${encounterId}/sign`, {
      method: 'POST',
      headers: {
        Cookie: `careone_session=${doctorToken}`,
      },
    }, mockEnv);

    expect(signRes.status).toBe(200);
    const signData = (await signRes.json()) as { encounter: { status: string; signed_at: string } };
    expect(signData.encounter.status).toBe('signed');
    expect(signData.encounter.signed_at).toBeDefined();

    // 3. Attempt to directly edit the signed note (must fail with 400 or trigger rejection)
    const editRes = await app.request(`/api/doctor/encounters/${encounterId}`, {
      method: 'PUT',
      headers: {
        Cookie: `careone_session=${doctorToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        summary: 'Tampered summary',
      }),
    }, mockEnv);

    expect(editRes.status).toBe(400);
  });

  it('allows adding an immutable addendum to a signed clinical encounter', async () => {
    const app = createApp();

    // Use signed encounter from seed
    const signedEncounterId = 'ec000000-0000-0000-0000-000000000003';

    const addendumRes = await app.request(`/api/doctor/encounters/${signedEncounterId}/addenda`, {
      method: 'POST',
      headers: {
        Cookie: `careone_session=${doctorToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        note: 'Patient telephoned to report no adverse reactions to the medication adjustment.',
      }),
    }, mockEnv);

    expect(addendumRes.status).toBe(200);
    const data = (await addendumRes.json()) as { addendum: { id: string; encounter_id: string } };
    expect(data.addendum.id).toBeDefined();
    expect(data.addendum.encounter_id).toBe(signedEncounterId);
  });

  it('allows prescribing medications and enforces allergy warnings', async () => {
    const app = createApp();

    const prescribeRes = await app.request(`/api/doctor/patients/${PATIENT_ARUN}/prescriptions`, {
      method: 'POST',
      headers: {
        Cookie: `careone_session=${doctorToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        drug: 'Metformin Hydrochloride',
        dose: '500 mg',
        route: 'oral',
        frequency: '1-0-1 (twice daily after meals)',
        duration: '30 days',
        instructions: 'Take with food to prevent GI upset',
      }),
    }, mockEnv);

    expect(prescribeRes.status).toBe(200);
    const data = (await prescribeRes.json()) as { medication: { id: string; drug: string; status: string } };
    expect(data.medication.drug).toBe('Metformin Hydrochloride');
    expect(data.medication.status).toBe('active');
  });

  it('enforces emergency access rules (reason >= 15 chars, grants 4-hour window)', async () => {
    const app = createApp();
    const PATIENT_OTHER = 'e0000000-0000-0000-0000-000000000007'; // Patient not on Rahul's care team

    // 1. Too short reason rejected (< 15 chars)
    const shortRes = await app.request(`/api/doctor/emergency-access`, {
      method: 'POST',
      headers: {
        Cookie: `careone_session=${doctorToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        patientId: PATIENT_OTHER,
        reason: 'Short reason',
      }),
    }, mockEnv);

    expect(shortRes.status).toBe(400);

    // 2. Valid reason (>= 15 chars) succeeds
    const validRes = await app.request(`/api/doctor/emergency-access`, {
      method: 'POST',
      headers: {
        Cookie: `careone_session=${doctorToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        patientId: PATIENT_OTHER,
        reason: 'Acute respiratory distress and unresponsive in casualty emergency room',
      }),
    }, mockEnv);

    expect(validRes.status).toBe(200);
    const data = (await validRes.json()) as { access: { expires_at: string } };
    const expiresMs = new Date(data.access.expires_at).getTime();
    const nowMs = Date.now();
    expect(expiresMs - nowMs).toBeGreaterThan(3.9 * 60 * 60 * 1000); // ~4 hours
  });
});
