function getAllowedOrigin(): string {
  const globalDeno = (globalThis as unknown as { Deno?: { env: { get: (k: string) => string | undefined } } }).Deno;
  if (globalDeno?.env) {
    return globalDeno.env.get('ALLOWED_ORIGIN') ?? 'http://localhost:5173';
  }
  if (typeof process !== 'undefined' && process.env) {
    return process.env.ALLOWED_ORIGIN ?? 'http://localhost:5173';
  }
  return 'http://localhost:5173';
}

export const corsHeaders = {
  'Access-Control-Allow-Origin': getAllowedOrigin(),
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

