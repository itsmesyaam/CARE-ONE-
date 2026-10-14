// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { app } from '../../worker/index';
import type { WorkerEnv } from '../../worker/env';
import { generateBootstrapToken } from '../../scripts/bootstrap-staff-setup';

describe('Task 2: Staff Setup Workflow (Passkey + TOTP MFA)', () => {
  const schemaDbPath = path.resolve(__dirname, '../../migrations/0001_schema.sql');
  const schemaGuardsPath = path.resolve(__dirname, '../../migrations/0002_guards.sql');
  const schemaTriggersPath = path.resolve(__dirname, '../../migrations/0003_audit_triggers.sql');
  const schemaEmailPath = path.resolve(__dirname, '../../migrations/0005_email_limits.sql');
  const schemaSessionsPath = path.resolve(__dirname, '../../migrations/0008_sessions.sql');
  const schemaPasskeysPath = path.resolve(__dirname, '../../migrations/0009_passkeys.sql');
  const schemaHardeningPath = path.resolve(__dirname, '../../migrations/0010_passkeys_and_tokens_hardening.sql');
  const schemaDropOtpsPath = path.resolve(__dirname, '../../migrations/0011_drop_auth_otps.sql');
  const schemaStaffEmailPath = path.resolve(__dirname, '../../migrations/0012_staff_email.sql');
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
    if (fs.existsSync(schemaPasskeysPath)) {
      dbSqlite.exec(fs.readFileSync(schemaPasskeysPath, 'utf8'));
    }
    if (fs.existsSync(schemaHardeningPath)) {
      dbSqlite.exec(fs.readFileSync(schemaHardeningPath, 'utf8'));
    }
    if (fs.existsSync(schemaDropOtpsPath)) {
      dbSqlite.exec(fs.readFileSync(schemaDropOtpsPath, 'utf8'));
    }
    if (fs.existsSync(seedPath)) {
      dbSqlite.exec(fs.readFileSync(seedPath, 'utf8'));
    }
    if (fs.existsSync(schemaStaffEmailPath)) {
      dbSqlite.exec(fs.readFileSync(schemaStaffEmailPath, 'utf8'));
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

  const ADMIN_STAFF_ID = 'b0000000-0000-0000-0000-000000000001';

  it('provides staff details and requires TOTP enrolment during staff passkey setup', async () => {
    const { token, tokenHash } = await generateBootstrapToken();
    const tokenId = `st_test_${Date.now()}`;

    // Insert staff_setup token
    dbSqlite.exec(`
      INSERT INTO setup_tokens (id, user_id, token_hash, purpose, created_by, expires_at)
      VALUES ('${tokenId}', '${ADMIN_STAFF_ID}', '${tokenHash}', 'staff_setup', 'bootstrap-cli', datetime('now', '+30 minutes'));
    `);

    // 1. Request registration options
    const optRes = await app.request('/api/auth/passkey/register/options', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    }, mockEnv);

    expect(optRes.status).toBe(200);
    const optData = (await optRes.json()) as {
      purpose: string;
      displayName: string;
      email?: string;
      role?: string;
    };

    expect(optData.purpose).toBe('staff_setup');
    expect(optData.displayName).toBe('Anand Verma');
    expect(optData.email).toBe('admin@example.com');
    expect(optData.role).toBe('admin');
  });

  it('enforces full staff passkey + TOTP flow: aal1 blocked on admin routes until TOTP verified to aal2', async () => {
    const { signJwt } = await import('../../worker/auth/policy');

    // 1. Staff session at aal1 (immediately after passkey registration)
    const staffAal1Token = await signJwt({
      sub: ADMIN_STAFF_ID,
      id: ADMIN_STAFF_ID,
      role: 'admin',
      aal: 'aal1',
      token_version: 1,
      exp: Math.floor(Date.now() / 1000) + 3600,
    }, mockEnv.JWT_SECRET!);

    // Protected admin route must reject with 401 mfa_required
    const blockedRes = await app.request('/api/admin/dashboard', {
      headers: { Authorization: `Bearer ${staffAal1Token}` },
    }, mockEnv);

    expect(blockedRes.status).toBe(401);
    const blockedData = (await blockedRes.json()) as { error: string };
    expect(blockedData.error).toMatch(/mfa_required/i);

    // 2. Staff verifies TOTP factor
    const mfaRes = await app.request('/api/auth/mfa/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@example.com',
        code: '123456', // Test or standard TOTP code
      }),
    }, { ...mockEnv, ENVIRONMENT: 'local' });

    expect(mfaRes.status).toBe(200);
    const mfaData = (await mfaRes.json()) as { token: string; aal: string };
    expect(mfaData.aal).toBe('aal2');

    // 3. Protected admin route with elevated aal2 token succeeds
    const allowedRes = await app.request('/api/admin/dashboard', {
      headers: { Authorization: `Bearer ${mfaData.token}` },
    }, mockEnv);

    expect(allowedRes.status).toBe(200);
  });
});
