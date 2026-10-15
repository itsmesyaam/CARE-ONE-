// @vitest-environment node
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { describe, it, expect, beforeEach } from 'vitest';

describe('Phase 2 Task 2: Schema Integrity Guards & Immutability Triggers', () => {
  const schemaPath = path.resolve(__dirname, '../../migrations/0001_schema.sql');
  const guardsPath = path.resolve(__dirname, '../../migrations/0002_guards.sql');

  let db: DatabaseSync;

  beforeEach(() => {
    db = new DatabaseSync(':memory:');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    db.exec(schemaSql);
    if (fs.existsSync(guardsPath)) {
      const guardsSql = fs.readFileSync(guardsPath, 'utf8');
      db.exec(guardsSql);
    }
  });

  it('migrations/0002_guards.sql exists', () => {
    expect(fs.existsSync(guardsPath), 'migrations/0002_guards.sql must exist').toBe(true);
  });

  it('enforces _request_ctx singleton table structure with id = 1 check', () => {
    // Should allow inserting id = 1
    db.exec(
      "INSERT INTO _request_ctx (id, actor_id, role, request_id) VALUES (1, 'user-1', 'doctor', 'req-1');"
    );

    // Should reject inserting id != 1
    expect(() => {
      db.exec(
        "INSERT INTO _request_ctx (id, actor_id, role, request_id) VALUES (2, 'user-2', 'doctor', 'req-2');"
      );
    }).toThrow();
  });

  it('aborts when attempting to update a signed encounter', () => {
    db.exec(`
      INSERT INTO patients (id, uhid, full_name, dob, gender, phone)
      VALUES ('p-1', 'ABC-1001', 'Test Patient', '1980-01-01', 'male', '9847000001');

      INSERT INTO staff (id, user_id, role, full_name)
      VALUES ('s-1', 'u-1', 'doctor', 'Dr. Rahul');

      INSERT INTO encounters (id, patient_id, doctor_id, status, chief_complaint)
      VALUES ('enc-1', 'p-1', 's-1', 'signed', 'Initial complaint');
    `);

    expect(() => {
      db.exec("UPDATE encounters SET chief_complaint = 'Changed complaint' WHERE id = 'enc-1';");
    }).toThrow(/Signed consultation encounters cannot be modified/i);
  });

  it('allows updating a draft encounter', () => {
    db.exec(`
      INSERT INTO patients (id, uhid, full_name, dob, gender, phone)
      VALUES ('p-2', 'ABC-1002', 'Test Patient 2', '1980-01-01', 'male', '9847000002');

      INSERT INTO staff (id, user_id, role, full_name)
      VALUES ('s-2', 'u-2', 'doctor', 'Dr. Rahul');

      INSERT INTO encounters (id, patient_id, doctor_id, status, chief_complaint)
      VALUES ('enc-2', 'p-2', 's-2', 'draft', 'Draft complaint');
    `);

    db.exec("UPDATE encounters SET chief_complaint = 'Updated draft complaint' WHERE id = 'enc-2';");
    const row = db.prepare("SELECT chief_complaint FROM encounters WHERE id = 'enc-2'").get() as {
      chief_complaint: string;
    };
    expect(row.chief_complaint).toBe('Updated draft complaint');
  });

  it('aborts when attempting to delete from any clinical table', () => {
    db.exec(`
      INSERT INTO patients (id, uhid, full_name, dob, gender, phone)
      VALUES ('p-clin', 'ABC-1099', 'Clinical Test', '1990-01-01', 'female', '9847000099');

      INSERT INTO staff (id, user_id, role, full_name)
      VALUES ('s-clin', 'u-clin', 'doctor', 'Dr. Clin');

      INSERT INTO encounters (id, patient_id, doctor_id, status)
      VALUES ('e-clin', 'p-clin', 's-clin', 'draft');

      INSERT INTO encounter_addenda (id, encounter_id, patient_id, doctor_id, reason, notes)
      VALUES ('add-1', 'e-clin', 'p-clin', 's-clin', 'Correction', 'Corrected note');

      INSERT INTO conditions (id, patient_id, doctor_id, name)
      VALUES ('c-1', 'p-clin', 's-clin', 'Hypertension');

      INSERT INTO allergies (id, patient_id, substance)
      VALUES ('al-1', 'p-clin', 'Penicillin');

      INSERT INTO medications (id, patient_id, doctor_id, drug, dose)
      VALUES ('m-1', 'p-clin', 's-clin', 'Amlodipine', '5mg');

      INSERT INTO observations (id, patient_id, kind, value_text)
      VALUES ('o-1', 'p-clin', 'Blood Pressure', '120/80');

      INSERT INTO documents (id, patient_id, storage_path, title, mime_type)
      VALUES ('d-1', 'p-clin', 'p-clin/doc1.pdf', 'Lab Report', 'application/pdf');

      INSERT INTO care_plans (id, patient_id, doctor_id)
      VALUES ('cp-1', 'p-clin', 's-clin');

      INSERT INTO care_plan_items (id, care_plan_id, patient_id, kind, detail)
      VALUES ('cpi-1', 'cp-1', 'p-clin', 'instruction', 'Walk daily');

      INSERT INTO symptom_reports (id, patient_id, description)
      VALUES ('sym-1', 'p-clin', 'Headache');

      INSERT INTO diet_guides (id, title_en, title_ml, eat_more_en, eat_more_ml, eat_less_en, eat_less_ml, avoid_en, avoid_ml, tips_en, tips_ml)
      VALUES ('dg-1', 'Diet', 'ഭക്ഷണം', 'Veg', 'പച്ചക്കറി', 'Sugar', 'പഞ്ചസാര', 'Salt', 'ഉപ്പ്', 'Tips', 'വിവരം');
    `);

    const clinicalDeletes = [
      "DELETE FROM encounters WHERE id = 'e-clin'",
      "DELETE FROM encounter_addenda WHERE id = 'add-1'",
      "DELETE FROM conditions WHERE id = 'c-1'",
      "DELETE FROM allergies WHERE id = 'al-1'",
      "DELETE FROM medications WHERE id = 'm-1'",
      "DELETE FROM observations WHERE id = 'o-1'",
      "DELETE FROM documents WHERE id = 'd-1'",
      "DELETE FROM care_plans WHERE id = 'cp-1'",
      "DELETE FROM care_plan_items WHERE id = 'cpi-1'",
      "DELETE FROM symptom_reports WHERE id = 'sym-1'",
      "DELETE FROM diet_guides WHERE id = 'dg-1'",
    ];

    for (const deleteSql of clinicalDeletes) {
      expect(() => {
        db.exec(deleteSql);
      }).toThrow(/Clinical records cannot be deleted/i);
    }
  });

  it('aborts when attempting to update or delete rows in audit_log', () => {
    db.exec(`
      INSERT INTO audit_log (id, action, table_name, reason)
      VALUES (101, 'TEST_ACTION', 'test_table', 'Initial log entry');
    `);

    expect(() => {
      db.exec("UPDATE audit_log SET reason = 'Tampered log' WHERE id = 101;");
    }).toThrow(/Audit log is append-only and cannot be updated/i);

    expect(() => {
      db.exec("DELETE FROM audit_log WHERE id = 101;");
    }).toThrow(/Audit log is append-only and cannot be deleted/i);
  });
});
