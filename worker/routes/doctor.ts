import { Hono } from 'hono';
import type { WorkerEnv } from '../env';

export const doctorRouter = new Hono<{ Bindings: WorkerEnv }>();

function getActor(c: { req: { header: (name: string) => string | undefined } }) {
  const id = c.req.header('x-actor-id');
  const role = c.req.header('x-actor-role');
  return { id, role };
}

// Check doctor access to a specific patient
async function canDoctorAccessPatient(
  db: D1Database,
  doctorId: string,
  patientId: string
): Promise<boolean> {
  // 1. Care team link
  const careTeam = await db
    .prepare(
      `SELECT id FROM care_team
       WHERE patient_id = ? AND staff_id = ? AND revoked_at IS NULL
         AND (expires_at IS NULL OR expires_at > datetime('now'))`
    )
    .bind(patientId, doctorId)
    .first();

  if (careTeam) return true;

  // 2. Active emergency break-glass
  const emergency = await db
    .prepare(
      `SELECT id FROM emergency_access
       WHERE patient_id = ? AND staff_id = ? AND expires_at > datetime('now')`
    )
    .bind(patientId, doctorId)
    .first();

  return Boolean(emergency);
}

// GET /api/doctor/today
doctorRouter.get('/today', async (c) => {
  const { id: actorId, role } = getActor(c);
  if (role !== 'doctor') {
    return c.json({ error: 'Forbidden: Doctor access required' }, 403);
  }

  const [appointments, pendingReports, pendingSymptoms] = await Promise.all([
    c.env.DB.prepare(
      `SELECT a.id, a.patient_id, a.doctor_id, a.appointment_date, a.status, a.notes,
              p.id as p_id, p.uhid as p_uhid, p.full_name as p_full_name, p.dob as p_dob,
              p.gender as p_gender, p.phone as p_phone
       FROM appointments a
       JOIN patients p ON a.patient_id = p.id
       WHERE a.doctor_id = ? AND a.status != 'cancelled'
       ORDER BY a.appointment_date ASC`
    )
      .bind(actorId)
      .all(),
    c.env.DB.prepare(
      "SELECT COUNT(*) as c FROM documents WHERE review_status = 'pending'"
    ).first<{ c: number }>(),
    c.env.DB.prepare(
      'SELECT COUNT(*) as c FROM symptom_reports WHERE reviewed_at IS NULL'
    ).first<{ c: number }>(),
  ]);

  const formattedAppts = (appointments.results || []).map((row: Record<string, unknown>) => ({
    id: row.id,
    patient_id: row.patient_id,
    doctor_id: row.doctor_id,
    appointment_date: row.appointment_date,
    status: row.status,
    notes: row.notes,
    patient: {
      id: row.p_id,
      uhid: row.p_uhid,
      full_name: row.p_full_name,
      dob: row.p_dob,
      gender: row.p_gender,
      phone: row.p_phone,
    },
  }));

  return c.json({
    appointments: formattedAppts,
    pendingReportsCount: pendingReports?.c || 0,
    pendingSymptomsCount: pendingSymptoms?.c || 0,
  });
});

// GET /api/doctor/patients
doctorRouter.get('/patients', async (c) => {
  const { id: actorId, role } = getActor(c);
  if (role !== 'doctor') {
    return c.json({ error: 'Forbidden: Doctor access required' }, 403);
  }

  const [patients, careTeamRows, emergencyRows, conditions, pendingDocs, pendingSymptoms] =
    await Promise.all([
      c.env.DB.prepare(
        'SELECT id, uhid, full_name, dob, gender, blood_group, phone, created_at FROM patients WHERE deleted_at IS NULL ORDER BY full_name'
      ).all(),
      c.env.DB.prepare(
        `SELECT patient_id, expires_at FROM care_team WHERE staff_id = ? AND revoked_at IS NULL`
      )
        .bind(actorId)
        .all(),
      c.env.DB.prepare(
        `SELECT patient_id, expires_at, reason FROM emergency_access WHERE staff_id = ? AND expires_at > datetime('now')`
      )
        .bind(actorId)
        .all(),
      c.env.DB.prepare("SELECT patient_id, name, status FROM conditions WHERE status = 'active'").all(),
      c.env.DB.prepare("SELECT patient_id FROM documents WHERE review_status = 'pending'").all(),
      c.env.DB.prepare('SELECT patient_id FROM symptom_reports WHERE reviewed_at IS NULL').all(),
    ]);

  return c.json({
    patients: patients.results || [],
    careTeam: careTeamRows.results || [],
    emergencyAccesses: emergencyRows.results || [],
    conditions: conditions.results || [],
    pendingDocs: pendingDocs.results || [],
    pendingSymptoms: pendingSymptoms.results || [],
  });
});

