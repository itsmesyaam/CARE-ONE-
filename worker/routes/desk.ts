import { Hono } from 'hono';
import type { WorkerEnv } from '../env';
import { withPolicy } from '../auth/policy';
import { sendEmail } from '../services/email';
import { hashToken } from './passkey';

export const deskRouter = new Hono<{ Bindings: WorkerEnv }>();

// GET /api/desk/patients?search=
deskRouter.get(
  '/patients',
  withPolicy({ allowedRoles: ['front_desk', 'admin'], requireAal2: true }, async (c) => {
    const search = c.req.query('search')?.trim() || '';

    let sql = `SELECT id, uhid, full_name, dob, gender, blood_group, phone, email, created_at
               FROM patients
               WHERE deleted_at IS NULL`;
    const params: string[] = [];

    if (search) {
      sql += ` AND (full_name LIKE ? OR phone LIKE ? OR uhid LIKE ?)`;
      const term = `%${search}%`;
      params.push(term, term, term);
    }

    sql += ` ORDER BY full_name ASC LIMIT 50`;

    const result = await c.env.DB.prepare(sql).bind(...params).all();
    return c.json({ patients: result.results || [] });
  })
);

// POST /api/desk/patients (Register new patient)
deskRouter.post(
  '/patients',
  withPolicy({ allowedRoles: ['front_desk', 'admin'], requireAal2: true }, async (c, principal) => {
    const body = await c.req.json<{
      full_name: string;
      dob: string;
      gender: 'male' | 'female' | 'other';
      phone: string;
      blood_group?: string;
      email?: string;
    }>();

    if (!body.full_name || !body.dob || !body.gender || !body.phone) {
      return c.json({ error: 'Missing required patient demographics' }, 400);
    }

    const patientId = crypto.randomUUID();
    const randNum = Math.floor(1000 + Math.random() * 9000);
    const uhid = `ABC-${randNum}`;
    const reqId = crypto.randomUUID();

    await c.env.DB.batch([
      c.env.DB.prepare(
        'INSERT OR REPLACE INTO _request_ctx (id, actor_id, role, request_id) VALUES (1, ?, ?, ?)'
      ).bind(principal.id, principal.role, reqId),
      c.env.DB.prepare(
        `INSERT INTO patients (id, uhid, full_name, dob, gender, blood_group, phone, email, id_checked, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, datetime('now'))`
      ).bind(
        patientId,
        uhid,
        body.full_name.trim(),
        body.dob,
        body.gender,
        body.blood_group || null,
        body.phone.trim(),
        body.email?.trim() || null
      ),
      c.env.DB.prepare('DELETE FROM _request_ctx WHERE id = 1'),
    ]);

    return c.json(
      {
        ok: true,
        patient: {
          id: patientId,
          uhid,
          full_name: body.full_name.trim(),
          dob: body.dob,
          gender: body.gender,
          phone: body.phone.trim(),
        },
      },
      201
    );
  })
);

// POST /api/desk/appointments (Book appointment & create 1-year care team link)
deskRouter.post(
  '/appointments',
  withPolicy({ allowedRoles: ['front_desk', 'admin'], requireAal2: true }, async (c, principal) => {
    const body = await c.req.json<{
      patient_id: string;
      doctor_id: string;
      department_id?: string;
      appointment_date: string;
      notes?: string;
    }>();

    if (!body.patient_id || !body.doctor_id || !body.appointment_date) {
      return c.json({ error: 'patient_id, doctor_id, and appointment_date are required' }, 400);
    }

    const apptId = crypto.randomUUID();
    const careTeamId = crypto.randomUUID();
    const reqId = crypto.randomUUID();

    // Verify patient exists
    const patient = await c.env.DB.prepare('SELECT id FROM patients WHERE id = ? AND deleted_at IS NULL')
      .bind(body.patient_id)
      .first();

    if (!patient) {
      return c.json({ error: 'Patient not found' }, 404);
    }

    // Verify doctor exists
    const doctor = await c.env.DB.prepare('SELECT id, department_id FROM staff WHERE id = ? AND deleted_at IS NULL')
      .bind(body.doctor_id)
      .first<{ id: string; department_id: string | null }>();

    if (!doctor) {
      return c.json({ error: 'Doctor not found' }, 404);
    }

    const deptId = body.department_id || doctor.department_id;

    await c.env.DB.batch([
      c.env.DB.prepare(
        'INSERT OR REPLACE INTO _request_ctx (id, actor_id, role, request_id) VALUES (1, ?, ?, ?)'
      ).bind(principal.id, principal.role, reqId),
      // 1. Insert appointment
      c.env.DB.prepare(
        `INSERT INTO appointments (id, patient_id, doctor_id, department_id, appointment_date, status, notes)
         VALUES (?, ?, ?, ?, ?, 'booked', ?)`
      ).bind(apptId, body.patient_id, body.doctor_id, deptId, body.appointment_date, body.notes || null),
      // 2. Automatically establish 1-year care team link
      c.env.DB.prepare(
        `INSERT INTO care_team (id, patient_id, staff_id, reason, expires_at)
         VALUES (?, ?, ?, 'appointment', datetime('now', '+1 year'))`
      ).bind(careTeamId, body.patient_id, body.doctor_id),
      c.env.DB.prepare('DELETE FROM _request_ctx WHERE id = 1'),
    ]);

    return c.json({ ok: true, appointment_id: apptId, care_team_id: careTeamId }, 201);
  })
);

