import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { describe, it, expect, beforeEach } from 'vitest';

describe('Phase 2 Task 4: Port Demo Seed Data to SQLite', () => {
  const schemaPath = path.resolve(__dirname, '../../migrations/0001_schema.sql');
  const guardsPath = path.resolve(__dirname, '../../migrations/0002_guards.sql');
  const auditTriggersPath = path.resolve(__dirname, '../../migrations/0003_audit_triggers.sql');
  const seedPath = path.resolve(__dirname, '../../seed/seed.sql');

  let db: DatabaseSync;

  beforeEach(() => {
    db = new DatabaseSync(':memory:');
    db.exec(fs.readFileSync(schemaPath, 'utf8'));
    db.exec(fs.readFileSync(guardsPath, 'utf8'));
    db.exec(fs.readFileSync(auditTriggersPath, 'utf8'));
  });

  it('seed/seed.sql exists', () => {
    expect(fs.existsSync(seedPath), 'seed/seed.sql must exist').toBe(true);
  });

  it('executes seed/seed.sql cleanly and populates all demo tables', () => {
    const seedSql = fs.readFileSync(seedPath, 'utf8');
    expect(() => {
      db.exec(seedSql);
    }).not.toThrow();

    // Verify row counts
    const count = (table: string) => {
      const row = db.prepare(`SELECT count(*) as cnt FROM ${table}`).get() as { cnt: number };
      return row.cnt;
    };

    expect(count('hospital_settings')).toBe(1);
    expect(count('departments')).toBe(5);
    expect(count('staff')).toBe(6);
    expect(count('patients')).toBe(21);
    expect(count('patient_access')).toBe(3);
    expect(count('consents')).toBe(3);
    expect(count('care_team')).toBe(5);
    expect(count('encounters')).toBe(5);
    expect(count('conditions')).toBe(2);
    expect(count('allergies')).toBe(1);
    expect(count('medications')).toBe(2);
    expect(count('observations')).toBe(8);
    expect(count('care_plans')).toBe(2);
    expect(count('care_plan_items')).toBe(3);
    expect(count('documents')).toBe(2);
    expect(count('symptom_reports')).toBe(2);
    expect(count('appointments')).toBe(5);
    expect(count('diet_guides')).toBe(3);

    // Verify _request_ctx is cleaned up after seeding
    expect(count('_request_ctx')).toBe(0);

    // Verify Arun Kumar's primary demo clinical story
    const arun = db.prepare("SELECT * FROM patients WHERE uhid = 'ABC-1001'").get() as {
      id: string;
      full_name: string;
    };
    expect(arun.full_name).toBe('Arun Kumar');

    const arunEncounters = db
      .prepare("SELECT count(*) as cnt FROM encounters WHERE patient_id = ? AND status = 'signed'")
      .get(arun.id) as { cnt: number };
    expect(arunEncounters.cnt).toBe(3);

    const arunAllergy = db
      .prepare('SELECT substance FROM allergies WHERE patient_id = ?')
      .get(arun.id) as { substance: string };
    expect(arunAllergy.substance).toBe('Penicillin');
  });
});
