import { describe, it, expect, vi } from 'vitest';
import worker, { app } from '../../worker/index';
import type { WorkerEnv } from '../../worker/env';

describe('Worker Health & Skeleton API', () => {
  it('responds with 200 ok on /api/health', async () => {
    const res = await app.request('/api/health');
    expect(res.status).toBe(200);
    const body = (await res.json()) as { status: string; service: string };
    expect(body).toEqual({ status: 'ok', service: 'care-one-api' });
  });

  it('includes strict security headers with connect-src self', async () => {
    const res = await app.request('/api/health');
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
    expect(res.headers.get('x-frame-options')).toBe('DENY');
    const csp = res.headers.get('content-security-policy');
    expect(csp).toBeTruthy();
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("connect-src 'self'");
  });

  it('returns 404 for unknown api routes with JSON error', async () => {
    const res = await app.request('/api/non-existent-route');
    expect(res.status).toBe(404);
    const body = (await res.json()) as { error: string };
    expect(body).toEqual({ error: 'Not Found' });
  });

  it('default export routes /api requests properly', async () => {
    const req = new Request('http://localhost/api/health');
    const fakeEnv = {} as unknown as WorkerEnv;
    const fakeCtx = { waitUntil: vi.fn(), passThroughOnException: vi.fn() } as unknown as ExecutionContext;
    const res = await worker.fetch(req, fakeEnv, fakeCtx);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { status: string; service: string };
    expect(body.status).toBe('ok');
  });

  it('default export scheduled handler logs execution without errors', async () => {
    const controller: ScheduledController = {
      scheduledTime: Date.now(),
      cron: '*/5 * * * *',
      noRetry: vi.fn(),
    };
    await expect(worker.scheduled(controller)).resolves.toBeUndefined();
  });
});
