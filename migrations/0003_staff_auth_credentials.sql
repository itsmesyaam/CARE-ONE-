-- ============================================================================
-- CareOne Migration 0003: Staff Email & Deterministic PBKDF2 Hashes
-- ============================================================================

-- 1. Add email column to staff table
ALTER TABLE staff ADD COLUMN email TEXT;

-- 2. Populate demo emails for staff members
UPDATE staff SET email = 'admin@example.com' WHERE id = 'b0000000-0000-0000-0000-000000000001';
UPDATE staff SET email = 'desk@example.com' WHERE id = 'b0000000-0000-0000-0000-000000000002';
UPDATE staff SET email = 'doctor@example.com' WHERE id = 'b0000000-0000-0000-0000-000000000003';
UPDATE staff SET email = 'dr.anjali@example.com' WHERE id = 'b0000000-0000-0000-0000-000000000004';
UPDATE staff SET email = 'dr.thomas@example.com' WHERE id = 'b0000000-0000-0000-0000-000000000005';
UPDATE staff SET email = 'dr.kavitha@example.com' WHERE id = 'b0000000-0000-0000-0000-000000000006';

-- 3. Set standard PBKDF2-SHA256 (10,000 iterations) hashes for DemoPassword123!
UPDATE staff_auth SET
  password_hash = 'b35cf61204fafafb730d2f4aa422e4a91638fcde76b1005a08745e0a781447f3',
  updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE staff_id = 'b0000000-0000-0000-0000-000000000001';

UPDATE staff_auth SET
  password_hash = '69607f21649cd4115fc683011bdffaa77a038bc5b6604965639637a7abedccbd',
  updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE staff_id = 'b0000000-0000-0000-0000-000000000002';

UPDATE staff_auth SET
  password_hash = '25cbb9209e32f0586e0e5cecf913f552c11fe074bb969dd4a31fc4c1d736f4e1',
  updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE staff_id = 'b0000000-0000-0000-0000-000000000003';

UPDATE staff_auth SET
  password_hash = '266c1231d7de3245322ddadf20e017a69e9c2d3f8457c6ff20d15c242ea8c43a',
  updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE staff_id = 'b0000000-0000-0000-0000-000000000004';

UPDATE staff_auth SET
  password_hash = '75063e850a6afc48a7f87d680c3dae39ed875b64080195b6bfd32b420d0a7d5c',
  updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE staff_id = 'b0000000-0000-0000-0000-000000000005';

UPDATE staff_auth SET
  password_hash = 'ef4e35ce0c06f1fc9b7a91307ffdf3b88eb2a4747bc516fd2f41ebb5af2083e8',
  updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE staff_id = 'b0000000-0000-0000-0000-000000000006';