// GET /api/doctor/patients/:id/chart
doctorRouter.get('/patients/:id/chart', async (c) => {
  const { id: actorId, role } = getActor(c);
  if (role !== 'doctor') {
    return c.json({ error: 'Forbidden: Doctor access required' }, 403);
  }

  const patientId = c.req.param('id');
  const allowed = await canDoctorAccessPatient(c.env.DB, actorId || '', patientId);
  if (!allowed) {
    return c.json(
      { error: 'Forbidden: Doctor is not on patient care team (use emergency break-glass if acute)' },
      403
    );
  }

  const [
    patient,
    allergies,
    conditions,
    encounters,
    addenda,
    observations,
    documents,
    medications,
    carePlans,
    carePlanItems,
    dietGuides,
  ] = await Promise.all([
    c.env.DB.prepare('SELECT * FROM patients WHERE id = ?').bind(patientId).first(),
    c.env.DB.prepare('SELECT * FROM allergies WHERE patient_id = ?').bind(patientId).all(),
    c.env.DB.prepare('SELECT * FROM conditions WHERE patient_id = ?').bind(patientId).all(),
    c.env.DB.prepare(
      `SELECT e.*, s.full_name as doctor_name, d.name as department_name
       FROM encounters e
       LEFT JOIN staff s ON e.doctor_id = s.id
       LEFT JOIN departments d ON e.department_id = d.id
       WHERE e.patient_id = ?
       ORDER BY e.created_at DESC`
    )
      .bind(patientId)
      .all(),
    c.env.DB.prepare('SELECT * FROM encounter_addenda WHERE patient_id = ?').bind(patientId).all(),
    c.env.DB.prepare(
      'SELECT * FROM observations WHERE patient_id = ? ORDER BY measured_at DESC'
    )
      .bind(patientId)
      .all(),
    c.env.DB.prepare('SELECT * FROM documents WHERE patient_id = ? ORDER BY report_date DESC')
      .bind(patientId)
      .all(),
    c.env.DB.prepare('SELECT * FROM medications WHERE patient_id = ? ORDER BY created_at DESC')
      .bind(patientId)
      .all(),
    c.env.DB.prepare('SELECT * FROM care_plans WHERE patient_id = ? ORDER BY created_at DESC')
      .bind(patientId)
      .all(),
    c.env.DB.prepare('SELECT * FROM care_plan_items WHERE patient_id = ?').bind(patientId).all(),
    c.env.DB.prepare("SELECT * FROM diet_guides WHERE status = 'approved'").all(),
  ]);

  if (!patient) {
    return c.json({ error: 'Patient not found' }, 404);
  }

  // Nest addenda into encounters
  const addendaList = (addenda.results || []) as Array<{ encounter_id: string }>;
  const encounterList = (encounters.results || []).map((enc: Record<string, unknown>) => ({
    ...enc,
    encounter_addenda: addendaList.filter((a) => a.encounter_id === enc.id),
  }));

  // Nest items into care plans
  const itemList = (carePlanItems.results || []) as Array<{ care_plan_id: string; diet_guide_id?: string }>;
  const dietList = (dietGuides.results || []) as Array<{ id: string }>;
  const planList = (carePlans.results || []).map((cp: Record<string, unknown>) => ({
    ...cp,
    care_plan_items: itemList
      .filter((i) => i.care_plan_id === cp.id)
      .map((i) => ({
        ...i,
        diet_guides: i.diet_guide_id ? dietList.find((d) => d.id === i.diet_guide_id) : null,
      })),
  }));

  return c.json({
    patient,
    allergies: allergies.results || [],
    conditions: conditions.results || [],
    encounters: encounterList,
    observations: observations.results || [],
    documents: documents.results || [],
    medications: medications.results || [],
    carePlans: planList,
  });
});

