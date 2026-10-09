/**
 * CareOne Private Documents & Storage API Routes
 * Mounts under /api/documents
 */

import { Hono } from 'hono';
import type { WorkerEnv } from '../env';
import {
  type AccessVariables,
  declareRoutePolicy,
  requireAccess,
  isDoctorOnCareTeam,
  hasActiveEmergencyAccess,
  isAuthorizedGuardian,
} from '../middleware/access';

export const documentsRoutes = new Hono<{
  Bindings: WorkerEnv;
  Variables: AccessVariables;
}>();

const ALLOWED_MIME_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/png']);
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB limit

async function canAccessPatient(
  db: D1Database,
  user: { role: string; id: string; patientId: string | null; staffId: string | null },
  patientId: string
): Promise<boolean> {
  if (user.role === 'patient') {
    return user.patientId === patientId;
  }

  if (user.role === 'guardian') {
    return isAuthorizedGuardian(db, user.id, patientId);
  }

  if (user.role === 'doctor') {
    if (!user.staffId) return false;
    const onCareTeam = await isDoctorOnCareTeam(db, user.staffId, patientId);
    if (onCareTeam) return true;
    return hasActiveEmergencyAccess(db, user.staffId, patientId);
  }

  return false;
}

// 1. Upload Document
const uploadPolicy = declareRoutePolicy('POST', '/api/documents/upload', {
  allowedRoles: ['patient', 'guardian', 'doctor'],
});

documentsRoutes.post('/upload', requireAccess(uploadPolicy), async c => {
  const user = c.get('user');
  let body: FormData;
  try {
    body = await c.req.formData();
  } catch {
    return c.json({ error: 'Invalid form data' }, 400);
  }

  const patientId = body.get('patientId') as string | null;
  const title = body.get('title') as string | null;
  const type = ((body.get('type') as string) || 'lab').toLowerCase();
  const reportDate = (body.get('reportDate') as string) || new Date().toISOString().split('T')[0]!;
  const file = body.get('file');

  if (!patientId || !title || !file || !(file instanceof File)) {
    return c.json(
      { error: 'Missing required fields: file, patientId, and title are required.' },
      400
    );
  }

  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return c.json(
      { error: 'Invalid file type. Only PDF, JPEG, and PNG files are allowed.' },
      400
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    return c.json({ error: 'File size exceeds 10 MB limit.' }, 400);
  }

  const db = c.env.DB;
  const hasAccess = await canAccessPatient(db, user, patientId);
  if (!hasAccess) {
    return c.json(
      { error: 'Forbidden: You do not have permission to upload documents for this patient.' },
      403
    );
  }

  const docId = crypto.randomUUID();
  const ext = file.type === 'application/pdf' ? '.pdf' : file.type === 'image/png' ? '.png' : '.jpg';
  const storagePath = `${patientId}/${docId}${ext}`;
  const nowIso = new Date().toISOString();
  const source = user.role === 'doctor' ? 'staff' : 'patient';
  const fileBytes = await file.arrayBuffer();

  // 1. Upload to private R2 bucket
  await c.env.BUCKET.put(storagePath, fileBytes, {
    httpMetadata: { contentType: file.type },
  });

  // 2. Insert metadata into D1 documents table
  await db
    .prepare(
      `INSERT INTO documents (
        id, patient_id, storage_path, type, title, report_date, source, review_status, mime_type, file_size_bytes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?)`
    )
    .bind(
      docId,
      patientId,
      storagePath,
      type,
      title,
      reportDate,
      source,
      file.type,
      file.size,
      nowIso,
      nowIso
    )
    .run();

  // 3. Log into audit_log
  await db
    .prepare(
      `INSERT INTO audit_log (id, at, actor_id, action, table_name, record_id, patient_id, reason)
       VALUES (?, ?, ?, 'UPLOAD_DOCUMENT', 'documents', ?, ?, 'Document uploaded')`
    )
    .bind(
      crypto.randomUUID(),
      nowIso,
      user.id,
      docId,
      patientId
    )
    .run();

  return c.json(
    {
      success: true,
      document: {
        id: docId,
        patient_id: patientId,
        storage_path: storagePath,
        type,
        title,
        report_date: reportDate,
        source,
        review_status: 'pending',
        mime_type: file.type,
        file_size_bytes: file.size,
        created_at: nowIso,
        updated_at: nowIso,
      },
    },
    201
  );
});

