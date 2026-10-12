import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { describe, it, expect, beforeEach } from 'vitest';

describe('D1 File Store Schema & Immutability Guards', () => {
  const schemaPath = path.resolve(__dirname, '../../migrations-files/0001_files_schema.sql');
  const wranglerPath = path.resolve(__dirname, '../../wrangler.jsonc');

  let db: DatabaseSync;

  beforeEach(() => {
    db = new DatabaseSync(':memory:');
    if (fs.existsSync(schemaPath)) {
      const schemaSql = fs.readFileSync(schemaPath, 'utf8');
      db.exec(schemaSql);
    }
  });

  it('migrations-files/0001_files_schema.sql exists', () => {
    expect(fs.existsSync(schemaPath), 'migrations-files/0001_files_schema.sql must exist').toBe(true);
  });

  it('defines file_objects and file_chunks tables with proper schema', () => {
    // Insert into file_objects
    db.exec(`
      INSERT INTO file_objects (id, patient_id, document_id, mime, size, sha256, chunk_count, created_at)
      VALUES ('f-1', 'p-1', 'doc-1', 'application/pdf', 1024, 'abc123sha', 1, '2026-10-12T10:00:00Z');
    `);

    // Insert into file_chunks
    const testBuffer = Buffer.from('PDF_TEST_DATA');
    const stmt = db.prepare('INSERT INTO file_chunks (file_id, idx, data) VALUES (?, ?, ?)');
    stmt.run('f-1', 0, testBuffer);

    // Verify row count
    const fo = db.prepare('SELECT id, mime, size FROM file_objects WHERE id = ?').get('f-1') as { id: string; mime: string; size: number };
    expect(fo).toBeDefined();
    expect(fo.mime).toBe('application/pdf');
    expect(fo.size).toBe(1024);

    const fc = db.prepare('SELECT file_id, idx, data FROM file_chunks WHERE file_id = ? AND idx = ?').get('f-1', 0) as { file_id: string; idx: number; data: Uint8Array };
    expect(fc).toBeDefined();
    expect(Buffer.compare(Buffer.from(fc.data), testBuffer)).toBe(0);
  });

  it('aborts on UPDATE of file_objects (write-once)', () => {
    db.exec(`
      INSERT INTO file_objects (id, patient_id, document_id, mime, size, sha256, chunk_count, created_at)
      VALUES ('f-imm-1', 'p-1', 'doc-1', 'application/pdf', 1024, 'abc123sha', 1, '2026-10-12T10:00:00Z');
    `);

    expect(() => {
      db.exec("UPDATE file_objects SET mime = 'image/png' WHERE id = 'f-imm-1';");
    }).toThrow(/file_objects rows are write-once and cannot be updated/i);
  });

  it('aborts on DELETE from file_objects (write-once)', () => {
    db.exec(`
      INSERT INTO file_objects (id, patient_id, document_id, mime, size, sha256, chunk_count, created_at)
      VALUES ('f-imm-2', 'p-1', 'doc-1', 'application/pdf', 1024, 'abc123sha', 1, '2026-10-12T10:00:00Z');
    `);

    expect(() => {
      db.exec("DELETE FROM file_objects WHERE id = 'f-imm-2';");
    }).toThrow(/file_objects rows cannot be deleted/i);
  });

  it('aborts on UPDATE of file_chunks (write-once)', () => {
    db.exec(`
      INSERT INTO file_objects (id, patient_id, document_id, mime, size, sha256, chunk_count, created_at)
      VALUES ('f-imm-3', 'p-1', 'doc-1', 'application/pdf', 1024, 'abc123sha', 1, '2026-10-12T10:00:00Z');
    `);

    const stmt = db.prepare('INSERT INTO file_chunks (file_id, idx, data) VALUES (?, ?, ?)');
    stmt.run('f-imm-3', 0, Buffer.from('CHUNK_0'));

    expect(() => {
      const updStmt = db.prepare('UPDATE file_chunks SET data = ? WHERE file_id = ? AND idx = ?');
      updStmt.run(Buffer.from('MODIFIED'), 'f-imm-3', 0);
    }).toThrow(/file_chunks rows are write-once and cannot be updated/i);
  });

  it('aborts on DELETE from file_chunks (write-once)', () => {
    db.exec(`
      INSERT INTO file_objects (id, patient_id, document_id, mime, size, sha256, chunk_count, created_at)
      VALUES ('f-imm-4', 'p-1', 'doc-1', 'application/pdf', 1024, 'abc123sha', 1, '2026-10-12T10:00:00Z');
    `);

    const stmt = db.prepare('INSERT INTO file_chunks (file_id, idx, data) VALUES (?, ?, ?)');
    stmt.run('f-imm-4', 0, Buffer.from('CHUNK_0'));

    expect(() => {
      db.exec("DELETE FROM file_chunks WHERE file_id = 'f-imm-4' AND idx = 0;");
    }).toThrow(/file_chunks rows cannot be deleted/i);
  });

  it('wrangler.jsonc binds FILES_DB to careone-files with migrations-files dir', () => {
    const content = fs.readFileSync(wranglerPath, 'utf8');
    expect(content).toContain('"binding": "FILES_DB"');
    expect(content).toContain('"database_name": "careone-files"');
    expect(content).toContain('"migrations_dir": "migrations-files"');
  });
});
