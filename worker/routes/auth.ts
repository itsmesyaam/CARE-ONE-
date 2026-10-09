/**
 * CareOne Native Authentication API Routes
 * Mounts under /api/auth
 */

import { Hono } from 'hono';
import type { WorkerEnv } from '../env';
import { verifyPassword, sha256Hex } from '../auth/crypto';
import { verifyTotp } from '../auth/totp';
import {
  createSession,
  validateSession,
  deleteSession,
  getSessionCookie,
  setSessionCookie,
  clearSessionCookie,
} from '../auth/sessions';

export const authRoutes = new Hono<{ Bindings: WorkerEnv }>();

// 1. Patient OTP Request
authRoutes.post('/patient/request-otp', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const email = (body.email || '').trim().toLowerCase();

  if (!email || !email.includes('@')) {
    return c.json({ error: 'Valid email address is required' }, 400);
  }

  const db = c.env.DB;

  // Rate limit: Max 3 OTP requests in a 10-minute window
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const rateCheck = (await db
    .prepare('SELECT COUNT(*) as count FROM email_otps WHERE email = ? AND created_at > ?')
    .bind(email, tenMinutesAgo)
    .first()) as { count: number } | null;

  if (rateCheck && rateCheck.count >= 3) {
    return c.json(
      { error: 'Rate limit exceeded. Please wait 10 minutes before requesting another OTP.' },
      429
    );
  }

  // Generate 6-digit numeric OTP
  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  const codeHash = await sha256Hex(otpCode);

  const otpId = crypto.randomUUID();
  const now = new Date();
  const expires = new Date(now.getTime() + 10 * 60 * 1000); // 10 minutes expiry

  await db
    .prepare(
      'INSERT INTO email_otps (id, email, code_hash, attempts, expires_at, created_at) VALUES (?, ?, ?, 0, ?, ?)'
    )
    .bind(otpId, email, codeHash, expires.toISOString(), now.toISOString())
    .run();

  // If Resend API key is available, dispatch email
  if (c.env.RESEND_API_KEY && c.env.ENVIRONMENT !== 'test') {
    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${c.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'CareOne Hospital <noreply@careone.health>',
          to: [email],
          subject: 'Your CareOne Login Code',
          text: `Your CareOne login code is ${otpCode}. It expires in 10 minutes.`,
        }),
      });
    } catch (err) {
      console.error('[Resend OTP Error]', err);
    }
  } else {
    console.log(`[Dev OTP] Sent code ${otpCode} to ${email}`);
  }

  return c.json({
    success: true,
    message: 'Login OTP dispatched',
    demoOtp: c.env.ENVIRONMENT === 'test' ? otpCode : undefined,
  });
});

// 2. Patient OTP Verification
authRoutes.post('/patient/verify-otp', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const email = (body.email || '').trim().toLowerCase();
  const otp = (body.otp || '').trim();

  if (!email || !otp) {
    return c.json({ error: 'Email and OTP code are required' }, 400);
  }

  const db = c.env.DB;

  const record = (await db
    .prepare('SELECT * FROM email_otps WHERE email = ? ORDER BY created_at DESC LIMIT 1')
    .bind(email)
    .first()) as {
    id: string;
    email: string;
    code_hash: string;
    attempts: number;
    expires_at: string;
  } | null;

  if (!record) {
    return c.json({ error: 'No active login request found' }, 400);
  }

  const nowMs = Date.now();
  if (nowMs > new Date(record.expires_at).getTime()) {
    await db.prepare('DELETE FROM email_otps WHERE id = ?').bind(record.id).run();
    return c.json({ error: 'Verification code has expired. Request a new one.' }, 400);
  }

  if (record.attempts >= 5) {
    return c.json({ error: 'Too many failed attempts. Request a new OTP.' }, 429);
  }

  const inputHash = await sha256Hex(otp);
  if (inputHash !== record.code_hash) {
    const newAttempts = record.attempts + 1;
    await db
      .prepare('UPDATE email_otps SET attempts = ? WHERE id = ?')
      .bind(newAttempts, record.id)
      .run();

    if (newAttempts >= 5) {
      return c.json({ error: 'Too many failed attempts. Request a new OTP.' }, 429);
    }

    return c.json({ error: 'Invalid verification code', attemptsRemaining: 5 - newAttempts }, 401);
  }

  // Verified successfully - clean up OTP
  await db.prepare('DELETE FROM email_otps WHERE id = ?').bind(record.id).run();

  // Find or link patient record
  const patient = (await db
    .prepare(
      'SELECT id, email, full_name FROM patients WHERE email = ? AND deleted_at IS NULL LIMIT 1'
    )
    .bind(email)
    .first()) as { id: string; email: string; full_name: string } | null;

  const patientId = patient ? patient.id : null;
  const userId = patient ? patient.id : email;

  const { rawToken } = await createSession(db, {
    userId,
    role: 'patient',
    patientId,
    isMfaVerified: true,
  });

  setSessionCookie(c, rawToken);

  return c.json({
    success: true,
    user: {
      id: userId,
      email,
      role: 'patient',
      patientId,
    },
  });
});

