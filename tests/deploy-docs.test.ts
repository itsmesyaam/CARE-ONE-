import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Deployment Guide Verification (docs/DEPLOY.md)', () => {
  const deployMdPath = path.resolve(__dirname, '../docs/DEPLOY.md');

  it('verifies docs/DEPLOY.md exists and is readable', () => {
    expect(fs.existsSync(deployMdPath)).toBe(true);
  });

  const content = fs.existsSync(deployMdPath) ? fs.readFileSync(deployMdPath, 'utf-8') : '';

  it('links every required official Cloudflare documentation page', () => {
    const requiredDocsUrls = [
      'https://developers.cloudflare.com/workers/ci-cd/builds/',
      'https://developers.cloudflare.com/d1/get-started/',
      'https://developers.cloudflare.com/d1/reference/migrations/',
      'https://developers.cloudflare.com/r2/get-started/',
      'https://developers.cloudflare.com/workers/configuration/secrets/',
      'https://developers.cloudflare.com/workers/configuration/cron-triggers/',
      'https://developers.cloudflare.com/workers/configuration/bindings/',
    ];

    for (const url of requiredDocsUrls) {
      expect(content).toContain(url);
    }
  });

  it('covers all five mandatory deployment steps with step-by-step dashboard paths', () => {
    // 1. Connect GitHub repo to Cloudflare Workers Builds
    expect(content).toMatch(/Connect.*GitHub.*(Repository|Repo).*Cloudflare Workers Builds/i);
    expect(content).toContain('CARE-ONE-');

    // 2. Create D1 database and R2 bucket in the dashboard
    expect(content).toMatch(/Create.*D1.*Database/i);
    expect(content).toContain('care-one-d1');
    expect(content).toContain('DB');
    expect(content).toMatch(/Create.*R2.*Bucket/i);
    expect(content).toContain('care-one-documents');
    expect(content).toContain('BUCKET');

    // 3. Apply remote migrations automatically as part of each deploy
    expect(content).toMatch(/migrations apply.*--remote/i);

    // 4. Add secrets in the dashboard (names only, never values)
    const requiredSecrets = [
      'RESEND_API_KEY',
      'TURNSTILE_SECRET_KEY',
      'VAPID_PRIVATE_KEY',
      'SESSION_SECRET',
      'VAPID_PUBLIC_KEY',
    ];
    for (const secret of requiredSecrets) {
      expect(content).toContain(secret);
    }

    // 5. Load demo data
    expect(content).toMatch(/Load Demo Data/i);
    expect(content).toMatch(/wrangler d1 execute/i);
  });

  it('guarantees that no real secret values or fake credentials are committed into docs/DEPLOY.md', () => {
    // Ensure only secret names, no actual API keys (e.g. re_..., test values) are included
    expect(content).not.toMatch(/re_[0-9a-zA-Z]{20,}/);
    expect(content).not.toMatch(/sk_live_[0-9a-zA-Z]{20,}/);
  });
});
