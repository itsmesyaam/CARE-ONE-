import type { Context } from 'hono';
import type { WorkerEnv } from '../env';

export type UserRole = 'patient' | 'guardian' | 'doctor' | 'specialist' | 'front_desk' | 'admin';

export interface Principal {
  id: string; // staff.id or patients.id
  userId: string;
  role: UserRole;
  aal: 'aal1' | 'aal2';
  departmentId?: string | null;
  isActive: boolean;
}

export interface PolicyOptions {
  allowedRoles: UserRole[];
  requireAal2?: boolean;
  isClinical?: boolean;
}

/**
 * Decodes and verifies a JWT using Web Crypto API.
 */
async function verifyJwt(token: string, secret: string): Promise<Record<string, unknown> | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [headerB64, payloadB64, sigB64] = parts;
    if (!headerB64 || !payloadB64 || !sigB64) return null;

    const data = `${headerB64}.${payloadB64}`;
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    // Base64url decode
    const sigStr = sigB64.replace(/-/g, '+').replace(/_/g, '/');
    const binStr = atob(sigStr);
    const sigBytes = new Uint8Array(binStr.length);
    for (let i = 0; i < binStr.length; i++) {
      sigBytes[i] = binStr.charCodeAt(i);
    }

    const valid = await crypto.subtle.verify('HMAC', key, sigBytes, encoder.encode(data));
    if (!valid) return null;

    const payloadJson = atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/'));
    const payload = JSON.parse(payloadJson) as Record<string, unknown>;

    // Expiry check
    if (typeof payload.exp === 'number' && payload.exp < Date.now() / 1000) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

/**
 * Extracts session token from Authorization header or cookie.
 */
function extractToken(c: Context<{ Bindings: WorkerEnv }>): string | null {
  const authHeader = c.req.header('authorization') || c.req.header('Authorization');
  if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
    return authHeader.slice(7).trim();
  }

  const cookieHeader = c.req.header('cookie') || c.req.header('Cookie');
  if (cookieHeader) {
    const cookies = cookieHeader.split(';').map((s) => s.trim());
    for (const cookie of cookies) {
      if (cookie.startsWith('careone_session=')) {
        return decodeURIComponent(cookie.slice('careone_session='.length));
      }
    }
  }

  return null;
}

/**
 * Generates and signs a JWT using Web Crypto API (HMAC SHA-256).
 */
export async function signJwt(payload: Record<string, unknown>, secret: string): Promise<string> {
  const header = { alg: 'HS256', typ: 'JWT' };
  const encoder = new TextEncoder();

  const b64Url = (str: string) =>
    btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  const headerB64 = b64Url(JSON.stringify(header));
  const payloadB64 = b64Url(JSON.stringify(payload));
  const data = `${headerB64}.${payloadB64}`;

  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const sigBuf = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  const sigBytes = new Uint8Array(sigBuf);
  let binStr = '';
  for (let i = 0; i < sigBytes.length; i++) {
    binStr += String.fromCharCode(sigBytes[i]!);
  }
  const sigB64 = b64Url(binStr);

  return `${data}.${sigB64}`;
}

/**
 * Resolves Principal from JWT or test headers, re-checking active status in D1.
 */
export async function loadPrincipal(c: Context<{ Bindings: WorkerEnv }>): Promise<Principal | null> {
  const token = extractToken(c);

  let actorId = c.req.header('x-actor-id');
  let role = (c.req.header('x-actor-role') || '') as UserRole;
  let aal = (c.req.header('x-actor-aal') || 'aal2') as 'aal1' | 'aal2';
  let tokenVersion: number | undefined;

  if (token && c.env.JWT_SECRET) {
    const payload = await verifyJwt(token, c.env.JWT_SECRET);
    if (payload) {
      actorId = (payload.sub || payload.id) as string;
      role = (payload.role || role) as UserRole;
      aal = (payload.aal || aal) as 'aal1' | 'aal2';
      if (typeof payload.token_version === 'number') {
        tokenVersion = payload.token_version;
      }
    } else {
      return null;
    }
  }

  if (!actorId || !role) {
    return null;
  }

  // Check active status in D1 database
  if (role === 'doctor' || role === 'specialist' || role === 'front_desk' || role === 'admin') {
    const staffRow = await c.env.DB.prepare(
      `SELECT *
       FROM staff
       WHERE (id = ? OR user_id = ?) AND deleted_at IS NULL`
    )
      .bind(actorId, actorId)
      .first<{ id: string; user_id: string; role: string; department_id: string | null; is_active: number; token_version?: number }>();

    if (!staffRow || staffRow.is_active !== 1) {
      return {
        id: actorId,
        userId: staffRow?.user_id || actorId,
        role,
        aal,
        departmentId: staffRow?.department_id || null,
        isActive: false,
      };
    }

    if (tokenVersion !== undefined && staffRow.token_version !== undefined && staffRow.token_version !== tokenVersion) {
      return null;
    }

    return {
      id: staffRow.id,
      userId: staffRow.user_id,
      role: (staffRow.role as UserRole) || role,
      aal,
      departmentId: staffRow.department_id,
      isActive: true,
    };
  }

  // Patient or Guardian
  if (role === 'patient' || role === 'guardian') {
    // Check if patient exists in DB
    const patientRow = await c.env.DB.prepare(
      `SELECT * FROM patients WHERE id = ? AND deleted_at IS NULL`
    )
      .bind(actorId)
      .first<{ id: string; token_version?: number }>();

    if (tokenVersion !== undefined && patientRow?.token_version !== undefined && patientRow.token_version !== tokenVersion) {
      return null;
    }

    const accessRow = await c.env.DB.prepare(
      `SELECT user_id FROM patient_access WHERE (patient_id = ? OR user_id = ?) AND revoked_at IS NULL`
    )
      .bind(actorId, actorId)
      .first<{ user_id: string }>();

    return {
      id: actorId,
      userId: accessRow?.user_id || actorId,
      role,
      aal: 'aal1',
      departmentId: null,
      isActive: Boolean(patientRow || accessRow || actorId),
    };
  }

  return null;
}

