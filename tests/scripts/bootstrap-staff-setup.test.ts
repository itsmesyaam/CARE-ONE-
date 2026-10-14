// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import {
  generateBootstrapToken,
  createStaffSetupTokenInDb,
  formatSetupUrl,
} from '../../scripts/bootstrap-staff-setup';

describe('Task 1: Bootstrap Staff Setup Script', () => {
  const schemaDbPath = path.resolve(__dirname, '../../migrations/0001_schema.sql');
  const schemaGuardsPath = path.resolve(__dirname, '../../migrations/0002_guards.sql');
  const schemaTriggersPath = path.resolve(__dirname, '../../migrations/0003_audit_triggers.sql');
  const schemaEmailPath = path.resolve(__dirname, '../../migrations/0005_email_limits.sql');
  const schemaPasskeysPath = path.resolve(__dirname, '../../migrations/0009_passkeys.sql');
  const schemaHardeningPath = path.resolve(__dirname, '../../migrations/0010_passkeys_and_tokens_hardening.sql');
  const schemaDropOtpsPath = path.resolve(__dirname, '../../migrations/0011_drop_auth_otps.sql');
  const schemaStaffEmailPath = path.resolve(__dirname, '../../migrations/0012_staff_email.sql');
  const seedPath = path.resolve(__dirname, '../../seed/seed.sql');

  let db: DatabaseSync;

  beforeEach(() => {
    db = new DatabaseSync(':memory:');
    db.exec(fs.readFileSync(schemaDbPath, 'utf8'));
    db.exec(fs.readFileSync(schemaGuardsPath, 'utf8'));
    if (fs.existsSync(schemaTriggersPath)) {
      db.exec(fs.readFileSync(schemaTriggersPath, 'utf8'));
    }
    db.exec(fs.readFileSync(schemaEmailPath, 'utf8'));
    db.exec(fs.readFileSync(schemaPasskeysPath, 'utf8'));
    db.exec(fs.readFileSync(schemaHardeningPath, 'utf8'));
    db.exec(fs.readFileSync(schemaDropOtpsPath, 'utf8'));
    if (fs.existsSync(seedPath)) {
      db.exec(fs.readFileSync(seedPath, 'utf8'));
    }
    if (fs.existsSync(schemaStaffEmailPath)) {
      db.exec(fs.readFileSync(schemaStaffEmailPath, 'utf8'));
    }
  });

  it('generates a 32-byte cryptographic hex token and matching SHA-256 hash', async () => {
    const { token, tokenHash } = await generateBootstrapToken();
    expect(token).toHaveLength(64); // 32 bytes = 64 hex characters
    expect(/^[0-9a-f]{64}$/.test(token)).toBe(true);

    const encoder = new TextEncoder();
    const digestBuf = await crypto.subtle.digest('SHA-256', encoder.encode(token));
    const expectedHash = Array.from(new Uint8Array(digestBuf))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    expect(tokenHash).toBe(expectedHash);
  });

  it('rejects nonexistent or inactive staff emails', async () => {
    // 1. Non-existent email
    await expect(
      createStaffSetupTokenInDb(db, 'nonexistent@example.com')
    ).rejects.toThrow(/not found or is inactive/i);

    // 2. Inactive staff member
    db.exec("UPDATE staff SET is_active = 0 WHERE email = 'admin@example.com';");
    await expect(
      createStaffSetupTokenInDb(db, 'admin@example.com')
    ).rejects.toThrow(/not found or is inactive/i);
  });

  it('successfully creates setup token and audit log for active staff member', async () => {
    const result = await createStaffSetupTokenInDb(db, 'admin@example.com');

    expect(result.token).toHaveLength(64);
    expect(result.staff.email).toBe('admin@example.com');
    expect(result.staff.role).toBe('admin');

    // 1. Check setup_tokens table record
    const tokenRow = db
      .prepare('SELECT * FROM setup_tokens WHERE token_hash = ?')
      .get(result.tokenHash) as {
      user_id: string;
      purpose: string;
      created_by: string;
      expires_at: string;
      used_at: string | null;
    } | undefined;

    expect(tokenRow).toBeDefined();
    expect(tokenRow?.user_id).toBe(result.staff.id);
    expect(tokenRow?.purpose).toBe('staff_setup');
    expect(tokenRow?.created_by).toBe('bootstrap-cli');
    expect(tokenRow?.used_at).toBeNull();

    // 2. Raw token must NEVER be stored in the database
    const rawMatch = db
      .prepare('SELECT id FROM setup_tokens WHERE id = ? OR token_hash = ?')
      .get(result.token, result.token) as unknown;
    expect(rawMatch).toBeUndefined();

    // 3. Check audit_log record
    const auditRow = db
      .prepare(
        "SELECT * FROM audit_log WHERE action = 'BOOTSTRAP_SETUP_LINK_CREATED' AND record_id = ?"
      )
      .get(result.tokenId) as {
      actor_id: string;
      action: string;
      table_name: string;
      reason: string;
    } | undefined;

    expect(auditRow).toBeDefined();
    expect(auditRow?.actor_id).toBe('bootstrap-cli');
    expect(auditRow?.reason).toBe('bootstrap setup link created');
  });

  it('formats setup URL correctly for remote and local environments', () => {
    const dummyToken = 'a'.repeat(64);

    const remoteUrl = formatSetupUrl(dummyToken, true);
    expect(remoteUrl).toBe(`https://care-one.syam18official.workers.dev/setup?token=${dummyToken}`);

    const localUrl = formatSetupUrl(dummyToken, false);
    expect(localUrl).toBe(`http://localhost:5173/setup?token=${dummyToken}`);
  });
});
