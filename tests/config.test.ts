import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Cloudflare Platform and Environment Configuration', () => {
  const rootDir = path.resolve(__dirname, '..');
  const wranglerPath = path.join(rootDir, 'wrangler.jsonc');
  const gitignorePath = path.join(rootDir, '.gitignore');

  it('validates wrangler.jsonc settings for Cloudflare D1, R2, and Worker bindings', () => {
    expect(fs.existsSync(wranglerPath)).toBe(true);
    const content = fs.readFileSync(wranglerPath, 'utf-8');

    // D1 database binding
    expect(content).toContain('"binding": "DB"');
    expect(content).toContain('"database_name": "care-one-d1"');

    // R2 storage bucket binding
    expect(content).toContain('"binding": "BUCKET"');
    expect(content).toContain('"bucket_name": "care-one-documents"');

    // Cron triggers
    expect(content).toContain('"crons": ["*/5 * * * *"]');

    // Static assets binding
    expect(content).toContain('"assets"');
  });

  it('validates .gitignore protects all local and environment files', () => {
    const gitignore = fs.readFileSync(gitignorePath, 'utf-8');
    expect(gitignore).toContain('.env.local');
    expect(gitignore).toContain('.dev.vars');
    expect(gitignore).toMatch(/\.env\*/);
  });

  it('exports apiFetch client helper from src/lib/api-client', async () => {
    const { apiFetch } = await import('../src/lib/api-client');
    expect(typeof apiFetch).toBe('function');
  });
});
