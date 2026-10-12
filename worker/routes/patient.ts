import { Hono } from 'hono';
import type { WorkerEnv } from '../env';
import { withPolicy, canPatientAccessRecord } from '../auth/policy';

export const patientRouter = new Hono<{ Bindings: WorkerEnv }>();

// GET /api/patient/home
patientRouter.get(
  '/home',
  withPolicy({ allowedRoles: ['patient', 'guardian'], isClinical: true }, async (c, principal) => {
    const requestedPatientId = c.req.query('patient_id') || principal.id;
    const allowed = await canPatientAccessRecord(c.env.DB, principal.id, requestedPatientId);

    if (!allowed) {
      return c.json({ error: 'Patient not found' }, 404);
    }

    const [patient, nextAppt, carePlan, medications] = await Promise.all([
      c.env.DB.prepare('SELECT * FROM patients WHERE id = ? AND deleted_at IS NULL').bind(requestedPatientId).first(),
      c.env.DB.prepare(
        `SELECT a.*, s.full_name as doctor_name, d.name as department_name
         FROM appointments a
         LEFT JOIN staff s ON a.doctor_id = s.id
         LEFT JOIN departments d ON a.department_id = d.id
         WHERE a.patient_id = ? AND a.status = 'booked' AND a.appointment_date >= datetime('now')
         ORDER BY a.appointment_date ASC LIMIT 1`
      )
        .bind(requestedPatientId)
        .first(),
      c.env.DB.prepare(
        `SELECT * FROM care_plans WHERE patient_id = ? AND status = 'active' ORDER BY created_at DESC LIMIT 1`
      )
        .bind(requestedPatientId)
        .first(),
      c.env.DB.prepare(
        `SELECT * FROM medications WHERE patient_id = ? AND status = 'active' ORDER BY created_at DESC`
      )
        .bind(requestedPatientId)
        .all(),
    ]);

    if (!patient) {
      return c.json({ error: 'Patient not found' }, 404);
    }

    return c.json({
      patient,
      nextAppointment: nextAppt || null,
      carePlan: carePlan || null,
      medications: medications.results || [],
    });
  })
);

// GET /api/patient/records
patientRouter.get(
  '/records',
  withPolicy({ allowedRoles: ['patient', 'guardian'], isClinical: true }, async (c, principal) => {
    const requestedPatientId = c.req.query('patient_id') || principal.id;
    const allowed = await canPatientAccessRecord(c.env.DB, principal.id, requestedPatientId);

    if (!allowed) {
      return c.json({ error: 'Patient not found' }, 404);
    }

    const [documents, encounters, conditions, allergies, observations] = await Promise.all([
      c.env.DB.prepare('SELECT * FROM documents WHERE patient_id = ? ORDER BY report_date DESC')
        .bind(requestedPatientId)
        .all(),
      c.env.DB.prepare(
        `SELECT e.*, s.full_name as doctor_name, d.name as department_name
         FROM encounters e
         LEFT JOIN staff s ON e.doctor_id = s.id
         LEFT JOIN departments d ON e.department_id = d.id
         WHERE e.patient_id = ? AND e.status = 'signed'
         ORDER BY e.signed_at DESC`
      )
        .bind(requestedPatientId)
        .all(),
      c.env.DB.prepare('SELECT * FROM conditions WHERE patient_id = ?').bind(requestedPatientId).all(),
      c.env.DB.prepare('SELECT * FROM allergies WHERE patient_id = ?').bind(requestedPatientId).all(),
      c.env.DB.prepare('SELECT * FROM observations WHERE patient_id = ? ORDER BY measured_at DESC')
        .bind(requestedPatientId)
        .all(),
    ]);

    return c.json({
      documents: documents.results || [],
      encounters: encounters.results || [],
      conditions: conditions.results || [],
      allergies: allergies.results || [],
      observations: observations.results || [],
    });
  })
);

// GET /api/patient/appointments
patientRouter.get(
  '/appointments',
  withPolicy({ allowedRoles: ['patient', 'guardian'], isClinical: true }, async (c, principal) => {
    const requestedPatientId = c.req.query('patient_id') || principal.id;
    const allowed = await canPatientAccessRecord(c.env.DB, principal.id, requestedPatientId);

    if (!allowed) {
      return c.json({ error: 'Patient not found' }, 404);
    }

    const appts = await c.env.DB.prepare(
      `SELECT a.*, s.full_name as doctor_name, d.name as department_name
       FROM appointments a
       LEFT JOIN staff s ON a.doctor_id = s.id
       LEFT JOIN departments d ON a.department_id = d.id
       WHERE a.patient_id = ?
       ORDER BY a.appointment_date DESC`
    )
      .bind(requestedPatientId)
      .all();

    return c.json(appts.results || []);
  })
);

