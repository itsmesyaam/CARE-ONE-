import { Hono } from 'hono';
import type { WorkerEnv } from '../env';
import { withPolicy } from '../auth/policy';
import { hashPassword } from '../auth/password';

export const adminRouter = new Hono<{ Bindings: WorkerEnv }>();

// GET /api/admin/dashboard — aggregates only; no patient clinical data
adminRouter.get(
  '/dashboard',
  withPolicy({ allowedRoles: ['admin'], requireAal2: true }, async (c) => {
    const [
      todayAppts,
      followUps,
      reportsWaiting,
      overdueFollowUps,
      consultationsMonth,
      activePatients,
      invitedPatients,
    ] = await Promise.all([
      c.env.DB.prepare(
        "SELECT COUNT(*) as c FROM appointments WHERE date(appointment_date) = date('now')"
      ).first<{ c: number }>(),
      c.env.DB.prepare(
        "SELECT COUNT(*) as c FROM care_plan_items WHERE kind = 'follow_up' AND status = 'pending' AND date(due_date) <= date('now', '+7 days')"
      ).first<{ c: number }>(),
      c.env.DB.prepare(
        "SELECT COUNT(*) as c FROM documents WHERE review_status = 'pending'"
      ).first<{ c: number }>(),
      c.env.DB.prepare(
        "SELECT COUNT(*) as c FROM appointments WHERE status = 'booked' AND date(appointment_date) < date('now')"
      ).first<{ c: number }>(),
      c.env.DB.prepare(
        "SELECT COUNT(*) as c FROM encounters WHERE strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')"
      ).first<{ c: number }>(),
      c.env.DB.prepare(
        "SELECT COUNT(DISTINCT patient_id) as c FROM encounters WHERE created_at >= datetime('now', '-30 days')"
      ).first<{ c: number }>(),
      c.env.DB.prepare(
        'SELECT COUNT(*) as c FROM patients WHERE deleted_at IS NULL'
      ).first<{ c: number }>(),
    ]);

    const totalInvited = invitedPatients?.c || 0;
    const activeCount = activePatients?.c || 0;
    const activeShare = totalInvited > 0 ? Math.round((activeCount / totalInvited) * 100) : 0;

    return c.json({
      today_appointments: todayAppts?.c || 0,
      follow_ups_due: followUps?.c || 0,
      reports_waiting_review: reportsWaiting?.c || 0,
      patients_overdue_follow_up: overdueFollowUps?.c || 0,
      consultations_this_month: consultationsMonth?.c || 0,
      active_patients_30d: activeCount,
      invited_patients: totalInvited,
      active_patient_share: activeShare,
    });
  })
);

// GET /api/admin/audit-logs
adminRouter.get(
  '/audit-logs',
  withPolicy({ allowedRoles: ['admin'], requireAal2: true }, async (c) => {
    const limit = Math.min(Number(c.req.query('limit')) || 50, 100);
    const offset = Number(c.req.query('offset')) || 0;

    const logs = await c.env.DB.prepare(
      `SELECT id, at, actor_id, action, table_name, record_id, patient_id, reason
       FROM audit_log
       ORDER BY at DESC
       LIMIT ? OFFSET ?`
    ).bind(limit, offset).all();

    return c.json(logs.results || []);
  })
);

// Departments Router
export const departmentsRouter = new Hono<{ Bindings: WorkerEnv }>();

departmentsRouter.get('/', async (c) => {
  const rows = await c.env.DB.prepare(
    'SELECT id, name, code, archived_at, created_at FROM departments ORDER BY name'
  ).all();
  return c.json(rows.results || []);
});

departmentsRouter.post(
  '/',
  withPolicy({ allowedRoles: ['admin'], requireAal2: true }, async (c) => {
    const body = (await c.req.json()) as { name: string; code: string };
    if (!body.name || !body.code) {
      return c.json({ error: 'name and code are required' }, 400);
    }
    const id = crypto.randomUUID();
    await c.env.DB.prepare(
      'INSERT INTO departments (id, name, code) VALUES (?, ?, ?)'
    ).bind(id, body.name.trim(), body.code.trim().toUpperCase()).run();

    const dept = await c.env.DB.prepare(
      'SELECT id, name, code, archived_at, created_at FROM departments WHERE id = ?'
    ).bind(id).first();
    return c.json(dept, 201);
  })
);

departmentsRouter.put(
  '/:id',
  withPolicy({ allowedRoles: ['admin'], requireAal2: true }, async (c) => {
    const id = c.req.param('id');
    const body = (await c.req.json()) as { name: string; code: string };
    await c.env.DB.prepare(
      'UPDATE departments SET name = ?, code = ? WHERE id = ?'
    ).bind(body.name.trim(), body.code.trim().toUpperCase(), id).run();

    const dept = await c.env.DB.prepare(
      'SELECT id, name, code, archived_at, created_at FROM departments WHERE id = ?'
    ).bind(id).first();
    return c.json(dept);
  })
);

