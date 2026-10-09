/**
 * CareOne Doctor Portal API Routes
 * Mounts under /api/doctor
 */

import { Hono } from 'hono';
import type { WorkerEnv } from '../env';
import {
  type AccessVariables,
  declareRoutePolicy,
  requireAccess,
} from '../middleware/access';

export const doctorRoutes = new Hono<{
  Bindings: WorkerEnv;
  Variables: AccessVariables;
}>();

// 1. Today's Appointments & Review Queue Summary
const todayPolicy = declareRoutePolicy('GET', '/api/doctor/today', {
  allowedRoles: ['doctor'],
  requireMfa: true,
});

doctorRoutes.get('/today', requireAccess(todayPolicy), async c => {
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
    .prepare(
      `SELECT COUNT(*) as count FROM documents WHERE review_status = 'pending'`
    )
    .first()) as { count: number } | null;

  const pendingSymptoms = (await db
    .prepare(
      `SELECT COUNT(*) as count FROM symptom_reports WHERE reviewed_by IS NULL`
    )
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

doctorRoutes.get('/patients', requireAccess(patientsSearchPolicy), async c => {
  const q = (c.req.query('q') || '').trim();
  const db = c.env.DB;

  let query = 'SELECT id, uhid, mrn, full_name, dob, gender, blood_group, phone FROM patients WHERE deleted_at IS NULL';
  const params: string[] = [];

  if (q) {
    query += ' AND (full_name LIKE ? OR uhid LIKE ? OR phone LIKE ?)';
    params.push(`%${q}%`, `%${q}%`, `%${q}%`);
  }
  query += ' ORDER BY full_name ASC LIMIT 50';

  const stmt = db.prepare(query);
  const result = (await (params.length > 0 ? stmt.bind(...params) : stmt).all()) as { results: unknown[] };

  return c.json({ patients: result.results });
});

// 3. What Changed Delta Query
const whatChangedPolicy = declareRoutePolicy('GET', '/api/doctor/patients/:patientId/what-changed', {
  allowedRoles: ['doctor'],
  patientScoped: true,
  allowEmergencyAccess: true,
  requireMfa: true,
});

doctorRoutes.get(
  '/patients/:patientId/what-changed',
  requireAccess(whatChangedPolicy),
  async c => {
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
        patientId, lastVisitDate,
        patientId, lastVisitDate,
        patientId, lastVisitDate,
        patientId, lastVisitDate
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
const createEncounterPolicy = declareRoutePolicy('POST', '/api/doctor/patients/:patientId/encounters', {
  allowedRoles: ['doctor'],
  patientScoped: true,
  allowEmergencyAccess: true,
  requireMfa: true,
});

doctorRoutes.post(
  '/patients/:patientId/encounters',
  requireAccess(createEncounterPolicy),
  async c => {
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
  async c => {
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

doctorRoutes.put(
  '/encounters/:encounterId',
  requireAccess(editEncounterPolicy),
  async c => {
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
  }
);

// 7. Addendum to Signed Encounter Note
const addendumPolicy = declareRoutePolicy('POST', '/api/doctor/encounters/:encounterId/addenda', {
  allowedRoles: ['doctor'],
  requireMfa: true,
});

doctorRoutes.post(
  '/encounters/:encounterId/addenda',
  requireAccess(addendumPolicy),
  async c => {
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
  }
);

// 8. Prescribe Medication
const prescribePolicy = declareRoutePolicy('POST', '/api/doctor/patients/:patientId/prescriptions', {
  allowedRoles: ['doctor'],
  patientScoped: true,
  allowEmergencyAccess: true,
  requireMfa: true,
});

doctorRoutes.post(
  '/patients/:patientId/prescriptions',
  requireAccess(prescribePolicy),
  async c => {
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

    const record = await db
      .prepare('SELECT * FROM medications WHERE id = ?')
      .bind(medId)
      .first();

    return c.json({ success: true, medication: record });
  }
);

// 9. Break-Glass Emergency Access Grant
const emergencyPolicy = declareRoutePolicy('POST', '/api/doctor/emergency-access', {
  allowedRoles: ['doctor'],
  requireMfa: true,
});

doctorRoutes.post(
  '/emergency-access',
  requireAccess(emergencyPolicy),
  async c => {
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
  }
);
