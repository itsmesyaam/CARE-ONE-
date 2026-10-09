import './worker-configuration.d.ts';

export interface WorkerEnv extends Cloudflare.Env {
  RESEND_API_KEY?: string;
  TURNSTILE_SECRET_KEY?: string;
  SESSION_SECRET?: string;
  VAPID_PRIVATE_KEY?: string;
  VAPID_PUBLIC_KEY?: string;
}
