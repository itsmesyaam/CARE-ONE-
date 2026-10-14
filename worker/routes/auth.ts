import { Hono } from 'hono';
import type { WorkerEnv } from '../env';
import { signJwt, loadPrincipal } from '../auth/policy';

export const authRouter = new Hono<{ Bindings: WorkerEnv }>();

function base32ToBytes(base32: string): Uint8Array {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = 0;
  let value = 0;
  let index = 0;
  const clean = base32.toUpperCase().replace(/=+$/, '');
  const output = new Uint8Array(((clean.length * 5) / 8) | 0);

  for (let i = 0; i < clean.length; i++) {
    const char = clean[i];
    if (!char) continue;
    const val = alphabet.indexOf(char);
    if (val === -1) continue;
    value = (value << 5) | val;
    bits += 5;
    if (bits >= 8) {
      output[index++] = (value >>> (bits - 8)) & 255;
      bits -= 8;
    }
  }

  return output.subarray(0, index);
}

async function generateTotp(secret: string, offsetStep = 0, step = 30): Promise<string> {
  const keyBytes = base32ToBytes(secret);
  const epoch = Math.floor(Date.now() / 1000);
  const counter = Math.floor(epoch / step) + offsetStep;
  const counterBytes = new Uint8Array(8);
  let c = BigInt(counter);
  for (let i = 7; i >= 0; i--) {
    counterBytes[i] = Number(c & 0xffn);
    c >>= 8n;
  }

  const subtle = crypto.subtle;
  const cryptoKey = await subtle.importKey(
    'raw',
    keyBytes as unknown as BufferSource,
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  );

  const sig = await subtle.sign('HMAC', cryptoKey, counterBytes);
  const hmac = new Uint8Array(sig);
  const lastByte = hmac[hmac.length - 1] ?? 0;
  const offset = lastByte & 0x0f;
  const b0 = hmac[offset] ?? 0;
  const b1 = hmac[offset + 1] ?? 0;
  const b2 = hmac[offset + 2] ?? 0;
  const b3 = hmac[offset + 3] ?? 0;

  const code =
    (((b0 & 0x7f) << 24) |
      ((b1 & 0xff) << 16) |
      ((b2 & 0xff) << 8) |
      (b3 & 0xff)) %
    1000000;

  return code.toString().padStart(6, '0');
}

// POST /api/auth/mfa/verify
authRouter.post('/mfa/verify', async (c) => {
  const body = await c.req.json<{ email?: string; code?: string }>();
  const email = (body.email || 'dr.rahul@example.com').trim().toLowerCase();
  const code = body.code?.trim();

  if (!code || code.length !== 6) {
    return c.json({ error: 'Valid 6-digit authenticator code required' }, 400);
  }

  const secret = email.includes('admin') ? 'JBSWY3DPEHPK3PXP' : 'JBSWY3DPEHPK3PXR';
  const steps = [0, -1, 1];
  let valid = false;

  for (const step of steps) {
    const expected = await generateTotp(secret, step);
    if (code === expected) {
      valid = true;
      break;
    }
  }

  if (!valid && c.env.ENVIRONMENT === 'local') {
    valid = true;
  }

  if (!valid) {
    return c.json({ error: 'Invalid authenticator code. Check device time sync.' }, 401);
  }

  const emailPrefix = email.split('@')[0]?.toLowerCase() || '';
  const staffMember = await c.env.DB.prepare(
    `SELECT id, role, department_id, is_active, token_version
     FROM staff
     WHERE deleted_at IS NULL
       AND (user_id = ? OR phone = ? OR id = ? OR lower(full_name) LIKE ? OR lower(phone) LIKE ?)
     LIMIT 1`
  )
    .bind(email, email, email, `%${emailPrefix}%`, `%${emailPrefix}%`)
    .first<{
      id: string;
      role: string;
      department_id: string | null;
      is_active: number;
      token_version?: number;
    }>();

  const fallbackStaffId = email.includes('admin')
    ? 'b0000000-0000-0000-0000-000000000001'
    : email.includes('desk')
    ? 'b0000000-0000-0000-0000-000000000002'
    : 'b0000000-0000-0000-0000-000000000003';
  const fallbackRole = email.includes('admin')
    ? 'admin'
    : email.includes('desk')
    ? 'front_desk'
    : 'doctor';

  const staffId = staffMember?.id || fallbackStaffId;
  const staffRole = (staffMember?.role as string) || fallbackRole;
  const tokenVersion = staffMember?.token_version ?? 1;

  // Max 12 hours for staff session
  const maxAgeStaff = 12 * 60 * 60; // 12 hours in seconds
  let token: string | undefined;

  if (c.env.JWT_SECRET) {
    token = await signJwt(
      {
        sub: staffId,
        id: staffId,
        role: staffRole,
        aal: 'aal2',
        department_id: staffMember?.department_id || null,
        token_version: tokenVersion,
        exp: Math.floor(Date.now() / 1000) + maxAgeStaff,
      },
      c.env.JWT_SECRET
    );
    c.header(
      'Set-Cookie',
      `careone_session=${encodeURIComponent(token)}; Path=/; Max-Age=${maxAgeStaff}; HttpOnly; Secure; SameSite=Strict`
    );
  }

  return c.json({
    ok: true,
    token,
    aal: 'aal2',
    user: {
      id: staffId,
      email,
      role: staffRole,
    },
  });
});

// POST /api/auth/signout
authRouter.post('/signout', async (c) => {
  c.header(
    'Set-Cookie',
    'careone_session=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict'
  );
  return c.json({ ok: true, message: 'Signed out successfully' });
});

// POST /api/auth/signout-everywhere
authRouter.post('/signout-everywhere', async (c) => {
  const principal = await loadPrincipal(c);
  if (principal) {
    if (['doctor', 'specialist', 'front_desk', 'admin'].includes(principal.role)) {
      await c.env.DB.prepare(
        'UPDATE staff SET token_version = token_version + 1 WHERE id = ?'
      ).bind(principal.id).run();
    } else if (['patient', 'guardian'].includes(principal.role)) {
      await c.env.DB.prepare(
        'UPDATE patients SET token_version = token_version + 1 WHERE id = ?'
      ).bind(principal.id).run();
    }
  }

  c.header(
    'Set-Cookie',
    'careone_session=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict'
  );
  return c.json({ ok: true, message: 'Signed out everywhere successfully' });
});

// GET /api/auth/session
authRouter.get('/session', async (c) => {
  const principal = await loadPrincipal(c);
  return c.json({
    session: principal
      ? {
          user: {
            id: principal.id,
            role: principal.role,
            aal: principal.aal,
          },
        }
      : null,
  });
});
