-- Migration: 0014_seed_demo_users.sql
-- Description: Seed initial demo accounts for MVP username/password login
-- Password for all accounts: DemoPassword123!
-- PBKDF2-SHA-256 with 50,000 iterations and constant-time verification

-- Align staff email for Dr. Thomas
UPDATE staff SET email = 'dr.thomas@example.com' WHERE id = 'b0000000-0000-0000-0000-000000000005';

-- Insert demo staff and patient users
INSERT INTO users (
  id, username, role, record_id, password_hash, password_salt, password_iterations,
  must_change_password, failed_attempts, locked_until, session_version, is_active, updated_at
)
VALUES
  -- 1. Hospital Admin
  ('b0000000-0000-0000-0000-000000000001', 'admin@example.com', 'admin', 'b0000000-0000-0000-0000-000000000001',
   'c5b6dd60a6649950030986e79396c173fa8026ba4eeb5b926b8379c941d3a870', '162570af318d608e9f424fa910814aa4', 50000,
   0, 0, NULL, 1, 1, datetime('now')),

  -- 2. Front Desk
  ('b0000000-0000-0000-0000-000000000002', 'desk@example.com', 'front_desk', 'b0000000-0000-0000-0000-000000000002',
   'c5b6dd60a6649950030986e79396c173fa8026ba4eeb5b926b8379c941d3a870', '162570af318d608e9f424fa910814aa4', 50000,
   0, 0, NULL, 1, 1, datetime('now')),

  -- 3. Dr. Rahul Menon
  ('b0000000-0000-0000-0000-000000000003', 'dr.rahul@example.com', 'doctor', 'b0000000-0000-0000-0000-000000000003',
   'c5b6dd60a6649950030986e79396c173fa8026ba4eeb5b926b8379c941d3a870', '162570af318d608e9f424fa910814aa4', 50000,
   0, 0, NULL, 1, 1, datetime('now')),

  -- 4. Dr. Anjali Pillai
  ('b0000000-0000-0000-0000-000000000004', 'dr.anjali@example.com', 'doctor', 'b0000000-0000-0000-0000-000000000004',
   'c5b6dd60a6649950030986e79396c173fa8026ba4eeb5b926b8379c941d3a870', '162570af318d608e9f424fa910814aa4', 50000,
   0, 0, NULL, 1, 1, datetime('now')),

  -- 5. Dr. Thomas Varghese
  ('b0000000-0000-0000-0000-000000000005', 'dr.thomas@example.com', 'doctor', 'b0000000-0000-0000-0000-000000000005',
   'c5b6dd60a6649950030986e79396c173fa8026ba4eeb5b926b8379c941d3a870', '162570af318d608e9f424fa910814aa4', 50000,
   0, 0, NULL, 1, 1, datetime('now')),

  -- 6. Arun Kumar (Patient)
  ('e0000000-0000-0000-0000-000000000001', 'ABC-1001', 'patient', 'e0000000-0000-0000-0000-000000000001',
   'c5b6dd60a6649950030986e79396c173fa8026ba4eeb5b926b8379c941d3a870', '162570af318d608e9f424fa910814aa4', 50000,
   0, 0, NULL, 1, 1, datetime('now')),

  -- 7. Sujatha Nair (Guardian of Baby Meenakshi)
  ('e0000000-0000-0000-0000-000000000002', 'ABC-1002', 'guardian', 'e0000000-0000-0000-0000-000000000002',
   'c5b6dd60a6649950030986e79396c173fa8026ba4eeb5b926b8379c941d3a870', '162570af318d608e9f424fa910814aa4', 50000,
   0, 0, NULL, 1, 1, datetime('now'))
ON CONFLICT (id) DO UPDATE SET
  username = excluded.username,
  role = excluded.role,
  record_id = excluded.record_id,
  password_hash = excluded.password_hash,
  password_salt = excluded.password_salt,
  password_iterations = excluded.password_iterations,
  must_change_password = 0,
  failed_attempts = 0,
  locked_until = NULL,
  is_active = 1,
  updated_at = datetime('now');
