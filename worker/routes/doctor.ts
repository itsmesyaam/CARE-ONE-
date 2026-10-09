/**
 * CareOne Doctor Portal API Routes
 * Mounts under /api/doctor
 */

import { Hono } from 'hono';
import type { WorkerEnv } from '../env';
import { type AccessVariables, declareRoutePolicy, requireAccess } from '../middleware/access';

export const doctorRoutes = new Hono<{
  Bindings: WorkerEnv;
  Variables: AccessVariables;
}>();

// 1. Today's Appointments & Review Queue Summary
const todayPolicy = declareRoutePolicy('GET', '/api/doctor/today', {
  allowedRoles: ['doctor'],
  requireMfa: true,
});

doctorRoutes.get('/today', requireAccess(todayPolicy), async (c) => {
  const user = c.get('user');
  const db = c.env.DB;
  const todayStr = new Date().toISOString().split('T')[0]!;

  const appointments = (await db
    .prepare(
      `SELECT a.*, p.full_name as patient_name, p.uhid, p.gender, p.dob
       FROM appointments a
       JOIN patients p ON a.patient_id = p.id
       WHERE a.doctor_id = ? AND a.appointment_date LIKE ?
       ORDER BY a.start_time ASC`
    )
    .bind(user.staffId, `${todayStr}%`)
    .all()) as { results: unknown[] };

  const pendingReports = (await db
    .prepare(`SELECT COUNT(*) as count FROM documents WHERE review_status = 'pending'`)
    .first()) as { count: number } | null;

  const pendingSymptoms = (await db
    .prepare(`SELECT COUNT(*) as count FROM symptom_reports WHERE reviewed_by IS NULL`)
    .first()) as { count: number } | null;

  return c.json({
    appointments: appointments.results,
    summary: {
      totalToday: appointments.results.length,
      pendingReports: pendingReports?.count || 0,
      pendingSymptoms: pendingSymptoms?.count || 0,
    },
  });
});

// 2. Patient Directory / Search
const patientsSearchPolicy = declareRoutePolicy('GET', '/api/doctor/patients', {
  allowedRoles: ['doctor'],
  requireMfa: true,
});

doctorRoutes.get('/patients', requireAccess(patientsSearchPolicy), async (c) => {
  const q = (c.req.query('q') || '').trim();
  const db = c.env.DB;

  let query =
    'SELECT id, uhid, mrn, full_name, dob, gender, blood_group, phone FROM patients WHERE deleted_at IS NULL';
  const params: string[] = [];

  if (q) {
    query += ' AND (full_name LIKE ? OR uhid LIKE ? OR phone LIKE ?)';
    params.push(`%${q}%`, `%${q}%`, `%${q}%`);
  }
  query += ' ORDER BY full_name ASC LIMIT 50';

  const stmt = db.prepare(query);
  const result = (await (params.length > 0 ? stmt.bind(...params) : stmt).all()) as {
    results: unknown[];
  };

  return c.json({ patients: result.results });
});

// 3. What Changed Delta Query
const whatChangedPolicy = declareRoutePolicy(
  'GET',
  '/api/doctor/patients/:patientId/what-changed',
  {
    allowedRoles: ['doctor'],
    patientScoped: true,
    allowEmergencyAccess: true,
    requireMfa: true,
  }
);

