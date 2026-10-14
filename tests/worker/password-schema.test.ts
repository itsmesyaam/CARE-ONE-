// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';

describe('Task 1: Password Auth Schema Migration (0013_username_password_auth.sql)', () => {
  const schemaDbPath = path.resolve(__dirname, '../../migrations/0001_schema.sql');
  const schemaGuardsPath = path.resolve(__dirname, '../../migrations/0002_guards.sql');
  const schemaPasskeysPath = path.resolve(__dirname, '../../migrations/0009_passkeys.sql');
  const schemaPasskeysHardeningPath = path.resolve(__dirname, '../../migrations/0010_passkeys_and_tokens_hardening.sql');
  const schemaStaffEmailPath = path.resolve(__dirname, '../../migrations/0012_staff_email.sql');
  const schemaPasswordAuthPath = path.resolve(__dirname, '../../migrations/0013_username_password_auth.sql');

  let db: DatabaseSync;

  beforeEach(() => {
    db = new DatabaseSync(':memory:');
    db.exec(fs.readFileSync(schemaDbPath, 'utf8'));
    db.exec(fs.readFileSync(schemaGuardsPath, 'utf8'));
    if (fs.existsSync(schemaPasskeysPath)) {
      db.exec(fs.readFileSync(schemaPasskeysPath, 'utf8'));
    }
    if (fs.existsSync(schemaPasskeysHardeningPath)) {
      db.exec(fs.readFileSync(schemaPasskeysHardeningPath, 'utf8'));
    }
    if (fs.existsSync(schemaStaffEmailPath)) {
      db.exec(fs.readFileSync(schemaStaffEmailPath, 'utf8'));
    }
    if (fs.existsSync(schemaPasswordAuthPath)) {
      db.exec(fs.readFileSync(schemaPasswordAuthPath, 'utf8'));
    }
  });

  it('creates users table with username COLLATE NOCASE and required password columns', () => {
    const tableInfo = db.prepare('PRAGMA table_info(users);').all() as Array<{ name: string; type: string }>;
    const columnNames = tableInfo.map((c) => c.name);

    expect(columnNames).toContain('id');
    expect(columnNames).toContain('username');
    expect(columnNames).toContain('role');
    expect(columnNames).toContain('record_id');
    expect(columnNames).toContain('password_hash');
    expect(columnNames).toContain('password_salt');
    expect(columnNames).toContain('password_iterations');
    expect(columnNames).toContain('must_change_password');
    expect(columnNames).toContain('failed_attempts');
    expect(columnNames).toContain('locked_until');
    expect(columnNames).toContain('password_changed_at');
    expect(columnNames).toContain('session_version');
    expect(columnNames).toContain('is_active');
  });

  it('drops obsolete passkeys, setup_tokens, and webauthn_challenges tables', () => {
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table';").all() as Array<{ name: string }>;
    const tableNames = tables.map((t) => t.name);

    expect(tableNames).not.toContain('passkeys');
    expect(tableNames).not.toContain('setup_tokens');
    expect(tableNames).not.toContain('webauthn_challenges');
  });

  it('enforces case-insensitive uniqueness on username', () => {
    db.prepare(`
      INSERT INTO users (id, username, role, password_hash, password_salt, password_iterations)
      VALUES ('u1', 'admin@example.com', 'admin', 'hash', 'salt', 50000);
    `).run();

    expect(() => {
      db.prepare(`
        INSERT INTO users (id, username, role, password_hash, password_salt, password_iterations)
        VALUES ('u2', 'ADMIN@EXAMPLE.COM', 'admin', 'hash', 'salt', 50000);
      `).run();
    }).toThrow();
  });
});
