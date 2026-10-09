import { describe, it, expect, beforeEach } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';

describe('D1 Database Triggers and Schema Rules', () => {
  let db: DatabaseSync;

  beforeEach(() => {
    db = new DatabaseSync(':memory:');
    const migrationPath = path.resolve(import.meta.dirname, '../../migrations/0001_initial_schema.sql');
    const sql = fs.readFileSync(migrationPath, 'utf-8');
    db.exec(sql);

    const m3Path = path.resolve(import.meta.dirname, '../../migrations/0003_staff_auth_credentials.sql');
    if (fs.existsSync(m3Path)) {
      db.exec(fs.readFileSync(m3Path, 'utf-8'));
    }
  });

  describe('audit_log immutability triggers', () => {
    it('allows INSERT into audit_log but rejects UPDATE with an error', () => {
      db.exec(`
        INSERT INTO audit_log (id, action, actor_id, table_name, record_id, reason)
        VALUES ('log-1', 'create', 'user-1', 'patients', 'pat-1', 'test');
      `);

      expect(() => {
        db.exec("UPDATE audit_log SET action = 'tampered' WHERE id = 'log-1';");
      }).toThrow(/append-only/i);
    });

    it('rejects DELETE on audit_log with an error', () => {
      db.exec(`
        INSERT INTO audit_log (id, action, actor_id, table_name, record_id, reason)
        VALUES ('log-2', 'view', 'user-1', 'patients', 'pat-1', 'test');
      `);

      expect(() => {
        db.exec("DELETE FROM audit_log WHERE id = 'log-2';");
      }).toThrow(/append-only/i);
    });
  });

  describe('frozen signed clinical notes triggers', () => {
    beforeEach(() => {
      db.exec(`
        INSERT OR IGNORE INTO departments (id, name, code) VALUES ('dept-enc', 'General Medicine', 'GEN_ENC');
        INSERT OR IGNORE INTO staff (id, user_id, full_name, role, department_id)
        VALUES ('doc-1', 'u-doc-1', 'Dr. Rahul', 'doctor', 'dept-enc');
      `);
    });

    it('allows updating a draft encounter note', () => {
      db.exec(`
        INSERT INTO patients (id, mrn, full_name, date_of_birth, gender)
        VALUES ('pat-enc', 'MRN001', 'Test Patient', '1980-01-01', 'female');
        INSERT INTO encounters (id, patient_id, doctor_id, status, subjective, objective, assessment, plan)
        VALUES ('enc-1', 'pat-enc', 'doc-1', 'draft', 'Draft note', 'Obs', 'Assessment', 'Plan');
      `);

      db.exec("UPDATE encounters SET subjective = 'Updated draft note' WHERE id = 'enc-1';");
      const row = db.prepare("SELECT subjective FROM encounters WHERE id = 'enc-1'").get() as { subjective: string };
      expect(row.subjective).toBe('Updated draft note');
    });

    it('rejects UPDATE on encounters once signed', () => {
      db.exec(`
        INSERT INTO patients (id, mrn, full_name, date_of_birth, gender)
        VALUES ('pat-enc2', 'MRN002', 'Test Patient 2', '1985-05-05', 'male');
        INSERT INTO encounters (id, patient_id, doctor_id, status, subjective, objective, assessment, plan)
        VALUES ('enc-signed', 'pat-enc2', 'doc-1', 'signed', 'Final note', 'Obs', 'Assessment', 'Plan');
      `);

      expect(() => {
        db.exec("UPDATE encounters SET subjective = 'Tampered signed note' WHERE id = 'enc-signed';");
      }).toThrow(/frozen/i);
    });

    it('rejects DELETE on signed encounters', () => {
      db.exec(`
        INSERT INTO patients (id, mrn, full_name, date_of_birth, gender)
        VALUES ('pat-enc3', 'MRN003', 'Test Patient 3', '1990-09-09', 'female');
        INSERT INTO encounters (id, patient_id, doctor_id, status, subjective, objective, assessment, plan)
        VALUES ('enc-signed-del', 'pat-enc3', 'doc-1', 'signed', 'Final note', 'Obs', 'Assessment', 'Plan');
      `);

      expect(() => {
        db.exec("DELETE FROM encounters WHERE id = 'enc-signed-del';");
      }).toThrow(/frozen/i);
    });
  });

  describe('appointment booking care-team trigger', () => {
    it('automatically adds doctor to care_team when appointment is booked', () => {
      db.exec(`
        INSERT INTO departments (id, name, code) VALUES ('dept-1', 'General Medicine', 'GEN');
        INSERT INTO staff (id, user_id, full_name, role, department_id)
        VALUES ('staff-doc', 'auth-doc', 'Dr. Rahul', 'doctor', 'dept-1');
        INSERT INTO patients (id, mrn, full_name, date_of_birth, gender)
        VALUES ('pat-appt', 'MRN-APPT-1', 'Patient Booking', '1992-02-02', 'male');

        INSERT INTO appointments (id, patient_id, doctor_id, start_time, end_time, status)
        VALUES ('appt-1', 'pat-appt', 'staff-doc', '2026-10-15T10:00:00Z', '2026-10-15T10:30:00Z', 'scheduled');
      `);

      const careTeamRow = db.prepare(`
        SELECT patient_id, staff_id, active FROM care_team
        WHERE patient_id = 'pat-appt' AND staff_id = 'staff-doc'
      `).get() as { patient_id: string; staff_id: string; active: number };

      expect(careTeamRow).toBeDefined();
      expect(careTeamRow.patient_id).toBe('pat-appt');
      expect(careTeamRow.staff_id).toBe('staff-doc');
      expect(careTeamRow.active).toBe(1);
    });
  });

  describe('approved diet guide freeze triggers', () => {
    it('allows updating a draft diet guide', () => {
      db.exec(`
        INSERT INTO diet_guides (id, title_en, title_ml, eat_more_en, eat_more_ml, eat_less_en, eat_less_ml, avoid_en, avoid_ml, tips_en, tips_ml, status)
        VALUES ('dg-draft', 'Draft Guide', 'കരട്', 'Veggies', 'പച്ചക്കറികൾ', 'Sugar', 'പഞ്ചസാര', 'Alcohol', 'മദ്യം', 'Hydrate', 'വെള്ളം കുടിക്കുക', 'draft');
      `);

      db.exec("UPDATE diet_guides SET title_en = 'Updated Draft' WHERE id = 'dg-draft';");
      const row = db.prepare("SELECT title_en FROM diet_guides WHERE id = 'dg-draft'").get() as { title_en: string };
      expect(row.title_en).toBe('Updated Draft');
    });

    it('rejects UPDATE on approved diet guide with an error', () => {
      db.exec(`
        INSERT INTO diet_guides (id, title_en, title_ml, eat_more_en, eat_more_ml, eat_less_en, eat_less_ml, avoid_en, avoid_ml, tips_en, tips_ml, status)
        VALUES ('dg-approved', 'Diabetes Guide', 'പ്രമേഹ ഗൈഡ്', 'Veggies', 'പച്ചക്കറികൾ', 'Sugar', 'പഞ്ചസാര', 'Alcohol', 'മദ്യം', 'Walk', 'നടക്കുക', 'approved');
      `);

      expect(() => {
        db.exec("UPDATE diet_guides SET title_en = 'Tampered Guide' WHERE id = 'dg-approved';");
      }).toThrow(/frozen/i);
    });
  });
});
