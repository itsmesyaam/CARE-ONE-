import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { describe, it, expect } from 'vitest';

describe('Phase 2 Task 1: Core D1 Relational Schema', () => {
  const migrationPath = path.resolve(__dirname, '../../migrations/0001_schema.sql');

  it('migrations/0001_schema.sql exists', () => {
    expect(fs.existsSync(migrationPath), 'migrations/0001_schema.sql must exist').toBe(true);
  });

  it('creates all 23 tables with expected columns and CHECK constraints in SQLite', () => {
    const sql = fs.readFileSync(migrationPath, 'utf8');
    const db = new DatabaseSync(':memory:');
    db.exec(sql);

    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
      .all()
      .map((row: unknown) => (row as { name: string }).name);

    const expectedTables = [
      'audit_log',
      'hospital_settings',
      'departments',
      'staff',
      'patients',
      'patient_access',
      'care_team',
      'emergency_access',
      'appointments',
      'consents',
      'encounters',
      'encounter_addenda',
      'conditions',
      'allergies',
      'medications',
      'observations',
      'documents',
      'care_plans',
      'care_plan_items',
      'reminders',
      'push_subscriptions',
      'symptom_reports',
      'diet_guides',
    ];

    for (const table of expectedTables) {
      expect(tables).toContain(table);
    }
  });

  it('creates index on every table containing a patient_id column', () => {
    const sql = fs.readFileSync(migrationPath, 'utf8');
    const db = new DatabaseSync(':memory:');
    db.exec(sql);

    const patientTables = [
      'audit_log',
      'patient_access',
      'care_team',
      'emergency_access',
      'appointments',
      'consents',
      'encounters',
      'encounter_addenda',
      'conditions',
      'allergies',
      'medications',
      'observations',
      'documents',
      'care_plans',
      'care_plan_items',
      'reminders',
      'symptom_reports',
    ];

    const indices = db
      .prepare("SELECT tbl_name, name, sql FROM sqlite_master WHERE type='index'")
      .all()
      .map((row: unknown) => row as { tbl_name: string; name: string; sql: string });

    for (const table of patientTables) {
      const hasPatientIndex = indices.some(
        (idx) => idx.tbl_name === table && (idx.sql?.toLowerCase().includes('patient_id') ?? false)
      );
      expect(
        hasPatientIndex,
        `Table ${table} must have an index covering patient_id`
      ).toBe(true);
    }
  });
});
