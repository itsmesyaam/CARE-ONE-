import type { WorkerEnv } from '../env';

export const MAX_DAILY_EMAILS = 95;
export const STAFF_RESERVED_SLOTS = 20;
export const NON_STAFF_MAX_EMAILS = MAX_DAILY_EMAILS - STAFF_RESERVED_SLOTS; // 75
export const DEFAULT_FROM = 'CareOne <noreply@careone.in>';

export interface SendEmailOptions {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  template?: string;
  isStaffSignIn?: boolean;
}

export interface SendEmailResult {
  success: boolean;
  id?: string;
  dailyCount?: number;
  rateLimited?: boolean;
  error?: string;
}

/**
 * Returns date in YYYY-MM-DD ISO format for Asia/Kolkata timezone.
 */
export function getKolkataDateString(date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(date);
}

const FORBIDDEN_SUBJECT_PATTERNS = [
  /[A-Z]{3}-\d{4}/i, // UHID pattern e.g. ABC-1001
  /\buhid\b/i,
  /\bdiabetes\b/i,
  /\bhypertension\b/i,
  /\bchemotherapy\b/i,
  /\bcancer\b/i,
  /\bhiv\b/i,
  /\btuberculosis\b/i,
  /\bbiopsy\b/i,
  /\bdiagnosis\b/i,
  /\blab report results\b/i,
];

/**
 * Validates that email subjects remain strictly free of patient clinical data or identifiers.
 */
export function validateEmailSubject(subject: string): boolean {
  if (!subject || subject.trim().length === 0) return false;
  for (const pattern of FORBIDDEN_SUBJECT_PATTERNS) {
    if (pattern.test(subject)) {
      return false;
    }
  }
  return true;
}

/**
 * Hashes recipient email address for privacy before writing to operational logs.
 */
async function hashRecipient(email: string): Promise<string> {
  const data = new TextEncoder().encode(email.toLowerCase().trim());
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Returns operational email quota metrics and warns at 75% usage.
 */
export async function getEmailUsage(env: WorkerEnv): Promise<{
  date: string;
  count: number;
  max: number;
  reservedForStaff: number;
  nonStaffLimit: number;
  usagePercent: number;
  warningBanner: boolean;
}> {
  const today = getKolkataDateString();
  const row = await env.DB.prepare(
    'SELECT count FROM email_daily_counts WHERE date = ?'
  )
    .bind(today)
    .first<{ count: number }>();
  const count = row?.count || 0;
  const usagePercent = Math.round((count / MAX_DAILY_EMAILS) * 100);
  const warningBanner = count >= 71;
  return {
    date: today,
    count,
    max: MAX_DAILY_EMAILS,
    reservedForStaff: STAFF_RESERVED_SLOTS,
    nonStaffLimit: NON_STAFF_MAX_EMAILS,
    usagePercent,
    warningBanner,
  };
}

/**
 * Sends an email using Resend, enforcing the strict 95 emails/day quota in D1.
 * Blocks transmission and logs a warning when the quota is reached to keep the deployment on the free plan.
 * Reserves the final 20 slots of each day strictly for staff sign-in codes.
 */
export async function sendEmail(
  env: WorkerEnv,
  options: SendEmailOptions,
  isStaff?: boolean
): Promise<SendEmailResult> {
  if (!validateEmailSubject(options.subject)) {
    throw new Error('Email subject cannot contain patient clinical data or identifiers');
  }

  const today = getKolkataDateString();
  const isStaffSignIn = options.isStaffSignIn ?? isStaff;
  const threshold = isStaffSignIn === false ? NON_STAFF_MAX_EMAILS : MAX_DAILY_EMAILS;

  interface CountRow {
    count: number;
  }

  // Atomically reserve a daily email slot in D1
  const row = await env.DB.prepare(
    `INSERT INTO email_daily_counts (date, count, updated_at)
     VALUES (?, 1, datetime('now'))
     ON CONFLICT(date) DO UPDATE SET
       count = count + 1,
       updated_at = datetime('now')
     WHERE count < ?
     RETURNING count;`
  )
    .bind(today, threshold)
    .first<CountRow>();

  const recipientHash = await hashRecipient(options.to);
  const logId = crypto.randomUUID();

  // If row is undefined, the relevant quota has been reached
  if (!row) {
    const errorMsg =
      isStaffSignIn === false
        ? 'Daily non-staff email limit reached (75/day). Remaining slots reserved for staff sign-in.'
        : 'Daily email quota reached (95/day). Delivery stopped to stay within free plan.';

    console.warn(`[EMAIL_LIMIT] ${errorMsg}`);

    try {
      await env.DB.prepare(
        `INSERT INTO email_logs (id, recipient_hash, template, subject, status, error_message)
         VALUES (?, ?, ?, ?, 'rate_limited', ?)`
      )
        .bind(logId, recipientHash, options.template || 'generic', options.subject, errorMsg)
        .run();
    } catch {
      // Non-blocking log insert
    }

    return {
      success: false,
      rateLimited: true,
      dailyCount: isStaffSignIn ? MAX_DAILY_EMAILS : NON_STAFF_MAX_EMAILS,
      error: errorMsg,
    };
  }

  const dailyCount = row.count;
  const fromAddress = env.EMAIL_FROM || DEFAULT_FROM;
  const apiKey = env.RESEND_API_KEY;

  if (!apiKey) {
    // Development or test mode without API key
    try {
      await env.DB.prepare(
        `INSERT INTO email_logs (id, recipient_hash, template, subject, status)
         VALUES (?, ?, ?, ?, 'sent')`
      )
        .bind(logId, recipientHash, options.template || 'generic', options.subject)
        .run();
    } catch {
      // Non-blocking log insert
    }

    return { success: true, id: `dev-sim-${logId}`, dailyCount };
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromAddress,
        to: [options.to],
        subject: options.subject,
        html: options.html,
        text: options.text || options.html,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      try {
        await env.DB.prepare(
          `INSERT INTO email_logs (id, recipient_hash, template, subject, status, error_message)
           VALUES (?, ?, ?, ?, 'failed', ?)`
        )
          .bind(logId, recipientHash, options.template || 'generic', options.subject, errText.slice(0, 500))
          .run();
      } catch {
        // Non-blocking log insert
      }

      return { success: false, error: `Resend error (${res.status}): ${errText}`, dailyCount };
    }

    const data = (await res.json()) as { id?: string };
    try {
      await env.DB.prepare(
        `INSERT INTO email_logs (id, recipient_hash, template, subject, status)
         VALUES (?, ?, ?, ?, 'sent')`
      )
        .bind(logId, recipientHash, options.template || 'generic', options.subject)
        .run();
    } catch {
      // Non-blocking log insert
    }

    return { success: true, id: data.id || logId, dailyCount };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    try {
      await env.DB.prepare(
        `INSERT INTO email_logs (id, recipient_hash, template, subject, status, error_message)
         VALUES (?, ?, ?, ?, 'failed', ?)`
      )
        .bind(logId, recipientHash, options.template || 'generic', options.subject, message)
        .run();
    } catch {
      // Non-blocking log insert
    }

    return { success: false, error: message, dailyCount };
  }
}
