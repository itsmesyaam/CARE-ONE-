import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleInvitePatient } from '../../supabase/functions/invite-patient/handler';
import { resetRateLimits } from '../../supabase/functions/_shared/rate-limit';

interface ApiResponse {
  error?: string;
  success?: boolean;
  user_id?: string;
}

describe('Edge Function: invite-patient', () => {
  const mockEnv = {
    SUPABASE_URL: 'http://127.0.0.1:54321',
    SUPABASE_ANON_KEY: 'mock-anon-key',
    SUPABASE_SERVICE_ROLE_KEY: 'mock-service-role-key',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    resetRateLimits();
  });

  it('rejects request with missing Authorization header (401)', async () => {
    const req = new Request('http://localhost/invite-patient', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'patient@example.com',
        patient_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        relationship: 'self',
      }),
    });

    const res = await handleInvitePatient(req, mockEnv);
    expect(res.status).toBe(401);
    const body = (await res.json()) as ApiResponse;
    expect(body.error).toMatch(/authorization/i);
  });

  it('rejects caller when session is at aal1 (403 MFA required)', async () => {
    const req = new Request('http://localhost/invite-patient', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer mock-jwt-aal1',
      },
      body: JSON.stringify({
        email: 'patient@example.com',
        patient_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        relationship: 'self',
      }),
    });

    const res = await handleInvitePatient(req, mockEnv);
    expect(res.status).toBe(403);
    const body = (await res.json()) as ApiResponse;
    expect(body.error).toMatch(/aal2|two-factor/i);
  });

  it('rejects caller when caller is a doctor without desk permissions (403 Forbidden)', async () => {
    const req = new Request('http://localhost/invite-patient', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer mock-jwt-doctor-aal2',
      },
      body: JSON.stringify({
        email: 'patient@example.com',
        patient_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        relationship: 'self',
      }),
    });

    const res = await handleInvitePatient(req, mockEnv);
    expect(res.status).toBe(403);
    const body = (await res.json()) as ApiResponse;
    expect(body.error).toMatch(/front_desk|admin|privileges/i);
  });

  it('validates required payload fields (400 Bad Request)', async () => {
    const req = new Request('http://localhost/invite-patient', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer mock-jwt-desk-aal2',
      },
      body: JSON.stringify({
        email: 'not-an-email',
      }),
    });

    const res = await handleInvitePatient(req, mockEnv);
    expect(res.status).toBe(400);
  });

  it('allows active front desk at aal2 to invite patient (200 OK)', async () => {
    const req = new Request('http://localhost/invite-patient', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer mock-jwt-desk-aal2',
      },
      body: JSON.stringify({
        email: 'patient.test@example.com',
        patient_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        relationship: 'self',
      }),
    });

    const res = await handleInvitePatient(req, mockEnv);
    expect(res.status).toBe(200);
    const body = (await res.json()) as ApiResponse;
    expect(body.success).toBe(true);
    expect(body.user_id).toBeDefined();
  });

  it('rejects mock tokens when ENVIRONMENT is not test (401)', async () => {
    const origEnv = process.env.ENVIRONMENT;
    const origNodeEnv = process.env.NODE_ENV;
    try {
      process.env.ENVIRONMENT = 'production';
      process.env.NODE_ENV = 'production';

      const req = new Request('http://localhost/invite-patient', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer mock-jwt-desk-aal2',
        },
        body: JSON.stringify({
          email: 'patient.test@example.com',
          patient_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
          relationship: 'self',
        }),
      });

      const res = await handleInvitePatient(req, mockEnv);
      expect(res.status).toBe(401);
    } finally {
      process.env.ENVIRONMENT = origEnv;
      process.env.NODE_ENV = origNodeEnv;
    }
  });

  it('uses restricted CORS headers and never uses wildcard origin', async () => {
    const req = new Request('http://localhost/invite-patient', {
      method: 'OPTIONS',
    });

    const res = await handleInvitePatient(req, mockEnv);
    expect(res.headers.get('Access-Control-Allow-Origin')).not.toBe('*');
  });

  it('enforces rate limiting of 10 requests per window per actor (429 Too Many Requests)', async () => {
    for (let i = 0; i < 10; i++) {
      const req = new Request('http://localhost/invite-patient', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer mock-jwt-desk-aal2',
        },
        body: JSON.stringify({
          email: `patient-${i}@example.com`,
          patient_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
          relationship: 'self',
        }),
      });
      const res = await handleInvitePatient(req, mockEnv);
      expect(res.status).toBe(200);
    }

    const req11 = new Request('http://localhost/invite-patient', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer mock-jwt-desk-aal2',
      },
      body: JSON.stringify({
        email: 'patient-overflow@example.com',
        patient_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        relationship: 'self',
      }),
    });
    const res11 = await handleInvitePatient(req11, mockEnv);
    expect(res11.status).toBe(429);
    const body = (await res11.json()) as ApiResponse;
    expect(body.error).toMatch(/rate limit|too many requests/i);
    expect(res11.headers.get('Retry-After')).toBeDefined();
  });
});
