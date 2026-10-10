export function getAllowedOrigin(): string {
  const globalDeno = (globalThis as unknown as { Deno?: { env: { get: (k: string) => string | undefined } } }).Deno;
  const getEnv = (key: string): string | undefined => {
    if (globalDeno?.env) {
      return globalDeno.env.get(key);
    }
    if (typeof process !== 'undefined' && process.env) {
      return process.env[key];
    }
    return undefined;
  };

  const configuredOrigin = getEnv('ALLOWED_ORIGIN');
  if (configuredOrigin) {
    return configuredOrigin;
  }

  const environment = getEnv('ENVIRONMENT');
  if (environment === 'production') {
    return 'https://careone.pages.dev';
  }

  return 'http://localhost:5173';
}

export const corsHeaders: {
  readonly 'Access-Control-Allow-Origin': string;
  readonly 'Access-Control-Allow-Headers': string;
} = {
  get 'Access-Control-Allow-Origin'(): string {
    return getAllowedOrigin();
  },
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