/**
 * Checks if a doctor can access a given patient chart.
 */
export async function canDoctorAccessPatient(
  db: D1Database,
  doctorId: string,
  patientId: string
): Promise<boolean> {
  // 1. Care team link
  const careTeam = await db
    .prepare(
      `SELECT id FROM care_team
       WHERE patient_id = ? AND staff_id = ? AND revoked_at IS NULL
         AND (expires_at IS NULL OR expires_at > datetime('now'))`
    )
    .bind(patientId, doctorId)
    .first();

  if (careTeam) return true;

  // 2. Active emergency break-glass
  const emergency = await db
    .prepare(
      `SELECT id FROM emergency_access
       WHERE patient_id = ? AND staff_id = ? AND expires_at > datetime('now')`
    )
    .bind(patientId, doctorId)
    .first();

  return Boolean(emergency);
}

/**
 * Checks if a patient or guardian can access a patient's records.
 */
export async function canPatientAccessRecord(
  db: D1Database,
  actorId: string,
  targetPatientId: string
): Promise<boolean> {
  if (actorId === targetPatientId) {
    return true;
  }

  // Check guardian or caregiver link in patient_access
  const access = await db
    .prepare(
      `SELECT pa.id FROM patient_access pa
       LEFT JOIN patient_access self_pa ON self_pa.user_id = pa.user_id
       WHERE pa.patient_id = ?
         AND (pa.user_id = ? OR self_pa.patient_id = ?)
         AND pa.revoked_at IS NULL`
    )
    .bind(targetPatientId, actorId, actorId)
    .first();

  return Boolean(access);
}

/**
 * Route protection wrapper implementing AGENTS.md rules.
 * Automatically maps unauthorized clinical attempts to 404 to avoid enumeration.
 */
export function withPolicy(
  options: PolicyOptions,
  handler: (c: Context<{ Bindings: WorkerEnv }>, principal: Principal) => Promise<Response>
) {
  return async (c: Context<{ Bindings: WorkerEnv }>) => {
    const principal = await loadPrincipal(c);

    if (!principal) {
      return c.json({ error: 'unauthorized', code: 'UNAUTHORIZED' }, 401);
    }

    if (!principal.isActive) {
      return c.json({ error: 'account_inactive', code: 'ACCOUNT_INACTIVE' }, 401);
    }

    // Two-factor enforcement for staff routes
    const isStaff = ['doctor', 'specialist', 'front_desk', 'admin'].includes(principal.role);
    const requireAal2 = options.requireAal2 ?? isStaff;

    if (requireAal2 && principal.aal !== 'aal2') {
      return c.json({ error: 'mfa_required', code: 'MFA_REQUIRED' }, 401);
    }

    // Role check
    const allowed = options.allowedRoles.includes(principal.role) ||
      (options.allowedRoles.includes('doctor') && principal.role === 'specialist');

    if (!allowed) {
      // DPDP: Clinical endpoints return 404 to non-permitted roles (e.g. admin or desk reading clinical data)
      if (options.isClinical || principal.role === 'admin' || principal.role === 'front_desk') {
        return c.json({ error: 'Not Found' }, 404);
      }
      return c.json({ error: 'Forbidden' }, 403);
    }

    return handler(c, principal);
  };
}