// POST /api/doctor/patients/:id/emergency-access
doctorRouter.post('/patients/:id/emergency-access', async (c) => {
  const { id: actorId, role } = getActor(c);
  if (role !== 'doctor') {
    return c.json({ error: 'Forbidden: Doctor access required' }, 403);
  }

  const patientId = c.req.param('id');
  const body = (await c.req.json()) as { reason: string };

  if (!body.reason || body.reason.trim().length < 15) {
    return c.json(
      { error: 'A written emergency reason of at least 15 characters is required' },
      400
    );
  }

  const accessId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString();

  // Insert emergency access and record in audit_log
  await c.env.DB.batch([
    c.env.DB.prepare(
      `INSERT INTO emergency_access (id, patient_id, staff_id, reason, expires_at)
       VALUES (?, ?, ?, ?, ?)`
    ).bind(accessId, patientId, actorId, body.reason.trim(), expiresAt),
    c.env.DB.prepare(
      `INSERT INTO audit_log (at, actor_id, action, table_name, record_id, patient_id, reason)
       VALUES (datetime('now'), ?, 'EMERGENCY_ACCESS', 'emergency_access', ?, ?, ?)`
    ).bind(actorId, accessId, patientId, body.reason.trim()),
  ]);

  return c.json({ ok: true, access_id: accessId, expires_at: expiresAt });
});

// GET /api/doctor/patients/:id/what-changed
doctorRouter.get('/patients/:id/what-changed', async (c) => {
  const { id: actorId, role } = getActor(c);
  if (role !== 'doctor') {
    return c.json({ error: 'Forbidden: Doctor access required' }, 403);
  }

  const patientId = c.req.param('id');
  const allowed = await canDoctorAccessPatient(c.env.DB, actorId || '', patientId);
  if (!allowed) {
    return c.json({ error: 'Forbidden: Access denied' }, 403);
  }

  // Find latest signed consultation timestamp
  const lastSigned = await c.env.DB.prepare(
    `SELECT signed_at FROM encounters
     WHERE patient_id = ? AND status = 'signed'
     ORDER BY signed_at DESC LIMIT 1`
  )
    .bind(patientId)
    .first<{ signed_at: string }>();

  const sinceTime = lastSigned?.signed_at || new Date(Date.now() - 30 * 86400000).toISOString();

  const [reports, symptoms, readings] = await Promise.all([
    c.env.DB.prepare(
      `SELECT id as ref_id, 'report' as kind, created_at as happened_at,
              'Uploaded report: ' || title as summary, 'documents' as ref_table
       FROM documents
       WHERE patient_id = ? AND created_at > ?`
    )
      .bind(patientId, sinceTime)
      .all(),
    c.env.DB.prepare(
      `SELECT id as ref_id, 'symptom' as kind, reported_at as happened_at,
              'Reported symptom: ' || description as summary, 'symptom_reports' as ref_table
       FROM symptom_reports
       WHERE patient_id = ? AND reported_at > ?`
    )
      .bind(patientId, sinceTime)
      .all(),
    c.env.DB.prepare(
      `SELECT id as ref_id, 'reading' as kind, measured_at as happened_at,
              kind || ': ' || value_text || COALESCE(' ' || unit, '') as summary, 'observations' as ref_table
       FROM observations
       WHERE patient_id = ? AND measured_at > ?`
    )
      .bind(patientId, sinceTime)
      .all(),
  ]);

  const allItems = [
    ...(reports.results || []),
    ...(symptoms.results || []),
    ...(readings.results || []),
  ].sort((a: Record<string, unknown>, b: Record<string, unknown>) =>
    String(b.happened_at).localeCompare(String(a.happened_at))
  );

  return c.json(allItems);
});

