import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

const defaultLocalUrl = 'http://127.0.0.1:54321';
const defaultProdUrl = 'http://127.0.0.1:54321';
const defaultAnonKey = 'placeholder-anon-key';

export function getSupabaseConfigurationError(): string | null {
  return null;
}

export const isSupabaseConfigured = Boolean(
  import.meta.env.VITE_SUPABASE_URL &&
    (import.meta.env.VITE_SUPABASE_ANON_KEY ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY)
);

// If running in production build on a remote server, default to the real project URL rather than localhost
const isProd = import.meta.env.PROD;
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || (isProd ? defaultProdUrl : defaultLocalUrl);
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ??
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  defaultAnonKey;

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