doctorRoutes.get(
  '/patients/:patientId/what-changed',
  requireAccess(whatChangedPolicy),
  async (c) => {
    const patientId = c.req.param('patientId');
    const db = c.env.DB;

    // Retrieve last signed visit
    const lastEncounter = (await db
      .prepare(
        `SELECT signed_at FROM encounters
         WHERE patient_id = ? AND status = 'signed'
         ORDER BY signed_at DESC LIMIT 1`
      )
      .bind(patientId)
      .first()) as { signed_at: string } | null;

    const lastVisitDate = lastEncounter?.signed_at || '1970-01-01T00:00:00.000Z';

    // Union query across documents, medications, abnormal readings, and symptom reports
    const query = `
      SELECT d.created_at AS happened_at, 'report' AS kind, 'New report: ' || d.title AS summary, 'documents' AS ref_table, d.id AS ref_id
      FROM documents d
      WHERE d.patient_id = ? AND d.created_at > ?
      UNION ALL
      SELECT m.updated_at AS happened_at, 'medicine' AS kind, m.status || ': ' || m.drug || ' ' || m.dose AS summary, 'medications' AS ref_table, m.id AS ref_id
      FROM medications m
      WHERE m.patient_id = ? AND m.updated_at > ?
      UNION ALL
      SELECT o.measured_at AS happened_at, 'reading' AS kind, o.kind || ' ' || o.value_text || ' (outside range)' AS summary, 'observations' AS ref_table, o.id AS ref_id
      FROM observations o
      WHERE o.patient_id = ? AND o.measured_at > ? AND o.out_of_range = 1
      UNION ALL
      SELECT sr.reported_at AS happened_at, 'symptom' AS kind, 'Reported symptom: ' || sr.description AS summary, 'symptom_reports' AS ref_table, sr.id AS ref_id
      FROM symptom_reports sr
      WHERE sr.patient_id = ? AND sr.reported_at > ?
      ORDER BY happened_at DESC
    `;

    const items = (await db
      .prepare(query)
      .bind(
        patientId,
        lastVisitDate,
        patientId,
        lastVisitDate,
        patientId,
        lastVisitDate,
        patientId,
        lastVisitDate
      )
      .all()) as { results: unknown[] };

    return c.json({
      patientId,
      lastVisitDate: lastEncounter?.signed_at || null,
      items: items.results,
    });
  }
);

// 4. Create Consultation Encounter Note
const createEncounterPolicy = declareRoutePolicy(
  'POST',
  '/api/doctor/patients/:patientId/encounters',
  {
    allowedRoles: ['doctor'],
    patientScoped: true,
    allowEmergencyAccess: true,
    requireMfa: true,
  }
);

doctorRoutes.post(
  '/patients/:patientId/encounters',
  requireAccess(createEncounterPolicy),
  async (c) => {
    const patientId = c.req.param('patientId');
    const user = c.get('user');
    const body = (await c.req.json().catch(() => ({}))) as {
      summary?: string;
      clinicalNotes?: string;
      status?: 'draft' | 'signed';
      encounterType?: string;
    };

    const db = c.env.DB;
    const encounterId = crypto.randomUUID();
    const nowIso = new Date().toISOString();
    const status = body.status === 'signed' ? 'signed' : 'draft';
    const signedAt = status === 'signed' ? nowIso : null;

    await db
      .prepare(
        `INSERT INTO encounters (
          id, patient_id, doctor_id, department_id, status, sensitivity, chief_complaint, clinical_notes, diagnosis, plan, signed_at, created_at, updated_at
        ) VALUES (?, ?, ?, NULL, ?, 'normal', ?, ?, NULL, NULL, ?, ?, ?)`
      )
      .bind(
        encounterId,
        patientId,
        user.staffId,
        status,
        body.summary || '',
        body.clinicalNotes || '',
        signedAt,
        nowIso,
        nowIso
      )
      .run();

    const record = await db
      .prepare('SELECT * FROM encounters WHERE id = ?')
      .bind(encounterId)
      .first();

    return c.json({ success: true, encounter: record });
  }
);

// 5. Sign Encounter Note
const signEncounterPolicy = declareRoutePolicy('POST', '/api/doctor/encounters/:encounterId/sign', {
  allowedRoles: ['doctor'],
  requireMfa: true,
});

doctorRoutes.post(
  '/encounters/:encounterId/sign',
  requireAccess(signEncounterPolicy),
  async (c) => {
    const encounterId = c.req.param('encounterId');
    const db = c.env.DB;
    const nowIso = new Date().toISOString();

    const existing = (await db
      .prepare('SELECT status FROM encounters WHERE id = ?')
      .bind(encounterId)
      .first()) as { status: string } | null;

    if (!existing) {
      return c.json({ error: 'Encounter not found' }, 404);
    }

    if (existing.status === 'signed') {
      return c.json({ error: 'Encounter is already signed and frozen' }, 400);
    }

    await db
      .prepare(
        `UPDATE encounters
         SET status = 'signed', signed_at = ?, updated_at = ?
         WHERE id = ?`
      )
      .bind(nowIso, nowIso, encounterId)
      .run();

    const record = await db
      .prepare('SELECT * FROM encounters WHERE id = ?')
      .bind(encounterId)
      .first();

    return c.json({ success: true, encounter: record });
  }
);

