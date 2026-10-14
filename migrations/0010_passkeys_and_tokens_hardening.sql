-- ============================================================================
-- Migration: 0010_passkeys_and_tokens_hardening.sql
-- Description: Indexes, audit triggers, and schema hardening for WebAuthn passkeys
-- ============================================================================

-- 1. Index user_id on setup_tokens
CREATE INDEX IF NOT EXISTS idx_setup_tokens_user_id ON setup_tokens(user_id);

-- 2. Audit trigger for INSERT on passkeys
CREATE TRIGGER IF NOT EXISTS trg_audit_insert_passkeys
AFTER INSERT ON passkeys
FOR EACH ROW
BEGIN
  INSERT INTO audit_log (
    at, actor_id, action, table_name, record_id, patient_id, new_row
  )
  VALUES (
    datetime('now'),
    NEW.user_id,
    'PASSKEY_REGISTERED',
    'passkeys',
    NEW.id,
    NEW.user_id,
    json_object(
      'id', NEW.id,
      'user_id', NEW.user_id,
      'credential_id', NEW.credential_id,
      'device_label', NEW.device_label,
      'created_at', NEW.created_at
    )
  );
END;

-- 3. Audit trigger for UPDATE on passkeys (e.g. revocation)
CREATE TRIGGER IF NOT EXISTS trg_audit_update_passkeys
AFTER UPDATE OF revoked_at ON passkeys
FOR EACH ROW
WHEN OLD.revoked_at IS NULL AND NEW.revoked_at IS NOT NULL
BEGIN
  INSERT INTO audit_log (
    at, actor_id, action, table_name, record_id, patient_id, old_row, new_row
  )
  VALUES (
    datetime('now'),
    NEW.user_id,
    'PASSKEY_REVOKED',
    'passkeys',
    NEW.id,
    NEW.user_id,
    json_object('id', OLD.id, 'revoked_at', OLD.revoked_at),
    json_object('id', NEW.id, 'revoked_at', NEW.revoked_at)
  );
END;

-- 4. Audit trigger for INSERT on setup_tokens
CREATE TRIGGER IF NOT EXISTS trg_audit_insert_setup_tokens
AFTER INSERT ON setup_tokens
FOR EACH ROW
BEGIN
  INSERT INTO audit_log (
    at, actor_id, action, table_name, record_id, patient_id, new_row
  )
  VALUES (
    datetime('now'),
    NEW.created_by,
    'SETUP_LINK_CREATED',
    'setup_tokens',
    NEW.id,
    NEW.user_id,
    json_object(
      'id', NEW.id,
      'user_id', NEW.user_id,
      'purpose', NEW.purpose,
      'created_by', NEW.created_by,
      'expires_at', NEW.expires_at
    )
  );
END;

-- 5. Audit trigger for UPDATE on setup_tokens (single-use mark)
CREATE TRIGGER IF NOT EXISTS trg_audit_update_setup_tokens
AFTER UPDATE OF used_at ON setup_tokens
FOR EACH ROW
WHEN OLD.used_at IS NULL AND NEW.used_at IS NOT NULL
BEGIN
  INSERT INTO audit_log (
    at, actor_id, action, table_name, record_id, patient_id, old_row, new_row
  )
  VALUES (
    datetime('now'),
    NEW.user_id,
    'SETUP_TOKEN_USED',
    'setup_tokens',
    NEW.id,
    NEW.user_id,
    json_object('id', OLD.id, 'used_at', OLD.used_at),
    json_object('id', NEW.id, 'used_at', NEW.used_at)
  );
END;
