import type { WorkerEnv } from '../env';

export const CHUNK_SIZE = 1_900_000; // 1.9 MB (D1 max row size is 2 MB)
export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
export const STORAGE_QUOTA_BYTES = 500 * 1024 * 1024; // 500 MB

export interface FileObjectMetadata {
  id: string;
  patient_id: string;
  document_id: string;
  mime: string;
  size: number;
  sha256: string;
  chunk_count: number;
  created_at: string;
}

export interface StoreFileParams {
  patientId: string;
  documentId: string;
  mime: string;
  data: Uint8Array;
}

export interface StoredFileResult {
  id: string;
  size: number;
  chunkCount: number;
  sha256: string;
  mime: string;
}

export interface ReadFileResult {
  metadata: FileObjectMetadata;
  data: Uint8Array;
}

export interface StorageUsageResult {
  fileCount: number;
  totalBytes: number;
  quotaBytes: number;
  usagePercent: number;
}

/**
 * Detect MIME type from file magic bytes.
 * Supports PDF, JPEG, and PNG. Returns null for unsupported/invalid byte signatures.
 */
export function detectMimeFromBytes(data: Uint8Array): string | null {
  if (data.length >= 4 && data[0] === 0x25 && data[1] === 0x50 && data[2] === 0x44 && data[3] === 0x46) {
    return 'application/pdf';
  }
  if (data.length >= 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) {
    return 'image/jpeg';
  }
  if (
    data.length >= 8 &&
    data[0] === 0x89 &&
    data[1] === 0x50 &&
    data[2] === 0x4e &&
    data[3] === 0x47 &&
    data[4] === 0x0d &&
    data[5] === 0x0a &&
    data[6] === 0x1a &&
    data[7] === 0x0a
  ) {
    return 'image/png';
  }
  return null;
}

/**
 * Compute SHA-256 hash string for Uint8Array using WebCrypto.
 */
export async function computeSha256(data: Uint8Array): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', data as unknown as BufferSource);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Store a file chunked into D1 (FILES_DB).
 * Enforces magic-byte validation, 5 MB limit, SHA-256 integrity, and atomic batch insert.
 */
export async function storeFile(
  env: WorkerEnv,
  params: StoreFileParams
): Promise<StoredFileResult> {
  if (params.data.byteLength > MAX_FILE_SIZE) {
    throw new Error('File exceeds 5 MB limit');
  }

  const detectedMime = detectMimeFromBytes(params.data);
  if (!detectedMime || detectedMime !== params.mime) {
    throw new Error('Invalid file format. Only PDF, JPEG, and PNG are supported.');
  }

  const sha256 = await computeSha256(params.data);
  const chunkCount = Math.max(1, Math.ceil(params.data.byteLength / CHUNK_SIZE));
  const fileId = crypto.randomUUID();

  const statements: D1PreparedStatement[] = [
    env.FILES_DB.prepare(
      'INSERT INTO file_objects (id, patient_id, document_id, mime, size, sha256, chunk_count) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).bind(
      fileId,
      params.patientId,
      params.documentId,
      params.mime,
      params.data.byteLength,
      sha256,
      chunkCount
    ),
  ];

  for (let i = 0; i < chunkCount; i++) {
    const start = i * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, params.data.byteLength);
    const chunkData = params.data.subarray(start, end);
    statements.push(
      env.FILES_DB.prepare(
        'INSERT INTO file_chunks (file_id, idx, data) VALUES (?, ?, ?)'
      ).bind(fileId, i, chunkData)
    );
  }

  await env.FILES_DB.batch(statements);

  return {
    id: fileId,
    size: params.data.byteLength,
    chunkCount,
    sha256,
    mime: params.mime,
  };
}

/**
 * Retrieve metadata for a file object.
 */
export async function getFileMetadata(
  env: WorkerEnv,
  fileId: string
): Promise<FileObjectMetadata | null> {
  return await env.FILES_DB.prepare(
    'SELECT id, patient_id, document_id, mime, size, sha256, chunk_count, created_at FROM file_objects WHERE id = ?'
  )
    .bind(fileId)
    .first<FileObjectMetadata>();
}

/**
 * Read and reassemble all chunks of a file from D1, verifying SHA-256 integrity.
 */
export async function readFile(
  env: WorkerEnv,
  fileId: string
): Promise<ReadFileResult> {
  const metadata = await getFileMetadata(env, fileId);
  if (!metadata) {
    throw new Error('File not found');
  }

  interface ChunkRow {
    idx: number;
    data: ArrayBuffer | Uint8Array;
  }

  const { results: chunks } = await env.FILES_DB.prepare(
    'SELECT idx, data FROM file_chunks WHERE file_id = ? ORDER BY idx ASC'
  )
    .bind(fileId)
    .all<ChunkRow>();

  if (!chunks || chunks.length !== metadata.chunk_count) {
    throw new Error(
      `File integrity error: expected ${metadata.chunk_count} chunks, found ${chunks?.length ?? 0}`
    );
  }

  const combined = new Uint8Array(metadata.size);
  let offset = 0;
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    if (!chunk || chunk.idx !== i) {
      throw new Error(`File integrity error: chunk index mismatch (expected ${i}, got ${chunk?.idx})`);
    }
    const chunkBytes = chunk.data instanceof Uint8Array ? chunk.data : new Uint8Array(chunk.data);
    combined.set(chunkBytes, offset);
    offset += chunkBytes.byteLength;
  }

  if (offset !== metadata.size) {
    throw new Error(`File integrity error: size mismatch (expected ${metadata.size}, got ${offset})`);
  }

  const computedHash = await computeSha256(combined);
  if (computedHash !== metadata.sha256) {
    throw new Error('File integrity check failed: SHA-256 mismatch');
  }

  return {
    metadata,
    data: combined,
  };
}

/**
 * Calculate operational storage usage metrics against 500 MB quota without exposing patient PII.
 */
export async function getStorageUsage(env: WorkerEnv): Promise<StorageUsageResult> {
  interface CountResult {
    file_count: number;
    total_bytes: number;
  }

  const result = await env.FILES_DB.prepare(
    'SELECT COUNT(*) as file_count, COALESCE(SUM(size), 0) as total_bytes FROM file_objects'
  ).first<CountResult>();

  const fileCount = result?.file_count ?? 0;
  const totalBytes = result?.total_bytes ?? 0;
  const usagePercent = (totalBytes / STORAGE_QUOTA_BYTES) * 100;

  return {
    fileCount,
    totalBytes,
    quotaBytes: STORAGE_QUOTA_BYTES,
    usagePercent,
  };
}
