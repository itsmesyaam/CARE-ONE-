// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { storeFile, readFile, getStorageUsage, detectMimeFromBytes } from '../../worker/data/files';
import { app } from '../../worker/index';
import type { WorkerEnv } from '../../worker/env';

describe('D1 Chunked File Store: storeFile, readFile, and Routes', () => {
  const schemaFilesPath = path.resolve(__dirname, '../../migrations-files/0001_files_schema.sql');
  const schemaDbPath = path.resolve(__dirname, '../../migrations/0001_schema.sql');
  const schemaGuardsPath = path.resolve(__dirname, '../../migrations/0002_guards.sql');

  let filesSqlite: DatabaseSync;
  let mainSqlite: DatabaseSync;
  let mockEnv: WorkerEnv;

  const mockMeta: D1Response['meta'] = {
    duration: 0,
    rows_read: 0,
    rows_written: 0,
    size_after: 0,
    last_row_id: 0,
    changed_db: false,
    changes: 0,
  };

  // Adapt DatabaseSync to D1Database interface for testing
  function createD1Mock(db: DatabaseSync): D1Database {
    return {
      prepare(query: string) {
        return {
          bind(...params: unknown[]) {
            const boundParams = params as (string | number | bigint | null | Uint8Array)[];
            return {
              async first<T = unknown>(col?: string): Promise<T | null> {
                const stmt = db.prepare(query);
                const row = stmt.get(...boundParams) as Record<string, unknown> | undefined;
                if (!row) return null;
                return (col ? row[col] : row) as T;
              },
              async all<T = unknown>(): Promise<D1Result<T>> {
                const stmt = db.prepare(query);
                const rows = stmt.all(...boundParams) as T[];
                return {
                  results: rows,
                  success: true,
                  meta: mockMeta,
                };
              },
              async run(): Promise<D1Response> {
                const stmt = db.prepare(query);
                stmt.run(...boundParams);
                return {
                  success: true,
                  meta: mockMeta,
                };
              },
            };
          },
          async first<T = unknown>(col?: string): Promise<T | null> {
            const stmt = db.prepare(query);
            const row = stmt.get() as Record<string, unknown> | undefined;
            if (!row) return null;
            return (col ? row[col] : row) as T;
          },
          async all<T = unknown>(): Promise<D1Result<T>> {
            const stmt = db.prepare(query);
            const rows = stmt.all() as T[];
            return {
              results: rows,
              success: true,
              meta: mockMeta,
            };
          },
          async run(): Promise<D1Response> {
            const stmt = db.prepare(query);
            stmt.run();
            return {
              success: true,
              meta: mockMeta,
            };
          },
        } as unknown as D1PreparedStatement;
      },
      async batch(statements: D1PreparedStatement[]): Promise<D1Response[]> {
        const results: D1Response[] = [];
        db.exec('BEGIN TRANSACTION;');
        try {
          for (const s of statements) {
            await s.run();
            results.push({
              success: true,
              meta: mockMeta,
            });
          }
          db.exec('COMMIT;');
        } catch (err) {
          db.exec('ROLLBACK;');
          throw err;
        }
        return results;
      },
      async exec(query: string): Promise<D1ExecResult> {
        db.exec(query);
        return { count: 1, duration: 0 };
      },
    } as unknown as D1Database;
  }

  beforeEach(() => {
    filesSqlite = new DatabaseSync(':memory:');
    filesSqlite.exec(fs.readFileSync(schemaFilesPath, 'utf8'));

    mainSqlite = new DatabaseSync(':memory:');
    mainSqlite.exec(fs.readFileSync(schemaDbPath, 'utf8'));
    mainSqlite.exec(fs.readFileSync(schemaGuardsPath, 'utf8'));

    // Insert test patient and staff
    mainSqlite.exec(`
      INSERT INTO patients (id, uhid, full_name, dob, gender, phone)
      VALUES ('p-arun', 'ABC-1001', 'Arun Kumar', '1985-05-15', 'male', '9847000001');

      INSERT INTO staff (id, user_id, role, full_name)
      VALUES ('s-rahul', 'u-rahul', 'doctor', 'Dr. Rahul Nair');
    `);

    mockEnv = {
      DB: createD1Mock(mainSqlite),
      FILES_DB: createD1Mock(filesSqlite),
      REMINDERS: {} as unknown as Queue<unknown>,
    };
  });

  it('detects magic bytes correctly for PDF, JPEG, and PNG', () => {
    const pdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x35]); // %PDF-1.5
    const jpegBytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
    const pngBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const textBytes = new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f]); // Hello

    expect(detectMimeFromBytes(pdfBytes)).toBe('application/pdf');
    expect(detectMimeFromBytes(jpegBytes)).toBe('image/jpeg');
    expect(detectMimeFromBytes(pngBytes)).toBe('image/png');
    expect(detectMimeFromBytes(textBytes)).toBeNull();
  });

  it('stores and reads back a 3.5 MB file byte-identically with SHA-256 integrity (multi-chunk)', async () => {
    // Generate 3.5 MB file with valid PDF magic bytes header
    const size = 3.5 * 1024 * 1024;
    const testBytes = new Uint8Array(size);
    // Add PDF header
    testBytes.set([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x35], 0);
    // Fill remaining bytes with pattern
    for (let i = 8; i < size; i++) {
      testBytes[i] = i % 256;
    }

    const stored = await storeFile(mockEnv, {
      patientId: 'p-arun',
      documentId: 'doc-101',
      mime: 'application/pdf',
      data: testBytes,
    });

    expect(stored.id).toBeDefined();
    expect(stored.size).toBe(size);
    expect(stored.chunkCount).toBe(2); // 3.5 MB / 1.9 MB chunk size = 2 chunks
    expect(stored.sha256).toBeDefined();

    // Read file back
    const retrieved = await readFile(mockEnv, stored.id);
    expect(retrieved.metadata.id).toBe(stored.id);
    expect(retrieved.metadata.size).toBe(size);
    expect(retrieved.metadata.mime).toBe('application/pdf');
    expect(retrieved.data.byteLength).toBe(size);
    expect(Buffer.compare(Buffer.from(retrieved.data), Buffer.from(testBytes))).toBe(0);
  });

  it('rejects files larger than 5 MB with FILE_TOO_LARGE', async () => {
    const size = 5.5 * 1024 * 1024;
    const oversizedBytes = new Uint8Array(size);
    oversizedBytes.set([0x25, 0x50, 0x44, 0x46], 0);

    await expect(
      storeFile(mockEnv, {
        patientId: 'p-arun',
        documentId: 'doc-oversize',
        mime: 'application/pdf',
        data: oversizedBytes,
      })
    ).rejects.toThrow(/exceeds 5 MB limit/i);
  });

  it('rejects files with invalid or mismatched magic bytes', async () => {
    const fakePdfBytes = new Uint8Array([0x54, 0x65, 0x78, 0x74]); // "Text"

    await expect(
      storeFile(mockEnv, {
        patientId: 'p-arun',
        documentId: 'doc-bad-type',
        mime: 'application/pdf',
        data: fakePdfBytes,
      })
    ).rejects.toThrow(/invalid file format/i);
  });

  it('calculates total file storage usage vs 500 MB quota (count only, no patient info)', async () => {
    const size1 = 100 * 1024;
    const file1 = new Uint8Array(size1);
    file1.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);

    const size2 = 200 * 1024;
    const file2 = new Uint8Array(size2);
    file2.set([0xff, 0xd8, 0xff, 0xe0], 0);

    await storeFile(mockEnv, { patientId: 'p-arun', documentId: 'd-1', mime: 'image/png', data: file1 });
    await storeFile(mockEnv, { patientId: 'p-arun', documentId: 'd-2', mime: 'image/jpeg', data: file2 });

    const usage = await getStorageUsage(mockEnv);
    expect(usage.fileCount).toBe(2);
    expect(usage.totalBytes).toBe(size1 + size2);
    expect(usage.quotaBytes).toBe(500 * 1024 * 1024);
    expect(usage.usagePercent).toBeCloseTo(((size1 + size2) / (500 * 1024 * 1024)) * 100, 2);
  });

  it('HTTP API: upload endpoint stores document and returns 201 JSON', async () => {
    const testBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34, 0x0a, 0x25, 0xc4]);
    const formData = new FormData();
    formData.append('file', new Blob([testBytes], { type: 'application/pdf' }), 'report.pdf');
    formData.append('patientId', 'p-arun');
    formData.append('title', 'Blood Test Report');
    formData.append('kind', 'lab');

    const req = new Request('http://localhost/api/files/upload', {
      method: 'POST',
      body: formData,
      headers: {
        'x-actor-id': 'p-arun',
        'x-actor-role': 'patient',
      },
    });

    const res = await app.fetch(req, mockEnv);
    expect(res.status).toBe(201);
    const data = (await res.json()) as {
      ok: boolean;
      file_id: string;
      document_id: string;
      sha256: string;
    };
    expect(data.ok).toBe(true);
    expect(data.file_id).toBeDefined();
    expect(data.document_id).toBeDefined();
    expect(data.sha256).toBeDefined();
  });

  it('HTTP API: download endpoint serves file with no-store and Content-Disposition attachment', async () => {
    const testBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34, 0x0a, 0x25, 0xc4]);
    const stored = await storeFile(mockEnv, {
      patientId: 'p-arun',
      documentId: 'doc-dl-1',
      mime: 'application/pdf',
      data: testBytes,
    });

    const req = new Request(`http://localhost/api/files/${stored.id}/download`, {
      method: 'GET',
      headers: {
        'x-actor-id': 'p-arun',
        'x-actor-role': 'patient',
      },
    });

    const res = await app.fetch(req, mockEnv);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('application/pdf');
    expect(res.headers.get('cache-control')).toBe('no-store');
    expect(res.headers.get('content-disposition')).toContain('attachment');

    const bodyBuffer = await res.arrayBuffer();
    expect(Buffer.compare(Buffer.from(bodyBuffer), Buffer.from(testBytes))).toBe(0);
  });

  it('HTTP API: download returns 404 or 403 when another unauthorized patient requests the file', async () => {
    const testBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]);
    const stored = await storeFile(mockEnv, {
      patientId: 'p-arun',
      documentId: 'doc-sec-1',
      mime: 'application/pdf',
      data: testBytes,
    });

    const req = new Request(`http://localhost/api/files/${stored.id}/download`, {
      method: 'GET',
      headers: {
        'x-actor-id': 'p-other-patient',
        'x-actor-role': 'patient',
      },
    });

    const res = await app.fetch(req, mockEnv);
    expect([403, 404]).toContain(res.status);
  });

  it('HTTP API: admin storage endpoint returns count-only operational metrics', async () => {
    const req = new Request('http://localhost/api/admin/storage', {
      method: 'GET',
      headers: {
        'x-actor-id': 'admin-1',
        'x-actor-role': 'admin',
      },
    });

    const res = await app.fetch(req, mockEnv);
    expect(res.status).toBe(200);
    const data = (await res.json()) as {
      quota_bytes: number;
      file_count: number;
      total_bytes: number;
      patient_id?: unknown;
      patients?: unknown;
    };
    expect(data.quota_bytes).toBe(500 * 1024 * 1024);
    expect(data.file_count).toBeDefined();
    expect(data.total_bytes).toBeDefined();
    // Must never contain individual patient clinical records
    expect(data.patient_id).toBeUndefined();
    expect(data.patients).toBeUndefined();
  });
});
