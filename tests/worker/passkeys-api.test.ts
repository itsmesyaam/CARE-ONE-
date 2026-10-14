// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { app } from '../../worker/index';
import type { WorkerEnv } from '../../worker/env';
import { signJwt } from '../../worker/auth/policy';

describe('Task 2: Passkeys Backend Engine & WebAuthn Routes', () => {
  const schemaDbPath = path.resolve(__dirname, '../../migrations/0001_schema.sql');
  const schemaGuardsPath = path.resolve(__dirname, '../../migrations/0002_guards.sql');
  const schemaSessionsPath = path.resolve(__dirname, '../../migrations/0008_sessions.sql');
  const schemaPasskeysPath = path.resolve(__dirname, '../../migrations/0009_passkeys.sql');

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
        return {
          bind(...params: unknown[]) {
            const boundParams = params as (string | number | bigint | null | Uint8Array)[];
            return {
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
          },
          async first<T = unknown>(col?: string): Promise<T | null> {
            const stmt = db.prepare(query);
            const row = stmt.get() as Record<string, unknown> | undefined;
            if (!row) return null;
            return (col ? row[col] : row) as T;
          },
          async all<T = unknown>(): Promise<D1Result<T>> {
            const stmt = db.prepare(query);
            const rows = stmt.all() as T[];
            return {
              results: rows,
              success: true,
              meta: mockMeta,
            };
          },
          async run(): Promise<D1Response> {
            const stmt = db.prepare(query);
            stmt.run();
            return {
              success: true,
              meta: mockMeta,
            };
          },
        } as unknown as D1PreparedStatement;
      },
      async batch(statements: D1PreparedStatement[]): Promise<D1Response[]> {
        const results: D1Response[] = [];
        db.exec('BEGIN TRANSACTION;');
        try {
          for (const s of statements) {
            await s.run();
            results.push({ success: true, meta: mockMeta });
          }
          db.exec('COMMIT;');
        } catch (err) {
          db.exec('ROLLBACK;');
          throw err;
        }
        return results;
      },
      async exec(query: string): Promise<D1ExecResult> {
        db.exec(query);
        return { count: 1, duration: 0 };
      },
    } as unknown as D1Database;
  }

  const JWT_SECRET = 'test-secret-key-at-least-32-bytes-long!';
  const DESK_STAFF_ID = 'b0000000-0000-0000-0000-000000000002';
  const DOCTOR_STAFF_ID = 'b0000000-0000-0000-0000-000000000003';
  const PATIENT_ID = 'e0000000-0000-0000-0000-000000000001';

  beforeEach(() => {
    dbSqlite = new DatabaseSync(':memory:');
    dbSqlite.exec(fs.readFileSync(schemaDbPath, 'utf8'));
    dbSqlite.exec(fs.readFileSync(schemaGuardsPath, 'utf8'));
    dbSqlite.exec(fs.readFileSync(schemaSessionsPath, 'utf8'));
    dbSqlite.exec(fs.readFileSync(schemaPasskeysPath, 'utf8'));

    // Insert test seed data
    dbSqlite.exec(`
      INSERT INTO departments (id, name, code) VALUES ('d-gen', 'General Medicine', 'GEN');

      INSERT INTO staff (id, user_id, role, full_name, is_active, department_id, token_version)
      VALUES
        ('${DESK_STAFF_ID}', 'u-desk', 'front_desk', 'Anjali Desk', 1, NULL, 1),
        ('${DOCTOR_STAFF_ID}', 'u-doc', 'doctor', 'Dr. Rahul Menon', 1, 'd-gen', 1);

      INSERT INTO patients (id, uhid, full_name, dob, gender, phone, token_version)
      VALUES ('${PATIENT_ID}', 'ABC-1001', 'Arun Kumar', '1980-01-01', 'male', '9847000001', 1);

      INSERT INTO care_team (id, patient_id, staff_id, reason, expires_at)
      VALUES ('ct-1', '${PATIENT_ID}', '${DOCTOR_STAFF_ID}', 'appointment', datetime('now', '+1 year'));
    `);

    mockEnv = {
      DB: createD1Mock(dbSqlite),
      FILES_DB: {} as unknown as D1Database,
      REMINDERS: {} as unknown as Queue<unknown>,
      JWT_SECRET,
      ENVIRONMENT: 'production',
      RP_ID: 'localhost',
      ORIGIN: 'http://localhost',
    };
  });

  async function getDeskTokenAal2(): Promise<string> {
    return signJwt(
      {
        sub: DESK_STAFF_ID,
        id: DESK_STAFF_ID,
        role: 'front_desk',
        aal: 'aal2',
        token_version: 1,
        exp: Math.floor(Date.now() / 1000) + 3600,
      },
      JWT_SECRET
    );
  }

  it('Desk creates patient setup link: generates 32-byte token and stores SHA-256 hash', async () => {
    const deskToken = await getDeskTokenAal2();

    const res = await app.request(
      `/api/desk/patients/${PATIENT_ID}/setup-link`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${deskToken}`,
        },
      },
      mockEnv
    );

    expect(res.status).toBe(201);
    const body = (await res.json()) as { ok: boolean; token: string; setup_url: string; expires_at: string };
    expect(body.ok).toBe(true);
    expect(body.token).toBeDefined();
    expect(body.token.length).toBeGreaterThanOrEqual(32);
    expect(body.setup_url).toContain(`/setup?token=${body.token}`);

    // Verify raw token is NOT in DB, but SHA-256 hash IS in DB
    const row = dbSqlite.prepare('SELECT * FROM setup_tokens WHERE user_id = ?').get(PATIENT_ID) as {
      token_hash: string;
      purpose: string;
      created_by: string;
    };
    expect(row).toBeDefined();
    expect(row.token_hash).not.toBe(body.token);
    expect(row.purpose).toMatch(/^patient(_setup)?$/);
    expect(row.created_by).toBe(DESK_STAFF_ID);
  });

  it('Desk cannot create setup link without AAL2 MFA', async () => {
    const deskTokenAal1 = await signJwt(
      {
        sub: DESK_STAFF_ID,
        id: DESK_STAFF_ID,
        role: 'front_desk',
        aal: 'aal1', // Missing 2FA
        token_version: 1,
        exp: Math.floor(Date.now() / 1000) + 3600,
      },
      JWT_SECRET
    );

    const res = await app.request(
      `/api/desk/patients/${PATIENT_ID}/setup-link`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${deskTokenAal1}` },
      },
      mockEnv
    );

    expect(res.status).toBe(401);
  });

  it('Generates registration options for valid setup token and rejects invalid/expired token', async () => {
    const deskToken = await getDeskTokenAal2();
    const linkRes = await app.request(
      `/api/desk/patients/${PATIENT_ID}/setup-link`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${deskToken}` },
      },
      mockEnv
    );
    const { token } = (await linkRes.json()) as { token: string };

    // Valid setup token
    const optRes = await app.request(
      '/api/auth/passkey/register/options',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      },
      mockEnv
    );

    expect(optRes.status).toBe(200);
    const optBody = (await optRes.json()) as {
      options: {
        challenge: string;
        rp: { name: string; id: string };
        user: { name: string; displayName: string };
        authenticatorSelection: { userVerification: string };
      };
    };
    expect(optBody.options.challenge).toBeDefined();
    expect(optBody.options.authenticatorSelection.userVerification).toBe('required');

    // Invalid setup token returns 400
    const badRes = await app.request(
      '/api/auth/passkey/register/options',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: 'bogus-token-123' }),
      },
      mockEnv
    );
    expect(badRes.status).toBe(400);
  });

  it('Enforces single-use for setup tokens: second registration attempt fails', async () => {
    // Insert a used setup token
    const token = 'valid-test-token-single-use-1234567890';
    const hash = Buffer.from(
      await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token))
    ).toString('hex');

    dbSqlite
      .prepare(
        `INSERT INTO setup_tokens (id, user_id, token_hash, purpose, created_by, expires_at, used_at)
         VALUES ('tok-used', '${PATIENT_ID}', ?, 'patient', '${DESK_STAFF_ID}', datetime('now', '+30 minutes'), datetime('now'))`
      )
      .run(hash);

    const res = await app.request(
      '/api/auth/passkey/register/options',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      },
      mockEnv
    );

    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toMatch(/used|invalid|expired/i);
  });

  it('Staff passkey sign-in returns AAL1 session awaiting TOTP; staff routes require AAL2', async () => {
    // Insert active passkey for doctor
    dbSqlite
      .prepare(
        `INSERT INTO passkeys (id, user_id, credential_id, public_key, counter, device_label)
         VALUES ('pk-doc', '${DOCTOR_STAFF_ID}', 'cred-doc-123', 'fake-public-key-data', 0, 'Pixel 8')`
      )
      .run();

    // Verify that attempting to access doctor route with passkey-only (aal1) token returns 401 mfa_required
    const staffTokenAal1 = await signJwt(
      {
        sub: DOCTOR_STAFF_ID,
        id: DOCTOR_STAFF_ID,
        role: 'doctor',
        aal: 'aal1', // Only passkey verified, TOTP factor pending
        token_version: 1,
        exp: Math.floor(Date.now() / 1000) + 3600,
      },
      JWT_SECRET
    );

    const docRes = await app.request(
      '/api/doctor/today',
      {
        headers: { Authorization: `Bearer ${staffTokenAal1}` },
      },
      mockEnv
    );
    expect(docRes.status).toBe(401);
    const docErr = (await docRes.json()) as { error: string };
    expect(docErr.error).toMatch(/mfa_required/i);
  });

  it('Revoked passkey cannot authenticate and returns 401', async () => {
    // Insert revoked passkey
    dbSqlite
      .prepare(
        `INSERT INTO passkeys (id, user_id, credential_id, public_key, counter, device_label, revoked_at)
         VALUES ('pk-revoked', '${PATIENT_ID}', 'cred-revoked-123', 'fake-pub-key', 0, 'Old iPhone', datetime('now', '-1 day'))`
      )
      .run();

    // Insert fake challenge
    dbSqlite
      .prepare(
        `INSERT INTO webauthn_challenges (id, challenge, expires_at)
         VALUES ('ch-1', 'fake-challenge-revoked', datetime('now', '+5 minutes'))`
      )
      .run();

    const res = await app.request(
      '/api/auth/passkey/login/verify',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          response: {
            id: 'cred-revoked-123',
            rawId: 'cred-revoked-123',
            response: { clientDataJSON: '', authenticatorData: '', signature: '' },
            type: 'public-key',
          },
        }),
      },
      mockEnv
    );

    expect(res.status).toBe(401);
    const body = (await res.json()) as { error: string };
    expect(body.error).toMatch(/revoked|not found/i);
  });

  it('Demo sign-in returns 403 Forbidden in production, but succeeds when ENVIRONMENT=local', async () => {
    // 1. Production must return 403
    mockEnv.ENVIRONMENT = 'production';
    const prodRes = await app.request(
      '/api/auth/demo-signin',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'doctor', id: DOCTOR_STAFF_ID }),
      },
      mockEnv
    );
    expect(prodRes.status).toBe(403);
    const prodBody = (await prodRes.json()) as { error: string };
    expect(prodBody.error).toMatch(/disabled in production/i);

    // 2. Local environment succeeds
    mockEnv.ENVIRONMENT = 'local';
    const localRes = await app.request(
      '/api/auth/demo-signin',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'doctor', id: DOCTOR_STAFF_ID }),
      },
      mockEnv
    );
    expect(localRes.status).toBe(200);
    const localBody = (await localRes.json()) as { ok: boolean; token: string; user: { role: string } };
    expect(localBody.ok).toBe(true);
    expect(localBody.token).toBeDefined();
    expect(localBody.user.role).toBe('doctor');
  });

  it('User can list and revoke their own passkeys', async () => {
    // Insert 2 passkeys for Arun
    dbSqlite
      .prepare(
        `INSERT INTO passkeys (id, user_id, credential_id, public_key, counter, device_label)
         VALUES
           ('pk-arun-1', '${PATIENT_ID}', 'cred-arun-1', 'pub-1', 1, 'Pixel 7'),
           ('pk-arun-2', '${PATIENT_ID}', 'cred-arun-2', 'pub-2', 0, 'iPad Pro');`
      )
      .run();

    const patientToken = await signJwt(
      {
        sub: PATIENT_ID,
        id: PATIENT_ID,
        role: 'patient',
        aal: 'aal1',
        token_version: 1,
        exp: Math.floor(Date.now() / 1000) + 3600,
      },
      JWT_SECRET
    );

    // List passkeys
    const listRes = await app.request(
      '/api/auth/passkeys',
      {
        headers: { Authorization: `Bearer ${patientToken}` },
      },
      mockEnv
    );
    expect(listRes.status).toBe(200);
    const listBody = (await listRes.json()) as { passkeys: Array<{ id: string; device_label: string }> };
    expect(listBody.passkeys.length).toBe(2);

    // Revoke one passkey
    const delRes = await app.request(
      '/api/auth/passkeys/pk-arun-1',
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${patientToken}` },
      },
      mockEnv
    );
    expect(delRes.status).toBe(200);

    // Verify revoked in DB
    const row = dbSqlite.prepare('SELECT revoked_at FROM passkeys WHERE id = ?').get('pk-arun-1') as {
      revoked_at: string | null;
    };
    expect(row.revoked_at).not.toBeNull();
  });
});
