import { Hono } from 'hono';
import type { WorkerEnv } from './env';
import { authRoutes } from './routes/auth';
import { doctorRoutes } from './routes/doctor';
import { patientRoutes } from './routes/patient';
import { deskRoutes } from './routes/desk';
import { adminRoutes } from './routes/admin';
import { dietRoutes } from './routes/diet';
import { documentsRoutes } from './routes/documents';
import { notificationRoutes } from './routes/notifications';
import { declareRoutePolicy, requireAccess, type AccessVariables } from './middleware/access';

// Declare standard system policies
declareRoutePolicy('GET', '/api/health', { allowedRoles: [], public: true });
declareRoutePolicy('POST', '/api/auth/patient/request-otp', { allowedRoles: [], public: true });
declareRoutePolicy('POST', '/api/auth/patient/verify-otp', { allowedRoles: [], public: true });
declareRoutePolicy('POST', '/api/auth/staff/login', { allowedRoles: [], public: true });
declareRoutePolicy('POST', '/api/auth/staff/verify-totp', { allowedRoles: [], public: true });
declareRoutePolicy('POST', '/api/auth/signout', {
  allowedRoles: ['patient', 'guardian', 'doctor', 'front_desk', 'admin'],
  public: true,
});
declareRoutePolicy('GET', '/api/auth/session', {
  allowedRoles: ['patient', 'guardian', 'doctor', 'front_desk', 'admin'],
  public: true,
});

// Patient Chart Scoped Policies
const patientChartReadPolicy = declareRoutePolicy('GET', '/api/patients/:patientId/chart', {
  allowedRoles: ['patient', 'guardian', 'doctor'],
  patientScoped: true,
  allowEmergencyAccess: true,
  requireMfa: true,
});

const patientChartWritePolicy = declareRoutePolicy('POST', '/api/patients/:patientId/chart', {
  allowedRoles: ['doctor'],
  patientScoped: true,
  allowEmergencyAccess: true,
  requireMfa: true,
});

export function createApp(): Hono<{ Bindings: WorkerEnv; Variables: AccessVariables }> {
  const app = new Hono<{ Bindings: WorkerEnv; Variables: AccessVariables }>();

  // Global Security Headers Middleware
  app.use('*', async (c, next) => {
    await next();
    c.header('X-Content-Type-Options', 'nosniff');
    c.header('X-Frame-Options', 'DENY');
    c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
    c.header(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self' https://challenges.cloudflare.com; connect-src 'self' https://challenges.cloudflare.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; frame-src https://challenges.cloudflare.com;"
    );
  });

  // Health check endpoint
  app.get('/api/health', c => {
    return c.json({
      status: 'ok',
      service: 'care-one-api',
    });
  });

  // Domain sub-routes
  app.route('/api/auth', authRoutes);
  app.route('/api/doctor', doctorRoutes);
  app.route('/api/patient', patientRoutes);
  app.route('/api/desk', deskRoutes);
  app.route('/api/admin', adminRoutes);
  app.route('/api/diet', dietRoutes);
  app.route('/api/documents', documentsRoutes);
  app.route('/api/notifications', notificationRoutes);

  // Scoped Patient Chart Endpoints
  app.get(
    '/api/patients/:patientId/chart',
    requireAccess(patientChartReadPolicy),
    async c => {
      const patientId = c.req.param('patientId');
      const patient = await c.env.DB
        .prepare('SELECT id, full_name, dob, gender FROM patients WHERE id = ?')
        .bind(patientId)
        .first();

      return c.json({
        patientId,
        patient,
        status: 'active',
      });
    }
  );

  app.post(
    '/api/patients/:patientId/chart',
    requireAccess(patientChartWritePolicy),
    async c => {
      const patientId = c.req.param('patientId');
      const body = await c.req.json().catch(() => ({}));
      return c.json({
        success: true,
        patientId,
        created: true,
        body,
      });
    }
  );

  // 404 handler for API routes
  app.notFound(c => {
    if (c.req.path.startsWith('/api')) {
      return c.json({ error: 'Not Found' }, 404);
    }
    return c.text('Not Found', 404);
  });

  return app;
}
