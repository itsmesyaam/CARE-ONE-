import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';

describe('Deploy configuration files', () => {
  const root = path.resolve(__dirname, '..');
  const headersPath = path.join(root, 'public', '_headers');

  it('public/_headers exists and enforces strict security headers', () => {
    expect(fs.existsSync(headersPath), 'public/_headers must exist').toBe(true);
    const content = fs.readFileSync(headersPath, 'utf8');
    expect(content).toContain('Content-Security-Policy');
    expect(content).toContain('Strict-Transport-Security: max-age=31536000; includeSubDomains');
    expect(content).toContain('X-Frame-Options: DENY');
    expect(content).toContain('X-Content-Type-Options: nosniff');
    expect(content).toContain('Referrer-Policy: no-referrer');
    expect(content).toContain('Permissions-Policy: camera=(self), microphone=(), geolocation=()');
    expect(content).toContain('Cross-Origin-Opener-Policy: same-origin');
    expect(content).toContain("connect-src 'self'");
    expect(content).not.toContain('sentry.io');
  });

  it('vercel.json exists, enforces SPA rewrites and identical security headers', () => {
    const vercelPath = path.join(root, 'vercel.json');
    expect(fs.existsSync(vercelPath), 'vercel.json must exist').toBe(true);
    const raw = fs.readFileSync(vercelPath, 'utf8');
    const vercelConfig = JSON.parse(raw);

    // Schema
    expect(vercelConfig.$schema).toBe('https://openapi.vercel.sh/vercel.json');

    // SPA Rewrite
    expect(vercelConfig.rewrites).toBeDefined();
    expect(vercelConfig.rewrites).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: '/(.*)',
          destination: '/index.html',
        }),
      ])
    );

    // Headers
    expect(vercelConfig.headers).toBeDefined();
    const routeHeaders = vercelConfig.headers.find(
      (h: { source: string; headers: Array<{ key: string; value: string }> }) =>
        h.source === '/(.*)'
    );
    expect(routeHeaders, 'Route headers for /(.*) must exist').toBeDefined();
    const headersMap = new Map(
      routeHeaders.headers.map((h: { key: string; value: string }) => [h.key, h.value])
    );

    expect(headersMap.get('Content-Security-Policy')).toContain("default-src 'self'");
    expect(headersMap.get('Content-Security-Policy')).toContain(
      'https://challenges.cloudflare.com'
    );
    expect(headersMap.get('Content-Security-Policy')).toContain("connect-src 'self'");
    expect(headersMap.get('Content-Security-Policy')).not.toContain('sentry.io');
    expect(headersMap.get('Strict-Transport-Security')).toBe('max-age=31536000; includeSubDomains');
    expect(headersMap.get('X-Frame-Options')).toBe('DENY');
    expect(headersMap.get('X-Content-Type-Options')).toBe('nosniff');
    expect(headersMap.get('Referrer-Policy')).toBe('no-referrer');
    expect(headersMap.get('Permissions-Policy')).toBe(
      'camera=(self), microphone=(), geolocation=()'
    );
    expect(headersMap.get('Cross-Origin-Opener-Policy')).toBe('same-origin');
  });

  it('docs/DEPLOY.md exists and documents Cloudflare Workers, D1 and R2 deployments', () => {
    const deployDocPath = path.join(root, 'docs', 'DEPLOY.md');
    expect(fs.existsSync(deployDocPath), 'docs/DEPLOY.md must exist').toBe(true);
    const content = fs.readFileSync(deployDocPath, 'utf8');

    expect(content).toContain('Cloudflare');
    expect(content).not.toContain('SERVICE_ROLE');
  });
});
