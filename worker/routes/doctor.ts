import { Hono } from 'hono';
import type { WorkerEnv } from '../env';
import { withPolicy, canDoctorAccessPatient } from '../auth/policy';

export const doctorRouter = new Hono<{ Bindings: WorkerEnv }>();

// GET /api/doctor/today
doctorRouter.get(
  '/today',
  withPolicy({ allowedRoles: ['doctor'], requireAal2: true, isClinical: true }, async (c, principal) => {
    const [appointments, pendingReports, pendingSymptoms, doctorRow] = await Promise.all([
      c.env.DB.prepare(
        `SELECT a.id, a.patient_id, a.doctor_id, a.appointment_date, a.status, a.notes,
                p.id as p_id, p.uhid as p_uhid, p.full_name as p_full_name, p.dob as p_dob,
                p.gender as p_gender, p.phone as p_phone
         FROM appointments a
         JOIN patients p ON a.patient_id = p.id
         WHERE a.doctor_id = ? AND a.status != 'cancelled'
         ORDER BY a.appointment_date ASC`
      )
        .bind(principal.id)
        .all(),
      c.env.DB.prepare(
        "SELECT COUNT(*) as c FROM documents WHERE review_status = 'pending'"
      ).first<{ c: number }>(),
      c.env.DB.prepare(
        'SELECT COUNT(*) as c FROM symptom_reports WHERE reviewed_at IS NULL'
      ).first<{ c: number }>(),
      c.env.DB.prepare(
        `SELECT s.id, s.full_name, s.email, d.name as department_name
         FROM staff s
         LEFT JOIN departments d ON s.department_id = d.id
         WHERE s.id = ?`
      )
        .bind(principal.id)
        .first<{ id: string; full_name: string; email: string; department_name: string | null }>(),
    ]);

    const patientIds = Array.from(
      new Set((appointments.results || []).map((row) => row.patient_id as string))
    );

    const allergiesByPatient: Record<
      string,
      Array<{ substance: string; reaction: string; severity: string }>
    > = {};

    if (patientIds.length > 0) {
      const placeholders = patientIds.map(() => '?').join(',');
      const allergyRows = await c.env.DB.prepare(
        `SELECT patient_id, substance, reaction, severity FROM allergies WHERE patient_id IN (${placeholders})`
      )
        .bind(...patientIds)
        .all<{ patient_id: string; substance: string; reaction: string; severity: string }>();

      for (const a of allergyRows.results || []) {
        if (!allergiesByPatient[a.patient_id]) {
          allergiesByPatient[a.patient_id] = [];
        }
        allergiesByPatient[a.patient_id]!.push({
          substance: a.substance,
          reaction: a.reaction,
          severity: a.severity,
        });
      }
    }

    const formattedAppts = (appointments.results || []).map((row: Record<string, unknown>) => {
      const pid = row.patient_id as string;
      return {
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
          allergies: allergiesByPatient[pid] || [],
        },
      };
    });

    return c.json({
      doctor: {
        id: doctorRow?.id || principal.id,
        name: doctorRow?.full_name || 'Dr. Rahul Menon',
        email: doctorRow?.email || '',
        dept: doctorRow?.department_name || 'General Medicine',
      },
      appointments: formattedAppts,
      pendingReportsCount: pendingReports?.c || 0,
      pendingSymptomsCount: pendingSymptoms?.c || 0,
    });
  })
);

// GET /api/doctor/patients
doctorRouter.get(
  '/patients',
  withPolicy({ allowedRoles: ['doctor'], requireAal2: true, isClinical: true }, async (c, principal) => {
    const [patients, careTeamRows, emergencyRows, conditions, pendingDocs, pendingSymptoms, encounters, appointments] =
      await Promise.all([
        c.env.DB.prepare(
          'SELECT id, uhid, full_name, dob, gender, blood_group, phone, created_at FROM patients WHERE deleted_at IS NULL ORDER BY full_name'
        ).all(),
        c.env.DB.prepare(
          `SELECT patient_id, expires_at FROM care_team WHERE staff_id = ? AND revoked_at IS NULL`
        )
          .bind(principal.id)
          .all(),
        c.env.DB.prepare(
          `SELECT patient_id, expires_at, reason FROM emergency_access WHERE staff_id = ? AND expires_at > datetime('now')`
        )
          .bind(principal.id)
          .all(),
        c.env.DB.prepare("SELECT patient_id, name, status FROM conditions WHERE status = 'active'").all(),
        c.env.DB.prepare("SELECT patient_id FROM documents WHERE review_status = 'pending'").all(),
        c.env.DB.prepare('SELECT patient_id FROM symptom_reports WHERE reviewed_at IS NULL').all(),
        c.env.DB.prepare("SELECT patient_id, signed_at FROM encounters WHERE status = 'signed'").all(),
        c.env.DB.prepare(
          `SELECT patient_id, appointment_date FROM appointments WHERE appointment_date >= datetime('now') AND status != 'cancelled' ORDER BY appointment_date ASC`
        ).all(),
      ]);

    return c.json({
      patients: patients.results || [],
      careTeam: careTeamRows.results || [],
      emergencyAccesses: emergencyRows.results || [],
      conditions: conditions.results || [],
      pendingDocs: pendingDocs.results || [],
      pendingSymptoms: pendingSymptoms.results || [],
      encounters: encounters.results || [],
      appointments: appointments.results || [],
    });
  })
);

