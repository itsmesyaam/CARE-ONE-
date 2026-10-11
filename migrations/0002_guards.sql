-- ============================================================================
-- Migration: 0002_guards.sql
-- Description: Integrity Guards & Immutability Triggers (SQLite)
-- 1. _request_ctx singleton table for tracking authenticated request context
-- 2. Freeze trigger on signed encounters
-- 3. Hard delete prevention on clinical tables
-- 4. Immutability triggers on audit_log
-- ============================================================================

-- 1. Request Context Singleton Table
-- Holds the actor, role, and request ID for the current transaction
CREATE TABLE IF NOT EXISTS _request_ctx (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  actor_id TEXT NOT NULL,
  role TEXT NOT NULL,
  request_id TEXT NOT NULL
);

-- 2. Freeze Trigger for Signed Encounters
-- Prevents editing consultation notes once signed; corrections must use encounter_addenda
CREATE TRIGGER IF NOT EXISTS trg_encounters_freeze_signed
BEFORE UPDATE ON encounters
FOR EACH ROW
WHEN OLD.status = 'signed'
BEGIN
  SELECT RAISE(ABORT, 'Signed consultation encounters cannot be modified; use addenda instead');
END;

-- 3. Delete Guards on Clinical Tables
-- Clinical data must never be hard deleted; soft delete with deleted_at or preserve history

CREATE TRIGGER IF NOT EXISTS trg_encounters_no_delete
BEFORE DELETE ON encounters
FOR EACH ROW
BEGIN
  SELECT RAISE(ABORT, 'Clinical records cannot be deleted; soft delete using deleted_at instead');
END;

CREATE TRIGGER IF NOT EXISTS trg_encounter_addenda_no_delete
BEFORE DELETE ON encounter_addenda
FOR EACH ROW
BEGIN
  SELECT RAISE(ABORT, 'Clinical records cannot be deleted; soft delete using deleted_at instead');
END;

CREATE TRIGGER IF NOT EXISTS trg_conditions_no_delete
BEFORE DELETE ON conditions
FOR EACH ROW
BEGIN
  SELECT RAISE(ABORT, 'Clinical records cannot be deleted; soft delete using deleted_at instead');
END;

CREATE TRIGGER IF NOT EXISTS trg_allergies_no_delete
BEFORE DELETE ON allergies
FOR EACH ROW
BEGIN
  SELECT RAISE(ABORT, 'Clinical records cannot be deleted; soft delete using deleted_at instead');
END;

CREATE TRIGGER IF NOT EXISTS trg_medications_no_delete
BEFORE DELETE ON medications
FOR EACH ROW
BEGIN
  SELECT RAISE(ABORT, 'Clinical records cannot be deleted; soft delete using deleted_at instead');
END;

CREATE TRIGGER IF NOT EXISTS trg_observations_no_delete
BEFORE DELETE ON observations
FOR EACH ROW
BEGIN
  SELECT RAISE(ABORT, 'Clinical records cannot be deleted; soft delete using deleted_at instead');
END;

CREATE TRIGGER IF NOT EXISTS trg_documents_no_delete
BEFORE DELETE ON documents
FOR EACH ROW
BEGIN
  SELECT RAISE(ABORT, 'Clinical records cannot be deleted; soft delete using deleted_at instead');
END;

CREATE TRIGGER IF NOT EXISTS trg_care_plans_no_delete
BEFORE DELETE ON care_plans
FOR EACH ROW
BEGIN
  SELECT RAISE(ABORT, 'Clinical records cannot be deleted; soft delete using deleted_at instead');
END;

CREATE TRIGGER IF NOT EXISTS trg_care_plan_items_no_delete
BEFORE DELETE ON care_plan_items
FOR EACH ROW
BEGIN
  SELECT RAISE(ABORT, 'Clinical records cannot be deleted; soft delete using deleted_at instead');
END;

CREATE TRIGGER IF NOT EXISTS trg_symptom_reports_no_delete
BEFORE DELETE ON symptom_reports
FOR EACH ROW
BEGIN
  SELECT RAISE(ABORT, 'Clinical records cannot be deleted; soft delete using deleted_at instead');
END;

CREATE TRIGGER IF NOT EXISTS trg_diet_guides_no_delete
BEFORE DELETE ON diet_guides
FOR EACH ROW
BEGIN
  SELECT RAISE(ABORT, 'Clinical records cannot be deleted; soft delete using deleted_at instead');
END;

-- 4. Immutability Triggers on audit_log
-- Audit log is append-only: updates and deletes are permanently forbidden

CREATE TRIGGER IF NOT EXISTS trg_audit_log_no_update
BEFORE UPDATE ON audit_log
FOR EACH ROW
BEGIN
  SELECT RAISE(ABORT, 'Audit log is append-only and cannot be updated');
END;

CREATE TRIGGER IF NOT EXISTS trg_audit_log_no_delete
BEFORE DELETE ON audit_log
FOR EACH ROW
BEGIN
  SELECT RAISE(ABORT, 'Audit log is append-only and cannot be deleted');
END;
