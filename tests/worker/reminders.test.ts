// @vitest-environment node
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { createApp } from '../../worker/app';
import type { WorkerEnv } from '../../worker/env';
import { createSession } from '../../worker/auth/sessions';
import {
  claimDueReminders,
  processRemindersCron,
  GENERIC_REMINDER_PUSH,
  GENERIC_REMINDER_EMAIL_SUBJECT,
} from '../../worker/jobs/reminders';

type BoundParam = string | number | null | undefined;
type QueryRow = Record<string, unknown>;

function createMockD1(): { d1: D1Database; sqlite: DatabaseSync } {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec('PRAGMA foreign_keys = ON;');

  const m1 = fs.readFileSync(
    path.resolve(process.cwd(), 'migrations/0001_initial_schema.sql'),
    'utf8'
  );
  sqlite.exec(m1);
  const m2 = fs.readFileSync(
    path.resolve(process.cwd(), 'migrations/0002_seed_demo_data.sql'),
    'utf8'
  );
  sqlite.exec(m2);
  const m3 = fs.readFileSync(
    path.resolve(process.cwd(), 'migrations/0003_staff_auth_credentials.sql'),
    'utf8'
  );
  sqlite.exec(m3);

  const d1 = {
    prepare(sql: string) {
      let boundParams: BoundParam[] = [];
      return {
        bind(...params: BoundParam[]) {
          boundParams = params;
          return this;
        },
        async first<T = unknown>(col?: string): Promise<T | null> {
          const stmt = sqlite.prepare(sql);
          const safe = boundParams.map((p) => (p === undefined ? null : p));
          const row = stmt.get(...safe) as QueryRow | undefined;
          if (!row) return null;
          return (col ? (row[col] as T) : (row as T)) ?? null;
        },
        async all<T = unknown>() {
          const stmt = sqlite.prepare(sql);
          const safe = boundParams.map((p) => (p === undefined ? null : p));
          const results = stmt.all(...safe) as T[];
          return { results, success: true, meta: { duration: 0 } };
        },
        async run() {
          const stmt = sqlite.prepare(sql);
          const safe = boundParams.map((p) => (p === undefined ? null : p));
          const info = stmt.run(...safe) as { changes?: number };
          return { success: true, meta: { changes: info.changes || 0, duration: 0 } };
        },
        async raw<T = unknown[]>() {
          const stmt = sqlite.prepare(sql);
          const safe = boundParams.map((p) => (p === undefined ? null : p));
          const rows = stmt.all(...safe) as QueryRow[];
          return rows.map((r: QueryRow) => Object.values(r)) as T[];
        },
      };
    },
    async batch<T = unknown>(statements: Array<{ run: () => Promise<unknown> }>) {
      const results = [];
      for (const s of statements) {
        results.push(await s.run());
      }
      return results as T[];
    },
    async exec(sql: string) {
      sqlite.exec(sql);
      return { count: 1, duration: 0 };
    },
  } as unknown as D1Database;

  return { d1, sqlite };
}

