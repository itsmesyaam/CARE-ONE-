import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

console.log('[Demo Reset] Resetting local Cloudflare D1 and R2 data...');

// Remove local D1/R2 state if present to guarantee clean slate
const wranglerStateDir = path.resolve(process.cwd(), '.wrangler', 'state', 'v3');
if (fs.existsSync(wranglerStateDir)) {
  try {
    fs.rmSync(wranglerStateDir, { recursive: true, force: true });
    console.log('[Demo Reset] Cleaned existing .wrangler/state/v3 local state.');
  } catch (err) {
    console.warn('[Demo Reset] Could not delete wrangler state dir:', err.message);
  }
}

// 1. Apply Schema Migration
console.log('[Demo Reset] Applying migrations/0001_initial_schema.sql to local D1...');
execSync('npx wrangler d1 execute DB --local --file=migrations/0001_initial_schema.sql', {
  stdio: 'inherit',
  shell: true,
});

// 2. Apply Demo Seed Data
console.log('[Demo Reset] Applying migrations/0002_seed_demo_data.sql to local D1...');
execSync('npx wrangler d1 execute DB --local --file=migrations/0002_seed_demo_data.sql', {
  stdio: 'inherit',
  shell: true,
});

console.log('[Demo Reset] Cloudflare D1 and R2 demo reset complete.');
