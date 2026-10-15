/// <reference types="@cloudflare/workers-types" />

export interface WorkerEnv {
  DB: D1Database;
  FILES_DB: D1Database;
  REMINDERS: Queue<unknown>;
  RESEND_API_KEY?: string;
  EMAIL_FROM?: string;
  CODE_LIMIT?: {
    limit(options: { key: string }): Promise<{ success: boolean }>;
  };
  ASSETS?: Fetcher;
  APP_ENV?: string;
  ENVIRONMENT?: string;
  JWT_SECRET?: string;
  RP_ID?: string;
  ORIGIN?: string;
}
