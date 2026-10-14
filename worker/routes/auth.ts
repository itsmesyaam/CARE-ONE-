import { Hono } from 'hono';
import type { WorkerEnv } from '../env';
import { signJwt, loadPrincipal } from '../auth/policy';
import {
  hashPassword,
  verifyPassword,
  validatePasswordRules,
} from '../auth/password';

export const authRouter = new Hono<{ Bindings: WorkerEnv }>();
export const meRouter = new Hono<{ Bindings: WorkerEnv }>();

interface UserRow {
  id: string;
  username: string;
  role: string;
  record_id: string | null;
  password_hash: string;
  password_salt: string;
  password_iterations: number;
  must_change_password: number;
  failed_attempts: number;
  locked_until: string | null;
  password_changed_at: string | null;
  session_version: number;
  is_active: number;
}

function parseSqliteUtc(dateStr: string): number {
  const iso = dateStr.includes('T') ? dateStr : dateStr.replace(' ', 'T');
  return new Date(iso.endsWith('Z') ? iso : `${iso}Z`).getTime();
}

// POST /api/auth/login
authRouter.post('/login', async (c) => {
  const ip =
    c.req.header('cf-connecting-ip') ||
    c.req.header('x-forwarded-for') ||
    '127.0.0.1';

  // Rate limit by IP
  if (c.env.CODE_LIMIT) {
    try {
      const limitRes = await c.env.CODE_LIMIT.limit({ key: `auth_login_${ip}` });
      if (!limitRes.success) {
        return c.json({ error: 'Too many sign-in attempts. Please wait a minute.' }, 429);
      }
    } catch {
      // In testing environments without rate limiter binding, continue
    }
  }

  const body = await c.req.json<{ username?: string; password?: string }>();
  const username = body.username?.trim();
  const password = body.password;

  if (!username || !password) {
    return c.json({ error: 'Username and password are required' }, 400);
  }

  // Lookup user in users table (case-insensitive)
  const user = await c.env.DB.prepare(
    `SELECT * FROM users WHERE username = ? COLLATE NOCASE LIMIT 1`
  )
    .bind(username)
    .first<UserRow>();

  if (!user) {
    // Record audit log for failed login attempt
    await c.env.DB.prepare(
      `INSERT INTO audit_log (at, actor_id, action, table_name, reason)
       VALUES (datetime('now'), 'anonymous', 'LOGIN_FAILED', 'users', 'Invalid username or password')`
    ).run();

    return c.json({ error: 'Invalid username or password' }, 401);
  }

  // Check 15-minute account lockout
  if (user.locked_until) {
    const lockExpiry = parseSqliteUtc(user.locked_until);
    if (lockExpiry > Date.now()) {
      await c.env.DB.prepare(
        `INSERT INTO audit_log (at, actor_id, action, table_name, record_id, reason)
         VALUES (datetime('now'), ?, 'LOGIN_FAILED', 'users', ?, 'Account locked')`
      )
        .bind(user.id, user.id)
        .run();

      return c.json(
        { error: 'Account is temporarily locked due to too many failed attempts. Try again in 15 minutes.' },
        429
      );
    }
  }

  // Check if account is active
  if (user.is_active !== 1) {
    await c.env.DB.prepare(
      `INSERT INTO audit_log (at, actor_id, action, table_name, record_id, reason)
       VALUES (datetime('now'), ?, 'LOGIN_FAILED', 'users', ?, 'Account deactivated')`
    )
      .bind(user.id, user.id)
      .run();

    return c.json({ error: 'Account has been deactivated. Contact hospital admin.' }, 403);
  }

  // Verify password using WebCrypto PBKDF2 in constant time
  const isMatch = await verifyPassword(
    password,
    user.password_hash,
    user.password_salt,
    user.password_iterations
  );

  if (!isMatch) {
    const newFailedAttempts = user.failed_attempts + 1;

    if (newFailedAttempts >= 5) {
      // 5 wrong attempts -> lock account for 15 minutes
      await c.env.DB.batch([
        c.env.DB.prepare(
          `UPDATE users
           SET failed_attempts = ?, locked_until = strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '+15 minutes'), updated_at = datetime('now')
           WHERE id = ?`
        ).bind(newFailedAttempts, user.id),
        c.env.DB.prepare(
          `INSERT INTO audit_log (at, actor_id, action, table_name, record_id, reason)
           VALUES (datetime('now'), ?, 'ACCOUNT_LOCKED', 'users', ?, 'Locked 15 minutes after 5 failed attempts')`
        ).bind(user.id, user.id),
      ]);

      return c.json(
        { error: 'Account is temporarily locked due to too many failed attempts. Try again in 15 minutes.' },
        429
      );
    }

    // Increment failed attempts
    await c.env.DB.batch([
      c.env.DB.prepare(
        `UPDATE users
         SET failed_attempts = ?, updated_at = datetime('now')
         WHERE id = ?`
      ).bind(newFailedAttempts, user.id),
      c.env.DB.prepare(
        `INSERT INTO audit_log (at, actor_id, action, table_name, record_id, reason)
         VALUES (datetime('now'), ?, 'LOGIN_FAILED', 'users', ?, 'Invalid username or password')`
      ).bind(user.id, user.id),
    ]);

    return c.json({ error: 'Invalid username or password' }, 401);
  }

  // Login successful: reset failed attempts & lockout
  await c.env.DB.batch([
    c.env.DB.prepare(
      `UPDATE users
       SET failed_attempts = 0, locked_until = NULL, updated_at = datetime('now')
       WHERE id = ?`
    ).bind(user.id),
    c.env.DB.prepare(
      `INSERT INTO audit_log (at, actor_id, action, table_name, record_id, patient_id)
       VALUES (datetime('now'), ?, 'LOGIN_SUCCESS', 'users', ?, ?)`
    ).bind(
      user.id,
      user.id,
      ['patient', 'guardian'].includes(user.role) ? user.record_id || user.id : null
    ),
  ]);

  // Session duration: 12 hours for staff, 30 days for patients
  const isStaff = ['doctor', 'specialist', 'front_desk', 'admin'].includes(user.role);
  const maxAge = isStaff ? 12 * 60 * 60 : 30 * 24 * 60 * 60;

  if (!c.env.JWT_SECRET) {
    console.error('[AUTH_CONFIG_ERROR] Missing JWT_SECRET in environment');
    return c.json({ error: 'server_not_configured' }, 500);
  }

  const token = await signJwt(
    {
      sub: user.id,
      id: user.record_id || user.id,
      role: user.role,
      session_version: user.session_version,
      must_change_password: user.must_change_password,
      exp: Math.floor(Date.now() / 1000) + maxAge,
    },
    c.env.JWT_SECRET
  );

  c.header(
    'Set-Cookie',
    `careone_session=${encodeURIComponent(token)}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Strict`
  );

  return c.json({
    ok: true,
    token,
    must_change_password: Boolean(user.must_change_password),
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
    },
  });
});

