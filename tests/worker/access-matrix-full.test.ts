// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { app } from '../../worker/index';
import type { WorkerEnv } from '../../worker/env';

describe('Step 2: Full 8-Role Access Matrix & Security Attack Tests', () => {
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
    const schemaSessionsPath = path.resolve(__dirname, '../../migrations/0008_sessions.sql');
    if (fs.existsSync(schemaSessionsPath)) {
      dbSqlite.exec(fs.readFileSync(schemaSessionsPath, 'utf8'));
    }
    const schemaStaffEmailPath = path.resolve(__dirname, '../../migrations/0012_staff_email.sql');
    if (fs.existsSync(schemaStaffEmailPath)) {
      dbSqlite.exec(fs.readFileSync(schemaStaffEmailPath, 'utf8'));
    }
    const schemaAuthPath = path.resolve(__dirname, '../../migrations/0013_username_password_auth.sql');
    if (fs.existsSync(schemaAuthPath)) {
      dbSqlite.exec(fs.readFileSync(schemaAuthPath, 'utf8'));
    }
    if (fs.existsSync(seedPath)) {
      dbSqlite.exec(fs.readFileSync(seedPath, 'utf8'));
    }
    const schemaSeedUsersPath = path.resolve(__dirname, '../../migrations/0014_seed_demo_users.sql');
    if (fs.existsSync(schemaSeedUsersPath)) {
      dbSqlite.exec(fs.readFileSync(schemaSeedUsersPath, 'utf8'));
    }

    mockEnv = {
      DB: createD1Mock(dbSqlite),
      FILES_DB: createD1Mock(dbSqlite),
      REMINDERS: {} as Queue<unknown>,
      ENVIRONMENT: 'production',
      JWT_SECRET: 'test-jwt-secret-key-32-bytes-minimum-length!!',
      RESEND_API_KEY: 're_test_mock_key',
    };
  });

  // Identifiers from seed.sql:
  const ARUN_PATIENT_ID = 'e0000000-0000-0000-0000-000000000001';
  const SUJATHA_PATIENT_ID = 'e0000000-0000-0000-0000-000000000002';
  const CHILD_MEENAKSHI_ID = 'e0000000-0000-0000-0000-000000000003';
  const NAVEEN_PSYCH_ID = 'e0000000-0000-0000-0000-000000000004';
  const UNLINKED_PATIENT_ID = 'e0000000-0000-0000-0000-000000000005';

  const DR_RAHUL_STAFF_ID = 'b0000000-0000-0000-0000-000000000003'; // Gen Med
  const DR_ANJALI_STAFF_ID = 'b0000000-0000-0000-0000-000000000004'; // Cardio
  const DR_THOMAS_STAFF_ID = 'b0000000-0000-0000-0000-000000000005'; // Ortho
  const DR_KAVITHA_STAFF_ID = 'b0000000-0000-0000-0000-000000000006'; // Psych
  const DESK_STAFF_ID = 'b0000000-0000-0000-0000-000000000002';
  const ADMIN_STAFF_ID = 'b0000000-0000-0000-0000-000000000001';

  // Helper to recursively collect all JSON keys
  function getAllKeys(obj: unknown, prefix = ''): string[] {
    if (!obj || typeof obj !== 'object') return [];
    if (Array.isArray(obj)) {
      return obj.flatMap((item) => getAllKeys(item, prefix));
    }
    const keys: string[] = [];
    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      keys.push(key);
      keys.push(...getAllKeys(value, fullKey));
    }
    return keys;
  }

  // 1. Patient Arun Kumar
  describe('1. Patient Arun Kumar', () => {
    const arunHeaders = {
      'x-actor-id': ARUN_PATIENT_ID,
      'x-actor-role': 'patient',
      'x-actor-aal': 'aal1',
    };

    it('reads own records with 200 and exact data', async () => {
      const res = await app.request('/api/patient/home', { headers: arunHeaders }, mockEnv);
      expect(res.status).toBe(200);
      const data = (await res.json()) as { patient: { id: string }; medications: unknown[] };
      expect(data.patient.id).toBe(ARUN_PATIENT_ID);
      expect(data.medications.length).toBeGreaterThan(0);
    });

    it('ATTACK: changing patient id in URL to another patient returns 404 (never 403)', async () => {
      const resHome = await app.request(`/api/patient/home?patient_id=${UNLINKED_PATIENT_ID}`, { headers: arunHeaders }, mockEnv);
      expect(resHome.status).toBe(404);

      const resRecords = await app.request(`/api/patient/records?patient_id=${UNLINKED_PATIENT_ID}`, { headers: arunHeaders }, mockEnv);
      expect(resRecords.status).toBe(404);

      const resAppts = await app.request(`/api/patient/appointments?patient_id=${UNLINKED_PATIENT_ID}`, { headers: arunHeaders }, mockEnv);
      expect(resAppts.status).toBe(404);

      const resCarePlan = await app.request(`/api/patient/care-plan?patient_id=${UNLINKED_PATIENT_ID}`, { headers: arunHeaders }, mockEnv);
      expect(resCarePlan.status).toBe(404);
    });

    it('ATTACK: changing patient id in body payload returns 404', async () => {
      const resReading = await app.request('/api/patient/readings', {
        method: 'POST',
        headers: { ...arunHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_id: UNLINKED_PATIENT_ID,
          kind: 'Blood Pressure',
          value_text: '120/80',
        }),
      }, mockEnv);
      expect(resReading.status).toBe(404);

      const resSymptom = await app.request('/api/patient/symptoms', {
        method: 'POST',
        headers: { ...arunHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_id: UNLINKED_PATIENT_ID,
          description: 'Attacking symptoms for another patient',
        }),
      }, mockEnv);
      expect(resSymptom.status).toBe(404);
    });
  });

  // 2. Guardian Sujatha Nair
  describe('2. Guardian Sujatha Nair', () => {
    const sujathaHeaders = {
      'x-actor-id': SUJATHA_PATIENT_ID,
      'x-actor-role': 'guardian',
      'x-actor-aal': 'aal1',
    };

    it('reads linked child records with 200', async () => {
      const res = await app.request(`/api/patient/records?patient_id=${CHILD_MEENAKSHI_ID}`, { headers: sujathaHeaders }, mockEnv);
      expect(res.status).toBe(200);
      const data = (await res.json()) as { encounters: unknown[]; documents: unknown[] };
      expect(data).toHaveProperty('encounters');
    });

    it('ATTACK: reads non-linked patient/child returns 404', async () => {
      const res = await app.request(`/api/patient/records?patient_id=${ARUN_PATIENT_ID}`, { headers: sujathaHeaders }, mockEnv);
      expect(res.status).toBe(404);

      const resOther = await app.request(`/api/patient/records?patient_id=${UNLINKED_PATIENT_ID}`, { headers: sujathaHeaders }, mockEnv);
      expect(resOther.status).toBe(404);
    });
  });

  // 3. Care-team Doctor Dr. Rahul Menon
  describe('3. Care-team Doctor Dr. Rahul Menon', () => {
    const drRahulHeaders = {
      'x-actor-id': DR_RAHUL_STAFF_ID,
      'x-actor-role': 'doctor',
      'x-actor-aal': 'aal2',
    };

    it('reads Arun Kumar chart with 200 and exact counts', async () => {
      const res = await app.request(`/api/doctor/patients/${ARUN_PATIENT_ID}/chart`, { headers: drRahulHeaders }, mockEnv);
      expect(res.status).toBe(200);
      const data = (await res.json()) as {
        allergies: unknown[];
        conditions: unknown[];
        encounters: unknown[];
        medications: unknown[];
      };
      expect(data.allergies.length).toBe(1);
      expect(data.conditions.length).toBe(2);
      expect(data.medications.length).toBe(2);
      expect(data.encounters.length).toBe(3);
    });
  });

  // 4. Specialist Doctor Dr. Anjali Pillai
  describe('4. Specialist Doctor Dr. Anjali Pillai (Cardiology)', () => {
    const drAnjaliHeaders = {
      'x-actor-id': DR_ANJALI_STAFF_ID,
      'x-actor-role': 'doctor',
      'x-actor-aal': 'aal2',
    };

    it('can access Arun Kumar chart (linked via care team referral)', async () => {
      const res = await app.request(`/api/doctor/patients/${ARUN_PATIENT_ID}/chart`, { headers: drAnjaliHeaders }, mockEnv);
      expect(res.status).toBe(200);
    });

    it('cannot view restricted Psychiatry encounter', async () => {
      // Naveen Raj has an encounter authored by Psychiatry department
      // Even if emergency access or care team link was granted, restricted encounter is department-scoped
      // Let's grant emergency access to test departmental restriction on encounters
      await app.request(`/api/doctor/patients/${NAVEEN_PSYCH_ID}/emergency-access`, {
        method: 'POST',
        headers: { ...drAnjaliHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Patient brought with chest palpitations in emergency room' }),
      }, mockEnv);

      const res = await app.request(`/api/doctor/patients/${NAVEEN_PSYCH_ID}/chart`, { headers: drAnjaliHeaders }, mockEnv);
      expect(res.status).toBe(200);
      const data = (await res.json()) as { encounters: Array<{ sensitivity: string; department_id: string }> };
      // Dr. Anjali is in Cardiology, not Psychiatry -> restricted note must NOT appear
      const psychEncounters = data.encounters.filter((e) => e.sensitivity === 'restricted');
      expect(psychEncounters.length).toBe(0);
    });

    it('Psychiatrist Dr. Kavitha sees the restricted encounter in her department', async () => {
      const drKavithaHeaders = {
        'x-actor-id': DR_KAVITHA_STAFF_ID,
        'x-actor-role': 'doctor',
        'x-actor-aal': 'aal2',
      };
      const res = await app.request(`/api/doctor/patients/${NAVEEN_PSYCH_ID}/chart`, { headers: drKavithaHeaders }, mockEnv);
      expect(res.status).toBe(200);
      const data = (await res.json()) as { encounters: Array<{ sensitivity: string }> };
      expect(data.encounters.some((e) => e.sensitivity === 'restricted')).toBe(true);
    });
  });

  // 5. Unlinked Doctor Dr. Thomas Varghese
  describe('5. Unlinked Doctor Dr. Thomas Varghese', () => {
    const drThomasHeaders = {
      'x-actor-id': DR_THOMAS_STAFF_ID,
      'x-actor-role': 'doctor',
      'x-actor-aal': 'aal2',
    };

    it('ATTACK: opening unlinked chart returns 404 (not 403) until emergency access', async () => {
      const res = await app.request(`/api/doctor/patients/${ARUN_PATIENT_ID}/chart`, { headers: drThomasHeaders }, mockEnv);
      expect(res.status).toBe(404);
    });

    it('emergency break-glass activates 4h access, then chart returns 200', async () => {
      const resBreak = await app.request(`/api/doctor/patients/${ARUN_PATIENT_ID}/emergency-access`, {
        method: 'POST',
        headers: { ...drThomasHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Acute knee trauma and fracture dislocation in casualty' }),
      }, mockEnv);
      expect(resBreak.status).toBe(200);

      const resChart = await app.request(`/api/doctor/patients/${ARUN_PATIENT_ID}/chart`, { headers: drThomasHeaders }, mockEnv);
      expect(resChart.status).toBe(200);
    });
  });

  // 6. Front Desk Anjali Nair
  describe('6. Front Desk Anjali Nair', () => {
    const deskHeaders = {
      'x-actor-id': DESK_STAFF_ID,
      'x-actor-role': 'front_desk',
      'x-actor-aal': 'aal2',
    };

    it('can access desk patient registration and appointments', async () => {
      const res = await app.request('/api/desk/patients?search=Arun', { headers: deskHeaders }, mockEnv);
      expect(res.status).toBe(200);
    });

    it('ATTACK: desk tries to read clinical notes/chart/medicines → 404', async () => {
      const resChart = await app.request(`/api/doctor/patients/${ARUN_PATIENT_ID}/chart`, { headers: deskHeaders }, mockEnv);
      expect(resChart.status).toBe(404);

      const resPatientRecords = await app.request(`/api/patient/records?patient_id=${ARUN_PATIENT_ID}`, { headers: deskHeaders }, mockEnv);
      expect(resPatientRecords.status).toBe(404);

      const resEncounters = await app.request('/api/doctor/encounters', {
        method: 'POST',
        headers: { ...deskHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ patient_id: ARUN_PATIENT_ID, chief_complaint: 'test' }),
      }, mockEnv);
      expect(resEncounters.status).toBe(404);
    });
  });

  // 7. Hospital Admin Anand Verma
  describe('7. Hospital Admin Anand Verma', () => {
    const adminHeaders = {
      'x-actor-id': ADMIN_STAFF_ID,
      'x-actor-role': 'admin',
      'x-actor-aal': 'aal2',
    };

    it('ATTACK: admin tries every clinical route → 404', async () => {
      const resChart = await app.request(`/api/doctor/patients/${ARUN_PATIENT_ID}/chart`, { headers: adminHeaders }, mockEnv);
      expect(resChart.status).toBe(404);

      const resWhatChanged = await app.request(`/api/doctor/patients/${ARUN_PATIENT_ID}/what-changed`, { headers: adminHeaders }, mockEnv);
      expect(resWhatChanged.status).toBe(404);

      const resPatientRecords = await app.request(`/api/patient/records?patient_id=${ARUN_PATIENT_ID}`, { headers: adminHeaders }, mockEnv);
      expect(resPatientRecords.status).toBe(404);

      const resReview = await app.request('/api/doctor/review', { headers: adminHeaders }, mockEnv);
      expect(resReview.status).toBe(404);
    });

    it('admin responses contain ZERO clinical fields (scanned keys)', async () => {
      const forbiddenClinicalKeys = [
        'clinical_notes',
        'prescriptions',
        'chief_complaint',
        'diagnosis',
        'allergies',
        'medications',
        'examination',
      ];

      // 1. Admin dashboard
      const dashRes = await app.request('/api/admin/dashboard', { headers: adminHeaders }, mockEnv);
      expect(dashRes.status).toBe(200);
      const dashData = await dashRes.json();
      const dashKeys = getAllKeys(dashData);
      for (const fKey of forbiddenClinicalKeys) {
        expect(dashKeys).not.toContain(fKey);
      }

      // 2. Admin staff directory
      const staffRes = await app.request('/api/admin/staff', { headers: adminHeaders }, mockEnv);
      expect(staffRes.status).toBe(200);
      const staffData = await staffRes.json();
      const staffKeys = getAllKeys(staffData);
      for (const fKey of forbiddenClinicalKeys) {
        expect(staffKeys).not.toContain(fKey);
      }

      // 3. Admin audit logs
      const auditRes = await app.request('/api/admin/audit-logs', { headers: adminHeaders }, mockEnv);
      expect(auditRes.status).toBe(200);
      const auditData = await auditRes.json();
      const auditKeys = getAllKeys(auditData);
      for (const fKey of forbiddenClinicalKeys) {
        expect(auditKeys).not.toContain(fKey);
      }
    });
  });

  // 8. Doctor Session & State Invariants
  describe('8. Doctor Session & State Invariants', () => {
    it('returns 401 unauthorized on every staff route without a valid session', async () => {
      const routes = [
        { path: '/api/doctor/today', method: 'GET' },
        { path: '/api/doctor/patients', method: 'GET' },
        { path: `/api/doctor/patients/${ARUN_PATIENT_ID}/chart`, method: 'GET' },
        { path: '/api/doctor/review', method: 'GET' },
        { path: '/api/doctor/account', method: 'GET' },
      ];

      for (const route of routes) {
        const res = await app.request(route.path, { method: route.method }, mockEnv);
        expect(res.status).toBe(401);
      }
    });

    it('returns 401 account_inactive when doctor account is deactivated (is_active = 0)', async () => {
      dbSqlite.exec(`UPDATE staff SET is_active = 0 WHERE id = '${DR_RAHUL_STAFF_ID}';`);
      dbSqlite.exec(`UPDATE users SET is_active = 0 WHERE record_id = '${DR_RAHUL_STAFF_ID}' OR id = '${DR_RAHUL_STAFF_ID}';`);
      const res = await app.request('/api/doctor/today', {
        headers: {
          'x-actor-id': DR_RAHUL_STAFF_ID,
          'x-actor-role': 'doctor',
        },
      }, mockEnv);
      expect(res.status).toBe(401);
      const data = (await res.json()) as { error: string };
      expect(data.error).toBe('account_inactive');
    });

    it('returns 403 password_change_required when doctor must change password', async () => {
      dbSqlite.exec(`UPDATE staff SET is_active = 1 WHERE id = '${DR_RAHUL_STAFF_ID}';`);
      dbSqlite.exec(`UPDATE users SET is_active = 1, must_change_password = 1 WHERE record_id = '${DR_RAHUL_STAFF_ID}' OR username = 'dr.rahul@example.com';`);
      const res = await app.request('/api/doctor/today', {
        headers: {
          'x-actor-id': DR_RAHUL_STAFF_ID,
          'x-actor-role': 'doctor',
        },
      }, mockEnv);
      expect(res.status).toBe(403);
      const data = (await res.json()) as { error: string };
      expect(data.error).toBe('password_change_required');
    });
  });
});
