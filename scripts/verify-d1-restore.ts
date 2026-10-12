import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';

export interface RestoreVerificationResult {
  success: boolean;
  dbTableCount: number;
  filesTableCount: number;
  immutabilityVerified: boolean;
}

const REQUIRED_CLINICAL_TABLES = [
  'departments',
  'staff',
  'patients',
  'appointments',
  'documents',
  'audit_log',
  'email_daily_counts',
];

const REQUIRED_FILES_TABLES = [
  'file_objects',
  'file_chunks',
];

const REQUIRED_FILES_TRIGGERS = [
  'file_objects_no_update',
  'file_objects_no_delete',
  'file_chunks_no_update',
  'file_chunks_no_delete',
];

export function verifyD1Restore(dbSql: string, filesSql: string): RestoreVerificationResult {
  // 1. Verify and restore clinical DB
  const db = new DatabaseSync(':memory:');
  db.exec(dbSql);

  const dbTablesResult = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all() as Array<{ name: string }>;
  const dbTableNames = new Set(dbTablesResult.map(r => r.name));

  for (const table of REQUIRED_CLINICAL_TABLES) {
    if (!dbTableNames.has(table)) {
      throw new Error(`Restore verification failed: Missing required table: ${table}`);
    }
  }

  // 2. Verify and restore files DB
  const filesDb = new DatabaseSync(':memory:');
  filesDb.exec(filesSql);

  const filesTablesResult = filesDb.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all() as Array<{ name: string }>;
  const filesTableNames = new Set(filesTablesResult.map(r => r.name));

  for (const table of REQUIRED_FILES_TABLES) {
    if (!filesTableNames.has(table)) {
      throw new Error(`Restore verification failed: Missing required files table: ${table}`);
    }
  }

  // Verify write-once triggers in files DB
  const triggersResult = filesDb.prepare("SELECT name FROM sqlite_master WHERE type = 'trigger'").all() as Array<{ name: string }>;
  const triggerNames = new Set(triggersResult.map(r => r.name));

  for (const trig of REQUIRED_FILES_TRIGGERS) {
    if (!triggerNames.has(trig)) {
      throw new Error(`Restore verification failed: Write-once immutability trigger missing: ${trig}`);
    }
  }

  // Verify immutability actively throws on attempt to update
  try {
    const hasRow = filesDb.prepare('SELECT id FROM file_objects LIMIT 1').get() as { id: string } | undefined;
    if (hasRow) {
      filesDb.exec(`UPDATE file_objects SET mime = 'malicious/mime' WHERE id = '${hasRow.id}';`);
      throw new Error('Expected UPDATE on file_objects to abort, but it succeeded');
    }
  } catch (err: unknown) {
    const msg = String(err);
    if (!msg.toLowerCase().includes('write-once')) {
      throw err;
    }
  }

  return {
    success: true,
    dbTableCount: dbTablesResult.length,
    filesTableCount: filesTablesResult.length,
    immutabilityVerified: true,
  };
}

// CLI execution helper
if (process.argv[1]?.includes('verify-d1-restore')) {
  const dbFile = process.argv[2];
  const filesFile = process.argv[3];
  if (dbFile && filesFile) {
    const dbSql = fs.readFileSync(dbFile, 'utf8');
    const filesSql = fs.readFileSync(filesFile, 'utf8');
    const res = verifyD1Restore(dbSql, filesSql);
    console.log(`✓ Restore verification successful: ${res.dbTableCount} clinical tables, ${res.filesTableCount} file tables, immutability verified.`);
  }
}
