import { describe, it, expect } from 'vitest';
import worker, { app } from '../../worker/index';
import type { WorkerEnv } from '../../worker/env';

describe('Cloudflare Worker Shell: /api/health & Security Headers', () => {
  const mockDb = {
    prepare: () => ({
      first: async <T>() => ({ ok: 1 }) as T,
      all: async () => ({ results: [{ ok: 1 }] }),
      run: async () => ({ success: true }),
    }),
  } as unknown as D1Database;

  const mockEnv: WorkerEnv = {
    DB: mockDb,
    FILES: {} as unknown as R2Bucket,
    REMINDERS: {} as unknown as Queue<unknown>,
  };

  it('responds with 200 and d1: true on GET /api/health when D1 is healthy', async () => {
    const res = await app.request('/api/health', {}, mockEnv);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toEqual({
      ok: true,
      db: 'ok',
      commit: expect.any(String),
      status: 'ok',
      service: 'care-one-api',
      d1: true,
    });
  });

  it('enforces all required security headers on responses', async () => {
    const res = await app.request('/api/health', {}, mockEnv);
    const csp = res.headers.get('content-security-policy');
    expect(csp).toBeTruthy();
    expect(csp).toContain("connect-src 'self'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(res.headers.get('strict-transport-security')).toBe(
      'max-age=31536000; includeSubDomains; preload'
    );
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
    expect(res.headers.get('referrer-policy')).toBe('no-referrer');
    expect(res.headers.get('permissions-policy')).toBe('camera=(self)');
  });

  it('handles D1 error gracefully returning HTTP 500 JSON error', async () => {
    const failingDb = {
      prepare: () => ({
        first: async () => {
          throw new Error('D1 connection failure');
        },
      }),
    } as unknown as D1Database;

    const res = await app.request('/api/health', {}, { ...mockEnv, DB: failingDb });
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data).toEqual({
      ok: false,
      db: 'error',
      status: 'error',
      error: 'D1 connection failure',
    });
  });

  it('exports default worker with fetch, scheduled, and queue handlers', async () => {
    const fakeCtx = { waitUntil: () => {}, passThroughOnException: () => {} } as unknown as ExecutionContext;
    const req = new Request('http://localhost/api/health');
    const res = await worker.fetch(req, mockEnv, fakeCtx);
    expect(res.status).toBe(200);

    await expect(
      worker.scheduled({ scheduledTime: Date.now(), cron: '*/5 * * * *' } as ScheduledEvent, mockEnv, fakeCtx)
    ).resolves.toBeUndefined();

    await expect(
      worker.queue({ queue: 'careone-reminders', messages: [] } as unknown as MessageBatch<unknown>, mockEnv, fakeCtx)
    ).resolves.toBeUndefined();
  });
});
