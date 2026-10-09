/**
 * CareOne Access Layer Middleware & Authorization Engine
 *
 * Enforces strict default-deny, explicit role declarations, AAL2 two-factor
 * authentication for staff, Origin header validation on state-changing requests,
 * and database-level SQL patient scoping (care team, guardian, patient self-access).
 */

import type { Context, Next, MiddlewareHandler } from 'hono';
import type { WorkerEnv } from '../env';
import { getSessionCookie, validateSession } from '../auth/sessions';

export type AppRole = 'patient' | 'guardian' | 'doctor' | 'front_desk' | 'admin';

export interface AccessPolicy {
  allowedRoles: AppRole[];
  requireMfa?: boolean; // defaults to true for staff, false for patients
  patientScoped?: boolean; // verifies caller is authorized for target patientId
  allowEmergencyAccess?: boolean; // allows doctor with active break-glass emergency access
  public?: boolean; // public route (no session required)
}

export interface AuthenticatedUser {
  id: string;
  role: AppRole;
  staffId: string | null;
  patientId: string | null;
  isMfaVerified: boolean;
}

// Registry tracking all declared route policies
const routePolicyRegistry = new Map<string, AccessPolicy>();

export function registerRoutePolicy(key: string, policy: AccessPolicy): void {
  routePolicyRegistry.set(key, policy);
}

export function getRoutePolicies(): Map<string, AccessPolicy> {
  return routePolicyRegistry;
}

/**
 * Validates Origin header for state-changing requests (CSRF protection).
 */
export function validateOrigin(c: Context): boolean {
  const method = c.req.method.toUpperCase();
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    return true;
  }

  const originHeader = c.req.header('Origin');
  if (!originHeader) {
    // If Origin is omitted (e.g. some native app/testing callers), allow only if Sec-Fetch-Site is not cross-site
    const secFetchSite = c.req.header('Sec-Fetch-Site');
    if (secFetchSite === 'cross-site') {
      return false;
    }
    return true;
  }

  try {
    const requestUrl = new URL(c.req.url);
    const originUrl = new URL(originHeader);

    // Exact origin match
    if (originUrl.origin === requestUrl.origin) {
      return true;
    }

    // Local development/test allowances
    if (
      (originUrl.hostname === 'localhost' || originUrl.hostname === '127.0.0.1') &&
      (requestUrl.hostname === 'localhost' || requestUrl.hostname === '127.0.0.1')
    ) {
      return true;
    }
  } catch {
    return false;
  }

  return false;
}

/**
 * Checks if a doctor is currently on the active care team for a patient.
 */
export async function isDoctorOnCareTeam(
  db: D1Database,
  staffId: string,
  patientId: string
): Promise<boolean> {
  const nowIso = new Date().toISOString();
  const result = await db
    .prepare(
      `SELECT 1 FROM care_team
       WHERE staff_id = ? AND patient_id = ?
         AND active = 1
         AND (expires_at IS NULL OR expires_at > ?)
       LIMIT 1`
    )
    .bind(staffId, patientId, nowIso)
    .first();

  return !!result;
}

/**
 * Checks if a doctor has an active break-glass emergency access grant (< 4 hours).
 */
export async function hasActiveEmergencyAccess(
  db: D1Database,
  staffId: string,
  patientId: string
): Promise<boolean> {
  const nowIso = new Date().toISOString();
  const result = await db
    .prepare(
      `SELECT 1 FROM emergency_access
       WHERE staff_id = ? AND patient_id = ? AND expires_at > ?
       LIMIT 1`
    )
    .bind(staffId, patientId, nowIso)
    .first();

  return !!result;
}

/**
 * Checks if a user is an authorized guardian or caregiver for a dependent patient.
 */
export async function isAuthorizedGuardian(
  db: D1Database,
  userId: string,
  patientId: string
): Promise<boolean> {
  const result = await db
    .prepare(
      `SELECT 1 FROM patient_access
       WHERE (user_id = ? OR user_id IN (SELECT user_id FROM patient_access WHERE patient_id = ?))
         AND patient_id = ?
         AND relationship IN ('guardian', 'caregiver')
       LIMIT 1`
    )
    .bind(userId, userId, patientId)
    .first();

  return !!result;
}

export interface AccessVariables {
  user: AuthenticatedUser;
  targetPatientId?: string;
}

/**
 * Access guard middleware enforcing policy rules on a route.
 */
