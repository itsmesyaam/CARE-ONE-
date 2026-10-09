import { Hono } from 'hono';
import type { WorkerEnv } from './env';

export const app = new Hono<{ Bindings: WorkerEnv }>();

// Global Security Headers Middleware
app.use('*', async (c, next) => {
  await next();
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('X-Frame-Options', 'DENY');
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  c.header(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' https://challenges.cloudflare.com; connect-src 'self' https://challenges.cloudflare.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; frame-src https://challenges.cloudflare.com;"
  );
});

// Health check endpoint
app.get('/api/health', (c) => {
  return c.json({
    status: 'ok',
    service: 'care-one-api',
  });
});

// 404 handler for API routes
app.notFound((c) => {
  if (c.req.path.startsWith('/api')) {
    return c.json({ error: 'Not Found' }, 404);
  }
  return c.text('Not Found', 404);
});

// Cloudflare Worker export
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

  async scheduled(controller: ScheduledController): Promise<void> {
    console.log(`[Cron] Triggered at ${new Date(controller.scheduledTime).toISOString()}`);
  },
};
