/**
 * CareOne Notifications & Reminders API Routes
 * Mounts under /api/notifications
 */

import { Hono } from 'hono';
import type { WorkerEnv } from '../env';
import {
  type AccessVariables,
  declareRoutePolicy,
  requireAccess,
} from '../middleware/access';

export const notificationRoutes = new Hono<{
  Bindings: WorkerEnv;
  Variables: AccessVariables;
}>();

// 1. Subscribe to Web Push
const subscribePolicy = declareRoutePolicy('POST', '/api/notifications/subscribe', {
  allowedRoles: ['patient', 'guardian'],
});

notificationRoutes.post('/subscribe', requireAccess(subscribePolicy), async c => {
  const user = c.get('user');
  let body: {
    endpoint?: string;
    keys?: {
      p256dh?: string;
      auth?: string;
    };
  };

  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  const endpoint = body.endpoint;
  const p256dh = body.keys?.p256dh;
  const auth = body.keys?.auth;

  if (!endpoint || !p256dh || !auth) {
    return c.json({ error: 'Missing required push subscription fields' }, 400);
  }

  const db = c.env.DB;
  const nowIso = new Date().toISOString();
  const subId = crypto.randomUUID();
  const userAgent = c.req.header('User-Agent') || null;

  await db
    .prepare(
      `INSERT INTO push_subscriptions (id, user_id, endpoint, p256dh, auth, user_agent, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(endpoint) DO UPDATE SET
         user_id = excluded.user_id,
         p256dh = excluded.p256dh,
         auth = excluded.auth,
         user_agent = excluded.user_agent,
         updated_at = excluded.updated_at`
    )
    .bind(subId, user.patientId || user.id, endpoint, p256dh, auth, userAgent, nowIso, nowIso)
    .run();

  return c.json({ success: true, message: 'Push subscription registered' });
});

// 2. Unsubscribe from Web Push
const unsubscribePolicy = declareRoutePolicy('DELETE', '/api/notifications/subscribe', {
  allowedRoles: ['patient', 'guardian'],
});

notificationRoutes.delete('/subscribe', requireAccess(unsubscribePolicy), async c => {
  const user = c.get('user');
  let body: { endpoint?: string };

  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  if (!body.endpoint) {
    return c.json({ error: 'Endpoint is required to unsubscribe' }, 400);
  }

  const db = c.env.DB;
  await db
    .prepare('DELETE FROM push_subscriptions WHERE endpoint = ? AND user_id = ?')
    .bind(body.endpoint, user.patientId || user.id)
    .run();

  return c.json({ success: true, message: 'Push subscription removed' });
});

// 3. Get Public VAPID Key
const vapidKeyPolicy = declareRoutePolicy('GET', '/api/notifications/vapid-key', {
  allowedRoles: ['patient', 'guardian', 'doctor', 'front_desk', 'admin'],
  public: true,
});

notificationRoutes.get('/vapid-key', requireAccess(vapidKeyPolicy), async c => {
  return c.json({
    vapidPublicKey: c.env.VAPID_PUBLIC_KEY || '',
  });
});

// 4. Get Patient Reminders
const getRemindersPolicy = declareRoutePolicy('GET', '/api/notifications/reminders', {
  allowedRoles: ['patient', 'guardian'],
});

notificationRoutes.get('/reminders', requireAccess(getRemindersPolicy), async c => {
  const user = c.get('user');
  if (!user.patientId) {
    return c.json({ reminders: [] });
  }

  const db = c.env.DB;
  const rows = await db
    .prepare(
      `SELECT * FROM reminders
       WHERE patient_id = ?
       ORDER BY scheduled_for DESC
       LIMIT 50`
    )
    .bind(user.patientId)
    .all();

  return c.json({ reminders: rows.results || [] });
});