// GET /api/doctor/patients/:id/chart
doctorRouter.get(
  '/patients/:id/chart',
  withPolicy({ allowedRoles: ['doctor'], requireAal2: true, isClinical: true }, async (c, principal) => {
    const patientId = c.req.param('id') || '';
    const allowed = await canDoctorAccessPatient(c.env.DB, principal.id, patientId);

    // AGENTS.md: Unlinked doctor receives 404 (not 403) to prevent existence probing
    if (!allowed) {
      return c.json({ error: 'Patient not found' }, 404);
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
      activeEmergency,
    ] = await Promise.all([
      c.env.DB.prepare('SELECT * FROM patients WHERE id = ? AND deleted_at IS NULL').bind(patientId).first(),
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
      c.env.DB.prepare(
        "SELECT * FROM emergency_access WHERE patient_id = ? AND staff_id = ? AND expires_at > datetime('now') ORDER BY expires_at DESC LIMIT 1"
      ).bind(patientId, principal.id).first(),
    ]);

    if (!patient) {
      return c.json({ error: 'Patient not found' }, 404);
    }

    // Filter restricted notes: restricted notes visible ONLY to the same department
    const addendaList = (addenda.results || []) as Array<{ encounter_id: string }>;
    const filteredEncounters = (encounters.results || []).filter((enc: Record<string, unknown>) => {
      if (enc.sensitivity === 'restricted') {
        return Boolean(principal.departmentId && enc.department_id === principal.departmentId);
      }
      return true;
    });

    const encounterList = filteredEncounters.map((enc: Record<string, unknown>) => ({
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
      activeEmergency: (activeEmergency as Record<string, unknown>) || null,
    });
  })
);

// POST /api/doctor/patients/:id/emergency-access (Break-glass 4h)
doctorRouter.post(
  '/patients/:id/emergency-access',
  withPolicy({ allowedRoles: ['doctor'], requireAal2: true, isClinical: true }, async (c, principal) => {
    const patientId = c.req.param('id');
    const body = (await c.req.json()) as { reason: string };

    if (!body.reason || body.reason.trim().length < 15) {
      return c.json(
        { error: 'A written emergency reason of at least 15 characters is required' },
        400
      );
    }

    const patient = await c.env.DB.prepare('SELECT id FROM patients WHERE id = ? AND deleted_at IS NULL')
      .bind(patientId)
      .first();

    if (!patient) {
      return c.json({ error: 'Patient not found' }, 404);
    }

    const accessId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString();

    await c.env.DB.batch([
      c.env.DB.prepare(
        `INSERT INTO emergency_access (id, patient_id, staff_id, reason, expires_at)
         VALUES (?, ?, ?, ?, ?)`
      ).bind(accessId, patientId, principal.id, body.reason.trim(), expiresAt),
      c.env.DB.prepare(
        `INSERT INTO audit_log (at, actor_id, action, table_name, record_id, patient_id, reason)
         VALUES (datetime('now'), ?, 'EMERGENCY_ACCESS', 'emergency_access', ?, ?, ?)`
      ).bind(principal.id, accessId, patientId, body.reason.trim()),
    ]);

    return c.json({ ok: true, access_id: accessId, expires_at: expiresAt });
  })
);

// GET /api/doctor/patients/:id/what-changed
doctorRouter.get(
  '/patients/:id/what-changed',
  withPolicy({ allowedRoles: ['doctor'], requireAal2: true, isClinical: true }, async (c, principal) => {
    const patientId = c.req.param('id') || '';
    const allowed = await canDoctorAccessPatient(c.env.DB, principal.id, patientId);
    if (!allowed) {
      return c.json({ error: 'Patient not found' }, 404);
    }

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
  })
);

// Handler for consultation note signing
const signEncounterHandler = withPolicy(
  { allowedRoles: ['doctor'], requireAal2: true, isClinical: true },
  async (c, principal) => {
    const body = (await c.req.json()) as {
      patient_id: string;
      chief_complaint?: string;
      clinical_notes?: string;
      examination?: string;
      diagnosis?: string;
      department_id?: string;
      prescriptions?: Array<{ name: string; dose: string; timing: Record<string, boolean>; food: string }>;
      vitals?: { sys?: string; dia?: string; pulse?: string; wt?: string };
      diet_guide_id?: string;
      diet_note?: string;
    };

    if (!body.patient_id) {
      return c.json({ error: 'patient_id is required' }, 400);
    }

    const allowed = await canDoctorAccessPatient(c.env.DB, principal.id, body.patient_id);
    if (!allowed) {
      return c.json({ error: 'Patient not found' }, 404);
    }

    const encounterId = crypto.randomUUID();
    const reqId = crypto.randomUUID();
    const deptId = body.department_id || principal.departmentId;

    const statements = [
      c.env.DB.prepare(
        'INSERT OR REPLACE INTO _request_ctx (id, actor_id, role, request_id) VALUES (1, ?, ?, ?)'
      ).bind(principal.id, principal.role, reqId),
      // 1. Insert signed encounter (immutable)
      c.env.DB.prepare(
        `INSERT INTO encounters (
          id, patient_id, doctor_id, department_id, status, sensitivity,
          chief_complaint, clinical_notes, examination, diagnosis, signed_at
        ) VALUES (?, ?, ?, ?, 'signed', 'normal', ?, ?, ?, ?, datetime('now'))`
      ).bind(
        encounterId,
        body.patient_id,
        principal.id,
        deptId || null,
        body.chief_complaint || null,
        body.clinical_notes || null,
        body.examination || null,
        body.diagnosis || null
      ),
    ];

    // 2. Prescriptions
    if (Array.isArray(body.prescriptions)) {
      for (const rx of body.prescriptions) {
        statements.push(
          c.env.DB.prepare(
            `INSERT INTO medications (id, patient_id, doctor_id, department_id, drug, dose, timing, instructions, status, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', datetime('now'))`
          ).bind(
            crypto.randomUUID(),
            body.patient_id,
            principal.id,
            deptId || null,
            rx.name,
            rx.dose,
            JSON.stringify(rx.timing),
            rx.food === 'after_food' ? 'Take after meals' : 'Take before food'
          )
        );
      }
    }

    // 3. Vitals
    if (body.vitals?.sys && body.vitals?.dia) {
      const outOfRange = parseInt(body.vitals.sys, 10) >= 140 || parseInt(body.vitals.dia, 10) >= 90;
      statements.push(
        c.env.DB.prepare(
          `INSERT INTO observations (id, patient_id, kind, value_text, unit, source, out_of_range, measured_at, recorded_by)
           VALUES (?, ?, 'Blood Pressure', ?, 'mmHg', 'clinic', ?, datetime('now'), ?)`
        ).bind(
          crypto.randomUUID(),
          body.patient_id,
          `${body.vitals.sys}/${body.vitals.dia}`,
          outOfRange ? 1 : 0,
          principal.id
        )
      );
    }

    // 4. Care plan item (Diet guidance)
    if (body.diet_guide_id) {
      const planRow = await c.env.DB.prepare(
        "SELECT id FROM care_plans WHERE patient_id = ? AND status = 'active' ORDER BY created_at DESC LIMIT 1"
      )
        .bind(body.patient_id)
        .first<{ id: string }>();

      let planId = planRow?.id;
      if (!planId) {
        planId = crypto.randomUUID();
        statements.push(
          c.env.DB.prepare(
            `INSERT INTO care_plans (id, patient_id, doctor_id, title, status)
             VALUES (?, ?, ?, 'Comprehensive Chronic Care Plan', 'active')`
          ).bind(planId, body.patient_id, principal.id)
        );
      }

      statements.push(
        c.env.DB.prepare(
          `INSERT INTO care_plan_items (id, care_plan_id, patient_id, kind, detail, diet_guide_id, doctor_note, status)
           VALUES (?, ?, ?, 'diet', 'Diet guidance: follow hospital nutritional recommendations.', ?, ?, 'pending')`
        ).bind(
          crypto.randomUUID(),
          planId,
          body.patient_id,
          body.diet_guide_id,
          body.diet_note || null
        )
      );
    }

    statements.push(c.env.DB.prepare('DELETE FROM _request_ctx WHERE id = 1'));

    await c.env.DB.batch(statements);

    return c.json({ ok: true, encounter_id: encounterId }, 200);
  }
);

doctorRouter.post('/encounters', signEncounterHandler);
doctorRouter.post('/encounters/sign', signEncounterHandler);

// POST /api/doctor/encounters/:id/addendum (Addendum to signed note)
doctorRouter.post(
  '/encounters/:id/addendum',
  withPolicy({ allowedRoles: ['doctor'], requireAal2: true, isClinical: true }, async (c, principal) => {
    const encounterId = c.req.param('id');
    const body = (await c.req.json()) as {
      patient_id: string;
      reason: string;
      notes: string;
    };

    if (!body.patient_id || !body.notes) {
      return c.json({ error: 'patient_id and notes are required' }, 400);
    }

    const allowed = await canDoctorAccessPatient(c.env.DB, principal.id, body.patient_id);
    if (!allowed) {
      return c.json({ error: 'Patient not found' }, 404);
    }

    const addendumId = crypto.randomUUID();
    const reqId = crypto.randomUUID();

    await c.env.DB.batch([
      c.env.DB.prepare(
        'INSERT OR REPLACE INTO _request_ctx (id, actor_id, role, request_id) VALUES (1, ?, ?, ?)'
      ).bind(principal.id, principal.role, reqId),
      c.env.DB.prepare(
        `INSERT INTO encounter_addenda (id, encounter_id, patient_id, doctor_id, reason, notes)
         VALUES (?, ?, ?, ?, ?, ?)`
      ).bind(addendumId, encounterId, body.patient_id, principal.id, body.reason, body.notes),
      c.env.DB.prepare('DELETE FROM _request_ctx WHERE id = 1'),
    ]);

    return c.json({ ok: true, addendum_id: addendumId }, 201);
  })
);

// GET /api/doctor/review
doctorRouter.get(
  '/review',
  withPolicy({ allowedRoles: ['doctor'], requireAal2: true, isClinical: true }, async (c) => {
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
  })
);

// POST /api/doctor/documents/:id/review
doctorRouter.post(
  '/documents/:id/review',
  withPolicy({ allowedRoles: ['doctor'], requireAal2: true, isClinical: true }, async (c, principal) => {
    const docId = c.req.param('id');
    const reqId = crypto.randomUUID();

    await c.env.DB.batch([
      c.env.DB.prepare(
        'INSERT OR REPLACE INTO _request_ctx (id, actor_id, role, request_id) VALUES (1, ?, ?, ?)'
      ).bind(principal.id, principal.role, reqId),
      c.env.DB.prepare(
        `UPDATE documents SET review_status = 'reviewed', reviewed_by = ?, reviewed_at = datetime('now') WHERE id = ?`
      ).bind(principal.id, docId),
      c.env.DB.prepare('DELETE FROM _request_ctx WHERE id = 1'),
    ]);

    return c.json({ ok: true, id: docId });
  })
);

// POST /api/doctor/symptoms/:id/review
doctorRouter.post(
  '/symptoms/:id/review',
  withPolicy({ allowedRoles: ['doctor'], requireAal2: true, isClinical: true }, async (c, principal) => {
    const symptomId = c.req.param('id');
    const reqId = crypto.randomUUID();

    await c.env.DB.batch([
      c.env.DB.prepare(
        'INSERT OR REPLACE INTO _request_ctx (id, actor_id, role, request_id) VALUES (1, ?, ?, ?)'
      ).bind(principal.id, principal.role, reqId),
      c.env.DB.prepare(
        `UPDATE symptom_reports SET reviewed_by = ?, reviewed_at = datetime('now') WHERE id = ?`
      ).bind(principal.id, symptomId),
      c.env.DB.prepare('DELETE FROM _request_ctx WHERE id = 1'),
    ]);

    return c.json({ ok: true, id: symptomId });
  })
);

// GET /api/doctor/account
doctorRouter.get(
  '/account',
  withPolicy({ allowedRoles: ['doctor'], requireAal2: true, isClinical: true }, async (c, principal) => {
    const [careTeamCount, emergencyLogs] = await Promise.all([
      c.env.DB.prepare(
        'SELECT COUNT(*) as c FROM care_team WHERE staff_id = ? AND revoked_at IS NULL'
      )
        .bind(principal.id)
        .first<{ c: number }>(),
      c.env.DB.prepare(
        `SELECT ea.id, ea.reason, ea.expires_at, ea.created_at,
                p.full_name as p_full_name, p.uhid as p_uhid
         FROM emergency_access ea
         LEFT JOIN patients p ON ea.patient_id = p.id
         WHERE ea.staff_id = ?
         ORDER BY ea.created_at DESC`
      )
        .bind(principal.id)
        .all(),
    ]);

    const formattedLogs = (emergencyLogs.results || []).map((row: Record<string, unknown>) => ({
      id: row.id,
      reason: row.reason,
      expires_at: row.expires_at,
      created_at: row.created_at,
      patients: row.p_full_name
        ? {
            full_name: row.p_full_name,
            uhid: row.p_uhid,
          }
        : null,
    }));

    return c.json({
      careTeamCount: careTeamCount?.c || 0,
      emergencyLogs: formattedLogs,
    });
  })
);
