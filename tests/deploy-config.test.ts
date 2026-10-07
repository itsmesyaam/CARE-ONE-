import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';

describe('Deploy configuration files', () => {
  const root = path.resolve(__dirname, '..');
  const headersPath = path.join(root, 'public', '_headers');
  const keepalivePath = path.join(root, '.github', 'workflows', 'keepalive.yml');

  it('public/_headers exists and enforces strict security headers', () => {
    expect(fs.existsSync(headersPath), 'public/_headers must exist').toBe(true);
    const content = fs.readFileSync(headersPath, 'utf8');
    expect(content).toContain('Content-Security-Policy');
    expect(content).toContain('Strict-Transport-Security: max-age=31536000; includeSubDomains');
    expect(content).toContain('X-Content-Type-Options: nosniff');
    expect(content).toContain('Referrer-Policy: no-referrer');
    expect(content).toContain('Permissions-Policy: camera=(self), microphone=(), geolocation=()');
    expect(content).toContain('Cross-Origin-Opener-Policy: same-origin');
  });

  it('.github/workflows/keepalive.yml exists and contains scheduled cron job', () => {
    expect(fs.existsSync(keepalivePath), '.github/workflows/keepalive.yml must exist').toBe(true);
    const content = fs.readFileSync(keepalivePath, 'utf8');
    expect(content).toMatch(/schedule:[\s\S]*?- cron:/);
    expect(content).toContain('SUPABASE_URL');
    expect(content).toContain('SUPABASE_ANON_KEY');
    expect(content).toContain('/rest/v1/hospital_settings');
  });
});
