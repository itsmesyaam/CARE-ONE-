/**
 * CareOne Patient Portal API Routes
 * Mounts under /api/patient
 */

import { Hono } from 'hono';
import type { WorkerEnv } from '../env';
import { type AccessVariables, declareRoutePolicy, requireAccess } from '../middleware/access';

export const patientRoutes = new Hono<{
  Bindings: WorkerEnv;
  Variables: AccessVariables;
}>();

// 1. Patient Profile
const profilePolicy = declareRoutePolicy('GET', '/api/patient/profile', {
  allowedRoles: ['patient', 'guardian'],
});

patientRoutes.get('/profile', requireAccess(profilePolicy), async (c) => {
  const user = c.get('user');
  const db = c.env.DB;

  const patient = await db
    .prepare(
      'SELECT id, uhid, mrn, full_name, dob, gender, blood_group, phone, email, created_at FROM patients WHERE id = ?'
    )
    .bind(user.patientId)
    .first();

  if (!patient) {
    return c.json({ error: 'Patient profile not found' }, 404);
  }

  return c.json({ patient });
});

// 2. Patient Appointments
const appointmentsPolicy = declareRoutePolicy('GET', '/api/patient/appointments', {
  allowedRoles: ['patient', 'guardian'],
});

patientRoutes.get('/appointments', requireAccess(appointmentsPolicy), async (c) => {
  const user = c.get('user');
  const db = c.env.DB;

  const results = (await db
    .prepare(
      `SELECT a.*, d.name as department_name, s.full_name as doctor_name
       FROM appointments a
       LEFT JOIN departments d ON a.department_id = d.id
       LEFT JOIN staff s ON a.doctor_id = s.id
       WHERE a.patient_id = ?
       ORDER BY a.start_time DESC`
    )
    .bind(user.patientId)
    .all()) as { results: unknown[] };

  return c.json({ appointments: results.results });
});

// 3. Patient Care Plans & Items (with Diet Guidance)
const carePlansPolicy = declareRoutePolicy('GET', '/api/patient/care-plans', {
  allowedRoles: ['patient', 'guardian'],
});

patientRoutes.get('/care-plans', requireAccess(carePlansPolicy), async (c) => {
  const user = c.get('user');
  const db = c.env.DB;

  const plans = (await db
    .prepare(
      `SELECT cp.*, s.full_name as doctor_name
       FROM care_plans cp
       LEFT JOIN staff s ON cp.doctor_id = s.id
       WHERE cp.patient_id = ? AND cp.status = 'active'
       ORDER BY cp.created_at DESC`
    )
    .bind(user.patientId)
    .all()) as { results: Array<{ id: string }> };

  const items = (await db
    .prepare(
      `SELECT cpi.*, dg.title_en as diet_title_en, dg.title_ml as diet_title_ml
       FROM care_plan_items cpi
       LEFT JOIN diet_guides dg ON cpi.diet_guide_id = dg.id
       WHERE cpi.patient_id = ?
       ORDER BY cpi.due_date ASC`
    )
    .bind(user.patientId)
    .all()) as { results: unknown[] };

  return c.json({
    carePlans: plans.results,
    items: items.results,
  });
});

// 4. Patient Readings / Observations
const readingsGetPolicy = declareRoutePolicy('GET', '/api/patient/readings', {
  allowedRoles: ['patient', 'guardian'],
});

patientRoutes.get('/readings', requireAccess(readingsGetPolicy), async (c) => {
  const user = c.get('user');
  const db = c.env.DB;

  const results = (await db
    .prepare(
      `SELECT * FROM observations
       WHERE patient_id = ?
       ORDER BY measured_at DESC LIMIT 50`
    )
    .bind(user.patientId)
    .all()) as { results: unknown[] };

  return c.json({ observations: results.results });
});

// 5. Patient Self-Log Observation
const readingsPostPolicy = declareRoutePolicy('POST', '/api/patient/readings', {
  allowedRoles: ['patient', 'guardian'],
});

patientRoutes.post('/readings', requireAccess(readingsPostPolicy), async (c) => {
  const user = c.get('user');
  const body = (await c.req.json().catch(() => ({}))) as {
    kind?: string;
    valueText?: string;
    valueNumeric?: number;
    unit?: string;
    outOfRange?: boolean;
  };

  if (!body.kind || (!body.valueText && body.valueNumeric === undefined)) {
    return c.json({ error: 'Metric kind and value are required' }, 400);
  }

  const db = c.env.DB;
  const observationId = crypto.randomUUID();
  const nowIso = new Date().toISOString();

  await db
    .prepare(
      `INSERT INTO observations (
        id, patient_id, encounter_id, kind, value_text, value_numeric, unit, out_of_range, source, measured_at, created_at
      ) VALUES (?, ?, NULL, ?, ?, ?, ?, ?, 'patient', ?, ?)`
    )
    .bind(
      observationId,
      user.patientId,
      body.kind,
      body.valueText || String(body.valueNumeric),
      body.valueNumeric ?? null,
      body.unit || null,
      body.outOfRange ? 1 : 0,
      nowIso,
      nowIso
    )
    .run();

  const record = await db
    .prepare('SELECT * FROM observations WHERE id = ?')
    .bind(observationId)
    .first();

  return c.json({ success: true, observation: record });
});

// 6. Patient Symptom Report
const symptomsPostPolicy = declareRoutePolicy('POST', '/api/patient/symptoms', {
  allowedRoles: ['patient', 'guardian'],
});

patientRoutes.post('/symptoms', requireAccess(symptomsPostPolicy), async (c) => {
  const user = c.get('user');
  const body = (await c.req.json().catch(() => ({}))) as {
    description?: string;
    severity?: 'mild' | 'moderate' | 'severe';
  };

  if (!body.description || !body.description.trim()) {
    return c.json({ error: 'Symptom description is required' }, 400);
  }

  const db = c.env.DB;
  const symptomId = crypto.randomUUID();
  const nowIso = new Date().toISOString();

  await db
    .prepare(
      `INSERT INTO symptom_reports (
        id, patient_id, description, severity, reported_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      symptomId,
      user.patientId,
      body.description.trim(),
      body.severity || 'moderate',
      nowIso,
      nowIso,
      nowIso
    )
    .run();

  const record = await db
    .prepare('SELECT * FROM symptom_reports WHERE id = ?')
    .bind(symptomId)
    .first();

  return c.json({ success: true, report: record });
});
