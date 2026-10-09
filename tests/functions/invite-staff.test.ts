import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleInviteStaff } from '../../supabase/functions/invite-staff/handler';
import { resetRateLimits } from '../../supabase/functions/_shared/rate-limit';

interface ApiResponse {
  error?: string;
  success?: boolean;
  user_id?: string;
}

describe('Edge Function: invite-staff', () => {
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
    const req = new Request('http://localhost/invite-staff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'newdoc@example.com', full_name: 'Dr. New', role: 'doctor' }),
    });

    const res = await handleInviteStaff(req, mockEnv);
    expect(res.status).toBe(401);
    const body = (await res.json()) as ApiResponse;
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
    const body = (await res.json()) as ApiResponse;
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
    const body = (await res.json()) as ApiResponse;
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
      expect(res.status).toBe(401);
    } finally {
      process.env.ENVIRONMENT = origEnv;
      process.env.NODE_ENV = origNodeEnv;
    }
  });

  it('uses restricted CORS headers and never uses wildcard origin', async () => {
    const req = new Request('http://localhost/invite-staff', {
      method: 'OPTIONS',
    });

    const res = await handleInviteStaff(req, mockEnv);
    expect(res.headers.get('Access-Control-Allow-Origin')).not.toBe('*');
  });

  it('enforces rate limiting of 10 requests per window per actor (429 Too Many Requests)', async () => {
    for (let i = 0; i < 10; i++) {
      const req = new Request('http://localhost/invite-staff', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer mock-jwt-admin-aal2',
        },
        body: JSON.stringify({
          email: `doc-${i}@example.com`,
          full_name: `Dr. Batch ${i}`,
          role: 'doctor',
        }),
      });
      const res = await handleInviteStaff(req, mockEnv);
      expect(res.status).toBe(200);
    }

    const req11 = new Request('http://localhost/invite-staff', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer mock-jwt-admin-aal2',
      },
      body: JSON.stringify({
        email: 'doc-overflow@example.com',
        full_name: 'Dr. Overflow',
        role: 'doctor',
      }),
    });
    const res11 = await handleInviteStaff(req11, mockEnv);
    expect(res11.status).toBe(429);
    const body = (await res11.json()) as ApiResponse;
    expect(body.error).toMatch(/rate limit|too many requests/i);
    expect(res11.headers.get('Retry-After')).toBeDefined();
  });

  it('resolves production origin instead of localhost when in production environment', async () => {
    const origEnv = process.env.ENVIRONMENT;
    const origAllowed = process.env.ALLOWED_ORIGIN;
    try {
      process.env.ENVIRONMENT = 'production';
      delete process.env.ALLOWED_ORIGIN;

      const { getAllowedOrigin } = await import('../../supabase/functions/_shared/cors');
      const origin = getAllowedOrigin();
      expect(origin).not.toContain('localhost');
      expect(origin).toBe('https://careone.pages.dev');
    } finally {
      process.env.ENVIRONMENT = origEnv;
      if (origAllowed) {
        process.env.ALLOWED_ORIGIN = origAllowed;
      } else {
        delete process.env.ALLOWED_ORIGIN;
      }
    }
  });
});
