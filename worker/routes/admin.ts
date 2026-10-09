/**
 * CareOne Hospital Admin API Routes
 * Mounts under /api/admin
 * Enforces rule: Hospital admin never reads an individual patient's clinical record.
 */

import { Hono } from 'hono';
import type { WorkerEnv } from '../env';
import {
  type AccessVariables,
  declareRoutePolicy,
  requireAccess,
} from '../middleware/access';

export const adminRoutes = new Hono<{
  Bindings: WorkerEnv;
  Variables: AccessVariables;
}>();

// 1. Hospital Settings
const getSettingsPolicy = declareRoutePolicy('GET', '/api/admin/settings', {
  allowedRoles: ['admin'],
  requireMfa: true,
});

adminRoutes.get('/settings', requireAccess(getSettingsPolicy), async c => {
  const db = c.env.DB;
  const settings = await db
    .prepare('SELECT * FROM hospital_settings LIMIT 1')
    .first();
  return c.json({ settings });
});

const putSettingsPolicy = declareRoutePolicy('PUT', '/api/admin/settings', {
  allowedRoles: ['admin'],
  requireMfa: true,
});

adminRoutes.put('/settings', requireAccess(putSettingsPolicy), async c => {
  const body = (await c.req.json().catch(() => ({}))) as {
    hospitalName?: string;
    primaryColor?: string;
    secondaryColor?: string;
    casualtyPhone?: string;
  };

  const db = c.env.DB;
  const nowIso = new Date().toISOString();

  await db
    .prepare(
      `UPDATE hospital_settings
       SET hospital_name = coalesce(?, hospital_name),
           primary_color = coalesce(?, primary_color),
           secondary_color = coalesce(?, secondary_color),
           casualty_phone = coalesce(?, casualty_phone),
           updated_at = ?
       WHERE id = 'default'`
    )
    .bind(
      body.hospitalName || null,
      body.primaryColor || null,
      body.secondaryColor || null,
      body.casualtyPhone || null,
      nowIso
    )
    .run();

  const settings = await db
    .prepare('SELECT * FROM hospital_settings LIMIT 1')
    .first();

  return c.json({ success: true, settings });
});

// 2. Departments Management
const getDepartmentsPolicy = declareRoutePolicy('GET', '/api/admin/departments', {
  allowedRoles: ['admin'],
  requireMfa: true,
});

adminRoutes.get('/departments', requireAccess(getDepartmentsPolicy), async c => {
  const db = c.env.DB;
  const results = (await db
    .prepare('SELECT * FROM departments ORDER BY name ASC')
    .all()) as { results: unknown[] };
  return c.json({ departments: results.results });
});

const postDepartmentsPolicy = declareRoutePolicy('POST', '/api/admin/departments', {
  allowedRoles: ['admin'],
  requireMfa: true,
});

adminRoutes.post('/departments', requireAccess(postDepartmentsPolicy), async c => {
  const body = (await c.req.json().catch(() => ({}))) as {
    name?: string;
    code?: string;
  };

  if (!body.name || !body.code) {
    return c.json({ error: 'Department name and code are required' }, 400);
  }

  const db = c.env.DB;
  const deptId = crypto.randomUUID();
  const nowIso = new Date().toISOString();

  await db
    .prepare('INSERT INTO departments (id, name, code, created_at) VALUES (?, ?, ?, ?)')
    .bind(deptId, body.name.trim(), body.code.trim().toUpperCase(), nowIso)
    .run();

  const record = await db
    .prepare('SELECT * FROM departments WHERE id = ?')
    .bind(deptId)
    .first();

  return c.json({ success: true, department: record });
});

// 3. Staff Directory
const getStaffPolicy = declareRoutePolicy('GET', '/api/admin/staff', {
  allowedRoles: ['admin'],
  requireMfa: true,
});

adminRoutes.get('/staff', requireAccess(getStaffPolicy), async c => {
  const db = c.env.DB;
  const results = (await db
    .prepare(
      `SELECT s.id, s.user_id, s.role, s.full_name, s.email, s.phone, s.is_active, s.created_at,
              d.name as department_name, d.code as department_code
       FROM staff s
       LEFT JOIN departments d ON s.department_id = d.id
       WHERE s.deleted_at IS NULL
       ORDER BY s.full_name ASC`
    )
    .all()) as { results: unknown[] };

  return c.json({ staff: results.results });
});

// 4. Admin Operational Dashboard (COUNTS ONLY)
const getDashboardCountsPolicy = declareRoutePolicy('GET', '/api/admin/dashboard-counts', {
  allowedRoles: ['admin'],
  requireMfa: true,
});

adminRoutes.get('/dashboard-counts', requireAccess(getDashboardCountsPolicy), async c => {
  const db = c.env.DB;
  const todayStr = new Date().toISOString().split('T')[0]!;

  const apptsToday = (await db
    .prepare("SELECT COUNT(*) as count FROM appointments WHERE appointment_date LIKE ?")
    .bind(`${todayStr}%`)
    .first()) as { count: number } | null;

  const pendingReports = (await db
    .prepare("SELECT COUNT(*) as count FROM documents WHERE review_status = 'pending'")
    .first()) as { count: number } | null;

  const totalPatients = (await db
    .prepare("SELECT COUNT(*) as count FROM patients WHERE deleted_at IS NULL")
    .first()) as { count: number } | null;

  const activeCarePlans = (await db
    .prepare("SELECT COUNT(*) as count FROM care_plans WHERE status = 'active'")
    .first()) as { count: number } | null;

  const consultationsMonth = (await db
    .prepare("SELECT COUNT(*) as count FROM encounters WHERE status = 'signed'")
    .first()) as { count: number } | null;

  const dueFollowUps = (await db
    .prepare("SELECT COUNT(*) as count FROM care_plan_items WHERE kind = 'follow_up' AND status = 'pending'")
    .first()) as { count: number } | null;

  return c.json({
    metrics: {
      appointmentsToday: apptsToday?.count || 0,
      reportsWaitingReview: pendingReports?.count || 0,
      activePatients: totalPatients?.count || 0,
      activeCarePlans: activeCarePlans?.count || 0,
      consultationsThisMonth: consultationsMonth?.count || 0,
      followUpsDueToday: dueFollowUps?.count || 0,
    },
  });
});

// 5. System Access & Audit Log (STRICTLY OMITS RAW CLINICAL DATA)
const getAuditLogsPolicy = declareRoutePolicy('GET', '/api/admin/audit-logs', {
  allowedRoles: ['admin'],
  requireMfa: true,
});

adminRoutes.get('/audit-logs', requireAccess(getAuditLogsPolicy), async c => {
  const db = c.env.DB;

  // Notice: old_row and new_row are strictly omitted
  const results = (await db
    .prepare(
      `SELECT id, at, actor_id, action, table_name, record_id, patient_id, reason
       FROM audit_log
       ORDER BY at DESC LIMIT 100`
    )
    .all()) as { results: unknown[] };

  return c.json({ logs: results.results });
});
