import { Hono } from 'hono';
import type { WorkerEnv } from '../env';

export const dataRouter = new Hono<{ Bindings: WorkerEnv }>();

const ALLOWED_TABLES = new Set([
  'departments',
  'staff',
  'patients',
  'patient_access',
  'care_team',
  'emergency_access',
  'appointments',
  'consents',
  'encounters',
  'encounter_addenda',
  'conditions',
  'allergies',
  'medications',
  'observations',
  'diet_guides',
  'documents',
  'care_plans',
  'care_plan_items',
  'reminders',
  'push_subscriptions',
  'symptom_reports',
  'audit_log',
]);

const SAFE_IDENTIFIER = /^[a-zA-Z0-9_]+$/;

interface Filter {
  col: string;
  op: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'is' | 'in';
  val: unknown;
}

// POST /api/data/query
dataRouter.post('/query', async (c) => {
  try {
    const body = (await c.req.json()) as {
      table: string;
      cols?: string;
      filters?: Filter[];
      order?: { col: string; asc: boolean };
      limit?: number;
      single?: boolean;
    };

    if (!body.table || !ALLOWED_TABLES.has(body.table)) {
      return c.json({ data: null, error: 'Invalid or prohibited table name' }, 400);
    }

    const whereClauses: string[] = [];
    const params: (string | number | bigint | null | Uint8Array)[] = [];

    if (Array.isArray(body.filters)) {
      for (const f of body.filters) {
        if (!SAFE_IDENTIFIER.test(f.col)) continue;

        if (f.op === 'is') {
          if (f.val === null) {
            whereClauses.push(`${f.col} IS NULL`);
          } else {
            whereClauses.push(`${f.col} IS ?`);
            params.push(f.val as string);
          }
        } else if (f.op === 'in' && Array.isArray(f.val)) {
          if (f.val.length === 0) {
            whereClauses.push('1 = 0');
          } else {
            const placeholders = f.val.map(() => '?').join(', ');
            whereClauses.push(`${f.col} IN (${placeholders})`);
            params.push(...(f.val as (string | number)[]));
          }
        } else {
          const opMap: Record<string, string> = {
            eq: '=',
            neq: '!=',
            gt: '>',
            gte: '>=',
            lt: '<',
            lte: '<=',
          };
          const sqlOp = opMap[f.op] || '=';
          whereClauses.push(`${f.col} ${sqlOp} ?`);
          params.push(f.val as string | number);
        }
      }
    }

    let sql = `SELECT * FROM ${body.table}`;
    if (whereClauses.length > 0) {
      sql += ` WHERE ${whereClauses.join(' AND ')}`;
    }

    if (body.order && SAFE_IDENTIFIER.test(body.order.col)) {
      sql += ` ORDER BY ${body.order.col} ${body.order.asc ? 'ASC' : 'DESC'}`;
    }

    if (body.limit && Number.isInteger(body.limit) && body.limit > 0) {
      sql += ` LIMIT ${body.limit}`;
    } else if (body.single) {
      sql += ' LIMIT 1';
    }

    const stmt = c.env.DB.prepare(sql).bind(...params);
    const rows = await stmt.all();
    const results = rows.results || [];

    const data = body.single ? results[0] || null : results;
    return c.json({ data, count: results.length, error: null });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return c.json({ data: null, error: message }, 500);
  }
});

// POST /api/data/mutate
dataRouter.post('/mutate', async (c) => {
  try {
    const actorId = c.req.header('x-actor-id') || 'system-api';
    const actorRole = c.req.header('x-actor-role') || 'staff';
    const reqId = crypto.randomUUID();

    const body = (await c.req.json()) as {
      table: string;
      action: 'insert' | 'update' | 'delete';
      data?: Record<string, unknown>;
      filters?: Filter[];
    };

    if (!body.table || !ALLOWED_TABLES.has(body.table)) {
      return c.json({ data: null, error: 'Invalid or prohibited table name' }, 400);
    }

    if (body.action === 'insert' && body.data) {
      const keys = Object.keys(body.data).filter((k) => SAFE_IDENTIFIER.test(k));
      const cols = keys.join(', ');
      const placeholders = keys.map(() => '?').join(', ');
      const values = keys.map((k) => (body.data as Record<string, unknown>)[k] as string | number | null);

      const insertSql = `INSERT INTO ${body.table} (${cols}) VALUES (${placeholders})`;

      await c.env.DB.batch([
        c.env.DB.prepare(
          'INSERT OR REPLACE INTO _request_ctx (id, actor_id, role, request_id) VALUES (1, ?, ?, ?)'
        ).bind(actorId, actorRole, reqId),
        c.env.DB.prepare(insertSql).bind(...values),
        c.env.DB.prepare('DELETE FROM _request_ctx WHERE id = 1'),
      ]);

      return c.json({ data: body.data, error: null });
    }

    if (body.action === 'update' && body.data && body.filters) {
      const setClauses: string[] = [];
      const setParams: (string | number | bigint | null | Uint8Array)[] = [];

      for (const [k, v] of Object.entries(body.data)) {
        if (!SAFE_IDENTIFIER.test(k)) continue;
        setClauses.push(`${k} = ?`);
        setParams.push(v as string | number | null);
      }

      const whereClauses: string[] = [];
      const whereParams: (string | number | bigint | null | Uint8Array)[] = [];

      for (const f of body.filters) {
        if (!SAFE_IDENTIFIER.test(f.col)) continue;
        whereClauses.push(`${f.col} = ?`);
        whereParams.push(f.val as string | number);
      }

      const updateSql = `UPDATE ${body.table} SET ${setClauses.join(', ')} WHERE ${whereClauses.join(' AND ')}`;

      await c.env.DB.batch([
        c.env.DB.prepare(
          'INSERT OR REPLACE INTO _request_ctx (id, actor_id, role, request_id) VALUES (1, ?, ?, ?)'
        ).bind(actorId, actorRole, reqId),
        c.env.DB.prepare(updateSql).bind(...setParams, ...whereParams),
        c.env.DB.prepare('DELETE FROM _request_ctx WHERE id = 1'),
      ]);

      return c.json({ data: body.data, error: null });
    }

    return c.json({ data: null, error: 'Unsupported action or missing arguments' }, 400);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return c.json({ data: null, error: message }, 500);
  }
});
