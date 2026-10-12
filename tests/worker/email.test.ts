// @vitest-environment node
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import {
  sendEmail,
  validateEmailSubject,
  getKolkataDateString,
  MAX_DAILY_EMAILS,
} from '../../worker/services/email';
import type { WorkerEnv } from '../../worker/env';

describe('Task 3: Resend Email Adapter with Strict 95 Emails/Day Quota', () => {
  const schemaDbPath = path.resolve(__dirname, '../../migrations/0001_schema.sql');
  const schemaGuardsPath = path.resolve(__dirname, '../../migrations/0002_guards.sql');
  const schemaEmailPath = path.resolve(__dirname, '../../migrations/0005_email_limits.sql');

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

    mockEnv = {
      DB: createD1Mock(dbSqlite),
      FILES_DB: {} as unknown as D1Database,
      REMINDERS: {} as unknown as Queue<unknown>,
      RESEND_API_KEY: 'test_resend_api_key',
    };

    vi.restoreAllMocks();
  });

  it('exports MAX_DAILY_EMAILS constant as 95', () => {
    expect(MAX_DAILY_EMAILS).toBe(95);
  });

  it('formats Kolkata date string correctly in YYYY-MM-DD format', () => {
    const d = new Date('2026-10-12T01:00:00Z'); // 06:30 AM IST on Oct 12
    expect(getKolkataDateString(d)).toBe('2026-10-12');
  });

  it('validates email subject: rejects patient clinical data, diagnosis, and UHID identifiers', () => {
    expect(validateEmailSubject('CareOne Security Code')).toBe(true);
    expect(validateEmailSubject('CareOne Appointment Reminder')).toBe(true);
    expect(validateEmailSubject('Your CareOne Invitation')).toBe(true);

    // Forbidden: UHID patterns
    expect(validateEmailSubject('Appointment for ABC-1001')).toBe(false);
    expect(validateEmailSubject('UHID 9847000001 details')).toBe(false);

    // Forbidden: clinical diagnoses / sensitive conditions
    expect(validateEmailSubject('Diabetes Lab Report Results')).toBe(false);
    expect(validateEmailSubject('Cardiology Follow-up: Hypertension')).toBe(false);
    expect(validateEmailSubject('Chemotherapy Session Scheduled')).toBe(false);
  });

  it('sends an email and increments daily counter atomically in D1', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ id: 'resend-msg-1' }),
    });

    const result = await sendEmail(mockEnv, {
      to: 'patient@example.com',
      subject: 'CareOne Appointment Reminder',
      text: 'You have an upcoming appointment scheduled.',
      template: 'appointment_reminder',
    });

    expect(result.success).toBe(true);
    expect(result.dailyCount).toBe(1);
    expect(result.id).toBe('resend-msg-1');

    // Verify D1 daily count row
    const row = dbSqlite.prepare('SELECT count FROM email_daily_counts').get() as { count: number };
    expect(row.count).toBe(1);

    // Verify email_logs row with hashed recipient
    const log = dbSqlite.prepare('SELECT * FROM email_logs').get() as {
      recipient_hash: string;
      subject: string;
      status: string;
    };
    expect(log.status).toBe('sent');
    expect(log.subject).toBe('CareOne Appointment Reminder');
    expect(log.recipient_hash).not.toContain('patient@example.com'); // Hashed for privacy
  });

  it('allows sending up to exactly 95 emails and strictly stops at the 95 email/day limit', async () => {
    const today = getKolkataDateString();
    // Seed database counter at 94
    dbSqlite.exec(`
      INSERT INTO email_daily_counts (date, count, updated_at)
      VALUES ('${today}', 94, datetime('now'));
    `);

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ id: 'resend-msg-95' }),
    });

    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    // 95th email: must SUCCEED
    const email95 = await sendEmail(mockEnv, {
      to: 'patient95@example.com',
      subject: 'CareOne Security Code',
      text: 'Your security code is 123456.',
    });
    expect(email95.success).toBe(true);
    expect(email95.dailyCount).toBe(95);

    // 96th email: must FAIL and return rateLimited: true
    const email96 = await sendEmail(mockEnv, {
      to: 'patient96@example.com',
      subject: 'CareOne Security Code',
      text: 'Your security code is 654321.',
    });
    expect(email96.success).toBe(false);
    expect(email96.rateLimited).toBe(true);
    expect(email96.error).toMatch(/daily email quota reached/i);

    // Fetch should NOT have been called for 96th email
    expect(global.fetch).toHaveBeenCalledTimes(1);

    // Warning must be logged
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('[EMAIL_LIMIT] Daily email quota reached')
    );

    // Verify counter remains at 95
    const row = dbSqlite.prepare('SELECT count FROM email_daily_counts WHERE date = ?').get(today) as { count: number };
    expect(row.count).toBe(95);
  });

  it('enforces append-only immutability triggers on email_logs table', () => {
    dbSqlite.exec(`
      INSERT INTO email_logs (id, recipient_hash, template, subject, status)
      VALUES ('log-1', 'abc123hash', 'otp', 'CareOne Code', 'sent');
    `);

    expect(() => {
      dbSqlite.exec("UPDATE email_logs SET status = 'failed' WHERE id = 'log-1';");
    }).toThrow(/email_logs rows are append-only/i);

    expect(() => {
      dbSqlite.exec("DELETE FROM email_logs WHERE id = 'log-1';");
    }).toThrow(/email_logs rows cannot be deleted/i);
  });
});
