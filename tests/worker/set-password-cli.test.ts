// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { updateUserPasswordInDb } from '../../scripts/set-password';
import { verifyPassword } from '../../worker/auth/password';

describe('Task 4: set-password CLI and Demo Accounts Seeding', () => {
  const schemaDbPath = path.resolve(__dirname, '../../migrations/0001_schema.sql');
  const schemaGuardsPath = path.resolve(__dirname, '../../migrations/0002_guards.sql');
  const schemaStaffEmailPath = path.resolve(__dirname, '../../migrations/0012_staff_email.sql');
  const schemaPasswordAuthPath = path.resolve(__dirname, '../../migrations/0013_username_password_auth.sql');
  const schemaSeedDemoPath = path.resolve(__dirname, '../../migrations/0014_seed_demo_users.sql');
  const seedPath = path.resolve(__dirname, '../../seed/seed.sql');

  let dbSqlite: DatabaseSync;

  beforeEach(() => {
    dbSqlite = new DatabaseSync(':memory:');
    dbSqlite.exec(fs.readFileSync(schemaDbPath, 'utf8'));
    dbSqlite.exec(fs.readFileSync(schemaGuardsPath, 'utf8'));
    if (fs.existsSync(seedPath)) {
      dbSqlite.exec(fs.readFileSync(seedPath, 'utf8'));
    }
    if (fs.existsSync(schemaStaffEmailPath)) {
      dbSqlite.exec(fs.readFileSync(schemaStaffEmailPath, 'utf8'));
    }
    if (fs.existsSync(schemaPasswordAuthPath)) {
      dbSqlite.exec(fs.readFileSync(schemaPasswordAuthPath, 'utf8'));
    }
    if (fs.existsSync(schemaSeedDemoPath)) {
      dbSqlite.exec(fs.readFileSync(schemaSeedDemoPath, 'utf8'));
    }
  });

  it('updateUserPasswordInDb updates hash, bumps session_version, clears lockout, and logs audit', async () => {
    // 1. Setup user with lockout and must_change_password
    dbSqlite.prepare(`
      UPDATE users
      SET must_change_password = 1, failed_attempts = 3, locked_until = datetime('now', '+10 minutes')
      WHERE username = 'admin@example.com'
    `).run();

    // 2. Set new password via CLI logic
    const result = await updateUserPasswordInDb(dbSqlite, 'admin@example.com', 'NewSecurePass2026!');

    expect(result.ok).toBe(true);
    expect(result.username).toBe('admin@example.com');
    expect(result.session_version).toBe(2);

    // 3. Verify in database
    interface UserRow {
      password_hash: string;
      password_salt: string;
      password_iterations: number;
      must_change_password: number;
      session_version: number;
      failed_attempts: number;
      locked_until: string | null;
    }

    const row = dbSqlite.prepare('SELECT * FROM users WHERE username = ?').get('admin@example.com') as unknown as UserRow;
    expect(row.must_change_password).toBe(0);
    expect(row.session_version).toBe(2);
    expect(row.failed_attempts).toBe(0);
    expect(row.locked_until).toBeNull();

    const matches = await verifyPassword('NewSecurePass2026!', row.password_hash, row.password_salt, row.password_iterations);
    expect(matches).toBe(true);

    // 4. Verify audit_log entry
    interface AuditRow {
      action: string;
      actor_id: string;
      reason: string;
    }
    const audit = dbSqlite.prepare("SELECT action, actor_id, reason FROM audit_log WHERE action = 'PASSWORD_RESET_CLI'").get() as unknown as AuditRow;
    expect(audit).toBeTruthy();
    expect(audit.actor_id).toBe('cli');
  });

  it('updateUserPasswordInDb throws on unknown user', async () => {
    await expect(
      updateUserPasswordInDb(dbSqlite, 'nonexistent@example.com', 'NewSecurePass2026!')
    ).rejects.toThrow(/User with username "nonexistent@example.com" not found/i);
  });

  it('updateUserPasswordInDb throws on rule violation (e.g. password equal to username)', async () => {
    await expect(
      updateUserPasswordInDb(dbSqlite, 'dr.rahul@example.com', 'dr.rahul@example.com')
    ).rejects.toThrow(/cannot be the same as your username/i);
  });

  it('seeds all required demo accounts with DemoPassword123! and must_change_password=0', async () => {
    if (!fs.existsSync(schemaSeedDemoPath)) {
      throw new Error('0014_seed_demo_users.sql migration does not exist yet');
    }

    const demoAccounts = [
      'admin@example.com',
      'desk@example.com',
      'dr.rahul@example.com',
      'dr.anjali@example.com',
      'dr.thomas@example.com',
      'ABC-1001',
      'ABC-1002',
    ];

    for (const username of demoAccounts) {
      interface Row {
        username: string;
        password_hash: string;
        password_salt: string;
        password_iterations: number;
        must_change_password: number;
        is_active: number;
      }
      const user = dbSqlite.prepare('SELECT * FROM users WHERE username = ? COLLATE NOCASE').get(username) as unknown as Row | undefined;
      expect(user, `User ${username} should exist in users table`).toBeTruthy();
      expect(user!.must_change_password).toBe(0);
      expect(user!.is_active).toBe(1);

      const isValid = await verifyPassword('DemoPassword123!', user!.password_hash, user!.password_salt, user!.password_iterations);
      expect(isValid, `Password DemoPassword123! should match for ${username}`).toBe(true);
    }
  });
});
