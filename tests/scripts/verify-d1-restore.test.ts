import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import { verifyD1Restore } from '../../scripts/verify-d1-restore';

describe('D1 Automated Backups & Restore Verification (Task 6)', () => {
  const root = path.resolve(__dirname, '../..');
  const backupWorkflowPath = path.join(root, '.github', 'workflows', 'd1-backup.yml');
  const restoreWorkflowPath = path.join(root, '.github', 'workflows', 'd1-restore-check.yml');

  describe('Workflow Configuration Guards', () => {
    it('.github/workflows/d1-backup.yml exists and enforces 6-hour cron, age encryption, and 30-day retention', () => {
      expect(fs.existsSync(backupWorkflowPath), 'd1-backup.yml must exist').toBe(true);
      const content = fs.readFileSync(backupWorkflowPath, 'utf8');

      // Schedule: every 6 hours
      expect(content).toMatch(/cron:\s*['"]0 \*\/(?:6|\*).*?['"]/);
      expect(content).toContain('workflow_dispatch');

      // Exports both databases
      expect(content).toContain('careone-db');
      expect(content).toContain('careone-files');

      // Uses age encryption
      expect(content).toContain('age');

      // 30-day artifact retention, no R2
      expect(content).toContain('actions/upload-artifact');
      expect(content).toContain('retention-days: 30');
      expect(content.toLowerCase()).not.toContain('r2');
      expect(content.toLowerCase()).not.toContain('supabase');
    });

    it('.github/workflows/d1-restore-check.yml exists and enforces monthly restore verification', () => {
      expect(fs.existsSync(restoreWorkflowPath), 'd1-restore-check.yml must exist').toBe(true);
      const content = fs.readFileSync(restoreWorkflowPath, 'utf8');

      // Schedule: monthly
      expect(content).toMatch(/cron:\s*['"]0 2 1 \* \*['"]/);
      expect(content).toContain('workflow_dispatch');

      // Uses age decryption and verify-d1-restore script
      expect(content).toContain('age');
      expect(content).toContain('verify-d1-restore');
      expect(content.toLowerCase()).not.toContain('r2');
      expect(content.toLowerCase()).not.toContain('supabase');
    });
  });

  describe('Restore Engine (verifyD1Restore)', () => {
    const validDbSql = `
      CREATE TABLE departments (id TEXT PRIMARY KEY, name TEXT);
      CREATE TABLE staff (id TEXT PRIMARY KEY, email TEXT);
      CREATE TABLE patients (id TEXT PRIMARY KEY, full_name TEXT);
      CREATE TABLE appointments (id TEXT PRIMARY KEY, patient_id TEXT);
      CREATE TABLE documents (id TEXT PRIMARY KEY, patient_id TEXT);
      CREATE TABLE audit_log (id TEXT PRIMARY KEY, action TEXT);
      CREATE TABLE email_daily_counts (date TEXT PRIMARY KEY, count INTEGER);
      INSERT INTO staff (id, email) VALUES ('s1', 'dr.rahul@example.com');
      INSERT INTO patients (id, full_name) VALUES ('p1', 'Test Patient 01');
    `;

    const validFilesSql = `
      CREATE TABLE file_objects (
        id TEXT PRIMARY KEY,
        patient_id TEXT NOT NULL,
        document_id TEXT NOT NULL,
        mime TEXT NOT NULL,
        size INTEGER NOT NULL,
        sha256 TEXT NOT NULL,
        chunk_count INTEGER NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE TABLE file_chunks (
        file_id TEXT NOT NULL,
        idx INTEGER NOT NULL,
        data BLOB NOT NULL,
        PRIMARY KEY (file_id, idx)
      );
      CREATE TRIGGER file_objects_no_update
      BEFORE UPDATE ON file_objects
      BEGIN
        SELECT RAISE(ABORT, 'file_objects rows are write-once and cannot be updated');
      END;
      CREATE TRIGGER file_objects_no_delete
      BEFORE DELETE ON file_objects
      BEGIN
        SELECT RAISE(ABORT, 'file_objects rows are write-once and cannot be deleted');
      END;
      CREATE TRIGGER file_chunks_no_update
      BEFORE UPDATE ON file_chunks
      BEGIN
        SELECT RAISE(ABORT, 'file_chunks rows are write-once and cannot be updated');
      END;
      CREATE TRIGGER file_chunks_no_delete
      BEFORE DELETE ON file_chunks
      BEGIN
        SELECT RAISE(ABORT, 'file_chunks rows are write-once and cannot be deleted');
      END;
      INSERT INTO file_objects (id, patient_id, document_id, mime, size, sha256, chunk_count, created_at)
      VALUES ('f1', 'p1', 'doc1', 'application/pdf', 100, 'hash', 1, '2026-10-12T00:00:00Z');
    `;

    it('passes verification when both databases restore cleanly and pass integrity checks', () => {
      const result = verifyD1Restore(validDbSql, validFilesSql);
      expect(result.success).toBe(true);
      expect(result.dbTableCount).toBeGreaterThanOrEqual(7);
      expect(result.filesTableCount).toBeGreaterThanOrEqual(2);
      expect(result.immutabilityVerified).toBe(true);
    });

    it('throws error when clinical database is missing essential tables', () => {
      const missingPatientsSql = `
        CREATE TABLE staff (id TEXT PRIMARY KEY, email TEXT);
      `;
      expect(() => verifyD1Restore(missingPatientsSql, validFilesSql)).toThrow(
        /missing required table:/i
      );
    });

    it('throws error when files database is missing immutability triggers', () => {
      const missingTriggersSql = `
        CREATE TABLE file_objects (id TEXT PRIMARY KEY, patient_id TEXT, document_id TEXT, mime TEXT, size INTEGER, sha256 TEXT, chunk_count INTEGER, created_at TEXT);
        CREATE TABLE file_chunks (file_id TEXT, idx INTEGER, data BLOB, PRIMARY KEY (file_id, idx));
      `;
      expect(() => verifyD1Restore(validDbSql, missingTriggersSql)).toThrow(
        /write-once immutability trigger missing/i
      );
    });

    it('throws error when SQL syntax is malformed', () => {
      expect(() => verifyD1Restore('INVALID SQL SYNTAX HERE;', validFilesSql)).toThrow();
    });
  });
});
