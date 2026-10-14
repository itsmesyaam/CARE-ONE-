import { Hono } from 'hono';
import type { Context } from 'hono';
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import type {
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
} from '@simplewebauthn/server';
import type { WorkerEnv } from '../env';
import { loadPrincipal, signJwt } from '../auth/policy';

export const passkeyRouter = new Hono<{ Bindings: WorkerEnv }>();

export async function hashToken(token: string): Promise<string> {
  const data = new TextEncoder().encode(token.trim());
  const hashBuf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function getRpId(c: Context<{ Bindings: WorkerEnv }>): string {
  if (c.env.RP_ID) return c.env.RP_ID;
  try {
    const url = new URL(c.req.url);
    return url.hostname;
  } catch {
    return 'care-one.syam18official.workers.dev';
  }
}

function getExpectedOrigin(c: Context<{ Bindings: WorkerEnv }>): string {
  if (c.env.ORIGIN) return c.env.ORIGIN;
  try {
    const url = new URL(c.req.url);
    return url.origin;
  } catch {
    return 'https://care-one.syam18official.workers.dev';
  }
}

interface SetupTokenRow {
  id: string;
  user_id: string;
  token_hash: string;
  purpose: 'patient_setup' | 'staff_setup' | 'patient' | 'staff';
  created_by: string;
  expires_at: string;
  used_at: string | null;
}

interface PasskeyRow {
  id: string;
  user_id: string;
  credential_id: string;
  public_key: string;
  counter: number;
  transports: string | null;
  device_label: string | null;
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
}

// 1. POST /api/auth/passkey/register/options
passkeyRouter.post('/register/options', async (c) => {
  const body = await c.req.json<{ token?: string }>();
  if (!body.token) {
    return c.json({ error: 'Setup token is required' }, 400);
  }

  const tokenHash = await hashToken(body.token);
  const setupToken = await c.env.DB.prepare(
    `SELECT * FROM setup_tokens
     WHERE token_hash = ? AND used_at IS NULL AND expires_at > datetime('now')
     LIMIT 1`
  )
    .bind(tokenHash)
    .first<SetupTokenRow>();

  if (!setupToken) {
    return c.json({ error: 'Invalid or expired setup token' }, 400);
  }

  // Look up user details
  let userName = setupToken.user_id;
  let userDisplayName = 'CareOne User';

  const isPatientSetup = setupToken.purpose === 'patient' || setupToken.purpose === 'patient_setup';
  if (isPatientSetup) {
    const patient = await c.env.DB.prepare('SELECT full_name, uhid FROM patients WHERE id = ?')
      .bind(setupToken.user_id)
      .first<{ full_name: string; uhid: string }>();
    if (patient) {
      userName = patient.uhid || patient.full_name;
      userDisplayName = patient.full_name;
    }
  } else {
    const staff = await c.env.DB.prepare('SELECT full_name, user_id FROM staff WHERE id = ?')
      .bind(setupToken.user_id)
      .first<{ full_name: string; user_id: string }>();
    if (staff) {
      userName = staff.user_id || staff.full_name;
      userDisplayName = staff.full_name;
    }
  }

  const rpId = getRpId(c);
  const options = await generateRegistrationOptions({
    rpName: 'CareOne Hospital',
    rpID: rpId,
    userName,
    userDisplayName,
    attestationType: 'none',
    authenticatorSelection: {
      userVerification: 'required',
      residentKey: 'preferred',
    },
  });

  // Store challenge with 5-minute expiry
  const challengeId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
  await c.env.DB.prepare(
    `INSERT INTO webauthn_challenges (id, challenge, user_id, expires_at)
     VALUES (?, ?, ?, ?)`
  )
    .bind(challengeId, options.challenge, setupToken.user_id, expiresAt)
    .run();

  return c.json({
    options,
    user_id: setupToken.user_id,
    purpose: setupToken.purpose,
    displayName: userDisplayName,
  });
});

// 2. POST /api/auth/passkey/register/verify
passkeyRouter.post('/register/verify', async (c) => {
  const body = await c.req.json<{
    token: string;
    response: RegistrationResponseJSON;
    device_label?: string;
  }>();

  if (!body.token || !body.response) {
    return c.json({ error: 'Token and registration response are required' }, 400);
  }

  const tokenHash = await hashToken(body.token);
  const setupToken = await c.env.DB.prepare(
    `SELECT * FROM setup_tokens
     WHERE token_hash = ? AND used_at IS NULL AND expires_at > datetime('now')
     LIMIT 1`
  )
    .bind(tokenHash)
    .first<SetupTokenRow>();

  if (!setupToken) {
    return c.json({ error: 'Invalid or expired setup token' }, 400);
  }

  // Fetch challenge for user
  const challengeRow = await c.env.DB.prepare(
    `SELECT * FROM webauthn_challenges
     WHERE user_id = ? AND expires_at > datetime('now')
     ORDER BY created_at DESC LIMIT 1`
  )
    .bind(setupToken.user_id)
    .first<{ id: string; challenge: string }>();

  if (!challengeRow) {
    return c.json({ error: 'Registration challenge expired. Please retry.' }, 400);
  }

  const rpId = getRpId(c);
  const expectedOrigin = getExpectedOrigin(c);

  let verification;
  try {
    verification = await verifyRegistrationResponse({
      response: body.response,
      expectedChallenge: challengeRow.challenge,
      expectedOrigin,
      expectedRPID: rpId,
      requireUserVerification: true,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'WebAuthn verification failed';
    return c.json({ error: msg }, 400);
  }

  if (!verification.verified || !verification.registrationInfo) {
    return c.json({ error: 'Passkey verification failed' }, 400);
  }

  const { credential } = verification.registrationInfo;
  const passkeyId = crypto.randomUUID();
  const publicKeyStr = Buffer.from(credential.publicKey).toString('base64url');
  const transportsStr = credential.transports ? JSON.stringify(credential.transports) : null;
  const label = body.device_label || 'Passkey Device';

  // Mark token used and record passkey + audit log atomically
  await c.env.DB.batch([
    c.env.DB.prepare(
      `INSERT INTO passkeys (id, user_id, credential_id, public_key, counter, transports, device_label, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`
    ).bind(
      passkeyId,
      setupToken.user_id,
      credential.id,
      publicKeyStr,
      credential.counter,
      transportsStr,
      label
    ),
    c.env.DB.prepare(`UPDATE setup_tokens SET used_at = datetime('now') WHERE id = ?`).bind(setupToken.id),
    c.env.DB.prepare('DELETE FROM webauthn_challenges WHERE id = ?').bind(challengeRow.id),
    c.env.DB.prepare(
      `INSERT INTO audit_log (at, actor_id, action, table_name, record_id, patient_id)
       VALUES (datetime('now'), ?, 'PASSKEY_REGISTERED', 'passkeys', ?, ?)`
    ).bind(
      setupToken.user_id,
      passkeyId,
      (setupToken.purpose === 'patient' || setupToken.purpose === 'patient_setup') ? setupToken.user_id : null
    ),
  ]);

  // Issue session token
  const isPatient = setupToken.purpose === 'patient' || setupToken.purpose === 'patient_setup';
  const maxAge = isPatient ? 30 * 24 * 3600 : 12 * 3600;
  let token: string | undefined;

  if (c.env.JWT_SECRET) {
    token = await signJwt(
      {
        sub: setupToken.user_id,
        id: setupToken.user_id,
        role: isPatient ? 'patient' : 'doctor',
        aal: isPatient ? 'aal1' : 'aal2',
        token_version: 1,
        exp: Math.floor(Date.now() / 1000) + maxAge,
      },
      c.env.JWT_SECRET
    );
    c.header(
      'Set-Cookie',
      `careone_session=${encodeURIComponent(token)}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Strict`
    );
  }

  return c.json({
    ok: true,
    passkey_id: passkeyId,
    token,
    user: {
      id: setupToken.user_id,
      purpose: setupToken.purpose,
    },
  });
});

// 3. POST /api/auth/passkey/login/options
passkeyRouter.post('/login/options', async (c) => {
  const rpId = getRpId(c);
  const options = await generateAuthenticationOptions({
    rpID: rpId,
    userVerification: 'required',
  });

  const challengeId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
  await c.env.DB.prepare(
    `INSERT INTO webauthn_challenges (id, challenge, expires_at)
     VALUES (?, ?, ?)`
  )
    .bind(challengeId, options.challenge, expiresAt)
    .run();

  return c.json({ options });
});

// 4. POST /api/auth/passkey/login/verify
passkeyRouter.post('/login/verify', async (c) => {
  const ip = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || '127.0.0.1';
  if (c.env.CODE_LIMIT) {
    try {
      const limitRes = await c.env.CODE_LIMIT.limit({ key: `passkey_login_${ip}` });
      if (!limitRes.success) {
        return c.json({ error: 'Too many sign-in attempts. Please wait a minute.' }, 429);
      }
    } catch {
      // In test or environments without rate limiter binding, proceed
    }
  }

  const body = await c.req.json<{ response: AuthenticationResponseJSON }>();
  if (!body.response || !body.response.id) {
    return c.json({ error: 'Valid WebAuthn response is required' }, 400);
  }

  const credentialId = body.response.id;

  // Retrieve passkey
  const passkey = await c.env.DB.prepare(
    'SELECT * FROM passkeys WHERE credential_id = ? LIMIT 1'
  )
    .bind(credentialId)
    .first<PasskeyRow>();

  if (!passkey) {
    await c.env.DB.prepare(
      `INSERT INTO audit_log (at, actor_id, action, table_name, reason)
       VALUES (datetime('now'), 'anonymous', 'FAILED_SIGN_IN', 'passkeys', 'Credential not found')`
    ).run();
    return c.json({ error: 'Passkey not found or has been revoked' }, 401);
  }

  if (passkey.revoked_at) {
    await c.env.DB.prepare(
      `INSERT INTO audit_log (at, actor_id, action, table_name, record_id, reason)
       VALUES (datetime('now'), ?, 'FAILED_SIGN_IN', 'passkeys', ?, 'Passkey revoked')`
    ).bind(passkey.user_id, passkey.id).run();
    return c.json({ error: 'Passkey not found or has been revoked' }, 401);
  }

  // Retrieve latest valid challenge
  const challengeRow = await c.env.DB.prepare(
    `SELECT * FROM webauthn_challenges
     WHERE expires_at > datetime('now')
     ORDER BY created_at DESC LIMIT 1`
  ).first<{ id: string; challenge: string }>();

  if (!challengeRow) {
    return c.json({ error: 'Authentication challenge expired. Please retry.' }, 400);
  }

  const rpId = getRpId(c);
  const expectedOrigin = getExpectedOrigin(c);
  const publicKeyBytes = Buffer.from(passkey.public_key, 'base64url');

  let verification;
  try {
    verification = await verifyAuthenticationResponse({
      response: body.response,
      expectedChallenge: challengeRow.challenge,
      expectedOrigin,
      expectedRPID: rpId,
      credential: {
        id: passkey.credential_id,
        publicKey: publicKeyBytes,
        counter: passkey.counter,
        transports: passkey.transports ? JSON.parse(passkey.transports) : undefined,
      },
      requireUserVerification: true,
    });
  } catch (err) {
    await c.env.DB.prepare(
      `INSERT INTO audit_log (at, actor_id, action, table_name, record_id, reason)
       VALUES (datetime('now'), ?, 'FAILED_SIGN_IN', 'passkeys', ?, 'Signature verification failed')`
    ).bind(passkey.user_id, passkey.id).run();
    const msg = err instanceof Error ? err.message : 'WebAuthn signature verification failed';
    return c.json({ error: msg }, 401);
  }

  if (!verification.verified) {
    return c.json({ error: 'Authentication verification failed' }, 401);
  }

  // Update passkey counter and last_used_at
  const newCounter = verification.authenticationInfo.newCounter;
  await c.env.DB.batch([
    c.env.DB.prepare(
      `UPDATE passkeys SET counter = ?, last_used_at = datetime('now') WHERE id = ?`
    ).bind(newCounter, passkey.id),
    c.env.DB.prepare('DELETE FROM webauthn_challenges WHERE id = ?').bind(challengeRow.id),
  ]);

  // Determine user role and active status
  const staffMember = await c.env.DB.prepare(
    'SELECT * FROM staff WHERE id = ? AND deleted_at IS NULL LIMIT 1'
  )
    .bind(passkey.user_id)
    .first<{ id: string; role: string; is_active: number; department_id: string | null; token_version?: number }>();

  let role: string = 'patient';
  let aal: 'aal1' | 'aal2' = 'aal1';
  let departmentId: string | null = null;
  let tokenVersion = 1;
  let requireTotp = false;

  if (staffMember) {
    if (!staffMember.is_active) {
      return c.json({ error: 'Staff account has been deactivated. Contact hospital admin.' }, 403);
    }
    role = staffMember.role;
    departmentId = staffMember.department_id;
    tokenVersion = staffMember.token_version ?? 1;
    // AGENTS.md invariant: Staff passkey satisfies Factor 1. Staff requires TOTP factor next.
    // Issue aal1 token with require_totp: true. Staff routes require aal2 and will reject until TOTP verified.
    aal = 'aal1';
    requireTotp = true;
  } else {
    // Patient
    const patientRow = await c.env.DB.prepare(
      'SELECT token_version FROM patients WHERE id = ? AND deleted_at IS NULL LIMIT 1'
    ).bind(passkey.user_id).first<{ token_version?: number }>();
    tokenVersion = patientRow?.token_version ?? 1;
    role = 'patient';
    aal = 'aal1';
  }

  const maxAge = role === 'patient' ? 30 * 24 * 3600 : 12 * 3600;
  let token: string | undefined;

  if (c.env.JWT_SECRET) {
    token = await signJwt(
      {
        sub: passkey.user_id,
        id: passkey.user_id,
        role,
        aal,
        department_id: departmentId,
        token_version: tokenVersion,
        exp: Math.floor(Date.now() / 1000) + maxAge,
      },
      c.env.JWT_SECRET
    );
    c.header(
      'Set-Cookie',
      `careone_session=${encodeURIComponent(token)}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Strict`
    );
  }

  // Audit log successful sign-in
  await c.env.DB.prepare(
    `INSERT INTO audit_log (at, actor_id, action, table_name, record_id, patient_id)
     VALUES (datetime('now'), ?, 'SIGN_IN', 'passkeys', ?, ?)`
  ).bind(
    passkey.user_id,
    passkey.id,
    role === 'patient' ? passkey.user_id : null
  ).run();

  return c.json({
    ok: true,
    token,
    role,
    aal,
    require_totp: requireTotp,
    user: {
      id: passkey.user_id,
      role,
    },
  });
});

// 5. GET /api/auth/passkeys (List passkeys for authenticated user)
passkeyRouter.get('/', async (c) => {
  const principal = await loadPrincipal(c);
  if (!principal) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const result = await c.env.DB.prepare(
    `SELECT id, credential_id, device_label, created_at, last_used_at, revoked_at
     FROM passkeys
     WHERE user_id = ?
     ORDER BY created_at DESC`
  )
    .bind(principal.id)
    .all();

  return c.json({ passkeys: result.results || [] });
});

// 6. DELETE /api/auth/passkeys/:id (Revoke passkey)
passkeyRouter.delete('/:id', async (c) => {
  const principal = await loadPrincipal(c);
  if (!principal) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const passkeyId = c.req.param('id');
  await c.env.DB.batch([
    c.env.DB.prepare(
      `UPDATE passkeys SET revoked_at = datetime('now') WHERE id = ? AND user_id = ?`
    ).bind(passkeyId, principal.id),
    c.env.DB.prepare(
      `INSERT INTO audit_log (at, actor_id, action, table_name, record_id, patient_id)
       VALUES (datetime('now'), ?, 'PASSKEY_REVOKED', 'passkeys', ?, ?)`
    ).bind(
      principal.id,
      passkeyId,
      principal.role === 'patient' ? principal.id : null
    ),
  ]);

  return c.json({ ok: true });
});

// 7. POST /api/auth/demo-signin (LOCAL ONLY - Disabled in production)
passkeyRouter.post('/demo-signin', async (c) => {
  if (c.env.ENVIRONMENT !== 'local') {
    return c.json({ error: 'Demo sign-in disabled in production' }, 403);
  }

  const body = await c.req.json<{ role?: string; id?: string }>();
  const role = body.role || 'doctor';
  const userId =
    body.id ||
    (role === 'admin'
      ? 'b0000000-0000-0000-0000-000000000001'
      : role === 'front_desk'
      ? 'b0000000-0000-0000-0000-000000000002'
      : role === 'doctor'
      ? 'b0000000-0000-0000-0000-000000000003'
      : 'e0000000-0000-0000-0000-000000000001');

  const maxAge = role === 'patient' || role === 'guardian' ? 30 * 24 * 3600 : 12 * 3600;
  let token: string | undefined;

  if (c.env.JWT_SECRET) {
    token = await signJwt(
      {
        sub: userId,
        id: userId,
        role: role === 'guardian' ? 'guardian' : role,
        aal: role === 'patient' || role === 'guardian' ? 'aal1' : 'aal2',
        token_version: 1,
        exp: Math.floor(Date.now() / 1000) + maxAge,
      },
      c.env.JWT_SECRET
    );
    c.header(
      'Set-Cookie',
      `careone_session=${encodeURIComponent(token)}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Strict`
    );
  }

  return c.json({
    ok: true,
    token,
    user: {
      id: userId,
      role,
    },
  });
});