describe('Care Reminders & Cron Trigger Job', () => {
  let mockEnv: WorkerEnv;
  let d1: D1Database;
  let sqlite: DatabaseSync;

  const PATIENT_A = 'e0000000-0000-0000-0000-000000000001'; // Arun Kumar

  beforeEach(() => {
    const mock = createMockD1();
    d1 = mock.d1;
    sqlite = mock.sqlite;
    mockEnv = {
      DB: d1,
      RESEND_API_KEY: 're_test_key_123',
      VAPID_PUBLIC_KEY: 'test-public-vapid-key',
      VAPID_PRIVATE_KEY: 'test-private-vapid-key',
      ENVIRONMENT: 'test',
    } as unknown as WorkerEnv;
  });

  async function makeToken(params: {
    userId: string;
    role: string;
    staffId?: string;
    patientId?: string;
    isMfaVerified: boolean;
  }) {
    const { rawToken } = await createSession(d1, params);
    return rawToken;
  }

  it('1. Enforces Rule 8: notification content is strictly generic without patient clinical details', () => {
    expect(GENERIC_REMINDER_PUSH.title).toBe('CareOne Health Reminder');
    expect(GENERIC_REMINDER_PUSH.body).toMatch(/appointment or care update scheduled/i);
    expect(GENERIC_REMINDER_PUSH.body).not.toMatch(/Arun|Diabetes|Metformin|Sugar|Cardiology/i);

    expect(GENERIC_REMINDER_EMAIL_SUBJECT).toBe('Health Reminder - CareOne Hospital');
    expect(GENERIC_REMINDER_EMAIL_SUBJECT).not.toMatch(/Arun|Diabetes|Metformin|Sugar|Cardiology/i);
  });

  it('2. Atomically claims due reminders (UPDATE ... RETURNING) and ignores future ones', async () => {
    const pastTime = new Date(Date.now() - 10 * 60 * 1000).toISOString(); // 10 mins ago
    const futureTime = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour ahead

    // Seed two reminders: one due, one in future
    sqlite.exec(`
      INSERT INTO reminders (id, patient_id, title, scheduled_for, channel, status, attempts)
      VALUES 
        ('rem-due-1', '${PATIENT_A}', 'Medication Review', '${pastTime}', 'push', 'pending', 0),
        ('rem-future-1', '${PATIENT_A}', 'Upcoming Followup', '${futureTime}', 'push', 'pending', 0)
    `);

    const claimed = await claimDueReminders(d1, 10);
    expect(claimed.length).toBe(1);
    expect(claimed[0]?.id).toBe('rem-due-1');
    expect(claimed[0]?.status).toBe('claimed');

    // Verify database state
    const dueRow = sqlite.prepare("SELECT status FROM reminders WHERE id = 'rem-due-1'").get() as {
      status: string;
    };
    const futureRow = sqlite
      .prepare("SELECT status FROM reminders WHERE id = 'rem-future-1'")
      .get() as { status: string };

    expect(dueRow.status).toBe('claimed');
    expect(futureRow.status).toBe('pending');
  });

  it('3. Successfully delivers Web Push when push subscription exists', async () => {
    const pastTime = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    sqlite.exec(`
      INSERT INTO reminders (id, patient_id, title, scheduled_for, channel, status, attempts)
      VALUES ('rem-push-1', '${PATIENT_A}', 'Morning Dose', '${pastTime}', 'push', 'pending', 0);

      INSERT INTO push_subscriptions (id, user_id, endpoint, p256dh, auth)
      VALUES ('sub-1', '${PATIENT_A}', 'https://fcm.googleapis.com/fcm/send/test-endpoint', 'key123', 'auth123');
    `);

    // Mock global fetch for Web Push endpoint
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify({ success: true }), { status: 201 }));

    const result = await processRemindersCron(d1, mockEnv);
    expect(result.processed).toBe(1);
    expect(result.sentPush).toBe(1);

    const row = sqlite
      .prepare("SELECT status, channel FROM reminders WHERE id = 'rem-push-1'")
      .get() as { status: string; channel: string };
    expect(row.status).toBe('sent');
    expect(row.channel).toBe('push');

    fetchSpy.mockRestore();
  });

  it('4. Falls back to Email when push fails or no push subscription exists', async () => {
    const pastTime = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    sqlite.exec(`
      INSERT INTO reminders (id, patient_id, title, scheduled_for, channel, status, attempts)
      VALUES ('rem-email-fallback', '${PATIENT_A}', 'Diet Review', '${pastTime}', 'push', 'pending', 0);
    `);

    // Patient has email arun@example.com but NO push subscription
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        new Response(JSON.stringify({ id: 'resend_email_id_123' }), { status: 200 })
      );

    const result = await processRemindersCron(d1, mockEnv);
    expect(result.processed).toBe(1);
    expect(result.sentEmail).toBe(1);

    const row = sqlite
      .prepare("SELECT status, channel FROM reminders WHERE id = 'rem-email-fallback'")
      .get() as { status: string; channel: string };
    expect(row.status).toBe('sent');
    expect(row.channel).toBe('email');

    fetchSpy.mockRestore();
  });

  it('5. Retries up to 3 times on delivery failure, marking as failed after 3 attempts', async () => {
    const pastTime = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    // Patient has no email and no push subscription -> delivery impossible
    sqlite.exec(`
      INSERT INTO patients (id, uhid, full_name, dob, gender, phone, email)
      VALUES ('p-no-contact', 'TEST-9999', 'No Contact Patient', '1990-01-01', 'male', '9876543210', NULL);

      INSERT INTO reminders (id, patient_id, title, scheduled_for, channel, status, attempts)
      VALUES ('rem-fail-test', 'p-no-contact', 'Task', '${pastTime}', 'push', 'pending', 0);
    `);

    // 1st attempt
    await processRemindersCron(d1, mockEnv);
    let row = sqlite
      .prepare("SELECT status, attempts FROM reminders WHERE id = 'rem-fail-test'")
      .get() as { status: string; attempts: number };
    expect(row.status).toBe('pending');
    expect(row.attempts).toBe(1);

    // 2nd attempt
    await processRemindersCron(d1, mockEnv);
    row = sqlite
      .prepare("SELECT status, attempts FROM reminders WHERE id = 'rem-fail-test'")
      .get() as { status: string; attempts: number };
    expect(row.status).toBe('pending');
    expect(row.attempts).toBe(2);

    // 3rd attempt -> should transition to 'failed'
    await processRemindersCron(d1, mockEnv);
    row = sqlite
      .prepare("SELECT status, attempts FROM reminders WHERE id = 'rem-fail-test'")
      .get() as { status: string; attempts: number };
    expect(row.status).toBe('failed');
    expect(row.attempts).toBe(3);
  });

  it('6. Allows patient to subscribe and unsubscribe from Web Push notifications via API', async () => {
    const app = createApp();
    const patientToken = await makeToken({
      userId: PATIENT_A,
      role: 'patient',
      patientId: PATIENT_A,
      isMfaVerified: false,
    });

    // 1. Subscribe
    const subRes = await app.request(
      'http://localhost/api/notifications/subscribe',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `careone_session=${patientToken}`,
          Origin: 'http://localhost',
        },
        body: JSON.stringify({
          endpoint: 'https://push.example.com/sub/12345',
          keys: {
            p256dh: 'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QT9Ac',
            auth: 'tBHItJI5svbpez7KI4CCXg',
          },
        }),
      },
      mockEnv
    );

    expect(subRes.status).toBe(200);

    const subRow = sqlite
      .prepare(
        "SELECT * FROM push_subscriptions WHERE endpoint = 'https://push.example.com/sub/12345'"
      )
      .get() as { user_id: string };
    expect(subRow).toBeDefined();
    expect(subRow.user_id).toBe(PATIENT_A);

    // 2. Unsubscribe
    const unsubRes = await app.request(
      'http://localhost/api/notifications/subscribe',
      {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `careone_session=${patientToken}`,
          Origin: 'http://localhost',
        },
        body: JSON.stringify({
          endpoint: 'https://push.example.com/sub/12345',
        }),
      },
      mockEnv
    );

    expect(unsubRes.status).toBe(200);
    const deletedRow = sqlite
      .prepare(
        "SELECT * FROM push_subscriptions WHERE endpoint = 'https://push.example.com/sub/12345'"
      )
      .get();
    expect(deletedRow).toBeUndefined();
  });
});