// POST /api/desk/patients/:id/invite (Invite patient/guardian to mobile/web app)
deskRouter.post(
  '/patients/:id/invite',
  withPolicy({ allowedRoles: ['front_desk', 'admin'], requireAal2: true }, async (c, principal) => {
    const patientId = c.req.param('id');
    const body = await c.req.json<{
      email: string;
      relationship?: 'self' | 'guardian' | 'caregiver';
    }>();

    if (!body.email || !body.email.includes('@')) {
      return c.json({ error: 'Valid email is required' }, 400);
    }

    const patient = await c.env.DB.prepare('SELECT id, full_name FROM patients WHERE id = ? AND deleted_at IS NULL')
      .bind(patientId)
      .first<{ id: string; full_name: string }>();

    if (!patient) {
      return c.json({ error: 'Patient not found' }, 404);
    }

    const accessId = crypto.randomUUID();
    const userId = crypto.randomUUID();
    const reqId = crypto.randomUUID();

    await c.env.DB.batch([
      c.env.DB.prepare(
        'INSERT OR REPLACE INTO _request_ctx (id, actor_id, role, request_id) VALUES (1, ?, ?, ?)'
      ).bind(principal.id, principal.role, reqId),
      c.env.DB.prepare(
        `INSERT OR REPLACE INTO patient_access (id, patient_id, user_id, relationship, created_at)
         VALUES (?, ?, ?, ?, datetime('now'))`
      ).bind(accessId, patientId, userId, body.relationship || 'self'),
      c.env.DB.prepare('DELETE FROM _request_ctx WHERE id = 1'),
    ]);

    // Send invite email via Resend
    await sendEmail(
      c.env,
      {
        to: body.email.trim(),
        subject: 'Welcome to CareOne Hospital Portal',
      },
      false
    );

    return c.json({ ok: true, access_id: accessId, user_id: userId });
  })
);

// POST /api/desk/patients/:id/setup-link (Generate 30m onboarding passkey setup token)
deskRouter.post(
  '/patients/:id/setup-link',
  withPolicy({ allowedRoles: ['front_desk', 'admin'], requireAal2: true }, async (c, principal) => {
    const patientId = c.req.param('id');
    const patient = await c.env.DB.prepare(
      'SELECT id, full_name, uhid FROM patients WHERE id = ? AND deleted_at IS NULL'
    )
      .bind(patientId)
      .first<{ id: string; full_name: string; uhid: string }>();

    if (!patient) {
      return c.json({ error: 'Patient not found' }, 404);
    }

    // Generate random 32-byte crypto token (hex string of 64 chars)
    const rawBytes = new Uint8Array(32);
    crypto.getRandomValues(rawBytes);
    const token = Array.from(rawBytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    const tokenHash = await hashToken(token);
    const tokenId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 minutes

    await c.env.DB.batch([
      c.env.DB.prepare(
        `INSERT INTO setup_tokens (id, user_id, token_hash, purpose, created_by, expires_at)
         VALUES (?, ?, ?, 'patient_setup', ?, ?)`
      ).bind(tokenId, patientId, tokenHash, principal.id, expiresAt),
      c.env.DB.prepare(
        `INSERT INTO audit_log (at, actor_id, action, table_name, record_id, patient_id)
         VALUES (datetime('now'), ?, 'SETUP_LINK_CREATED', 'setup_tokens', ?, ?)`
      ).bind(principal.id, tokenId, patientId),
    ]);

    return c.json(
      {
        ok: true,
        token,
        setup_url: `/setup?token=${token}`,
        expires_at: expiresAt,
        patient: {
          id: patient.id,
          full_name: patient.full_name,
          uhid: patient.uhid,
        },
      },
      201
    );
  })
);

// POST /api/desk/patients/:id/revoke-passkeys (Revoke all active passkeys for patient)
deskRouter.post(
  '/patients/:id/revoke-passkeys',
  withPolicy({ allowedRoles: ['front_desk', 'admin'], requireAal2: true }, async (c, principal) => {
    const patientId = c.req.param('id');
    await c.env.DB.batch([
      c.env.DB.prepare(
        `UPDATE passkeys SET revoked_at = datetime('now') WHERE user_id = ? AND revoked_at IS NULL`
      ).bind(patientId),
      c.env.DB.prepare(
        `INSERT INTO audit_log (at, actor_id, action, table_name, patient_id)
         VALUES (datetime('now'), ?, 'PASSKEY_REVOKED', 'passkeys', ?)`
      ).bind(principal.id, patientId),
    ]);

    return c.json({ ok: true, message: 'All active passkeys for patient have been revoked' });
  })
);

