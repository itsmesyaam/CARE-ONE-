/**
 * CareOne Front Desk API Routes
 * Mounts under /api/desk
 */

import { Hono } from 'hono';
import type { WorkerEnv } from '../env';
import { type AccessVariables, declareRoutePolicy, requireAccess } from '../middleware/access';

export const deskRoutes = new Hono<{
  Bindings: WorkerEnv;
  Variables: AccessVariables;
}>();

// 1. Search Patients
const deskPatientsSearchPolicy = declareRoutePolicy('GET', '/api/desk/patients', {
  allowedRoles: ['front_desk', 'admin'],
  requireMfa: true,
});

deskRoutes.get('/patients', requireAccess(deskPatientsSearchPolicy), async (c) => {
  const q = (c.req.query('q') || '').trim();
  const db = c.env.DB;

  let query =
    'SELECT id, uhid, mrn, full_name, dob, gender, phone, email, id_checked, created_at FROM patients WHERE deleted_at IS NULL';
  const params: string[] = [];

  if (q) {
    query += ' AND (full_name LIKE ? OR uhid LIKE ? OR phone LIKE ?)';
    params.push(`%${q}%`, `%${q}%`, `%${q}%`);
  }
  query += ' ORDER BY full_name ASC LIMIT 50';

  const stmt = db.prepare(query);
  const results = (await (params.length > 0 ? stmt.bind(...params) : stmt).all()) as {
    results: unknown[];
  };

  return c.json({ patients: results.results });
});

// 2. Register Patient
const registerPatientPolicy = declareRoutePolicy('POST', '/api/desk/patients', {
  allowedRoles: ['front_desk', 'admin'],
  requireMfa: true,
});

deskRoutes.post('/patients', requireAccess(registerPatientPolicy), async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as {
    fullName?: string;
    dob?: string;
    gender?: 'male' | 'female' | 'other';
    bloodGroup?: string;
    phone?: string;
    email?: string;
    idChecked?: boolean;
  };

  if (!body.fullName || !body.gender) {
    return c.json({ error: 'Full name and gender are required' }, 400);
  }

  const db = c.env.DB;
  const patientId = crypto.randomUUID();
  const nowIso = new Date().toISOString();

  // Generate sequence UHID ABC-XXXX
  const lastPatient = (await db
    .prepare("SELECT uhid FROM patients WHERE uhid LIKE 'ABC-%' ORDER BY uhid DESC LIMIT 1")
    .first()) as { uhid: string } | null;

  let seq = 1001;
  if (lastPatient && lastPatient.uhid) {
    const match = lastPatient.uhid.match(/ABC-(\d+)/);
    if (match && match[1]) {
      seq = parseInt(match[1], 10) + 1;
    }
  }
  const uhid = `ABC-${seq}`;

  await db
    .prepare(
      `INSERT INTO patients (
        id, uhid, mrn, full_name, dob, date_of_birth, gender, blood_group, phone, email, id_checked, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      patientId,
      uhid,
      uhid,
      body.fullName.trim(),
      body.dob || null,
      body.dob || null,
      body.gender,
      body.bloodGroup || null,
      body.phone || null,
      body.email ? body.email.trim().toLowerCase() : null,
      body.idChecked ? 1 : 0,
      nowIso
    )
    .run();

  const record = await db.prepare('SELECT * FROM patients WHERE id = ?').bind(patientId).first();

  return c.json({ success: true, patient: record });
});

// 3. Book Appointment (Triggers 1-Year Care Team Link)
const bookAppointmentPolicy = declareRoutePolicy('POST', '/api/desk/appointments', {
  allowedRoles: ['front_desk', 'admin'],
  requireMfa: true,
});

deskRoutes.post('/appointments', requireAccess(bookAppointmentPolicy), async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as {
    patientId?: string;
    doctorId?: string;
    departmentId?: string;
    appointmentDate?: string;
    startTime?: string;
    endTime?: string;
    notes?: string;
  };

  if (!body.patientId || !body.doctorId) {
    return c.json({ error: 'Patient ID and Doctor ID are required' }, 400);
  }

  const db = c.env.DB;
  const apptId = crypto.randomUUID();
  const nowIso = new Date().toISOString();

  await db
    .prepare(
      `INSERT INTO appointments (
        id, patient_id, doctor_id, department_id, appointment_date, start_time, end_time, status, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'booked', ?, ?, ?)`
    )
    .bind(
      apptId,
      body.patientId,
      body.doctorId,
      body.departmentId || null,
      body.appointmentDate || nowIso,
      body.startTime || nowIso,
      body.endTime || nowIso,
      body.notes || null,
      nowIso,
      nowIso
    )
    .run();

  const record = await db.prepare('SELECT * FROM appointments WHERE id = ?').bind(apptId).first();

  return c.json({ success: true, appointment: record });
});