// GET /api/patient/care-plan
patientRouter.get(
  '/care-plan',
  withPolicy({ allowedRoles: ['patient', 'guardian'], isClinical: true }, async (c, principal) => {
    const requestedPatientId = c.req.query('patient_id') || principal.id;
    const allowed = await canPatientAccessRecord(c.env.DB, principal.id, requestedPatientId);

    if (!allowed) {
      return c.json({ error: 'Patient not found' }, 404);
    }

    const plan = await c.env.DB.prepare(
      "SELECT * FROM care_plans WHERE patient_id = ? AND status = 'active' ORDER BY created_at DESC LIMIT 1"
    )
      .bind(requestedPatientId)
      .first<{ id: string }>();

    if (!plan) {
      return c.json({ carePlan: null, items: [] });
    }

    const items = await c.env.DB.prepare(
      `SELECT cpi.*, dg.title_en as diet_title_en, dg.title_ml as diet_title_ml
       FROM care_plan_items cpi
       LEFT JOIN diet_guides dg ON cpi.diet_guide_id = dg.id
       WHERE cpi.care_plan_id = ?`
    )
      .bind(plan.id)
      .all();

    return c.json({
      carePlan: plan,
      items: items.results || [],
    });
  })
);

// POST /api/patient/readings
patientRouter.post(
  '/readings',
  withPolicy({ allowedRoles: ['patient', 'guardian'], isClinical: true }, async (c, principal) => {
    const body = (await c.req.json()) as {
      patient_id?: string;
      kind: string;
      value_text: string;
      unit?: string;
    };

    const targetPatientId = body.patient_id || principal.id;
    const allowed = await canPatientAccessRecord(c.env.DB, principal.id, targetPatientId);
    if (!allowed) {
      return c.json({ error: 'Patient not found' }, 404);
    }

    const id = crypto.randomUUID();
    const reqId = crypto.randomUUID();

    await c.env.DB.batch([
      c.env.DB.prepare(
        'INSERT OR REPLACE INTO _request_ctx (id, actor_id, role, request_id) VALUES (1, ?, ?, ?)'
      ).bind(principal.id, principal.role, reqId),
      c.env.DB.prepare(
        `INSERT INTO observations (id, patient_id, kind, value_text, unit, source, measured_at)
         VALUES (?, ?, ?, ?, ?, 'patient', datetime('now'))`
      ).bind(id, targetPatientId, body.kind, body.value_text, body.unit || null),
      c.env.DB.prepare('DELETE FROM _request_ctx WHERE id = 1'),
    ]);

    return c.json({ ok: true, id }, 200);
  })
);

// POST /api/patient/symptoms
patientRouter.post(
  '/symptoms',
  withPolicy({ allowedRoles: ['patient', 'guardian'], isClinical: true }, async (c, principal) => {
    const body = (await c.req.json()) as {
      patient_id?: string;
      description: string;
      severity?: 'mild' | 'moderate' | 'severe';
    };

    const targetPatientId = body.patient_id || principal.id;
    const allowed = await canPatientAccessRecord(c.env.DB, principal.id, targetPatientId);
    if (!allowed) {
      return c.json({ error: 'Patient not found' }, 404);
    }

    const id = crypto.randomUUID();
    const reqId = crypto.randomUUID();

    await c.env.DB.batch([
      c.env.DB.prepare(
        'INSERT OR REPLACE INTO _request_ctx (id, actor_id, role, request_id) VALUES (1, ?, ?, ?)'
      ).bind(principal.id, principal.role, reqId),
      c.env.DB.prepare(
        `INSERT INTO symptom_reports (id, patient_id, description, severity, reported_at)
         VALUES (?, ?, ?, ?, datetime('now'))`
      ).bind(id, targetPatientId, body.description, body.severity || 'moderate'),
      c.env.DB.prepare('DELETE FROM _request_ctx WHERE id = 1'),
    ]);

    return c.json({ ok: true, id }, 200);
  })
);
