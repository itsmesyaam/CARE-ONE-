/**
 * CareOne Diet Guidance Catalog API Routes
 * Mounts under /api/diet
 */

import { Hono } from 'hono';
import type { WorkerEnv } from '../env';
import { type AccessVariables, declareRoutePolicy, requireAccess } from '../middleware/access';

export const dietRoutes = new Hono<{
  Bindings: WorkerEnv;
  Variables: AccessVariables;
}>();

// 1. List Diet Guides (Patients see approved only; staff see all)
const listGuidesPolicy = declareRoutePolicy('GET', '/api/diet/guides', {
  allowedRoles: ['patient', 'guardian', 'doctor', 'front_desk', 'admin'],
});

dietRoutes.get('/guides', requireAccess(listGuidesPolicy), async (c) => {
  const user = c.get('user');
  const db = c.env.DB;

  let query = 'SELECT * FROM diet_guides';
  const params: string[] = [];

  if (user.role === 'patient' || user.role === 'guardian') {
    query += " WHERE status = 'approved'";
  }
  query += ' ORDER BY title_en ASC';

  const stmt = db.prepare(query);
  const results = (await (params.length > 0 ? stmt.bind(...params) : stmt).all()) as {
    results: unknown[];
  };

  return c.json({ guides: results.results });
});

// 2. Create Draft Diet Guide (Doctor / Admin)
const createGuidePolicy = declareRoutePolicy('POST', '/api/diet/guides', {
  allowedRoles: ['doctor', 'admin'],
  requireMfa: true,
});

dietRoutes.post('/guides', requireAccess(createGuidePolicy), async (c) => {
  const user = c.get('user');
  const body = (await c.req.json().catch(() => ({}))) as {
    titleEn?: string;
    titleMl?: string;
    foodsAllowedEn?: string;
    foodsAllowedMl?: string;
    foodsModerateEn?: string;
    foodsModerateMl?: string;
    foodsAvoidEn?: string;
    foodsAvoidMl?: string;
    lifestyleTipsEn?: string;
    lifestyleTipsMl?: string;
    tags?: string[];
  };

  if (!body.titleEn) {
    return c.json({ error: 'Title in English is required' }, 400);
  }

  const db = c.env.DB;
  const guideId = crypto.randomUUID();
  const nowIso = new Date().toISOString();

  await db
    .prepare(
      `INSERT INTO diet_guides (
        id, title_en, title_ml, foods_allowed_en, foods_allowed_ml,
        foods_moderate_en, foods_moderate_ml, foods_avoid_en, foods_avoid_ml,
        lifestyle_tips_en, lifestyle_tips_ml, tags, status, created_by,
        is_default, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, 0, ?, ?)`
    )
    .bind(
      guideId,
      body.titleEn.trim(),
      body.titleMl || null,
      body.foodsAllowedEn || null,
      body.foodsAllowedMl || null,
      body.foodsModerateEn || null,
      body.foodsModerateMl || null,
      body.foodsAvoidEn || null,
      body.foodsAvoidMl || null,
      body.lifestyleTipsEn || null,
      body.lifestyleTipsMl || null,
      body.tags ? JSON.stringify(body.tags) : null,
      user.staffId,
      nowIso,
      nowIso
    )
    .run();

  const record = await db.prepare('SELECT * FROM diet_guides WHERE id = ?').bind(guideId).first();

  return c.json({ success: true, guide: record });
});

// 3. Approve Diet Guide (Doctor / Admin)
const approveGuidePolicy = declareRoutePolicy('PUT', '/api/diet/guides/:guideId/approve', {
  allowedRoles: ['doctor', 'admin'],
  requireMfa: true,
});

dietRoutes.put('/guides/:guideId/approve', requireAccess(approveGuidePolicy), async (c) => {
  const guideId = c.req.param('guideId');
  const user = c.get('user');
  const db = c.env.DB;
  const nowIso = new Date().toISOString();

  const existing = (await db
    .prepare('SELECT status FROM diet_guides WHERE id = ?')
    .bind(guideId)
    .first()) as { status: string } | null;

  if (!existing) {
    return c.json({ error: 'Diet guide not found' }, 404);
  }

  if (existing.status === 'approved') {
    return c.json({ error: 'Diet guide is already approved and frozen' }, 400);
  }

  await db
    .prepare(
      `UPDATE diet_guides
         SET status = 'approved', approved_by = ?, approved_at = ?, updated_at = ?
         WHERE id = ?`
    )
    .bind(user.staffId, nowIso, nowIso, guideId)
    .run();

  const record = await db.prepare('SELECT * FROM diet_guides WHERE id = ?').bind(guideId).first();

  return c.json({ success: true, guide: record });
});
