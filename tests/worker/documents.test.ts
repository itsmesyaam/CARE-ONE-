// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { createApp } from '../../worker/app';
import type { WorkerEnv } from '../../worker/env';
import { createSession } from '../../worker/auth/sessions';

type BoundParam = string | number | null | undefined;
type QueryRow = Record<string, unknown>;

function createMockD1(): { d1: D1Database; sqlite: DatabaseSync } {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec('PRAGMA foreign_keys = ON;');

  const m1 = fs.readFileSync(path.resolve(process.cwd(), 'migrations/0001_initial_schema.sql'), 'utf8');
  sqlite.exec(m1);
  const m2 = fs.readFileSync(path.resolve(process.cwd(), 'migrations/0002_seed_demo_data.sql'), 'utf8');
  sqlite.exec(m2);
  const m3 = fs.readFileSync(path.resolve(process.cwd(), 'migrations/0003_staff_auth_credentials.sql'), 'utf8');
  sqlite.exec(m3);

  const d1 = {
    prepare(sql: string) {
      let boundParams: BoundParam[] = [];
      return {
        bind(...params: BoundParam[]) {
          boundParams = params;
          return this;
        },
        async first<T = unknown>(col?: string): Promise<T | null> {
          const stmt = sqlite.prepare(sql);
          const safe = boundParams.map(p => (p === undefined ? null : p));
          const row = stmt.get(...safe) as QueryRow | undefined;
          if (!row) return null;
          return (col ? (row[col] as T) : (row as T)) ?? null;
        },
        async all<T = unknown>() {
          const stmt = sqlite.prepare(sql);
          const safe = boundParams.map(p => (p === undefined ? null : p));
          const results = stmt.all(...safe) as T[];
          return { results, success: true, meta: { duration: 0 } };
        },
        async run() {
          const stmt = sqlite.prepare(sql);
          const safe = boundParams.map(p => (p === undefined ? null : p));
          const info = stmt.run(...safe) as { changes?: number };
          return { success: true, meta: { changes: info.changes || 0, duration: 0 } };
        },
        async raw<T = unknown[]>() {
          const stmt = sqlite.prepare(sql);
          const safe = boundParams.map(p => (p === undefined ? null : p));
          const rows = stmt.all(...safe) as QueryRow[];
          return rows.map((r: QueryRow) => Object.values(r)) as T[];
        },
      };
    },
    async batch<T = unknown>(statements: Array<{ run: () => Promise<unknown> }>) {
      const results = [];
      for (const s of statements) {
        results.push(await s.run());
      }
      return results as T[];
    },
    async exec(sql: string) {
      sqlite.exec(sql);
      return { count: 1, duration: 0 };
    },
  } as unknown as D1Database;

  return { d1, sqlite };
}

interface StoredR2Object {
  data: Uint8Array;
  httpMetadata?: { contentType?: string };
}

function createMockR2(): R2Bucket {
  const store = new Map<string, StoredR2Object>();

  return {
    async put(key: string, value: unknown, options?: { httpMetadata?: { contentType?: string } }) {
      let data: Uint8Array;
      if (value instanceof ArrayBuffer) {
        data = new Uint8Array(value);
      } else if (value instanceof Uint8Array) {
        data = value;
      } else if (typeof value === 'string') {
        data = new TextEncoder().encode(value);
      } else if (value && typeof (value as Blob).arrayBuffer === 'function') {
        data = new Uint8Array(await (value as Blob).arrayBuffer());
      } else {
        data = new Uint8Array();
      }

      store.set(key, { data, httpMetadata: options?.httpMetadata });
      return {
        key,
        size: data.byteLength,
        httpMetadata: options?.httpMetadata,
      } as unknown as R2Object;
    },
    async get(key: string) {
      const entry = store.get(key);
      if (!entry) return null;

      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(entry.data);
          controller.close();
        },
      });

      return {
        key,
        size: entry.data.byteLength,
        httpMetadata: entry.httpMetadata,
        body: stream,
        arrayBuffer: async () => entry.data.buffer,
        text: async () => new TextDecoder().decode(entry.data),
      } as unknown as R2ObjectBody;
    },
    async delete(key: string | string[]) {
      if (Array.isArray(key)) {
        for (const k of key) store.delete(k);
      } else {
        store.delete(key);
      }
    },
    async head(key: string) {
      const entry = store.get(key);
      if (!entry) return null;
      return {
        key,
        size: entry.data.byteLength,
        httpMetadata: entry.httpMetadata,
      } as unknown as R2Object;
    },
  } as unknown as R2Bucket;
}