// 2. Doctor Review Queue
const reviewQueuePolicy = declareRoutePolicy('GET', '/api/documents/review-queue', {
  allowedRoles: ['doctor'],
  requireMfa: true,
});

documentsRoutes.get('/review-queue', requireAccess(reviewQueuePolicy), async c => {
  const user = c.get('user');
  if (!user.staffId) {
    return c.json({ error: 'Doctor staff record required' }, 403);
  }

  const db = c.env.DB;
  const nowIso = new Date().toISOString();

  const query = `
    SELECT 
      d.id, d.patient_id, d.storage_path, d.type, d.title, d.report_date, d.source,
      d.review_status, d.reviewed_at, d.reviewed_by, d.file_size_bytes, d.mime_type, d.created_at,
      p.full_name as patient_name, p.uhid as patient_uhid, p.dob as patient_dob,
      p.gender as patient_gender, p.phone as patient_phone
    FROM documents d
    JOIN patients p ON d.patient_id = p.id
    WHERE d.review_status = 'pending'
      AND (
        EXISTS (SELECT 1 FROM care_team ct WHERE ct.staff_id = ? AND ct.patient_id = d.patient_id AND ct.active = 1 AND (ct.expires_at IS NULL OR ct.expires_at > ?))
        OR EXISTS (SELECT 1 FROM emergency_access ea WHERE ea.staff_id = ? AND ea.patient_id = d.patient_id AND ea.expires_at > ?)
      )
    ORDER BY d.created_at DESC
  `;

  const rows = await db.prepare(query).bind(user.staffId, nowIso, user.staffId, nowIso).all<{
    id: string;
    patient_id: string;
    storage_path: string;
    type: string;
    title: string;
    report_date: string;
    source: string;
    review_status: string;
    reviewed_at: string | null;
    reviewed_by: string | null;
    file_size_bytes: number | null;
    mime_type: string;
    created_at: string;
    patient_name: string;
    patient_uhid: string;
    patient_dob: string;
    patient_gender: string;
    patient_phone: string;
  }>();

  const reports = (rows.results || []).map(r => ({
    id: r.id,
    patient_id: r.patient_id,
    storage_path: r.storage_path,
    type: r.type,
    title: r.title,
    report_date: r.report_date,
    source: r.source,
    review_status: r.review_status,
    reviewed_at: r.reviewed_at,
    file_size_bytes: r.file_size_bytes,
    mime_type: r.mime_type,
    created_at: r.created_at,
    patients: {
      id: r.patient_id,
      full_name: r.patient_name,
      uhid: r.patient_uhid,
      dob: r.patient_dob,
      gender: r.patient_gender,
      phone: r.patient_phone,
    },
  }));

  return c.json({ success: true, reports });
});

// 3. Mark Document Reviewed
const reviewDocPolicy = declareRoutePolicy('POST', '/api/documents/:id/review', {
  allowedRoles: ['doctor'],
  requireMfa: true,
});

documentsRoutes.post('/:id/review', requireAccess(reviewDocPolicy), async c => {
  const user = c.get('user');
  if (!user.staffId) {
    return c.json({ error: 'Doctor staff record required' }, 403);
  }

  const id = c.req.param('id');
  const db = c.env.DB;

  const doc = await db
    .prepare('SELECT * FROM documents WHERE id = ?')
    .bind(id)
    .first<{ id: string; patient_id: string }>();

  if (!doc) {
    return c.json({ error: 'Document not found' }, 404);
  }

  const hasAccess = await canAccessPatient(db, user, doc.patient_id);
  if (!hasAccess) {
    return c.json({ error: 'Forbidden: Not on care team for this patient' }, 403);
  }

  const nowIso = new Date().toISOString();
  await db
    .prepare(
      `UPDATE documents 
       SET review_status = 'reviewed', reviewed_by = ?, reviewed_at = ?, updated_at = ?
       WHERE id = ?`
    )
    .bind(user.staffId, nowIso, nowIso, id)
    .run();

  await db
    .prepare(
      `INSERT INTO audit_log (id, at, actor_id, action, table_name, record_id, patient_id, reason)
       VALUES (?, ?, ?, 'REVIEW_DOCUMENT', 'documents', ?, ?, 'Document marked reviewed')`
    )
    .bind(crypto.randomUUID(), nowIso, user.id, id, doc.patient_id)
    .run();

  const updated = await db.prepare('SELECT * FROM documents WHERE id = ?').bind(id).first();

  return c.json({ success: true, document: updated });
});

