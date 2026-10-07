import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';

describe('Security: Content Security Policy in index.html', () => {
  const indexPath = path.resolve(__dirname, '../index.html');
  const indexHtml = fs.readFileSync(indexPath, 'utf-8');

  it('contains a Content-Security-Policy meta tag', () => {
    expect(indexHtml).toMatch(/<meta\s+http-equiv=["']Content-Security-Policy["']/i);
  });

  it('forbids unsafe-eval in script-src', () => {
    const cspMatch = indexHtml.match(/content=["']([^"']+)["']/i);
    expect(cspMatch).not.toBeNull();
    const policy = cspMatch ? cspMatch[1] : '';
    expect(policy).not.toContain("'unsafe-eval'");
  });
});
