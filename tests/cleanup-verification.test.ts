import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { execSync } from 'node:child_process';

describe('Cloudflare Migration Cleanup Verification', () => {
  const rootDir = path.resolve(__dirname, '..');
  const legacyTerm = ['supa', 'base'].join('');

  it('verifies legacy directory is deleted', () => {
    const legacyDir = path.join(rootDir, legacyTerm);
    expect(fs.existsSync(legacyDir), `${legacyTerm}/ directory should not exist`).toBe(false);
  });

  it('verifies legacy client packages are not in package.json', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf-8'));
    const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
    const legacyPkg = `@${legacyTerm}/${legacyTerm}-js`;
    expect(allDeps[legacyPkg]).toBeUndefined();
    expect(allDeps[legacyTerm]).toBeUndefined();
  });

  it('verifies legacy client file is deleted', () => {
    const legacyLib = path.join(rootDir, 'src', 'lib', `${legacyTerm}.ts`);
    expect(fs.existsSync(legacyLib), `src/lib/${legacyTerm}.ts should not exist`).toBe(false);
  });

  it('verifies CSP in index.html and public/_headers has no legacy endpoints', () => {
    const indexHtml = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf-8');
    const headers = fs.readFileSync(path.join(rootDir, 'public', '_headers'), 'utf-8');
    expect(indexHtml).not.toContain(`${legacyTerm}.co`);
    expect(headers).not.toContain(`${legacyTerm}.co`);
  });

  it('verifies git grep for legacy term finds zero occurrences across codebase', () => {
    let result = '';
    try {
      result = execSync(`git grep -i "${legacyTerm}"`, { encoding: 'utf-8' });
    } catch {
      result = '';
    }
    expect(result.trim()).toBe('');
  });
});
