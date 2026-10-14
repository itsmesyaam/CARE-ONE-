// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { app } from '../../worker/index';
import type { WorkerEnv } from '../../worker/env';

describe('Step 2: Role Access Matrix & Real Route Security', () => {
  const schemaDbPath = path.resolve(__dirname, '../../migrations/0001_schema.sql');
  const schemaGuardsPath = path.resolve(__dirname, '../../migrations/0002_guards.sql');
  const schemaTriggersPath = path.resolve(__dirname, '../../migrations/0003_audit_triggers.sql');
  const schemaEmailPath = path.resolve(__dirname, '../../migrations/0005_email_limits.sql');
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
    if (fs.existsSync(schemaTriggersPath)) {
      dbSqlite.exec(fs.readFileSync(schemaTriggersPath, 'utf8'));
    }
    dbSqlite.exec(fs.readFileSync(schemaEmailPath, 'utf8'));
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
      ENVIRONMENT: 'test',
      JWT_SECRET: 'test-jwt-secret-key-32-bytes-minimum-length!!',
    };
  });

  // Role 1: Admin
  describe('Role: Admin (Anand Verma - b0000000-0000-0000-0000-000000000001)', () => {
    const adminHeaders = {
      'x-actor-id': 'b0000000-0000-0000-0000-000000000001',
      'x-actor-role': 'admin',
    };

    it('can view dashboard aggregate counts without patient clinical rows', async () => {
      const res = await app.request('/api/admin/dashboard', { headers: adminHeaders }, mockEnv);
      expect(res.status).toBe(200);
      const data = (await res.json()) as Record<string, unknown>;
      expect(data).toHaveProperty('today_appointments');
      expect(data).toHaveProperty('invited_patients');
      // Admin dashboard must NEVER expose individual patient identifiers or clinical notes
      expect(data).not.toHaveProperty('patients');
      expect(data).not.toHaveProperty('clinical_notes');
    });

    it('can view audit logs', async () => {
      const res = await app.request('/api/admin/audit-logs', { headers: adminHeaders }, mockEnv);
      expect(res.status).toBe(200);
      const data = (await res.json()) as unknown[];
      expect(Array.isArray(data)).toBe(true);
    });

    it('is strictly forbidden from reading individual clinical charts (DPDP compliance)', async () => {
      const arunPatientId = 'e0000000-0000-0000-0000-000000000001';
      const res = await app.request(
        `/api/doctor/patients/${arunPatientId}/chart`,
        { headers: adminHeaders },
        mockEnv
      );
      expect([403, 404]).toContain(res.status);
    });
  });

  // Role 2: Doctor on Care Team (Dr. Rahul Menon)
  describe('Role: Doctor on Care Team (Dr. Rahul - b0000000-0000-0000-0000-000000000003)', () => {
    const drRahulHeaders = {
      'x-actor-id': 'b0000000-0000-0000-0000-000000000003',
      'x-actor-role': 'doctor',
    };
    const arunPatientId = 'e0000000-0000-0000-0000-000000000001';

    it('can fetch today schedule', async () => {
      const res = await app.request('/api/doctor/today', { headers: drRahulHeaders }, mockEnv);
      expect(res.status).toBe(200);
      const data = (await res.json()) as Record<string, unknown>;
      expect(data).toHaveProperty('appointments');
      expect(data).toHaveProperty('pendingReportsCount');
    });

    it('can read Arun Kumar clinical chart (on care team)', async () => {
      const res = await app.request(
        `/api/doctor/patients/${arunPatientId}/chart`,
        { headers: drRahulHeaders },
        mockEnv
      );
      expect(res.status).toBe(200);
      const data = (await res.json()) as Record<string, unknown>;
      expect(data).toHaveProperty('patient');
      expect(data).toHaveProperty('allergies');
      expect(data).toHaveProperty('encounters');
    });

    it('can fetch What Changed since last visit for Arun Kumar', async () => {
      const res = await app.request(
        `/api/doctor/patients/${arunPatientId}/what-changed`,
        { headers: drRahulHeaders },
        mockEnv
      );
      expect(res.status).toBe(200);
      const data = (await res.json()) as unknown[];
      expect(Array.isArray(data)).toBe(true);
    });

    it('can sign a clinical consultation note with request context audit', async () => {
      const notePayload = {
        patient_id: arunPatientId,
        chief_complaint: 'Routine follow-up',
        clinical_notes: 'BP stable. Patient adhering to medication plan.',
        diagnosis: 'Essential Hypertension',
      };
      const res = await app.request(
        '/api/doctor/encounters',
        {
          method: 'POST',
          headers: { ...drRahulHeaders, 'Content-Type': 'application/json' },
          body: JSON.stringify(notePayload),
        },
        mockEnv
      );
      expect(res.status).toBe(200);
      const data = (await res.json()) as { ok: boolean; encounter_id: string };
      expect(data.ok).toBe(true);
      expect(data.encounter_id).toBeDefined();
    });
  });

  // Role 3: Doctor Outside Care Team (Dr. Thomas Varghese)
  describe('Role: Doctor Outside Care Team (Dr. Thomas - b0000000-0000-0000-0000-000000000005)', () => {
    const drThomasHeaders = {
      'x-actor-id': 'b0000000-0000-0000-0000-000000000005',
      'x-actor-role': 'doctor',
    };
    const arunPatientId = 'e0000000-0000-0000-0000-000000000001';

    it('is refused access to Arun Kumar chart without emergency break-glass', async () => {
      const res = await app.request(
        `/api/doctor/patients/${arunPatientId}/chart`,
        { headers: drThomasHeaders },
        mockEnv
      );
      expect([403, 404]).toContain(res.status);
    });

    it('rejects emergency access if written reason is too short (< 15 chars)', async () => {
      const res = await app.request(
        `/api/doctor/patients/${arunPatientId}/emergency-access`,
        {
          method: 'POST',
          headers: { ...drThomasHeaders, 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason: 'Emergency' }),
        },
        mockEnv
      );
      expect(res.status).toBe(400);
    });

    it('grants 4-hour access after valid break-glass, allowing chart access and logging audit', async () => {
      // 1. Break glass
      const breakRes = await app.request(
        `/api/doctor/patients/${arunPatientId}/emergency-access`,
        {
          method: 'POST',
          headers: { ...drThomasHeaders, 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason: 'Patient arrived in casualty with acute chest distress' }),
        },
        mockEnv
      );
      expect(breakRes.status).toBe(200);

      // 2. Access chart now permitted
      const chartRes = await app.request(
        `/api/doctor/patients/${arunPatientId}/chart`,
        { headers: drThomasHeaders },
        mockEnv
      );
      expect(chartRes.status).toBe(200);

      // 3. Verify audit log entry was written
      const auditRes = await app.request(
        '/api/admin/audit-logs',
        { headers: { 'x-actor-id': 'b0000000-0000-0000-0000-000000000001', 'x-actor-role': 'admin' } },
        mockEnv
      );
      const logs = (await auditRes.json()) as Array<{ action: string; patient_id?: string }>;
      expect(logs.some((l) => l.action === 'EMERGENCY_ACCESS' && l.patient_id === arunPatientId)).toBe(true);
    });
  });

  // Role 4: Front Desk (Anjali Nair)
  describe('Role: Front Desk (Anjali Nair - b0000000-0000-0000-0000-000000000002)', () => {
    const deskHeaders = {
      'x-actor-id': 'b0000000-0000-0000-0000-000000000002',
      'x-actor-role': 'front_desk',
    };
    const arunPatientId = 'e0000000-0000-0000-0000-000000000001';

    it('can view departments and appointments directory', async () => {
      const res = await app.request('/api/departments', { headers: deskHeaders }, mockEnv);
      expect(res.status).toBe(200);
    });

    it('cannot view clinical consultation charts or encounters', async () => {
      const res = await app.request(
        `/api/doctor/patients/${arunPatientId}/chart`,
        { headers: deskHeaders },
        mockEnv
      );
      expect([403, 404]).toContain(res.status);
    });
  });

  // Role 5: Patient (Arun Kumar)
  describe('Role: Patient (Arun Kumar - e0000000-0000-0000-0000-000000000001)', () => {
    const arunHeaders = {
      'x-actor-id': 'e0000000-0000-0000-0000-000000000001',
      'x-actor-role': 'patient',
    };
    const otherPatientId = 'e0000000-0000-0000-0000-000000000002';

    it('can fetch own portal home summary and care plan', async () => {
      const res = await app.request('/api/patient/home', { headers: arunHeaders }, mockEnv);
      expect(res.status).toBe(200);
      const data = (await res.json()) as Record<string, unknown>;
      expect(data).toHaveProperty('patient');
      expect(data).toHaveProperty('carePlan');
    });

    it('is strictly forbidden from reading another patient records (403)', async () => {
      const res = await app.request(
        `/api/patient/records?patient_id=${otherPatientId}`,
        { headers: arunHeaders },
        mockEnv
      );
      expect([403, 404]).toContain(res.status);
    });

    it('can record a vitals reading (blood pressure)', async () => {
      const readingPayload = {
        kind: 'Blood Pressure',
        value_text: '128/82',
        unit: 'mmHg',
      };
      const res = await app.request(
        '/api/patient/readings',
        {
          method: 'POST',
          headers: { ...arunHeaders, 'Content-Type': 'application/json' },
          body: JSON.stringify(readingPayload),
        },
        mockEnv
      );
      expect(res.status).toBe(200);
    });
  });
});