// POST /api/auth/logout & /api/auth/signout
const handleLogout = async (c: import('hono').Context) => {
  c.header(
    'Set-Cookie',
    'careone_session=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict'
  );
  return c.json({ ok: true, message: 'Signed out successfully' });
};

authRouter.post('/logout', handleLogout);
authRouter.post('/signout', handleLogout);

// GET /api/auth/session
authRouter.get('/session', async (c) => {
  const principal = await loadPrincipal(c);
  return c.json({
    session: principal
      ? {
          user: {
            id: principal.id,
            role: principal.role,
            must_change_password: principal.mustChangePassword ?? false,
          },
        }
      : null,
  });
});

// GET /api/me
meRouter.get('/', async (c) => {
  const principal = await loadPrincipal(c);
  if (!principal) {
    return c.json({ error: 'unauthorized' }, 401);
  }

  if (!principal.isActive) {
    return c.json({ error: 'account_inactive' }, 401);
  }

  return c.json({
    user: {
      id: principal.id,
      userId: principal.userId,
      role: principal.role,
      departmentId: principal.departmentId || null,
      must_change_password: principal.mustChangePassword ?? false,
    },
  });
});

// POST /api/me/password
meRouter.post('/password', async (c) => {
  const principal = await loadPrincipal(c);
  if (!principal) {
    return c.json({ error: 'unauthorized' }, 401);
  }

  const body = await c.req.json<{ currentPassword?: string; newPassword?: string }>();
  const currentPassword = body.currentPassword;
  const newPassword = body.newPassword;

  if (!currentPassword || !newPassword) {
    return c.json({ error: 'Current password and new password are required' }, 400);
  }

  // Load user record from users table
  const user = await c.env.DB.prepare(
    `SELECT * FROM users WHERE id = ? OR username = ? COLLATE NOCASE LIMIT 1`
  )
    .bind(principal.userId || principal.id, principal.userId || principal.id)
    .first<UserRow>();

  if (!user) {
    return c.json({ error: 'User record not found' }, 404);
  }

  // Verify current password
  const isMatch = await verifyPassword(
    currentPassword,
    user.password_hash,
    user.password_salt,
    user.password_iterations
  );

  if (!isMatch) {
    return c.json({ error: 'Current password is incorrect' }, 401);
  }

  // Validate new password rules
  const ruleCheck = validatePasswordRules(newPassword, user.username);
  if (!ruleCheck.valid) {
    return c.json({ error: ruleCheck.errors[0], errors: ruleCheck.errors }, 400);
  }

  // Hash new password using WebCrypto PBKDF2
  const { hash, salt, iterations } = await hashPassword(newPassword);
  const nextSessionVersion = (user.session_version ?? 1) + 1;

  // Update password and bump session_version to invalidate all other active sessions
  await c.env.DB.batch([
    c.env.DB.prepare(
      `UPDATE users
       SET password_hash = ?,
           password_salt = ?,
           password_iterations = ?,
           must_change_password = 0,
           password_changed_at = datetime('now'),
           session_version = ?,
           failed_attempts = 0,
           locked_until = NULL,
           updated_at = datetime('now')
       WHERE id = ?`
    ).bind(hash, salt, iterations, nextSessionVersion, user.id),
    c.env.DB.prepare(
      `INSERT INTO audit_log (at, actor_id, action, table_name, record_id, patient_id)
       VALUES (datetime('now'), ?, 'PASSWORD_CHANGED', 'users', ?, ?)`
    ).bind(
      user.id,
      user.id,
      ['patient', 'guardian'].includes(user.role) ? user.record_id || user.id : null
    ),
  ]);

  // Issue fresh session token with updated session_version and must_change_password=0
  const isStaff = ['doctor', 'specialist', 'front_desk', 'admin'].includes(user.role);
  const maxAge = isStaff ? 12 * 60 * 60 : 30 * 24 * 60 * 60;

  if (!c.env.JWT_SECRET) {
    console.error('[AUTH_CONFIG_ERROR] Missing JWT_SECRET in environment');
    return c.json({ error: 'server_not_configured' }, 500);
  }

  const token = await signJwt(
    {
      sub: user.id,
      id: user.record_id || user.id,
      role: user.role,
      session_version: nextSessionVersion,
      must_change_password: 0,
      exp: Math.floor(Date.now() / 1000) + maxAge,
    },
    c.env.JWT_SECRET
  );

  c.header(
    'Set-Cookie',
    `careone_session=${encodeURIComponent(token)}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Strict`
  );

  return c.json({
    ok: true,
    token,
    message: 'Password changed successfully',
  });
});
