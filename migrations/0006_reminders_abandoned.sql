-- ============================================================================
-- Migration: 0006_reminders_abandoned.sql
-- Description: Expand reminders table status check to include 'abandoned'
-- ============================================================================

PRAGMA foreign_keys=OFF;

CREATE TABLE IF NOT EXISTS reminders_new (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  care_plan_item_id TEXT REFERENCES care_plan_items(id) ON DELETE SET NULL,
  appointment_id TEXT REFERENCES appointments(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  scheduled_for TEXT NOT NULL DEFAULT (datetime('now')),
  channel TEXT NOT NULL DEFAULT 'push' CHECK (channel IN ('push', 'email')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'claimed', 'sent', 'failed', 'abandoned')),
  attempts INTEGER NOT NULL DEFAULT 0,
  last_attempt_at TEXT,
  error_message TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT INTO reminders_new SELECT * FROM reminders;

DROP TABLE reminders;

ALTER TABLE reminders_new RENAME TO reminders;

CREATE INDEX IF NOT EXISTS idx_reminders_patient_id ON reminders(patient_id);
CREATE INDEX IF NOT EXISTS idx_reminders_status_sched ON reminders(status, scheduled_for);

PRAGMA foreign_keys=ON;