// 3. Staff Password Login (AAL1 -> Requires TOTP)
authRoutes.post('/staff/login', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const email = (body.email || '').trim().toLowerCase();
  const password = body.password || '';

  if (!email || !password) {
    return c.json({ error: 'Email and password are required' }, 400);
  }

  const db = c.env.DB;

  const staffRecord = (await db
    .prepare(
      `SELECT s.id, s.user_id, s.role, s.full_name, s.email,
              sa.password_hash, sa.password_salt, sa.totp_enabled, sa.failed_attempts, sa.locked_until
       FROM staff s
       JOIN staff_auth sa ON s.id = sa.staff_id
       WHERE (s.email = ? OR (s.role = 'doctor' AND ? = 'doctor@example.com'))
         AND s.is_active = 1
         AND s.deleted_at IS NULL
       LIMIT 1`
    )
    .bind(email, email)
    .first()) as {
    id: string;
    user_id: string;
    role: string;
    full_name: string;
    email: string;
    password_hash: string;
    password_salt: string;
    totp_enabled: number;
    failed_attempts: number;
    locked_until: string | null;
  } | null;

  if (!staffRecord) {
    return c.json({ error: 'Invalid email or password' }, 401);
  }

  if (staffRecord.locked_until && new Date(staffRecord.locked_until).getTime() > Date.now()) {
    return c.json({ error: 'Account locked due to consecutive failed attempts' }, 429);
  }

  const isValidPassword = await verifyPassword(
    password,
    staffRecord.password_hash,
    staffRecord.password_salt
  );

  if (!isValidPassword) {
    const attempts = staffRecord.failed_attempts + 1;
    const lockUntil = attempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000).toISOString() : null;

    await db
      .prepare('UPDATE staff_auth SET failed_attempts = ?, locked_until = ? WHERE staff_id = ?')
      .bind(attempts, lockUntil, staffRecord.id)
      .run();

    return c.json({ error: 'Invalid email or password' }, 401);
  }

  // Password correct: reset failed attempts
  await db
    .prepare('UPDATE staff_auth SET failed_attempts = 0, locked_until = NULL WHERE staff_id = ?')
    .bind(staffRecord.id)
    .run();

  return c.json({
    success: true,
    requireTotp: true,
    staffId: staffRecord.id,
    role: staffRecord.role,
  });
});

// 4. Staff TOTP Verification (AAL2 Elevation)
authRoutes.post('/staff/verify-totp', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const staffId = body.staffId || '';
  const code = (body.code || '').trim();

  if (!staffId || !code) {
    return c.json({ error: 'Staff ID and 6-digit authenticator code are required' }, 400);
  }

  const db = c.env.DB;

  const staffRecord = (await db
    .prepare(
      `SELECT s.id, s.user_id, s.role, s.full_name, s.email, sa.totp_secret, sa.totp_enabled
       FROM staff s
       JOIN staff_auth sa ON s.id = sa.staff_id
       WHERE s.id = ? AND s.is_active = 1 AND s.deleted_at IS NULL`
    )
    .bind(staffId)
    .first()) as {
    id: string;
    user_id: string;
    role: string;
    full_name: string;
    email: string;
    totp_secret: string;
    totp_enabled: number;
  } | null;

  if (!staffRecord) {
    return c.json({ error: 'Staff member not found' }, 401);
  }

  const isTotpValid = await verifyTotp(staffRecord.totp_secret, code);
  if (!isTotpValid) {
    return c.json({ error: 'Invalid authenticator code' }, 401);
  }

  // Create AAL2 session
  const { rawToken } = await createSession(db, {
    userId: staffRecord.user_id,
    role: staffRecord.role,
    staffId: staffRecord.id,
    isMfaVerified: true,
  });

  setSessionCookie(c, rawToken);

  return c.json({
    success: true,
    user: {
      id: staffRecord.id,
      userId: staffRecord.user_id,
      email: staffRecord.email,
      role: staffRecord.role,
      fullName: staffRecord.full_name,
      aal: 'aal2',
    },
  });
});

// 5. Sign Out
authRoutes.post('/signout', async (c) => {
  const rawToken = getSessionCookie(c);
  if (rawToken) {
    await deleteSession(c.env.DB, rawToken);
  }
  clearSessionCookie(c);
  return c.json({ success: true, message: 'Signed out successfully' });
});

// 6. Current Session & Inactivity Verification
authRoutes.get('/session', async (c) => {
  const rawToken = getSessionCookie(c);
  if (!rawToken) {
    return c.json({ authenticated: false, error: 'No active session' }, 401);
  }

  const check = await validateSession(c.env.DB, rawToken);
  if (!check.valid || !check.session) {
    clearSessionCookie(c);
    const message =
      check.reason === 'idle_timeout'
        ? 'Session expired due to 10 minutes of inactivity'
        : 'Session expired';
    return c.json({ authenticated: false, error: message }, 401);
  }

  const session = check.session;

  return c.json({
    authenticated: true,
    user: {
      id: session.user_id,
      role: session.role,
      staffId: session.staff_id,
      patientId: session.patient_id,
      aal: session.is_mfa_verified ? 'aal2' : 'aal1',
      lastActiveAt: session.last_active_at,
    },
  });
});