describe('Private R2 Documents & Storage API', () => {
  let mockEnv: WorkerEnv;
  let d1: D1Database;
  let r2: R2Bucket;

  // Demo IDs from seed
  const PATIENT_A = 'e0000000-0000-0000-0000-000000000001'; // Arun Kumar
  const PATIENT_B = 'e0000000-0000-0000-0000-000000000004'; // Naveen Raj
  const DOCTOR_CARE_TEAM = 'b0000000-0000-0000-0000-000000000003'; // Dr. Rahul (Care team for Arun)
  const DOCTOR_OTHER = 'b0000000-0000-0000-0000-000000000006'; // Dr. Kavitha (Not care team for Arun)
  const FRONT_DESK = 'b0000000-0000-0000-0000-000000000002'; // Desk
  const ADMIN = 'b0000000-0000-0000-0000-000000000001'; // Admin

  beforeEach(() => {
    const mock = createMockD1();
    d1 = mock.d1;
    r2 = createMockR2();
    mockEnv = {
      DB: d1,
      BUCKET: r2,
      ENVIRONMENT: 'test',
    } as unknown as WorkerEnv;
  });

  async function makeToken(params: {
    userId: string;
    role: string;
    staffId?: string;
    patientId?: string;
    isMfaVerified: boolean;
  }) {
    const { rawToken } = await createSession(d1, params);
    return rawToken;
  }

  it('rejects unauthenticated document access (401)', async () => {
    const app = createApp();
    const res = await app.request('http://localhost/api/documents/review-queue', {
      method: 'GET',
    }, mockEnv);
    expect(res.status).toBe(401);
  });

  it('rejects uploads with invalid MIME type or exceeding 10MB', async () => {
    const app = createApp();
    const patientToken = await makeToken({
      userId: PATIENT_A,
      role: 'patient',
      patientId: PATIENT_A,
      isMfaVerified: false,
    });

    // 1. Invalid mime type (text/html)
    const badMimeForm = new FormData();
    badMimeForm.append('patientId', PATIENT_A);
    badMimeForm.append('title', 'Dangerous Script');
    badMimeForm.append('file', new File(['<script>alert(1)</script>'], 'hack.html', { type: 'text/html' }));

    const badMimeRes = await app.request('http://localhost/api/documents/upload', {
      method: 'POST',
      headers: {
        Cookie: `careone_session=${patientToken}`,
        Origin: 'http://localhost',
      },
      body: badMimeForm,
    }, mockEnv);

    expect(badMimeRes.status).toBe(400);
    const badMimeBody = (await badMimeRes.json()) as { error: string };
    expect(badMimeBody.error).toMatch(/PDF, JPEG, and PNG/i);

    // 2. Oversized file (> 10MB)
    const largeData = new Uint8Array(10 * 1024 * 1024 + 1024); // 10MB + 1KB
    const largeForm = new FormData();
    largeForm.append('patientId', PATIENT_A);
    largeForm.append('title', 'Huge Scan');
    largeForm.append('file', new File([largeData], 'huge.pdf', { type: 'application/pdf' }));

    const largeRes = await app.request('http://localhost/api/documents/upload', {
      method: 'POST',
      headers: {
        Cookie: `careone_session=${patientToken}`,
        Origin: 'http://localhost',
      },
      body: largeForm,
    }, mockEnv);

    expect(largeRes.status).toBe(400);
    const largeBody = (await largeRes.json()) as { error: string };
    expect(largeBody.error).toMatch(/10 MB/i);
  });

  it('prevents Patient A from uploading into Patient B folder/record (403)', async () => {
    const app = createApp();
    const patientToken = await makeToken({
      userId: PATIENT_A,
      role: 'patient',
      patientId: PATIENT_A,
      isMfaVerified: false,
    });

    const form = new FormData();
    form.append('patientId', PATIENT_B); // Attempting to upload to Patient B
    form.append('title', 'Hijacked Report');
    form.append('file', new File(['%PDF-1.4 test'], 'report.pdf', { type: 'application/pdf' }));

    const res = await app.request('http://localhost/api/documents/upload', {
      method: 'POST',
      headers: {
        Cookie: `careone_session=${patientToken}`,
        Origin: 'http://localhost',
      },
      body: form,
    }, mockEnv);

    expect(res.status).toBe(403);
  });

  it('allows Patient A to upload a valid PDF, stores in R2, status pending, logs audit', async () => {
    const app = createApp();
    const patientToken = await makeToken({
      userId: PATIENT_A,
      role: 'patient',
      patientId: PATIENT_A,
      isMfaVerified: false,
    });

    const fileContent = '%PDF-1.4 sample lab report content';
    const form = new FormData();
    form.append('patientId', PATIENT_A);
    form.append('title', 'Blood Test October');
    form.append('type', 'lab');
    form.append('reportDate', '2026-10-09');
    form.append('file', new File([fileContent], 'blood_test.pdf', { type: 'application/pdf' }));

    const res = await app.request('http://localhost/api/documents/upload', {
      method: 'POST',
      headers: {
        Cookie: `careone_session=${patientToken}`,
        Origin: 'http://localhost',
      },
      body: form,
    }, mockEnv);

    expect(res.status).toBe(201);
    const data = (await res.json()) as {
      success: boolean;
      document: { id: string; storage_path: string; review_status: string; mime_type: string };
    };
    expect(data.success).toBe(true);
    expect(data.document.review_status).toBe('pending');
    expect(data.document.mime_type).toBe('application/pdf');
    expect(data.document.storage_path).toContain(`${PATIENT_A}/`);

    // Verify stored in R2
    const r2Obj = await r2.get(data.document.storage_path);
    expect(r2Obj).not.toBeNull();
    const text = await r2Obj?.text();
    expect(text).toBe(fileContent);

    // Verify audit log entry
    const audit = await d1
      .prepare("SELECT * FROM audit_log WHERE table_name = 'documents' AND record_id = ?")
      .bind(data.document.id)
      .first();
    expect(audit).not.toBeNull();
  });

  it('denies Front Desk and Hospital Admin from downloading clinical documents (403)', async () => {
    const app = createApp();
    const deskToken = await makeToken({
      userId: FRONT_DESK,
      role: 'front_desk',
      staffId: FRONT_DESK,
      isMfaVerified: true,
    });
    const adminToken = await makeToken({
      userId: ADMIN,
      role: 'hospital_admin',
      staffId: ADMIN,
      isMfaVerified: true,
    });

    // Seed doc: 'dc000000-0000-0000-0000-000000000001' belonging to Arun Kumar
    const deskRes = await app.request('http://localhost/api/documents/dc000000-0000-0000-0000-000000000001/download', {
      method: 'GET',
      headers: { Cookie: `careone_session=${deskToken}` },
    }, mockEnv);
    expect(deskRes.status).toBe(403);

    const adminRes = await app.request('http://localhost/api/documents/dc000000-0000-0000-0000-000000000001/download', {
      method: 'GET',
      headers: { Cookie: `careone_session=${adminToken}` },
    }, mockEnv);
    expect(adminRes.status).toBe(403);
  });

  it('allows care team doctor to list review queue, download file from R2, and mark it reviewed', async () => {
    const app = createApp();
    const doctorToken = await makeToken({
      userId: DOCTOR_CARE_TEAM,
      role: 'doctor',
      staffId: DOCTOR_CARE_TEAM,
      isMfaVerified: true,
    });

    // Seed file in R2 for existing doc dc000000-0000-0000-0000-000000000001
    // (storage_path from seed: e0000000-0000-0000-0000-000000000001/metabolic_panel_recent.pdf)
    await r2.put(
      'e0000000-0000-0000-0000-000000000001/metabolic_panel_recent.pdf',
      '%PDF-1.4 Lab Report Metabolic Panel Result',
      { httpMetadata: { contentType: 'application/pdf' } }
    );

    // 1. Fetch Review Queue
    const queueRes = await app.request('http://localhost/api/documents/review-queue', {
      method: 'GET',
      headers: { Cookie: `careone_session=${doctorToken}` },
    }, mockEnv);

    expect(queueRes.status).toBe(200);
    const queue = (await queueRes.json()) as { reports: Array<{ id: string; title: string }> };
    expect(queue.reports.length).toBeGreaterThan(0);
    expect(queue.reports.some(r => r.id === 'dc000000-0000-0000-0000-000000000001')).toBe(true);

    // 2. Download Document
    const downloadRes = await app.request('http://localhost/api/documents/dc000000-0000-0000-0000-000000000001/download', {
      method: 'GET',
      headers: { Cookie: `careone_session=${doctorToken}` },
    }, mockEnv);

    expect(downloadRes.status).toBe(200);
    expect(downloadRes.headers.get('Content-Type')).toBe('application/pdf');
    expect(downloadRes.headers.get('X-Content-Type-Options')).toBe('nosniff');
    const pdfData = await downloadRes.text();
    expect(pdfData).toContain('Lab Report Metabolic Panel');

    // 3. Mark Reviewed
    const reviewRes = await app.request('http://localhost/api/documents/dc000000-0000-0000-0000-000000000001/review', {
      method: 'POST',
      headers: {
        Cookie: `careone_session=${doctorToken}`,
        Origin: 'http://localhost',
      },
    }, mockEnv);

    expect(reviewRes.status).toBe(200);
    const reviewData = (await reviewRes.json()) as { success: boolean; document: { review_status: string } };
    expect(reviewData.success).toBe(true);
    expect(reviewData.document.review_status).toBe('reviewed');
  });

  it('denies other doctor from downloading without emergency access, allows with emergency access', async () => {
    const app = createApp();
    const otherDoctorToken = await makeToken({
      userId: DOCTOR_OTHER,
      role: 'doctor',
      staffId: DOCTOR_OTHER,
      isMfaVerified: true,
    });

    await r2.put(
      'e0000000-0000-0000-0000-000000000001/metabolic_panel_recent.pdf',
      '%PDF-1.4 Lab Report Metabolic Panel Result',
      { httpMetadata: { contentType: 'application/pdf' } }
    );

    // 1. Without emergency access -> 403
    const deniedRes = await app.request('http://localhost/api/documents/dc000000-0000-0000-0000-000000000001/download', {
      method: 'GET',
      headers: { Cookie: `careone_session=${otherDoctorToken}` },
    }, mockEnv);
    expect(deniedRes.status).toBe(403);

    // 2. Grant Emergency Access (expires in 4 hours)
    const expiresAt = new Date(Date.now() + 4 * 3600 * 1000).toISOString();
    await d1
      .prepare(
        `INSERT INTO emergency_access (id, patient_id, staff_id, reason, expires_at, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .bind(
        'emg-doc-test-1',
        PATIENT_A,
        DOCTOR_OTHER,
        'Patient presented with acute trauma in emergency room',
        expiresAt,
        new Date().toISOString()
      )
      .run();

    // 3. With emergency access -> 200
    const allowedRes = await app.request('http://localhost/api/documents/dc000000-0000-0000-0000-000000000001/download', {
      method: 'GET',
      headers: { Cookie: `careone_session=${otherDoctorToken}` },
    }, mockEnv);
    expect(allowedRes.status).toBe(200);
  });
});
