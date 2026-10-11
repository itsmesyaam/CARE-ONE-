import { Hono } from 'hono';
import type { WorkerEnv } from './env';

export const app = new Hono<{ Bindings: WorkerEnv }>();

// Security Headers Middleware applied to every response
app.use('*', async (c, next) => {
  await next();
  c.header(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' https://challenges.cloudflare.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self'; frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self';"
  );
  c.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('Referrer-Policy', 'no-referrer');
  c.header('X-Frame-Options', 'DENY');
  c.header('Permissions-Policy', 'camera=(self)');
});

// Health check endpoint executing SELECT 1 on D1
app.get('/api/health', async (c) => {
  try {
    const result = await c.env.DB.prepare('SELECT 1 as ok').first<{ ok: number }>();
    return c.json({
      status: 'ok',
      service: 'care-one-api',
      d1: result?.ok === 1,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return c.json({ status: 'error', error: message }, 500);
  }
});

// 404 handler for API routes
app.notFound((c) => {
  if (c.req.path.startsWith('/api')) {
    return c.json({ error: 'Not Found' }, 404);
  }
  return c.text('Not Found', 404);
});

// Cloudflare Worker export with fetch, scheduled, and queue handlers
export default {
  fetch(request: Request, env: WorkerEnv, ctx: ExecutionContext): Response | Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api')) {
      return app.fetch(request, env, ctx);
    }
    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }
    return app.fetch(request, env, ctx);
  },

  async scheduled(
    _event?: ScheduledEvent,
    _env?: WorkerEnv,
    _ctx?: ExecutionContext
  ): Promise<void> {
    void _event;
    void _env;
    void _ctx;
  },

  async queue(
    _batch?: MessageBatch<unknown>,
    _env?: WorkerEnv,
    _ctx?: ExecutionContext
  ): Promise<void> {
    void _batch;
    void _env;
    void _ctx;
  },
};