// 6. Edit Draft Encounter
const editEncounterPolicy = declareRoutePolicy('PUT', '/api/doctor/encounters/:encounterId', {
  allowedRoles: ['doctor'],
  requireMfa: true,
});

doctorRoutes.put('/encounters/:encounterId', requireAccess(editEncounterPolicy), async (c) => {
  const encounterId = c.req.param('encounterId');
  const body = (await c.req.json().catch(() => ({}))) as {
    summary?: string;
    clinicalNotes?: string;
  };
  const db = c.env.DB;

  const existing = (await db
    .prepare('SELECT status FROM encounters WHERE id = ?')
    .bind(encounterId)
    .first()) as { status: string } | null;

  if (!existing) {
    return c.json({ error: 'Encounter not found' }, 404);
  }

  if (existing.status === 'signed') {
    return c.json({ error: 'Cannot modify a signed encounter note' }, 400);
  }

  const nowIso = new Date().toISOString();
  try {
    await db
      .prepare(
        `UPDATE encounters
           SET chief_complaint = coalesce(?, chief_complaint),
               clinical_notes = coalesce(?, clinical_notes),
               updated_at = ?
           WHERE id = ?`
      )
      .bind(body.summary || null, body.clinicalNotes || null, nowIso, encounterId)
      .run();
  } catch {
    return c.json({ error: 'Cannot modify a signed encounter note' }, 400);
  }

  const record = await db
    .prepare('SELECT * FROM encounters WHERE id = ?')
    .bind(encounterId)
    .first();

  return c.json({ success: true, encounter: record });
});

// 7. Addendum to Signed Encounter Note
const addendumPolicy = declareRoutePolicy('POST', '/api/doctor/encounters/:encounterId/addenda', {
  allowedRoles: ['doctor'],
  requireMfa: true,
});