export function requireAccess(
  policy: AccessPolicy
): MiddlewareHandler<{ Bindings: WorkerEnv; Variables: AccessVariables }> {
  return async (
    c: Context<{ Bindings: WorkerEnv; Variables: AccessVariables }>,
    next: Next
  ) => {
    // 1. Origin validation on state-changing requests
    if (!validateOrigin(c)) {
      return c.json({ error: 'CSRF Origin mismatch: State-changing request denied' }, 403);
    }

    // 2. Public route bypass
    if (policy.public) {
      return next();
    }

    // 3. Session extraction and verification
    const rawToken = getSessionCookie(c);
    if (!rawToken) {
      return c.json({ error: 'Unauthenticated: Valid session required' }, 401);
    }

    const check = await validateSession(c.env.DB, rawToken);
    if (!check.valid || !check.session) {
      const msg =
        check.reason === 'idle_timeout'
          ? 'Session expired due to 10 minutes of inactivity'
          : 'Invalid or expired session';
      return c.json({ error: msg }, 401);
    }

    const session = check.session;
    const userRole = session.role as AppRole;
    const isMfa = session.is_mfa_verified === 1;

    // 4. Role Authorization Check
    if (!policy.allowedRoles.includes(userRole)) {
      if (userRole === 'admin') {
        return c.json(
          { error: 'Forbidden: Admin cannot access individual clinical records' },
          403
        );
      }
      return c.json({ error: `Forbidden: Role '${userRole}' not authorized for this route` }, 403);
    }

    // 5. Staff Two-Factor MFA Enforcement (AAL2)
    const isStaff = ['doctor', 'front_desk', 'admin'].includes(userRole);
    const requireMfa = policy.requireMfa ?? isStaff;
    if (requireMfa && !isMfa) {
      return c.json(
        { error: 'Forbidden: Two-factor authentication (AAL2) required for staff routes' },
        403
      );
    }

    // 6. Patient Scoping Verification (SQL WHERE Isolation)
    if (policy.patientScoped) {
      const targetPatientId =
        c.req.param('patientId') ||
        c.req.query('patient_id') ||
        (await c.req.raw.clone().json().then(b => (b as { patient_id?: string })?.patient_id).catch(() => null));

      if (!targetPatientId) {
        return c.json({ error: 'Target patient ID is required for scoped route' }, 400);
      }

      const db = c.env.DB;

      if (userRole === 'admin') {
        return c.json(
          { error: 'Forbidden: Admin cannot access individual clinical records' },
          403
        );
      }

      if (userRole === 'patient') {
        const isSelf = session.patient_id === targetPatientId || session.user_id === targetPatientId;
        if (!isSelf) {
          return c.json(
            { error: 'Forbidden: Patient isolation violation (cannot access other patients)' },
            403
          );
        }
      } else if (userRole === 'guardian') {
        const authorized = await isAuthorizedGuardian(db, session.user_id, targetPatientId);
        if (!authorized) {
          return c.json(
            { error: 'Forbidden: Guardian not authorized for target patient' },
            403
          );
        }
      } else if (userRole === 'doctor') {
        if (!session.staff_id) {
          return c.json({ error: 'Doctor session lacks staff record' }, 403);
        }

        const onTeam = await isDoctorOnCareTeam(db, session.staff_id, targetPatientId);
        if (!onTeam) {
          const hasEmergency = policy.allowEmergencyAccess
            ? await hasActiveEmergencyAccess(db, session.staff_id, targetPatientId)
            : false;

          if (!hasEmergency) {
            return c.json(
              { error: 'Forbidden: Doctor not authorized on patient care team' },
              403
            );
          }
        }
      } else if (userRole === 'front_desk') {
        return c.json(
          { error: 'Forbidden: Front desk cannot access clinical records' },
          403
        );
      }

      c.set('targetPatientId', targetPatientId);
    }

    // Attach validated user to context
    c.set('user', {
      id: session.user_id,
      role: userRole,
      staffId: session.staff_id,
      patientId: session.patient_id,
      isMfaVerified: isMfa,
    });

    return next();
  };
}

/**
 * Helper to register a route with an explicit access policy.
 */
export function declareRoutePolicy(
  method: string,
  path: string,
  policy: AccessPolicy
): AccessPolicy {
  registerRoutePolicy(`${method.toUpperCase()} ${path}`, policy);
  return policy;
}
