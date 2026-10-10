import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Local Supabase and Environment Configuration', () => {
  const rootDir = path.resolve(__dirname, '..');
  const configPath = path.join(rootDir, 'supabase', 'config.toml');
  const envExamplePath = path.join(rootDir, '.env.example');
  const gitignorePath = path.join(rootDir, '.gitignore');

  it('validates supabase/config.toml settings for Phase 1 security requirements', () => {
    expect(fs.existsSync(configPath)).toBe(true);
    const content = fs.readFileSync(configPath, 'utf-8');

    // Decision 9: Access token lifetime 900 seconds
    expect(content).toMatch(/jwt_expiry\s*=\s*900/);

    // Decision 7: Disable public signups
    expect(content).toMatch(/enable_signup\s*=\s*false/);

    // Decision 8: Enable TOTP MFA
    expect(content).toMatch(/\[auth\.mfa\.totp\][^[]*enroll_enabled\s*=\s*true/s);
    expect(content).toMatch(/\[auth\.mfa\.totp\][^[]*verify_enabled\s*=\s*true/s);
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