departmentsRouter.patch(
  '/:id/archive',
  withPolicy({ allowedRoles: ['admin'], requireAal2: true }, async (c) => {
    const id = c.req.param('id');
    const body = (await c.req.json()) as { isArchived: boolean };
    const archivedAt = body.isArchived ? null : new Date().toISOString();
    await c.env.DB.prepare(
      'UPDATE departments SET archived_at = ? WHERE id = ?'
    ).bind(archivedAt, id).run();

    const dept = await c.env.DB.prepare(
      'SELECT id, name, code, archived_at, created_at FROM departments WHERE id = ?'
    ).bind(id).first();
    return c.json(dept);
  })
);

// Staff Router
export const staffRouter = new Hono<{ Bindings: WorkerEnv }>();

staffRouter.get(
  '/',
  withPolicy({ allowedRoles: ['admin', 'front_desk', 'doctor'], requireAal2: true }, async (c) => {
    const rows = await c.env.DB.prepare(
      `SELECT s.id, s.user_id, s.department_id, s.role, s.full_name, s.phone, s.is_active, s.created_at, s.deleted_at,
              d.name as department_name
       FROM staff s
       LEFT JOIN departments d ON s.department_id = d.id
       WHERE s.deleted_at IS NULL
       ORDER BY s.full_name`
    ).all();
    return c.json(rows.results || []);
  })
);

staffRouter.patch(
  '/:id/active',
  withPolicy({ allowedRoles: ['admin'], requireAal2: true }, async (c) => {
    const id = c.req.param('id');
    const body = (await c.req.json()) as { is_active: number };
    await c.env.DB.prepare('UPDATE staff SET is_active = ? WHERE id = ?').bind(
      body.is_active,
      id
    ).run();

    const staffMember = await c.env.DB.prepare(
      'SELECT * FROM staff WHERE id = ?'
    ).bind(id).first();
    return c.json(staffMember);
  })
);

staffRouter.post(
  '/invite',
  withPolicy({ allowedRoles: ['admin'], requireAal2: true }, async (c) => {
    const body = (await c.req.json()) as {
      fullName: string;
      email: string;
      role: 'doctor' | 'front_desk' | 'admin';
      departmentId?: string;
      phone?: string;
    };
    const staffId = crypto.randomUUID();
    const userId = crypto.randomUUID();
    await c.env.DB.prepare(
      `INSERT INTO staff (id, user_id, department_id, role, full_name, phone, is_active)
       VALUES (?, ?, ?, ?, ?, ?, 1)`
    ).bind(
      staffId,
      userId,
      body.departmentId || null,
      body.role,
      body.fullName.trim(),
      body.phone || null
    ).run();

    return c.json({ ok: true, user_id: userId, staff_id: staffId }, 201);
  })
);

// POST /api/admin/staff/:id/password-reset (Admin resets staff password with temporary password)
staffRouter.post(
  '/:id/password-reset',
  withPolicy({ allowedRoles: ['admin'] }, async (c, principal) => {
    const staffId = c.req.param('id');
    const staffMember = await c.env.DB.prepare(
      'SELECT id, full_name, role, user_id, email FROM staff WHERE id = ? AND deleted_at IS NULL'
    )
      .bind(staffId)
      .first<{ id: string; full_name: string; role: string; user_id: string; email?: string }>();

    if (!staffMember) {
      return c.json({ error: 'Staff member not found' }, 404);
    }

    const username = staffMember.email || staffMember.user_id;

    // Generate secure random 12-character temporary password
    const rawBytes = new Uint8Array(7);
    crypto.getRandomValues(rawBytes);
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const randomSuffix = Array.from(rawBytes)
      .map((b) => chars[b % chars.length])
      .join('');
    const tempPassword = `Temp#${randomSuffix}`;

    const { hash, salt, iterations } = await hashPassword(tempPassword);

    await c.env.DB.batch([
      c.env.DB.prepare(
        `INSERT INTO users (
           id, username, role, record_id, password_hash, password_salt, password_iterations,
           must_change_password, session_version, failed_attempts, locked_until, is_active, updated_at
         )
         VALUES (?, ?, ?, ?, ?, ?, ?, 1, 1, 0, NULL, 1, datetime('now'))
         ON CONFLICT(id) DO UPDATE SET
           username = excluded.username,
           role = excluded.role,
           password_hash = excluded.password_hash,
           password_salt = excluded.password_salt,
           password_iterations = excluded.password_iterations,
           must_change_password = 1,
           session_version = session_version + 1,
           failed_attempts = 0,
           locked_until = NULL,
           is_active = 1,
           updated_at = datetime('now')`
      ).bind(staffMember.id, username, staffMember.role, staffMember.id, hash, salt, iterations),
      c.env.DB.prepare(
        `INSERT INTO audit_log (at, actor_id, action, table_name, record_id)
         VALUES (datetime('now'), ?, 'STAFF_PASSWORD_RESET', 'users', ?)`
      ).bind(principal.id, staffMember.id),
    ]);

    return c.json({
      ok: true,
      username,
      temporary_password: tempPassword,
      staff_id: staffMember.id,
    });
  })
);


adminRouter.route('/staff', staffRouter);

