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

  it('permits https://*.supabase.co and wss://*.supabase.co in connect-src in index.html', () => {
    expect(policy).toMatch(/connect-src[^;]*https:\/\/\*\.supabase\.co/);
    expect(policy).toMatch(/connect-src[^;]*wss:\/\/\*\.supabase\.co/);
  });

  it('permits https://*.supabase.co in img-src in index.html', () => {
    expect(policy).toMatch(/img-src[^;]*https:\/\/\*\.supabase\.co/);
  });

  it('exports isSupabaseConfigured boolean in src/lib/supabase.ts', async () => {
    const { isSupabaseConfigured, supabase } = await import('../src/lib/supabase');
    expect(typeof isSupabaseConfigured).toBe('boolean');
    expect(supabase).toBeDefined();
  });
});
