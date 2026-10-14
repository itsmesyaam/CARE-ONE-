#!/usr/bin/env node
import crypto from 'node:crypto';
import { execSync } from 'node:child_process';
import type { DatabaseSync } from 'node:sqlite';

export interface StaffRecord {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  role: string;
  is_active: number;
}

export interface BootstrapResult {
  token: string;
  tokenHash: string;
  tokenId: string;
  staff: StaffRecord;
}

/**
 * Generates a 32-byte cryptographic hex token and its SHA-256 hash.
 */
export async function generateBootstrapToken(): Promise<{ token: string; tokenHash: string }> {
  const rawBytes = new Uint8Array(32);
  crypto.getRandomValues(rawBytes);
  const token = Array.from(rawBytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  const encoder = new TextEncoder();
  const hashBuf = await crypto.subtle.digest('SHA-256', encoder.encode(token));
  const tokenHash = Array.from(new Uint8Array(hashBuf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  return { token, tokenHash };
}

/**
 * Formats the setup link URL.
 */
export function formatSetupUrl(token: string, isRemote: boolean): string {
  const origin = isRemote
    ? 'https://care-one.syam18official.workers.dev'
    : 'http://localhost:5173';
  return `${origin}/setup?token=${token}`;
}

/**
 * Database operation helper for unit testing with in-memory SQLite.
 */
export async function createStaffSetupTokenInDb(
  db: DatabaseSync,
  email: string
): Promise<BootstrapResult> {
  const staff = db
    .prepare('SELECT id, user_id, email, full_name, role, is_active FROM staff WHERE email = ? AND deleted_at IS NULL')
    .get(email.trim().toLowerCase()) as StaffRecord | undefined;

  if (!staff || staff.is_active !== 1) {
    throw new Error(`Staff member with email "${email}" not found or is inactive.`);
  }

  const { token, tokenHash } = await generateBootstrapToken();
  const tokenId = `st_boot_${Date.now()}_${token.slice(0, 8)}`;

  db.prepare(`
    INSERT INTO setup_tokens (id, user_id, token_hash, purpose, created_by, expires_at)
    VALUES (?, ?, ?, 'staff_setup', 'bootstrap-cli', datetime('now', '+30 minutes'))
  `).run(tokenId, staff.id, tokenHash);

  db.prepare(`
    INSERT INTO audit_log (at, actor_id, action, table_name, record_id, reason)
    VALUES (datetime('now'), 'bootstrap-cli', 'BOOTSTRAP_SETUP_LINK_CREATED', 'setup_tokens', ?, 'bootstrap setup link created')
  `).run(tokenId);

  return { token, tokenHash, tokenId, staff };
}

/**
 * CLI execution entrypoint
 */
export async function runCli(): Promise<void> {
  const args = process.argv.slice(2);
  let email = '';
  let isRemote = true; // default to remote production per prompt

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--email' && args[i + 1]) {
      email = args[i + 1]!.trim().toLowerCase();
      i++;
    } else if (arg?.startsWith('--email=')) {
      email = arg.split('=')[1]?.trim().toLowerCase() || '';
    } else if (arg === '--remote') {
      isRemote = true;
    } else if (arg === '--local') {
      isRemote = false;
    }
  }

  if (!email) {
    console.error('Usage: npm run bootstrap:setup-link -- --email <staff-email> [--remote | --local]');
    process.exit(1);
  }

  const d1Flag = isRemote ? '--remote' : '--local';

  try {
    // 1. Look up staff in D1
    const queryStaffSql = `SELECT id, user_id, email, full_name, role, is_active FROM staff WHERE email = '${email.replace(/'/g, "''")}' AND deleted_at IS NULL;`;
    const lookupCmd = `cmd /c npx wrangler d1 execute careone-db ${d1Flag} --json --command="${queryStaffSql}"`;
    
    const lookupRaw = execSync(lookupCmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
    const parsed = JSON.parse(lookupRaw) as Array<{ results?: StaffRecord[] }>;
    const staffRows = parsed[0]?.results || [];

    if (staffRows.length === 0) {
      console.error(`Error: Staff member with email "${email}" not found.`);
      process.exit(1);
    }

    const staff = staffRows[0]!;
    if (staff.is_active !== 1) {
      console.error(`Error: Staff member "${staff.full_name}" (${staff.email}) is deactivated.`);
      process.exit(1);
    }

    // 2. Generate 32-byte token and hash
    const { token, tokenHash } = await generateBootstrapToken();
    const tokenId = `st_boot_${Date.now()}_${token.slice(0, 8)}`;

    // 3. Insert setup_tokens and audit_log via D1 batch/command
    const insertSql = `
      INSERT INTO setup_tokens (id, user_id, token_hash, purpose, created_by, expires_at)
      VALUES ('${tokenId}', '${staff.id}', '${tokenHash}', 'staff_setup', 'bootstrap-cli', datetime('now', '+30 minutes'));
      INSERT INTO audit_log (at, actor_id, action, table_name, record_id, reason)
      VALUES (datetime('now'), 'bootstrap-cli', 'BOOTSTRAP_SETUP_LINK_CREATED', 'setup_tokens', '${tokenId}', 'bootstrap setup link created');
    `.replace(/\r?\n/g, ' ');

    const insertCmd = `cmd /c npx wrangler d1 execute careone-db ${d1Flag} --command="${insertSql.replace(/"/g, '\\"')}"`;
    execSync(insertCmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });

    // 4. Output the link once
    const setupUrl = formatSetupUrl(token, isRemote);
    console.log(`\nStaff setup link generated for ${staff.full_name} (${staff.role}):`);
    console.log(setupUrl);
    console.log('\n(This link is valid for 30 minutes, single use. Do not share or log this URL.)\n');
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Failed to generate staff bootstrap setup link:', msg);
    process.exit(1);
  }
}

// Auto-run when executed directly via CLI
if (process.argv[1]?.includes('bootstrap-staff-setup')) {
  void runCli();
}
