import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleInviteStaff } from '../../supabase/functions/invite-staff/handler';

describe('Edge Function: invite-staff', () => {
  const mockEnv = {
    SUPABASE_URL: 'http://127.0.0.1:54321',
    SUPABASE_ANON_KEY: 'mock-anon-key',
    SUPABASE_SERVICE_ROLE_KEY: 'mock-service-role-key',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects request with missing Authorization header (401)', async () => {
    const req = new Request('http://localhost/invite-staff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'newdoc@example.com', full_name: 'Dr. New', role: 'doctor' }),
    });

    const res = await handleInviteStaff(req, mockEnv);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toMatch(/authorization/i);
  });

  it('rejects caller when session is at aal1 (403 MFA required)', async () => {
    const req = new Request('http://localhost/invite-staff', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer mock-jwt-aal1',
      },
      body: JSON.stringify({ email: 'newdoc@example.com', full_name: 'Dr. New', role: 'doctor' }),
    });

    const res = await handleInviteStaff(req, mockEnv);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toMatch(/aal2|two-factor/i);
  });

  it('rejects caller when caller is not an admin (403 Forbidden)', async () => {
    const req = new Request('http://localhost/invite-staff', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer mock-jwt-doctor-aal2',
      },
      body: JSON.stringify({ email: 'newdoc@example.com', full_name: 'Dr. New', role: 'doctor' }),
    });

    const res = await handleInviteStaff(req, mockEnv);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toMatch(/admin/i);
  });

  it('validates required payload fields (400 Bad Request)', async () => {
    const req = new Request('http://localhost/invite-staff', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer mock-jwt-admin-aal2',
      },
      body: JSON.stringify({ email: 'invalid-email' }),
    });

    const res = await handleInviteStaff(req, mockEnv);
    expect(res.status).toBe(400);
  });

  it('allows active admin at aal2 to invite staff (200 OK)', async () => {
    const req = new Request('http://localhost/invite-staff', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer mock-jwt-admin-aal2',
      },
      body: JSON.stringify({
        email: 'doctor.test@example.com',
        full_name: 'Dr. Test Kerala',
        role: 'doctor',
      }),
    });

    const res = await handleInviteStaff(req, mockEnv);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.user_id).toBeDefined();
  });
});
