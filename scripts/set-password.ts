#!/usr/bin/env node
import { execSync } from 'node:child_process';
import readline from 'node:readline';
import type { DatabaseSync } from 'node:sqlite';
import { hashPassword, validatePasswordRules } from '../worker/auth/password';

export interface UserLookupRow {
  id: string;
  username: string;
  role: string;
  record_id: string | null;
  session_version: number;
  is_active: number;
}

export interface SetPasswordResult {
  ok: boolean;
  username: string;
  session_version: number;
  user_id: string;
}

/**
 * Updates a user's password directly in an SQLite DatabaseSync instance (for tests and local dev).
 */
export async function updateUserPasswordInDb(
  db: DatabaseSync,
  username: string,
  newPassword: string
): Promise<SetPasswordResult> {
  const cleanUsername = username.trim();

  // 1. Look up user
  const user = db
    .prepare('SELECT id, username, role, record_id, session_version, is_active FROM users WHERE username = ? COLLATE NOCASE')
    .get(cleanUsername) as UserLookupRow | undefined;

  if (!user) {
    throw new Error(`User with username "${cleanUsername}" not found.`);
  }

  // 2. Validate password rules
  const ruleCheck = validatePasswordRules(newPassword, cleanUsername);
  if (!ruleCheck.valid) {
    throw new Error(`Password rule violation: ${ruleCheck.errors.join(', ')}`);
  }

  // 3. Hash password using native WebCrypto PBKDF2 (50,000 iterations)
  const { hash, salt, iterations } = await hashPassword(newPassword);
  const nextSessionVersion = (user.session_version ?? 1) + 1;

  // 4. Update users table and insert audit entry
  db.prepare(`
    UPDATE users
    SET password_hash = ?,
        password_salt = ?,
        password_iterations = ?,
        must_change_password = 0,
        failed_attempts = 0,
        locked_until = NULL,
        session_version = ?,
        password_changed_at = datetime('now'),
        is_active = 1,
        updated_at = datetime('now')
    WHERE id = ?
  `).run(hash, salt, iterations, nextSessionVersion, user.id);

  db.prepare(`
    INSERT INTO audit_log (at, actor_id, action, table_name, record_id, reason)
    VALUES (datetime('now'), 'cli', 'PASSWORD_RESET_CLI', 'users', ?, 'Set password via admin CLI')
  `).run(user.id);

  return {
    ok: true,
    username: user.username,
    session_version: nextSessionVersion,
    user_id: user.id,
  };
}

/**
 * Prompts user for password input from terminal.
 */
function promptPassword(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    // Simple prompt without displaying plain text in log files
    process.stdout.write(prompt);
    rl.question('', (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

/**
 * CLI execution entrypoint via wrangler d1 execute.
 */
export async function runCli(): Promise<void> {
  const args = process.argv.slice(2);
  let username = '';
  let passwordArg = '';
  let isRemote = true; // Default to remote production per prompt

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--username' && args[i + 1]) {
      username = args[i + 1]!.trim();
      i++;
    } else if (arg?.startsWith('--username=')) {
      username = arg.split('=')[1]?.trim() || '';
    } else if (arg === '--password' && args[i + 1]) {
      passwordArg = args[i + 1]!;
      i++;
    } else if (arg?.startsWith('--password=')) {
      passwordArg = arg.split('=')[1] || '';
    } else if (arg === '--remote') {
      isRemote = true;
    } else if (arg === '--local') {
      isRemote = false;
    }
  }

  if (!username) {
    console.error('Usage: npm run set-password -- --username <user> [--remote | --local] [--password <pass>]');
    process.exit(1);
  }

  // If password was not passed via flag, prompt interactively
  const newPassword = passwordArg || (await promptPassword(`Enter new password for ${username}: `));

  if (!newPassword) {
    console.error('Error: Password cannot be empty.');
    process.exit(1);
  }

  // Validate password rules
  const ruleCheck = validatePasswordRules(newPassword, username);
  if (!ruleCheck.valid) {
    console.error(`Error: Password requirements not met:\n  - ${ruleCheck.errors.join('\n  - ')}`);
    process.exit(1);
  }

  // Hash password using native WebCrypto PBKDF2 (50,000 iterations)
  const { hash, salt, iterations } = await hashPassword(newPassword);
  const d1Flag = isRemote ? '--remote' : '--local';

  console.log(`Setting password for "${username}" in Cloudflare D1 (${isRemote ? 'remote' : 'local'})...`);

  try {
    // 1. Look up user in D1
    const safeUsername = username.replace(/'/g, "''");
    const lookupSql = `SELECT id, username, role, session_version FROM users WHERE username = '${safeUsername}' COLLATE NOCASE LIMIT 1;`;
    const lookupCmd = `cmd /c npx wrangler d1 execute careone-db ${d1Flag} --json --command="${lookupSql}"`;

    const lookupRaw = execSync(lookupCmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
    const parsed = JSON.parse(lookupRaw) as Array<{ results?: UserLookupRow[] }>;
    const userRows = parsed[0]?.results || [];

    if (userRows.length === 0) {
      console.error(`Error: User with username "${username}" not found in users table.`);
      process.exit(1);
    }

    const user = userRows[0]!;
    const nextSessionVersion = (user.session_version ?? 1) + 1;

    // 2. Update password hash, bump session_version, and log audit
    const updateSql = `
      UPDATE users
      SET password_hash = '${hash}',
          password_salt = '${salt}',
          password_iterations = ${iterations},
          must_change_password = 0,
          failed_attempts = 0,
          locked_until = NULL,
          session_version = ${nextSessionVersion},
          password_changed_at = datetime('now'),
          is_active = 1,
          updated_at = datetime('now')
      WHERE id = '${user.id}';
      INSERT INTO audit_log (at, actor_id, action, table_name, record_id, reason)
      VALUES (datetime('now'), 'cli', 'PASSWORD_RESET_CLI', 'users', '${user.id}', 'Set password via admin CLI');
    `.replace(/\r?\n\s+/g, ' ').trim();

    const updateCmd = `cmd /c npx wrangler d1 execute careone-db ${d1Flag} --command="${updateSql}"`;
    execSync(updateCmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'inherit'] });

    console.log(`\nSuccess! Password updated for "${username}".`);
    console.log(`- Session version bumped to ${nextSessionVersion} (all other active sessions signed out).`);
    console.log(`- Account unlocked and must_change_password cleared.`);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Failed to update password: ${message}`);
    process.exit(1);
  }
}

// Auto-run if executed directly
if (process.argv[1]?.endsWith('set-password.ts') || process.argv[1]?.endsWith('set-password.js')) {
  void runCli();
}
