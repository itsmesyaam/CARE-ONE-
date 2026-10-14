import { Hono } from 'hono';
import type { Context } from 'hono';
import type { WorkerEnv } from '../env';
import {
  storeFile,
  readFile,
  getFileMetadata,
  getStorageUsage,
  detectMimeFromBytes,
  MAX_FILE_SIZE,
} from '../data/files';
import { loadPrincipal } from '../auth/policy';

export const filesRouter = new Hono<{ Bindings: WorkerEnv }>();

// Helper to determine file extension from MIME
function getExtensionForMime(mime: string): string {
  switch (mime) {
    case 'application/pdf':
      return '.pdf';
    case 'image/jpeg':
      return '.jpg';
    case 'image/png':
      return '.png';
    default:
      return '.bin';
  }
}

// POST /api/files/upload
filesRouter.post('/upload', async (c) => {
  const principal = await loadPrincipal(c);
  if (!principal || !principal.isActive) {
    return c.json({ error: 'Unauthorized: missing actor credentials' }, 401);
  }

  const actorId = principal.id;
  const actorRole = principal.role;

  // Admins must never handle clinical records directly
  if (actorRole === 'admin') {
    return c.json({ error: 'Admins cannot create clinical documents' }, 403);
  }

  const formData = await c.req.formData();
  const file = formData.get('file');
  const patientId = (formData.get('patientId') as string) || (actorRole === 'patient' ? actorId : '');

  if (!patientId) {
    return c.json({ error: 'Patient ID is required' }, 400);
  }

  // If patient is uploading, they can only upload for themselves
  if (actorRole === 'patient' && actorId !== patientId) {
    return c.json({ error: 'Patients can only upload their own records' }, 403);
  }

  if (!file || !(file instanceof File)) {
    return c.json({ error: 'No valid file provided' }, 400);
  }

  if (file.size > MAX_FILE_SIZE) {
    return c.json(
      { error: 'File exceeds 5 MB limit. Please compress or select a smaller file.' },
      400
    );
  }

  const buffer = await file.arrayBuffer();
  const data = new Uint8Array(buffer);

  const detectedMime = detectMimeFromBytes(data);
  if (!detectedMime) {
    return c.json(
      { error: 'Invalid file format. Only PDF, JPEG, and PNG files are allowed.' },
      400
    );
  }

  const title = (formData.get('title') as string) || file.name || 'Clinical Document';
  const rawKind = (formData.get('kind') as string) || 'lab';
  const kind = ['lab', 'imaging', 'prescription', 'other'].includes(rawKind) ? rawKind : 'lab';
  const documentId = crypto.randomUUID();

  try {
    const stored = await storeFile(c.env, {
      patientId,
      documentId,
      mime: detectedMime,
      data,
    });

    // Insert record in documents table with _request_ctx audit trail
    const reqId = crypto.randomUUID();
    await c.env.DB.batch([
      c.env.DB.prepare(
        'INSERT OR REPLACE INTO _request_ctx (id, actor_id, role, request_id) VALUES (1, ?, ?, ?)'
      ).bind(actorId, actorRole, reqId),
      c.env.DB.prepare(
        `INSERT INTO documents (
          id, patient_id, storage_path, type, title, file_size_bytes, mime_type, source
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        documentId,
        patientId,
        stored.id,
        kind,
        title,
        stored.size,
        detectedMime,
        actorRole === 'patient' ? 'patient' : 'staff'
      ),
      c.env.DB.prepare('DELETE FROM _request_ctx WHERE id = 1'),
    ]);

    return c.json(
      {
        ok: true,
        file_id: stored.id,
        document_id: documentId,
        sha256: stored.sha256,
        size: stored.size,
      },
      201
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Upload failed';
    return c.json({ error: message }, 400);
  }
});

// GET /api/files/:fileId/download
filesRouter.get('/:fileId/download', async (c) => {
  const principal = await loadPrincipal(c);
  if (!principal || !principal.isActive) {
    return c.json({ error: 'Unauthorized: missing actor credentials' }, 401);
  }

  const fileId = c.req.param('fileId');
  const actorId = principal.id;
  const actorRole = principal.role;

  // Admins must never read individual clinical records
  if (actorRole === 'admin') {
    return c.json({ error: 'Admins cannot read clinical documents' }, 403);
  }

  const fileMeta = await getFileMetadata(c.env, fileId);
  if (!fileMeta) {
    return c.json({ error: 'File not found' }, 404);
  }

  // Patient access policy: only own records
  if (actorRole === 'patient' && actorId !== fileMeta.patient_id) {
    return c.json({ error: 'File not found' }, 404);
  }

  try {
    const { metadata, data } = await readFile(c.env, fileId);

    // Record read audit log entry
    try {
      await c.env.DB.prepare(
        `INSERT INTO audit_log (at, actor_id, action, table_name, record_id, patient_id)
         VALUES (datetime('now'), ?, 'READ', 'file_objects', ?, ?)`
      )
        .bind(actorId, fileId, metadata.patient_id)
        .run();
    } catch {
      // Non-blocking read audit log
    }

    const ext = getExtensionForMime(metadata.mime);
    return new Response(data as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': metadata.mime,
        'Cache-Control': 'no-store',
        'Content-Disposition': `attachment; filename="document-${fileId}${ext}"`,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to retrieve file';
    return c.json({ error: message }, 500);
  }
});

// GET /api/admin/storage handler - Operational metrics only (no patient data)
export const adminStorageHandler = async (c: Context<{ Bindings: WorkerEnv }>) => {
  const principal = await loadPrincipal(c);
  if (!principal || !principal.isActive) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  if (principal.role !== 'admin') {
    return c.json({ error: 'Admin access required' }, 403);
  }

  const usage = await getStorageUsage(c.env);
  return c.json({
    ok: true,
    file_count: usage.fileCount,
    total_bytes: usage.totalBytes,
    quota_bytes: usage.quotaBytes,
    usage_percent: usage.usagePercent,
  });
};

filesRouter.get('/storage', adminStorageHandler);