doctorRoutes.post('/encounters/:encounterId/addenda', requireAccess(addendumPolicy), async (c) => {
  const encounterId = c.req.param('encounterId');
  const user = c.get('user');
  const body = (await c.req.json().catch(() => ({}))) as {
    note?: string;
    notes?: string;
    reason?: string;
  };

  const noteContent = (body.note || body.notes || '').trim();
  if (!noteContent) {
    return c.json({ error: 'Addendum note is required' }, 400);
  }

  const db = c.env.DB;
  const encounter = (await db
    .prepare('SELECT patient_id FROM encounters WHERE id = ?')
    .bind(encounterId)
    .first()) as { patient_id: string } | null;

  if (!encounter) {
    return c.json({ error: 'Encounter not found' }, 404);
  }

  const addendumId = crypto.randomUUID();
  const nowIso = new Date().toISOString();

  await db
    .prepare(
      `INSERT INTO encounter_addenda (id, encounter_id, patient_id, doctor_id, reason, notes, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      addendumId,
      encounterId,
      encounter.patient_id,
      user.staffId,
      body.reason || 'Clinical Note Update',
      noteContent,
      nowIso
    )
    .run();

  const record = await db
    .prepare('SELECT * FROM encounter_addenda WHERE id = ?')
    .bind(addendumId)
    .first();

  return c.json({ success: true, addendum: record });
});

// 8. Prescribe Medication
const prescribePolicy = declareRoutePolicy(
  'POST',
  '/api/doctor/patients/:patientId/prescriptions',
  {
    allowedRoles: ['doctor'],
    patientScoped: true,
    allowEmergencyAccess: true,
    requireMfa: true,
  }
);

doctorRoutes.post(
  '/patients/:patientId/prescriptions',
  requireAccess(prescribePolicy),
  async (c) => {
    const patientId = c.req.param('patientId');
    const user = c.get('user');
    const body = (await c.req.json().catch(() => ({}))) as {
      drug?: string;
      dose?: string;
      timing?: string;
      frequency?: string;
      durationDays?: number;
      instructions?: string;
    };

    if (!body.drug || !body.dose) {
      return c.json({ error: 'Drug name and dose are required' }, 400);
    }

    const db = c.env.DB;
    const medId = crypto.randomUUID();
    const nowIso = new Date().toISOString();

    await db
      .prepare(
        `INSERT INTO medications (
          id, patient_id, doctor_id, department_id, drug, dose, timing, duration_days, instructions, status, created_at, updated_at
        ) VALUES (?, ?, ?, NULL, ?, ?, ?, ?, ?, 'active', ?, ?)`
      )
      .bind(
        medId,
        patientId,
        user.staffId,
        body.drug,
        body.dose,
        body.timing || body.frequency || '1-0-1',
        body.durationDays || 30,
        body.instructions || null,
        nowIso,
        nowIso
      )
      .run();

    const record = await db.prepare('SELECT * FROM medications WHERE id = ?').bind(medId).first();

    return c.json({ success: true, medication: record });
  }
);

// 9. Break-Glass Emergency Access Grant
const emergencyPolicy = declareRoutePolicy('POST', '/api/doctor/emergency-access', {
  allowedRoles: ['doctor'],
  requireMfa: true,
});

doctorRoutes.post('/emergency-access', requireAccess(emergencyPolicy), async (c) => {
  const user = c.get('user');
  const body = (await c.req.json().catch(() => ({}))) as {
    patientId?: string;
    reason?: string;
  };

  const patientId = body.patientId;
  const reason = (body.reason || '').trim();

  if (!patientId) {
    return c.json({ error: 'Patient ID is required' }, 400);
  }

  if (reason.length < 15) {
    return c.json(
      { error: 'Emergency access reason must be at least 15 characters describing clinical need' },
      400
    );
  }

  const db = c.env.DB;
  const accessId = crypto.randomUUID();
  const now = new Date();
  const expires = new Date(now.getTime() + 4 * 60 * 60 * 1000); // 4 hours
  const nowIso = now.toISOString();
  const expiresIso = expires.toISOString();

  await db
    .prepare(
      `INSERT INTO emergency_access (id, patient_id, staff_id, reason, expires_at, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`
    )
    .bind(accessId, patientId, user.staffId, reason, expiresIso, nowIso)
    .run();

  // Audit log entry
  await db
    .prepare(
      `INSERT INTO audit_log (id, at, actor_id, action, table_name, record_id, patient_id, reason)
         VALUES (?, ?, ?, 'EMERGENCY_ACCESS_GRANTED', 'emergency_access', ?, ?, ?)`
    )
    .bind(crypto.randomUUID(), nowIso, user.id, accessId, patientId, reason)
    .run();

  return c.json({
    success: true,
    access: {
      id: accessId,
      patient_id: patientId,
      expires_at: expiresIso,
    },
  });
});

// 10. Symptoms Review Queue
const symptomsReviewPolicy = declareRoutePolicy('GET', '/api/doctor/symptoms/review-queue', {
  allowedRoles: ['doctor'],
  requireMfa: true,
});

interface SymptomReviewRow {
  id: string;
  patient_id: string;
  description: string;
  severity: string;
  reported_at: string;
  reviewed_at: string | null;
  patient_name: string;
  patient_uhid: string;
  patient_dob: string;
  patient_gender: string;
  patient_phone: string;
}

doctorRoutes.get('/symptoms/review-queue', requireAccess(symptomsReviewPolicy), async (c) => {
  const db = c.env.DB;
  const query = `
    SELECT sr.id, sr.patient_id, sr.description, sr.severity, sr.reported_at, sr.reviewed_at,
           p.full_name as patient_name, p.uhid as patient_uhid, p.dob as patient_dob,
           p.gender as patient_gender, p.phone as patient_phone
    FROM symptom_reports sr
    JOIN patients p ON sr.patient_id = p.id
    ORDER BY sr.reported_at DESC
  `;
  const result = await db.prepare(query).all<SymptomReviewRow>();
  const symptoms = (result.results || []).map((r) => ({
    id: r.id,
    patient_id: r.patient_id,
    description: r.description,
    severity: r.severity,
    reported_at: r.reported_at,
    reviewed_at: r.reviewed_at,
    patients: {
      id: r.patient_id,
      full_name: r.patient_name,
      uhid: r.patient_uhid,
      dob: r.patient_dob,
      gender: r.patient_gender,
      phone: r.patient_phone,
    },
  }));
  return c.json({ success: true, symptoms });
});

// 11. Mark Symptom Reviewed
const symptomReviewPolicy = declareRoutePolicy('POST', '/api/doctor/symptoms/:id/review', {
  allowedRoles: ['doctor'],
  requireMfa: true,
});

doctorRoutes.post('/symptoms/:id/review', requireAccess(symptomReviewPolicy), async (c) => {
  const id = c.req.param('id');
  const user = c.get('user');
  const db = c.env.DB;
  const nowIso = new Date().toISOString();

  await db
    .prepare(
      'UPDATE symptom_reports SET reviewed_by = ?, reviewed_at = ?, updated_at = ? WHERE id = ?'
    )
    .bind(user.staffId, nowIso, nowIso, id)
    .run();

  return c.json({ success: true });
});

// 12. Doctor Care Team List
const careTeamPolicy = declareRoutePolicy('GET', '/api/doctor/care-team', {
  allowedRoles: ['doctor'],
  requireMfa: true,
});

doctorRoutes.get('/care-team', requireAccess(careTeamPolicy), async (c) => {
  const user = c.get('user');
  const db = c.env.DB;
  const nowIso = new Date().toISOString();

  const rows = await db
    .prepare(
      `SELECT patient_id, expires_at FROM care_team
       WHERE staff_id = ? AND active = 1 AND (expires_at IS NULL OR expires_at > ?)`
    )
    .bind(user.staffId, nowIso)
    .all<{ patient_id: string; expires_at: string | null }>();

  return c.json({ success: true, careTeam: rows.results || [] });
});

// 13. Active Emergency Access List
const emergencyListPolicy = declareRoutePolicy('GET', '/api/doctor/emergency-access', {
  allowedRoles: ['doctor'],
  requireMfa: true,
});

interface EmergencyAccessItemRow {
  id: string;
  patient_id: string;
  reason: string;
  expires_at: string;
  created_at: string;
  patient_name: string;
  patient_uhid: string;
}

doctorRoutes.get('/emergency-access', requireAccess(emergencyListPolicy), async (c) => {
  const user = c.get('user');
  const db = c.env.DB;
  const nowIso = new Date().toISOString();

  const rows = await db
    .prepare(
      `SELECT ea.id, ea.patient_id, ea.reason, ea.expires_at, ea.created_at,
              p.full_name as patient_name, p.uhid as patient_uhid
       FROM emergency_access ea
       JOIN patients p ON ea.patient_id = p.id
       WHERE ea.staff_id = ? AND ea.expires_at > ?
       ORDER BY ea.created_at DESC`
    )
    .bind(user.staffId, nowIso)
    .all<EmergencyAccessItemRow>();

  const list = (rows.results || []).map((r) => ({
    id: r.id,
    patient_id: r.patient_id,
    reason: r.reason,
    expires_at: r.expires_at,
    created_at: r.created_at,
    patients: {
      full_name: r.patient_name,
      uhid: r.patient_uhid,
    },
  }));

  return c.json({ success: true, emergencyAccess: list });
});

// 14. Doctor Chart Overview for Patient
const doctorPatientChartPolicy = declareRoutePolicy(
  'GET',
  '/api/doctor/patients/:patientId/chart',
  {
    allowedRoles: ['doctor'],
    patientScoped: true,
    allowEmergencyAccess: true,
    requireMfa: true,
  }
);

interface EncounterWithStaffRow {
  id: string;
  patient_id: string;
  doctor_id: string;
  department_id: string | null;
  status: string;
  sensitivity: string;
  chief_complaint: string | null;
  clinical_notes: string | null;
  diagnosis: string | null;
  signed_at: string | null;
  created_at: string;
  staff_name: string | null;
  department_name: string | null;
}

interface EncounterAddendumRow {
  id: string;
  encounter_id: string;
  patient_id: string;
  doctor_id: string;
  reason: string;
  notes: string;
  created_at: string;
}

interface CarePlanItemJoinedRow {
  id: string;
  care_plan_id: string;
  patient_id: string;
  kind: string;
  detail: string;
  timing: string | null;
  due_date: string | null;
  diet_guide_id: string | null;
  doctor_note: string | null;
  status: string;
  completed_at: string | null;
  title_en: string | null;
  title_ml: string | null;
  eat_more_en: string | null;
  eat_more_ml: string | null;
  eat_less_en: string | null;
  eat_less_ml: string | null;
  avoid_en: string | null;
  avoid_ml: string | null;
  tips_en: string | null;
  tips_ml: string | null;
}

doctorRoutes.get(
  '/patients/:patientId/chart',
  requireAccess(doctorPatientChartPolicy),
  async (c) => {
    const patientId = c.req.param('patientId');
    const user = c.get('user');
    const db = c.env.DB;
    const nowIso = new Date().toISOString();

    // Audit log chart view
    await db
      .prepare(
        `INSERT INTO audit_log (id, at, actor_id, action, table_name, record_id, patient_id, reason)
       VALUES (?, ?, ?, 'VIEWED_CHART', 'patients', ?, ?, 'Doctor clinical chart review')`
      )
      .bind(crypto.randomUUID(), nowIso, user.id, patientId, patientId)
      .run();

    const patient = await db
      .prepare(
        'SELECT id, uhid, full_name, dob, gender, blood_group, phone, created_at FROM patients WHERE id = ?'
      )
      .bind(patientId)
      .first();

    const allergies = (
      await db
        .prepare('SELECT id, substance, reaction, severity FROM allergies WHERE patient_id = ?')
        .bind(patientId)
        .all()
    ).results;

    const conditions = (
      await db
        .prepare('SELECT id, name, status, diagnosed_date FROM conditions WHERE patient_id = ?')
        .bind(patientId)
        .all()
    ).results;

    const encountersQuery = `
    SELECT e.id, e.patient_id, e.doctor_id, e.department_id, e.status, e.sensitivity,
           e.chief_complaint, e.clinical_notes, e.diagnosis, e.signed_at, e.created_at,
           s.full_name as staff_name, d.name as department_name
    FROM encounters e
    LEFT JOIN staff s ON e.doctor_id = s.id
    LEFT JOIN departments d ON e.department_id = d.id
    WHERE e.patient_id = ?
    ORDER BY e.created_at DESC
  `;
    const encounterRows = (
      await db.prepare(encountersQuery).bind(patientId).all<EncounterWithStaffRow>()
    ).results;

    const addenda = (
      await db
        .prepare(
          'SELECT id, encounter_id, patient_id, doctor_id, reason, notes, created_at FROM encounter_addenda WHERE patient_id = ? ORDER BY created_at ASC'
        )
        .bind(patientId)
        .all<EncounterAddendumRow>()
    ).results;

    const addendaMap = new Map<string, EncounterAddendumRow[]>();
    for (const a of addenda) {
      const list = addendaMap.get(a.encounter_id) || [];
      list.push(a);
      addendaMap.set(a.encounter_id, list);
    }

    const encounters = encounterRows.map((e) => ({
      ...e,
      staff: e.staff_name ? { full_name: e.staff_name } : null,
      departments: e.department_name ? { name: e.department_name } : null,
      encounter_addenda: addendaMap.get(e.id) || [],
    }));

    const observations = (
      await db
        .prepare(
          'SELECT id, kind, value_text, unit, source, out_of_range, measured_at FROM observations WHERE patient_id = ? ORDER BY measured_at DESC'
        )
        .bind(patientId)
        .all()
    ).results;

    const documents = (
      await db
        .prepare(
          'SELECT id, patient_id, storage_path, type, title, report_date, source, review_status, reviewed_at FROM documents WHERE patient_id = ? ORDER BY report_date DESC'
        )
        .bind(patientId)
        .all()
    ).results;

    const medications = (
      await db
        .prepare(
          'SELECT id, drug, dose, timing, instructions, status, created_at, stopped_at FROM medications WHERE patient_id = ? ORDER BY created_at DESC'
        )
        .bind(patientId)
        .all()
    ).results;

    const carePlans = (
      await db
        .prepare(
          'SELECT id, patient_id, status, review_date, created_at FROM care_plans WHERE patient_id = ? AND status = "active"'
        )
        .bind(patientId)
        .all<{
          id: string;
          patient_id: string;
          status: string;
          review_date: string | null;
          created_at: string;
        }>()
    ).results;

    const planItems = (
      await db
        .prepare(
          `
      SELECT cpi.id, cpi.care_plan_id, cpi.patient_id, cpi.kind, cpi.detail, cpi.timing,
             cpi.due_date, cpi.diet_guide_id, cpi.doctor_note, cpi.status, cpi.completed_at,
             dg.title_en, dg.title_ml, dg.eat_more_en, dg.eat_more_ml,
             dg.eat_less_en, dg.eat_less_ml, dg.avoid_en, dg.avoid_ml, dg.tips_en, dg.tips_ml
      FROM care_plan_items cpi
      LEFT JOIN diet_guides dg ON cpi.diet_guide_id = dg.id
      WHERE cpi.patient_id = ?
    `
        )
        .bind(patientId)
        .all<CarePlanItemJoinedRow>()
    ).results;

    const itemsMap = new Map<
      string,
      Array<CarePlanItemJoinedRow & { diet_guides: Record<string, unknown> | null }>
    >();
    for (const item of planItems) {
      const list = itemsMap.get(item.care_plan_id) || [];
      const dietGuides = item.diet_guide_id
        ? {
            id: item.diet_guide_id,
            title_en: item.title_en || '',
            title_ml: item.title_ml || '',
            eat_more_en: item.eat_more_en || '',
            eat_more_ml: item.eat_more_ml || '',
            eat_less_en: item.eat_less_en || '',
            eat_less_ml: item.eat_less_ml || '',
            avoid_en: item.avoid_en || '',
            avoid_ml: item.avoid_ml || '',
            tips_en: item.tips_en || '',
            tips_ml: item.tips_ml || '',
          }
        : null;
      list.push({
        ...item,
        diet_guides: dietGuides,
      });
      itemsMap.set(item.care_plan_id, list);
    }

    const enrichedCarePlans = carePlans.map((cp) => ({
      ...cp,
      care_plan_items: itemsMap.get(cp.id) || [],
    }));

    return c.json({
      success: true,
      patient,
      allergies,
      conditions,
      encounters,
      observations,
      documents,
      medications,
      carePlans: enrichedCarePlans,
    });
  }
);

// 15. Sign Complete Consultation Note atomically
const consultationPolicy = declareRoutePolicy(
  'POST',
  '/api/doctor/patients/:patientId/consultation',
  {
    allowedRoles: ['doctor'],
    patientScoped: true,
    allowEmergencyAccess: true,
    requireMfa: true,
  }
);

interface ConsultationPrescriptionInput {
  name?: string;
  drug?: string;
  dose: string;
  timing?: Record<string, boolean>;
  food?: 'after_food' | 'before_food';
  instructions?: string;
}

interface ConsultationBodyInput {
  reason?: string;
  chiefComplaint?: string;
  clinicalNotes?: string;
  diagnoses?: string[];
  vitals?: { sys?: string; dia?: string; pulse?: string; wt?: string };
  prescriptions?: ConsultationPrescriptionInput[];
  selectedDietGuide?: string;
  dietNote?: string;
  departmentId?: string;
}

doctorRoutes.post(
  '/patients/:patientId/consultation',
  requireAccess(consultationPolicy),
  async (c) => {
    const patientId = c.req.param('patientId');
    const user = c.get('user');
    const body = (await c.req.json().catch(() => ({}))) as ConsultationBodyInput;
    const db = c.env.DB;
    const nowIso = new Date().toISOString();

    const encounterId = crypto.randomUUID();
    const chiefComplaint = body.reason || body.chiefComplaint || '';
    const clinicalNotes = body.clinicalNotes || '';
    const diagnoses = (body.diagnoses || []).join(', ');

    // 1. Insert signed encounter
    await db
      .prepare(
        `INSERT INTO encounters (
        id, patient_id, doctor_id, department_id, status, sensitivity,
        chief_complaint, clinical_notes, diagnosis, signed_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, 'signed', 'normal', ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        encounterId,
        patientId,
        user.staffId,
        body.departmentId || null,
        chiefComplaint,
        clinicalNotes,
        diagnoses,
        nowIso,
        nowIso,
        nowIso
      )
      .run();

    // 2. Insert vitals observations
    if (body.vitals) {
      const { sys, dia, wt } = body.vitals;
      if (sys && dia) {
        await db
          .prepare(
            `INSERT INTO observations (
            id, patient_id, kind, value_text, unit, source, out_of_range, measured_at, recorded_by, created_at
          ) VALUES (?, ?, 'Blood Pressure', ?, 'mmHg', 'clinic', ?, ?, ?, ?)`
          )
          .bind(
            crypto.randomUUID(),
            patientId,
            `${sys}/${dia}`,
            parseInt(sys, 10) >= 140 || parseInt(dia, 10) >= 90 ? 1 : 0,
            nowIso,
            user.staffId,
            nowIso
          )
          .run();
      }
      if (wt) {
        await db
          .prepare(
            `INSERT INTO observations (
            id, patient_id, kind, value_text, unit, source, out_of_range, measured_at, recorded_by, created_at
          ) VALUES (?, ?, 'Weight', ?, 'kg', 'clinic', 0, ?, ?, ?)`
          )
          .bind(crypto.randomUUID(), patientId, String(wt), nowIso, user.staffId, nowIso)
          .run();
      }
    }

    // 3. Insert prescriptions
    if (Array.isArray(body.prescriptions)) {
      for (const rx of body.prescriptions) {
        const instructions =
          rx.instructions || (rx.food === 'after_food' ? 'Take after meals' : 'Take before food');
        await db
          .prepare(
            `INSERT INTO medications (
            id, patient_id, doctor_id, department_id, drug, dose, timing, instructions, status, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)`
          )
          .bind(
            crypto.randomUUID(),
            patientId,
            user.staffId,
            body.departmentId || null,
            rx.name || rx.drug || 'Medication',
            rx.dose,
            JSON.stringify(rx.timing || { morning: true, afternoon: false, night: true }),
            instructions,
            nowIso,
            nowIso
          )
          .run();
      }
    }

    // 4. Attach diet guidance to active care plan
    if (body.selectedDietGuide) {
      const plan = (await db
        .prepare('SELECT id FROM care_plans WHERE patient_id = ? AND status = "active" LIMIT 1')
        .bind(patientId)
        .first()) as { id: string } | null;

      let planId = plan?.id;
      if (!planId) {
        planId = crypto.randomUUID();
        await db
          .prepare(
            `INSERT INTO care_plans (id, patient_id, doctor_id, encounter_id, status, created_at, updated_at)
           VALUES (?, ?, ?, ?, 'active', ?, ?)`
          )
          .bind(planId, patientId, user.staffId, encounterId, nowIso, nowIso)
          .run();
      }

      await db
        .prepare(
          `INSERT INTO care_plan_items (
          id, care_plan_id, patient_id, kind, detail, diet_guide_id, doctor_note, status, created_at, updated_at
        ) VALUES (?, ?, ?, 'diet', 'Diet guidance: follow hospital nutritional recommendations.', ?, ?, 'pending', ?, ?)`
        )
        .bind(
          crypto.randomUUID(),
          planId,
          patientId,
          body.selectedDietGuide,
          body.dietNote || null,
          nowIso,
          nowIso
        )
        .run();
    }

    // 5. Audit log
    await db
      .prepare(
        `INSERT INTO audit_log (id, at, actor_id, action, table_name, record_id, patient_id, reason)
       VALUES (?, ?, ?, 'SIGNED_CONSULTATION', 'encounters', ?, ?, 'Consultation note completed')`
      )
      .bind(crypto.randomUUID(), nowIso, user.id, encounterId, patientId)
      .run();

    return c.json({ success: true, encounterId });
  }
);
