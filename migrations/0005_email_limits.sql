-- ============================================================================
-- Migration: 0005_email_limits.sql
-- Description: Daily Email Quota Tracking and Append-Only Email Operational Logs
-- Enforces Resend free plan ceiling (95 emails/day) and anonymized logging
-- ============================================================================

-- 1. Daily email quota tracking table
CREATE TABLE IF NOT EXISTS email_daily_counts (
  date TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 0 CHECK (count >= 0),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 2. Email operational audit log table (stores hashed recipient to protect patient privacy)
CREATE TABLE IF NOT EXISTS email_logs (
  id TEXT PRIMARY KEY,
  recipient_hash TEXT NOT NULL,
  template TEXT NOT NULL,
  subject TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('sent', 'rate_limited', 'failed')),
  error_message TEXT,
  sent_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_email_logs_sent_at ON email_logs(sent_at);

-- 3. Immutability guards on email_logs (append-only)
CREATE TRIGGER IF NOT EXISTS trg_email_logs_no_update
BEFORE UPDATE ON email_logs
FOR EACH ROW
BEGIN
  SELECT RAISE(ABORT, 'email_logs rows are append-only and cannot be updated');
END;

CREATE TRIGGER IF NOT EXISTS trg_email_logs_no_delete
BEFORE DELETE ON email_logs
FOR EACH ROW
BEGIN
  SELECT RAISE(ABORT, 'email_logs rows cannot be deleted');
END;
