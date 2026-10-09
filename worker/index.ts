import { createApp } from './app';
import type { WorkerEnv } from './env';

export const app = createApp();

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