// POST /api/doctor/encounters (Sign consultation note with request context)
doctorRouter.post('/encounters', async (c) => {
  const { id: actorId, role } = getActor(c);
  if (role !== 'doctor') {
    return c.json({ error: 'Forbidden: Doctor access required' }, 403);
  }

  const body = (await c.req.json()) as {
    patient_id: string;
    chief_complaint?: string;
    clinical_notes?: string;
    examination?: string;
    diagnosis?: string;
    department_id?: string;
  };

  const encounterId = crypto.randomUUID();
  const reqId = crypto.randomUUID();

  await c.env.DB.batch([
    c.env.DB.prepare(
      'INSERT OR REPLACE INTO _request_ctx (id, actor_id, role, request_id) VALUES (1, ?, ?, ?)'
    ).bind(actorId, role, reqId),
    c.env.DB.prepare(
      `INSERT INTO encounters (
        id, patient_id, doctor_id, department_id, status, sensitivity,
        chief_complaint, clinical_notes, examination, diagnosis, signed_at
      ) VALUES (?, ?, ?, ?, 'signed', 'normal', ?, ?, ?, ?, datetime('now'))`
    ).bind(
      encounterId,
      body.patient_id,
      actorId,
      body.department_id || null,
      body.chief_complaint || null,
      body.clinical_notes || null,
      body.examination || null,
      body.diagnosis || null
    ),
    c.env.DB.prepare('DELETE FROM _request_ctx WHERE id = 1'),
  ]);

  return c.json({ ok: true, encounter_id: encounterId }, 200);
});

// POST /api/doctor/encounters/:id/addendum
doctorRouter.post('/encounters/:id/addendum', async (c) => {
  const { id: actorId, role } = getActor(c);
  if (role !== 'doctor') {
    return c.json({ error: 'Forbidden: Doctor access required' }, 403);
  }

  const encounterId = c.req.param('id');
  const body = (await c.req.json()) as {
    patient_id: string;
    reason: string;
    notes: string;
  };

  const addendumId = crypto.randomUUID();
  const reqId = crypto.randomUUID();

  await c.env.DB.batch([
    c.env.DB.prepare(
      'INSERT OR REPLACE INTO _request_ctx (id, actor_id, role, request_id) VALUES (1, ?, ?, ?)'
    ).bind(actorId, role, reqId),
    c.env.DB.prepare(
      `INSERT INTO encounter_addenda (id, encounter_id, patient_id, doctor_id, reason, notes)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).bind(addendumId, encounterId, body.patient_id, actorId, body.reason, body.notes),
    c.env.DB.prepare('DELETE FROM _request_ctx WHERE id = 1'),
  ]);

  return c.json({ ok: true, addendum_id: addendumId }, 201);
});

// GET /api/doctor/review
doctorRouter.get('/review', async (c) => {
  const { role } = getActor(c);
  if (role !== 'doctor') {
    return c.json({ error: 'Forbidden: Doctor access required' }, 403);
  }

  const [reports, symptoms] = await Promise.all([
    c.env.DB.prepare(
      `SELECT d.*, p.id as p_id, p.full_name as p_full_name, p.uhid as p_uhid,
              p.dob as p_dob, p.gender as p_gender, p.phone as p_phone
       FROM documents d
       JOIN patients p ON d.patient_id = p.id
       ORDER BY d.created_at DESC`
    ).all(),
    c.env.DB.prepare(
      `SELECT s.*, p.id as p_id, p.full_name as p_full_name, p.uhid as p_uhid,
              p.dob as p_dob, p.gender as p_gender, p.phone as p_phone
       FROM symptom_reports s
       JOIN patients p ON s.patient_id = p.id
       ORDER BY s.reported_at DESC`
    ).all(),
  ]);

  const formattedReports = (reports.results || []).map((r: Record<string, unknown>) => ({
    ...r,
    patients: {
      id: r.p_id,
      full_name: r.p_full_name,
      uhid: r.p_uhid,
      dob: r.p_dob,
      gender: r.p_gender,
      phone: r.p_phone,
    },
  }));

  const formattedSymptoms = (symptoms.results || []).map((s: Record<string, unknown>) => ({
    ...s,
    patients: {
      id: s.p_id,
      full_name: s.p_full_name,
      uhid: s.p_uhid,
      dob: s.p_dob,
      gender: s.p_gender,
      phone: s.p_phone,
    },
  }));

  return c.json({
    reports: formattedReports,
    symptoms: formattedSymptoms,
  });
});
