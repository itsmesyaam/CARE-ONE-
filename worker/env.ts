/// <reference types="@cloudflare/workers-types/2023-07-01" />

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
}