// 4. Download / Stream Document from R2
const downloadPolicy = declareRoutePolicy('GET', '/api/documents/:id/download', {
  allowedRoles: ['patient', 'guardian', 'doctor'],
});

documentsRoutes.get('/:id/download', requireAccess(downloadPolicy), async c => {
  const user = c.get('user');
  const id = c.req.param('id');
  const db = c.env.DB;

  const doc = await db
    .prepare('SELECT * FROM documents WHERE id = ?')
    .bind(id)
    .first<{
      id: string;
      patient_id: string;
      storage_path: string;
      title: string;
      mime_type: string;
      file_size_bytes: number | null;
    }>();

  if (!doc) {
    return c.json({ error: 'Document not found' }, 404);
  }

  const hasAccess = await canAccessPatient(db, user, doc.patient_id);
  if (!hasAccess) {
    return c.json({ error: 'Forbidden: Access denied to clinical document' }, 403);
  }

  const object = await c.env.BUCKET.get(doc.storage_path);
  if (!object) {
    return c.json({ error: 'File not found in storage' }, 404);
  }

  // Audit log download
  const nowIso = new Date().toISOString();
  await db
    .prepare(
      `INSERT INTO audit_log (id, at, actor_id, action, table_name, record_id, patient_id, reason)
       VALUES (?, ?, ?, 'DOWNLOAD_DOCUMENT', 'documents', ?, ?, 'Downloaded document file')`
    )
    .bind(
      crypto.randomUUID(),
      nowIso,
      user.id,
      id,
      doc.patient_id
    )
    .run();

  const sanitizedTitle = doc.title.replace(/[^a-zA-Z0-9_.-]/g, '_');

  return new Response(object.body as unknown as ReadableStream, {
    status: 200,
    headers: {
      'Content-Type': doc.mime_type || 'application/octet-stream',
      'Content-Disposition': `inline; filename="${sanitizedTitle}"`,
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'private, no-cache, no-store, must-revalidate',
    },
  });
});

// 5. List Documents for Patient
const listPatientDocsPolicy = declareRoutePolicy('GET', '/api/documents/patient/:patientId', {
  allowedRoles: ['patient', 'guardian', 'doctor'],
});

documentsRoutes.get('/patient/:patientId', requireAccess(listPatientDocsPolicy), async c => {
  const user = c.get('user');
  const patientId = c.req.param('patientId');
  const db = c.env.DB;

  const hasAccess = await canAccessPatient(db, user, patientId);
  if (!hasAccess) {
    return c.json({ error: 'Forbidden: Access denied to patient documents' }, 403);
  }

  const rows = await db
    .prepare(
      `SELECT * FROM documents WHERE patient_id = ? ORDER BY report_date DESC, created_at DESC`
    )
    .bind(patientId)
    .all();

  return c.json({ success: true, documents: rows.results || [] });
});

// 6. Get Document Metadata
const getDocPolicy = declareRoutePolicy('GET', '/api/documents/:id', {
  allowedRoles: ['patient', 'guardian', 'doctor'],
});

documentsRoutes.get('/:id', requireAccess(getDocPolicy), async c => {
  const user = c.get('user');
  const id = c.req.param('id');
  const db = c.env.DB;

  const doc = await db
    .prepare('SELECT * FROM documents WHERE id = ?')
    .bind(id)
    .first<{ id: string; patient_id: string }>();

  if (!doc) {
    return c.json({ error: 'Document not found' }, 404);
  }

  const hasAccess = await canAccessPatient(db, user, doc.patient_id);
  if (!hasAccess) {
    return c.json({ error: 'Forbidden: Access denied' }, 403);
  }

  return c.json({ success: true, document: doc });
});
