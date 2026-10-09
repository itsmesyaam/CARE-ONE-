/**
 * CareOne Native Session Management & D1 Storage
 * Enforces 10-minute idle session timeout and HttpOnly Secure SameSite=Strict cookies.
 */

import type { Context } from 'hono';
import { generateRandomToken, sha256Hex } from './crypto';

export const SESSION_COOKIE_NAME = 'careone_session';
export const IDLE_TIMEOUT_SECONDS = 10 * 60; // 10 minutes (600 seconds)
export const MAX_SESSION_LIFETIME_SECONDS = 7 * 24 * 60 * 60; // 7 days

export interface CreateSessionParams {
  userId: string;
  role: string;
  staffId?: string | null;
  patientId?: string | null;
  isMfaVerified?: boolean;
}

export interface SessionRecord {
  id: string;
  token_hash: string;
  user_id: string;
  role: string;
  staff_id: string | null;
  patient_id: string | null;
  is_mfa_verified: number;
  created_at: string;
  last_active_at: string;
  expires_at: string;
}

export interface ValidateSessionResult {
  valid: boolean;
  reason?: 'not_found' | 'expired' | 'idle_timeout';
  session?: SessionRecord;
}

/**
 * Creates a new session record in Cloudflare D1 and returns the raw session token.
 */
export async function createSession(
  d1: D1Database,
  params: CreateSessionParams
): Promise<{ rawToken: string; session: SessionRecord }> {
  const rawToken = generateRandomToken(32);
  const tokenHash = await sha256Hex(rawToken);

  const sessionId = crypto.randomUUID();
  const now = new Date();
  const expires = new Date(now.getTime() + MAX_SESSION_LIFETIME_SECONDS * 1000);

  const nowIso = now.toISOString();
  const expiresIso = expires.toISOString();

  await d1
    .prepare(
      `INSERT INTO sessions (
        id, token_hash, user_id, role, staff_id, patient_id, is_mfa_verified, created_at, last_active_at, expires_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      sessionId,
      tokenHash,
      params.userId,
      params.role,
      params.staffId || null,
      params.patientId || null,
      params.isMfaVerified ? 1 : 0,
      nowIso,
      nowIso,
      expiresIso
    )
    .run();

  const session: SessionRecord = {
    id: sessionId,
    token_hash: tokenHash,
    user_id: params.userId,
    role: params.role,
    staff_id: params.staffId || null,
    patient_id: params.patientId || null,
    is_mfa_verified: params.isMfaVerified ? 1 : 0,
    created_at: nowIso,
    last_active_at: nowIso,
    expires_at: expiresIso,
  };

  return { rawToken, session };
}

/**
 * Validates a raw session token against D1, checking expiry and 10-minute idle inactivity.
 */
export async function validateSession(
  d1: D1Database,
  rawToken: string
): Promise<ValidateSessionResult> {
  if (!rawToken || typeof rawToken !== 'string') {
    return { valid: false, reason: 'not_found' };
  }

  const tokenHash = await sha256Hex(rawToken);

  const record = (await d1
    .prepare('SELECT * FROM sessions WHERE token_hash = ?')
    .bind(tokenHash)
    .first()) as SessionRecord | null;

  if (!record) {
    return { valid: false, reason: 'not_found' };
  }

  const nowMs = Date.now();
  const expiresMs = new Date(record.expires_at).getTime();

  if (nowMs > expiresMs) {
    // Delete expired session
    await d1.prepare('DELETE FROM sessions WHERE id = ?').bind(record.id).run();
    return { valid: false, reason: 'expired' };
  }

  // Check 10-minute idle inactivity timeout
  const lastActiveMs = new Date(record.last_active_at).getTime();
  if (nowMs - lastActiveMs > IDLE_TIMEOUT_SECONDS * 1000) {
    // Inactivity lockout
    await d1.prepare('DELETE FROM sessions WHERE id = ?').bind(record.id).run();
    return { valid: false, reason: 'idle_timeout' };
  }

  // Update last_active_at timestamp to reset idle timer
  const refreshedIso = new Date(nowMs).toISOString();
  await d1
    .prepare('UPDATE sessions SET last_active_at = ? WHERE id = ?')
    .bind(refreshedIso, record.id)
    .run();

  record.last_active_at = refreshedIso;
  return { valid: true, session: record };
}

/**
 * Deletes a session by raw token.
 */
export async function deleteSession(d1: D1Database, rawToken: string): Promise<void> {
  if (!rawToken) return;
  const tokenHash = await sha256Hex(rawToken);
  await d1.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(tokenHash).run();
}

/**
 * Extracts session token from Cookie header.
 */
export function getSessionCookie(c: Context): string | null {
  const cookieHeader = c.req.header('Cookie');
  if (!cookieHeader) return null;

  const cookies = cookieHeader.split(';').map((c) => c.trim());
  for (const cookie of cookies) {
    if (cookie.startsWith(`${SESSION_COOKIE_NAME}=`)) {
      return cookie.substring(SESSION_COOKIE_NAME.length + 1);
    }
  }
  return null;
}

/**
 * Sets HttpOnly Secure SameSite=Strict cookie for session token.
 */
export function setSessionCookie(c: Context, rawToken: string): void {
  // Use append header for Set-Cookie
  const cookie = `${SESSION_COOKIE_NAME}=${rawToken}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${MAX_SESSION_LIFETIME_SECONDS}`;
  c.header('Set-Cookie', cookie, { append: true });
}

/**
 * Clears session cookie on signout or invalidation.
 */
export function clearSessionCookie(c: Context): void {
  const cookie = `${SESSION_COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT`;
  c.header('Set-Cookie', cookie, { append: true });
}
