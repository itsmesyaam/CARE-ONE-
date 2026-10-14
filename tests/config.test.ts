import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Local Supabase and Environment Configuration', () => {
  const rootDir = path.resolve(__dirname, '..');
  const envExamplePath = path.join(rootDir, '.env.example');
  const gitignorePath = path.join(rootDir, '.gitignore');

  it('validates wrangler.jsonc settings for Cloudflare D1 and Worker security requirements', () => {
    const wranglerPath = path.join(rootDir, 'wrangler.jsonc');
    expect(fs.existsSync(wranglerPath)).toBe(true);
    const content = fs.readFileSync(wranglerPath, 'utf-8');

    expect(content).toContain('"careone-db"');
    expect(content).toContain('"careone-files"');
    expect(content).toContain('"CODE_LIMIT"');
  });

  it('validates .env.example contains required client variables without secrets', () => {
    expect(fs.existsSync(envExamplePath)).toBe(true);
    const envExample = fs.readFileSync(envExamplePath, 'utf-8');

    expect(envExample).toContain('VITE_SUPABASE_URL=');
    expect(envExample).toContain('VITE_SUPABASE_ANON_KEY=');
    expect(envExample).not.toContain('SERVICE_ROLE');
    expect(envExample).not.toContain('SECRET');
  });

  it('validates .gitignore protects all local and environment files', () => {
    const gitignore = fs.readFileSync(gitignorePath, 'utf-8');
    expect(gitignore).toContain('.env.local');
    expect(gitignore).toMatch(/\.env\*/);
    expect(gitignore).toContain('!.env.example');
  });
});
