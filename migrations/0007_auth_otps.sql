-- CareOne D1 Migration: Auth OTPs Table & Indexes
-- Enforces single-use, 10-minute expiry, and 15-minute lock on 5 failed attempts

CREATE TABLE IF NOT EXISTS auth_otps (
  id TEXT PRIMARY KEY,
  identifier TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  plain_code TEXT,
  purpose TEXT NOT NULL DEFAULT 'patient', -- 'patient' | 'staff'
  expires_at TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  locked_until TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_auth_otps_identifier ON auth_otps (identifier);
