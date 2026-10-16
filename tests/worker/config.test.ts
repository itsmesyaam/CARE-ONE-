// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { app } from '../../worker/index';

function makeEnv(demoMode: string) {
  return {
    DEMO_MODE: demoMode,
    DB: {} as D1Database,
    FILES_DB: {} as D1Database,
    REMINDERS: {} as Queue<unknown>,
  };
}

describe('GET /api/config', () => {
  it('returns { demoMode: true } when DEMO_MODE is "true"', async () => {
    const req = new Request('http://localhost/api/config');
    const res = await app.fetch(req, makeEnv('true'), {} as ExecutionContext);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toMatch(/application\/json/);
    const body = await res.json() as Record<string, unknown>;
    expect(body).toEqual({ demoMode: true });
  });

  it('returns { demoMode: false } when DEMO_MODE is "false"', async () => {
    const req = new Request('http://localhost/api/config');
    const res = await app.fetch(req, makeEnv('false'), {} as ExecutionContext);
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(body).toEqual({ demoMode: false });
  });

  it('returns { demoMode: false } when DEMO_MODE is missing', async () => {
    const req = new Request('http://localhost/api/config');
    const res = await app.fetch(
      req,
      { DB: {} as D1Database, FILES_DB: {} as D1Database, REMINDERS: {} as Queue<unknown> },
      {} as ExecutionContext
    );
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(body).toEqual({ demoMode: false });
  });

  it('response body never contains a "password" or "secret" key', async () => {
    const req = new Request('http://localhost/api/config');
    const res = await app.fetch(req, makeEnv('true'), {} as ExecutionContext);
    const body = await res.json() as Record<string, unknown>;
    function hasKey(obj: unknown, key: string): boolean {
      if (typeof obj !== 'object' || obj === null) return false;
      if (key in (obj as Record<string, unknown>)) return true;
      return Object.values(obj as Record<string, unknown>).some((v) => hasKey(v, key));
    }
    expect(hasKey(body, 'password')).toBe(false);
    expect(hasKey(body, 'secret')).toBe(false);
    expect(hasKey(body, 'Password')).toBe(false);
    expect(hasKey(body, 'Secret')).toBe(false);
  });
});
