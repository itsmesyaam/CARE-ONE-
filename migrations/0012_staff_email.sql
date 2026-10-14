-- Migration: 0012_staff_email.sql
-- Description: Add email column to staff table for staff passkey onboarding and identity mapping

ALTER TABLE staff ADD COLUMN email TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_staff_email ON staff(email);

-- Populate known staff emails for initial directory
UPDATE staff SET email = 'admin@example.com' WHERE id = 'b0000000-0000-0000-0000-000000000001';
UPDATE staff SET email = 'desk@example.com' WHERE id = 'b0000000-0000-0000-0000-000000000002';
UPDATE staff SET email = 'dr.rahul@example.com' WHERE id = 'b0000000-0000-0000-0000-000000000003';
UPDATE staff SET email = 'dr.anjali@example.com' WHERE id = 'b0000000-0000-0000-0000-000000000004';
UPDATE staff SET email = 'thomas@example.com' WHERE id = 'b0000000-0000-0000-0000-000000000005';
UPDATE staff SET email = 'kavitha@example.com' WHERE id = 'b0000000-0000-0000-0000-000000000006';
