// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';

describe('Task 1: Passkeys & WebAuthn Database Schema Migration', () => {
  const schemaDbPath = path.resolve(__dirname, '../../migrations/0001_schema.sql');
  const schemaGuardsPath = path.resolve(__dirname, '../../migrations/0002_guards.sql');
  const schemaOtpsPath = path.resolve(__dirname, '../../migrations/0007_auth_otps.sql');
  const schemaPasskeysPath = path.resolve(__dirname, '../../migrations/0009_passkeys.sql');

  it('verifies that migration 0009_passkeys.sql exists and applies cleanly over existing schema', () => {
    expect(fs.existsSync(schemaPasskeysPath)).toBe(true);

    const db = new DatabaseSync(':memory:');
    db.exec(fs.readFileSync(schemaDbPath, 'utf8'));
    db.exec(fs.readFileSync(schemaGuardsPath, 'utf8'));
    db.exec(fs.readFileSync(schemaOtpsPath, 'utf8'));

    // Apply passkeys migration
    db.exec(fs.readFileSync(schemaPasskeysPath, 'utf8'));

    // 1. Table passkeys must exist with correct columns
    const passkeyCols = db
      .prepare('PRAGMA table_info(passkeys);')
      .all() as Array<{ name: string; type: string; notnull: number; pk: number }>;

    const passkeyColNames = passkeyCols.map((c) => c.name);
    expect(passkeyColNames).toContain('id');
    expect(passkeyColNames).toContain('user_id');
    expect(passkeyColNames).toContain('credential_id');
    expect(passkeyColNames).toContain('public_key');
    expect(passkeyColNames).toContain('counter');
    expect(passkeyColNames).toContain('transports');
    expect(passkeyColNames).toContain('device_label');
    expect(passkeyColNames).toContain('created_at');
    expect(passkeyColNames).toContain('last_used_at');
    expect(passkeyColNames).toContain('revoked_at');

    // 2. Table setup_tokens must exist with correct columns
    const setupTokenCols = db
      .prepare('PRAGMA table_info(setup_tokens);')
      .all() as Array<{ name: string; type: string; notnull: number; pk: number }>;

    const setupColNames = setupTokenCols.map((c) => c.name);
    expect(setupColNames).toContain('id');
    expect(setupColNames).toContain('user_id');
    expect(setupColNames).toContain('token_hash');
    expect(setupColNames).toContain('purpose');
    expect(setupColNames).toContain('created_by');
    expect(setupColNames).toContain('expires_at');
    expect(setupColNames).toContain('used_at');
    expect(setupColNames).toContain('created_at');

    // 3. Table webauthn_challenges must exist with correct columns
    const challengeCols = db
      .prepare('PRAGMA table_info(webauthn_challenges);')
      .all() as Array<{ name: string; type: string }>;

    const challengeColNames = challengeCols.map((c) => c.name);
    expect(challengeColNames).toContain('id');
    expect(challengeColNames).toContain('challenge');
    expect(challengeColNames).toContain('user_id');
    expect(challengeColNames).toContain('expires_at');
    expect(challengeColNames).toContain('created_at');

    // 4. auth_otps table MUST be dropped
    const otpsTable = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'auth_otps';")
      .get() as { name: string } | undefined;
    expect(otpsTable).toBeUndefined();

    // 5. Unique constraint on credential_id enforced
    db.prepare(`
      INSERT INTO passkeys (id, user_id, credential_id, public_key, counter)
      VALUES ('pk-1', 'u-1', 'cred-abc', 'pub-key-1', 0);
    `).run();

    expect(() => {
      db.prepare(`
        INSERT INTO passkeys (id, user_id, credential_id, public_key, counter)
        VALUES ('pk-2', 'u-2', 'cred-abc', 'pub-key-2', 0);
      `).run();
    }).toThrow(/UNIQUE constraint failed/i);
  });
});
