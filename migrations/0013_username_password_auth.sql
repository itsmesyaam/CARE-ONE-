-- ============================================================================
-- Migration: 0013_username_password_auth.sql
-- Description: Password authentication schema (users table) and cleanup of
--              passkeys, setup_tokens, and webauthn_challenges tables.
-- ============================================================================

-- 1. Unified Users Table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL COLLATE NOCASE UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('patient', 'guardian', 'doctor', 'front_desk', 'admin')),
  record_id TEXT,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  password_iterations INTEGER NOT NULL DEFAULT 50000,
  must_change_password INTEGER NOT NULL DEFAULT 0 CHECK (must_change_password IN (0, 1)),
  failed_attempts INTEGER NOT NULL DEFAULT 0,
  locked_until TEXT,
  password_changed_at TEXT,
  session_version INTEGER NOT NULL DEFAULT 1,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username COLLATE NOCASE);
CREATE INDEX IF NOT EXISTS idx_users_record_id ON users(record_id);

-- 2. Drop Passkeys & WebAuthn Audit Triggers
DROP TRIGGER IF EXISTS trg_audit_insert_passkeys;
DROP TRIGGER IF EXISTS trg_audit_update_passkeys;
DROP TRIGGER IF EXISTS trg_audit_delete_passkeys;
DROP TRIGGER IF EXISTS trg_audit_insert_setup_tokens;
DROP TRIGGER IF EXISTS trg_audit_update_setup_tokens;

-- 3. Drop Passkeys, Setup Tokens, and Challenges Tables
DROP TABLE IF EXISTS passkeys;
DROP TABLE IF EXISTS setup_tokens;
DROP TABLE IF EXISTS webauthn_challenges;
