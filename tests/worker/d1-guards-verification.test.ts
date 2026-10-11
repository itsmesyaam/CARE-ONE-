import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { describe, it, expect, beforeEach } from 'vitest';

describe('Phase 2 Task 5: Comprehensive D1 Guards Verification', () => {
  const schemaPath = path.resolve(__dirname, '../../migrations/0001_schema.sql');
  const guardsPath = path.resolve(__dirname, '../../migrations/0002_guards.sql');
  const triggersPath = path.resolve(__dirname, '../../migrations/0003_audit_triggers.sql');
  const seedPath = path.resolve(__dirname, '../../seed/seed.sql');

  let db: DatabaseSync;

  beforeEach(() => {
    db = new DatabaseSync(':memory:');
    db.exec(fs.readFileSync(schemaPath, 'utf8'));
    db.exec(fs.readFileSync(guardsPath, 'utf8'));
    db.exec(fs.readFileSync(triggersPath, 'utf8'));
    db.exec(fs.readFileSync(seedPath, 'utf8'));
  });

  it('Guard Rule 1: A signed consultation note cannot be updated', () => {
    // Arun Kumar's encounter 1 is signed
    const signedEncId = 'ec000000-0000-0000-0000-000000000001';

    // Set active request context
    db.exec("INSERT OR REPLACE INTO _request_ctx (id, actor_id, role, request_id) VALUES (1, 'doc-1', 'doctor', 'req-1');");

    expect(() => {
      db.exec(`UPDATE encounters SET clinical_notes = 'Tampered notes' WHERE id = '${signedEncId}';`);
    }).toThrow(/Signed consultation encounters cannot be modified/i);

    // Verify notes did not change
    const enc = db.prepare('SELECT clinical_notes FROM encounters WHERE id = ?').get(signedEncId) as { clinical_notes: string };
    expect(enc.clinical_notes).not.toBe('Tampered notes');
  });

  it('Guard Rule 2: A clinical row cannot be deleted across all clinical tables', () => {
    // Set active request context
    db.exec("INSERT OR REPLACE INTO _request_ctx (id, actor_id, role, request_id) VALUES (1, 'admin-1', 'admin', 'req-del');");

    const clinicalDeletes = [
      "DELETE FROM encounters WHERE id = 'ec000000-0000-0000-0000-000000000001'",
      "DELETE FROM conditions WHERE id = 'cd000000-0000-0000-0000-000000000001'",
      "DELETE FROM allergies WHERE id = 'al000000-0000-0000-0000-000000000001'",
      "DELETE FROM medications WHERE id = 'md000000-0000-0000-0000-000000000001'",
      "DELETE FROM observations WHERE id = 'ob000000-0000-0000-0000-000000000001'",
      "DELETE FROM documents WHERE id = 'dc000000-0000-0000-0000-000000000001'",
      "DELETE FROM care_plans WHERE id = 'cc000000-0000-0000-0000-000000000001'",
      "DELETE FROM care_plan_items WHERE id = 'ca000000-0000-0000-0000-000000000001'",
      "DELETE FROM symptom_reports WHERE id = 'sy000000-0000-0000-0000-000000000001'",
      "DELETE FROM diet_guides WHERE id = 'e1111111-1111-1111-1111-111111111111'",
    ];

    for (const sql of clinicalDeletes) {
      expect(() => {
        db.exec(sql);
      }).toThrow(/Clinical records cannot be deleted/i);
    }
  });

  it('Guard Rule 3: audit_log cannot be updated or deleted', () => {
    const firstLog = db.prepare('SELECT id FROM audit_log LIMIT 1').get() as { id: number };
    expect(firstLog).toBeDefined();

    expect(() => {
      db.exec(`UPDATE audit_log SET action = 'ALTERED' WHERE id = ${firstLog.id};`);
    }).toThrow(/Audit log is append-only and cannot be updated/i);

    expect(() => {
      db.exec(`DELETE FROM audit_log WHERE id = ${firstLog.id};`);
    }).toThrow(/Audit log is append-only and cannot be deleted/i);
  });

  it('Guard Rule 4: An insert into any clinical table without _request_ctx fails', () => {
    // Confirm _request_ctx is empty after seed
    const ctxCount = db.prepare('SELECT count(*) as cnt FROM _request_ctx').get() as { cnt: number };
    expect(ctxCount.cnt).toBe(0);

    // Attempt insert into encounters
    expect(() => {
      db.exec(`
        INSERT INTO encounters (id, patient_id, doctor_id, status, chief_complaint)
        VALUES ('enc-no-ctx', 'e0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000003', 'draft', 'No context');
      `);
    }).toThrow(/Direct mutation prohibited without active _request_ctx/i);

    // Attempt insert into medications
    expect(() => {
      db.exec(`
        INSERT INTO medications (id, patient_id, doctor_id, drug, dose)
        VALUES ('med-no-ctx', 'e0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000003', 'Paracetamol', '500mg');
      `);
    }).toThrow(/Direct mutation prohibited without active _request_ctx/i);

    // Attempt insert into observations
    expect(() => {
      db.exec(`
        INSERT INTO observations (id, patient_id, kind, value_text)
        VALUES ('obs-no-ctx', 'e0000000-0000-0000-0000-000000000001', 'Pulse', '72');
      `);
    }).toThrow(/Direct mutation prohibited without active _request_ctx/i);
  });

  it('Complete Workflow: Active _request_ctx allows insert and accurately logs audit entry', () => {
    db.exec("INSERT INTO _request_ctx (id, actor_id, role, request_id) VALUES (1, 'dr-rahul-id', 'doctor', 'req-audit-verify');");

    db.exec(`
      INSERT INTO observations (id, patient_id, kind, value_text, unit, source, out_of_range)
      VALUES ('obs-audit-verify', 'e0000000-0000-0000-0000-000000000001', 'Random Blood Glucose', '180', 'mg/dL', 'clinic', 1);
    `);

    const log = db.prepare(`
      SELECT * FROM audit_log WHERE table_name = 'observations' AND record_id = 'obs-audit-verify'
    `).get() as {
      actor_id: string;
      action: string;
      patient_id: string;
      new_row: string;
    };

    expect(log).toBeDefined();
    expect(log.actor_id).toBe('dr-rahul-id');
    expect(log.action).toBe('INSERT');
    expect(log.patient_id).toBe('e0000000-0000-0000-0000-000000000001');

    const newObj = JSON.parse(log.new_row);
    expect(newObj.kind).toBe('Random Blood Glucose');
    expect(newObj.value_text).toBe('180');
    expect(newObj.out_of_range).toBe(1);
  });
});
