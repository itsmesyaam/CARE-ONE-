-- Migration: 0011_drop_auth_otps.sql
-- Removes the legacy one-time password / code verification table
-- in favor of WebAuthn passkeys (fingerprint / face / security key).

DROP TABLE IF EXISTS auth_otps;
