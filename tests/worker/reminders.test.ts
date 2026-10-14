// @vitest-environment node
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { claimDueReminders, processReminders, MAX_REMINDERS_BATCH } from '../../worker/services/reminders';
import worker from '../../worker/index';
import type { WorkerEnv } from '../../worker/env';

describe('Task 4: Reminders Processing via 5-minute Cron', () => {
  const schemaDbPath = path.resolve(__dirname, '../../migrations/0001_schema.sql');
  const schemaGuardsPath = path.resolve(__dirname, '../../migrations/0002_guards.sql');
  const schemaEmailPath = path.resolve(__dirname, '../../migrations/0005_email_limits.sql');
  const schemaRemindersPath = path.resolve(__dirname, '../../migrations/0006_reminders_abandoned.sql');

  let dbSqlite: DatabaseSync;
  let mockEnv: WorkerEnv;

  const mockMeta = {
    duration: 0,
    rows_read: 0,
    rows_written: 0,
    size_after: 0,
    last_row_id: 0,
    changed_db: false,
    changes: 0,
  };

  function createD1Mock(db: DatabaseSync): D1Database {
    return {
      prepare(query: string) {
        return {
          bind(...params: unknown[]) {
            const boundParams = params as (string | number | bigint | null | Uint8Array)[];
            return {
              async first<T = unknown>(col?: string): Promise<T | null> {
                const stmt = db.prepare(query);
                const row = stmt.get(...boundParams) as Record<string, unknown> | undefined;
                if (!row) return null;
                return (col ? row[col] : row) as T;
              },
              async all<T = unknown>(): Promise<D1Result<T>> {
                const stmt = db.prepare(query);
                const rows = stmt.all(...boundParams) as T[];
                return {
                  results: rows,
                  success: true,
                  meta: mockMeta,
                };
              },
              async run(): Promise<D1Response> {
                const stmt = db.prepare(query);
                stmt.run(...boundParams);
                return {
                  success: true,
                  meta: mockMeta,
                };
              },
            };
          },
          async first<T = unknown>(col?: string): Promise<T | null> {
            const stmt = db.prepare(query);
            const row = stmt.get() as Record<string, unknown> | undefined;
            if (!row) return null;
            return (col ? row[col] : row) as T;
          },
          async all<T = unknown>(): Promise<D1Result<T>> {
            const stmt = db.prepare(query);
            const rows = stmt.all() as T[];
            return {
              results: rows,
              success: true,
              meta: mockMeta,
            };
          },
          async run(): Promise<D1Response> {
            const stmt = db.prepare(query);
            stmt.run();
            return {
              success: true,
              meta: mockMeta,
            };
          },
        } as unknown as D1PreparedStatement;
      },
      async batch(statements: D1PreparedStatement[]): Promise<D1Response[]> {
        const results: D1Response[] = [];
        db.exec('BEGIN TRANSACTION;');
        try {
          for (const s of statements) {
            await s.run();
            results.push({
              success: true,
              meta: mockMeta,
            });
          }
          db.exec('COMMIT;');
        } catch (err) {
          db.exec('ROLLBACK;');
          throw err;
        }
        return results;
      },
      async exec(query: string): Promise<D1ExecResult> {
        db.exec(query);
        return { count: 1, duration: 0 };
      },
    } as unknown as D1Database;
  }

  beforeEach(() => {
    dbSqlite = new DatabaseSync(':memory:');
    dbSqlite.exec(fs.readFileSync(schemaDbPath, 'utf8'));
    dbSqlite.exec(fs.readFileSync(schemaGuardsPath, 'utf8'));
    dbSqlite.exec(fs.readFileSync(schemaEmailPath, 'utf8'));
    dbSqlite.exec(fs.readFileSync(schemaRemindersPath, 'utf8'));

    // Insert test patient
    dbSqlite.exec(`
      INSERT INTO patients (id, uhid, full_name, dob, gender, phone, email)
      VALUES ('p-arun', 'ABC-1001', 'Arun Kumar', '1985-05-15', 'male', '9847000001', 'arun@example.com');
    `);

    mockEnv = {
      DB: createD1Mock(dbSqlite),
      FILES_DB: {} as unknown as D1Database,
      REMINDERS: {} as unknown as Queue<unknown>,
      RESEND_API_KEY: 'test-key',
    };

    vi.restoreAllMocks();
  });

  it('exports MAX_REMINDERS_BATCH constant as 50 to stay within free tier CPU limits', () => {
    expect(MAX_REMINDERS_BATCH).toBe(50);
  });

  it('atomically claims due pending reminders and excludes future reminders', async () => {
    // Insert 1 past reminder, 1 due reminder, and 1 future reminder
    dbSqlite.exec(`
      INSERT INTO reminders (id, patient_id, title, channel, scheduled_for, status)
      VALUES
        ('rem-1', 'p-arun', 'Fasting Blood Sugar Test', 'email', datetime('now', '-1 hour'), 'pending'),
        ('rem-2', 'p-arun', 'Cardiology Review', 'email', datetime('now', '-5 minutes'), 'pending'),
        ('rem-3', 'p-arun', 'Next Month Consultation', 'email', datetime('now', '+1 day'), 'pending');
    `);

    const claimed = await claimDueReminders(mockEnv, 50);
    expect(claimed.length).toBe(2);
    expect(claimed.map((r) => r.id).sort()).toEqual(['rem-1', 'rem-2'].sort());

    // Verify status updated to 'claimed' in DB
    const r1 = dbSqlite.prepare("SELECT status FROM reminders WHERE id = 'rem-1'").get() as { status: string };
    const r3 = dbSqlite.prepare("SELECT status FROM reminders WHERE id = 'rem-3'").get() as { status: string };
    expect(r1.status).toBe('claimed');
    expect(r3.status).toBe('pending');
  });

  it('successfully processes claimed reminders, sends email, and marks status = sent', async () => {
    dbSqlite.exec(`
      INSERT INTO reminders (id, patient_id, title, channel, scheduled_for, status)
      VALUES ('rem-ok', 'p-arun', 'Blood Sugar Test', 'email', datetime('now', '-1 minute'), 'pending');
    `);

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ id: 'resend-rem-1' }),
    });

    const summary = await processReminders(mockEnv);
    expect(summary.claimedCount).toBe(1);
    expect(summary.sentCount).toBe(1);
    expect(summary.failedCount).toBe(0);

    const row = dbSqlite.prepare("SELECT status, attempts, error_message FROM reminders WHERE id = 'rem-ok'").get() as {
      status: string;
      attempts: number;
      error_message: string | null;
    };
    expect(row.status).toBe('sent');
    expect(row.error_message).toBeNull();
  });

  it('retries failed reminder and marks abandoned after 3 failures', async () => {
    dbSqlite.exec(`
      INSERT INTO reminders (id, patient_id, title, channel, scheduled_for, status, attempts)
      VALUES ('rem-fail', 'p-arun', 'Blood Sugar Test', 'email', datetime('now', '-1 minute'), 'pending', 2);
    `);

    // Mock fetch failure
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => 'Resend Mailer Outage',
    });

    const summary = await processReminders(mockEnv);
    expect(summary.claimedCount).toBe(1);
    expect(summary.sentCount).toBe(0);
    expect(summary.abandonedCount).toBe(1);

    const row = dbSqlite.prepare("SELECT status, attempts, error_message FROM reminders WHERE id = 'rem-fail'").get() as {
      status: string;
      attempts: number;
      error_message: string;
    };
    expect(row.attempts).toBe(3);
    expect(row.status).toBe('abandoned');
    expect(row.error_message).toContain('Resend Mailer Outage');
  });

  it('scheduled() cron handler in worker executes processReminders', async () => {
    dbSqlite.exec(`
      INSERT INTO reminders (id, patient_id, title, channel, scheduled_for, status)
      VALUES ('rem-cron', 'p-arun', 'Daily Blood Pressure', 'email', datetime('now', '-2 minutes'), 'pending');
    `);

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ id: 'resend-cron-1' }),
    });

    await worker.scheduled({} as ScheduledEvent, mockEnv, {} as ExecutionContext);

    const row = dbSqlite.prepare("SELECT status FROM reminders WHERE id = 'rem-cron'").get() as { status: string };
    expect(row.status).toBe('sent');
  });
});
