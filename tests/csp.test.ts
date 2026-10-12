import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';

describe('Security: Content Security Policy in index.html', () => {
  const indexPath = path.resolve(__dirname, '../index.html');
  const indexHtml = fs.readFileSync(indexPath, 'utf-8');
  const metaMatch = indexHtml.match(/<meta[^>]*?http-equiv=["']Content-Security-Policy["'][\s\S]*?>/i);
  const contentMatch = metaMatch ? metaMatch[0].match(/content="([^"]+)"/i) : null;
  const policy = contentMatch ? contentMatch[1] : '';

  it('contains a Content-Security-Policy meta tag', () => {
    expect(metaMatch).not.toBeNull();
    expect(contentMatch).not.toBeNull();
  });

  it('forbids unsafe-eval in script-src', () => {
    expect(policy).not.toContain("'unsafe-eval'");
  });

  it('restricts connect-src to self and local endpoints without remote Supabase', () => {
    expect(policy).toContain("connect-src 'self'");
    expect(policy).not.toContain('supabase.co');
    expect(policy).not.toContain('kndkohgpbnbbndvtgqvx');
  });

  it('restricts img-src to self, data and blob without remote Supabase', () => {
    expect(policy).toContain("img-src 'self' data: blob:");
    expect(policy).not.toContain('supabase.co');
  });
});
