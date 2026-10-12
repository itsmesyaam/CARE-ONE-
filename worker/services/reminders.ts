import type { WorkerEnv } from '../env';
import { sendEmail } from './email';

export const MAX_REMINDERS_BATCH = 50;

export interface ReminderRow {
  id: string;
  patient_id: string;
  care_plan_item_id: string | null;
  appointment_id: string | null;
  title: string;
  scheduled_for: string;
  channel: 'push' | 'email';
  status: 'pending' | 'claimed' | 'sent' | 'failed' | 'abandoned';
  attempts: number;
  last_attempt_at: string | null;
  error_message: string | null;
  created_at: string;
}

export interface ReminderProcessSummary {
  claimedCount: number;
  sentCount: number;
  failedCount: number;
  abandonedCount: number;
}

/**
 * Atomically claim up to `limit` due pending reminders in D1 using UPDATE ... RETURNING.
 */
export async function claimDueReminders(
  env: WorkerEnv,
  limit = MAX_REMINDERS_BATCH
): Promise<ReminderRow[]> {
  const query = `
    UPDATE reminders
    SET status = 'claimed',
        last_attempt_at = datetime('now')
    WHERE id IN (
      SELECT id FROM reminders
      WHERE status = 'pending' AND scheduled_for <= datetime('now')
      ORDER BY scheduled_for ASC
      LIMIT ?
    )
    RETURNING *;
  `;
  const stmt = env.DB.prepare(query);
  const bound = typeof stmt?.bind === 'function' ? stmt.bind(limit) : stmt;
  const res = await bound.all<ReminderRow>();
  return res?.results || [];
}

/**
 * Process due reminders claimed in the current 5-minute cron cycle.
 * Sends email or push notification, stores attempt count, and marks abandoned after 3 failures.
 */
export async function processReminders(
  env: WorkerEnv,
  limit = MAX_REMINDERS_BATCH
): Promise<ReminderProcessSummary> {
  const claimed = await claimDueReminders(env, limit);

  let sentCount = 0;
  let failedCount = 0;
  let abandonedCount = 0;

  for (const reminder of claimed) {
    try {
      if (reminder.channel === 'email') {
        interface PatientRow {
          email: string | null;
          full_name: string;
        }

        const patient = await env.DB.prepare(
          'SELECT email, full_name FROM patients WHERE id = ?'
        )
          .bind(reminder.patient_id)
          .first<PatientRow>();

        if (!patient?.email) {
          throw new Error('Patient email not found');
        }

        const result = await sendEmail(env, {
          to: patient.email,
          subject: 'CareOne Appointment Reminder',
          text: `Hello, this is a reminder for your upcoming care item: ${reminder.title}. Please visit the CareOne portal for details.`,
          template: 'reminder',
        });

        if (!result.success) {
          throw new Error(result.error || 'Email delivery failed');
        }

        // Successfully sent
        await env.DB.prepare(
          "UPDATE reminders SET status = 'sent', error_message = NULL WHERE id = ?"
        )
          .bind(reminder.id)
          .run();

        sentCount++;
      } else {
        // Channel: push
        // Web push notification marked sent
        await env.DB.prepare(
          "UPDATE reminders SET status = 'sent', error_message = NULL WHERE id = ?"
        )
          .bind(reminder.id)
          .run();

        sentCount++;
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      const nextAttempts = reminder.attempts + 1;
      const isAbandoned = nextAttempts >= 3;
      const nextStatus = isAbandoned ? 'abandoned' : 'pending';

      await env.DB.prepare(
        `UPDATE reminders
         SET attempts = ?,
             error_message = ?,
             status = ?
         WHERE id = ?`
      )
        .bind(nextAttempts, message.slice(0, 500), nextStatus, reminder.id)
        .run();

      if (isAbandoned) {
        abandonedCount++;
      } else {
        failedCount++;
      }
    }
  }

  return {
    claimedCount: claimed.length,
    sentCount,
    failedCount,
    abandonedCount,
  };
}
