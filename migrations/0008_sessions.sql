-- CareOne D1 Migration: Sessions & Token Version for Immediate Revocation
-- Enables instantaneous sign-out everywhere and immediate lockout when disabled

ALTER TABLE staff ADD COLUMN token_version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE patients ADD COLUMN token_version INTEGER NOT NULL DEFAULT 1;

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  role TEXT NOT NULL,
  token_version INTEGER NOT NULL DEFAULT 1,
  expires_at TEXT NOT NULL,
  revoked_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_sessions_actor_id ON sessions (actor_id);
