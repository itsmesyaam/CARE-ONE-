import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { describe, it, expect, beforeEach } from 'vitest';

describe('Phase 2 Task 3: Automated Audit Triggers', () => {
  const schemaPath = path.resolve(__dirname, '../../migrations/0001_schema.sql');
  const guardsPath = path.resolve(__dirname, '../../migrations/0002_guards.sql');
  const auditTriggersPath = path.resolve(__dirname, '../../migrations/0003_audit_triggers.sql');
  const scriptPath = path.resolve(__dirname, '../../scripts/gen-audit-triggers.ts');

  let db: DatabaseSync;

  beforeEach(() => {
    db = new DatabaseSync(':memory:');
    db.exec(fs.readFileSync(schemaPath, 'utf8'));
    db.exec(fs.readFileSync(guardsPath, 'utf8'));
    if (fs.existsSync(auditTriggersPath)) {
      db.exec(fs.readFileSync(auditTriggersPath, 'utf8'));
    }
  });

  it('scripts/gen-audit-triggers.ts and migrations/0003_audit_triggers.sql exist', () => {
    expect(fs.existsSync(scriptPath), 'scripts/gen-audit-triggers.ts must exist').toBe(true);
    expect(fs.existsSync(auditTriggersPath), 'migrations/0003_audit_triggers.sql must exist').toBe(true);
  });

  it('aborts insert into a clinical table when _request_ctx is empty', () => {
    db.exec(`
      INSERT INTO patients (id, uhid, full_name, dob, gender, phone)
      VALUES ('p-10', 'ABC-1010', 'Audit Test Patient', '1985-05-05', 'female', '9847000010');

      INSERT INTO staff (id, user_id, role, full_name)
      VALUES ('s-10', 'u-10', 'doctor', 'Dr. Audit');
    `);

    // No _request_ctx row set
    expect(() => {
      db.exec(`
        INSERT INTO encounters (id, patient_id, doctor_id, status, chief_complaint)
        VALUES ('enc-audit-1', 'p-10', 's-10', 'draft', 'Headache');
      `);
    }).toThrow(/Direct mutation prohibited without active _request_ctx/i);
  });

  it('allows insert into a clinical table when _request_ctx is active and writes audit_log row', () => {
    db.exec(`
      INSERT INTO patients (id, uhid, full_name, dob, gender, phone)
      VALUES ('p-10', 'ABC-1010', 'Audit Test Patient', '1985-05-05', 'female', '9847000010');

      INSERT INTO staff (id, user_id, role, full_name)
      VALUES ('s-10', 'u-10', 'doctor', 'Dr. Audit');

      INSERT INTO _request_ctx (id, actor_id, role, request_id)
      VALUES (1, 'doc-actor-1', 'doctor', 'req-audit-100');

      INSERT INTO encounters (id, patient_id, doctor_id, status, chief_complaint)
      VALUES ('enc-audit-1', 'p-10', 's-10', 'draft', 'Headache');
    `);

    const auditRow = db.prepare(`
      SELECT * FROM audit_log WHERE table_name = 'encounters' AND record_id = 'enc-audit-1'
    `).get() as {
      actor_id: string;
      action: string;
      patient_id: string;
      old_row: string | null;
      new_row: string;
    };

    expect(auditRow).toBeDefined();
    expect(auditRow.actor_id).toBe('doc-actor-1');
    expect(auditRow.action).toBe('INSERT');
    expect(auditRow.patient_id).toBe('p-10');
    expect(auditRow.old_row).toBeNull();

    const parsedNew = JSON.parse(auditRow.new_row);
    expect(parsedNew.id).toBe('enc-audit-1');
    expect(parsedNew.chief_complaint).toBe('Headache');
  });

  it('aborts update on a clinical table when _request_ctx is empty', () => {
    db.exec(`
      INSERT INTO patients (id, uhid, full_name, dob, gender, phone)
      VALUES ('p-11', 'ABC-1011', 'Audit Test Patient 2', '1985-05-05', 'female', '9847000011');

      INSERT INTO staff (id, user_id, role, full_name)
      VALUES ('s-11', 'u-11', 'doctor', 'Dr. Audit 2');

      INSERT INTO _request_ctx (id, actor_id, role, request_id)
      VALUES (1, 'doc-actor-1', 'doctor', 'req-init');

      INSERT INTO encounters (id, patient_id, doctor_id, status, chief_complaint)
      VALUES ('enc-audit-2', 'p-11', 's-11', 'draft', 'Fever');

      DELETE FROM _request_ctx WHERE id = 1;
    `);

    // _request_ctx now cleared
    expect(() => {
      db.exec(`
        UPDATE encounters SET chief_complaint = 'High Fever' WHERE id = 'enc-audit-2';
      `);
    }).toThrow(/Direct mutation prohibited without active _request_ctx/i);
  });

  it('allows update on a clinical table when _request_ctx is active and writes update audit_log row', () => {
    db.exec(`
      INSERT INTO patients (id, uhid, full_name, dob, gender, phone)
      VALUES ('p-12', 'ABC-1012', 'Audit Test Patient 3', '1985-05-05', 'female', '9847000012');

      INSERT INTO staff (id, user_id, role, full_name)
      VALUES ('s-12', 'u-12', 'doctor', 'Dr. Audit 3');

      INSERT INTO _request_ctx (id, actor_id, role, request_id)
      VALUES (1, 'doc-actor-1', 'doctor', 'req-1');

      INSERT INTO conditions (id, patient_id, doctor_id, name, status)
      VALUES ('cond-1', 'p-12', 's-12', 'Diabetes', 'active');

      UPDATE _request_ctx SET actor_id = 'doc-actor-2', request_id = 'req-2' WHERE id = 1;

      UPDATE conditions SET status = 'resolved' WHERE id = 'cond-1';
    `);

    const updateAudit = db.prepare(`
      SELECT * FROM audit_log WHERE table_name = 'conditions' AND action = 'UPDATE' AND record_id = 'cond-1'
    `).get() as {
      actor_id: string;
      action: string;
      patient_id: string;
      old_row: string;
      new_row: string;
    };

    expect(updateAudit).toBeDefined();
    expect(updateAudit.actor_id).toBe('doc-actor-2');
    expect(updateAudit.action).toBe('UPDATE');
    expect(updateAudit.patient_id).toBe('p-12');

    const oldJson = JSON.parse(updateAudit.old_row);
    const newJson = JSON.parse(updateAudit.new_row);
    expect(oldJson.status).toBe('active');
    expect(newJson.status).toBe('resolved');
  });
});
