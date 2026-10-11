/// <reference types="@cloudflare/workers-types/2023-07-01" />

export interface WorkerEnv {
  DB: D1Database;
  FILES: R2Bucket;
  REMINDERS: Queue<unknown>;
  CODE_LIMIT?: {
    limit(options: { key: string }): Promise<{ success: boolean }>;
  };
  ASSETS?: Fetcher;
  APP_ENV?: string;
}
